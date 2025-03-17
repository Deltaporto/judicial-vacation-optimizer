
// Type definitions for the application

export type HolidayType = 'national' | 'judicial' | 'recess';

export interface Holiday {
  date: string; // ISO format: YYYY-MM-DD
  name: string;
  type: HolidayType;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface VacationPeriod extends DateRange {
  totalDays: number;
  workDays: number;
  weekendDays: number;
  holidayDays: number;
  efficiency: number;
  efficiencyRating: EfficiencyRating;
  isValid: boolean;
  invalidReason?: string;
}

export type EfficiencyRating = 'high' | 'medium' | 'low';

export interface EfficiencyBreakdown {
  workDaysPercentage: number;
  weekendDaysPercentage: number;
  holidayDaysPercentage: number;
}

export type ViewMode = 'month' | 'year';

export interface CalendarDay {
  date: Date;
  isWeekend: boolean;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isSelectionStart: boolean;
  isSelectionEnd: boolean;
  isInSelection: boolean;
  holiday?: Holiday;
}

export interface Recommendation {
  id: string;
  type: 'extend' | 'reduce' | 'shift' | 'split' | 'combine';
  title: string;
  description: string;
  suggestedDateRange: DateRange;
  efficiencyGain: number;
  daysChanged: number;
}

export interface CourtSettings {
  region?: string; // TRF region
  division?: string; // Vara/Turma
  customHolidays?: Holiday[];
}
