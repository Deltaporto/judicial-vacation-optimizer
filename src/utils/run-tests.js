// Análise de estratégias de férias para magistrados

// Simulação de um calendário simples com feriados
const holidays = [
  "2024-01-01", // Ano Novo
  "2024-02-12", // Carnaval
  "2024-02-13", // Carnaval
  "2024-03-29", // Sexta-feira Santa
  "2024-04-21", // Tiradentes
  "2024-05-01", // Dia do Trabalho
  "2024-05-30", // Corpus Christi
  "2024-09-07", // Independência
  "2024-10-12", // N.S. Aparecida
  "2024-11-02", // Finados
  "2024-11-15", // Proclamação da República
  "2024-12-25", // Natal
];

// Verifica se uma data é feriado
function isHoliday(date) {
  const dateStr = date.toISOString().split('T')[0];
  return holidays.includes(dateStr);
}

// Verifica se é um fim de semana
function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 = Domingo, 6 = Sábado
}

// Adiciona dias a uma data
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Calcula eficiência de um período de férias
function calculateEfficiency(workDays, totalDays) {
  if (totalDays === 0) return 0;
  return 1 - (workDays / totalDays);
}

// Analisa um período de férias
function analyzeVacationPeriod(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  let totalDays = 0;
  let workDays = 0;
  let weekendDays = 0;
  let holidayDays = 0;
  
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    totalDays++;
    
    if (isHoliday(d)) {
      holidayDays++;
    } else if (isWeekend(d)) {
      weekendDays++;
    } else {
      workDays++;
    }
  }
  
  const efficiency = calculateEfficiency(workDays, totalDays);
  
  return {
    startDate: start,
    endDate: end,
    totalDays,
    workDays,
    weekendDays,
    holidayDays,
    efficiency
  };
}

