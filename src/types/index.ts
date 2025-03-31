// Type definitions for the application

export type HolidayType = 'national' | 'judicial' | 'recess';

export interface Holiday {
  date: Date;
  name: string;
  type: HolidayType;
  abrangencia?: string; // Texto de abrangência (ex: "Municipal (Rio de Janeiro)")
  description?: string; // Descrição adicional
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
  description?: string; // Opcional, usado para informações adicionais
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

export interface SplitVacationPeriods {
  isSplit: boolean;
  firstPeriod: VacationPeriod;
  secondPeriod: VacationPeriod;
  combinedEfficiency: number;
}

export interface FractionedVacationPeriods {
  isFractionated: boolean;
  periods: VacationPeriod[];
  combinedEfficiency: number;
  efficiencyGain: number; // Ganho em relação ao período contínuo
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
  isInSecondarySelection?: boolean;
  isSecondarySelectionStart?: boolean;
  isSecondarySelectionEnd?: boolean;
  holiday?: Holiday;
}

export interface Recommendation {
  id: string;
  type: 'extend' | 'reduce' | 'shift' | 'split' | 'combine' | 'bridge' | 'super_bridge' | 
        'optimize' | 'optimal_fraction' | 'hybrid' | 'hybrid_bridge_split' | 'optimal_hybrid' | 
        'recess' | 'error' | 'holiday_extension' | 'clean_period';
  title: string;
  description: string;
  suggestedDateRange: {
    startDate: Date;
    endDate: Date;
  };
  efficiencyGain: number;
  daysChanged: number;
  fractionedPeriods?: VacationPeriod[]; // Para recomendações de tipo optimal_fraction
  strategicScore: number;
}

export interface CourtSettings {
  region?: string; // TRF region
  division?: string; // Vara/Turma
  customHolidays?: Holiday[];
}
