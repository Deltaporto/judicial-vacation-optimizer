import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { OptimizationType, PeriodData, Recommendation } from '../types/optimization';
import { v4 as uuidv4 } from 'uuid';

export class RecommendationBuilder {
  buildFromPeriod(period: PeriodData): Recommendation {
    const baseRecommendation: Recommendation = {
      id: uuidv4(),
      type: this.getRecommendationType(period.type),
      title: this.generateTitle(period),
      description: this.generateDescription(period),
      suggestedDateRange: {
        startDate: period.startDate,
        endDate: period.endDate
      },
      efficiencyGain: this.calculateEfficiencyGain(period),
      strategicScore: period.score,
      metadata: period.metadata
    };

    return baseRecommendation;
  }

  private getRecommendationType(type: OptimizationType): string {
    switch (type) {
      case OptimizationType.CONTINUOUS:
        return 'continuous';
      case OptimizationType.BRIDGE:
        return 'bridge';
      case OptimizationType.HOLIDAY_ADJACENCY:
        return 'holiday_adjacency';
      case OptimizationType.JUDICIAL_RECESS:
        return 'judicial_recess';
      default:
        return 'unknown';
    }
  }

  private generateTitle(period: PeriodData): string {
    switch (period.type) {
      case OptimizationType.CONTINUOUS:
        return `Período contínuo de ${period.metadata?.length} dias`;
      
      case OptimizationType.BRIDGE:
        const days = period.metadata?.businessDays ?? period.totalDays;
        const suffix = days === 1 ? 'dia' : 'dias';
        return `Ponte de ${days} ${suffix}`;
      
      case OptimizationType.HOLIDAY_ADJACENCY:
        const holiday = period.metadata?.adjacentHoliday;
        const position = period.metadata?.isBeforeHoliday ? 'antes' : 'depois';
        return `${period.metadata?.length} dias ${position} de ${holiday.name}`;
      
      case OptimizationType.JUDICIAL_RECESS:
        return `Período de recesso de ${period.metadata?.length} dias`;
      
      default:
        return `Período de ${period.metadata?.length} dias`;
    }
  }

  private generateDescription(period: PeriodData): string {
    const formattedStartDate = format(period.startDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
    const formattedEndDate = format(period.endDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
    
    let description = `Período de férias de ${formattedStartDate} até ${formattedEndDate}. `;

    switch (period.type) {
      case OptimizationType.CONTINUOUS:
        description += `Este é um período contínuo de ${period.metadata?.length} dias, `;
        if (period.startDate.getDay() === 1) {
          description += 'começando em uma segunda-feira, o que é ideal. ';
        }
        if (period.endDate.getDay() === 5) {
          description += 'terminando em uma sexta-feira, o que é ótimo. ';
        }
        break;

      case OptimizationType.BRIDGE:
        const businessDays = period.metadata?.businessDays;
        description += `Esta é uma ponte de ${businessDays} dia${businessDays > 1 ? 's' : ''} útil${businessDays > 1 ? 's' : ''}, `;
        description += 'conectando dois períodos não úteis. ';
        break;

      case OptimizationType.HOLIDAY_ADJACENCY:
        const holiday = period.metadata?.adjacentHoliday;
        const position = period.metadata?.isBeforeHoliday ? 'antes' : 'depois';
        description += `Este período está posicionado estrategicamente ${position} do feriado de ${holiday.name}, `;
        description += 'maximizando o aproveitamento do feriado. ';
        break;

      case OptimizationType.JUDICIAL_RECESS:
        if (period.metadata?.isFullRecess) {
          description += 'Este período está totalmente dentro do recesso judiciário, ';
          description += 'aproveitando ao máximo a redução de atividades do período. ';
        } else {
          description += 'Este período aproveita parcialmente o recesso judiciário. ';
        }
        break;
    }

    description += `A pontuação estratégica deste período é ${(period.score * 100).toFixed(1)}%.`;
    return description;
  }

  private calculateEfficiencyGain(period: PeriodData): number {
    // A eficiência é calculada com base na pontuação e metadados específicos
    let efficiency = period.score;

    switch (period.type) {
      case OptimizationType.BRIDGE:
        // Pontes são naturalmente mais eficientes
        efficiency *= 1.2;
        break;

      case OptimizationType.HOLIDAY_ADJACENCY:
        // Adjacência a feriados tem eficiência baseada na importância do feriado
        const holidayImportance = period.metadata?.adjacentHoliday?.importance || 1.0;
        efficiency *= (1 + holidayImportance * 0.2);
        break;

      case OptimizationType.JUDICIAL_RECESS:
        // Períodos no recesso têm eficiência extra se forem completos
        if (period.metadata?.isFullRecess) {
          efficiency *= 1.3;
        } else {
          efficiency *= 1.1;
        }
        break;
    }

    // Normaliza para percentual
    return efficiency * 100;
  }
} 