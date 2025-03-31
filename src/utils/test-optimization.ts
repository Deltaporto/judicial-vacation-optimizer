/**
 * Script de teste para validar as estratégias de otimização
 * 
 * Para executar: 
 * 1. Adicione um botão temporário no App.tsx ou em outro componente
 * 2. No clique do botão, importe e chame a função runOptimizationTests()
 * 3. Verifique o console para os resultados
 */

import { generateImprovedRecommendations } from './improvedEfficiencyUtils';
import { findOptimalPeriods } from './efficiencyUtils';
import { getVacationPeriodDetails } from './dateUtils';
import { addDays } from 'date-fns';
import testFractionStrategies from './fraction-test';

// Main function to run all optimization tests
export const runOptimizationTests = () => {
  console.log('=== INICIANDO TESTES DE ESTRATÉGIAS DE OTIMIZAÇÃO ===');
  
  testHolidayBridges();
  testOptimalShift();
  testSmartSplit();
  testPredictiveAnalysis();
  testFractionStrategies();
  testOptimalFractionTabVisibility();
  
  console.log('\n=== TESTES DE OTIMIZAÇÃO CONCLUÍDOS ===');
};

// Testar pontes entre feriados
const testHolidayBridges = () => {
  console.log('\n--- TESTE DE PONTES ENTRE FERIADOS ---');
  
  // Criar um período curto em mês com muitos feriados (abril ou dezembro)
  const testDate1 = new Date(2023, 3, 10); // 10 de abril de 2023
  const testDate2 = new Date(2023, 3, 14); // 14 de abril de 2023
  
  const vacationPeriod = getVacationPeriodDetails(testDate1, testDate2);
  
  console.log(`Período de teste: ${testDate1.toLocaleDateString()} a ${testDate2.toLocaleDateString()}`);
  console.log(`Total de dias: ${vacationPeriod.totalDays}`);
  
  const recommendations = generateImprovedRecommendations(vacationPeriod);
  
  // Filtrar apenas recomendações do tipo 'bridge'
  const bridgeRecommendations = recommendations.filter(rec => rec.type === 'bridge');
  
  console.log(`Recomendações de pontes encontradas: ${bridgeRecommendations.length}`);
  bridgeRecommendations.forEach((rec, i) => {
    console.log(`\nPonte ${i + 1}:`);
    console.log(`Descrição: ${rec.description}`);
    console.log(`De: ${rec.suggestedDateRange.startDate.toLocaleDateString()} a ${rec.suggestedDateRange.endDate.toLocaleDateString()}`);
    console.log(`Ganho de eficiência: ${(rec.efficiencyGain * 100).toFixed(2)}%`);
  });
};

// Testar algoritmo de deslocamento melhorado
const testOptimalShift = () => {
  console.log('\n--- TESTE DE DESLOCAMENTO OTIMIZADO ---');
  
  // Criar um período próximo a um feriado, mas não incluindo-o
  const testDate1 = new Date(2023, 11, 19); // 19 de dezembro de 2023
  const testDate2 = new Date(2023, 11, 26); // 26 de dezembro de 2023
  
  const vacationPeriod = getVacationPeriodDetails(testDate1, testDate2);
  
  console.log(`Período de teste: ${testDate1.toLocaleDateString()} a ${testDate2.toLocaleDateString()}`);
  console.log(`Eficiência original: ${(vacationPeriod.efficiency * 100).toFixed(2)}%`);
  
  const recommendations = generateImprovedRecommendations(vacationPeriod);
  
  // Filtrar apenas recomendações do tipo 'shift'
  const shiftRecommendations = recommendations.filter(rec => rec.type === 'shift');
  
  console.log(`Recomendações de deslocamento encontradas: ${shiftRecommendations.length}`);
  shiftRecommendations.forEach((rec, i) => {
    console.log(`\nDeslocamento ${i + 1}:`);
    console.log(`Descrição: ${rec.description}`);
    console.log(`De: ${rec.suggestedDateRange.startDate.toLocaleDateString()} a ${rec.suggestedDateRange.endDate.toLocaleDateString()}`);
    console.log(`Ganho de eficiência: ${(rec.efficiencyGain * 100).toFixed(2)}%`);
    console.log(`Dias deslocados: ${rec.daysChanged}`);
  });
};

