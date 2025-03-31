export interface VacationPeriod {
  startDate: Date;
  endDate: Date;
  totalDays: number;
  workDays: number;
  weekendDays: number;
  holidayDays: number;
  efficiency: number;
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
  daysChanged: number;
  strategicScore: number;
  fractionedPeriods?: VacationPeriod[];
} 