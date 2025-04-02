import { Holiday } from './holiday';

export interface VacationPeriod {
  startDate: Date;
  endDate: Date;
  totalDays: number;
  workDays: number;
  weekendDays: number;
  holidayDays: number;
  efficiency: number;
  efficiencyRating: 'high' | 'medium' | 'low';
  isValid: boolean;
  invalidReason?: string;
  holidays?: Holiday[];
  metadata?: {
    precedingNonWorkDay?: Date;
    followingNonWorkDay?: Date;
  };
} 