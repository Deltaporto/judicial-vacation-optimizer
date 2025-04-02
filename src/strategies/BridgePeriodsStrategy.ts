import { IOptimizationStrategy, OptimizationType, PeriodData, SuperOptimizationConfig } from '../types/optimization';
import { addDays, differenceInBusinessDays, differenceInDays, format, isWeekend } from 'date-fns';
import { Holiday } from '../types/holiday';

export class BridgePeriodsStrategy implements IOptimizationStrategy {
  private readonly MAX_BRIDGE_DAYS = 3;

  async findPeriods(config: SuperOptimizationConfig): Promise<PeriodData[]> {
    console.log('[BridgeStrategy] Iniciando busca de períodos de ponte...');
    const bridges: PeriodData[] = [];
    const startYear = config.startYear;
    const endYear = startYear + config.futureYears;

    console.log(`[BridgeStrategy] Período de busca: ${startYear} até ${endYear}`);
    console.log(`[BridgeStrategy] Total de feriados configurados: ${config.holidays.length}`);

    for (let year = startYear; year <= endYear; year++) {
      console.log(`[BridgeStrategy] Processando ano ${year}...`);
      const yearHolidays = this.getHolidaysForYear(config.holidays, year);
      console.log(`[BridgeStrategy] Feriados encontrados para ${year}: ${yearHolidays.length}`);
      const bridgesForYear = this.findBridgesInYear(yearHolidays, config);
      console.log(`[BridgeStrategy] Pontes encontradas para ${year}: ${bridgesForYear.length}`);
      bridges.push(...bridgesForYear);
    }

    const result = this.selectTopBridges(bridges);
    console.log(`[BridgeStrategy] Total de pontes selecionadas: ${result.length}`);
    return result;
  }

  private getHolidaysForYear(holidays: Holiday[], year: number): Date[] {
    const yearHolidays = holidays
      .filter(h => new Date(h.date).getFullYear() === year)
      .map(h => new Date(h.date))
      .sort((a, b) => a.getTime() - b.getTime());
    
    console.log(`[BridgeStrategy] Feriados para ${year}:`, 
      yearHolidays.map(h => format(h, 'dd/MM/yyyy')).join(', '));
    
    return yearHolidays;
  }

  private findBridgesInYear(holidays: Date[], config: SuperOptimizationConfig): PeriodData[] {
    console.log('[BridgeStrategy] Iniciando busca de pontes no ano...');
    const bridges: PeriodData[] = [];
    
    // Verificar se há feriados para este ano
    if (holidays.length === 0) {
      console.log('[BridgeStrategy] Nenhum feriado encontrado para este ano');
      return [];
    }
    
    // Adiciona fins de semana à lista de dias não úteis
    const nonWorkingDays = [...holidays];
    const yearStart = new Date(holidays[0].getFullYear(), 0, 1);
    const yearEnd = new Date(holidays[0].getFullYear(), 11, 31);
    
    console.log(`[BridgeStrategy] Período de análise: ${format(yearStart, 'dd/MM/yyyy')} até ${format(yearEnd, 'dd/MM/yyyy')}`);
    
    let currentDate = new Date(yearStart);
    let weekendCount = 0;
    while (currentDate <= yearEnd) {
      if (isWeekend(currentDate)) {
        nonWorkingDays.push(new Date(currentDate));
        weekendCount++;
      }
      currentDate = addDays(currentDate, 1);
    }

    console.log(`[BridgeStrategy] Total de fins de semana encontrados: ${weekendCount}`);
    console.log(`[BridgeStrategy] Total de dias não úteis (feriados + fins de semana): ${nonWorkingDays.length}`);

    // Ordena todos os dias não úteis
    nonWorkingDays.sort((a, b) => a.getTime() - b.getTime());

    // Procura por gaps entre dias não úteis
    let potentialBridges = 0;
    for (let i = 0; i < nonWorkingDays.length - 1; i++) {
      const currentNonWorkDay = nonWorkingDays[i];
      const nextNonWorkDay = nonWorkingDays[i + 1];
      
      const businessDays = differenceInBusinessDays(nextNonWorkDay, currentNonWorkDay);
      
      if (businessDays > 0 && businessDays <= this.MAX_BRIDGE_DAYS) {
        potentialBridges++;
        // Obtendo as datas de início e fim da ponte
        const bridgeStart = addDays(currentNonWorkDay, 1);
        const bridgeEnd = addDays(nextNonWorkDay, -1);
        
        console.log(`[BridgeStrategy] Analisando potencial ponte: ${format(bridgeStart, 'dd/MM/yyyy')} até ${format(bridgeEnd, 'dd/MM/yyyy')} (${businessDays} dias úteis)`);
        
        // Verificando se a ponte é válida (início é anterior ao fim)
        if (bridgeStart > bridgeEnd) {
          console.log('[BridgeStrategy] Ponte inválida: data de início posterior à data de fim');
          continue;
        }
        
        // Calcular o número total de dias no período
        const totalDays = differenceInDays(bridgeEnd, bridgeStart) + 1;
        
        // Só considerar pontes com pelo menos 1 dia
        if (totalDays < 1) {
          console.log('[BridgeStrategy] Ponte descartada: menos de 1 dia');
          continue;
        }
        
        const score = this.calculateBridgeScore(
          bridgeStart,
          bridgeEnd,
          currentNonWorkDay,
          nextNonWorkDay,
          config
        );

        console.log(`[BridgeStrategy] Ponte válida encontrada! Score: ${score.toFixed(2)}`);

        bridges.push({
          startDate: bridgeStart,
          endDate: bridgeEnd,
          score,
          type: OptimizationType.BRIDGE,
          totalDays,
          workDays: businessDays,
          weekendDays: 0,
          holidayDays: 0,
          efficiency: score,
          efficiencyRating: 'high',
          isValid: true,
          metadata: {
            businessDays,
            precedingNonWorkDay: currentNonWorkDay,
            followingNonWorkDay: nextNonWorkDay
          },
          efficiencyGain: score
        });
      }
    }

    console.log(`[BridgeStrategy] Total de pontes válidas encontradas: ${bridges.length} (de ${potentialBridges} potenciais)`);
    return bridges;
  }

