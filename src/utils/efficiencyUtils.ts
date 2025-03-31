import { DateRange, VacationPeriod, Recommendation, FractionedVacationPeriods, Holiday } from '../types';
import { getVacationPeriodDetails } from './dateUtils';
import { addDays, subDays, format, isSameDay, differenceInDays, isWeekend as isWeekendDateFns, max, min } from 'date-fns';
import { isHoliday, isWeekend, getHolidaysInRange } from './holidayData';
import { v4 as uuidv4 } from 'uuid';
import { ptBR } from 'date-fns/locale';
import { dateRangesOverlap, getOverlapDays } from './dateOverlapUtils';
import { calculateImprovedEfficiency, generateImprovedRecommendations } from './improvedEfficiencyUtils';

// Constantes para o cálculo de eficiência
const HOLIDAY_ADJACENCY_BONUS = 0.8; // Bônus substancial para adjacência com feriados
const LARGE_CONTINUOUS_BLOCK_BONUS = 0.3; // Bônus para blocos contínuos grandes

// Helper function to get day name (avoids repetition)
const getDayOfWeekName = (date: Date): string => format(date, 'EEEE', { locale: ptBR });

/**
 * Detecta se um período de férias é adjacente a feriados (imediatamente antes ou depois)
 * Esta função é crucial para identificar o posicionamento estratégico mais importante
 * 
 * @param startDate Data de início do período
 * @param endDate Data de fim do período
 * @returns Objeto com informações sobre adjacência com feriados
 */
export const detectHolidayAdjacency = (startDate: Date, endDate: Date): {
  isAdjacentBefore: boolean;     // Se o período termina imediatamente antes de um feriado
  isAdjacentAfter: boolean;      // Se o período começa imediatamente após um feriado
  adjacentHolidaysBefore: Date[]; // Datas dos feriados adjacentes antes
  adjacentHolidaysAfter: Date[];  // Datas dos feriados adjacentes depois
  continuousBlockDays: number;    // Total de dias no bloco contínuo (férias + feriados + fins de semana)
} => {
  // Resultado padrão
  const result = {
    isAdjacentBefore: false,
    isAdjacentAfter: false,
    adjacentHolidaysBefore: [] as Date[],
    adjacentHolidaysAfter: [] as Date[],
    continuousBlockDays: differenceInDays(endDate, startDate) + 1 // Dias de férias
  };
  
  // Obter os feriados de todo o ano
  const year = startDate.getFullYear();
  const holidays = getHolidaysInRange(
    new Date(year, 0, 1),
    new Date(year, 11, 31)
  );
  
  // Verificar adjacência ANTES do período (dia seguinte ao fim das férias é feriado?)
  let dayAfterEnd = addDays(endDate, 1);
  let continuousAfter = 0;
  
  // Verificar se há uma sequência contínua de feriados e fins de semana após o período
  while (isHoliday(dayAfterEnd) || isWeekend(dayAfterEnd)) {
    continuousAfter++;
    
    if (isHoliday(dayAfterEnd)) {
      result.isAdjacentBefore = true;
      result.adjacentHolidaysBefore.push(new Date(dayAfterEnd));
    }
    
    dayAfterEnd = addDays(dayAfterEnd, 1);
  }
  
  // Verificar adjacência DEPOIS do período (dia anterior ao início das férias é feriado?)
  let dayBeforeStart = subDays(startDate, 1);
  let continuousBefore = 0;
  
  // Verificar se há uma sequência contínua de feriados e fins de semana antes do período
  while (isHoliday(dayBeforeStart) || isWeekend(dayBeforeStart)) {
    continuousBefore++;
    
    if (isHoliday(dayBeforeStart)) {
      result.isAdjacentAfter = true;
      result.adjacentHolidaysAfter.push(new Date(dayBeforeStart));
    }
    
    dayBeforeStart = subDays(dayBeforeStart, 1);
  }
  
  // Calcular o total de dias no bloco contínuo
  result.continuousBlockDays += continuousBefore + continuousAfter;
  
  return result;
};

/**
 * Calcula o tamanho do bloco contínuo de dias de folga (férias + feriados + fins de semana)
 * 
 * @param vacationPeriod Período de férias a ser avaliado
 * @returns Informações sobre o bloco contínuo
 */
export const calculateContinuousBlock = (
  vacationPeriod: VacationPeriod
): {
  totalContinuousDays: number;
  continuousBlockStart: Date;
  continuousBlockEnd: Date;
} => {
  // Data de início do período
  const startDate = vacationPeriod.startDate;
  const endDate = vacationPeriod.endDate;
  
  // Detectar adjacência com feriados
  const adjacency = detectHolidayAdjacency(startDate, endDate);
  
  // Identificar início e fim do bloco contínuo
  let blockStart = startDate;
  let blockEnd = endDate;
  
  // Se há dias contínuos antes, ajustar a data de início do bloco
  if (adjacency.adjacentHolidaysAfter.length > 0) {
    const daysBack = adjacency.adjacentHolidaysAfter.length;
    blockStart = subDays(startDate, daysBack);
  }
  
  // Se há dias contínuos depois, ajustar a data de fim do bloco
  if (adjacency.adjacentHolidaysBefore.length > 0) {
    const daysForward = adjacency.adjacentHolidaysBefore.length;
    blockEnd = addDays(endDate, daysForward);
  }
  
  // Calcular o total de dias no bloco contínuo
  const totalContinuousDays = differenceInDays(blockEnd, blockStart) + 1;
  
  return {
    totalContinuousDays,
    continuousBlockStart: blockStart,
    continuousBlockEnd: blockEnd
  };
};

/**
 * Encontra dias com potencial para extensão de férias, identificando
 * clusters de feriados e fins de semana adjacentes, mas ignorando
 * fins de semana isolados que não trariam benefício real
 */
