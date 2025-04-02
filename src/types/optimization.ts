import { Holiday } from './holiday';
import { VacationPeriod } from './vacationPeriod';

export interface SuperOptimizationConfig {
  startYear: number;
  futureYears: number;
  maxResults: number;
  scoreWeights: {
    efficiency: number;
    strategic: number;
    holiday: number;
    recess: number;
  };
  holidays: Holiday[];
}

export interface PeriodData extends VacationPeriod {
  type: OptimizationType;
  score?: number;
  strategicScore?: number;
  efficiencyGain?: number;
  metadata?: {
    length?: number;
    businessDays?: number;
    precedingNonWorkDay?: Date;
    followingNonWorkDay?: Date;
    adjacentHoliday?: Holiday;
    isBeforeHoliday?: boolean;
    isFullRecess?: boolean;
  };
}

export enum OptimizationType {
  CONTINUOUS = 'CONTINUOUS',
  BRIDGE = 'BRIDGE',
  HOLIDAY_ADJACENCY = 'HOLIDAY_ADJACENCY',
  JUDICIAL_RECESS = 'JUDICIAL_RECESS'
}

export interface IOptimizationStrategy {
  findPeriods(config: SuperOptimizationConfig): Promise<PeriodData[]>;
}

export interface RecommendationBuilder {
  buildFromPeriod(period: PeriodData): Recommendation;
}

export interface Recommendation {
  id: string;
  type: string;
  title: string;
  description: string;
  suggestedDateRange: {
    startDate: Date;
    endDate: Date;
  };
  efficiencyGain: number;
  strategicScore: number;
  metadata?: {
    [key: string]: any;
  };
} 