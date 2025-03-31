import { 
  generateSuperOptimizations, 
  findPotentialBridges
} from '../utils/efficiencyUtils';
import { getVacationPeriodDetails } from '../utils/dateUtils';
import { Recommendation } from '../types';
import { 
  nationalHolidays, 
  judicialHolidays, 
  getAllHolidays,
  isHoliday,
  isWeekend 
} from '../utils/holidayData';
import { format, addDays, differenceInDays, isSameYear } from 'date-fns';
import { pt } from 'date-fns/locale';

/**
 * Teste de super otimizações com validações automatizadas
 * Analisa como os feriados e pontes estratégicas afetam os algoritmos
 * e valida a integridade das recomendações geradas.
 * 
 * Este teste é responsável por:
 * 1. Analisar os feriados para um determinado ano
 * 2. Identificar e avaliar pontes estratégicas
 * 3. Validar as super otimizações geradas
 * 4. Verificar padrões e tendências nos resultados
 * 
 * @param testYear Ano para testar as otimizações
 * @param verbose Se true, imprime informações detalhadas durante o teste
 * @returns Objeto com resultados estatísticos do teste
 */
function testSuperOptimizations(testYear: number = new Date().getFullYear() + 1, verbose: boolean = true) {
  if (verbose) {
    console.log(`=== ANÁLISE DE SUPER OTIMIZAÇÕES PARA ${testYear} ===`);
  }
  
  // Objeto para armazenar resultados estatísticos para validação
  const results = {
    totalHolidays: 0,
    holidaysOnWorkdays: 0,
    totalBridges: 0,
    highQualityBridges: 0,
    totalSuperOptimizations: 0,
    optimizationsByType: {} as Record<string, number>,
    bridgesWithHighROI: 0,
    bridgesWithFormalPeriod: 0
  };
  
  // 1. ANÁLISE DE FERIADOS DO ANO
  if (verbose) {
    console.log(`\n--- FERIADOS DE ${testYear} ---`);
  }
  
  const holidays = getAllHolidays()
    .filter(h => new Date(h.date).getFullYear() === testYear)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  results.totalHolidays = holidays.length;
  
  // Contagem de feriados em dias úteis (um indicador importante)
  holidays.forEach(holiday => {
    const date = new Date(holiday.date);
    if (!isWeekend(date)) {
      results.holidaysOnWorkdays++;
    }
  });
  
  // Validação: O ano deve ter pelo menos alguns feriados
  if (results.totalHolidays === 0) {
    console.error(`ERRO: Nenhum feriado encontrado para o ano ${testYear}`);
    return results;
  }
  
  if (verbose) {
    // Agrupar e mostrar feriados por mês
    const holidaysByMonth: Record<string, any[]> = {};
    
    holidays.forEach(holiday => {
      const date = new Date(holiday.date);
      const monthName = format(date, 'MMMM', { locale: pt });
      
      if (!holidaysByMonth[monthName]) {
        holidaysByMonth[monthName] = [];
      }
      
      const dayOfWeek = format(date, 'EEEE', { locale: pt });
      const isWeekendDay = date.getDay() === 0 || date.getDay() === 6;
      
      holidaysByMonth[monthName].push({
        ...holiday,
        dayOfWeek,
        isWeekend: isWeekendDay
      });
    });
    
    // Imprimir feriados agrupados por mês para melhor visualização
    Object.keys(holidaysByMonth).forEach(month => {
      console.log(`\n${month.charAt(0).toUpperCase() + month.slice(1)}:`);
      holidaysByMonth[month].forEach(holiday => {
        console.log(`- ${format(new Date(holiday.date), 'dd/MM/yyyy')} (${holiday.dayOfWeek}): ${holiday.name}${holiday.isWeekend ? ' [fim de semana]' : ''}`);
      });
    });
  }
  
  // 2. ANÁLISE DE PONTES ESTRATÉGICAS
  if (verbose) {
    console.log(`\n--- PONTES POTENCIAIS EM ${testYear} ---`);
  }
  
  // Buscar pontes estratégicas de até 5 dias para análise mais abrangente
  const bridges = findPotentialBridges(testYear, 5);
  results.totalBridges = bridges.length;
  
  // Validação: Devemos encontrar pelo menos algumas pontes
  if (bridges.length === 0) {
    console.error(`ERRO: Nenhuma ponte estratégica encontrada para o ano ${testYear}`);
    return results;
  }
  
  // Identificar pontes de alta qualidade com boa pontuação estratégica ou ROI
  results.highQualityBridges = bridges.filter(b => 
    (b.strategicScore > 5) || 
    (b.workDays > 0 && ((differenceInDays(b.endDate, b.startDate) + 1) / b.workDays) > 1.5)
  ).length;
  
  // Validação: Devemos ter pelo menos algumas pontes de alta qualidade
  if (results.highQualityBridges < 3) {
    console.warn(`AVISO: Apenas ${results.highQualityBridges} pontes de alta qualidade encontradas para ${testYear}`);
  }
  
  if (verbose) {
    // Agrupar pontes por mês para melhor visualização
    const bridgesByMonth: Record<string, any[]> = {};
    
    bridges.forEach(bridge => {
      const startDate = bridge.startDate;
      const monthName = format(startDate, 'MMMM', { locale: pt });
      
      if (!bridgesByMonth[monthName]) {
        bridgesByMonth[monthName] = [];
      }
      
      // Calcular eficiência real (dias úteis economizados por dia de férias)
      const totalDays = differenceInDays(bridge.endDate, bridge.startDate) + 1;
      
      // Calcular ROI (Return on Investment)
      const roi = bridge.strategicScore / bridge.workDays;
      
      if (roi > 1.0) {
        results.bridgesWithHighROI++;
      }
      
      const formalPeriod = differenceInDays(bridge.endDate, bridge.startDate) + 1;
      if (formalPeriod >= 5) {
        results.bridgesWithFormalPeriod++;
      }
      
      bridgesByMonth[monthName].push({
        ...bridge,
        startDateFormatted: format(bridge.startDate, 'dd/MM/yyyy (EEEE)', { locale: pt }),
        endDateFormatted: format(bridge.endDate, 'dd/MM/yyyy (EEEE)', { locale: pt }),
        totalDays,
        roi: parseFloat(roi.toFixed(2))
      });
    });
    
    // Imprimir pontes agrupadas por mês e ordenadas por pontuação
    Object.keys(bridgesByMonth).sort((a, b) => {
      const monthA = new Date(Date.parse(`1 ${a} ${testYear}`)).getMonth();
      const monthB = new Date(Date.parse(`1 ${b} ${testYear}`)).getMonth();
      return monthA - monthB;
    }).forEach(month => {
      console.log(`\n${month.charAt(0).toUpperCase() + month.slice(1)}:`);
      
      // Ordenar pontes por pontuação estratégica (maior para menor)
      bridgesByMonth[month]
        .sort((a, b) => b.strategicScore - a.strategicScore)
        .forEach(bridge => {
          console.log(`- De ${bridge.startDateFormatted} até ${bridge.endDateFormatted}`);
          console.log(`  Dias úteis: ${bridge.workDays}, Pontuação: ${bridge.strategicScore.toFixed(2)}, ROI: ${bridge.roi}`);
        });
    });
  }
  
  // 3. ANÁLISE DAS SUPER OTIMIZAÇÕES GERADAS
  if (verbose) {
    console.log(`\n--- SUPER OTIMIZAÇÕES PARA ${testYear} ---`);
  }
  
  // Gerar super otimizações para o ano em análise
  const superOptimizations = generateSuperOptimizations(testYear);
  results.totalSuperOptimizations = superOptimizations.length;
  
  // Validação: Devemos gerar pelo menos algumas super otimizações
  if (superOptimizations.length === 0) {
    console.error(`ERRO: Nenhuma super otimização encontrada para o ano ${testYear}`);
    return results;
  }
  
  // Agrupar por tipo para análise
  const optimizationsByType: Record<string, Recommendation[]> = {};
  
  superOptimizations.forEach(opt => {
    if (!optimizationsByType[opt.type]) {
      optimizationsByType[opt.type] = [];
      results.optimizationsByType[opt.type] = 0;
    }
    optimizationsByType[opt.type].push(opt);
    results.optimizationsByType[opt.type]++;
  });
  
  // Validação: Devemos ter pelo menos um tipo de otimização
  if (Object.keys(optimizationsByType).length === 0) {
    console.error(`ERRO: Nenhum tipo de super otimização encontrado para o ano ${testYear}`);
    return results;
  }
  
  // Validação: Para super bridges, queremos pelo menos algumas opções
  if (results.optimizationsByType['super_bridge'] && results.optimizationsByType['super_bridge'] < 3) {
    console.warn(`AVISO: Apenas ${results.optimizationsByType['super_bridge']} super bridges encontradas`);
  }
  
  if (verbose) {
    // Imprimir otimizações por tipo, ordenadas por pontuação
    Object.keys(optimizationsByType).forEach(type => {
      console.log(`\n${type.toUpperCase()}:`);
      
      optimizationsByType[type]
        .sort((a, b) => (b.strategicScore || 0) - (a.strategicScore || 0))
        .forEach(opt => {
          const startDateFormat = format(opt.suggestedDateRange.startDate, 'dd/MM/yyyy (EEEE)', { locale: pt });
          const endDateFormat = format(opt.suggestedDateRange.endDate, 'dd/MM/yyyy (EEEE)', { locale: pt });
          
          console.log(`- ${opt.title}`);
          console.log(`  De ${startDateFormat} até ${endDateFormat}`);
          console.log(`  Ganho de eficiência: ${((opt.efficiencyGain - 1) * 100).toFixed(2)}%`);
          console.log(`  Dias: ${differenceInDays(opt.suggestedDateRange.endDate, opt.suggestedDateRange.startDate) + 1}`);
          
          // Verificar se algum feriado está incluído no período
          const includesHoliday = verificarFeriadosNoPeriodo(opt.suggestedDateRange.startDate, opt.suggestedDateRange.endDate);
          
          if (includesHoliday) {
            console.log(`  ⚠️ ATENÇÃO: Este período INCLUI um feriado!`);
          }
        });
    });
  }
  
  // 4. ANÁLISE DOS PADRÕES E TENDÊNCIAS
  if (verbose) {
    console.log('\n--- ANÁLISE DE PADRÕES E RECOMENDAÇÕES ---');
  }
  
  // Verificar quantas recomendações começam em cada dia da semana
  const startDayCount: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  const endDayCount: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  
  superOptimizations.forEach(opt => {
    const startDay = opt.suggestedDateRange.startDate.getDay();
    const endDay = opt.suggestedDateRange.endDate.getDay();
    
    startDayCount[startDay]++;
    endDayCount[endDay]++;
  });
  
  if (verbose) {
    console.log('Dias de início das recomendações:');
    console.log(`- Segunda-feira: ${startDayCount[1]}`);
    console.log(`- Terça-feira: ${startDayCount[2]}`);
    console.log(`- Quarta-feira: ${startDayCount[3]}`);
    console.log(`- Quinta-feira: ${startDayCount[4]}`);
    console.log(`- Sexta-feira: ${startDayCount[5]}`);
    console.log(`- Sábado: ${startDayCount[6]}`);
    console.log(`- Domingo: ${startDayCount[0]}`);
    
    console.log('\nDias de término das recomendações:');
    console.log(`- Segunda-feira: ${endDayCount[1]}`);
    console.log(`- Terça-feira: ${endDayCount[2]}`);
    console.log(`- Quarta-feira: ${endDayCount[3]}`);
    console.log(`- Quinta-feira: ${endDayCount[4]}`);
    console.log(`- Sexta-feira: ${endDayCount[5]}`);
    console.log(`- Sábado: ${endDayCount[6]}`);
    console.log(`- Domingo: ${endDayCount[0]}`);
  }
  
  // Contar períodos que incluem feriados
  let periodsWithHolidays = 0;
  
  superOptimizations.forEach(opt => {
    if (verificarFeriadosNoPeriodo(opt.suggestedDateRange.startDate, opt.suggestedDateRange.endDate)) {
      periodsWithHolidays++;
    }
  });
  
  if (verbose) {
    console.log(`\nPeríodos que incluem feriados: ${periodsWithHolidays} de ${superOptimizations.length} (${(periodsWithHolidays / superOptimizations.length * 100).toFixed(2)}%)`);
  }
  
  // Validação: Verificar duração mínima das recomendações (deve ser de 5 dias no mínimo)
  const shortPeriods = superOptimizations.filter(opt => 
    differenceInDays(opt.suggestedDateRange.endDate, opt.suggestedDateRange.startDate) + 1 < 5
  );
  
  if (shortPeriods.length > 0) {
    console.warn(`AVISO: Encontradas ${shortPeriods.length} recomendações com menos de 5 dias`);
  }
  
  // Validação: Verificar se todas as datas estão no ano correto
  const wrongYearPeriods = superOptimizations.filter(opt => 
    !isSameYear(opt.suggestedDateRange.startDate, new Date(testYear, 0, 1)) ||
    !isSameYear(opt.suggestedDateRange.endDate, new Date(testYear, 0, 1))
  );
  
  if (wrongYearPeriods.length > 0) {
    console.warn(`AVISO: Encontradas ${wrongYearPeriods.length} recomendações com datas fora do ano ${testYear}`);
  }
  
  if (verbose) {
    // Recomendações para melhorias no algoritmo
    console.log('\nRecomendações para melhorias no algoritmo:');
    console.log('1. Flexibilizar dias de início das férias - nem sempre começar na segunda-feira');
    console.log('2. Incorporar análise específica para feriados em diferentes dias da semana');
    console.log('3. Garantir que períodos não incluam feriados, principalmente para evitar desperdício');
    console.log('4. Adicionar otimizações específicas para datas comemorativas importantes (Natal, Carnaval, etc.)');
    
    console.log(`\n=== FIM DA ANÁLISE DE SUPER OTIMIZAÇÕES PARA ${testYear} ===`);
  }
  
  // Retorna resultados para possível uso em outros testes
  return results;
}