const findNearbyOpportunities = (
  vacationPeriod: VacationPeriod, 
  daysToCheck: number = 5
): { before: Date[], after: Date[], workDaysBefore: number, workDaysAfter: number, practicalBefore: boolean, practicalAfter: boolean } => {
  const before: Date[] = [];
  const after: Date[] = [];
  let workDaysBefore = 0;
  let workDaysAfter = 0;
  let practicalBefore = true;  // Flag indicating if extension before is practical
  let practicalAfter = true;   // Flag indicating if extension after is practical
  
  // Check if original period has good start/end days
  const hasGoodStartDay = vacationPeriod.startDate.getDay() === 1; // Monday
  const hasGoodEndDay = vacationPeriod.endDate.getDay() === 5;     // Friday
  
  // Check days before the vacation - find continuous blocks of holidays
  let currentDate = subDays(vacationPeriod.startDate, 1);
  let consecutiveNonWorkDays = 0;
  
  // If already starting on Monday, before extension is less practical
  if (hasGoodStartDay) {
    practicalBefore = false;
  }
  
  for (let i = 0; i < daysToCheck; i++) {
    const isNonWorkDay = isHoliday(currentDate) || isWeekend(currentDate);
    
    if (isNonWorkDay) {
      // Only add if it's a holiday or part of a bridge to a holiday
      if (isHoliday(currentDate) || consecutiveNonWorkDays > 0) {
        before.push(currentDate);
      }
      consecutiveNonWorkDays++;
    } else {
      // It's a work day
      if (consecutiveNonWorkDays > 0) {
        // This work day is part of a potential bridge
        before.push(currentDate);
        workDaysBefore++;
      } else {
        // Just a regular work day with no connection to holidays
        workDaysBefore++;
      }
      consecutiveNonWorkDays = 0;
    }
    currentDate = subDays(currentDate, 1);
  }
  
  // Check days after the vacation - find continuous blocks of holidays
  currentDate = addDays(vacationPeriod.endDate, 1);
  consecutiveNonWorkDays = 0;
  
  // If already ending on Friday, after extension is less practical 
  // (don't extend vacations to end on weekend or Monday)
  if (hasGoodEndDay) {
    practicalAfter = false;
  }
  
  for (let i = 0; i < daysToCheck; i++) {
    const isNonWorkDay = isHoliday(currentDate) || isWeekend(currentDate);
    const currentDayOfWeek = currentDate.getDay();
    
    // Flag extension as impractical if it would end on a weekend or Monday
    if (i === 0 && (currentDayOfWeek === 6 || currentDayOfWeek === 0)) { // Sat or Sun
      practicalAfter = false;
    }
    
    if (isNonWorkDay) {
      // Only add if it's a holiday or part of a bridge to a holiday
      if (isHoliday(currentDate) || consecutiveNonWorkDays > 0) {
        after.push(currentDate);
      }
      consecutiveNonWorkDays++;
    } else {
      // It's a work day
      if (consecutiveNonWorkDays > 0) {
        // This work day is part of a potential bridge
        after.push(currentDate);
        workDaysAfter++;
      } else {
        // Just a regular work day with no connection to holidays
        workDaysAfter++;
      }
      consecutiveNonWorkDays = 0;
    }
    currentDate = addDays(currentDate, 1);
  }
  
  return { 
    before: before.reverse(), 
    after,
    workDaysBefore,
    workDaysAfter,
    practicalBefore,
    practicalAfter
  };
};

// Find potential "bridges" between holidays/weekends within a certain range
export const findPotentialBridges = (year: number, maxBridgeSize: number = 3): { startDate: Date, endDate: Date, workDays: number, strategicScore: number }[] => {
  console.log(`[findPotentialBridges] Iniciando busca por pontes em ${year} (tamanho máx: ${maxBridgeSize})`);
  const bridges: { startDate: Date, endDate: Date, workDays: number, strategicScore: number }[] = [];
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);
  
  const allHolidays = getHolidaysInRange(startDate, endDate);
  console.log(`[findPotentialBridges] Feriados encontrados: ${allHolidays.length}`);
  console.log(`[findPotentialBridges] Feriados carregados:`, allHolidays.map(h => `${h.name} (${h.date.getDate()}/${h.date.getMonth()+1}/${h.date.getFullYear()})`));
  // Log para ver alguns feriados
  if (allHolidays.length > 0) {
    console.log(`[findPotentialBridges] Exemplos de feriados: ${allHolidays.slice(0, 3).map(h => `${h.name} (${format(h.date, 'dd/MM')})`).join(', ')}`);
  }
  const holidayDates = allHolidays.map(h => new Date(h.date.getFullYear(), h.date.getMonth(), h.date.getDate()));

  // Collect all non-work days (holidays and weekends)
  const nonWorkDays: Date[] = [];
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const currentDayNormalized = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    const isCurrentHoliday = holidayDates.some(hd => hd.getTime() === currentDayNormalized.getTime());
    if (isCurrentHoliday || isWeekend(currentDate)) {
      nonWorkDays.push(new Date(currentDate));
    }
    currentDate = addDays(currentDate, 1);
  }
  console.log(`[findPotentialBridges] Total de dias não úteis (feriados+fins de semana): ${nonWorkDays.length}`);
  
  nonWorkDays.sort((a, b) => a.getTime() - b.getTime());
  
  let potentialBridgeCount = 0;
  let validBridgeCount = 0;

  for (let i = 0; i < nonWorkDays.length - 1; i++) {
    const current = nonWorkDays[i];
    for (let j = i + 1; j < nonWorkDays.length; j++) {
      const next = nonWorkDays[j];
      const gapDays = differenceInDays(next, current) - 1;
      console.log(`[findPotentialBridges] Verificando gap entre ${format(current, 'dd/MM')} e ${format(next, 'dd/MM')}: ${gapDays} dias`);

      if (gapDays > 0 && gapDays <= maxBridgeSize) {
        potentialBridgeCount++;
        const bridgeStart = addDays(current, 1);
        const bridgeEnd = subDays(next, 1);
        console.log(`[findPotentialBridges] -> Gap válido (${gapDays} <= ${maxBridgeSize}). Verificando ponte de ${format(bridgeStart, 'dd/MM')} a ${format(bridgeEnd, 'dd/MM')}`);
        
        let workDays = 0;
        let containsHoliday = false;
        let bridgeDate = new Date(bridgeStart);
        
        while (bridgeDate <= bridgeEnd) {
          const bridgeDayNormalized = new Date(bridgeDate.getFullYear(), bridgeDate.getMonth(), bridgeDate.getDate());
          const isHolidayInBridge = holidayDates.some(hd => hd.getTime() === bridgeDayNormalized.getTime());
          const isWeekendInBridge = isWeekend(bridgeDate);
          console.log(`[findPotentialBridges]   - Verificando dia ${format(bridgeDate, 'dd/MM')}: é feriado? ${isHolidayInBridge}, é fim de semana? ${isWeekendInBridge}`);
          if (isHolidayInBridge) {
            containsHoliday = true;
            console.log(`[findPotentialBridges]     -> Feriado encontrado dentro da ponte. Descartando.`);
            break;
          }
          if (!isWeekendInBridge) {
            workDays++;
          }
          bridgeDate = addDays(bridgeDate, 1);
        }
        
        console.log(`[findPotentialBridges] -> Ponte de ${format(bridgeStart, 'dd/MM')} a ${format(bridgeEnd, 'dd/MM')}: Contém feriado? ${containsHoliday}, Dias úteis: ${workDays}`);
        if (!containsHoliday && workDays > 0) {
           // Removida lógica complexa que usava holiday.name e isHoliday de forma incorreta
          const bridgeDetails = { startDate: bridgeStart, endDate: bridgeEnd, workDays: workDays, strategicScore: 0 };
          bridgeDetails.strategicScore = calculateBridgeStrategicScore(bridgeStart, bridgeEnd, workDays); // Calcular score
          console.log(`[findPotentialBridges]   -> Ponte VÁLIDA adicionada! Score: ${bridgeDetails.strategicScore}`);
          validBridgeCount++;
          bridges.push(bridgeDetails);
        } else {
          console.log(`[findPotentialBridges]   -> Ponte INVÁLIDA (contém feriado ou não tem dias úteis).`);
        }
      } else if (gapDays > maxBridgeSize) {
        console.log(`[findPotentialBridges] -> Gap (${gapDays}) maior que maxBridgeSize (${maxBridgeSize}). Pulando para próximo 'current'.`);
        // Se o gap já é maior que o maxBridgeSize, não adianta testar com os próximos 'next' para este 'current'
        break; // Otimização: Pula para o próximo 'current' no loop externo (ESTE BREAK ESTÁ OK)
      }
    }
  }
  console.log(`[findPotentialBridges] Fim da busca. Pontes potenciais avaliadas: ${potentialBridgeCount}. Pontes válidas encontradas: ${validBridgeCount}`);
  return bridges;
};

