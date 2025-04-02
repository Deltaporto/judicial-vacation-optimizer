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
  secondaryRange: DateRange | null = null
): CalendarDay[] => {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const today = new Date();
  
  // Get start of first week (might be in previous month)
  const calendarStart = new Date(monthStart);
  const dayOfWeek = monthStart.getDay();
  calendarStart.setDate(monthStart.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  
  // Get end of last week (might be in next month)
  const calendarEnd = new Date(monthEnd);
  const lastDayOfWeek = monthEnd.getDay();
  calendarEnd.setDate(monthEnd.getDate() + (lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek));
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  
  return days.map(date => {
    const holiday = isHoliday(date);
    
    let isSelected = false;
    let isSelectionStart = false;
    let isSelectionEnd = false;
    let isInSelection = false;
    let isInSecondarySelection = false;
    let isSecondarySelectionStart = false;
    let isSecondarySelectionEnd = false;
    
    if (selectedRange) {
      const start = new Date(selectedRange.startDate);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(selectedRange.endDate);
      end.setHours(23, 59, 59, 999);
      
      isSelectionStart = isSameDay(date, start);
      isSelectionEnd = isSameDay(date, end);
      isInSelection = date >= start && date <= end;
      isSelected = isSelectionStart || isSelectionEnd;
    }
    
    if (secondaryRange) {
      const start = new Date(secondaryRange.startDate);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(secondaryRange.endDate);
      end.setHours(23, 59, 59, 999);
      
      isSecondarySelectionStart = isSameDay(date, start);
      isSecondarySelectionEnd = isSameDay(date, end);
      isInSecondarySelection = date >= start && date <= end;
    }
    
    return {
      date,
      isWeekend: isWeekend(date),
      isCurrentMonth: isSameMonth(date, month),
      isToday: isSameDay(date, today),
      isSelected,
      isSelectionStart,
      isSelectionEnd,
      isInSelection,
      isInSecondarySelection,
      isSecondarySelectionStart,
      isSecondarySelectionEnd,
      holiday
    };
  });
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

// Generate ICS file content
export const generateICSFile = (vacationPeriod: VacationPeriod): string => {
  const start = vacationPeriod.startDate;
  const end = addDays(vacationPeriod.endDate, 1); // ICS end date is exclusive

  const formatDateICS = (date: Date): string => {
    return format(date, "yyyyMMdd'T'HHmmss'Z'");
  };

  const uid = `${format(new Date(), 'yyyyMMddHHmmss')}-${Math.random().toString(36).substring(2, 15)}@judicial-vacation-optimizer`;

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//SeuNome//OtimizadorFériasJudiciais//PT
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${formatDateICS(new Date())}
DTSTART;VALUE=DATE:${format(start, 'yyyyMMdd')}
DTEND;VALUE=DATE:${format(end, 'yyyyMMdd')}
SUMMARY:Período de Férias Otimizado
DESCRIPTION:Período de férias sugerido pelo Otimizador de Férias Judiciais.\nTotal de Dias: ${vacationPeriod.totalDays}\nDias Úteis: ${vacationPeriod.workDays}\nFins de Semana: ${vacationPeriod.weekendDays}\nFeriados: ${vacationPeriod.holidayDays}\nEficiência: ${(vacationPeriod.efficiency * 100).toFixed(1)}%
TRANSP:TRANSPARENT
END:VEVENT
END:VCALENDAR`;
};

// Check if two date ranges overlap
export const dateRangesOverlap = (
  startDateA: Date, endDateA: Date, 
  startDateB: Date, endDateB: Date
): boolean => {
  // Normalize dates to avoid time issues
  const startA = new Date(startDateA); startA.setHours(0,0,0,0);
  const endA = new Date(endDateA); endA.setHours(23,59,59,999);
  const startB = new Date(startDateB); startB.setHours(0,0,0,0);
  const endB = new Date(endDateB); endB.setHours(23,59,59,999);
  
  // Overlap occurs if range A starts before B ends AND range A ends after B starts
  return startA <= endB && endA >= startB;
};
