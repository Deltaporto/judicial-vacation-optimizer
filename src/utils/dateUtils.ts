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
  // Efficiency formula: 1 - (workDays / totalDays)
  // Higher value means better efficiency (more non-work days per vacation day)
  if (totalDays === 0) return 0;
  return 1 - (workDays / totalDays);
};

// Determine efficiency rating based on the value
export const getEfficiencyRating = (efficiency: number): EfficiencyRating => {
  if (efficiency >= 0.6) return 'high';
  if (efficiency >= 0.4) return 'medium';
  return 'low';
};

// Get full vacation period details from a date range
export const getVacationPeriodDetails = (startDate: Date, endDate: Date): VacationPeriod => {
  const { workDays, weekendDays, holidayDays, totalDays } = calculateDaysBreakdown(startDate, endDate);
  const efficiency = calculateEfficiency(workDays, totalDays);
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