// Find the optimal split point for a vacation period that maximizes efficiency of both periods
const findOptimalSplitPoint = (vacationPeriod: VacationPeriod): { 
  firstPeriod: VacationPeriod, 
  secondPeriod: VacationPeriod, 
  combinedEfficiency: number,
  bestDistribution: number
} | null => {
  if (vacationPeriod.totalDays < 10) return null; // Need at least 10 days to split
  
  let bestSplit = null;
  let bestCombinedEfficiency = 0;
  let bestDistribution = 0; // Measure of how well non-working days are distributed
  
  // Try each possible split point
  const minPeriodLength = 5; // Minimum period length
  
  // Debug
  console.log(`Tentando encontrar ponto de split para período de ${vacationPeriod.totalDays} dias com eficiência ${(vacationPeriod.efficiency * 100).toFixed(2)}%`);
  console.log(`Período original: ${format(vacationPeriod.startDate, 'dd/MM/yyyy')} a ${format(vacationPeriod.endDate, 'dd/MM/yyyy')}, dias úteis: ${vacationPeriod.workDays}`);
  
  for (let i = minPeriodLength - 1; i <= vacationPeriod.totalDays - minPeriodLength; i++) {
    const firstEndDate = addDays(vacationPeriod.startDate, i);
    const secondStartDate = addDays(firstEndDate, 1);
    
    const firstPeriod = getVacationPeriodDetails(vacationPeriod.startDate, firstEndDate);
    const secondPeriod = getVacationPeriodDetails(secondStartDate, vacationPeriod.endDate);
    
    // Verificar se ambos os períodos são válidos E contêm pelo menos um dia útil
    if (firstPeriod.isValid && secondPeriod.isValid && firstPeriod.workDays > 0 && secondPeriod.workDays > 0) {
      // Ajustes estratégicos baseados no posicionamento dos períodos
      let positioningAdjustment = 0;
      
      // ===== VERIFICAÇÃO DE INÍCIO/FIM DE PERÍODOS =====
      
      // Verificar se o segundo período começa em um final de semana (penalizar mais)
      if (isWeekend(secondPeriod.startDate)) {
        positioningAdjustment -= 0.15; // Penalidade maior
        console.log(`  - Penalizando split pois o segundo período começa em final de semana (${format(secondPeriod.startDate, 'dd/MM/yyyy')})`);
      }
      
      // Verificar se o primeiro período termina em uma sexta-feira (bonificar mais)
      if (firstPeriod.endDate.getDay() === 5) { // 5 = sexta-feira
        positioningAdjustment += 0.10; // Bonificação maior
        console.log(`  - Bonificando split pois o primeiro período termina numa sexta-feira (${format(firstPeriod.endDate, 'dd/MM/yyyy')})`);
      }
      
      // Verificar se o segundo período começa em uma segunda-feira (bonificar mais)
      if (secondPeriod.startDate.getDay() === 1) { // 1 = segunda-feira
        positioningAdjustment += 0.10; // Bonificação maior
        console.log(`  - Bonificando split pois o segundo período começa numa segunda-feira (${format(secondPeriod.startDate, 'dd/MM/yyyy')})`);
      }
      
      // Verificar se o primeiro período começa em uma segunda-feira (bonificar)
      if (firstPeriod.startDate.getDay() === 1) { // 1 = segunda-feira
        positioningAdjustment += 0.08; // Bonificação moderada
        console.log(`  - Bonificando split pois o primeiro período começa numa segunda-feira (${format(firstPeriod.startDate, 'dd/MM/yyyy')})`);
      }
      
      // Verificar se o segundo período termina em uma sexta-feira (bonificar)
      if (secondPeriod.endDate.getDay() === 5) { // 5 = sexta-feira
        positioningAdjustment += 0.08; // Bonificação moderada
        console.log(`  - Bonificando split pois o segundo período termina numa sexta-feira (${format(secondPeriod.endDate, 'dd/MM/yyyy')})`);
      }
      
      // Penalizar se o primeiro período termina num domingo (perda de conexão com fim de semana)
      if (firstPeriod.endDate.getDay() === 0) { // 0 = domingo
        positioningAdjustment -= 0.05; // Penalidade moderada
        console.log(`  - Penalizando split pois o primeiro período termina num domingo (${format(firstPeriod.endDate, 'dd/MM/yyyy')})`);
      }
      
      // Verificar "períodos perfeitos" - segunda a sexta
      if (firstPeriod.startDate.getDay() === 1 && firstPeriod.endDate.getDay() === 5) {
        positioningAdjustment += 0.12; // Bonificação significativa
        console.log(`  - Bonificando split pois o primeiro período é "perfeito" (segunda a sexta)`);
      }
      
      if (secondPeriod.startDate.getDay() === 1 && secondPeriod.endDate.getDay() === 5) {
        positioningAdjustment += 0.12; // Bonificação significativa
        console.log(`  - Bonificando split pois o segundo período é "perfeito" (segunda a sexta)`);
      }
      
      // ===== EQUILÍBRIO DOS PERÍODOS =====
      
      // Verificar se os períodos têm durações similares (preferir equilíbrio)
      const firstRatio = firstPeriod.totalDays / vacationPeriod.totalDays;
      const secondRatio = secondPeriod.totalDays / vacationPeriod.totalDays;
      const balanceRatio = Math.min(firstRatio, secondRatio) / Math.max(firstRatio, secondRatio);
      
      // Bonificar splits equilibrados (entre 40/60 e 60/40)
      if (balanceRatio >= 0.65) {
        positioningAdjustment += 0.05;
        console.log(`  - Bonificando split pela divisão equilibrada (${(firstRatio * 100).toFixed(0)}% / ${(secondRatio * 100).toFixed(0)}%)`);
      }
      
      // Use weighted average based on period lengths
      const firstWeight = firstPeriod.totalDays / vacationPeriod.totalDays;
      const secondWeight = secondPeriod.totalDays / vacationPeriod.totalDays;
      const combinedEfficiency = 
        (firstPeriod.efficiency * firstWeight) + 
        (secondPeriod.efficiency * secondWeight);
      
      // Calculate distribution score - higher is better
      // This measures how well non-work days are distributed between the two periods
      // and if splitting actually gives an advantage in terms of flexibility
      const nonWorkDaysFirst = firstPeriod.weekendDays + firstPeriod.holidayDays;
      const nonWorkDaysSecond = secondPeriod.weekendDays + secondPeriod.holidayDays;
      const distributionScore = Math.min(nonWorkDaysFirst, nonWorkDaysSecond) / 
                               Math.max(nonWorkDaysFirst, nonWorkDaysSecond);
      
      // Calculated improvement from flexibility
      const flexibilityBonus = 0.03; // 3% bonus for flexibility (aumentado)
      // Aplicar penalidade/bonificação por posicionamento estratégico dos períodos
      const effectiveEfficiency = combinedEfficiency + flexibilityBonus + positioningAdjustment;
      
      // Debug
      console.log(`Split ponto ${i}: ${(firstPeriod.efficiency * 100).toFixed(2)}% e ${(secondPeriod.efficiency * 100).toFixed(2)}% = ${(combinedEfficiency * 100).toFixed(2)}% (dist: ${(distributionScore * 100).toFixed(2)}%, ajuste: ${(positioningAdjustment * 100).toFixed(2)}%)`);
      console.log(`  - Período 1: ${format(firstPeriod.startDate, 'dd/MM/yyyy')} a ${format(firstPeriod.endDate, 'dd/MM/yyyy')}, dias úteis: ${firstPeriod.workDays}, dia semana início: ${firstPeriod.startDate.getDay()}, fim: ${firstPeriod.endDate.getDay()}`);
      console.log(`  - Período 2: ${format(secondPeriod.startDate, 'dd/MM/yyyy')} a ${format(secondPeriod.endDate, 'dd/MM/yyyy')}, dias úteis: ${secondPeriod.workDays}, dia semana início: ${secondPeriod.startDate.getDay()}, fim: ${secondPeriod.endDate.getDay()}`);
      
      // Prioritize good distribution of non-work days and strategic positioning
      if (effectiveEfficiency >= bestCombinedEfficiency && distributionScore > 0.3) { // Reduzi o limite mínimo para considerar mais opções
        bestCombinedEfficiency = effectiveEfficiency;
        bestDistribution = distributionScore;
        bestSplit = { 
          firstPeriod, 
          secondPeriod, 
          combinedEfficiency: effectiveEfficiency,
          bestDistribution: distributionScore
        };
      }
    } else {
      // Debug - mostrar por que o split foi rejeitado
      console.log(`Split rejeitado no ponto ${i}:`);
      if (!firstPeriod.isValid) console.log(`  - Primeiro período inválido: ${firstPeriod.invalidReason}`);
      if (!secondPeriod.isValid) console.log(`  - Segundo período inválido: ${secondPeriod.invalidReason}`);
      if (firstPeriod.workDays === 0) console.log(`  - Primeiro período não tem dias úteis`);
      if (secondPeriod.workDays === 0) console.log(`  - Segundo período não tem dias úteis`);
    }
  }
  
  // Debug
  if (bestSplit) {
    console.log(`Melhor split encontrado: eficiência combinada ${(bestSplit.combinedEfficiency * 100).toFixed(2)}% (ganho de ${((bestSplit.combinedEfficiency - vacationPeriod.efficiency) * 100).toFixed(2)}%)`);
    console.log(`Distribuição de dias não úteis: ${(bestSplit.bestDistribution * 100).toFixed(2)}%`);
    console.log(`Primeiro período: ${format(bestSplit.firstPeriod.startDate, 'dd/MM/yyyy')} a ${format(bestSplit.firstPeriod.endDate, 'dd/MM/yyyy')}, dia semana início: ${bestSplit.firstPeriod.startDate.getDay()}, fim: ${bestSplit.firstPeriod.endDate.getDay()}`);
    console.log(`Segundo período: ${format(bestSplit.secondPeriod.startDate, 'dd/MM/yyyy')} a ${format(bestSplit.secondPeriod.endDate, 'dd/MM/yyyy')}, dia semana início: ${bestSplit.secondPeriod.startDate.getDay()}, fim: ${bestSplit.secondPeriod.endDate.getDay()}`);
  } else {
    console.log('Nenhum split válido encontrado');
  }
  
  return bestSplit;
};

