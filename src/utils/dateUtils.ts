import { DateRange, Holiday, VacationPeriod, EfficiencyRating, CalendarDay } from '@/types';
import { isHoliday, isWeekend, getHolidaysInRange } from './holidayData';
import { format, addDays, differenceInDays, isSameMonth, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Format date to string
export const formatDate = (date: Date, formatStr: string = 'dd/MM/yyyy'): string => {
  return format(date, formatStr, { locale: ptBR });
};

// Get day of week as string
export const getDayOfWeek = (date: Date, abbreviated: boolean = false): string => {
  return format(date, abbreviated ? 'EEE' : 'EEEE', { locale: ptBR });
};

// Check if a date range is valid (minimum 5 days)
// Esta validação é usada tanto para períodos selecionados pelo usuário quanto para
// recomendações geradas pelo sistema, conforme Resolução nº 940/2025 do CJF
export const isValidVacationPeriod = (startDate: Date, endDate: Date): { isValid: boolean; reason?: string } => {
  const days = differenceInDays(endDate, startDate) + 1;
  
  if (days < 5) {
    return { 
      isValid: false, 
      reason: 'O período mínimo de férias é de 5 dias conforme Resolução nº 940/2025 do CJF'
    };
  }
  
  return { isValid: true };
};

// Calculate workdays, weekends and holidays in a date range
export const calculateDaysBreakdown = (
  startDate: Date,
  endDate: Date
): { workDays: number; weekendDays: number; holidayDays: number; totalDays: number } => {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  
  const totalDays = differenceInDays(end, start) + 1;
  let workDays = 0;
  let weekendDays = 0;
  let holidayDays = 0;
  
  // Iterate through each day in the range
  for (let i = 0; i < totalDays; i++) {
    const currentDate = addDays(start, i);
    const holidayCheck = isHoliday(currentDate);
    
    if (holidayCheck) {
      holidayDays++;
    } else if (isWeekend(currentDate)) {
      weekendDays++;
    } else {
      workDays++;
    }
  }
  
  return { workDays, weekendDays, holidayDays, totalDays };
};

// Calculate efficiency of a vacation period
export const calculateEfficiency = (workDays: number, totalDays: number): number => {
  // Efficiency formula: totalDays / workDays
  // Higher value means better efficiency (more total days per work day used)
  if (workDays === 0) return 0; // Evitar divisão por zero
  return totalDays / workDays;
};

// Nova função de cálculo de eficiência aprimorada
export const calculateImprovedEfficiency = (startDate: Date, endDate: Date): number => {
  // Garantir que as datas estejam no formato correto
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  
  // Análise do período
  const { workDays, weekendDays, holidayDays, totalDays } = calculateDaysBreakdown(start, end);
  
  // 1. Valor base: Apenas dias úteis regulares consumidos (custo)
  const workDaysSpent = workDays;
  
  // 2. Ganho real: Apenas feriados que caem em dias úteis (benefício direto)
  let holidaysOnWorkdays = 0;
  let currentDate = new Date(start);
  while (currentDate <= end) {
    if (isHoliday(currentDate) && !isWeekend(currentDate)) {
      holidaysOnWorkdays++;
    }
    currentDate = addDays(currentDate, 1);
  }
  
  // 3. Valor estratégico: Posicionamento que potencializa fins de semana
  let strategicValue = 0;
  
  // Bônus para início em segunda-feira
  if (start.getDay() === 1) {
    strategicValue += 0.3;
  }
  
  // Bônus para término em sexta-feira
  if (end.getDay() === 5) {
    strategicValue += 0.3;
  }
  
  // Bônus adicional para período "perfeito" (segunda a sexta)
  if (start.getDay() === 1 && end.getDay() === 5) {
    strategicValue += 0.3;
  }
  
  // 4. Valor de "ativação de fim de semana"
  let weekendActivationValue = 0;
  
  // Férias terminando na sexta ativa o fim de semana seguinte
  if (end.getDay() === 5) {
    weekendActivationValue += 0.6;
  }
  
  // Férias começando na segunda aproveita o fim de semana anterior
  if (start.getDay() === 1) {
    weekendActivationValue += 0.6;
  }
  
  // 5. Cálculo da eficiência final
  if (workDaysSpent === 0) return 0; // Evitar divisão por zero
  
  const efficiency = (holidaysOnWorkdays + strategicValue + weekendActivationValue) / workDaysSpent;
  
  // Aplicar um multiplicador para manter a escala de valores próxima à original
  // para compatibilidade com o restante do sistema
  return efficiency + 1.0; // +1.0 para manter coerência com escala anterior
};

// Determine efficiency rating based on the value
export const getEfficiencyRating = (efficiency: number): EfficiencyRating => {
  if (efficiency >= 1.4) return 'high';    // 40% ou mais de dias extras
  if (efficiency >= 1.2) return 'medium';  // 20% ou mais de dias extras
  return 'low';
};

// Get full vacation period details from a date range
export const getVacationPeriodDetails = (startDate: Date, endDate: Date): VacationPeriod => {
  const { workDays, weekendDays, holidayDays, totalDays } = calculateDaysBreakdown(startDate, endDate);
  // Substituindo a antiga função de eficiência pela nova
  const efficiency = calculateImprovedEfficiency(startDate, endDate);
  const efficiencyRating = getEfficiencyRating(efficiency);
  const { isValid, reason } = isValidVacationPeriod(startDate, endDate);
  
  return {
    startDate,
    endDate,
    totalDays,
    workDays,
    weekendDays,
    holidayDays,
    efficiency,
    efficiencyRating,
    isValid,
    invalidReason: reason
  };
};

// Get all days for a month's calendar view
export const getCalendarDays = (
  month: Date,
  selectedRange: DateRange | null,
  splitPeriods: DateRange[] = []
): CalendarDay[] => {
  const days: CalendarDay[] = [];
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const firstDayOfMonth = monthStart.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // Ajuste para começar a semana na segunda-feira (0 = segunda, 6 = domingo)
  const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  
  // Get holidays for the current month
  const holidays = getHolidaysInRange(monthStart, monthEnd);
  
  // Fill in days from previous month to start grid on Monday
  for (let i = adjustedFirstDay - 1; i >= 0; i--) {
    const prevMonthDay = addDays(monthStart, -i - 1);
    days.push({
      date: prevMonthDay,
      isCurrentMonth: false,
      isWeekend: isWeekend(prevMonthDay),
      isToday: isSameDay(prevMonthDay, new Date()),
      isHoliday: !!isHoliday(prevMonthDay),
      holiday: isHoliday(prevMonthDay),
      isInSelection: false,
      isSelectionStart: false,
      isSelectionEnd: false,
      isInSecondarySelection: false,
      isSecondarySelectionStart: false,
      isSecondarySelectionEnd: false
    });
  }
  
  // Preparar os períodos fracionados para processamento mais eficiente
  const validSplitPeriods = splitPeriods.filter(period => 
    period && period.startDate && period.endDate
  ).map(period => ({
    startDate: new Date(period.startDate),
    endDate: new Date(period.endDate),
    start: new Date(period.startDate).setHours(0, 0, 0, 0),
    end: new Date(period.endDate).setHours(23, 59, 59, 999)
  }));
  
  // Fill in days for current month
  const daysInMonth = differenceInDays(monthEnd, monthStart) + 1;
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(month.getFullYear(), month.getMonth(), day);
    const isToday = isSameDay(date, new Date());
    const isWeekendDay = isWeekend(date);
    const holiday = isHoliday(date);
    
    // Check if day is in selected range
    let isInSelection = false;
    let isSelectionStart = false;
    let isSelectionEnd = false;
    
    if (
      selectedRange && 
      selectedRange.startDate && 
      selectedRange.endDate
    ) {
      // Create proper Date objects to avoid issues with time
      const rangeStart = new Date(selectedRange.startDate);
      const rangeEnd = new Date(selectedRange.endDate);
      rangeStart.setHours(0, 0, 0, 0);
      rangeEnd.setHours(23, 59, 59, 999);
      
      const currentDate = new Date(date);
      currentDate.setHours(12, 0, 0, 0); // Midi para evitar problemas com horário de verão
      
      // Verificar se está dentro do intervalo
      isInSelection = currentDate >= rangeStart && currentDate <= rangeEnd;
      
      // Verificar se é início ou fim do intervalo
      isSelectionStart = isSameDay(currentDate, rangeStart);
      isSelectionEnd = isSameDay(currentDate, rangeEnd);
    }
    
    // Check if day is in any of the secondary ranges (períodos fracionados)
    let isInSecondarySelection = false;
    let isSecondarySelectionStart = false;
    let isSecondarySelectionEnd = false;
    let secondarySelectionIndex = -1;
    
    if (validSplitPeriods.length > 0) {
      // Verificar cada período fracionado
      const currentDate = new Date(date);
      currentDate.setHours(12, 0, 0, 0);
      const currentTime = currentDate.getTime();
      
      for (let i = 0; i < validSplitPeriods.length; i++) {
        const period = validSplitPeriods[i];

        // Se a data está neste período e não é o período principal
        if (currentTime >= period.start && currentTime <= period.end && !isInSelection) {
          isInSecondarySelection = true;
          
          // Marcar início e fim do período secundário
          if (isSameDay(currentDate, period.startDate)) {
            isSecondarySelectionStart = true;
          }
          
          if (isSameDay(currentDate, period.endDate)) {
            isSecondarySelectionEnd = true;
          }
          
          // Guardar o índice do período para coloração diferenciada
          secondarySelectionIndex = i;
          
          // Uma vez que encontramos um período que contém esta data, podemos parar de procurar
          break;
        }
      }
    }
    
    days.push({
      date,
      isCurrentMonth: true,
      isWeekend: isWeekendDay,
      isToday,
      isHoliday: !!holiday,
      holiday,
      isInSelection,
      isSelectionStart,
      isSelectionEnd,
      isInSecondarySelection,
      isSecondarySelectionStart,
      isSecondarySelectionEnd,
      secondarySelectionIndex
    });
  }
  
  // Fill in days from next month to complete grid
  const remainingDays = 42 - days.length; // 6 weeks (42 days) grid
  for (let i = 1; i <= remainingDays; i++) {
    const nextMonthDay = addDays(monthEnd, i);
    days.push({
      date: nextMonthDay,
      isCurrentMonth: false,
      isWeekend: isWeekend(nextMonthDay),
      isToday: isSameDay(nextMonthDay, new Date()),
      isHoliday: !!isHoliday(nextMonthDay),
      holiday: isHoliday(nextMonthDay),
      isInSelection: false,
      isSelectionStart: false,
      isSelectionEnd: false,
      isInSecondarySelection: false,
      isSecondarySelectionStart: false,
      isSecondarySelectionEnd: false
    });
  }
  
  return days;
};

// Download a file (for calendar export)
export const downloadFile = (content: string, filename: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Generate ICS file content for calendar export
export const generateICSFile = (vacationPeriod: VacationPeriod): string => {
  const startDateICS = format(vacationPeriod.startDate, "yyyyMMdd");
  const endDateICS = format(addDays(vacationPeriod.endDate, 1), "yyyyMMdd"); // Add one day for exclusive end date in ICS
  
  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Otimizador de Férias para Magistrados//PT-BR
BEGIN:VEVENT
SUMMARY:Férias
DESCRIPTION:Período de férias com eficiência ${(vacationPeriod.efficiency * 100).toFixed(2)}%
DTSTART;VALUE=DATE:${startDateICS}
DTEND;VALUE=DATE:${endDateICS}
STATUS:CONFIRMED
TRANSP:TRANSPARENT
END:VEVENT
END:VCALENDAR`;
};
