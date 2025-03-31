import { calculateImprovedEfficiency, generateImprovedRecommendations } from '../utils/improvedEfficiencyUtils';
import { isHolidayFixed, isWeekendFixed, getHolidaysInRangeFixed } from '../utils/holidayUtils';
import { VacationPeriod } from '../types';

// Mock mais completo para feriados de 2024
jest.mock('../utils/holidayData', () => ({
  isHolidayFixed: (date: Date) => {
    const holidays = [
      { date: new Date(2024, 0, 1), name: "Ano Novo" },
      { date: new Date(2024, 2, 29), name: "Sexta-feira Santa" },
      { date: new Date(2024, 4, 1), name: "Dia do Trabalho" },
      { date: new Date(2024, 4, 30), name: "Corpus Christi" }, // Quinta-feira
      { date: new Date(2024, 9, 12), name: "Nossa Senhora Aparecida" },
      { date: new Date(2024, 10, 2), name: "Finados" }, // Sábado
      { date: new Date(2024, 10, 15), name: "Proclamação da República" }, // Sexta-feira
      { date: new Date(2024, 11, 25), name: "Natal" } // Quarta-feira
    ];
    return holidays.find(h => 
      h.date.getTime() === date.getTime()
    ) || null;
  },
  isWeekendFixed: (date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  },
  getHolidaysInRangeFixed: (startDate: Date, endDate: Date) => {
    const holidays = [
      { date: new Date(2024, 0, 1), name: "Ano Novo" },
      { date: new Date(2024, 2, 29), name: "Sexta-feira Santa" },
      { date: new Date(2024, 4, 1), name: "Dia do Trabalho" },
      { date: new Date(2024, 4, 30), name: "Corpus Christi" }, // Quinta-feira
      { date: new Date(2024, 9, 12), name: "Nossa Senhora Aparecida" },
      { date: new Date(2024, 10, 2), name: "Finados" }, // Sábado
      { date: new Date(2024, 10, 15), name: "Proclamação da República" }, // Sexta-feira
      { date: new Date(2024, 11, 25), name: "Natal" } // Quarta-feira
    ];
    return holidays.filter(h => 
      h.date >= startDate && h.date <= endDate
    );
  }
}));

describe('Improved Efficiency Utils', () => {
  describe('calculateImprovedEfficiency', () => {
    test('deve retornar eficiência maior para períodos que começam na segunda-feira', () => {
      const startDate = new Date(2024, 0, 8); // Segunda-feira
      const endDate = new Date(2024, 0, 12); // Sexta-feira

      const efficiency = calculateImprovedEfficiency(startDate, endDate, isHolidayFixed, isWeekendFixed);
      expect(efficiency).toBeGreaterThan(1.0);
    });

    test('deve retornar eficiência maior para períodos que começam na segunda e terminam na sexta', () => {
      const startDateMonday = new Date(2024, 0, 8); // Segunda-feira
      const startDateTuesday = new Date(2024, 0, 9); // Terça-feira
      const endDate = new Date(2024, 0, 12); // Sexta-feira

      const efficiencyMonday = calculateImprovedEfficiency(startDateMonday, endDate, isHolidayFixed, isWeekendFixed);
      const efficiencyTuesday = calculateImprovedEfficiency(startDateTuesday, endDate, isHolidayFixed, isWeekendFixed);

      expect(efficiencyMonday).toBeGreaterThan(efficiencyTuesday);
    });

    test('deve penalizar períodos com muitos feriados', () => {
      const startDateHoliday = new Date(2024, 11, 23); // Período com feriado de Natal
      const endDateHoliday = new Date(2024, 11, 27);
      
      const startDateRegular = new Date(2024, 0, 8); // Período regular
      const endDateRegular = new Date(2024, 0, 12);

      const efficiencyHoliday = calculateImprovedEfficiency(startDateHoliday, endDateHoliday, isHolidayFixed, isWeekendFixed);
      const efficiencyRegular = calculateImprovedEfficiency(startDateRegular, endDateRegular, isHolidayFixed, isWeekendFixed);

      // O período com feriado deve ter eficiência menor
      expect(efficiencyHoliday / efficiencyRegular).toBeLessThan(0.9);
    });
  });

  describe('generateImprovedRecommendations', () => {
    const baseMockVacationPeriod: VacationPeriod = {
      startDate: new Date(2024, 0, 1),
      endDate: new Date(2024, 11, 31),
      totalDays: 30, // Valor de exemplo, pode ser ajustado se necessário
      workDays: 20, // Valor de exemplo
      weekendDays: 8, // Valor de exemplo
      holidayDays: 2, // Valor de exemplo
      efficiency: 1.0, // Valor de exemplo
      efficiencyRating: 'medium', // Valor de exemplo
      isValid: true, // Valor de exemplo
    };

    test('deve incluir recomendações para feriados extensíveis', () => {
      const mockVacationPeriod = { ...baseMockVacationPeriod };
      const recommendations = generateImprovedRecommendations(mockVacationPeriod);
      const holidayExtensions = recommendations.filter(r => r.type === 'holiday_extension');
      expect(holidayExtensions.length).toBeGreaterThan(0);
    });

    test('deve incluir recomendações para períodos limpos', () => {
      const mockVacationPeriod = { ...baseMockVacationPeriod };
      const recommendations = generateImprovedRecommendations(mockVacationPeriod);
      const cleanPeriods = recommendations.filter(r => r.type === 'clean_period');
      expect(cleanPeriods.length).toBeGreaterThan(0);
    });

    test('deve ordenar recomendações por pontuação estratégica', () => {
      const mockVacationPeriod = { ...baseMockVacationPeriod };
      const recommendations = generateImprovedRecommendations(mockVacationPeriod);
      
      for (let i = 1; i < recommendations.length; i++) {
        expect(recommendations[i-1].strategicScore).toBeGreaterThanOrEqual(recommendations[i].strategicScore);
      }
    });
  });
}); 