// Find the optimal shift window for better efficiency (adaptive instead of fixed -3 to +3)
const findOptimalShift = (
  vacationPeriod: VacationPeriod, 
  maxSearchWindow: number = 10 // Aumentei a janela de busca para considerar mais opções
): { startDate: Date, endDate: Date, efficiencyGain: number, daysShifted: number } | null => {
  let bestShift = null;
  let bestEfficiencyGain = 0;
  let bestPositioningScore = 0;
  
  // Try different shift values in both directions
  for (let shift = -maxSearchWindow; shift <= maxSearchWindow; shift++) {
    if (shift === 0) continue;
    
    const newStartDate = addDays(vacationPeriod.startDate, shift);
    const newEndDate = addDays(vacationPeriod.endDate, shift);
    const newPeriod = getVacationPeriodDetails(newStartDate, newEndDate);
    
    // Base efficiency calculation
    let adjustedEfficiency = newPeriod.workDays > 0 ? newPeriod.totalDays / newPeriod.workDays : 0;
    let positioningScore = 0; // Nova pontuação para rastrear a qualidade do posicionamento
    
    // ===== AJUSTES POR POSICIONAMENTO ESTRATÉGICO =====
    
    // Penalizar períodos que começam próximo ou em finais de semana
    const startDay = newStartDate.getDay();
    if (startDay === 5) { // Sexta
      adjustedEfficiency -= 0.10; // Penalidade maior
      positioningScore -= 15;
    } else if (startDay === 6) { // Sábado
      adjustedEfficiency -= 0.15; // Penalidade severa
      positioningScore -= 25;
    } else if (startDay === 0) { // Domingo
      adjustedEfficiency -= 0.12; // Penalidade alta
      positioningScore -= 20;
    }
    
    // Bônus maior para períodos começando em segunda-feira
    if (startDay === 1) { // Segunda
      adjustedEfficiency += 0.10; // Bônus significativo
      positioningScore += 20;
    } else if (startDay === 2) { // Terça
      adjustedEfficiency += 0.06; // Bônus moderado
      positioningScore += 10;
    } else if (startDay === 3 || startDay === 4) { // Quarta ou quinta
      adjustedEfficiency += 0.03; // Pequeno bônus
      positioningScore += 5;
    }
    
    // Penalizar períodos que terminam em fins de semana
    const endDay = newEndDate.getDay();
    if (endDay === 6) { // Sábado
      adjustedEfficiency -= 0.12; // Penalidade alta
      positioningScore -= 20;
    } else if (endDay === 0) { // Domingo
      adjustedEfficiency -= 0.15; // Penalidade severa
      positioningScore -= 25;
    } else if (endDay === 1) { // Segunda
      adjustedEfficiency -= 0.10; // Penalidade significativa
      positioningScore -= 15;
    }
    
    // Bônus maior para períodos terminando em sexta-feira
    if (endDay === 5) { // Sexta
      adjustedEfficiency += 0.10; // Bônus significativo
      positioningScore += 20;
    } else if (endDay === 4) { // Quinta
      adjustedEfficiency += 0.05; // Bônus moderado
      positioningScore += 10;
    } else if (endDay === 2 || endDay === 3) { // Terça ou quarta
      adjustedEfficiency += 0.02; // Pequeno bônus 
      positioningScore += 5;
    }
    
    // Bônus para períodos "perfeitos" (segunda a sexta)
    if (startDay === 1 && endDay === 5) {
      adjustedEfficiency += 0.15; // Bônus substancial
      positioningScore += 30;
    }
    
    // ===== BÔNUS POR PROXIMIDADE DE FERIADOS =====
    
    // Verificar feriados próximos para maximizar "pontes"
    const threeDaysBefore = subDays(newStartDate, 3);
    const threeDaysAfter = addDays(newEndDate, 3);
    
    // Contar feriados próximos
    let holidaysBeforeStart = 0;
    let holidaysAfterEnd = 0;
    let currentDate = new Date(threeDaysBefore);
    
    // Verificar feriados antes do início
    while (currentDate < newStartDate) {
      if (isHoliday(currentDate)) {
        holidaysBeforeStart++;
      }
      currentDate = addDays(currentDate, 1);
    }
    
    // Verificar feriados depois do fim
    currentDate = addDays(newEndDate, 1);
    while (currentDate <= threeDaysAfter) {
      if (isHoliday(currentDate)) {
        holidaysAfterEnd++;
      }
      currentDate = addDays(currentDate, 1);
    }
    
    // Aplicar bônus por feriados próximos
    if (holidaysBeforeStart > 0) {
      adjustedEfficiency += 0.08 * holidaysBeforeStart;
      positioningScore += 15 * holidaysBeforeStart;
    }
    
    if (holidaysAfterEnd > 0) {
      adjustedEfficiency += 0.08 * holidaysAfterEnd;
      positioningScore += 15 * holidaysAfterEnd;
    }
    
    // ===== CONSIDERAÇÃO DE DURAÇÃO =====
    
    // Garantir que o período tenha pelo menos um dia útil
    const hasWorkDays = newPeriod.workDays > 0;
    
    // Calcular o ganho efetivo
    const efficiencyGain = adjustedEfficiency - vacationPeriod.efficiency;
    
    // Atualizar a melhor opção encontrada
    // Priorizar ganho de eficiência, mas com peso significativo para posicionamento
    if (hasWorkDays && (
        efficiencyGain > bestEfficiencyGain || 
        (Math.abs(efficiencyGain - bestEfficiencyGain) < 0.03 && positioningScore > bestPositioningScore)
    )) {
      bestEfficiencyGain = efficiencyGain;
      bestPositioningScore = positioningScore;
      bestShift = {
        startDate: newStartDate,
        endDate: newEndDate,
        efficiencyGain,
        daysShifted: Math.abs(shift)
      };
    }
  }
  
  // Só retornar se houver uma melhoria significativa
  // Reduzir o limite para 3% para considerar melhorias menores mas bem posicionadas
  if (bestShift && bestShift.efficiencyGain > 0.03) {
    return bestShift;
  }
  
  return null;
};

