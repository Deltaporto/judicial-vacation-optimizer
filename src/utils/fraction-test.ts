import { getVacationPeriodDetails, formatDate } from './dateUtils';
import { generateRecommendations } from './efficiencyUtils';
import { addDays, isWeekend } from 'date-fns';
import { isHoliday } from './holidayData';
import { VacationPeriod } from '@/types';

// Test different fractionation strategies
export const testFractionStrategies = () => {
  console.log('======== TESTE DE ESTRATÉGIAS DE FRACIONAMENTO ========');
  
  // Define test scenarios
  const scenarios = [
    {
      name: 'Um único período contínuo de 30 dias',
      startDate: new Date(2024, 6, 1), // 1 de julho de 2024
      endDate: new Date(2024, 6, 30), // 30 de julho de 2024
    },
    {
      name: 'Dois períodos de 15 dias',
      periods: [
        { start: new Date(2024, 6, 1), end: new Date(2024, 6, 15) }, // 1-15 de julho
        { start: new Date(2024, 8, 1), end: new Date(2024, 8, 15) }  // 1-15 de setembro
      ]
    },
    {
      name: 'Três períodos de 10 dias',
      periods: [
        { start: new Date(2024, 2, 1), end: new Date(2024, 2, 10) },  // 1-10 de março
        { start: new Date(2024, 6, 1), end: new Date(2024, 6, 10) },  // 1-10 de julho
        { start: new Date(2024, 10, 1), end: new Date(2024, 10, 10) } // 1-10 de novembro
      ]
    },
    {
      name: 'Seis períodos de 5 dias (estratégia de fim de semana)',
      periods: [
        // Períodos que cobrem fins de semana (quarta a domingo)
        { start: new Date(2024, 1, 7), end: new Date(2024, 1, 11) },  // 7-11 de fevereiro
        { start: new Date(2024, 3, 10), end: new Date(2024, 3, 14) }, // 10-14 de abril
        { start: new Date(2024, 5, 12), end: new Date(2024, 5, 16) }, // 12-16 de junho
        { start: new Date(2024, 7, 14), end: new Date(2024, 7, 18) }, // 14-18 de agosto
        { start: new Date(2024, 9, 9), end: new Date(2024, 9, 13) },  // 9-13 de outubro
        { start: new Date(2024, 11, 4), end: new Date(2024, 11, 8) }  // 4-8 de dezembro
      ]
    },
    {
      name: 'Seis períodos de 5 dias (estratégia de feriados)',
      periods: [
        // Períodos próximos a feriados
        { start: new Date(2024, 0, 1), end: new Date(2024, 0, 5) },   // 1-5 de janeiro (Ano Novo)
        { start: new Date(2024, 3, 18), end: new Date(2024, 3, 22) }, // 18-22 de abril (próximo à Tiradentes)
        { start: new Date(2024, 4, 27), end: new Date(2024, 4, 31) }, // 27-31 de maio (próximo a Corpus Christi)
        { start: new Date(2024, 8, 2), end: new Date(2024, 8, 6) },   // 2-6 de setembro (após Independência)
        { start: new Date(2024, 9, 10), end: new Date(2024, 9, 14) }, // 10-14 de outubro (após N.S. Aparecida)
        { start: new Date(2024, 11, 23), end: new Date(2024, 11, 27) } // 23-27 de dezembro (Natal)
      ]
    }
  ];
  
  // Analyze each scenario
  scenarios.forEach((scenario, index) => {
    console.log(`\n[Cenário ${index + 1}] ${scenario.name}`);
    
    if ('startDate' in scenario && 'endDate' in scenario) {
      // Single continuous period
      const period = getVacationPeriodDetails(scenario.startDate, scenario.endDate);
      analyzeVacationPeriod(period);
    } else if ('periods' in scenario) {
      // Multiple periods
      let totalDays = 0;
      let totalWorkDays = 0;
      let totalWeekendDays = 0;
      let totalHolidayDays = 0;
      
      scenario.periods.forEach((period, i) => {
        const vacationPeriod = getVacationPeriodDetails(period.start, period.end);
        console.log(`\n  Período ${i + 1}: ${formatDate(period.start)} a ${formatDate(period.end)}`);
        console.log(`  Dias úteis: ${vacationPeriod.workDays}, Fins de semana: ${vacationPeriod.weekendDays}, Feriados: ${vacationPeriod.holidayDays}`);
        console.log(`  Eficiência: ${(vacationPeriod.efficiency * 100).toFixed(2)}%`);
        
        totalDays += vacationPeriod.totalDays;
        totalWorkDays += vacationPeriod.workDays;
        totalWeekendDays += vacationPeriod.weekendDays;
        totalHolidayDays += vacationPeriod.holidayDays;
      });
      
      // Calculate combined efficiency
      const combinedEfficiency = 1 - (totalWorkDays / totalDays);
      
      console.log('\n  Análise Combinada:');
      console.log(`  Total de dias: ${totalDays}`);
      console.log(`  Total de dias úteis: ${totalWorkDays}`);
      console.log(`  Total de fins de semana: ${totalWeekendDays}`);
      console.log(`  Total de feriados: ${totalHolidayDays}`);
      console.log(`  Eficiência combinada: ${(combinedEfficiency * 100).toFixed(2)}%`);
      
      // Calculate theoretical maximum efficiency
      calculateTheoreticalMaximum(totalDays);
    }
  });
  
  // Additional test: optimal 5-day periods throughout a year
  findOptimalFiveDayPeriods(2024);
};

