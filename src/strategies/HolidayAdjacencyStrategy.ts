import { IOptimizationStrategy, OptimizationType, PeriodData, SuperOptimizationConfig } from '../types/optimization';
import { addDays, differenceInDays, isWeekend } from 'date-fns';
import { Holiday } from '../types/holiday';

export class HolidayAdjacencyStrategy implements IOptimizationStrategy {
  private readonly PERIOD_LENGTHS = [7, 10, 15];
  private readonly HOLIDAY_IMPORTANCE: { [key: string]: number } = {
    'Natal': 1.0,
    'Ano Novo': 1.0,
    'Carnaval': 0.8,
    'Páscoa': 0.8,
    'Corpus Christi': 0.6
  };

  async findPeriods(config: SuperOptimizationConfig): Promise<PeriodData[]> {
    const periods: PeriodData[] = [];
    const startYear = config.startYear;
    const endYear = startYear + config.futureYears;

    for (let year = startYear; year <= endYear; year++) {
      const yearHolidays = this.getHolidaysForYear(config.holidays, year);
      
      for (const holiday of yearHolidays) {
        for (const length of this.PERIOD_LENGTHS) {
          // Tenta períodos antes do feriado
          const beforePeriods = this.findAdjacentPeriod(holiday, length, true, config);
          if (beforePeriods) periods.push(beforePeriods);

          // Tenta períodos depois do feriado
          const afterPeriods = this.findAdjacentPeriod(holiday, length, false, config);
          if (afterPeriods) periods.push(afterPeriods);
        }
      }
    }

    return this.selectTopPeriods(periods);
  }

  private getHolidaysForYear(holidays: Holiday[], year: number): Holiday[] {
    return holidays.filter(h => new Date(h.date).getFullYear() === year);
  }

  private findAdjacentPeriod(
    holiday: Holiday,
    length: number,
    before: boolean,
    config: SuperOptimizationConfig
  ): PeriodData | null {
    const holidayDate = new Date(holiday.date);
    
    let periodStart: Date;
    let periodEnd: Date;

    if (before) {
      periodEnd = addDays(holidayDate, -1);
      periodStart = addDays(periodEnd, -(length - 1));
    } else {
      periodStart = addDays(holidayDate, 1);
      periodEnd = addDays(periodStart, length - 1);
    }

    // Verifica se o período é válido
    if (this.hasOverlappingHolidays(periodStart, periodEnd, config.holidays)) {
      return null;
    }

    const totalDays = differenceInDays(periodEnd, periodStart) + 1;
    const weekendDays = this.countWeekendDays(periodStart, periodEnd);
    const holidayDays = this.countHolidayDays(periodStart, periodEnd, config.holidays);
    const workDays = totalDays - weekendDays - holidayDays;
    const efficiency = (weekendDays + holidayDays) / totalDays;
    const score = this.calculateAdjacencyScore(
      periodStart,
      periodEnd,
      holiday,
      config
    );

    return {
      startDate: periodStart,
      endDate: periodEnd,
      score,
      type: OptimizationType.HOLIDAY_ADJACENCY,
      totalDays,
      workDays,
      weekendDays,
      holidayDays,
      efficiency,
      efficiencyRating: this.getEfficiencyRating(efficiency),
      isValid: true,
      metadata: {
        adjacentHoliday: holiday,
        length,
        isBeforeHoliday: before
      },
      efficiencyGain: efficiency
    };
  }

  private hasOverlappingHolidays(
    start: Date,
    end: Date,
    holidays: Holiday[]
  ): boolean {
    return holidays.some(h => {
      const holidayDate = new Date(h.date);
      return holidayDate >= start && holidayDate <= end;
    });
  }

  private countWeekendDays(start: Date, end: Date): number {
    let count = 0;
    let currentDate = new Date(start);
    while (currentDate <= end) {
      if (isWeekend(currentDate)) count++;
      currentDate = addDays(currentDate, 1);
    }
    return count;
  }

  private countHolidayDays(start: Date, end: Date, holidays: Holiday[]): number {
    return holidays.filter(h => {
      const holidayDate = new Date(h.date);
      return holidayDate >= start && holidayDate <= end;
    }).length;
  }

  private calculateAdjacencyScore(
    periodStart: Date,
    periodEnd: Date,
    adjacentHoliday: Holiday,
    config: SuperOptimizationConfig
  ): number {
    let score = 1.0;

    // Bônus baseado na importância do feriado
    const holidayImportance = this.HOLIDAY_IMPORTANCE[adjacentHoliday.name] || 0.3;
    score += holidayImportance;

    // Bônus para períodos que começam na segunda ou terminam na sexta
    if (periodStart.getDay() === 1) score += 0.3;
    if (periodEnd.getDay() === 5) score += 0.3;

    // Penalização para períodos que incluem fins de semana
    let weekendCount = 0;
    let currentDate = periodStart;
    while (currentDate <= periodEnd) {
      if (isWeekend(currentDate)) weekendCount++;
      currentDate = addDays(currentDate, 1);
    }
    score -= weekendCount * 0.1;

    // Bônus para períodos mais curtos (mais eficientes)
    const totalDays = differenceInDays(periodEnd, periodStart) + 1;
    score += (20 - totalDays) * 0.02; // Quanto menor o período, maior o bônus

    return Math.max(0, score);
  }

  private getEfficiencyRating(efficiency: number): 'low' | 'medium' | 'high' {
    if (efficiency >= 0.7) return 'high';
    if (efficiency >= 0.4) return 'medium';
    return 'low';
  }

  private selectTopPeriods(periods: PeriodData[]): PeriodData[] {
    return periods
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }
} 