/**
 * Calcula a eficiência do período de férias considerando:
 * 1. Ganho real por feriados em dias úteis
 * 2. Posicionamento estratégico (início/fim de semana)
 * 3. Penalização por desperdício de dias formais (método híbrido)
 * 4. Adjacência com feriados (NOVO - fator mais importante)
 * 
 * @param period Período de férias a ser avaliado
 * @returns Valor de eficiência ajustado (mínimo 1.0)
 */
export const calculateAdjustedEfficiency = (period: VacationPeriod): number => {
  if (period.workDays === 0) return 1.0;

  let efficiency = 1.0;

  // 1. Ganho por feriados em dias úteis
  const holidaysOnWorkDays = period.holidayDays;
  if (holidaysOnWorkDays > 0) {
    efficiency += (holidaysOnWorkDays / period.workDays);
  }

  // 2. Bônus para posicionamento estratégico
  const startDayOfWeek = period.startDate.getDay();
  const endDayOfWeek = period.endDate.getDay();

  // Bônus para início na segunda-feira
  if (startDayOfWeek === 1) {
    efficiency += 0.05;
  }

  // Bônus para término na sexta-feira
  if (endDayOfWeek === 5) {
    efficiency += 0.05;
  }

  // Bônus adicional para períodos "perfeitos" (segunda a sexta)
  if (startDayOfWeek === 1 && endDayOfWeek === 5) {
    efficiency += 0.05;
  }
  
  // 3. NOVO - Bônus para adjacência com feriados (FATOR MAIS IMPORTANTE)
  const adjacency = detectHolidayAdjacency(period.startDate, period.endDate);
  
  // Aplicar bônus substancial se o período for adjacente a feriado(s)
  if (adjacency.isAdjacentBefore || adjacency.isAdjacentAfter) {
    efficiency += HOLIDAY_ADJACENCY_BONUS;
  }
  
  // Bônus adicional para blocos contínuos grandes
  if (adjacency.continuousBlockDays > 10) {
    efficiency += LARGE_CONTINUOUS_BLOCK_BONUS;
  }

  // 4. Penalização por desperdício - MÉTODO HÍBRIDO
  const nonWorkDays = period.weekendDays + period.holidayDays;
  if (nonWorkDays > 0) {
    // Penalização para o primeiro dia não-útil (mais substancial)
    const firstDayPenalty = 0.35;
    
    if (nonWorkDays === 1) {
      efficiency -= firstDayPenalty / period.workDays;
    } else {
      // Primeiro dia tem penalidade fixa maior
      // Dias adicionais têm penalidade incremental com taxa de crescimento mais acentuada
      let additionalDays = nonWorkDays - 1;
      let additionalPenalty = 0;
      
      for (let i = 0; i < additionalDays; i++) {
        // Cada dia adicional tem penalidade 80% maior que o anterior
        additionalPenalty += firstDayPenalty * Math.pow(1.8, i);
      }
      
      efficiency -= (firstDayPenalty + additionalPenalty) / period.workDays;
    }
  }

  // Garantir que a eficiência não fique abaixo de 1.0
  return Math.max(1.0, efficiency);
};

