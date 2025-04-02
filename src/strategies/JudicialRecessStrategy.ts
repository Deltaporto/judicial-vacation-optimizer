import { IOptimizationStrategy, OptimizationType, PeriodData, SuperOptimizationConfig } from '../types/optimization';
import { addDays, differenceInDays, isWithinInterval, isWeekend } from 'date-fns';
import { Holiday } from '../types/holiday';

export class JudicialRecessStrategy implements IOptimizationStrategy {
  private readonly RECESS_START_DAY = 20;
  private readonly RECESS_START_MONTH = 11; // 0-based, então 11 = dezembro
  private readonly RECESS_END_DAY = 6;
  private readonly RECESS_END_MONTH = 0; // 0-based, então 0 = janeiro

  async findPeriods(config: SuperOptimizationConfig): Promise<PeriodData[]> {
    const periods: PeriodData[] = [];
    const startYear = config.startYear;
    const endYear = startYear + config.futureYears;

    for (let year = startYear; year <= endYear; year++) {
      const recessPeriods = this.findRecessPeriodsForYear(year, config);
      periods.push(...recessPeriods);
    }

    return this.selectTopPeriods(periods);
  }

  private findRecessPeriodsForYear(year: number, config: SuperOptimizationConfig): PeriodData[] {
    const periods: PeriodData[] = [];
    
    // Define o período do recesso
    const recessStart = new Date(year, this.RECESS_START_MONTH, this.RECESS_START_DAY);
    const recessEnd = new Date(year + 1, this.RECESS_END_MONTH, this.RECESS_END_DAY);
    
    // Tenta diferentes comprimentos de períodos dentro do recesso
    const possibleLengths = [5, 7, 10, 15];
    
    for (const length of possibleLengths) {
      let currentStart = new Date(recessStart);
      
      while (addDays(currentStart, length - 1) <= recessEnd) {
        const currentEnd = addDays(currentStart, length - 1);
        
        // Verifica se o período é válido
        if (this.isValidRecessPeriod(currentStart, currentEnd, config)) {
          const totalDays = differenceInDays(currentEnd, currentStart) + 1;
          const weekendDays = this.countWeekendDays(currentStart, currentEnd);
          const holidayDays = this.countHolidayDays(currentStart, currentEnd, config.holidays);
          const workDays = totalDays - weekendDays - holidayDays;
          const efficiency = (weekendDays + holidayDays) / totalDays;
          const score = this.calculateRecessScore(
            currentStart,
            currentEnd,
            recessStart,
            recessEnd,
            config
          );

          periods.push({
            startDate: currentStart,
            endDate: currentEnd,
            score,
            type: OptimizationType.JUDICIAL_RECESS,
            totalDays,
            workDays,
            weekendDays,
            holidayDays,
            efficiency,
            efficiencyRating: this.getEfficiencyRating(efficiency),
            isValid: true,
            metadata: {
              length,
              isFullRecess: this.isFullRecessPeriod(currentStart, currentEnd, recessStart, recessEnd)
            },
            efficiencyGain: efficiency
          });
        }
        
        currentStart = addDays(currentStart, 1);
      }
    }

    return periods;
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

  private isValidRecessPeriod(
    start: Date,
    end: Date,
    config: SuperOptimizationConfig
  ): boolean {
    // Verifica se há sobreposição com feriados importantes
    const hasImportantHolidayOverlap = config.holidays.some(h => {
      const holidayDate = new Date(h.date);
      if (h.name === 'Natal' || h.name === 'Ano Novo') {
        return isWithinInterval(holidayDate, { start, end });
      }
      return false;
    });

    // Períodos que incluem Natal ou Ano Novo são considerados inválidos
    // pois esses dias geralmente são reservados para família
    return !hasImportantHolidayOverlap;
  }

  private isFullRecessPeriod(
    start: Date,
    end: Date,
    recessStart: Date,
    recessEnd: Date
  ): boolean {
    return start >= recessStart && end <= recessEnd;
  }

  private calculateRecessScore(
    periodStart: Date,
    periodEnd: Date,
    recessStart: Date,
    recessEnd: Date,
    config: SuperOptimizationConfig
  ): number {
    let score = 1.0;

    // Bônus base por ser durante o recesso
    score += 0.5;

    // Bônus para períodos totalmente dentro do recesso
    if (this.isFullRecessPeriod(periodStart, periodEnd, recessStart, recessEnd)) {
      score += 0.3;
    }

    // Bônus para períodos mais longos durante o recesso
    // (diferente das outras estratégias, aqui queremos maximizar o uso do recesso)
    const length = differenceInDays(periodEnd, periodStart) + 1;
    score += (length / 30) * 0.5; // Máximo de 0.5 para 30 dias

    // Bônus para períodos que começam logo no início do recesso
    const daysFromRecessStart = differenceInDays(periodStart, recessStart);
    if (daysFromRecessStart <= 3) {
      score += 0.2;
    }

    // Bônus para períodos que terminam próximo ao fim do recesso
    const daysToRecessEnd = differenceInDays(recessEnd, periodEnd);
    if (daysToRecessEnd <= 3) {
      score += 0.2;
    }

    // Aplica peso do recesso da configuração
    score *= config.scoreWeights.recess;

    return score;
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