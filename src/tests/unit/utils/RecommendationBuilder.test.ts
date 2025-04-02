import { RecommendationBuilder } from '../../../utils/RecommendationBuilder';
import { OptimizationType, PeriodData } from '../../../types/optimization';
import { Holiday } from '../../../types/holiday';
import { v4 as uuidv4 } from 'uuid';

// Mock uuid para testes consistentes
jest.mock('uuid');
(uuidv4 as jest.Mock).mockReturnValue('test-uuid-123');

describe('RecommendationBuilder', () => {
  let builder: RecommendationBuilder;
  
  beforeEach(() => {
    builder = new RecommendationBuilder();
  });

  describe('buildFromPeriod', () => {
    it('deve criar uma recomendação para um período contínuo', () => {
      const period: PeriodData = {
        startDate: new Date(2024, 0, 1),
        endDate: new Date(2024, 0, 15),
        score: 0.8,
        type: OptimizationType.CONTINUOUS,
        totalDays: 15,
        workDays: 11,
        weekendDays: 3,
        holidayDays: 1,
        efficiency: 0.8,
        efficiencyRating: 'high',
        isValid: true,
        metadata: {
          length: 15
        },
        efficiencyGain: 0.8
      };

      const recommendation = builder.buildFromPeriod(period);

      expect(recommendation.title).toBe('Período contínuo de 15 dias');
      expect(recommendation.description).toContain('01/01/2024');
      expect(recommendation.description).toContain('15/01/2024');
      expect(recommendation.efficiencyGain).toBe(0.8);
    });

    it('deve criar uma recomendação para um período ponte', () => {
      const period: PeriodData = {
        startDate: new Date(2024, 0, 2),
        endDate: new Date(2024, 0, 4),
        score: 0.9,
        type: OptimizationType.BRIDGE,
        totalDays: 3,
        workDays: 3,
        weekendDays: 0,
        holidayDays: 0,
        efficiency: 0.9,
        efficiencyRating: 'high',
        isValid: true,
        metadata: {
          businessDays: 3,
          precedingNonWorkDay: new Date(2024, 0, 1),
          followingNonWorkDay: new Date(2024, 0, 5)
        },
        efficiencyGain: 0.9
      };

      const recommendation = builder.buildFromPeriod(period);

      expect(recommendation.title).toBe('Período ponte de 3 dias');
      expect(recommendation.description).toContain('02/01/2024');
      expect(recommendation.description).toContain('04/01/2024');
      expect(recommendation.efficiencyGain).toBe(0.9);
    });

    it('deve criar uma recomendação para um período ponte com feriado adjacente', () => {
      const holiday: Holiday = {
        date: "2024-01-01",
        name: 'Ano Novo',
        type: 'national'
      };

      const period: PeriodData = {
        startDate: new Date(2024, 0, 2),
        endDate: new Date(2024, 0, 4),
        score: 0.9,
        type: OptimizationType.BRIDGE,
        totalDays: 3,
        workDays: 3,
        weekendDays: 0,
        holidayDays: 0,
        efficiency: 0.9,
        efficiencyRating: 'high',
        isValid: true,
        metadata: {
          businessDays: 3,
          precedingNonWorkDay: new Date(2024, 0, 1),
          followingNonWorkDay: new Date(2024, 0, 5),
          adjacentHoliday: holiday,
          isBeforeHoliday: false
        },
        efficiencyGain: 0.9
      };

      const recommendation = builder.buildFromPeriod(period);

      expect(recommendation.title).toBe('Período ponte de 3 dias');
      expect(recommendation.description).toContain('Ano Novo');
    });

    it('deve criar uma recomendação para um período de recesso', () => {
      const period: PeriodData = {
        startDate: new Date(2024, 11, 20),
        endDate: new Date(2024, 11, 31),
        score: 1.0,
        type: OptimizationType.JUDICIAL_RECESS,
        totalDays: 12,
        workDays: 8,
        weekendDays: 3,
        holidayDays: 1,
        efficiency: 1.0,
        efficiencyRating: 'high',
        isValid: true,
        metadata: {
          length: 12,
          isFullRecess: true
        },
        efficiencyGain: 1.0
      };

      const recommendation = builder.buildFromPeriod(period);

      expect(recommendation.title).toBe('Período de recesso de 12 dias');
      expect(recommendation.description).toContain('recesso judiciário');
    });

    it('deve aplicar bônus de eficiência para períodos estratégicos', () => {
      const basePeriod: PeriodData = {
        startDate: new Date(2024, 0, 1),
        endDate: new Date(2024, 0, 5),
        score: 0.8,
        type: OptimizationType.CONTINUOUS,
        totalDays: 5,
        workDays: 5,
        weekendDays: 0,
        holidayDays: 0,
        efficiency: 0.8,
        efficiencyRating: 'high',
        isValid: true,
        metadata: {
          length: 5
        },
        efficiencyGain: 0.8
      };

      const holiday: Holiday = {
        date: "2024-01-06",
        name: 'Dia de Reis',
        type: 'national'
      };

      const strategicPeriod: PeriodData = {
        ...basePeriod,
        metadata: {
          ...basePeriod.metadata,
          adjacentHoliday: holiday,
          isBeforeHoliday: true
        }
      };

      const baseRecommendation = builder.buildFromPeriod(basePeriod);
      const strategicRecommendation = builder.buildFromPeriod(strategicPeriod);

      expect(strategicRecommendation.efficiencyGain).toBeGreaterThan(baseRecommendation.efficiencyGain);
    });
  });
}); 