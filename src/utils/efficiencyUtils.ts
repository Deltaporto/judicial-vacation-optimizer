
import { DateRange, VacationPeriod, Recommendation } from '@/types';
import { getVacationPeriodDetails } from './dateUtils';
import { addDays, subDays, format, isSameDay, differenceInDays } from 'date-fns';
import { isHoliday, isWeekend, getHolidaysInRange } from './holidayData';
import { v4 as uuidv4 } from 'uuid';

// Find nearby holidays to potentially extend a vacation period
const findNearbyHolidays = (vacationPeriod: VacationPeriod, daysToCheck: number = 5): { before: Date[], after: Date[] } => {
  const before: Date[] = [];
  const after: Date[] = [];
  
  // Check days before the vacation
  let currentDate = subDays(vacationPeriod.startDate, 1);
  for (let i = 0; i < daysToCheck; i++) {
    if (isHoliday(currentDate) || isWeekend(currentDate)) {
      before.push(currentDate);
    } else {
      break; // Stop at first non-holiday/weekend
    }
    currentDate = subDays(currentDate, 1);
  }
  
  // Check days after the vacation
  currentDate = addDays(vacationPeriod.endDate, 1);
  for (let i = 0; i < daysToCheck; i++) {
    if (isHoliday(currentDate) || isWeekend(currentDate)) {
      after.push(currentDate);
    } else {
      break; // Stop at first non-holiday/weekend
    }
    currentDate = addDays(currentDate, 1);
  }
  
  return { before: before.reverse(), after };
};

// Generate recommendations to optimize a vacation period
export const generateRecommendations = (vacationPeriod: VacationPeriod): Recommendation[] => {
  if (!vacationPeriod.isValid) return [];
  
  const recommendations: Recommendation[] = [];
  const { before, after } = findNearbyHolidays(vacationPeriod);
  
  // Recommendation 1: Extend before
  if (before.length > 0) {
    const newStartDate = before[0];
    const newVacationPeriod = getVacationPeriodDetails(newStartDate, vacationPeriod.endDate);
    const workDayChange = newVacationPeriod.workDays - vacationPeriod.workDays;
    
    if (workDayChange <= 2) { // Only recommend if it costs at most 2 work days
      recommendations.push({
        id: uuidv4(),
        type: 'extend',
        title: 'Estender no início',
        description: `Antecipe o início das férias para ${format(newStartDate, 'dd/MM/yyyy')} aproveitando ${before.length} dia(s) não útil(s) adjacente(s)`,
        suggestedDateRange: {
          startDate: newStartDate,
          endDate: vacationPeriod.endDate
        },
        efficiencyGain: newVacationPeriod.efficiency - vacationPeriod.efficiency,
        daysChanged: differenceInDays(vacationPeriod.startDate, newStartDate)
      });
    }
  }
  
  // Recommendation 2: Extend after
  if (after.length > 0) {
    const newEndDate = after[after.length - 1];
    const newVacationPeriod = getVacationPeriodDetails(vacationPeriod.startDate, newEndDate);
    const workDayChange = newVacationPeriod.workDays - vacationPeriod.workDays;
    
    if (workDayChange <= 2) { // Only recommend if it costs at most 2 work days
      recommendations.push({
        id: uuidv4(),
        type: 'extend',
        title: 'Estender no final',
        description: `Prolongue o final das férias até ${format(newEndDate, 'dd/MM/yyyy')} aproveitando ${after.length} dia(s) não útil(s) adjacente(s)`,
        suggestedDateRange: {
          startDate: vacationPeriod.startDate,
          endDate: newEndDate
        },
        efficiencyGain: newVacationPeriod.efficiency - vacationPeriod.efficiency,
        daysChanged: differenceInDays(newEndDate, vacationPeriod.endDate)
      });
    }
  }
  
  // Recommendation 3: Shift by a few days if it improves efficiency
  // Try shifting the entire period by -3 to +3 days
  for (let shift = -3; shift <= 3; shift++) {
    if (shift === 0) continue;
    
    const newStartDate = addDays(vacationPeriod.startDate, shift);
    const newEndDate = addDays(vacationPeriod.endDate, shift);
    const newVacationPeriod = getVacationPeriodDetails(newStartDate, newEndDate);
    
    if (newVacationPeriod.efficiency > vacationPeriod.efficiency + 0.05) { // Only if significant improvement
      recommendations.push({
        id: uuidv4(),
        type: 'shift',
        title: shift > 0 ? 'Adiar período' : 'Antecipar período',
        description: `${shift > 0 ? 'Adie' : 'Antecipe'} todo o período em ${Math.abs(shift)} dia(s) para melhorar a eficiência`,
        suggestedDateRange: {
          startDate: newStartDate,
          endDate: newEndDate
        },
        efficiencyGain: newVacationPeriod.efficiency - vacationPeriod.efficiency,
        daysChanged: Math.abs(shift)
      });
    }
  }
  
  // Recommendation 4: Split into two periods if beneficial and period is >= 10 days
  if (vacationPeriod.totalDays >= 10) {
    const midPoint = Math.floor(vacationPeriod.totalDays / 2);
    const firstEndDate = addDays(vacationPeriod.startDate, midPoint - 1);
    const secondStartDate = addDays(firstEndDate, 1);
    
    if (isValidSplit(vacationPeriod.startDate, firstEndDate, secondStartDate, vacationPeriod.endDate)) {
      recommendations.push({
        id: uuidv4(),
        type: 'split',
        title: 'Fracionar período',
        description: `Considere fracionar as férias em dois períodos para maior flexibilidade`,
        suggestedDateRange: {
          startDate: vacationPeriod.startDate,
          endDate: vacationPeriod.endDate
        },
        efficiencyGain: 0, // This is more about flexibility than efficiency
        daysChanged: 0
      });
    }
  }
  
  return recommendations.sort((a, b) => b.efficiencyGain - a.efficiencyGain);
};

// Check if splitting a vacation period is valid (both periods >= 5 days)
const isValidSplit = (
  firstStart: Date,
  firstEnd: Date,
  secondStart: Date,
  secondEnd: Date
): boolean => {
  const firstPeriod = getVacationPeriodDetails(firstStart, firstEnd);
  const secondPeriod = getVacationPeriodDetails(secondStart, secondEnd);
  
  return firstPeriod.isValid && secondPeriod.isValid;
};

// Find the most efficient periods of a given length
export const findOptimalPeriods = (
  year: number,
  length: number = 15,
  count: number = 5
): VacationPeriod[] => {
  const results: VacationPeriod[] = [];
  const startDate = new Date(year, 0, 1); // January 1st
  const endDate = new Date(year, 11, 31); // December 31st
  
  // Calculate for each possible start date
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const periodEndDate = addDays(currentDate, length - 1);
    if (periodEndDate > endDate) break;
    
    const period = getVacationPeriodDetails(currentDate, periodEndDate);
    
    // Add to results if valid
    if (period.isValid) {
      results.push(period);
    }
    
    currentDate = addDays(currentDate, 1);
  }
  
  // Sort by efficiency and return top count
  return results
    .sort((a, b) => b.efficiency - a.efficiency)
    .slice(0, count);
};
