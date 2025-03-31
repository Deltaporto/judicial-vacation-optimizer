import { VacationPeriod } from '@/types';
import { 
  calculateAdjustedEfficiency, 
  calculateNewAdjustedEfficiency,
  generateRecommendations,
  findOptimalPeriods,
  findOptimalFractionedPeriods
} from '@/utils/efficiencyUtils';
import { format } from 'date-fns';

function runImpactTests() {
  console.log('=== TESTES DE IMPACTO DA NOVA FUNÇÃO DE EFICIÊNCIA ===\n');

  // 1. Teste com períodos de diferentes durações
  const testPeriods: VacationPeriod[] = [
    // Períodos curtos (5-7 dias)
    {
      startDate: new Date(2024, 0, 1),
      endDate: new Date(2024, 0, 5),
      workDays: 5,
      holidayDays: 1,
      weekendDays: 0,
      totalDays: 5,
      isValid: true,
      efficiency: 1.0,
      efficiencyRating: 'low'
    },
    // Períodos médios (10-15 dias)
    {
      startDate: new Date(2024, 1, 1),
      endDate: new Date(2024, 1, 15),
      workDays: 11,
      holidayDays: 1,
      weekendDays: 4,
      totalDays: 15,
      isValid: true,
      efficiency: 1.0,
      efficiencyRating: 'low'
    },
    // Períodos longos (20-30 dias)
    {
      startDate: new Date(2024, 6, 1),
      endDate: new Date(2024, 6, 30),
      workDays: 23,
      holidayDays: 0,
      weekendDays: 8,
      totalDays: 30,
      isValid: true,
      efficiency: 1.0,
      efficiencyRating: 'low'
    }
  ];

  console.log('1. Comparação de Eficiência por Duração do Período:');
  testPeriods.forEach(period => {
    const oldEfficiency = calculateAdjustedEfficiency(period);
    const newEfficiency = calculateNewAdjustedEfficiency(period);
    const diffPercent = ((newEfficiency - oldEfficiency) / oldEfficiency) * 100;

    console.log(`\nPeríodo de ${period.totalDays} dias (${format(period.startDate, 'dd/MM/yyyy')} a ${format(period.endDate, 'dd/MM/yyyy')}):`);
    console.log(`- Eficiência antiga: ${(oldEfficiency * 100).toFixed(2)}%`);
    console.log(`- Eficiência nova: ${(newEfficiency * 100).toFixed(2)}%`);
    console.log(`- Diferença: ${diffPercent.toFixed(2)}%`);
  });

  // 2. Teste de impacto nas recomendações
  console.log('\n2. Impacto nas Recomendações:');
  const samplePeriod = testPeriods[1]; // Usando o período médio como exemplo
  const recommendations = generateRecommendations(samplePeriod);

  console.log(`\nTotal de recomendações geradas: ${recommendations.length}`);
  recommendations.forEach((rec, index) => {
    console.log(`\nRecomendação ${index + 1}:`);
    console.log(`- Tipo: ${rec.type}`);
    console.log(`- Título: ${rec.title}`);
    console.log(`- Ganho de eficiência: ${(rec.efficiencyGain * 100).toFixed(2)}%`);
  });

  // 3. Teste de períodos ótimos
  console.log('\n3. Análise de Períodos Ótimos:');
  const year = 2024;
  const optimalPeriods = findOptimalPeriods(year, 15, 5);

  console.log(`\nTop 5 períodos ótimos de 15 dias em ${year}:`);
  optimalPeriods.forEach((period, index) => {
    console.log(`\nPeríodo ${index + 1}:`);
    console.log(`- Data: ${format(period.startDate, 'dd/MM/yyyy')} a ${format(period.endDate, 'dd/MM/yyyy')}`);
    console.log(`- Eficiência: ${(period.efficiency * 100).toFixed(2)}%`);
    console.log(`- Dias úteis: ${period.workDays}, Feriados: ${period.holidayDays}, Fins de semana: ${period.weekendDays}`);
  });

  // 4. Teste de fracionamento
  console.log('\n4. Análise de Fracionamento:');
  const fractionedPeriods = findOptimalFractionedPeriods(year, 6, 5);

  if (fractionedPeriods) {
    console.log(`\nMelhores períodos fracionados de 5 dias em ${year}:`);
    fractionedPeriods.periods.forEach((period, index) => {
      console.log(`\nFração ${index + 1}:`);
      console.log(`- Data: ${format(period.startDate, 'dd/MM/yyyy')} a ${format(period.endDate, 'dd/MM/yyyy')}`);
      console.log(`- Eficiência: ${(period.efficiency * 100).toFixed(2)}%`);
      console.log(`- Dias úteis: ${period.workDays}, Feriados: ${period.holidayDays}, Fins de semana: ${period.weekendDays}`);
    });
    console.log(`\nEficiência combinada: ${(fractionedPeriods.combinedEfficiency * 100).toFixed(2)}%`);
  }
}

// Executar os testes
runImpactTests(); 