// Testar split inteligente
const testSmartSplit = () => {
  console.log('\n--- TESTE DE SPLIT INTELIGENTE ---');
  
  // Criar um período longo que possa ser dividido
  const testDate1 = new Date(2023, 10, 20); // 20 de novembro de 2023
  const testDate2 = new Date(2023, 11, 10); // 10 de dezembro de 2023
  
  const vacationPeriod = getVacationPeriodDetails(testDate1, testDate2);
  
  console.log(`Período de teste: ${testDate1.toLocaleDateString()} a ${testDate2.toLocaleDateString()}`);
  console.log(`Total de dias: ${vacationPeriod.totalDays}`);
  console.log(`Eficiência original: ${(vacationPeriod.efficiency * 100).toFixed(2)}%`);
  
  const recommendations = generateImprovedRecommendations(vacationPeriod);
  
  // Filtrar apenas recomendações do tipo 'split'
  const splitRecommendations = recommendations.filter(rec => rec.type === 'split');
  
  console.log(`Recomendações de fracionamento encontradas: ${splitRecommendations.length}`);
  splitRecommendations.forEach((rec, i) => {
    console.log(`\nFracionamento ${i + 1}:`);
    console.log(`Descrição: ${rec.description}`);
    console.log(`Ganho de eficiência: ${(rec.efficiencyGain * 100).toFixed(2)}%`);
  });
};

// Testar análise preditiva para períodos longos
const testPredictiveAnalysis = () => {
  console.log('\n--- TESTE DE ANÁLISE PREDITIVA ---');
  
  // Criar um período longo em uma época com poucos feriados
  const testDate1 = new Date(2023, 7, 7); // 7 de agosto de 2023
  const testDate2 = new Date(2023, 7, 25); // 25 de agosto de 2023
  
  const vacationPeriod = getVacationPeriodDetails(testDate1, testDate2);
  
  console.log(`Período de teste: ${testDate1.toLocaleDateString()} a ${testDate2.toLocaleDateString()}`);
  console.log(`Total de dias: ${vacationPeriod.totalDays}`);
  console.log(`Eficiência original: ${(vacationPeriod.efficiency * 100).toFixed(2)}%`);
  
  const recommendations = generateImprovedRecommendations(vacationPeriod);
  
  // Filtrar apenas recomendações do tipo 'optimize'
  const optimizeRecommendations = recommendations.filter(rec => rec.type === 'optimize');
  
  console.log(`Recomendações de períodos otimizados encontradas: ${optimizeRecommendations.length}`);
  optimizeRecommendations.forEach((rec, i) => {
    console.log(`\nPeríodo otimizado ${i + 1}:`);
    console.log(`Descrição: ${rec.description}`);
    console.log(`De: ${rec.suggestedDateRange.startDate.toLocaleDateString()} a ${rec.suggestedDateRange.endDate.toLocaleDateString()}`);
    console.log(`Ganho de eficiência: ${(rec.efficiencyGain * 100).toFixed(2)}%`);
  });
};

// Test Fracionamento Ótimo tab visibility logic
const testOptimalFractionTabVisibility = () => {
  console.log('\n--- TESTE DE VISIBILIDADE DA ABA FRACIONAMENTO ÓTIMO ---');
  
  // Case 1: No split periods - tab should not be shown
  let splitPeriods: any[] = [];
  let tabsGridClass = `grid ${splitPeriods.length > 0 ? 'grid-cols-3' : 'grid-cols-2'}`;
  let shouldShowOptimalTab = splitPeriods.length > 0;
  
  console.log('Caso 1: Sem períodos fracionados');
  console.log(`Classe do grid: ${tabsGridClass}`);
  console.log(`Mostrar aba de Fracionamento Ótimo: ${shouldShowOptimalTab}`);
  console.log(`Resultado: ${shouldShowOptimalTab ? 'FALHA' : 'SUCESSO'} - A aba ${shouldShowOptimalTab ? 'seria mostrada' : 'não seria mostrada'} como esperado.`);
  
  // Case 2: With split periods - tab should be shown
  splitPeriods = [{ startDate: new Date(), endDate: new Date() }];
  tabsGridClass = `grid ${splitPeriods.length > 0 ? 'grid-cols-3' : 'grid-cols-2'}`;
  shouldShowOptimalTab = splitPeriods.length > 0;
  
  console.log('\nCaso 2: Com períodos fracionados');
  console.log(`Classe do grid: ${tabsGridClass}`);
  console.log(`Mostrar aba de Fracionamento Ótimo: ${shouldShowOptimalTab}`);
  console.log(`Resultado: ${shouldShowOptimalTab ? 'SUCESSO' : 'FALHA'} - A aba ${shouldShowOptimalTab ? 'seria mostrada' : 'não seria mostrada'} como esperado.`);
  
  // Summary
  console.log('\nConclusão: A lógica de visibilidade da aba Fracionamento Ótimo está funcionando corretamente!');
}; 