/**
 * Função auxiliar para verificar se um período inclui feriados
 * @param startDate Data de início do período
 * @param endDate Data de fim do período
 * @returns true se o período incluir pelo menos um feriado
 */
function verificarFeriadosNoPeriodo(startDate: Date, endDate: Date): boolean {
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    if (isHoliday(currentDate)) {
      return true;
    }
    currentDate = addDays(currentDate, 1);
  }
  
  return false;
}

/**
 * Testa super otimizações para o próximo ano
 * @returns Resultados estatísticos do teste
 */
function testNextYearOptimizations() {
  const nextYear = new Date().getFullYear() + 1;
  return testSuperOptimizations(nextYear);
}

/**
 * Testa super otimizações para múltiplos anos
 * Este teste é útil para comparar a eficácia do algoritmo em diferentes anos
 * @returns Array com resultados de cada ano testado
 */
function testMultiYearOptimizations() {
  const currentYear = new Date().getFullYear();
  const results = [];
  
  // Testar para os próximos 3 anos
  for (let year = currentYear; year <= currentYear + 2; year++) {
    console.log(`\n\n===============================`);
    console.log(`TESTANDO ANO: ${year}`);
    console.log(`===============================`);
    
    const yearResults = testSuperOptimizations(year);
    results.push({
      year,
      results: yearResults
    });
  }
  
  // Relatório comparativo
  console.log(`\n\n=== RELATÓRIO COMPARATIVO DE ANOS ===`);
  console.log(`Ano | Feriados | Pontes | Super Otimizações`);
  console.log(`-----------------------------------------`);
  
  results.forEach(r => {
    console.log(`${r.year} | ${r.results.totalHolidays} | ${r.results.totalBridges} | ${r.results.totalSuperOptimizations}`);
  });
  
  return results;
}

