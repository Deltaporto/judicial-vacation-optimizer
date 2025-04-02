import { IOptimizationStrategy, PeriodData, Recommendation, SuperOptimizationConfig } from '../types/optimization';
import { ContinuousPeriodsStrategy } from '../strategies/ContinuousPeriodsStrategy';
import { BridgePeriodsStrategy } from '../strategies/BridgePeriodsStrategy';
import { HolidayAdjacencyStrategy } from '../strategies/HolidayAdjacencyStrategy';
import { JudicialRecessStrategy } from '../strategies/JudicialRecessStrategy';
import { RecommendationBuilder } from './RecommendationBuilder';
import { isWithinInterval } from 'date-fns';

export class SuperOptimizationOrchestrator {
  private strategies: IOptimizationStrategy[];
  private recommendationBuilder: RecommendationBuilder;

  constructor() {
    // Inicializa todas as estratégias
    this.strategies = [
      new ContinuousPeriodsStrategy(),
      new BridgePeriodsStrategy(),
      new HolidayAdjacencyStrategy(),
      new JudicialRecessStrategy()
    ];
    
    this.recommendationBuilder = new RecommendationBuilder();
  }

  async generateSuperOptimizations(config: SuperOptimizationConfig): Promise<Recommendation[]> {
    // 1. Coleta períodos de todas as estratégias
    const allPeriods = await this.collectPeriodsFromStrategies(config);
    
    // 2. Remove sobreposições e seleciona os melhores períodos
    const selectedPeriods = this.selectNonOverlappingPeriods(allPeriods);
    
    // 3. Converte períodos em recomendações
    const recommendations = this.convertToRecommendations(selectedPeriods);
    
    // 4. Aplica ordenação final e limita o número de resultados
    return this.filterAndSortRecommendations(recommendations, config.maxResults);
  }

  private async collectPeriodsFromStrategies(config: SuperOptimizationConfig): Promise<PeriodData[]> {
    const allPeriods: PeriodData[] = [];
    
    for (const strategy of this.strategies) {
      try {
        const periods = await strategy.findPeriods(config);
        allPeriods.push(...periods);
      } catch (error) {
        console.error(`Erro ao executar estratégia: ${error}`);
        // Continua com as outras estratégias mesmo se uma falhar
      }
    }

    return allPeriods;
  }

  private selectNonOverlappingPeriods(periods: PeriodData[]): PeriodData[] {
    // Ordena períodos por pontuação (decrescente)
    const sortedPeriods = [...periods].sort((a, b) => b.score - a.score);
    const selectedPeriods: PeriodData[] = [];

    for (const period of sortedPeriods) {
      // Verifica se o período atual se sobrepõe a algum já selecionado
      const hasOverlap = selectedPeriods.some(selected =>
        this.periodsOverlap(period, selected)
      );

      if (!hasOverlap) {
        selectedPeriods.push(period);
      }
    }

    return selectedPeriods;
  }

  private periodsOverlap(periodA: PeriodData, periodB: PeriodData): boolean {
    return isWithinInterval(periodA.startDate, {
      start: periodB.startDate,
      end: periodB.endDate
    }) || isWithinInterval(periodA.endDate, {
      start: periodB.startDate,
      end: periodB.endDate
    }) || isWithinInterval(periodB.startDate, {
      start: periodA.startDate,
      end: periodA.endDate
    });
  }

  private convertToRecommendations(periods: PeriodData[]): Recommendation[] {
    return periods.map(period => this.recommendationBuilder.buildFromPeriod(period));
  }

  private filterAndSortRecommendations(
    recommendations: Recommendation[],
    maxResults: number
  ): Recommendation[] {
    // Ordena por uma combinação de eficiência e pontuação estratégica
    return recommendations
      .sort((a, b) => {
        const scoreA = this.calculateFinalScore(a);
        const scoreB = this.calculateFinalScore(b);
        return scoreB - scoreA;
      })
      .slice(0, maxResults);
  }

  private calculateFinalScore(recommendation: Recommendation): number {
    // Combina eficiência e pontuação estratégica com pesos
    const efficiencyWeight = 0.6;
    const strategicWeight = 0.4;
    
    return (recommendation.efficiencyGain * efficiencyWeight) +
           (recommendation.strategicScore * 100 * strategicWeight);
  }
} 