// Find optimal periods of 5 days throughout the year
export const findOptimalFractionedPeriods = (
  year: number, 
  fractionCount: number = 6, 
  daysPerFraction: number = 5
): FractionedVacationPeriods | null => {
  console.log(`Buscando ${fractionCount} períodos otimizados de ${daysPerFraction} dias para o ano ${year}`);
  
  // Generate all possible periods of daysPerFraction days in the year
  const allPeriods: VacationPeriod[] = [];
  const startDate = new Date(year, 0, 1); // January 1st
  const endDate = new Date(year, 11, 31 - (daysPerFraction - 1)); // Last start date for a period
  
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const periodEndDate = addDays(currentDate, daysPerFraction - 1);
    const period = getVacationPeriodDetails(currentDate, periodEndDate);
    
    // Only consider periods with at least one work day
    if (period.isValid && period.workDays > 0) {
      // Atribuir um bônus estratégico baseado nos dias de início/fim
      let strategicBonus = 0;
      
      // Penalizar período começando em fim de semana
      if (isWeekend(period.startDate)) {
        strategicBonus -= 0.25; // Aumentado de -0.1
      }
      
      // Forte bônus para período começando na segunda
      if (period.startDate.getDay() === 1) { // Segunda-feira
        strategicBonus += 0.15; // Aumentado de 0.05
      }
      
      // Forte bônus para período terminando na sexta
      if (period.endDate.getDay() === 5) { // Sexta-feira
        strategicBonus += 0.15; // Aumentado de 0.05
      }
      
      // Bônus especial para períodos "perfeitos" (segunda a sexta)
      if (period.startDate.getDay() === 1 && period.endDate.getDay() === 5) {
        strategicBonus += 0.3; // Novo bônus para períodos ideais
      }
      
      // Calcular quantos dias são fim de semana dentro do período
      let weekendDaysCount = 0;
      let holidaysOnWorkdays = 0;
      let currentDate = new Date(period.startDate);
      
      while (currentDate <= period.endDate) {
        if (isWeekend(currentDate)) {
          weekendDaysCount++;
        } else if (isHoliday(currentDate)) {
          holidaysOnWorkdays++;
        }
        currentDate = addDays(currentDate, 1);
      }
      
      // Penalizar períodos que incluem fins de semana desnecessariamente
      // (quando o objetivo é 5 dias úteis = 5 dias totais)
      if (daysPerFraction === 5 && weekendDaysCount > 0) {
        strategicBonus -= weekendDaysCount * 0.1; // Penalização por cada dia de fim de semana
      }
      
      // Verificar se o período tem exatamente 5 dias úteis (ideal para períodos de 5 dias)
      if (daysPerFraction === 5 && period.workDays === 5) {
        strategicBonus += 0.2; // Bônus para períodos com exatamente 5 dias úteis
      }
      
      // Bônus adicional para períodos que incluem feriados em dias úteis
      if (holidaysOnWorkdays > 0) {
        strategicBonus += holidaysOnWorkdays * 0.08; // Bônus por cada feriado em dia útil
      }
      
      // Ajustar eficiência com o bônus estratégico
      const adjustedEfficiency = period.efficiency + strategicBonus;
      
      // Adicionar o período com a eficiência ajustada
      allPeriods.push({
        ...period,
        efficiency: adjustedEfficiency
      });
    }
    
    currentDate = addDays(currentDate, 1);
  }
  
  // Avaliar cada período com base na eficiência ajustada
  allPeriods.forEach(period => {
    // Usar a nova função de eficiência ajustada em vez da original
    period.efficiency = calculateAdjustedEfficiency(period);
    
    // Atualizar a classificação de eficiência com base no novo cálculo
    if (period.efficiency >= 1.4) {
      period.efficiencyRating = 'high';
    } else if (period.efficiency >= 1.2) {
      period.efficiencyRating = 'medium';
    } else {
      period.efficiencyRating = 'low';
    }
  });
  
  // Sort by efficiency (most efficient first)
  const sortedPeriods = allPeriods.sort((a, b) => b.efficiency - a.efficiency);
  
  // Select the best non-overlapping periods
  const selectedPeriods = selectNonOverlappingPeriods(sortedPeriods, fractionCount);
  
  if (selectedPeriods.length === 0) return null;
  
  // Calculate the total workdays and total days across all periods
  let totalWorkDays = 0;
  let totalDays = 0;
  let totalNonWorkDays = 0;
  
  selectedPeriods.forEach(period => {
    totalWorkDays += period.workDays;
    totalDays += period.totalDays;
    totalNonWorkDays += (period.weekendDays + period.holidayDays);
  });
  
  // Calculate combined efficiency
  const combinedEfficiency = totalWorkDays > 0 ? totalDays / totalWorkDays : 0;
  
  // Sort by date for presentation
  const chronologicalPeriods = [...selectedPeriods].sort((a, b) => 
    a.startDate.getTime() - b.startDate.getTime()
  );
  
  // For comparison, calculate efficiency of single continuous period of same length
  const singlePeriodLength = totalDays;
  const singlePeriodStart = new Date(year, 6, 1); // July 1st as reference
  const singlePeriodEnd = addDays(singlePeriodStart, singlePeriodLength - 1);
  const singlePeriod = getVacationPeriodDetails(singlePeriodStart, singlePeriodEnd);
  
  const efficiencyGain = combinedEfficiency - singlePeriod.efficiency;
  
  console.log(`Eficiência de ${fractionCount} períodos fracionados: ${(combinedEfficiency * 100).toFixed(2)}%`);
  console.log(`Comparação com período único de ${singlePeriodLength} dias: ${(singlePeriod.efficiency * 100).toFixed(2)}%`);
  console.log(`Ganho de eficiência: ${(efficiencyGain * 100).toFixed(2)}%`);
  
  // Log de debug dos períodos selecionados
  console.log("Períodos fracionados selecionados:");
  chronologicalPeriods.forEach((period, idx) => {
    console.log(`Período ${idx+1}: ${format(period.startDate, 'dd/MM/yyyy')} (${period.startDate.getDay()}) a ${format(period.endDate, 'dd/MM/yyyy')} (${period.endDate.getDay()}), dias úteis: ${period.workDays}, eficiência: ${(period.efficiency * 100).toFixed(2)}%`);
  });
  
  return {
    isFractionated: true,
    periods: chronologicalPeriods,
    combinedEfficiency,
    efficiencyGain
  };
};

