import { generateRecommendations } from './efficiencyUtils';
import { getVacationPeriodDetails } from './dateUtils';
import { format } from 'date-fns';
import { VacationPeriod, Recommendation } from '@/types';

export const testHybridRecommendations = () => {
  console.log('======== TESTE DE ESTRATÉGIAS HÍBRIDAS ========\n');

  // Criar um período de teste
  const testPeriod = getVacationPeriodDetails(
    new Date(2024, 2, 1), // 1 de março de 2024
    new Date(2024, 2, 30) // 30 de março de 2024
  );

  console.log('Período de teste:');
  console.log(`Início: ${format(testPeriod.startDate, 'dd/MM/yyyy')}`);
  console.log(`Fim: ${format(testPeriod.endDate, 'dd/MM/yyyy')}`);
  console.log(`Dias úteis: ${testPeriod.workDays}`);
  console.log(`Eficiência original: ${(testPeriod.efficiency * 100).toFixed(2)}%\n`);

  // Gerar recomendações
  console.log('Gerando recomendações...');
  const recommendations = generateRecommendations(testPeriod);

  // Filtrar apenas recomendações híbridas
  const hybridRecommendations = recommendations.filter(rec => 
    rec.type === 'hybrid' || 
    rec.type === 'hybrid_bridge_split' || 
    rec.type === 'optimal_hybrid'
  );

  console.log(`\nTotal de recomendações híbridas encontradas: ${hybridRecommendations.length}\n`);

  // Analisar cada recomendação híbrida
  hybridRecommendations.forEach((rec, index) => {
    console.log(`\n----- Recomendação Híbrida #${index + 1} -----`);
    console.log(`Tipo: ${rec.type}`);
    console.log(`Título: ${rec.title}`);
    console.log(`Descrição: ${rec.description}`);
    
    // Verificar período principal
    console.log('\nPeríodo Principal:');
    console.log(`Início: ${format(rec.suggestedDateRange.startDate, 'dd/MM/yyyy')}`);
    console.log(`Fim: ${format(rec.suggestedDateRange.endDate, 'dd/MM/yyyy')}`);
    
    // Verificar períodos fracionados
    if (rec.fractionedPeriods && rec.fractionedPeriods.length > 0) {
      console.log('\nPeríodos Fracionados:');
      rec.fractionedPeriods.forEach((period, i) => {
        console.log(`\nFração ${i + 1}:`);
        console.log(`Início: ${format(period.startDate, 'dd/MM/yyyy')}`);
        console.log(`Fim: ${format(period.endDate, 'dd/MM/yyyy')}`);
        console.log(`Dias úteis: ${period.workDays}`);
        console.log(`Eficiência: ${(period.efficiency * 100).toFixed(2)}%`);
      });
    } else {
      console.log('\nALERTA: Recomendação híbrida sem períodos fracionados definidos!');
    }

    // Verificar pontuação e ganhos
    console.log('\nMétricas:');
    console.log(`Ganho de eficiência: ${(rec.efficiencyGain * 100).toFixed(2)}%`);
    console.log(`Pontuação estratégica: ${rec.strategicScore?.toFixed(2) || 'Não definida'}`);
    console.log(`Dias alterados: ${rec.daysChanged}`);
    
    // Validações
    console.log('\nValidações:');
    const validations = [
      {
        test: 'Período principal válido',
        result: rec.suggestedDateRange.startDate <= rec.suggestedDateRange.endDate
      },
      {
        test: 'Possui períodos fracionados',
        result: rec.fractionedPeriods && rec.fractionedPeriods.length > 0
      },
      {
        test: 'Períodos fracionados válidos',
        result: rec.fractionedPeriods?.every(p => p.isValid) ?? false
      },
      {
        test: 'Ganho de eficiência positivo',
        result: rec.efficiencyGain > 0
      }
    ];

    validations.forEach(v => {
      console.log(`${v.test}: ${v.result ? '✅ OK' : '❌ FALHA'}`);
    });

    console.log('\n----------------------------------------');
  });

  // Resumo final
  console.log('\n======== RESUMO DO TESTE ========');
  const summary = {
    total: hybridRecommendations.length,
    withFractions: hybridRecommendations.filter(r => r.fractionedPeriods?.length > 0).length,
    withoutFractions: hybridRecommendations.filter(r => !r.fractionedPeriods || r.fractionedPeriods.length === 0).length,
    avgEfficiencyGain: hybridRecommendations.reduce((sum, r) => sum + r.efficiencyGain, 0) / hybridRecommendations.length
  };

  console.log(`Total de recomendações híbridas: ${summary.total}`);
  console.log(`Com períodos fracionados: ${summary.withFractions}`);
  console.log(`Sem períodos fracionados: ${summary.withoutFractions}`);
  console.log(`Ganho médio de eficiência: ${(summary.avgEfficiencyGain * 100).toFixed(2)}%`);
}; 