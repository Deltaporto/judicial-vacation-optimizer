// Teste do EfficiencyCalculator modificado
import { VacationPeriod } from '@/types';

// Função que simula o calculateCombinedEfficiency
function calculateCombinedEfficiency(periods: VacationPeriod[]) {
  // Filter out any null or undefined periods
  const validPeriods = periods.filter(Boolean);
  
  // If no valid periods, return 0
  if (validPeriods.length === 0) return 0;
  
  let totalWorkDays = 0;
  let totalDays = 0;
  
  validPeriods.forEach(period => {
    totalWorkDays += period.workDays;
    totalDays += period.totalDays;
  });
  
  // Avoid division by zero
  if (totalDays === 0) return 0;
  
  return (totalDays - totalWorkDays) / totalDays;
}

// Criar alguns períodos de teste
const period1: VacationPeriod = {
  startDate: new Date(2024, 2, 7), // 7 de março
  endDate: new Date(2024, 2, 15), // 15 de março
  totalDays: 9,
  workDays: 6,
  weekendDays: 3,
  holidayDays: 0,
  efficiency: 0.33,
  efficiencyRating: 'medium',
  isValid: true
};

const period2: VacationPeriod = {
  startDate: new Date(2024, 2, 16), // 16 de março
  endDate: new Date(2024, 2, 28), // 28 de março
  totalDays: 13,
  workDays: 9,
  weekendDays: 4,
  holidayDays: 0,
  efficiency: 0.31,
  efficiencyRating: 'medium',
  isValid: true 
};

const nullPeriod = null;

// Testar diferentes cenários
console.log("=== Teste de Períodos Fracionados ===");

// 1. Teste com períodos válidos
const validPeriods = [period1, period2];
console.log("1. Eficiência combinada de dois períodos válidos:");
console.log(`   Período 1: ${period1.totalDays} dias, ${period1.workDays} dias úteis, eficiência ${(period1.efficiency * 100).toFixed(0)}%`);
console.log(`   Período 2: ${period2.totalDays} dias, ${period2.workDays} dias úteis, eficiência ${(period2.efficiency * 100).toFixed(0)}%`);
const combinedEfficiency = calculateCombinedEfficiency(validPeriods);
console.log(`   Eficiência combinada: ${(combinedEfficiency * 100).toFixed(0)}%`);

// 2. Teste com períodos incluindo null
const periodsWithNull = [period1, nullPeriod, period2];
console.log("\n2. Eficiência combinada com um período null:");
const combinedEfficiencyWithNull = calculateCombinedEfficiency(periodsWithNull);
console.log(`   Eficiência combinada: ${(combinedEfficiencyWithNull * 100).toFixed(0)}%`);

// 3. Teste com array vazio
const emptyPeriods: VacationPeriod[] = [];
console.log("\n3. Eficiência combinada com array vazio:");
const emptyEfficiency = calculateCombinedEfficiency(emptyPeriods);
console.log(`   Eficiência combinada: ${(emptyEfficiency * 100).toFixed(0)}%`);

// 4. Teste com apenas períodos null
const onlyNullPeriods = [null, null];
console.log("\n4. Eficiência combinada com apenas períodos null:");
const nullEfficiency = calculateCombinedEfficiency(onlyNullPeriods as any);
console.log(`   Eficiência combinada: ${(nullEfficiency * 100).toFixed(0)}%`);

console.log("\n=== Teste Concluído ==="); 