// Analyze a single vacation period
const analyzeVacationPeriod = (period: VacationPeriod) => {
  console.log(`  Período: ${formatDate(period.startDate)} a ${formatDate(period.endDate)}`);
  console.log(`  Total de dias: ${period.totalDays}`);
  console.log(`  Dias úteis: ${period.workDays}, Fins de semana: ${period.weekendDays}, Feriados: ${period.holidayDays}`);
  console.log(`  Eficiência: ${(period.efficiency * 100).toFixed(2)}%`);
  
  // Theoretical maximum efficiency
  calculateTheoreticalMaximum(period.totalDays);
};

// Calculate theoretical maximum efficiency given a number of days
const calculateTheoreticalMaximum = (totalDays: number) => {
  // In a perfect world, we could choose days with maximum non-working days
  // On average, 2 out of 7 days are weekends (28.57%)
  // Plus holidays (assume around 12 per year = 3.29%)
  // So ideally we could have ~31.86% non-working days
  
  const theoreticalMaxWeekends = Math.floor(totalDays * (2/7));
  const theoreticalMaxHolidays = Math.floor(totalDays * (12/365));
  const theoreticalMaxNonWorkDays = theoreticalMaxWeekends + theoreticalMaxHolidays;
  const theoreticalMinWorkDays = totalDays - theoreticalMaxNonWorkDays;
  const theoreticalMaxEfficiency = 1 - (theoreticalMinWorkDays / totalDays);
  
  console.log(`  Eficiência teórica máxima: ${(theoreticalMaxEfficiency * 100).toFixed(2)}%`);
  console.log(`  (baseado em seleção ideal de ${theoreticalMaxWeekends} fins de semana e ${theoreticalMaxHolidays} feriados)`);
};

// Find optimal 5-day periods in a given year
const findOptimalFiveDayPeriods = (year: number) => {
  console.log(`\n[Análise] Períodos de 5 dias mais eficientes em ${year}`);
  
  const periods: VacationPeriod[] = [];
  
  // Check every possible 5-day period in the year
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31 - 4); // Last start date for a 5-day period
  
  for (let d = new Date(startDate); d <= endDate; d = addDays(d, 1)) {
    const periodEnd = addDays(d, 4); // 5 days total
    const period = getVacationPeriodDetails(d, periodEnd);
    periods.push(period);
  }
  
  // Sort by efficiency descending
  periods.sort((a, b) => b.efficiency - a.efficiency);
  
  // Show top 10 most efficient 5-day periods
  console.log('  Top 10 períodos de 5 dias mais eficientes:');
  for (let i = 0; i < 10 && i < periods.length; i++) {
    const p = periods[i];
    console.log(`  ${i+1}. ${formatDate(p.startDate)} a ${formatDate(p.endDate)} - Eficiência: ${(p.efficiency * 100).toFixed(2)}% (${p.workDays} dias úteis, ${p.weekendDays} fins de semana, ${p.holidayDays} feriados)`);
  }
  
  // Select the best 6 non-overlapping periods
  const bestSixPeriods = selectBestNonOverlappingPeriods(periods, 6);
  
  console.log('\n  Melhor combinação de 6 períodos de 5 dias não sobrepostos:');
  let totalWorkDays = 0;
  let totalDays = 0;
  
  bestSixPeriods.forEach((p, i) => {
    console.log(`  ${i+1}. ${formatDate(p.startDate)} a ${formatDate(p.endDate)} - Eficiência: ${(p.efficiency * 100).toFixed(2)}% (${p.workDays} dias úteis, ${p.weekendDays} fins de semana, ${p.holidayDays} feriados)`);
    totalWorkDays += p.workDays;
    totalDays += p.totalDays;
  });
  
  // Calculate combined efficiency
  const combinedEfficiency = 1 - (totalWorkDays / totalDays);
  console.log(`\n  Eficiência combinada: ${(combinedEfficiency * 100).toFixed(2)}%`);
  console.log(`  Total de dias: ${totalDays}, Total de dias úteis: ${totalWorkDays}`);
  
  // Compare with a single 30-day period
  const singleMonth = getVacationPeriodDetails(new Date(year, 6, 1), new Date(year, 6, 30)); // July
  console.log(`\n  Comparação com período único de 30 dias (julho): ${(singleMonth.efficiency * 100).toFixed(2)}%`);
  console.log(`  Diferença de eficiência: ${((combinedEfficiency - singleMonth.efficiency) * 100).toFixed(2)}%`);
};

// Select best N non-overlapping periods from a sorted list
const selectBestNonOverlappingPeriods = (sortedPeriods: VacationPeriod[], count: number): VacationPeriod[] => {
  const selected: VacationPeriod[] = [];
  
  // Start with the most efficient period
  let i = 0;
  while (selected.length < count && i < sortedPeriods.length) {
    const current = sortedPeriods[i];
    
    // Check if this period overlaps with any already selected period
    const overlaps = selected.some(p => 
      (current.startDate <= p.endDate && current.endDate >= p.startDate)
    );
    
    if (!overlaps) {
      selected.push(current);
    }
    
    i++;
  }
  
  // Sort by date
  return selected.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
};

export default testFractionStrategies; 