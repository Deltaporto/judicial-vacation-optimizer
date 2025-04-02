import { SuperOptimizationOrchestrator } from '../../../utils/SuperOptimizationOrchestrator';
import { IOptimizationStrategy, OptimizationType, PeriodData, SuperOptimizationConfig } from '../../../types/optimization';
import { Holiday } from '../../../types/holiday';
import { addDays, format } from 'date-fns';

// Mock da estratégia
class MockStrategy implements IOptimizationStrategy {
  private mockPeriods: PeriodData[];

  constructor(mockPeriods: PeriodData[]) {
    this.mockPeriods = mockPeriods;
  }

  async findPeriods(config: SuperOptimizationConfig): Promise<PeriodData[]> {
    return this.mockPeriods;
  }
}

// Mock do RecommendationBuilder
jest.mock('../../../utils/RecommendationBuilder', () => {
  return {
    RecommendationBuilder: jest.fn().mockImplementation(() => {
      return {
        buildFromPeriod: jest.fn((period) => ({
          id: 'mock-id',
          type: period.type === OptimizationType.CONTINUOUS ? 'continuous' : 'other',
          title: `Mock title for ${period.type}`,
          description: 'Mock description',
          suggestedDateRange: {
            startDate: period.startDate,
            endDate: period.endDate
          },
          efficiencyGain: period.score * 100,
          strategicScore: period.score
        }))
      };
    })
  };
});

