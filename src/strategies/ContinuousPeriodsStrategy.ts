import { IOptimizationStrategy, OptimizationType, PeriodData, SuperOptimizationConfig } from '../types/optimization';
import { Holiday } from '../types/holiday';
import { calculateEfficiency } from '../utils/efficiencyUtils';
import { addDays, isWeekend, format, parse } from 'date-fns';

export class ContinuousPeriodsStrategy implements IOptimizationStrategy {
  private readonly PERIOD_LENGTHS = [30, 15, 10, 7];

  async findPeriods(config: SuperOptimizationConfig): Promise<PeriodData[]> {
    const allPeriods: PeriodData[] = [];

    for (let year = config.startYear; year <= config.startYear + config.futureYears; year++) {
      const periodsForYear = this.findPeriodsForYear(year, config);
      allPeriods.push(...periodsForYear);
    }

    // Ordenar por score e limitar ao número máximo de resultados
    return allPeriods
      .sort((a, b) => b.score - a.score)
      .slice(0, config.maxResults);
  }

  private findPeriodsForYear(year: number, config: SuperOptimizationConfig): PeriodData[] {
    const periods: PeriodData[] = [];
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      // Verificar se é dia útil
      if (this.isWorkDay(currentDate, config.holidays)) {
        // Tentar períodos de diferentes durações (5 a 30 dias)
        for (let duration = 5; duration <= 30; duration += 5) {
          const periodEndDate = new Date(currentDate);
          periodEndDate.setDate(periodEndDate.getDate() + duration - 1);

          if (periodEndDate > endDate) continue;

          const workDays = this.countWorkDays(currentDate, periodEndDate, config.holidays);
          const weekendDays = this.countWeekendDays(currentDate, periodEndDate);
          const holidayDays = this.countHolidayDays(currentDate, periodEndDate, config.holidays);
          const totalDays = duration;

          const efficiency = this.calculateEfficiency(workDays, weekendDays, holidayDays, totalDays);
          const score = this.calculateScore(efficiency, config.scoreWeights);

          periods.push({
            startDate: new Date(currentDate),
            endDate: new Date(periodEndDate),
            type: OptimizationType.CONTINUOUS,
            score,
            totalDays,
            workDays,
            weekendDays,
            holidayDays,
            efficiency,
            efficiencyRating: this.getEfficiencyRating(efficiency),
            isValid: true,
            metadata: {
              length: totalDays
            },
            efficiencyGain: efficiency
          });
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return periods;
  }

  private isWorkDay(date: Date, holidays: Holiday[]): boolean {
    const day = date.getDay();
    if (day === 0 || day === 6) return false; // Fim de semana
    const formattedDate = format(date, 'yyyy-MM-dd');
    return !holidays.some(h => h.date === formattedDate);
  }

  private countWorkDays(start: Date, end: Date, holidays: Holiday[]): number {
    let count = 0;
    const current = new Date(start);
    while (current <= end) {
      if (this.isWorkDay(current, holidays)) count++;
      current.setDate(current.getDate() + 1);
    }
    return count;
  }

  private countWeekendDays(start: Date, end: Date): number {
    let count = 0;
    const current = new Date(start);
    while (current <= end) {
      const day = current.getDay();
      if (day === 0 || day === 6) count++;
      current.setDate(current.getDate() + 1);
    }
    return count;
  }

  private countHolidayDays(start: Date, end: Date, holidays: Holiday[]): number {
    const formattedStart = format(start, 'yyyy-MM-dd');
    const formattedEnd = format(end, 'yyyy-MM-dd');
    return holidays.filter(h => {
      return h.date >= formattedStart && h.date <= formattedEnd;
    }).length;
  }

  private calculateEfficiency(workDays: number, weekendDays: number, holidayDays: number, totalDays: number): number {
    const nonWorkDays = weekendDays + holidayDays;
    return nonWorkDays / totalDays;
  }

  private calculateScore(efficiency: number, weights: SuperOptimizationConfig['scoreWeights']): number {
    return efficiency * weights.efficiency;
  }

  private getEfficiencyRating(efficiency: number): 'low' | 'medium' | 'high' {
    if (efficiency >= 0.7) return 'high';
    if (efficiency >= 0.4) return 'medium';
    return 'low';
  }
} 