  private calculateBridgeScore(
    bridgeStart: Date,
    bridgeEnd: Date,
    precedingNonWorkDay: Date,
    followingNonWorkDay: Date,
    config: SuperOptimizationConfig
  ): number {
    let score = 1.0;

    // Bônus para pontes mais curtas (mais eficientes)
    const businessDays = differenceInBusinessDays(bridgeEnd, bridgeStart) + 1;
    score += (this.MAX_BRIDGE_DAYS - businessDays + 1) * 0.2;

    // Bônus se os dias não úteis são feriados (vs. fins de semana)
    const isPrecedingHoliday = config.holidays.some(h => 
      new Date(h.date).getTime() === precedingNonWorkDay.getTime()
    );
    const isFollowingHoliday = config.holidays.some(h => 
      new Date(h.date).getTime() === followingNonWorkDay.getTime()
    );

    if (isPrecedingHoliday) score += 0.3;
    if (isFollowingHoliday) score += 0.3;

    // Bônus para pontes que começam na segunda ou terminam na sexta
    if (bridgeStart.getDay() === 1) score += 0.2;
    if (bridgeEnd.getDay() === 5) score += 0.2;

    console.log(`[BridgeStrategy] Cálculo de score para ponte ${format(bridgeStart, 'dd/MM/yyyy')} - ${format(bridgeEnd, 'dd/MM/yyyy')}:`);
    console.log(`  - Dias úteis: ${businessDays}`);
    console.log(`  - Precede feriado: ${isPrecedingHoliday}`);
    console.log(`  - Segue feriado: ${isFollowingHoliday}`);
    console.log(`  - Começa na segunda: ${bridgeStart.getDay() === 1}`);
    console.log(`  - Termina na sexta: ${bridgeEnd.getDay() === 5}`);
    console.log(`  - Score final: ${score.toFixed(2)}`);

    return score;
  }

  private selectTopBridges(bridges: PeriodData[]): PeriodData[] {
    console.log(`[BridgeStrategy] Selecionando top 10 pontes de ${bridges.length} disponíveis`);
    const result = bridges
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    
    console.log('[BridgeStrategy] Pontes selecionadas:');
    result.forEach((bridge, index) => {
      console.log(`${index + 1}. ${format(bridge.startDate, 'dd/MM/yyyy')} - ${format(bridge.endDate, 'dd/MM/yyyy')} (Score: ${bridge.score.toFixed(2)})`);
    });
    
    return result;
  }
} 