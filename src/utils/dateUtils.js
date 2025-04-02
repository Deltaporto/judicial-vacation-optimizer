import { isHoliday, isWeekend } from './holidayData';
import { format, addDays, differenceInDays, isSameMonth, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
// Format date to string
export const formatDate = (date, formatStr = 'dd/MM/yyyy') => {
    return format(date, formatStr, { locale: ptBR });
};
// Get day of week as string
export const getDayOfWeek = (date, abbreviated = false) => {
    return format(date, abbreviated ? 'EEE' : 'EEEE', { locale: ptBR });
};
// Check if a date range is valid (minimum 5 days)
// Esta validação é usada tanto para períodos selecionados pelo usuário quanto para
// recomendações geradas pelo sistema, conforme Resolução nº 940/2025 do CJF
export const isValidVacationPeriod = (startDate, endDate) => {
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
export const calculateDaysBreakdown = (startDate, endDate) => {
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
        }
        else if (isWeekend(currentDate)) {
            weekendDays++;
        }
        else {
            workDays++;
        }
    }
    return { workDays, weekendDays, holidayDays, totalDays };
};
// Calculate efficiency of a vacation period
export const calculateEfficiency = (workDays, totalDays) => {
    // Efficiency formula: totalDays / workDays
    // Higher value means better efficiency (more total days per work day used)
    if (workDays === 0)
        return 0; // Evitar divisão por zero
    return totalDays / workDays;
};
// Nova função de cálculo de eficiência aprimorada
export const calculateImprovedEfficiency = (startDate, endDate) => {
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
    if (workDaysSpent === 0)
        return 0; // Evitar divisão por zero
    const efficiency = (holidaysOnWorkdays + strategicValue + weekendActivationValue) / workDaysSpent;
    // Aplicar um multiplicador para manter a escala de valores próxima à original
    // para compatibilidade com o restante do sistema
    return efficiency + 1.0; // +1.0 para manter coerência com escala anterior
};
// Determine efficiency rating based on the value
export const getEfficiencyRating = (efficiency) => {
    if (efficiency >= 1.4)
        return 'high'; // 40% ou mais de dias extras
    if (efficiency >= 1.2)
        return 'medium'; // 20% ou mais de dias extras
    return 'low';
};
// Get full vacation period details from a date range
export const getVacationPeriodDetails = (startDate, endDate) => {
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
export const getCalendarDays = (month, selectedRange, secondaryRange = null) => {
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
export const downloadFile = (content, filename, mimeType) => {
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
export const generateICSFile = (vacationPeriod) => {
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