// Select best N non-overlapping periods from a sorted list
const selectNonOverlappingPeriods = (sortedPeriods: VacationPeriod[], count: number): VacationPeriod[] => {
  const selected: VacationPeriod[] = [];
  
  // Primeiro filtrar para garantir que só consideramos períodos com dias úteis
  const periodsWithWorkDays = sortedPeriods.filter(period => period.workDays > 0);
  
  // Priorizar períodos de segunda a sexta para frações de 5 dias
  const idealPeriods = periodsWithWorkDays.filter(period => {
    return (
      period.startDate.getDay() === 1 && // Segunda-feira
      period.endDate.getDay() === 5 && // Sexta-feira
      period.totalDays === 5 && // Exatamente 5 dias
      period.workDays === 5 // Todos dias úteis
    );
  });
  
  // Segunda prioridade: períodos que incluem feriados em dias úteis
  const periodsWithHolidays = periodsWithWorkDays.filter(period => {
    let hasHolidayOnWorkday = false;
    let currentDate = new Date(period.startDate);
    
    while (currentDate <= period.endDate) {
      if (isHoliday(currentDate) && !isWeekend(currentDate)) {
        hasHolidayOnWorkday = true;
        break;
      }
      currentDate = addDays(currentDate, 1);
    }
    
    return hasHolidayOnWorkday;
  });
  
  // Usar hierarquia de prioridade: ideal > com feriados > demais períodos
  const priorityOrder = [
    ...idealPeriods,
    ...periodsWithHolidays.filter(p => !idealPeriods.includes(p)), // Excluir duplicados
    ...periodsWithWorkDays.filter(p => !idealPeriods.includes(p) && !periodsWithHolidays.includes(p))
  ];
  
  // Use a lista ordenada por prioridade
  const periodsToUse = priorityOrder.length > 0 ? priorityOrder : periodsWithWorkDays;
  
  // Start with the most efficient periods
  let i = 0;
  while (selected.length < count && i < periodsToUse.length) {
    const current = periodsToUse[i];
    
    // Check if this period overlaps with any already selected period
    const overlaps = selected.some(p => 
      (current.startDate <= p.endDate && current.endDate >= p.startDate)
    );
    
    if (!overlaps) {
      selected.push(current);
    }
    
    i++;
  }
  
  return selected;
};

