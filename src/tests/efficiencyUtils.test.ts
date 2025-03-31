import { calculateAdjustedEfficiency } from '../utils/efficiencyUtils';
import { VacationPeriod } from '../types';

describe('calculateAdjustedEfficiency', () => {
  // Função auxiliar para criar períodos de teste
  const createTestPeriod = (
    startDate: Date,
    endDate: Date,
    workDays: number,
    holidayDays: number,
    weekendDays: number
  ): VacationPeriod => ({
    startDate,
    endDate,
    workDays,
    holidayDays,
    weekendDays,
    totalDays: workDays + holidayDays + weekendDays,
    isValid: true,
    efficiency: 1.0,
    efficiencyRating: 'low'
  });

  test('deve retornar 1.0 quando não há dias úteis', () => {
    const period = createTestPeriod(
      new Date(2024, 0, 1),
      new Date(2024, 0, 2),
      0, // workDays
      1, // holidayDays
      1  // weekendDays
    );
    expect(calculateAdjustedEfficiency(period)).toBe(1.0);
  });

  test('deve calcular corretamente o ganho por feriados em dias úteis', () => {
    const period = createTestPeriod(
      new Date(2024, 0, 1), // Segunda-feira
      new Date(2024, 0, 5), // Sexta-feira
      4, // workDays
      1, // holidayDays (1 feriado em dia útil)
      0  // weekendDays
    );
    // Eficiência esperada: 1.0 (base) + (1/4) + 0.05 (segunda) + 0.05 (sexta) + 0.05 (perfeito) = 1.36
    expect(calculateAdjustedEfficiency(period)).toBe(1.36);
  });

  test('deve aplicar bônus para início na segunda-feira', () => {
    const period = createTestPeriod(
      new Date(2024, 0, 1), // Segunda-feira
      new Date(2024, 0, 3), // Quarta-feira
      3, // workDays
      0, // holidayDays
      0  // weekendDays
    );
    // Eficiência esperada: 1.0 (base) + 0.05 (bônus segunda)
    expect(calculateAdjustedEfficiency(period)).toBe(1.05);
  });

  test('deve aplicar bônus para término na sexta-feira', () => {
    const period = createTestPeriod(
      new Date(2024, 0, 3), // Quarta-feira
      new Date(2024, 0, 5), // Sexta-feira
      3, // workDays
      0, // holidayDays
      0  // weekendDays
    );
    // Eficiência esperada: 1.0 (base) + 0.05 (bônus sexta)
    expect(calculateAdjustedEfficiency(period)).toBe(1.05);
  });

  test('deve aplicar bônus adicional para período perfeito (segunda a sexta)', () => {
    const period = createTestPeriod(
      new Date(2024, 0, 1), // Segunda-feira
      new Date(2024, 0, 5), // Sexta-feira
      5, // workDays
      0, // holidayDays
      0  // weekendDays
    );
    // Eficiência esperada: 1.0 (base) + 0.05 (segunda) + 0.05 (sexta) + 0.05 (perfeito)
    expect(calculateAdjustedEfficiency(period)).toBe(1.15);
  });

  test('deve aplicar penalização por desperdício', () => {
    const period = createTestPeriod(
      new Date(2024, 0, 1), // Segunda-feira
      new Date(2024, 0, 7), // Domingo
      5, // workDays
      0, // holidayDays
      2  // weekendDays
    );
    // Eficiência esperada: 1.0 (base) + 0.05 (segunda) - (2/7 * 0.2) = 1.05 - 0.057 = 1.05
    expect(calculateAdjustedEfficiency(period)).toBe(1.05);
  });

  test('deve combinar todos os fatores corretamente', () => {
    const period = createTestPeriod(
      new Date(2024, 0, 1), // Segunda-feira
      new Date(2024, 0, 5), // Sexta-feira
      3, // workDays
      1, // holidayDays
      1  // weekendDays
    );
    // Eficiência esperada:
    // 1.0 (base)
    // + (1/3) (ganho por feriado)
    // + 0.05 (segunda)
    // + 0.05 (sexta)
    // + 0.05 (perfeito)
    // - (2/5 * 0.2) (penalização por desperdício)
    // = 1.40
    expect(calculateAdjustedEfficiency(period)).toBe(1.40);
  });

  test('deve garantir eficiência mínima de 1.0', () => {
    const period = createTestPeriod(
      new Date(2024, 0, 6), // Sábado
      new Date(2024, 0, 7), // Domingo
      1, // workDays
      0, // holidayDays
      1  // weekendDays
    );
    // Mesmo com muita penalização, não deve ficar abaixo de 1.0
    expect(calculateAdjustedEfficiency(period)).toBe(1.0);
  });
}); 