// Formata uma data
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// Teste de estratégias de férias
function testVacationStrategies() {
  console.log('======== TESTE DE ESTRATÉGIAS DE FÉRIAS ========');
  
  // 1. Único período contínuo de 30 dias
  console.log('\n[Estratégia 1] Um único período contínuo de 30 dias');
  const singlePeriod = analyzeVacationPeriod(new Date(2024, 6, 1), new Date(2024, 6, 30));
  console.log(`Período: ${formatDate(singlePeriod.startDate)} a ${formatDate(singlePeriod.endDate)}`);
  console.log(`Total de dias: ${singlePeriod.totalDays}`);
  console.log(`Dias úteis: ${singlePeriod.workDays}, Fins de semana: ${singlePeriod.weekendDays}, Feriados: ${singlePeriod.holidayDays}`);
  console.log(`Eficiência: ${(singlePeriod.efficiency * 100).toFixed(2)}%`);
  
  // 2. Dois períodos de 15 dias
  console.log('\n[Estratégia 2] Dois períodos de 15 dias');
  const twoPeriods = [
    analyzeVacationPeriod(new Date(2024, 6, 1), new Date(2024, 6, 15)),
    analyzeVacationPeriod(new Date(2024, 8, 1), new Date(2024, 8, 15))
  ];
  
  let totalDaysTwoPeriods = 0;
  let workDaysTwoPeriods = 0;
  let weekendDaysTwoPeriods = 0;
  let holidayDaysTwoPeriods = 0;
  
  twoPeriods.forEach((period, i) => {
    console.log(`\nPeríodo ${i + 1}: ${formatDate(period.startDate)} a ${formatDate(period.endDate)}`);
    console.log(`Dias úteis: ${period.workDays}, Fins de semana: ${period.weekendDays}, Feriados: ${period.holidayDays}`);
    console.log(`Eficiência: ${(period.efficiency * 100).toFixed(2)}%`);
    
    totalDaysTwoPeriods += period.totalDays;
    workDaysTwoPeriods += period.workDays;
    weekendDaysTwoPeriods += period.weekendDays;
    holidayDaysTwoPeriods += period.holidayDays;
  });
  
  const efficiencyTwoPeriods = calculateEfficiency(workDaysTwoPeriods, totalDaysTwoPeriods);
  console.log('\nAnálise Combinada:');
  console.log(`Total de dias: ${totalDaysTwoPeriods}`);
  console.log(`Total de dias úteis: ${workDaysTwoPeriods}`);
  console.log(`Total de fins de semana: ${weekendDaysTwoPeriods}`);
  console.log(`Total de feriados: ${holidayDaysTwoPeriods}`);
  console.log(`Eficiência combinada: ${(efficiencyTwoPeriods * 100).toFixed(2)}%`);
  
  // 3. Seis períodos de 5 dias
  console.log('\n[Estratégia 3] Seis períodos de 5 dias (cobrindo fins de semana)');
  const sixPeriods = [
    analyzeVacationPeriod(new Date(2024, 0, 3), new Date(2024, 0, 7)),   // Quarta a domingo
    analyzeVacationPeriod(new Date(2024, 1, 7), new Date(2024, 1, 11)),  // Quarta a domingo
    analyzeVacationPeriod(new Date(2024, 3, 3), new Date(2024, 3, 7)),   // Quarta a domingo
    analyzeVacationPeriod(new Date(2024, 5, 5), new Date(2024, 5, 9)),   // Quarta a domingo
    analyzeVacationPeriod(new Date(2024, 7, 7), new Date(2024, 7, 11)),  // Quarta a domingo
    analyzeVacationPeriod(new Date(2024, 9, 2), new Date(2024, 9, 6))    // Quarta a domingo
  ];
  
  let totalDaysSixPeriods = 0;
  let workDaysSixPeriods = 0;
  let weekendDaysSixPeriods = 0;
  let holidayDaysSixPeriods = 0;
  
  sixPeriods.forEach((period, i) => {
    console.log(`\nPeríodo ${i + 1}: ${formatDate(period.startDate)} a ${formatDate(period.endDate)}`);
    console.log(`Dias úteis: ${period.workDays}, Fins de semana: ${period.weekendDays}, Feriados: ${period.holidayDays}`);
    console.log(`Eficiência: ${(period.efficiency * 100).toFixed(2)}%`);
    
    totalDaysSixPeriods += period.totalDays;
    workDaysSixPeriods += period.workDays;
    weekendDaysSixPeriods += period.weekendDays;
    holidayDaysSixPeriods += period.holidayDays;
  });
  
  const efficiencySixPeriods = calculateEfficiency(workDaysSixPeriods, totalDaysSixPeriods);
  console.log('\nAnálise Combinada:');
  console.log(`Total de dias: ${totalDaysSixPeriods}`);
  console.log(`Total de dias úteis: ${workDaysSixPeriods}`);
  console.log(`Total de fins de semana: ${weekendDaysSixPeriods}`);
  console.log(`Total de feriados: ${holidayDaysSixPeriods}`);
  console.log(`Eficiência combinada: ${(efficiencySixPeriods * 100).toFixed(2)}%`);
  
  // 4. Seis períodos de 5 dias estratégicos (próximos a feriados)
  console.log('\n[Estratégia 4] Seis períodos de 5 dias (estratégia de feriados)');
  const sixPeriodsHolidays = [
    analyzeVacationPeriod(new Date(2024, 0, 1), new Date(2024, 0, 5)),   // Inclui Ano Novo
    analyzeVacationPeriod(new Date(2024, 1, 12), new Date(2024, 1, 16)), // Inclui Carnaval
    analyzeVacationPeriod(new Date(2024, 3, 18), new Date(2024, 3, 22)), // Inclui Tiradentes
    analyzeVacationPeriod(new Date(2024, 4, 27), new Date(2024, 4, 31)), // Inclui Corpus Christi
    analyzeVacationPeriod(new Date(2024, 10, 11), new Date(2024, 10, 15)), // Inclui Proclamação da República 
    analyzeVacationPeriod(new Date(2024, 11, 23), new Date(2024, 11, 27)) // Inclui Natal
  ];
  
  let totalDaysSixPeriodsHolidays = 0;
  let workDaysSixPeriodsHolidays = 0;
  let weekendDaysSixPeriodsHolidays = 0;
  let holidayDaysSixPeriodsHolidays = 0;
  
  sixPeriodsHolidays.forEach((period, i) => {
    console.log(`\nPeríodo ${i + 1}: ${formatDate(period.startDate)} a ${formatDate(period.endDate)}`);
    console.log(`Dias úteis: ${period.workDays}, Fins de semana: ${period.weekendDays}, Feriados: ${period.holidayDays}`);
    console.log(`Eficiência: ${(period.efficiency * 100).toFixed(2)}%`);
    
    totalDaysSixPeriodsHolidays += period.totalDays;
    workDaysSixPeriodsHolidays += period.workDays;
    weekendDaysSixPeriodsHolidays += period.weekendDays;
    holidayDaysSixPeriodsHolidays += period.holidayDays;
  });
  
  const efficiencySixPeriodsHolidays = calculateEfficiency(workDaysSixPeriodsHolidays, totalDaysSixPeriodsHolidays);
  console.log('\nAnálise Combinada:');
  console.log(`Total de dias: ${totalDaysSixPeriodsHolidays}`);
  console.log(`Total de dias úteis: ${workDaysSixPeriodsHolidays}`);
  console.log(`Total de fins de semana: ${weekendDaysSixPeriodsHolidays}`);
  console.log(`Total de feriados: ${holidayDaysSixPeriodsHolidays}`);
  console.log(`Eficiência combinada: ${(efficiencySixPeriodsHolidays * 100).toFixed(2)}%`);
  
  // Comparação final de todas as estratégias
  console.log('\n======== COMPARAÇÃO DE ESTRATÉGIAS ========');
  console.log(`[1] Um período de 30 dias: ${(singlePeriod.efficiency * 100).toFixed(2)}%`);
  console.log(`[2] Dois períodos de 15 dias: ${(efficiencyTwoPeriods * 100).toFixed(2)}%`);
  console.log(`[3] Seis períodos de 5 dias (fins de semana): ${(efficiencySixPeriods * 100).toFixed(2)}%`);
  console.log(`[4] Seis períodos de 5 dias (feriados): ${(efficiencySixPeriodsHolidays * 100).toFixed(2)}%`);
  
  // Encontrar a melhor estratégia
  const strategies = [
    { name: "Um período de 30 dias", efficiency: singlePeriod.efficiency },
    { name: "Dois períodos de 15 dias", efficiency: efficiencyTwoPeriods },
    { name: "Seis períodos de 5 dias (fins de semana)", efficiency: efficiencySixPeriods },
    { name: "Seis períodos de 5 dias (feriados)", efficiency: efficiencySixPeriodsHolidays }
  ];
  
  strategies.sort((a, b) => b.efficiency - a.efficiency);
  
  console.log('\n======== CONCLUSÃO ========');
  console.log(`A estratégia mais eficiente é: ${strategies[0].name} (${(strategies[0].efficiency * 100).toFixed(2)}%)`);
  console.log(`${(strategies[0].efficiency - singlePeriod.efficiency) * 100 > 0 ? 'Ganho' : 'Perda'} de eficiência em relação a um único período: ${((strategies[0].efficiency - singlePeriod.efficiency) * 100).toFixed(2)}%`);
}

// Executa os testes
testVacationStrategies(); 