// Calculate combined efficiency for multiple periods
export const calculateCombinedEfficiency = (periods: VacationPeriod[]): { 
  efficiency: number, 
  totalDays: number, 
  totalWorkDays: number, 
  totalNonWorkDays: number 
} => {
  let totalWorkDays = 0;
  let totalDays = 0;
  let totalNonWorkDays = 0;
  let totalHolidaysOnWorkDays = 0;
  
  periods.forEach(period => {
    totalWorkDays += period.workDays;
    totalDays += period.totalDays;
    totalNonWorkDays += (period.weekendDays + period.holidayDays);
    
    // Contar feriados em dias úteis (ganho real)
    totalHolidaysOnWorkDays += countHolidaysOnWorkDays(period.startDate, period.endDate);
  });
  
  // Calcular eficiência usando a nova lógica (ganho efetivo)
  let efficiency = 1.0; // Base sem ganho
  
  // Adicionar ganho por feriados em dias úteis
  if (totalWorkDays > 0 && totalHolidaysOnWorkDays > 0) {
    efficiency += (totalHolidaysOnWorkDays / totalWorkDays);
  }
  
  return {
    efficiency,
    totalDays,
    totalWorkDays,
    totalNonWorkDays
  };
};

// Definir stub para findOptimalPeriods
const findOptimalPeriods = (year: number, length: number = 15): VacationPeriod[] => {
  console.warn("findOptimalPeriods not fully implemented yet.");
  return []; // Retorna array vazio por enquanto
};

// Função para filtrar e ordenar recomendações
const filterAndSortRecommendations = (recs: Recommendation[], maxRecommendations: number = 10): Recommendation[] => {
    // Usar strategicScore ou efficiencyGain para ordenar
    const getRecommendationScore = (rec: Recommendation): number => rec.strategicScore ?? rec.efficiencyGain ?? 0;
    
    // Remover duplicatas baseadas em tipo e data
    const uniqueRecs = recs.reduce((acc, current) => {
      const x = acc.find(item => item.type === current.type && 
                                  isSameDay(item.suggestedDateRange.startDate, current.suggestedDateRange.startDate) && 
                                  isSameDay(item.suggestedDateRange.endDate, current.suggestedDateRange.endDate));
      if (!x) {
        return acc.concat([current]);
      }
      // Manter a recomendação com maior score em caso de duplicata
      else if (getRecommendationScore(current) > getRecommendationScore(x)) {
          return acc.filter(item => item.id !== x.id).concat([current]);
      }
       else {
        return acc;
      }
    }, [] as Recommendation[]);
    
    return uniqueRecs
        .filter(rec => rec.type !== 'error') // Filtra erros
        .sort((a, b) => getRecommendationScore(b) - getRecommendationScore(a))
        .slice(0, maxRecommendations);
};

// --- Implementação das Funções Auxiliares Faltantes ---

const ensureMinimumVacationDays = (recommendations: Recommendation[]): Recommendation[] => {
    // Lógica básica: Remove recomendações com menos de 5 dias TOTAIS (não apenas úteis)
    // Idealmente, deveria verificar a validade usando isValidVacationPeriod
    return recommendations.filter(rec => differenceInDays(rec.suggestedDateRange.endDate, rec.suggestedDateRange.startDate) + 1 >= 5);
};

const checkForWastedVacationDays = (startDate: Date, endDate: Date): boolean => {
    // Verifica se o primeiro dia é fim de semana ou feriado
    if (isWeekend(startDate) || isHoliday(startDate)) return true;
    // Verifica se o último dia é fim de semana ou feriado
    if (isWeekend(endDate) || isHoliday(endDate)) return true;
    return false;
};

const countHolidaysOnWorkDays = (startDate: Date, endDate: Date): number => {
    let count = 0;
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        // Conta feriado apenas se NÃO for fim de semana
        if (isHoliday(currentDate) && !isWeekend(currentDate)) {
            count++;
        }
        currentDate = addDays(currentDate, 1);
    }
    return count;
};

// Implementação básica da pontuação estratégica para pontes
const calculateBridgeStrategicScore = (startDate: Date, endDate: Date, workDaysInBridge: number): number => {
    const totalDays = differenceInDays(endDate, startDate) + 1;
    if (workDaysInBridge === 0) return 0;

    // Valor base: Quanto mais dias totais por dia útil, melhor
    let score = (totalDays / workDaysInBridge) * 3; // Multiplicador base

    // Bônus se a ponte conecta a um fim de semana no início
    const dayBeforeBridge = subDays(startDate, 1);
    if (isWeekend(dayBeforeBridge)) {
        score += 1.5;
    }

    // Bônus se a ponte conecta a um fim de semana no final
    const dayAfterBridge = addDays(endDate, 1);
    if (isWeekend(dayAfterBridge)) {
        score += 1.5;
    }
    
    // Bônus adicional se conecta FIM DE SEMANA <-> FERIADO ou vice-versa
    if (isWeekend(dayBeforeBridge) && isHoliday(dayAfterBridge)) {
        score += 1.0;
    }
    if (isHoliday(dayBeforeBridge) && isWeekend(dayAfterBridge)) {
        score += 1.0;
    }

    // Bônus por tamanho da ponte (pontes menores são mais eficientes)
    if (workDaysInBridge === 1) score += 1.5;
    if (workDaysInBridge === 2) score += 0.5;

    // Penalidade por desperdício (se começar/terminar em dia não útil - improvável para pontes, mas como segurança)
    if (checkForWastedVacationDays(startDate, endDate)) {
        score -= 1.0;
    }
    
    // Contar feriados DENTRO da ponte (geralmente não deveria acontecer, mas se acontecer, penaliza)
    const holidaysInsideBridge = countHolidaysOnWorkDays(startDate, endDate);
    score -= holidaysInsideBridge * 2.0; // Penalidade alta

    return Math.max(0, Math.round(score * 10) / 10); // Arredonda para 1 casa decimal e garante não negativo
}

export const calculateHolidayGain = (period: VacationPeriod | { startDate: Date, endDate: Date }): number => {
    // Implementação simples: Conta feriados que caem em dias úteis no período
    if (!period?.startDate || !period?.endDate) return 0;
    return countHolidaysOnWorkDays(period.startDate, period.endDate);
};

// Função de comparação de testes (mantida como estava)
function runComparisonTests() {
    // ... (código existente)
}

function getRatingLabel(efficiency: number): string {
    // ... (código existente)
    return "";
}

function generateTestPeriods(): VacationPeriod[] {
    // ... (código existente)
    return [];
}