describe('Super Otimizações', () => {
  const nextYear = new Date().getFullYear() + 1;

  test('deve gerar super otimizações válidas para o próximo ano', () => {
    const resultado = testSuperOptimizations(nextYear, false);
    
    expect(resultado.totalSuperOptimizations).toBeGreaterThan(0);
    expect(resultado.totalHolidays).toBeGreaterThan(0);
    expect(resultado.totalBridges).toBeGreaterThan(0);
  });

  test('deve identificar pontes estratégicas corretamente', () => {
    const bridges = findPotentialBridges(nextYear, 5);
    
    expect(bridges.length).toBeGreaterThan(0);
    bridges.forEach(bridge => {
      expect(bridge.strategicScore).toBeGreaterThan(0);
      expect(bridge.workDays).toBeGreaterThanOrEqual(0);
      expect(bridge.startDate).toBeDefined();
      expect(bridge.endDate).toBeDefined();
    });
  });

  test('não deve incluir períodos inválidos nas recomendações', () => {
    const superOptimizations = generateSuperOptimizations(nextYear);
    
    superOptimizations.forEach(opt => {
      const duration = differenceInDays(opt.suggestedDateRange.endDate, opt.suggestedDateRange.startDate) + 1;
      
      // Períodos devem ter no mínimo 5 dias
      expect(duration).toBeGreaterThanOrEqual(5);
      
      // Datas devem estar no ano correto
      expect(isSameYear(opt.suggestedDateRange.startDate, new Date(nextYear, 0, 1))).toBe(true);
      expect(isSameYear(opt.suggestedDateRange.endDate, new Date(nextYear, 0, 1))).toBe(true);
    });
  });

  test('deve calcular corretamente a eficiência das recomendações', () => {
    const superOptimizations = generateSuperOptimizations(nextYear);
    
    superOptimizations.forEach(opt => {
      expect(opt.efficiencyGain).toBeGreaterThan(1); // Ganho de eficiência deve ser maior que 1 (100%)
      expect(opt.strategicScore).toBeGreaterThan(0);
      expect(opt.title).toBeDefined();
      expect(opt.type).toBeDefined();
    });
  });
});

// Executa o teste para o próximo ano por padrão
console.log("Iniciando teste de super otimizações...");
const resultado = testNextYearOptimizations();
console.log("Teste concluído!");
console.log(`Resumo: Encontradas ${resultado.totalSuperOptimizations} super otimizações`);

// Exporta funções para uso em outros testes
export { 
  testSuperOptimizations, 
  testNextYearOptimizations,
  testMultiYearOptimizations,
  verificarFeriadosNoPeriodo
}; 