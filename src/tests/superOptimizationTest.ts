import { 
  generateSuperOptimizations, 
  findPotentialBridges,
  getVacationPeriodDetails,
  Recommendation
} from '../utils/efficiencyUtils';
import { 
  nationalHolidays, 
  judicialHolidays, 
  getAllHolidays,
  isHoliday,
  isWeekend 
} from '../utils/holidayData';
import { format, addDays, differenceInDays, addYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { pt } from 'date-fns/locale';

/**
 * Teste específico para analisar as super otimizações para 2025
 * Analisa como os feriados e pontes estratégicas afetam os algoritmos
 */
function testSuperOptimizations() {
  console.log('=== ANÁLISE DE SUPER OTIMIZAÇÕES PARA 2025 ===');
  const year = 2025;
  
  // 1. Análise de feriados do ano
  console.log('\n--- FERIADOS DE 2025 ---');
  const holidays = getAllHolidays()
    .filter(h => new Date(h.date).getFullYear() === year)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // Agrupar feriados por mês
  const holidaysByMonth: Record<string, any[]> = {};
  
  holidays.forEach(holiday => {
    const date = new Date(holiday.date);
    const month = date.getMonth();
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
  
  // Imprimir feriados por mês
  Object.keys(holidaysByMonth).forEach(month => {
    console.log(`\n${month.charAt(0).toUpperCase() + month.slice(1)}:`);
    holidaysByMonth[month].forEach(holiday => {
      console.log(`- ${format(new Date(holiday.date), 'dd/MM/yyyy')} (${holiday.dayOfWeek}): ${holiday.name}${holiday.isWeekend ? ' [fim de semana]' : ''}`);
    });
  });
  
  // 2. Análise de pontes potenciais
  console.log('\n--- PONTES POTENCIAIS EM 2025 ---');
  const bridges = findPotentialBridges(year, 3);
  
  // Agrupar pontes por mês
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
    
    bridgesByMonth[monthName].push({
      ...bridge,
      startDateFormatted: format(bridge.startDate, 'dd/MM/yyyy (EEEE)', { locale: pt }),
      endDateFormatted: format(bridge.endDate, 'dd/MM/yyyy (EEEE)', { locale: pt }),
      totalDays,
      roi: parseFloat(roi.toFixed(2))
    });
  });
  
  // Imprimir pontes por mês
  Object.keys(bridgesByMonth).sort((a, b) => {
    const monthA = new Date(Date.parse(`1 ${a} 2025`)).getMonth();
    const monthB = new Date(Date.parse(`1 ${b} 2025`)).getMonth();
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
  
  // 3. Análise das super otimizações geradas
  console.log('\n--- SUPER OTIMIZAÇÕES PARA 2025 ---');
  const superOptimizations = generateSuperOptimizations(year);
  
  // Agrupar por tipo
  const optimizationsByType: Record<string, Recommendation[]> = {};
  
  superOptimizations.forEach(opt => {
    if (!optimizationsByType[opt.type]) {
      optimizationsByType[opt.type] = [];
    }
    optimizationsByType[opt.type].push(opt);
  });
  
  // Imprimir por tipo
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
        let includesHoliday = false;
        let currentDate = new Date(opt.suggestedDateRange.startDate);
        
        while (currentDate <= opt.suggestedDateRange.endDate) {
          if (isHoliday(currentDate)) {
            includesHoliday = true;
            break;
          }
          currentDate = addDays(currentDate, 1);
        }
        
        if (includesHoliday) {
          console.log(`  ⚠️ ATENÇÃO: Este período INCLUI um feriado!`);
        }
      });
  });
  
  // 4. Análise dos padrões e recomendações para melhoria do algoritmo
  console.log('\n--- ANÁLISE DE PADRÕES E RECOMENDAÇÕES ---');
  
  // Verificar quantas recomendações começam em cada dia da semana
  const startDayCount: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  const endDayCount: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  
  superOptimizations.forEach(opt => {
    const startDay = opt.suggestedDateRange.startDate.getDay();
    const endDay = opt.suggestedDateRange.endDate.getDay();
    
    startDayCount[startDay]++;
    endDayCount[endDay]++;
  });
  
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
  
  // Contar períodos que incluem feriados
  let periodsWithHolidays = 0;
  
  superOptimizations.forEach(opt => {
    let currentDate = new Date(opt.suggestedDateRange.startDate);
    
    while (currentDate <= opt.suggestedDateRange.endDate) {
      if (isHoliday(currentDate)) {
        periodsWithHolidays++;
        break;
      }
      currentDate = addDays(currentDate, 1);
    }
  });
  
  console.log(`\nPeríodos que incluem feriados: ${periodsWithHolidays} de ${superOptimizations.length} (${(periodsWithHolidays / superOptimizations.length * 100).toFixed(2)}%)`);
  
  // Recomendações para melhorias no algoritmo
  console.log('\nRecomendações para melhorias no algoritmo:');
  console.log('1. Flexibilizar dias de início das férias - nem sempre começar na segunda-feira');
  console.log('2. Incorporar análise específica para feriados em diferentes dias da semana');
  console.log('3. Garantir que períodos não incluam feriados, principalmente para evitar desperdício');
  console.log('4. Adicionar otimizações específicas para datas comemorativas importantes (Natal, Carnaval, etc.)');
  
  console.log('\n=== FIM DA ANÁLISE DE SUPER OTIMIZAÇÕES ===');
}

// Executa o teste
testSuperOptimizations();

export {}; 