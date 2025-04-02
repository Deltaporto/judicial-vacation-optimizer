import { ContinuousPeriodsStrategy } from '../../../strategies/ContinuousPeriodsStrategy';
import { OptimizationType, SuperOptimizationConfig } from '../../../types/optimization';
import { addDays } from 'date-fns';

// Mock para calculateEfficiency
jest.mock('../../../utils/efficiencyUtils', () => ({
  calculateEfficiency: jest.fn().mockReturnValue(1.2)
}));

describe('ContinuousPeriodsStrategy', () => {
  let strategy: ContinuousPeriodsStrategy;
  let mockConfig: SuperOptimizationConfig;
  
  beforeEach(() => {
    strategy = new ContinuousPeriodsStrategy();
    
    // Configuração básica para testes
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
        { date: '2023-01-01', name: 'Ano Novo', type: 'national' },
        { date: '2023-04-21', name: 'Tiradentes', type: 'national' },
        { date: '2023-05-01', name: 'Dia do Trabalho', type: 'national' }
      ]
    };
  });

  describe('findPeriods', () => {
    it('deve retornar períodos contínuos para o ano especificado', async () => {
      // Act
      const result = await strategy.findPeriods(mockConfig);
      
      // Assert
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe(OptimizationType.CONTINUOUS);
      
      // Verifica se os períodos estão dentro do ano correto
      const allPeriodsInCorrectYear = result.every(period => 
        period.startDate.getFullYear() === mockConfig.startYear ||
        period.startDate.getFullYear() === mockConfig.startYear + mockConfig.futureYears
      );
      expect(allPeriodsInCorrectYear).toBe(true);
    });

    it('deve considerar múltiplos anos quando futureYears > 0', async () => {
      // Arrange
      mockConfig.futureYears = 2;
      
      // Act
      const result = await strategy.findPeriods(mockConfig);
      
      // Assert
      // Verifica se existem períodos em anos diferentes
      const years = new Set(result.map(period => period.startDate.getFullYear()));
      expect(years.size).toBeGreaterThan(1);
    });

    it('deve incluir períodos com diferentes comprimentos', async () => {
      // Act
      const result = await strategy.findPeriods(mockConfig);
      
      // Assert
      // Verifica se existem períodos com diferentes comprimentos
      const lengths = new Set(result.map(period => period.metadata?.length));
      expect(lengths.size).toBeGreaterThan(1);
    });

    it('deve calcular pontuação estratégica corretamente', () => {
      // Arrange: criar período que começa na segunda e termina na sexta
      const mockDate = new Date(2023, 0, 2); // Segunda-feira, 2 de janeiro de 2023
      const endDate = addDays(mockDate, 4);  // Sexta-feira, 6 de janeiro de 2023
      
      // Acessar método privado através de qualquer técnica
      const calculateStrategicScore = (strategy as any).calculateStrategicScore.bind(strategy);
      
      // Act
      const score = calculateStrategicScore(mockDate, endDate);
      
      // Assert
      // Deve ter bônus para segunda (+0.3) e sexta (+0.3)
      expect(score).toBeCloseTo(1.0 + 0.3 + 0.3, 1);
    });

    it('deve penalizar períodos que começam ou terminam em fins de semana', () => {
      // Arrange: criar período que começa em sábado
      const mockWeekendStart = new Date(2023, 0, 7); // Sábado, 7 de janeiro de 2023
      const weekendEnd = addDays(mockWeekendStart, 7);
      
      // Acessar método privado
      const calculateStrategicScore = (strategy as any).calculateStrategicScore.bind(strategy);
      
      // Act
      const score = calculateStrategicScore(mockWeekendStart, weekendEnd);
      
      // Assert
      // Deve ter penalização por começar em fim de semana
      expect(score).toBeLessThan(1.0);
    });
  });

  describe('selectTopPeriods', () => {
    it('deve selecionar os períodos com maior pontuação', () => {
      // Arrange
      const periods = [
        { startDate: new Date(), endDate: new Date(), score: 0.5, type: OptimizationType.CONTINUOUS },
        { startDate: new Date(), endDate: new Date(), score: 0.9, type: OptimizationType.CONTINUOUS },
        { startDate: new Date(), endDate: new Date(), score: 0.3, type: OptimizationType.CONTINUOUS },
        { startDate: new Date(), endDate: new Date(), score: 0.7, type: OptimizationType.CONTINUOUS }
      ];
      
      // Acessar método privado
      const selectTopPeriods = (strategy as any).selectTopPeriods.bind(strategy);
      
      // Act
      const result = selectTopPeriods(periods);
      
      // Assert
      expect(result.length).toBe(periods.length);
      expect(result[0].score).toBe(0.9); // Maior pontuação primeiro
      expect(result[1].score).toBe(0.7);
      expect(result[2].score).toBe(0.5);
      expect(result[3].score).toBe(0.3);
    });
  });
}); 