describe('SuperOptimizationOrchestrator', () => {
  let orchestrator: SuperOptimizationOrchestrator;
  let mockStrategy1: MockStrategy;
  let mockStrategy2: MockStrategy;
  let mockConfig: SuperOptimizationConfig;
  
  beforeEach(() => {
    // Substituir as estratégias do orchestrator com nossos mocks
    mockStrategy1 = new MockStrategy([]);
    mockStrategy2 = new MockStrategy([]);
    
    // Sobrescrever as estratégias para usar nossos mocks
    (SuperOptimizationOrchestrator as any).prototype.strategies = [
      mockStrategy1,
      mockStrategy2
    ];
    
    orchestrator = new SuperOptimizationOrchestrator();
    
    mockConfig = {
      startYear: 2023,
      futureYears: 1,
      maxResults: 10,
      scoreWeights: {
        efficiency: 0.4,
        strategic: 0.3,
        holiday: 0.2,
        recess: 0.1
      },
      holidays: [
        { date: format(new Date(2023, 0, 1), 'yyyy-MM-dd'), name: 'Ano Novo', type: 'national' }
      ]
    };
  });
  
  describe('generateSuperOptimizations', () => {
    it('deve retornar recomendações dos períodos coletados das estratégias', async () => {
      const baseDate = new Date(2024, 0, 1);
      const mockPeriods: PeriodData[] = [
        {
          startDate: baseDate,
          endDate: addDays(baseDate, 10),
          score: 0.8,
          type: OptimizationType.CONTINUOUS,
          totalDays: 11,
          workDays: 8,
          weekendDays: 2,
          holidayDays: 1,
          efficiency: 0.8,
          efficiencyRating: 'high',
          isValid: true,
          metadata: {
            length: 11
          },
          efficiencyGain: 0.8
        }
      ];

      const mockPeriods2: PeriodData[] = [
        {
          startDate: addDays(baseDate, 15),
          endDate: addDays(baseDate, 20),
          score: 0.9,
          type: OptimizationType.BRIDGE,
          totalDays: 6,
          workDays: 4,
          weekendDays: 1,
          holidayDays: 1,
          efficiency: 0.9,
          efficiencyRating: 'high',
          isValid: true,
          metadata: {
            businessDays: 4,
            precedingNonWorkDay: addDays(baseDate, 14),
            followingNonWorkDay: addDays(baseDate, 21)
          },
          efficiencyGain: 0.9
        }
      ];

      const strategy1 = new MockStrategy(mockPeriods);
      const strategy2 = new MockStrategy(mockPeriods2);

      // Sobrescrever as estratégias para usar nossos mocks
      (orchestrator as any).strategies = [strategy1, strategy2];
      const result = await orchestrator.generateSuperOptimizations(mockConfig);

      expect(result.length).toBe(2);
      expect(result[0].efficiencyGain).toBe(0.9); // O período com maior ganho vem primeiro
    });
    
    it('deve retornar array vazio quando estratégias retornam arrays vazios', async () => {
      const strategy1 = new MockStrategy([]);
      const strategy2 = new MockStrategy([]);

      // Sobrescrever as estratégias para usar nossos mocks
      (orchestrator as any).strategies = [strategy1, strategy2];
      const result = await orchestrator.generateSuperOptimizations(mockConfig);

      expect(result.length).toBe(0);
    });
    
    it('deve remover períodos sobrepostos e selecionar os com melhores scores', async () => {
      const baseDate = new Date(2024, 0, 1);
      const mockPeriods: PeriodData[] = [
        {
          startDate: baseDate,
          endDate: addDays(baseDate, 10),
          score: 0.8,
          type: OptimizationType.CONTINUOUS,
          totalDays: 11,
          workDays: 8,
          weekendDays: 2,
          holidayDays: 1,
          efficiency: 0.8,
          efficiencyRating: 'high',
          isValid: true,
          metadata: {
            length: 11
          },
          efficiencyGain: 0.8
        },
        {
          startDate: addDays(baseDate, 5),
          endDate: addDays(baseDate, 15),
          score: 0.7,
          type: OptimizationType.CONTINUOUS,
          totalDays: 11,
          workDays: 8,
          weekendDays: 2,
          holidayDays: 1,
          efficiency: 0.7,
          efficiencyRating: 'high',
          isValid: true,
          metadata: {
            length: 11
          },
          efficiencyGain: 0.7
        },
        {
          startDate: addDays(baseDate, 20),
          endDate: addDays(baseDate, 25),
          score: 0.9,
          type: OptimizationType.BRIDGE,
          totalDays: 6,
          workDays: 4,
          weekendDays: 1,
          holidayDays: 1,
          efficiency: 0.9,
          efficiencyRating: 'high',
          isValid: true,
          metadata: {
            businessDays: 4,
            precedingNonWorkDay: addDays(baseDate, 19),
            followingNonWorkDay: addDays(baseDate, 26)
          },
          efficiencyGain: 0.9
        }
      ];

      const strategy = new MockStrategy(mockPeriods);
      // Sobrescrever as estratégias para usar nossos mocks
      (orchestrator as any).strategies = [strategy];
      const result = await orchestrator.generateSuperOptimizations(mockConfig);

      expect(result.length).toBe(2);
      expect(result[0].efficiencyGain).toBe(0.9);
      expect(result[1].efficiencyGain).toBe(0.8);
    });
    
    it('deve limitar o número de resultados de acordo com maxResults', async () => {
      const baseDate = new Date(2024, 0, 1);
      const mockPeriods: PeriodData[] = [
        {
          startDate: baseDate,
          endDate: addDays(baseDate, 10),
          score: 0.8,
          type: OptimizationType.CONTINUOUS,
          totalDays: 11,
          workDays: 8,
          weekendDays: 2,
          holidayDays: 1,
          efficiency: 0.8,
          efficiencyRating: 'high',
          isValid: true,
          metadata: {
            length: 11
          },
          efficiencyGain: 0.8
        }
      ];

      const strategy = new MockStrategy(mockPeriods);
      // Sobrescrever as estratégias para usar nossos mocks
      (orchestrator as any).strategies = [strategy];
      const config = { ...mockConfig, maxResults: 1 };
      const result = await orchestrator.generateSuperOptimizations(config);

      expect(result.length).toBe(1);
    });
    
    it('deve continuar mesmo se uma estratégia lançar erro', async () => {
      // Arrange
      const baseDate = new Date(2023, 1, 1);
      
      // Uma estratégia retorna dados normalmente
      mockStrategy1 = new MockStrategy([
        {
          startDate: baseDate,
          endDate: addDays(baseDate, 7),
          score: 0.8,
          type: OptimizationType.CONTINUOUS,
          totalDays: 8,
          workDays: 6,
          weekendDays: 2,
          holidayDays: 0,
          efficiency: 0.8,
          efficiencyRating: 'high',
          isValid: true,
          metadata: {
            length: 8
          },
          efficiencyGain: 0.8
        }
      ]);

      // Outra estratégia lança erro
      mockStrategy2 = new MockStrategy([]);
      (mockStrategy2.findPeriods as jest.Mock).mockRejectedValue(new Error('Erro de teste'));

      // Sobrescrever as estratégias para usar nossos mocks
      (orchestrator as any).strategies = [mockStrategy1, mockStrategy2];
      const result = await orchestrator.generateSuperOptimizations(mockConfig);

      expect(result.length).toBe(1);
      expect(result[0].efficiencyGain).toBe(0.8);
    });
  });
  
  describe('periodsOverlap', () => {
    it('deve detectar corretamente períodos sobrepostos', () => {
      // Arrange
      const baseDate = new Date(2023, 1, 1);
      
      const periodA: PeriodData = {
        startDate: baseDate,
        endDate: addDays(baseDate, 10),
        score: 0.7,
        type: OptimizationType.CONTINUOUS,
        totalDays: 11,
        workDays: 8,
        weekendDays: 2,
        holidayDays: 1,
        efficiency: 0.7,
        efficiencyRating: 'high',
        isValid: true,
        metadata: {
          length: 11
        },
        efficiencyGain: 0.7
      };
      
      const periodB: PeriodData = {
        startDate: addDays(baseDate, 5), // Sobrepõe com periodA
        endDate: addDays(baseDate, 15),
        score: 0.8,
        type: OptimizationType.CONTINUOUS,
        totalDays: 11,
        workDays: 8,
        weekendDays: 2,
        holidayDays: 1,
        efficiency: 0.8,
        efficiencyRating: 'high',
        isValid: true,
        metadata: {
          length: 11
        },
        efficiencyGain: 0.8
      };
      
      const periodC: PeriodData = {
        startDate: addDays(baseDate, 15), // Não sobrepõe com periodA (adjacente)
        endDate: addDays(baseDate, 20),
        score: 0.6,
        type: OptimizationType.BRIDGE,
        totalDays: 6,
        workDays: 4,
        weekendDays: 1,
        holidayDays: 1,
        efficiency: 0.6,
        efficiencyRating: 'high',
        isValid: true,
        metadata: {
          businessDays: 4,
          precedingNonWorkDay: addDays(baseDate, 14),
          followingNonWorkDay: addDays(baseDate, 21)
        },
        efficiencyGain: 0.6
      };
      
      // Acessar método privado
      const periodsOverlap = (orchestrator as any).periodsOverlap.bind(orchestrator);
      
      // Act & Assert
      expect(periodsOverlap(periodA, periodB)).toBe(true);
      expect(periodsOverlap(periodB, periodA)).toBe(true); // Comutativo
      expect(periodsOverlap(periodA, periodC)).toBe(false);
      expect(periodsOverlap(periodB, periodC)).toBe(true); // Sobreposição no limite
    });
  });
}); 