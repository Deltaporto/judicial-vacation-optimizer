import { DateRange, VacationPeriod, Recommendation, FractionedVacationPeriods } from '@/types';
import { getVacationPeriodDetails } from './dateUtils';
import { addDays, subDays, format, isSameDay, differenceInDays, isWeekend as isWeekendDateFns } from 'date-fns';
import { isHoliday, isWeekend, getHolidaysInRange } from './holidayData';
import { v4 as uuidv4 } from 'uuid';
import { ptBR } from 'date-fns/locale';

/**
 * Verifica se dois intervalos de datas têm sobreposição
 * @param startA Data de início do primeiro intervalo
 * @param endA Data de fim do primeiro intervalo
 * @param startB Data de início do segundo intervalo
 * @param endB Data de fim do segundo intervalo
 * @returns true se houver sobreposição, false caso contrário
 */
const dateRangesOverlap = (
  startA: Date, 
  endA: Date, 
  startB: Date, 
  endB: Date
): boolean => {
  return startA <= endB && startB <= endA;
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
const findPotentialBridges = (year: number, maxBridgeSize: number = 3): { startDate: Date, endDate: Date, workDays: number, strategicScore: number }[] => {
  const bridges: { startDate: Date, endDate: Date, workDays: number, strategicScore: number }[] = [];
  const startDate = new Date(year, 0, 1); // January 1st
  const endDate = new Date(year, 11, 31); // December 31st
  
  // Collect all non-work days (holidays and weekends)
  const nonWorkDays: Date[] = [];
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    if (isHoliday(currentDate) || isWeekend(currentDate)) {
      nonWorkDays.push(new Date(currentDate));
    }
    currentDate = addDays(currentDate, 1);
  }
  
  // Sort the dates
  nonWorkDays.sort((a, b) => a.getTime() - b.getTime());
  
  // Find clusters of non-work days with small gaps
  for (let i = 0; i < nonWorkDays.length - 1; i++) {
    const current = nonWorkDays[i];
    
    // Look ahead for nearby clusters
    for (let j = i + 1; j < nonWorkDays.length; j++) {
      const next = nonWorkDays[j];
      const gapDays = differenceInDays(next, current) - 1;
      
      // If there's a small gap (potential bridge) and all days in between are workdays
      if (gapDays > 0 && gapDays <= maxBridgeSize) {
        // Verify that we're not just bridging between consecutive weekends with no holidays
        const isCurrentWeekendOnly = isWeekend(current) && !isHoliday(current);
        const isNextWeekendOnly = isWeekend(next) && !isHoliday(next);
        
        // Skip if we're just connecting consecutive weekends with no holidays involved
        if (isCurrentWeekendOnly && isNextWeekendOnly && gapDays === 5) {
          break;
        }
        
        const bridgeStart = addDays(current, 1);
        const bridgeEnd = subDays(next, 1);
        
        // Count actual work days in this bridge (excluding any holidays)
        let workDays = 0;
        let bridgeDate = new Date(bridgeStart);
        
        // Verificar se não estamos incluindo feriados na nossa ponte
        // (uma ponte deve conectar feriados/fins de semana, mas não incluí-los)
        let containsHoliday = false;
        
        while (bridgeDate <= bridgeEnd) {
          if (isHoliday(bridgeDate)) {
            containsHoliday = true;
            break;
          }
          if (!isWeekend(bridgeDate)) {
            workDays++;
          }
          bridgeDate = addDays(bridgeDate, 1);
        }
        
        // Se a ponte contém um feriado, não é uma ponte válida
        if (containsHoliday) {
          break;
        }
        
        // Verificar se o feriado conectado ocorre em um dia útil (não em fim de semana)
        // Isso maximiza o valor da ponte estratégica
        const isCurrentHolidayOnWorkday = isHoliday(current) && !isWeekend(current);
        const isNextHolidayOnWorkday = isHoliday(next) && !isWeekend(next);
        
        // Se nenhum dos dias conectados é um feriado em dia útil, reduzir a prioridade
        if (!isCurrentHolidayOnWorkday && !isNextHolidayOnWorkday && !isHoliday(current) && !isHoliday(next)) {
          // Se estamos apenas conectando fins de semana regulares, não é tão estratégico
          // Permitimos mas com pontuação menor
        }
        
        // Verificar o total de dias do período formal de férias (dias entre bridgeStart e bridgeEnd)
        const formalVacationDays = differenceInDays(bridgeEnd, bridgeStart) + 1;
        
        // Apenas adicionar pontes com dias úteis e onde o período formal de férias tenha pelo menos 5 dias
        if (workDays > 0 && formalVacationDays >= 5) {
          bridges.push({
            startDate: bridgeStart,
            endDate: bridgeEnd,
            workDays,
            strategicScore: 0 // Inicializar com 0, será calculado depois
          });
        }
        
        // Move to the next cluster since we've processed this bridge
        break;
      }
    }
  }
  
  // Calcular pontuação estratégica para cada ponte
  bridges.forEach(bridge => {
    // Calcular eficiência básica (dias não úteis / total dias)
    const totalDays = differenceInDays(bridge.endDate, bridge.startDate) + 1;
    
    // Contar quantos dias úteis seriam trabalhados sem férias
    let workDaysInPeriod = 0;
    let weekendDaysInPeriod = 0;
    let holidaysOnWorkdays = 0;
    let currentDate = new Date(bridge.startDate);
    
    while (currentDate <= bridge.endDate) {
      if (isWeekend(currentDate)) {
        weekendDaysInPeriod++;
      } else if (isHoliday(currentDate)) {
        if (!isWeekend(currentDate)) {
          holidaysOnWorkdays++;
        }
      } else {
        workDaysInPeriod++;
      }
      currentDate = addDays(currentDate, 1);
    }
    
    const nonWorkDays = weekendDaysInPeriod + holidaysOnWorkdays;
    const efficiency = nonWorkDays / totalDays;
    
    // Iniciar com a eficiência como base da pontuação
    let score = efficiency * 10; // Escala base de 0-10
    
    // Bônus para pontes que começam em dias estratégicos - MAIS FLEXÍVEL
    const startDayOfWeek = bridge.startDate.getDay();
    
    // 1. Verificar se tem feriado nos períodos conectados
    let connectsHoliday = false;
    let surroundingHolidays = [];
    
    // Verificar 3 dias antes da ponte
    for (let d = -3; d <= -1; d++) {
      const checkDate = addDays(bridge.startDate, d);
      const holiday = isHoliday(checkDate);
      if (holiday && !isWeekend(checkDate)) {
        connectsHoliday = true;
        surroundingHolidays.push({
          date: checkDate,
          name: holiday.name,
          isWorkDay: !isWeekend(checkDate),
          proximity: Math.abs(d)
        });
      }
    }
    
    // Verificar 3 dias depois da ponte
    for (let d = 1; d <= 3; d++) {
      const checkDate = addDays(bridge.endDate, d);
      const holiday = isHoliday(checkDate);
      if (holiday && !isWeekend(checkDate)) {
        connectsHoliday = true;
        surroundingHolidays.push({
          date: checkDate,
          name: holiday.name,
          isWorkDay: !isWeekend(checkDate),
          proximity: Math.abs(d)
        });
      }
    }
    
    // 2. Estratégia baseada nos feriados próximos
    if (connectsHoliday) {
      // Se conecta com feriado(s), a estratégia é baseada nisso
      // Ordenar feriados por proximidade
      surroundingHolidays.sort((a, b) => a.proximity - b.proximity);
      
      // Obter o feriado mais próximo
      const closestHoliday = surroundingHolidays[0];
      
      // Adicionar bônus com base no dia da semana do feriado
      const holidayDate = closestHoliday.date;
      const holidayDayOfWeek = holidayDate.getDay();
      
      // Se o feriado é na segunda ou sexta, ponte estratégica
      if (holidayDayOfWeek === 1 || holidayDayOfWeek === 5) {
        score += 4.0; // Grande bônus
      } 
      // Se o feriado é na terça ou quinta, ponte também estratégica
      else if (holidayDayOfWeek === 2 || holidayDayOfWeek === 4) {
        score += 3.0; // Bônus significativo
      }
      // Se o feriado é na quarta, ponte menos estratégica
      else if (holidayDayOfWeek === 3) {
        score += 1.5; // Bônus moderado
      }
      
      // Bônus adicional pela proximidade
      score += (3 - closestHoliday.proximity) * 0.5; // 0.5 a 1.5 de bônus
      
      // Bônus extra se o feriado for em dia útil
      if (closestHoliday.isWorkDay) {
        score += 2.0;
      }
    } else {
      // Se não há feriados próximos, manter estratégia padrão com valores reduzidos
      // Pontes estratégicas devem preferencialmente conectar-se a feriados
      if (startDayOfWeek === 1) { // Segunda-feira
        score += 2.0; // Reduzido de 4.0 se não conectar a feriado
      } else if (startDayOfWeek === 2) { // Terça-feira
        score += 1.0; // Reduzido de 1.5 se não conectar a feriado
      } else if (startDayOfWeek === 4) { // Quinta-feira
        score -= 0.5; // Mantido
      } else if (startDayOfWeek === 5) { // Sexta-feira
        score -= 1.0; // Reduzido de -2.5 se não conectar a feriado
      } else if (startDayOfWeek === 0 || startDayOfWeek === 6) { // Fim de semana
        score -= 1.5; // Reduzido de -3.0 se não conectar a feriado
      }
      
      // Bônus para pontes que terminam em dias estratégicos
      const endDayOfWeek = bridge.endDate.getDay();
      if (endDayOfWeek === 5) { // Sexta-feira
        score += 2.0; // Reduzido de 4.0 se não conectar a feriado
      } else if (endDayOfWeek === 4) { // Quinta-feira
        score += 1.0; // Reduzido de 1.5 se não conectar a feriado
      } else if (endDayOfWeek === 1) { // Segunda-feira
        score -= 0.5; // Mantido
      } else if (endDayOfWeek === 0 || endDayOfWeek === 6) { // Fim de semana
        score -= 1.0; // Reduzido de -2.5 se não conectar a feriado
      }
      
      // Bônus para pontes "perfeitas" (segunda a sexta)
      if (startDayOfWeek === 1 && endDayOfWeek === 5) {
        score += 2.5; // Reduzido de 5.0 se não conectar a feriado
      }
    }
    
    // Verificar proximidade com datas importantes do calendário (recesso, etc.)
    const checkImportantHolidays = (date: Date): number => {
      let bonus = 0;
      // Lista de meses de feriados importantes (0-11)
      const importantHolidayMonths = [11, 0, 1, 3, 11]; // Dez, Jan, Fev (Carnaval), Abril (Páscoa), Dez (Natal)
      
      // Verificar 3 dias antes e depois
      for (let i = -3; i <= 3; i++) {
        const checkDate = addDays(date, i);
        if (isHoliday(checkDate)) {
          // Verificar se o feriado cai em dia útil (ganho real)
          const isWorkDay = !isWeekend(checkDate);
          const month = checkDate.getMonth();
          
          // Bônus maior para feriados em dias úteis
          const workDayMultiplier = isWorkDay ? 2.0 : 1.0;
          
          // Dar bônus maior para feriados importantes
          if (importantHolidayMonths.includes(month)) {
            bonus += 1.5 * workDayMultiplier;
          } else {
            bonus += 0.75 * workDayMultiplier;
          }
        }
      }
      return bonus;
    };
    
    // Aplicar bônus por proximidade a feriados importantes
    score += checkImportantHolidays(bridge.startDate);
    score += checkImportantHolidays(bridge.endDate);
    
    // Calcular eficiência real (dias úteis economizados / dias de férias)
    if (bridge.workDays > 0) {
      const realEfficiency = workDaysInPeriod / bridge.workDays;
      score += realEfficiency * 3.0; // Adicionar à pontuação com peso significativo
      
      // Penalizar períodos que desperdiçam dias de férias em fins de semana
      if (weekendDaysInPeriod > 0) {
        score -= weekendDaysInPeriod * 0.5; // Reduzido de 0.75 para ser menos punitivo
      }
    }
    
    // Calcular ROI (Return on Investment) - eficiência por dia útil
    const roi = efficiency / bridge.workDays;
    score += roi * 7; // Adicionar ROI à pontuação (com peso aumentado)
    
    // Ajustar pontuação com base na duração (preferência por pontes compactas)
    if (bridge.workDays === 1) {
      score += 3.0; // Grande bônus para "super pontes" de apenas 1 dia útil
    } else if (bridge.workDays === 2) {
      score += 1.5; // Bônus para pontes de 2 dias úteis
    } else if (bridge.workDays === 3) {
      score += 0.5; // Pequeno bônus para pontes de 3 dias úteis
    }
    
    // Normalizar pontuação final
    bridge.strategicScore = parseFloat(score.toFixed(2));
  });
  
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
 * Calcula a eficiência do período de férias considerando apenas o descanso adicional real,
 * sem contar dias que já seriam de folga naturalmente.
 * @param period Período de férias a ser avaliado
 * @returns Valor de eficiência ajustado
 */
export const calculateAdjustedEfficiency = (period: VacationPeriod): number => {
  // Evitamos usar a fórmula original que considera finais de semana e feriados como ganho
  // Em vez disso, calculamos apenas o ganho real de dias de descanso
  
  if (period.workDays === 0) return 1.0; // Eficiência neutra se não há dias úteis consumidos
  
  // Valor base de eficiência é 1.0 (sem ganho adicional)
  let efficiency = 1.0;
  
  // Bônus apenas para feriados em dias úteis (ganho real)
  // Cada feriado em dia útil é um dia de descanso extra que não seria obtido normalmente
  const holidaysOnWorkDays = period.holidayDays;
  if (holidaysOnWorkDays > 0) {
    // Adicionar o ganho proporcional ao número de dias úteis consumidos
    efficiency += (holidaysOnWorkDays / period.workDays);
  }
  
  // Bônus para posicionamento estratégico que realmente amplia o descanso
  const startDayOfWeek = period.startDate.getDay();
  const endDayOfWeek = period.endDate.getDay();
  
  // Bônus para períodos que começam na segunda-feira (não desperdiça fim de semana antes)
  if (startDayOfWeek === 1) { // Segunda-feira
    efficiency += 0.05;
  }
  
  // Bônus para períodos que terminam na sexta-feira (não desperdiça fim de semana depois)
  if (endDayOfWeek === 5) { // Sexta-feira
    efficiency += 0.05;
  }
  
  // Fator de não desperdício - penaliza períodos que desperdiçam dias de férias formais
  // em dias que já seriam de folga naturalmente
  let wastageCount = 0;
  let currentDate = new Date(period.startDate);
  
  while (currentDate <= period.endDate) {
    // Contar dias não úteis (finais de semana e feriados) dentro do período formal
    if (isWeekend(currentDate) || isHoliday(currentDate)) {
      wastageCount++;
    }
    currentDate = addDays(currentDate, 1);
  }
  
  // Aplicar penalidade por desperdício (cada dia não útil reduz a eficiência)
  if (wastageCount > 0) {
    // A penalidade é proporcional ao número de dias úteis
    const wastageRatio = wastageCount / period.totalDays;
    efficiency -= (wastageRatio * 0.1); // Redução máxima de 10% por desperdício total
  }
  
  return Math.max(1.0, efficiency); // Garantir que a eficiência não fique abaixo de 1.0
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

// Função auxiliar para calcular pontuação estratégica de pontes
const calculateBridgeStrategicScore = (
  startDate: Date,
  endDate: Date,
  workDays: number,
  holidays: Date[] = []
): number => {
  // Calcular eficiência básica
  const totalDays = differenceInDays(endDate, startDate) + 1;
  const nonWorkDays = totalDays - workDays;
  const efficiency = nonWorkDays / totalDays;
  
  // Iniciar com a eficiência como base da pontuação
  let score = efficiency * 10; // Escala base de 0-10
  
  // Bônus para pontes que começam em dias estratégicos
  const startDayOfWeek = startDate.getDay();
  if (startDayOfWeek === 1) { // Segunda-feira
    score += 2.5; // Bônus significativo para iniciar na segunda
  } else if (startDayOfWeek === 2) { // Terça-feira
    score += 1.0; // Bônus menor para terça
  } else if (startDayOfWeek === 4) { // Quinta-feira
    score -= 0.5; // Pequena penalidade para quinta
  } else if (startDayOfWeek === 5) { // Sexta-feira
    score -= 1.5; // Penalidade maior para sexta
  } else if (startDayOfWeek === 0 || startDayOfWeek === 6) { // Fim de semana
    score -= 2.0; // Penalidade grande para começar no fim de semana
  }
  
  // Bônus para pontes que terminam em dias estratégicos
  const endDayOfWeek = endDate.getDay();
  if (endDayOfWeek === 5) { // Sexta-feira
    score += 2.5; // Bônus significativo para terminar na sexta
  } else if (endDayOfWeek === 4) { // Quinta-feira
    score += 1.0; // Bônus menor para quinta
  } else if (endDayOfWeek === 1) { // Segunda-feira
    score -= 0.5; // Pequena penalidade para segunda
  } else if (endDayOfWeek === 0 || endDayOfWeek === 6) { // Fim de semana
    score -= 1.5; // Penalidade para terminar no fim de semana
  }
  
  // Bônus para pontes "perfeitas" (segunda a sexta)
  if (startDayOfWeek === 1 && endDayOfWeek === 5) {
    score += 3.0; // Bônus substancial
  }
  
  // Verificar proximidade com datas importantes do calendário
  const isNearImportantDate = (date: Date): number => {
    let importance = 0;
    
    // Verificar proximidade com recesso judicial
    const year = date.getFullYear();
    const judicialRecessStart = new Date(year, 11, 20); // 20 de dezembro
    const judicialRecessEnd = new Date(year + 1, 0, 6);  // 6 de janeiro
    
    // Também considerar recessos do ano anterior para janeiro
    const prevYearRecessStart = new Date(year - 1, 11, 20);
    const prevYearRecessEnd = new Date(year, 0, 6);
    
    // Verificar proximidade com o recesso judicial (atual ou anterior)
    const daysToRecent = Math.min(
      Math.abs(differenceInDays(date, judicialRecessStart)),
      Math.abs(differenceInDays(date, judicialRecessEnd)),
      Math.abs(differenceInDays(date, prevYearRecessStart)),
      Math.abs(differenceInDays(date, prevYearRecessEnd))
    );
    
    // Bônus por proximidade ao recesso judicial
    if (daysToRecent <= 7) {
      importance += 2.0; // Grande bônus para próximo do recesso
    } else if (daysToRecent <= 14) {
      importance += 1.0; // Bônus moderado
    }
    
    // Verificar se está próximo do Natal ou Ano Novo
    const christmas = new Date(year, 11, 25);
    const newYear = new Date(year, 0, 1);
    const prevChristmas = new Date(year - 1, 11, 25);
    
    const daysToHoliday = Math.min(
      Math.abs(differenceInDays(date, christmas)),
      Math.abs(differenceInDays(date, newYear)),
      Math.abs(differenceInDays(date, prevChristmas))
    );
    
    // Bônus por proximidade a feriados importantes
    if (daysToHoliday <= 5) {
      importance += 1.5;
    } else if (daysToHoliday <= 10) {
      importance += 0.75;
    }
    
    // Verificar proximidade com carnaval (fevereiro)
    const isFeb = date.getMonth() === 1;
    if (isFeb) {
      importance += 1.0; // Bônus para pontes em fevereiro (potencial carnaval)
    }
    
    // Verificar proximidade com feriados móveis importantes (páscoa, corpus christi)
    // Como não temos acesso direto à lista de feriados, usamos a lista passada
    const isNearProvidedHoliday = holidays.some(h => 
      Math.abs(differenceInDays(date, h)) <= 3
    );
    
    if (isNearProvidedHoliday) {
      importance += 1.0;
    }
    
    return importance;
  };
  
  // Aplicar bônus por proximidade a datas importantes
  score += isNearImportantDate(startDate);
  score += isNearImportantDate(endDate);
  
  // Calcular ROI (Return on Investment) - eficiência por dia útil
  const roi = efficiency / workDays;
  score += roi * 7; // Adicionar ROI à pontuação (com peso aumentado)
  
  // Ajustar pontuação com base na duração (preferência por pontes compactas)
  if (workDays === 1) {
    score += 3.0; // Grande bônus para "super pontes" de apenas 1 dia útil
  } else if (workDays === 2) {
    score += 1.5; // Bônus para pontes de 2 dias úteis
  } else if (workDays === 3) {
    score += 0.5; // Pequeno bônus para pontes de 3 dias úteis
  }
  
  // Normalizar pontuação final
  return parseFloat(score.toFixed(2));
};

// Generate recommendations to optimize a vacation period
export const generateRecommendations = (vacationPeriod: VacationPeriod): Recommendation[] => {
  if (!vacationPeriod.isValid) return [];
  
  // Handle invalid date range (startDate after endDate)
  if (vacationPeriod.startDate > vacationPeriod.endDate) {
    console.error('Invalid vacation period: start date is after end date');
    return [{
      id: uuidv4(),
      type: 'error',
      title: 'Período inválido',
      description: `As datas selecionadas parecem estar invertidas. A data de início (${format(vacationPeriod.startDate, 'dd/MM/yyyy')}) está após a data de término (${format(vacationPeriod.endDate, 'dd/MM/yyyy')}).`,
      suggestedDateRange: {
        startDate: vacationPeriod.endDate, // Suggest flipping the dates as a fix
        endDate: vacationPeriod.startDate
      },
      efficiencyGain: 0,
      daysChanged: 0
    }];
  }
  
  const recommendations: Recommendation[] = [];
  const { before, after, workDaysBefore, workDaysAfter, practicalBefore, practicalAfter } = findNearbyOpportunities(vacationPeriod);
  
  // Define the judicial recess period
  const judicialRecessStart = new Date(vacationPeriod.startDate.getFullYear(), 11, 20); // December 20
  const judicialRecessEnd = new Date(vacationPeriod.startDate.getFullYear() + 1, 0, 6); // January 6

  // Helper function to check if a date range overlaps with the judicial recess
  const overlapsWithJudicialRecess = (startDate: Date, endDate: Date): boolean => {
    return (
      (startDate <= judicialRecessEnd && endDate >= judicialRecessStart)
    );
  };

  // Recommendation NEW: Optimal vacation fractionation
  const year = vacationPeriod.startDate.getFullYear();
  const optimalFractions = findOptimalFractionedPeriods(year, 6, 5);
  
  if (optimalFractions && optimalFractions.efficiencyGain > 0.1) { // Only recommend if at least 10% better
    // Verificar se todos os períodos contêm pelo menos um dia útil
    const allPeriodsValid = optimalFractions.periods.every(period => period.workDays > 0);
    
    if (allPeriodsValid) {
      // Obter nome dos dias da semana para facilitar compreensão
      const getDayOfWeekName = (date: Date): string => {
        const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        return days[date.getDay()];
      };
      
      // Create a description of the fractionated periods
      let periodsDescription = optimalFractions.periods.map((p, i) => 
        `Período ${i+1}: ${format(p.startDate, 'dd/MM/yyyy')} (${getDayOfWeekName(p.startDate)}) a ${format(p.endDate, 'dd/MM/yyyy')} (${getDayOfWeekName(p.endDate)}) (${p.workDays} dias úteis, ${p.weekendDays + p.holidayDays} não úteis)`
      ).join('; ');
      
      // Build recommendation
      recommendations.push({
        id: uuidv4(),
        type: 'optimal_fraction',
        title: 'Fracionamento Ideal de Férias',
        description: `Divida suas férias em 6 períodos de 5 dias estratégicos para maximizar a eficiência em ${(optimalFractions.efficiencyGain * 100).toFixed(0)}%. ${periodsDescription}`,
        suggestedDateRange: {
          startDate: optimalFractions.periods[0].startDate,
          endDate: optimalFractions.periods[0].endDate
        },
        efficiencyGain: optimalFractions.efficiencyGain,
        daysChanged: vacationPeriod.totalDays,
        fractionedPeriods: optimalFractions.periods
      });
    }
  }

  // Recommendation 1: Extend before - only if there are actual work days to include
  if (before.length > 0 && workDaysBefore > 0 && practicalBefore) {
    const newStartDate = before[0];
    const newVacationPeriod = getVacationPeriodDetails(newStartDate, vacationPeriod.endDate);
    const workDayChange = newVacationPeriod.workDays - vacationPeriod.workDays;
    
    // Make sure we're adding actual work days (not just weekends)
    if (workDayChange > 0 && workDayChange <= 3) { // Only recommend if it costs at most 3 work days
      // Additional practicality check - don't recommend starting on weekend
      const startDayOfWeek = newStartDate.getDay();
      const isPracticalStartDay = !(startDayOfWeek === 0 || startDayOfWeek === 6);
      
      // Count non-work days being captured
      const nonWorkDaysAdded = before.filter(date => isHoliday(date) || isWeekend(date)).length;
      
      // If currently starting on Monday, don't extend unless it's to capture a significant holiday period
      const originalStartDay = vacationPeriod.startDate.getDay();
      const isCurrentlyStartingOnMonday = originalStartDay === 1;
      
      // Only proceed if practical or has exceptional value (lots of holidays)
      const hasExceptionalValue = nonWorkDaysAdded >= 2 && workDayChange <= 1;
      
      if ((isPracticalStartDay || hasExceptionalValue) && !(isCurrentlyStartingOnMonday && !hasExceptionalValue)) {
        // Get day names for better understanding
        const getDayName = (date: Date): string => {
          const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
          return days[date.getDay()];
        };
        
        recommendations.push({
          id: uuidv4(),
          type: 'extend',
          title: 'Estender no início',
          description: `Antecipe o início das férias para ${format(newStartDate, 'dd/MM/yyyy')} (${getDayName(newStartDate)}) aproveitando ${nonWorkDaysAdded} dia(s) não útil(s) adjacente(s)`,
          suggestedDateRange: {
            startDate: newStartDate,
            endDate: vacationPeriod.endDate
          },
          efficiencyGain: newVacationPeriod.efficiency - vacationPeriod.efficiency,
          daysChanged: differenceInDays(vacationPeriod.startDate, newStartDate)
        });
      }
    }
  }
  
  // Recommendation 2: Extend after - only if there are actual work days to include
  if (after.length > 0 && workDaysAfter > 0 && practicalAfter) {
    const newEndDate = after[after.length - 1];
    const newVacationPeriod = getVacationPeriodDetails(vacationPeriod.startDate, newEndDate);
    const workDayChange = newVacationPeriod.workDays - vacationPeriod.workDays;
    
    // Make sure we're adding actual work days (not just weekends)
    if (workDayChange > 0 && workDayChange <= 3) { // Only recommend if it costs at most 3 work days
      // Additional practicality check - don't recommend ending on weekend or Monday
      const endDayOfWeek = newEndDate.getDay();
      const isPracticalEndDay = !(endDayOfWeek === 0 || endDayOfWeek === 6 || endDayOfWeek === 1);
      
      // Count non-work days being captured
      const nonWorkDaysAdded = after.filter(date => isHoliday(date) || isWeekend(date)).length;
      
      // If currently ending on Friday, don't extend unless it's to capture a significant holiday period
      const originalEndDay = vacationPeriod.endDate.getDay();
      const isCurrentlyEndingOnFriday = originalEndDay === 5;
      
      // Only proceed if practical or has exceptional value (lots of holidays)
      const hasExceptionalValue = nonWorkDaysAdded >= 2 && workDayChange <= 1;
      
      if ((isPracticalEndDay || hasExceptionalValue) && !(isCurrentlyEndingOnFriday && !hasExceptionalValue)) {
        // Get day names for better understanding
        const getDayName = (date: Date): string => {
          const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
          return days[date.getDay()];
        };
        
        recommendations.push({
          id: uuidv4(),
          type: 'extend',
          title: 'Estender no final',
          description: `Prolongue o final das férias até ${format(newEndDate, 'dd/MM/yyyy')} (${getDayName(newEndDate)}) aproveitando ${nonWorkDaysAdded} dia(s) não útil(s) adjacente(s)`,
          suggestedDateRange: {
            startDate: vacationPeriod.startDate,
            endDate: newEndDate
          },
          efficiencyGain: newVacationPeriod.efficiency - vacationPeriod.efficiency,
          daysChanged: differenceInDays(newEndDate, vacationPeriod.endDate)
        });
      }
    }
  }
  
  // Recommendation 3: Improved shift algorithm - find optimal shift window
  const optimalShift = findOptimalShift(vacationPeriod);
  if (optimalShift) {
    // Count weekends and holidays in the new period
    const newPeriod = getVacationPeriodDetails(optimalShift.startDate, optimalShift.endDate);
    const nonWorkDays = newPeriod.weekendDays + newPeriod.holidayDays;
    
    // Get day names for better understanding
    const getDayName = (date: Date): string => {
      const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
      return days[date.getDay()];
    };
    
    recommendations.push({
      id: uuidv4(),
      type: 'shift',
      title: optimalShift.startDate > vacationPeriod.startDate ? 'Adiar período' : 'Antecipar período',
      description: `${optimalShift.startDate > vacationPeriod.startDate ? 'Adie' : 'Antecipe'} todo o período em ${optimalShift.daysShifted} dia(s) (${format(optimalShift.startDate, 'dd/MM')} ${getDayName(optimalShift.startDate)} - ${format(optimalShift.endDate, 'dd/MM')} ${getDayName(optimalShift.endDate)}) aproveitando ${nonWorkDays} dias não úteis`,
      suggestedDateRange: {
        startDate: optimalShift.startDate,
        endDate: optimalShift.endDate
      },
      efficiencyGain: optimalShift.efficiencyGain,
      daysChanged: optimalShift.daysShifted
    });
  }
  
  // Recommendation 4: Smart Split - find optimal split point
  const optimalSplit = findOptimalSplitPoint(vacationPeriod);
  // Always recommend split if it has good distribution, even without efficiency gain
  // The flexibility of having two periods is itself a benefit
  if (optimalSplit && (optimalSplit.bestDistribution > 0.5 || optimalSplit.combinedEfficiency > vacationPeriod.efficiency)) {
    const firstPeriod = optimalSplit.firstPeriod;
    const secondPeriod = optimalSplit.secondPeriod;
    
    // Verificar explicitamente que ambos os períodos contêm dias úteis
    if (firstPeriod.workDays > 0 && secondPeriod.workDays > 0) {
      // Calculate total non-work days in both periods
      const totalNonWorkDaysFirst = firstPeriod.weekendDays + firstPeriod.holidayDays;
      const totalNonWorkDaysSecond = secondPeriod.weekendDays + secondPeriod.holidayDays;
      
      // Obter nome dos dias da semana para facilitar compreensão
      const getDayOfWeekName = (date: Date): string => {
        const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        return days[date.getDay()];
      };
      
      recommendations.push({
        id: uuidv4(),
        type: 'split',
        title: 'Fracionar período inteligente',
        description: `Divida suas férias em dois períodos para maior flexibilidade: ${format(firstPeriod.startDate, 'dd/MM')} (${getDayOfWeekName(firstPeriod.startDate)}) a ${format(firstPeriod.endDate, 'dd/MM')} (${getDayOfWeekName(firstPeriod.endDate)}) (${totalNonWorkDaysFirst} dias não úteis) e ${format(secondPeriod.startDate, 'dd/MM')} (${getDayOfWeekName(secondPeriod.startDate)}) a ${format(secondPeriod.endDate, 'dd/MM')} (${getDayOfWeekName(secondPeriod.endDate)}) (${totalNonWorkDaysSecond} dias não úteis)`,
        suggestedDateRange: {
          startDate: vacationPeriod.startDate,
          endDate: vacationPeriod.endDate
        },
        efficiencyGain: Math.max(0.01, optimalSplit.combinedEfficiency - vacationPeriod.efficiency), // Ensure at least 1% gain to show benefit
        daysChanged: 0
      });
    }
  }
  
  // Recommendation 5: Bridges between holidays
  // Only suggest if the current period isn't already a bridge
  if (vacationPeriod.totalDays <= 7) {
    const currentYear = vacationPeriod.startDate.getFullYear();
    const bridges = findPotentialBridges(currentYear, 3);
    
    // Coletar feriados no ano para análise de nomes
    const yearHolidays = getHolidaysInRange(
      new Date(currentYear, 0, 1),
      new Date(currentYear, 11, 31)
    );
    
    // Função auxiliar para obter nomes de feriados próximos
    const getNearbyHolidayNames = (startDate: Date, endDate: Date): string[] => {
      // Expandir o intervalo para verificar feriados próximos (3 dias antes e depois)
      const checkStart = subDays(startDate, 3);
      const checkEnd = addDays(endDate, 3);
      
      return yearHolidays
        .filter(h => h.date >= checkStart && h.date <= checkEnd)
        .map(h => h.name);
    };
    
    // Função para obter nome dos dias da semana
    const getDayOfWeekName = (date: Date): string => {
      const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
      return days[date.getDay()];
    };
    
    // Filter bridges that don't overlap with current period
    const nonOverlappingBridges = bridges.filter(bridge => {
      return bridge.endDate < vacationPeriod.startDate || bridge.startDate > vacationPeriod.endDate;
    });
    
    // Calculate ROI (Return on Investment) for each bridge
    const bridgesWithROI = nonOverlappingBridges
      .map(bridge => {
        const bridgePeriod = getVacationPeriodDetails(bridge.startDate, bridge.endDate);
        const totalDays = bridgePeriod.totalDays;
        const nonWorkDays = bridgePeriod.weekendDays + bridgePeriod.holidayDays;
        const efficiency = nonWorkDays / totalDays;
        const roi = efficiency / bridge.workDays; // Eficiência por dia útil investido
        
        // Calcular pontuação estratégica usando função auxiliar
        const holidayDates = yearHolidays.map(h => h.date);
        const strategicScore = calculateBridgeStrategicScore(
          bridge.startDate, 
          bridge.endDate, 
          bridge.workDays,
          holidayDates
        );
        
        // Identificar nomes de feriados próximos
        const nearbyHolidayNames = getNearbyHolidayNames(bridge.startDate, bridge.endDate);
        
        return {
          ...bridge,
          efficiency,
          roi,
          strategicScore,
          totalDays: bridgePeriod.totalDays,
          nonWorkDays,
          nearbyHolidayNames
        };
      })
      // Filtrar pontes com pelo menos um dia útil de trabalho e garantir mínimo de 5 dias
      .filter(bridge => bridge.workDays > 0 && bridge.totalDays >= 5);
    
    // Identificar "super pontes" (alta eficiência com poucos dias úteis)
    const superBridges = bridgesWithROI
      .filter(bridge => {
        return (
          // Critérios para super pontes:
          (bridge.workDays === 1 && bridge.efficiency > 0.6) || // 1 dia útil com alta eficiência
          (bridge.workDays === 2 && bridge.efficiency > 0.7) || // 2 dias úteis com eficiência muito alta
          (bridge.roi > 0.5) // ROI excepcional
        );
      })
      .sort((a, b) => b.strategicScore - a.strategicScore)
      .slice(0, 2);
    
    // Ordenar pontes regulares por pontuação estratégica e ROI
    const regularBridges = bridgesWithROI
      .filter(bridge => !superBridges.includes(bridge)) // Excluir pontes que já estão em superBridges
      .sort((a, b) => {
        // Usar pontuação estratégica como critério principal
        const scoreDiff = b.strategicScore - a.strategicScore;
        
        // Se as pontuações forem próximas, considerar ROI como desempate
        if (Math.abs(scoreDiff) < 1.0) {
          return b.roi - a.roi;
        }
        
        return scoreDiff;
      })
      .slice(0, 3); // Máximo 3 pontes regulares
    
    // Adicionar super pontes como recomendações especiais
    superBridges.forEach(bridge => {
      // Formatar nomes de feriados para descrição
      const holidayInfo = bridge.nearbyHolidayNames.length > 0
        ? ` conectando ${bridge.nearbyHolidayNames.join(' e ')}`
        : '';
      
      // Formatação da data com dia da semana
      const startDateFormatted = `${format(bridge.startDate, 'dd/MM')} (${getDayOfWeekName(bridge.startDate)})`;
      const endDateFormatted = `${format(bridge.endDate, 'dd/MM')} (${getDayOfWeekName(bridge.endDate)})`;
      
      // Calcular eficiência em percentual
      const efficiencyPercent = (bridge.efficiency * 100).toFixed(0);
      
      recommendations.push({
        id: uuidv4(),
        type: 'super_bridge',
        title: 'Ponte Excepcional',
        description: `OPORTUNIDADE ÚNICA: Ponte altamente eficiente${holidayInfo} usando apenas ${bridge.workDays} dia(s) útil(s) para obter ${bridge.nonWorkDays} dia(s) não úteis (${efficiencyPercent}% eficiência). Período: ${startDateFormatted} a ${endDateFormatted}.`,
        suggestedDateRange: {
          startDate: bridge.startDate,
          endDate: bridge.endDate
        },
        efficiencyGain: bridge.efficiency - vacationPeriod.efficiency,
        daysChanged: bridge.totalDays,
        strategicScore: bridge.strategicScore
      });
    });
    
    // Adicionar recomendações para pontes regulares
    regularBridges.forEach(bridge => {
      // Formatar nomes de feriados para descrição
      const holidayInfo = bridge.nearbyHolidayNames.length > 0
        ? ` aproveitando ${bridge.nearbyHolidayNames.join(' e ')}`
        : '';
      
      // Formatação da data com dia da semana
      const startDateFormatted = `${format(bridge.startDate, 'dd/MM')} (${getDayOfWeekName(bridge.startDate)})`;
      const endDateFormatted = `${format(bridge.endDate, 'dd/MM')} (${getDayOfWeekName(bridge.endDate)})`;
      
      // Calcular eficiência em percentual
      const efficiencyPercent = (bridge.efficiency * 100).toFixed(0);
      
      recommendations.push({
        id: uuidv4(),
        type: 'bridge',
        title: 'Aproveitar ponte entre feriados',
        description: `Considere o período de ${startDateFormatted} a ${endDateFormatted}${holidayInfo} - eficiência de ${efficiencyPercent}% (${bridge.workDays} dia(s) útil(s) para ${bridge.nonWorkDays} dia(s) não úteis).`,
        suggestedDateRange: {
          startDate: bridge.startDate,
          endDate: bridge.endDate
        },
        efficiencyGain: bridge.efficiency - vacationPeriod.efficiency,
        daysChanged: bridge.totalDays,
        strategicScore: bridge.strategicScore
      });
    });
  }
  
  // Recommendation 6: Analyze predictive efficiency for long periods
  if (vacationPeriod.totalDays >= 14) {
    const year = vacationPeriod.startDate.getFullYear();
    const currentMonth = vacationPeriod.startDate.getMonth();
    
    // Debug
    console.log(`Analisando períodos otimizados para férias de ${vacationPeriod.totalDays} dias no mês ${currentMonth+1}`);
    
    // Find the most efficient periods of similar length
    const optimalPeriods = findOptimalPeriods(year, vacationPeriod.totalDays, 5)
      // Filter periods that are in a different part of the year (relaxing to +/- 4 months)
      .filter(period => {
        const periodMonth = period.startDate.getMonth();
        const monthDiff = Math.abs(periodMonth - currentMonth);
        const isNearby = monthDiff <= 4 || monthDiff >= 8; // Allow periods in somewhat similar season
        
        // Debug
        console.log(`Período de ${format(period.startDate, 'dd/MM')} tem diferença de ${monthDiff} meses, é próximo? ${isNearby}`);
        
        return isNearby;
      })
      // Only recommend if better (relaxing to just 5% better)
      .filter(period => {
        const improvement = period.efficiency - vacationPeriod.efficiency;
        const isSignificant = improvement > 0.05;
        
        // Debug
        console.log(`Período de ${format(period.startDate, 'dd/MM')} tem melhoria de ${(improvement * 100).toFixed(2)}%, é significativo? ${isSignificant}`);
        
        return isSignificant;
      })
      // Garantir que o período tem dias úteis (não está apenas pegando fins de semana)
      .filter(period => period.workDays > 0);
    
    // Debug
    console.log(`Encontrados ${optimalPeriods.length} períodos otimizados`);
    
    optimalPeriods.forEach(period => {
      recommendations.push({
        id: uuidv4(),
        type: 'optimize',
        title: 'Período otimizado',
        description: `Considere deslocar suas férias para o período de ${format(period.startDate, 'dd/MM/yyyy')} a ${format(period.endDate, 'dd/MM/yyyy')} para maximizar a eficiência (${period.workDays} dias úteis, ${period.weekendDays + period.holidayDays} dias não úteis)`,
        suggestedDateRange: {
          startDate: period.startDate,
          endDate: period.endDate
        },
        efficiencyGain: period.efficiency - vacationPeriod.efficiency,
        daysChanged: differenceInDays(
          period.startDate > vacationPeriod.startDate ? period.startDate : vacationPeriod.startDate,
          period.startDate > vacationPeriod.startDate ? vacationPeriod.startDate : period.startDate
        )
      });
    });
  }
  
  // Filter out recommendations that overlap with the judicial recess
  let filteredRecommendations = recommendations.filter(rec => {
    // For optimal_fraction, check each individual period
    if (rec.type === 'optimal_fraction' && rec.fractionedPeriods) {
      return !rec.fractionedPeriods.some(period => 
        overlapsWithJudicialRecess(period.startDate, period.endDate)
      );
    }
    
    // For regular recommendations
    return !overlapsWithJudicialRecess(rec.suggestedDateRange.startDate, rec.suggestedDateRange.endDate);
  });
  
  // Calculate a "practical score" for each recommendation based on start/end days
  const getRecommendationScore = (rec: Recommendation): number => {
    // Verify valid date range (start date must be before or equal to end date)
    if (rec.suggestedDateRange.startDate > rec.suggestedDateRange.endDate) {
      // Invalid date range, severely penalize
      return -100;
    }
    
    // Se já tem pontuação estratégica calculada (especialmente para pontes), priorizar
    if (rec.strategicScore) {
      return rec.strategicScore;
    }
    
    // Start with the efficiency gain as the base score
    let score = rec.efficiencyGain;
    
    // Don't apply additional scoring to fractionated periods
    if (rec.type === 'optimal_fraction' || rec.type === 'optimal_hybrid') {
      return score + 5.0; // Bônus base para estes tipos especiais
    }
    
    // Bônus significativo para super pontes
    if (rec.type === 'super_bridge') {
      return score + 4.0;
    }
    
    // Bônus para híbridos especiais de ponte + fracionamento
    if (rec.type === 'hybrid_bridge_split') {
      return score + 3.5;
    }
    
    const startDate = rec.suggestedDateRange.startDate;
    const endDate = rec.suggestedDateRange.endDate;
    const startDay = startDate.getDay();
    const endDay = endDate.getDay();
    
    // Computa duração do período
    const durationDays = differenceInDays(endDate, startDate) + 1;
    
    // ===== POSICIONAMENTO ESTRATÉGICO PARA DIAS DA SEMANA =====
    
    // Bônus para períodos iniciando em segunda-feira (ideal)
    if (startDay === 1) { // Segunda-feira
      score += 0.12; // Bônus maior para segunda-feira (dia ideal para iniciar férias)
    } else if (startDay === 2 || startDay === 3) { // Terça ou Quarta
      // Bônus modesto para dias úteis no início da semana
      score += 0.05;
    } else if (startDay === 4) { // Quinta
      score += 0.03; // Pequeno bônus
    }
    
    // Penalidades para períodos iniciando próximo ou no fim de semana
    if (startDay === 5) { // Sexta
      score -= 0.10; // Penalidade maior (desperdiça o final de semana)
    } else if (startDay === 6) { // Sábado
      score -= 0.15; // Penalidade severa
    } else if (startDay === 0) { // Domingo
      score -= 0.12; // Penalidade alta
    }
    
    // Bônus para períodos terminando na sexta-feira (ideal)
    if (endDay === 5) { // Sexta-feira
      score += 0.12; // Bônus maior para terminar na sexta (ideal para retornar descansado)
    } else if (endDay === 2 || endDay === 3 || endDay === 4) {
      // Bônus pequeno para terminar em dia útil no meio da semana
      score += 0.04;
    }
    
    // Penalidades para períodos terminando em fim de semana ou início da semana
    if (endDay === 0) { // Domingo
      score -= 0.15; // Penalidade severa (retorno sem descanso)
    } else if (endDay === 6) { // Sábado
      score -= 0.12; // Penalidade alta
    } else if (endDay === 1) { // Segunda-feira
      score -= 0.10; // Penalidade significativa (desperdiça o final de semana)
    }
    
    // ===== BÔNUS PARA PERÍODOS IDEAIS =====
    
    // Extra bônus para um período "perfeito" (Segunda a Sexta)
    if (startDay === 1 && endDay === 5) {
      score += 0.15; // Bônus significativo para período perfeito
    }
    
    // Bônus para períodos que iniciam na segunda e terminam antes do fim de semana
    if (startDay === 1 && (endDay >= 2 && endDay <= 4)) {
      score += 0.08; // Bônus moderado
    }
    
    // Bônus para períodos que iniciam no meio da semana e terminam na sexta
    if ((startDay >= 2 && startDay <= 4) && endDay === 5) {
      score += 0.08; // Bônus moderado
    }
    
    // ===== POSICIONAMENTO RELATIVO A FERIADOS =====
    
    // Verificar se há feriados próximos ao início ou fim do período
    const threeDaysBefore = subDays(startDate, 3);
    const threeDaysAfter = addDays(endDate, 3);
    
    let holidaysBeforeStart = 0;
    let holidaysAfterEnd = 0;
    
    // Contar feriados nos 3 dias antes do início
    let currentDate = new Date(threeDaysBefore);
    while (currentDate < startDate) {
      if (isHoliday(currentDate)) {
        holidaysBeforeStart++;
      }
      currentDate = addDays(currentDate, 1);
    }
    
    // Contar feriados nos 3 dias após o fim
    currentDate = addDays(endDate, 1);
    while (currentDate <= threeDaysAfter) {
      if (isHoliday(currentDate)) {
        holidaysAfterEnd++;
      }
      currentDate = addDays(currentDate, 1);
    }
    
    // Bônus para períodos que começam logo após feriados
    if (holidaysBeforeStart > 0) {
      score += 0.07 * holidaysBeforeStart; // Bônus por cada feriado próximo
    }
    
    // Bônus para períodos que terminam logo antes de feriados
    if (holidaysAfterEnd > 0) {
      score += 0.07 * holidaysAfterEnd; // Bônus por cada feriado próximo
    }
    
    // ===== AJUSTES POR DURAÇÃO =====
    
    // Pequenos ajustes baseados na duração (favorecendo períodos mais curtos para fracionamento)
    if (durationDays <= 7) {
      score += 0.05; // Pequeno bônus para períodos curtos (mais flexíveis)
    } else if (durationDays >= 14 && durationDays <= 16) {
      score += 0.03; // Pequeno bônus para períodos de 2 semanas (duração padrão)
    } else if (durationDays > 25) {
      score -= 0.04; // Pequena penalidade para períodos muito longos (menos flexíveis)
    }
    
    // ===== AJUSTES POR TIPO DE RECOMENDAÇÃO =====
    
    // Pequeno bônus para recomendações de tipo específico que tendem a ser mais benéficas
    if (rec.type === 'hybrid') {
      score += 0.10; // Bônus para estratégias híbridas (mais completas)
    } else if (rec.type === 'split') {
      score += 0.05; // Bônus para fracionamento (mais flexível)
    } else if (rec.type === 'bridge') {
      score += 0.08; // Bônus para pontes entre feriados (geralmente muito eficientes)
    }
    
    // Adicionar propriedade de pontuação estratégica à recomendação
    rec.strategicScore = parseFloat(score.toFixed(2));
    
    return score;
  };
  
  // Calcular a pontuação estratégica para cada recomendação
  for (const rec of filteredRecommendations) {
    rec.strategicScore = getRecommendationScore(rec);
  }
  
  // IMPLEMENTAÇÃO DE RECOMENDAÇÕES HÍBRIDAS
  // Esta etapa combina diferentes estratégias para maximizar os benefícios
  
  // Definir combinações compatíveis de estratégias
  const compatibleCombinations: Record<string, string[]> = {
    'split': ['extend', 'shift', 'bridge', 'super_bridge'],
    'extend': ['split', 'shift', 'bridge'],
    'shift': ['extend', 'split', 'bridge'],
    'bridge': ['extend', 'split'],
    'super_bridge': ['split']
  };
  
  // Armazenar recomendações híbridas geradas
  const hybridRecommendations: Recommendation[] = [];
  
  // Só criar híbridos se houver pelo menos 2 recomendações
  if (filteredRecommendations.length >= 2) {
    // Para cada par de recomendações, verificar compatibilidade e criar híbrido
    for (let i = 0; i < Math.min(3, filteredRecommendations.length - 1); i++) {
      const rec1 = filteredRecommendations[i];
      
      for (let j = i + 1; j < Math.min(4, filteredRecommendations.length); j++) {
        const rec2 = filteredRecommendations[j];
        
        // Verificar se as recomendações são compatíveis
        const isCompatible = 
          (compatibleCombinations[rec1.type] && compatibleCombinations[rec1.type].includes(rec2.type as any)) ||
          (compatibleCombinations[rec2.type] && compatibleCombinations[rec2.type].includes(rec1.type as any));
        
        if (isCompatible) {
          // Priorizar combinações com maior ganho total
          const combinedGain = rec1.efficiencyGain + rec2.efficiencyGain;
          
          // Só criar híbridos significativos (ganho mínimo de 5%)
          if (combinedGain >= 0.05) {
            // Ordenar para mostrar a recomendação mais impactante primeiro
            const [primary, secondary] = rec1.efficiencyGain >= rec2.efficiencyGain ? [rec1, rec2] : [rec2, rec1];
            
            // Determinar o tipo de híbrido baseado nos componentes
            let hybridType = 'hybrid';
            
            if ((primary.type === 'super_bridge' || primary.type === 'bridge') && 
                (secondary.type === 'split' || secondary.type === 'optimal_fraction')) {
              hybridType = 'hybrid_bridge_split';
            } else if ((secondary.type === 'super_bridge' || secondary.type === 'bridge') && 
                       (primary.type === 'split' || primary.type === 'optimal_fraction')) {
              hybridType = 'hybrid_bridge_split';
            }
            
            // Criar recomendação híbrida base
            const hybridRecommendation: Recommendation = {
              id: uuidv4(),
              type: hybridType,
              title: `Estratégia combinada: ${primary.title} + ${secondary.title}`,
              description: '',
              suggestedDateRange: primary.suggestedDateRange,
              efficiencyGain: combinedGain * 0.85,
              daysChanged: primary.daysChanged + secondary.daysChanged,
              strategicScore: (primary.strategicScore || 0) + (secondary.strategicScore || 0)
            };
            
            // Garantir que temos períodos fracionados quando necessário
            if ((primary.type === 'shift' || primary.type === 'extend') && 
                (secondary.type === 'split' || secondary.type === 'optimal_fraction')) {
              const newPeriods = calculateFractionedPeriods(
                primary.suggestedDateRange.startDate,
                primary.suggestedDateRange.endDate
              );
              
              hybridRecommendation.fractionedPeriods = newPeriods;
              
              const firstPeriod = newPeriods[0];
              const secondPeriod = newPeriods[1];
              
              const getDayName = (date: Date): string => {
                const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
                return days[date.getDay()];
              };
              
              hybridRecommendation.description = `Aproveite os benefícios de duas estratégias: ${primary.description} Depois, divida o período em duas partes: ${format(firstPeriod.startDate, 'dd/MM')} (${getDayName(firstPeriod.startDate)}) a ${format(firstPeriod.endDate, 'dd/MM')} (${getDayName(firstPeriod.endDate)}) e ${format(secondPeriod.startDate, 'dd/MM')} (${getDayName(secondPeriod.startDate)}) a ${format(secondPeriod.endDate, 'dd/MM')} (${getDayName(secondPeriod.endDate)})`;
            } else if (secondary.type === 'split' || secondary.type === 'optimal_fraction') {
              if (secondary.fractionedPeriods && secondary.fractionedPeriods.length > 0) {
                hybridRecommendation.fractionedPeriods = [...secondary.fractionedPeriods];
              } else {
                // Calcular novos períodos fracionados se não disponíveis
                hybridRecommendation.fractionedPeriods = calculateFractionedPeriods(
                  secondary.suggestedDateRange.startDate,
                  secondary.suggestedDateRange.endDate
                );
              }
              
              hybridRecommendation.description = `${primary.description} Em seguida, ${secondary.description}`;
            } else {
              // Para outros tipos de híbridos, manter a descrição simples
              hybridRecommendation.description = `${primary.description} Em seguida, ${secondary.description}`;
            }
            
            // Adicionar à lista de recomendações híbridas
            hybridRecommendations.push(hybridRecommendation);
          }
        }
      }
    }
  }
  
  // Adicionar recomendações híbridas ao conjunto final
  filteredRecommendations = [...filteredRecommendations, ...hybridRecommendations];
  
  // Verificar especificamente por oportunidades de integrar pontes com fracionamento
  if (optimalFractions && optimalFractions.periods.length > 0) {
    // Encontrar bridges do ano
    const currentYear = vacationPeriod.startDate.getFullYear();
    const bridges = findPotentialBridges(currentYear, 3)
      .map(bridge => {
        const bridgePeriod = getVacationPeriodDetails(bridge.startDate, bridge.endDate);
        const totalDays = bridgePeriod.totalDays;
        const nonWorkDays = bridgePeriod.weekendDays + bridgePeriod.holidayDays;
        const efficiency = nonWorkDays / totalDays;
        const roi = efficiency / bridge.workDays;
        
        return {
          ...bridge,
          efficiency,
          roi,
          period: bridgePeriod,
          strategicScore: bridge.strategicScore
        };
      })
      // Filtrar apenas pontes de alta qualidade
      .filter(bridge => bridge.roi > 0.4 || bridge.strategicScore > 10)
      .sort((a, b) => b.strategicScore - a.strategicScore);
    
    // Verificar quais períodos fracionados podem ser substituídos por pontes
    const enhancedFractions = [...optimalFractions.periods];
    let bridgesIntegrated = false;
    
    // Tentar integrar até 2 bridges de alta qualidade
    for (let i = 0; i < Math.min(2, bridges.length); i++) {
      const bridge = bridges[i];
      
      // Procurar um período fracionado que possa ser substituído com vantagem
      for (let j = 0; j < enhancedFractions.length; j++) {
        const fraction = enhancedFractions[j];
        
        // Verificar se a ponte tem eficiência significativamente maior que o período fracionado
        if (bridge.efficiency > fraction.efficiency * 1.2) {
          // Substituir o período fracionado pela ponte
          enhancedFractions[j] = bridge.period;
          bridgesIntegrated = true;
          break;
        }
      }
    }
    
    // Se conseguimos integrar bridges ao fracionamento, criar recomendação híbrida especial
    if (bridgesIntegrated) {
      // Recalcular eficiência combinada após a integração
      const enhancedCombined = calculateCombinedEfficiency(enhancedFractions);
      const originalCombined = calculateCombinedEfficiency(optimalFractions.periods);
      const efficiencyGain = enhancedCombined.efficiency - originalCombined.efficiency;
      
      // Obter nome dos dias da semana para facilitar compreensão
      const getDayOfWeekName = (date: Date): string => {
        const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        return days[date.getDay()];
      };
      
      // Criar descrição dos períodos melhorados
      const periodsDescription = enhancedFractions
        .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
        .map((p, i) => 
          `Período ${i+1}: ${format(p.startDate, 'dd/MM/yyyy')} (${getDayOfWeekName(p.startDate)}) a ${format(p.endDate, 'dd/MM/yyyy')} (${getDayOfWeekName(p.endDate)}) - ${p.workDays} dias úteis`
        ).join('; ');
      
      // Adicionar recomendação híbrida especial
      recommendations.push({
        id: uuidv4(),
        type: 'optimal_hybrid',
        title: 'Fracionamento Otimizado com Pontes',
        description: `Combinação ideal de férias fracionadas com pontes estratégicas para máxima eficiência (+${(efficiencyGain * 100).toFixed(0)}%). ${periodsDescription}`,
        suggestedDateRange: {
          startDate: enhancedFractions[0].startDate,
          endDate: enhancedFractions[0].endDate
        },
        efficiencyGain: efficiencyGain + 0.05, // Adicionar bônus por flexibilidade
        daysChanged: enhancedCombined.totalDays,
        strategicScore: 15.0, // Pontuação alta para esta estratégia otimizada
        fractionedPeriods: enhancedFractions
      });
    }
  }
  
  // Recalcular pontuações após criar híbridos para garantir consistência
  for (const rec of filteredRecommendations) {
    // Se já tem pontuação estratégica definida, manter
    if (!rec.strategicScore) {
      rec.strategicScore = getRecommendationScore(rec);
    }
  }
  
  // Sort recommendations: prioritize special types first, then by strategic score
  return ensureMinimumVacationDays(filteredRecommendations).sort((a, b) => {
    // Definir ordem de prioridade por tipo
    const typePriority: Record<string, number> = {
      'optimal_hybrid': 1,      // Prioridade máxima para híbridos otimizados
      'optimal_fraction': 2,    // Alta prioridade para fracionamento ótimo
      'super_bridge': 3,        // Alta prioridade para super pontes
      'hybrid_bridge_split': 4, // Alta prioridade para híbridos de ponte+fracionamento
      'hybrid': 5,              // Prioridade para híbridos comuns
      'bridge': 6,              // Prioridade para pontes regulares
      'split': 7,               // Prioridade média
      'shift': 8,               // Prioridade média-baixa
      'extend': 9,              // Prioridade baixa
      'error': 10,              // Prioridade mínima
      'optimize': 11            // Prioridade mínima
    };
    
    // Obter prioridade (usar 999 como fallback para tipos não definidos)
    const priorityA = typePriority[a.type] || 999;
    const priorityB = typePriority[b.type] || 999;
    
    // Primeiro ordenar por tipo de recomendação
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    // Se ambos são pontes ou super pontes, priorizar por pontuação estratégica
    if ((a.type === 'bridge' || a.type === 'super_bridge') && 
        (b.type === 'bridge' || b.type === 'super_bridge')) {
      if (a.strategicScore && b.strategicScore) {
        return b.strategicScore - a.strategicScore;
      }
    }
    
    // Para recomendações de mesmo tipo, usar pontuação estratégica se disponível
    if (a.strategicScore && b.strategicScore) {
      // Se a diferença for significativa
      if (Math.abs(a.strategicScore - b.strategicScore) > 0.5) {
        return b.strategicScore - a.strategicScore;
      }
    }
    
    // Para pontuações próximas ou inexistentes, priorizar por ganho de eficiência
    const efficiencyDiff = b.efficiencyGain - a.efficiencyGain;
    
    // Se os ganhos forem próximos, considerar a quantidade de dias alterados
    if (Math.abs(efficiencyDiff) < 0.05) {
      // Para ganhos similares, preferir alterações menores
      return a.daysChanged - b.daysChanged;
    }
    
    return efficiencyDiff;
  });
};

// Helper to check if a split is valid (both periods >= 5 days)
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
  // Debug
  console.log(`Buscando períodos otimizados para o ano ${year} com duração de ${length} dias`);
  
  const results: VacationPeriod[] = [];
  const startDate = new Date(year, 0, 1); // January 1st
  const endDate = new Date(year, 11, 31); // December 31st
  
  // Calculate for each possible start date
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const periodEndDate = addDays(currentDate, length - 1);
    if (periodEndDate > endDate) break;
    
    const period = getVacationPeriodDetails(currentDate, periodEndDate);
    
    // Add to results if valid and has at least one work day
    if (period.isValid && period.workDays > 0) {
      results.push(period);
    }
    
    currentDate = addDays(currentDate, 1);
  }
  
  // Debug  
  const sortedResults = results.sort((a, b) => b.efficiency - a.efficiency);
  const top5 = sortedResults.slice(0, 5);
  console.log(`Top 5 períodos mais eficientes encontrados:`);
  top5.forEach((p, i) => {
    console.log(`#${i+1}: ${format(p.startDate, 'dd/MM/yyyy')} a ${format(p.endDate, 'dd/MM/yyyy')} - Eficiência: ${(p.efficiency * 100).toFixed(2)}%`);
  });
  
  // Sort by efficiency and return top count
  return sortedResults.slice(0, count);
};

// Generate super optimized vacation recommendations for undecided users
export const generateSuperOptimizations = (currentYear: number = new Date().getFullYear()): Recommendation[] => {
  console.log("Iniciando geração de super otimizações para", currentYear);
  
  // FUNÇÃO DE FALLBACK - SEMPRE RETORNA ALGUMAS RECOMENDAÇÕES BÁSICAS
  // Esta função garante que sempre existam algumas recomendações, independentemente dos cálculos
  const createFallbackRecommendations = (year: number): Recommendation[] => {
    console.log("[LOG] Criando recomendações de fallback para o ano", year);
    const fallbackRecs: Recommendation[] = [];
    
    // Definir alguns feriados comuns
    const commonHolidays = [
      { month: 0, day: 1, name: "Ano Novo" },
      { month: 3, day: 21, name: "Tiradentes" },
      { month: 4, day: 1, name: "Dia do Trabalho" },
      { month: 8, day: 7, name: "Independência" },
      { month: 9, day: 12, name: "Nossa Senhora Aparecida" },
      { month: 10, day: 2, name: "Finados" },
      { month: 10, day: 15, name: "Proclamação da República" },
      { month: 11, day: 25, name: "Natal" }
    ];
    
    // Adicionar pontes estendidas para feriados (5 dias mínimo)
    commonHolidays.forEach(holiday => {
      const holidayDate = new Date(year, holiday.month, holiday.day);
      const dayOfWeek = holidayDate.getDay();
      
      // Criar ponte estendida
      let startDate, endDate;
      
      if (dayOfWeek === 2) { // Terça-feira - ponte estendida de sexta a terça
        startDate = subDays(holidayDate, 4); // Sexta anterior
        endDate = subDays(holidayDate, 1); // Segunda anterior ao feriado (não incluir o feriado)
      } else if (dayOfWeek === 4) { // Quinta-feira - ponte estendida de quinta a segunda
        startDate = addDays(holidayDate, 1); // Sexta após o feriado (não incluir o feriado)
        endDate = addDays(holidayDate, 4); // Segunda seguinte
      } else if (dayOfWeek === 1) { // Segunda-feira - ponte só após o feriado
        startDate = addDays(holidayDate, 1); // Terça após o feriado (não incluir o feriado)
        endDate = addDays(holidayDate, 4); // Sexta seguinte
      } else if (dayOfWeek === 5) { // Sexta-feira - ponte só antes do feriado
        startDate = subDays(holidayDate, 4); // Segunda anterior
        endDate = subDays(holidayDate, 1); // Quinta anterior (não incluir o feriado)
      } else {
        // Para outros dias da semana, criar período de 5 dias evitando o feriado
        if (dayOfWeek === 3) { // Quarta-feira
          // Pode escolher antes ou depois, escolhemos depois por padrão
          startDate = addDays(holidayDate, 1); // Quinta após o feriado
          endDate = addDays(holidayDate, 5); // Segunda seguinte
        } else {
          // Para outros dias, criar período ao redor mas sem incluir o feriado
          startDate = subDays(holidayDate, 2);
          endDate = addDays(holidayDate, 2);
          
          // Ajustar para não incluir o próprio feriado
          if (startDate <= holidayDate && holidayDate <= endDate) {
            // Recalcular excluindo o feriado
            if (differenceInDays(holidayDate, startDate) <= differenceInDays(endDate, holidayDate)) {
              // O feriado está mais próximo do início, então ajustamos o início
              startDate = addDays(holidayDate, 1);
            } else {
              // O feriado está mais próximo do fim, então ajustamos o fim
              endDate = subDays(holidayDate, 1);
            }
          }
        }
      }
      
      // Verificar se o período tem pelo menos 5 dias (suficiente para uma ponte estratégica)
      const duration = differenceInDays(endDate, startDate) + 1;
      
      console.log(`[LOG] Gerando recomendação de ponte fallback para ${holiday.name}: ${format(startDate, 'dd/MM/yyyy')} a ${format(endDate, 'dd/MM/yyyy')} - Duração: ${duration} dias`);
      
      if (duration < 5) {
        console.log(`[LOG] AJUSTANDO ponte fallback por ter apenas ${duration} dias`);
        // Ajustar para garantir 5 dias mínimo, mas ainda evitando o feriado
        if (startDate > holidayDate) {
          // Se começamos depois do feriado, expandimos para frente
          endDate = addDays(startDate, 4); // Garantir 5 dias (startDate + 4)
        } else if (endDate < holidayDate) {
          // Se terminamos antes do feriado, expandimos para trás
          startDate = subDays(endDate, 4); // Garantir 5 dias (endDate - 4)
        } else {
          // Caso especial: escolher uma direção
          startDate = addDays(holidayDate, 1);
          endDate = addDays(startDate, 4); // 5 dias total
        }
        
        console.log(`[LOG] Ponte fallback AJUSTADA: ${format(startDate, 'dd/MM/yyyy')} a ${format(endDate, 'dd/MM/yyyy')} - Nova duração: ${differenceInDays(endDate, startDate) + 1} dias`);
      }
      
      const details = getVacationPeriodDetails(startDate, endDate);
      const formalDuration = differenceInDays(endDate, startDate) + 1;
      
      const bridgeRec: Recommendation = {
        id: uuidv4(),
        type: 'super_bridge',
        title: `Ponte ${holiday.name} ${year}`,
        description: `${year}: Ponte estratégica próxima ao feriado de ${holiday.name} (sem incluir o próprio feriado). Aproveite ${details.totalDays} dias, incluindo finais de semana e o feriado adjacente. Eficiência máxima!`,
        suggestedDateRange: {
          startDate,
          endDate
        },
        efficiencyGain: 1.5,
        daysChanged: details.totalDays,
        strategicScore: 8
      };
      
      console.log(`[LOG] Adicionando ponte fallback: ${format(startDate, 'dd/MM/yyyy')} a ${format(endDate, 'dd/MM/yyyy')} - Dias formais: ${formalDuration}`);
      fallbackRecs.push(bridgeRec);
    });
    
    // Adicionar algumas recomendações de períodos curtos (7 dias)
    const miniVacations = [
      { month: 0, day: 15, title: "Mini-férias de Janeiro" },  // Janeiro
      { month: 6, day: 15, title: "Mini-férias de Julho" },    // Julho 
      { month: 11, day: 10, title: "Mini-férias de Dezembro" } // Dezembro
    ];
    
    miniVacations.forEach(period => {
      // Encontrar a segunda-feira mais próxima para começar as férias
      let startDate = new Date(year, period.month, period.day);
      const dayOfWeek = startDate.getDay();
      
      // Ajustar para começar na segunda-feira
      if (dayOfWeek !== 1) { // Se não for segunda-feira
        const daysUntilNextMonday = (8 - dayOfWeek) % 7; // Dias até a próxima segunda
        const daysFromPreviousMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Dias desde a segunda anterior
        
        // Escolher a segunda-feira mais próxima
        if (daysFromPreviousMonday <= daysUntilNextMonday) {
          startDate = subDays(startDate, daysFromPreviousMonday);
        } else {
          startDate = addDays(startDate, daysUntilNextMonday);
        }
      }
      
      // Definir o período (7 dias, segunda a domingo)
      const endDate = addDays(startDate, 6);
      
      // Calcular detalhes reais do período para obter eficiência precisa
      const details = getVacationPeriodDetails(startDate, endDate);
      
      // Formatar o mês por extenso
      const monthName = startDate.toLocaleDateString('pt-BR', {month: 'long'});
      
      const miniRec: Recommendation = {
        id: uuidv4(),
        type: 'optimize',
        title: `${period.title} ${year}`,
        description: `${year}: Período estratégico de 7 dias (segunda a domingo) para aproveitar ${monthName}. Eficiência: ${(details.efficiency - 1) * 100 > 0 ? '+' : ''}${((details.efficiency - 1) * 100).toFixed(0)}% de ganho.`,
        suggestedDateRange: {
          startDate,
          endDate
        },
        efficiencyGain: details.efficiency, // Usar eficiência real calculada
        daysChanged: 7,
        strategicScore: 7
      };
      
      fallbackRecs.push(miniRec);
    });
    
    // Adicionar períodos de 15 dias (começando na segunda, terminando na sexta)
    const midVacations = [
      { month: 1, day: 15, title: "Férias de Verão" },     // Fevereiro
      { month: 6, day: 1, title: "Férias de Inverno" }     // Julho
    ];
    
    midVacations.forEach(period => {
      // Encontrar a segunda-feira mais próxima para começar as férias
      let startDate = new Date(year, period.month, period.day);
      const dayOfWeek = startDate.getDay();
      
      // Ajustar para começar na segunda-feira
      if (dayOfWeek !== 1) { // Se não for segunda-feira
        const daysUntilNextMonday = (8 - dayOfWeek) % 7; // Dias até a próxima segunda
        const daysFromPreviousMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Dias desde a segunda anterior
        
        // Escolher a segunda-feira mais próxima
        if (daysFromPreviousMonday <= daysUntilNextMonday) {
          startDate = subDays(startDate, daysFromPreviousMonday);
        } else {
          startDate = addDays(startDate, daysUntilNextMonday);
        }
      }
      
      // Calcular o fim do período para terminar sempre na sexta-feira mais próxima do 15º dia
      const targetEndDate = addDays(startDate, 14); // 15 dias a partir do início
      let endDate = new Date(targetEndDate);
      
      // Ajustar para terminar na sexta-feira mais próxima
      const endDayOfWeek = endDate.getDay();
      if (endDayOfWeek !== 5) { // Se não for sexta-feira
        // Se estamos depois da sexta-feira, vamos para a próxima sexta
        if (endDayOfWeek === 6 || endDayOfWeek === 0) {
          endDate = addDays(endDate, endDayOfWeek === 0 ? 5 : 6);
        } else if (endDayOfWeek < 5) {
          // Se estamos antes da sexta, avançamos para a sexta desta semana
          endDate = addDays(endDate, 5 - endDayOfWeek);
        }
      }
      
      // Calcular detalhes reais do período para obter eficiência precisa
      const details = getVacationPeriodDetails(startDate, endDate);
      
      // Formatar o mês por extenso
      const monthName = startDate.toLocaleDateString('pt-BR', {month: 'long'});
      
      const midRec: Recommendation = {
        id: uuidv4(),
        type: 'optimize',
        title: `${period.title} ${year}`,
        description: `${year}: Quinzena otimizada (segunda a sexta) para aproveitar ${monthName}. Eficiência: ${(details.efficiency - 1) * 100 > 0 ? '+' : ''}${((details.efficiency - 1) * 100).toFixed(0)}% de ganho.`,
        suggestedDateRange: {
          startDate,
          endDate
        },
        efficiencyGain: details.efficiency, // Usar eficiência real calculada
        daysChanged: differenceInDays(endDate, startDate) + 1,
        strategicScore: 6
      };
      
      fallbackRecs.push(midRec);
    });
    
    // Adicionar um período de 30 dias (estratégico)
    const fullVacation = {
      month: 11, // Dezembro
      day: 1,
      title: "Férias de Fim de Ano"
    };
    
    // Encontrar a segunda-feira mais próxima para começar as férias
    let fullStartDate = new Date(year, fullVacation.month, fullVacation.day);
    const fullDayOfWeek = fullStartDate.getDay();
    
    // Ajustar para começar na segunda-feira
    if (fullDayOfWeek !== 1) { // Se não for segunda-feira
      const daysUntilNextMonday = (8 - fullDayOfWeek) % 7; // Dias até a próxima segunda
      const daysFromPreviousMonday = fullDayOfWeek === 0 ? 6 : fullDayOfWeek - 1; // Dias desde a segunda anterior
      
      // Escolher a segunda-feira mais próxima
      if (daysFromPreviousMonday <= daysUntilNextMonday) {
        fullStartDate = subDays(fullStartDate, daysFromPreviousMonday);
      } else {
        fullStartDate = addDays(fullStartDate, daysUntilNextMonday);
      }
    }
    
    // Calcular o fim do período para completar 30 dias mas terminar numa sexta-feira
    let fullEndDate = addDays(fullStartDate, 29);
    
    // Ajustar para terminar na sexta-feira
    // Se o 30º dia não for sexta, encontrar a sexta mais próxima
    const endDayOfWeek = fullEndDate.getDay();
    if (endDayOfWeek !== 5) {
      // Se estamos depois da sexta, voltar para a sexta anterior
      if (endDayOfWeek === 6 || endDayOfWeek === 0) {
        fullEndDate = subDays(fullEndDate, endDayOfWeek === 0 ? 2 : 1);
      } else {
        // Se estamos antes da sexta, avançar para a próxima sexta
        fullEndDate = addDays(fullEndDate, 5 - endDayOfWeek);
      }
    }
    
    // Calcular detalhes reais do período para obter eficiência precisa
    const fullDetails = getVacationPeriodDetails(fullStartDate, fullEndDate);
    
    const fullRec: Recommendation = {
      id: uuidv4(),
      type: 'optimize',
      title: `${fullVacation.title} ${year}`,
      description: `${year}: Período estratégico (inicia segunda e termina sexta) para aproveitar o final do ano. Eficiência: ${(fullDetails.efficiency - 1) * 100 > 0 ? '+' : ''}${((fullDetails.efficiency - 1) * 100).toFixed(0)}% de ganho.`,
      suggestedDateRange: {
        startDate: fullStartDate,
        endDate: fullEndDate
      },
      efficiencyGain: fullDetails.efficiency, // Usar eficiência real calculada
      daysChanged: differenceInDays(fullEndDate, fullStartDate) + 1,
      strategicScore: 9
    };
    
    fallbackRecs.push(fullRec);
    
    return fallbackRecs;
  };
  
  try {
    // Inicializar array de recomendações
    const recommendations: Recommendation[] = [];
    
    console.log(`Gerando super otimizações para o ano ${currentYear} e seguintes...`);
    
    // Período de três anos (ano atual e próximos dois)
    const years = [currentYear, currentYear + 1, currentYear + 2];
    
    // Armazenar as melhores pontes e períodos para não haver sobreposição
    let selectedPeriods: { startDate: Date, endDate: Date, type: string }[] = [];
    
    // Para cada ano, encontrar as melhores oportunidades
    years.forEach(year => {
      console.log(`Analisando super otimizações para o ano ${year}`);
      
      // 1. Encontrar pontes estratégicas (gaps entre feriados e fins de semana)
      const allBridges = findPotentialBridges(year, 10) // Aumentado para 10 dias para capturar mais oportunidades
        .map(bridge => {
          const bridgePeriod = getVacationPeriodDetails(bridge.startDate, bridge.endDate);
          const totalDays = bridgePeriod.totalDays;
          const formalPeriodDays = differenceInDays(bridge.endDate, bridge.startDate) + 1;
          console.log(`[LOG] Ponte encontrada: ${format(bridge.startDate, 'dd/MM/yyyy')} a ${format(bridge.endDate, 'dd/MM/yyyy')} - Dias formais: ${formalPeriodDays}, Dias úteis: ${bridge.workDays}`);
          
          const nonWorkDays = bridgePeriod.weekendDays + bridgePeriod.holidayDays;
          const efficiency = nonWorkDays / totalDays;
          const roi = efficiency / bridge.workDays;
          
          // Calcular pontuação estratégica
          const holidayDates = getHolidaysInRange(
            new Date(year, 0, 1), 
            new Date(year, 11, 31)
          ).map(h => new Date(h.date));
          
          const strategicScore = calculateBridgeStrategicScore(
            bridge.startDate, 
            bridge.endDate, 
            bridge.workDays,
            holidayDates
          );
          
          return {
            ...bridge,
            efficiency,
            roi,
            period: bridgePeriod,
            strategicScore
          };
        })
        // Filtros mais permissivos para incluir mais pontes
        .filter(bridge => {
          const formalPeriodDays = differenceInDays(bridge.period.endDate, bridge.startDate) + 1;
          const meetsMinimumDays = formalPeriodDays >= 5;
          console.log(`[LOG] Filtrando ponte: ${format(bridge.startDate, 'dd/MM/yyyy')} a ${format(bridge.period.endDate, 'dd/MM/yyyy')} - Dias formais: ${formalPeriodDays}, Atende mínimo: ${meetsMinimumDays}`);
          
          return (
            // Critérios MUITO mais permissivos para pontes estratégicas:
            meetsMinimumDays && // Período formal mínimo de 5 dias
            (bridge.efficiency >= 0.1) && // Reduzido drasticamente para incluir mais opções
            (
              bridge.roi > 0.1 || // Reduzido para incluir mais opções
              bridge.strategicScore > 1 || // Reduzido para incluir quase todas as pontes
              (bridge.workDays <= 7) // Qualquer ponte com até 7 dias úteis
            )
          );
        })
        // Ordenar por eficiência (do maior para o menor)
        .sort((a, b) => b.efficiency - a.efficiency);
      
      console.log(`Encontradas ${allBridges.length} pontes potenciais para o ano ${year}`);
      
      // 2. Encontrar recessos judiciais - períodos entre 20/12 e 06/01 (remover recesso de julho)
      const recessPeriods: {startDate: Date, endDate: Date, name: string, efficiency: number}[] = [
        // Recesso de fim de ano
        {
          name: "Recesso Forense de Fim de Ano",
          startDate: new Date(year, 11, 20), // 20/12
          endDate: new Date(year + 1, 0, 6), // 06/01
          efficiency: 0
        }
      ];
      
      // Calcular eficiência dos recessos
      recessPeriods.forEach(recess => {
        const details = getVacationPeriodDetails(recess.startDate, recess.endDate);
        recess.efficiency = details.workDays > 0 ? details.totalDays / details.workDays : 0;
      });
      
      // 3. Encontrar períodos estratégicos para férias completas (30 dias) ou quinzenas (15 dias)
      const optimalPeriods = findOptimalPeriods(year, 30, 8) // Aumentado para 8 períodos
        .filter(period => period.efficiency >= 0.35) // Reduzido para incluir mais opções
        .map(period => ({
          ...period,
          type: 'complete',
          daysLength: 30
        }));
      
      console.log(`Encontrados ${optimalPeriods.length} períodos completos otimizados para o ano ${year}`);
      
      const optimalHalfPeriods = findOptimalPeriods(year, 15, 12) // Aumentado para 12 períodos
        .filter(period => period.efficiency >= 0.4) // Reduzido para incluir mais opções
        .map(period => ({
          ...period,
          type: 'half',
          daysLength: 15
        }));
      
      console.log(`Encontrados ${optimalHalfPeriods.length} períodos de quinzena otimizados para o ano ${year}`);
      
      // 4. Encontrar períodos fracionados ideais
      const fractionedOptions = findOptimalFractionedPeriods(year, 6, 5);
      
      // 5. Adicionar novas estratégias: mini-férias estratégicas (1 semana)
      const miniPeriods = findOptimalPeriods(year, 7, 15) // Encontrar até 15 períodos de uma semana
        .filter(period => period.efficiency >= 0.45) // Alta eficiência para períodos curtos
        .map(period => ({
          ...period,
          type: 'mini',
          daysLength: 7
        }));
      
      console.log(`Encontrados ${miniPeriods.length} períodos de mini-férias para o ano ${year}`);
      
      // 6. Identificar feriados consecutivos ou próximos para super pontes
      const holidays = getHolidaysInRange(
        new Date(year, 0, 1),
        new Date(year, 11, 31)
      );
      
      console.log(`Encontrados ${holidays.length} feriados para o ano ${year}`);
      
      // Criar mapeamento de feriados por mês para identificar concentrações
      const holidaysByMonth: Record<number, Holiday[]> = {};
      holidays.forEach(holiday => {
        const date = new Date(holiday.date);
        const month = date.getMonth();
        if (!holidaysByMonth[month]) {
          holidaysByMonth[month] = [];
        }
        holidaysByMonth[month].push(holiday);
      });
      
      // Meses com alta concentração de feriados (mais de 2 feriados)
      const highHolidayMonths = Object.keys(holidaysByMonth)
        .filter(month => holidaysByMonth[parseInt(month)].length >= 2)
        .map(month => parseInt(month));
      
      console.log(`Meses com alta concentração de feriados: ${highHolidayMonths.map(m => m+1).join(', ')}`);
      
      // 7. Realizar seleção das melhores recomendações sem sobreposição
      
      // 7.1 Usar todas as pontes encontradas, sem limite de quantidade
      // Considerar todas as pontes como "super pontes" para melhorar visualização
      const superBridges = allBridges
        // Garantir que todas as pontes tenham período formal de férias de pelo menos 5 dias
        .filter(bridge => {
          const formalVacationDays = differenceInDays(bridge.period.endDate, bridge.startDate) + 1;
          const meetsMinimumDays = formalVacationDays >= 5;
          console.log(`[LOG] Verificando requisito mínimo para ponte: ${format(bridge.startDate, 'dd/MM/yyyy')} a ${format(bridge.period.endDate, 'dd/MM/yyyy')} - Dias formais: ${formalVacationDays}, Atende requisito: ${meetsMinimumDays}`);
          return meetsMinimumDays;
        });
      
      console.log(`Selecionadas ${superBridges.length} pontes potenciais para o ano ${year}`);
      
      // ADICIONANDO RECOMENDAÇÕES FORÇADAS PARA TESTE
      // Criar algumas super pontes básicas se não encontrarmos nenhuma
      if (superBridges.length === 0) {
        console.log("Criando recomendações de teste para garantir que algo seja exibido...");
        
        // Exemplo: Pontes para feriados comuns (ex: Tiradentes, Dia do Trabalho)
        const commonHolidays = [
          { month: 3, day: 21, name: "Tiradentes" }, // Abril (mês 3)
          { month: 4, day: 1, name: "Dia do Trabalho" }, // Maio (mês 4)
          { month: 8, day: 7, name: "Independência" }, // Setembro (mês 8)
          { month: 9, day: 12, name: "Nossa Senhora Aparecida" } // Outubro (mês 9)
        ];
        
        commonHolidays.forEach(holiday => {
          const holidayDate = new Date(year, holiday.month, holiday.day);
          // Criar ponte estendida para garantir 5 dias mínimo
          const dayOfWeek = holidayDate.getDay();
          
          let startDate, endDate;
          
          if (dayOfWeek === 2) { // Terça-feira - ponte estendida de sexta a terça
            startDate = subDays(holidayDate, 4); // Sexta anterior
            endDate = subDays(holidayDate, 1); // Segunda anterior ao feriado (não incluir o feriado)
          } else if (dayOfWeek === 4) { // Quinta-feira - ponte estendida de quinta a segunda
            startDate = addDays(holidayDate, 1); // Sexta após o feriado (não incluir o feriado)
            endDate = addDays(holidayDate, 4); // Segunda seguinte
          } else if (dayOfWeek === 1) { // Segunda-feira - ponte só após o feriado
            startDate = addDays(holidayDate, 1); // Terça após o feriado (não incluir o feriado)
            endDate = addDays(holidayDate, 4); // Sexta seguinte
          } else if (dayOfWeek === 5) { // Sexta-feira - ponte só antes do feriado
            startDate = subDays(holidayDate, 4); // Segunda anterior
            endDate = subDays(holidayDate, 1); // Quinta anterior (não incluir o feriado)
          } else {
            // Para outros dias da semana, criar período de 5 dias evitando o feriado
            if (dayOfWeek === 3) { // Quarta-feira
              // Pode escolher antes ou depois, escolhemos depois por padrão
              startDate = addDays(holidayDate, 1); // Quinta após o feriado
              endDate = addDays(holidayDate, 5); // Segunda seguinte
            } else {
              // Para outros dias, criar período ao redor mas sem incluir o feriado
              startDate = subDays(holidayDate, 2);
              endDate = addDays(holidayDate, 2);
              
              // Ajustar para não incluir o próprio feriado
              if (startDate <= holidayDate && holidayDate <= endDate) {
                // Recalcular excluindo o feriado
                if (differenceInDays(holidayDate, startDate) <= differenceInDays(endDate, holidayDate)) {
                  // O feriado está mais próximo do início, então ajustamos o início
                  startDate = addDays(holidayDate, 1);
                } else {
                  // O feriado está mais próximo do fim, então ajustamos o fim
                  endDate = subDays(holidayDate, 1);
                }
              }
            }
          }
          
          const details = getVacationPeriodDetails(startDate, endDate);
          
          // Criar recomendação forçada
          recommendations.push({
            id: uuidv4(),
            type: 'super_bridge',
            title: `Ponte ${holiday.name} ${year}`,
            description: `${year}: Ponte estratégica próxima ao feriado de ${holiday.name} (sem incluir o próprio feriado). Aproveite ${details.totalDays} dias, incluindo finais de semana e o feriado adjacente. Eficiência máxima!`,
            suggestedDateRange: {
              startDate: startDate,
              endDate: endDate
            },
            efficiencyGain: 1.5,
            daysChanged: details.totalDays,
            strategicScore: 8
          });
          
          // Adicionar à lista de períodos selecionados
          selectedPeriods.push({
            startDate: startDate,
            endDate: endDate,
            type: 'forced_bridge'
          });
        });
      }
      
      // Adicionar super pontes às recomendações
      let superBridgesAdded = 0;
      superBridges.forEach(bridge => {
        // Verificar se não há sobreposição com períodos já selecionados
        const hasOverlap = selectedPeriods.some(period => 
          dateRangesOverlap(bridge.startDate, bridge.period.endDate, period.startDate, period.endDate)
        );
        
        // Verificar se o período FORMAL de férias tem pelo menos 5 dias
        // O período formal inclui todos os dias, úteis ou não, dentro do intervalo de férias
        const formalPeriodDays = differenceInDays(bridge.period.endDate, bridge.startDate) + 1;
        
        // Remover o limite de pontes por ano e garantir mínimo de 5 dias FORMAIS de férias
        if (!hasOverlap && formalPeriodDays >= 5) {
          console.log(`[LOG] Adicionando recomendação de ponte: ${format(bridge.startDate, 'dd/MM/yyyy')} a ${format(bridge.period.endDate, 'dd/MM/yyyy')} - Período formal: ${formalPeriodDays} dias`);
          
          // Obter nome dos dias da semana para descrição
          const getDayOfWeekName = (date: Date): string => {
            const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
            return days[date.getDay()];
          };
          
          // Verificar feriados próximos para encontrar os dias não úteis conectados
          const nearbyHolidays = getHolidaysInRange(
            subDays(bridge.startDate, 5),
            addDays(bridge.period.endDate, 5)
          );
          
          // Encontrar os dias não úteis conectados antes e depois da ponte
          let nonWorkDayBefore: Date | null = null;
          let nonWorkDayAfter: Date | null = null;
          
          // Verificar dia anterior à ponte (deve ser feriado ou fim de semana)
          const dayBefore = subDays(bridge.startDate, 1);
          if (isHoliday(dayBefore) || isWeekend(dayBefore)) {
            nonWorkDayBefore = dayBefore;
          }
          
          // Verificar dia posterior à ponte (deve ser feriado ou fim de semana)
          const dayAfter = addDays(bridge.period.endDate, 1);
          if (isHoliday(dayAfter) || isWeekend(dayAfter)) {
            nonWorkDayAfter = dayAfter;
          }
          
          // Usar o período COMPLETO para a descrição (incluindo os dias não úteis conectados)
          const fullStartDate = nonWorkDayBefore || bridge.startDate;
          const fullEndDate = nonWorkDayAfter || bridge.period.endDate;
          
          // Calcular o período total real de dias
          const totalDays = differenceInDays(fullEndDate, fullStartDate) + 1;
          
          // Verificar quantos dias de férias são efetivamente dias úteis
          const workingDaysCount = bridge.workDays;
          const nonWorkingDaysCount = formalPeriodDays - workingDaysCount;
          
          const holidayNames = nearbyHolidays
            .filter(h => {
              const holidayDate = new Date(h.date);
              return !isWeekend(holidayDate) && // Focar em feriados que caem em dias úteis
                holidayDate >= fullStartDate && 
                holidayDate <= fullEndDate;
            })
            .map(h => h.name);
            
          const holidayInfo = holidayNames.length > 0
            ? ` incluindo ${holidayNames.join(' e ')}`
            : '';
          
          // Calcular ROI em dias úteis
          const workdayROI = nonWorkingDaysCount / workingDaysCount;
          
          // Criar recomendação
          recommendations.push({
            id: uuidv4(),
            type: 'super_bridge',
            title: `Ponte ${format(bridge.startDate, 'MMM/yyyy', { locale: ptBR })}`,
            description: `${year}: Ponte estratégica${holidayInfo} próxima ao feriado. Período de férias: ${format(bridge.startDate, 'dd/MM')} a ${format(bridge.period.endDate, 'dd/MM')} (${formalPeriodDays} dias). Ganho de eficiência: ${workingDaysCount} dias úteis e ${nonWorkingDaysCount} dias não úteis. Período completo com folgas: ${format(fullStartDate, 'dd/MM')} (${getDayOfWeekName(fullStartDate)}) a ${format(fullEndDate, 'dd/MM')} (${getDayOfWeekName(fullEndDate)}).`,
            suggestedDateRange: {
              startDate: bridge.startDate,
              endDate: bridge.period.endDate
            },
            efficiencyGain: bridge.efficiency,
            daysChanged: formalPeriodDays,
            strategicScore: bridge.strategicScore
          });
          
          // Adicionar à lista de períodos selecionados
          selectedPeriods.push({
            startDate: bridge.startDate,
            endDate: bridge.period.endDate,
            type: 'super_bridge'
          });
          
          superBridgesAdded++;
        } else {
          console.log(`[LOG] Rejeitando ponte: ${format(bridge.startDate, 'dd/MM/yyyy')} a ${format(bridge.period.endDate, 'dd/MM/yyyy')} - Sobreposição: ${hasOverlap}, Dias formais: ${formalPeriodDays}`);
        }
      });
      
      console.log(`Adicionadas ${superBridgesAdded} pontes às recomendações para o ano ${year}`);
      
      // Remover a seleção de pontes regulares, já que agora todas são tratadas como super pontes
      // 7.2 Comentando esta seção para evitar duplicação, já que todas as pontes são incluídas acima
      /*
      const regularBridges = allBridges
        .filter(bridge => !superBridges.includes(bridge)) // Excluir pontes que já estão em superBridges
        .filter(bridge => bridge.strategicScore > 3) // Critério mais permissivo
        // Garantir que todas as pontes tenham pelo menos 3 dias no total
        .filter(bridge => bridge.period.totalDays >= 3)
        .slice(0, 10);
      
      // Adicionar pontes regulares às recomendações
      let regularBridgesAdded = 0;
      regularBridges.forEach(bridge => {
        // Verificar se não há sobreposição com períodos já selecionados
        const hasOverlap = selectedPeriods.some(period => 
          dateRangesOverlap(bridge.startDate, bridge.period.endDate, period.startDate, period.endDate)
        );
        
        if (!hasOverlap && regularBridgesAdded < 6) { // Limitado a 6 pontes regulares por ano
          // ... código existente ...
        }
      });
      */
      
      // 7.3 Adicionar estratégias para meses com alta concentração de feriados
      highHolidayMonths.forEach(month => {
        // Encontrar o primeiro e último feriado do mês
        const monthHolidays = holidaysByMonth[month]
          .map(h => new Date(h.date))
          .sort((a, b) => a.getTime() - b.getTime());
        
        if (monthHolidays.length >= 2) {
          const firstHoliday = monthHolidays[0];
          const lastHoliday = monthHolidays[monthHolidays.length - 1];
          
          // Se os feriados estiverem a menos de 15 dias um do outro, considerar um período estratégico
          const daysBetween = differenceInDays(lastHoliday, firstHoliday);
          
          if (daysBetween <= 15 && daysBetween >= 3) {
            // Expandir o período para incluir os finais de semana próximos
            let startDate = firstHoliday;
            let endDate = lastHoliday;
            
            // Expandir para trás até segunda-feira ou domingo
            while (startDate.getDay() !== 1 && startDate.getDay() !== 0) {
              startDate = subDays(startDate, 1);
            }
            
            // Expandir para frente até sexta-feira ou sábado
            while (endDate.getDay() !== 5 && endDate.getDay() !== 6) {
              endDate = addDays(endDate, 1);
            }
            
            // Verificar se não há sobreposição com períodos já selecionados
            const hasOverlap = selectedPeriods.some(period => 
              dateRangesOverlap(startDate, endDate, period.startDate, period.endDate)
            );
            
            if (!hasOverlap) {
              const details = getVacationPeriodDetails(startDate, endDate);
              const efficiency = details.efficiency;
              
              // Obter nome dos dias da semana para descrição
              const getDayOfWeekName = (date: Date): string => {
                const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
                return days[date.getDay()];
              };
              
              const holidayNames = monthHolidays.map(d => {
                const holiday = holidays.find(h => new Date(h.date).getTime() === d.getTime());
                return holiday ? holiday.name : '';
              }).filter(Boolean);
              
              // Calcular ROI em dias úteis
              const workdayROI = details.workDays > 0 ? 
                (details.weekendDays + details.holidayDays) / details.workDays : 0;
              
              recommendations.push({
                id: uuidv4(),
                type: 'optimize',
                title: `Mês de Feriados ${format(startDate, 'MMM/yyyy', { locale: ptBR })}`,
                description: `${year}: Aproveite os feriados de ${format(startDate, 'MMMM', { locale: ptBR })} (${holidayNames.join(', ')}) tirando férias de ${format(startDate, 'dd/MM')} (${getDayOfWeekName(startDate)}) a ${format(endDate, 'dd/MM')} (${getDayOfWeekName(endDate)}). Use ${details.workDays} dias úteis para ${details.totalDays} dias de folga (ROI: ${workdayROI.toFixed(1)}).`,
                suggestedDateRange: {
                  startDate: startDate,
                  endDate: endDate
                },
                efficiencyGain: efficiency,
                daysChanged: details.totalDays,
                strategicScore: 7 + monthHolidays.length // Mais feriados = maior pontuação
              });
              
              // Adicionar à lista de períodos selecionados
              selectedPeriods.push({
                startDate: startDate,
                endDate: endDate,
                type: 'month_holidays'
              });
            }
          }
        }
      });
      
      // 7.4 Selecionar períodos fracionados de mini-férias (1 semana)
      let miniPeriodsAdded = 0;
      miniPeriods.forEach(period => {
        if (miniPeriodsAdded >= 3) return; // Limitar a 3 mini-períodos por ano
        
        // Verificar se não há sobreposição com períodos já selecionados
        const hasOverlap = selectedPeriods.some(selectedPeriod => 
          dateRangesOverlap(period.startDate, period.endDate, selectedPeriod.startDate, selectedPeriod.endDate)
        );
        
        if (!hasOverlap) {
          // Obter nome dos dias da semana para descrição
          const getDayOfWeekName = (date: Date): string => {
            const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
            return days[date.getDay()];
          };
          
          // Verificar feriados no período
          const periodHolidays = getHolidaysInRange(period.startDate, period.endDate)
            .filter(h => !isWeekend(new Date(h.date)))
            .map(h => h.name);
          
          const holidayInfo = periodHolidays.length > 0
            ? ` incluindo ${periodHolidays.join(' e ')}`
            : '';
          
          // Calcular ROI em dias úteis
          const workdayROI = period.workDays > 0 ? 
            (period.weekendDays + period.holidayDays) / period.workDays : 0;
          
          recommendations.push({
            id: uuidv4(),
            type: 'optimize',
            title: `Mini-Férias ${format(period.startDate, 'MMM/yyyy', { locale: ptBR })}`,
            description: `${year}: Período curto e altamente eficiente${holidayInfo} de ${format(period.startDate, 'dd/MM')} (${getDayOfWeekName(period.startDate)}) a ${format(period.endDate, 'dd/MM')} (${getDayOfWeekName(period.endDate)}). Apenas ${period.workDays} dias úteis para ${period.totalDays} dias de folga (ROI: ${workdayROI.toFixed(1)}).`,
            suggestedDateRange: {
              startDate: period.startDate,
              endDate: period.endDate
            },
            efficiencyGain: period.efficiency,
            daysChanged: period.totalDays,
            strategicScore: 6 + (periodHolidays.length * 0.5) // Mais feriados = maior pontuação
          });
          
          // Adicionar à lista de períodos selecionados
          selectedPeriods.push({
            startDate: period.startDate,
            endDate: period.endDate,
            type: 'mini_period'
          });
          
          miniPeriodsAdded++;
        }
      });
      
      // 7.5 Selecionar quinzenas estratégicas (até 3 por ano)
      let quinzenasAdded = 0;
      
      
      for (const period of optimalHalfPeriods) {
        if (quinzenasAdded >= 3) break; // Limitar a 3 quinzenas por ano
        
        // Verificar se não há sobreposição significativa com períodos já selecionados
        const hasSignificantOverlap = selectedPeriods.some(selectedPeriod => {
          // Calcular dias de sobreposição
          const overlap = getOverlapDays(
            period.startDate, period.endDate, 
            selectedPeriod.startDate, selectedPeriod.endDate
          );
          
          // Considerar sobreposição significativa se for mais de 3 dias para períodos médios
          return overlap > 3;
        });
        
        if (!hasSignificantOverlap) {
          // Obter nome dos dias da semana para descrição
          const getDayOfWeekName = (date: Date): string => {
            const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
            return days[date.getDay()];
          };
          
          // Verificar feriados no período
          const periodHolidays = getHolidaysInRange(period.startDate, period.endDate)
            .filter(h => !isWeekend(new Date(h.date)))
            .map(h => h.name);
          
          const holidayInfo = periodHolidays.length > 0
            ? ` incluindo ${periodHolidays.join(' e ')}`
            : '';
          
          // Calcular ROI em dias úteis
          const workdayROI = (period.weekendDays + period.holidayDays) / period.workDays;
          
          recommendations.push({
            id: uuidv4(),
            type: 'optimize',
            title: `Quinzena Estratégica ${format(period.startDate, 'MMM/yyyy', { locale: ptBR })}`,
            description: `${year}: Quinzena otimizada${holidayInfo} de ${format(period.startDate, 'dd/MM')} (${getDayOfWeekName(period.startDate)}) a ${format(period.endDate, 'dd/MM')} (${getDayOfWeekName(period.endDate)}). Use ${period.workDays} dias úteis para obter ${period.totalDays} dias de folga total (ROI: ${workdayROI.toFixed(1)}).`,
            suggestedDateRange: {
              startDate: period.startDate,
              endDate: period.endDate
            },
            efficiencyGain: period.efficiency,
            daysChanged: period.totalDays,
            strategicScore: 7 // Pontuação média-alta para quinzenas
          });
          
          // Adicionar à lista de períodos selecionados
          selectedPeriods.push({
            startDate: period.startDate,
            endDate: period.endDate,
            type: 'half_period'
          });
          
          quinzenasAdded++;
        }
      }
      
      // 7.6 Selecionar períodos completos (até 2 por ano)
      let completosAdded = 0;
      
      for (const period of optimalPeriods) {
        if (completosAdded >= 2) break; // Limitar a 2 períodos completos por ano
        
        // Verificar se não há sobreposição significativa com períodos já selecionados
        const hasSignificantOverlap = selectedPeriods.some(selectedPeriod => {
          // Calcular dias de sobreposição
          const overlap = getOverlapDays(
            period.startDate, period.endDate, 
            selectedPeriod.startDate, selectedPeriod.endDate
          );
          
            // Considerar sobreposição significativa se for mais de 5 dias para períodos longos
          return overlap > 5;
        });
        
        if (!hasSignificantOverlap) {
          // Obter nome dos dias da semana para descrição
          const getDayOfWeekName = (date: Date): string => {
            const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
            return days[date.getDay()];
          };
          
          // Verificar feriados no período
          const periodHolidays = getHolidaysInRange(period.startDate, period.endDate)
            .filter(h => !isWeekend(new Date(h.date)))
            .map(h => h.name);
          
          const holidayInfo = periodHolidays.length > 0
            ? ` incluindo ${periodHolidays.length} feriado(s) em dias úteis`
            : '';
          
          // Calcular ROI em dias úteis
          const workdayROI = (period.weekendDays + period.holidayDays) / period.workDays;
          
          recommendations.push({
            id: uuidv4(),
            type: 'optimize',
            title: `Período Completo Otimizado ${year}`,
            description: `${year}: Período de 30 dias altamente eficiente${holidayInfo} de ${format(period.startDate, 'dd/MM')} (${getDayOfWeekName(period.startDate)}) a ${format(period.endDate, 'dd/MM')} (${getDayOfWeekName(period.endDate)}). ROI: ${workdayROI.toFixed(1)} dias não úteis por dia de férias. Inclui ${period.weekendDays} fins de semana e ${period.holidayDays} feriados.`,
            suggestedDateRange: {
              startDate: period.startDate,
              endDate: period.endDate
            },
            efficiencyGain: period.efficiency,
            daysChanged: period.totalDays,
            strategicScore: 8 // Bom, mas não tão alto quanto recessos ou super pontes
          });
          
          // Adicionar à lista de períodos selecionados
          selectedPeriods.push({
            startDate: period.startDate,
            endDate: period.endDate,
            type: 'complete_period'
          });
          
          completosAdded++;
        }
      }
      
      // 7.7 Adicionar recomendações para recessos (se não houver sobreposição com outros períodos)
      recessPeriods.forEach(recess => {
        // Verificar se o recesso tem eficiência calculada
        if (recess.efficiency > 0) {
          // Verificar se não há sobreposição com períodos já selecionados
          const hasOverlap = selectedPeriods.some(period => 
            dateRangesOverlap(recess.startDate, recess.endDate, period.startDate, period.endDate)
          );
          
          if (!hasOverlap) {
            // Verificar feriados no período de recesso
            const details = getVacationPeriodDetails(recess.startDate, recess.endDate);
            
          // Obter nome dos dias da semana para descrição
          const getDayOfWeekName = (date: Date): string => {
            const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
            return days[date.getDay()];
          };
          
            recommendations.push({
              id: uuidv4(),
              type: 'recess',
              title: recess.name,
              description: `${year}: Aproveite o ${recess.name.toLowerCase()} de ${format(recess.startDate, 'dd/MM')} (${getDayOfWeekName(recess.startDate)}) a ${format(recess.endDate, 'dd/MM')} (${getDayOfWeekName(recess.endDate)}). Durante este período, você terá ${details.weekendDays} fins de semana e ${details.holidayDays} feriados, reduzindo os dias úteis perdidos.`,
              suggestedDateRange: {
                startDate: recess.startDate,
                endDate: recess.endDate
              },
              efficiencyGain: details.efficiency,
              daysChanged: details.totalDays,
              strategicScore: 10 // Alta pontuação para recessos
            });
            
            // Adicionar à lista de períodos selecionados
            selectedPeriods.push({
              startDate: recess.startDate,
              endDate: recess.endDate,
              type: 'recess'
            });
          }
        }
      });
      
      // 7.8 Adicionar recomendação para fracionamento ideal (se houver)
      if (fractionedOptions && fractionedOptions.periods.length > 0) {
        // Verificar se as frações não têm sobreposição significativa com períodos já selecionados
        const hasSignificantOverlap = fractionedOptions.periods.some(fraction => {
          return selectedPeriods.some(selectedPeriod => {
            const overlap = getOverlapDays(
              fraction.startDate, fraction.endDate, 
              selectedPeriod.startDate, selectedPeriod.endDate
            );
            return overlap > 3; // Sobreposição significativa se for mais de 3 dias
          });
        });
        
        if (!hasSignificantOverlap) {
          // Preparar descrição dos períodos
          const periodsDescription = fractionedOptions.periods
            .slice(0, 3) // Mostrar apenas os 3 primeiros para não sobrecarregar a descrição
            .map(p => `${format(p.startDate, 'dd/MM')} a ${format(p.endDate, 'dd/MM')}`)
            .join(', ');
          
          // Calcular ROI médio
          const totalWorkDays = fractionedOptions.periods.reduce((sum, p) => sum + p.workDays, 0);
          const totalNonWorkDays = fractionedOptions.periods.reduce((sum, p) => sum + p.weekendDays + p.holidayDays, 0);
          const avgWorkdayROI = totalWorkDays > 0 ? totalNonWorkDays / totalWorkDays : 0;
          
          // Criar recomendação
          recommendations.push({
            id: uuidv4(),
            type: 'optimal_fraction',
            title: `Fracionamento Ideal ${year}`,
            description: `${year}: Maximize sua eficiência em ${(fractionedOptions.efficiencyGain * 100).toFixed(0)}% dividindo suas férias em períodos estratégicos. ROI médio: ${avgWorkdayROI.toFixed(1)} dias não úteis por dia de férias. Exemplos: ${periodsDescription}. Esta estratégia é ideal para quem precisa de flexibilidade ao longo do ano.`,
            suggestedDateRange: {
              startDate: fractionedOptions.periods[0].startDate,
              endDate: fractionedOptions.periods[0].endDate
            },
            efficiencyGain: fractionedOptions.efficiencyGain,
            daysChanged: fractionedOptions.periods.reduce((sum, p) => sum + p.totalDays, 0),
            fractionedPeriods: fractionedOptions.periods,
            strategicScore: 9 // Alta pontuação para fracionamento ideal
          });
        }
      }
    });
    
    console.log(`Total de recomendações geradas pelo algoritmo principal: ${recommendations.length}`);
    
    // Verificar se temos pelo menos algumas recomendações
    if (recommendations.length === 0) {
      console.warn("Nenhuma recomendação gerada pelo algoritmo principal! Usando fallback...");
      return createFallbackRecommendations(currentYear);
    }
    
    // Filtrar para garantir que todas as recomendações tenham pelo menos 5 dias
    console.log(`Total de recomendações antes da filtragem por tamanho mínimo: ${recommendations.length}`);
    const filteredRecommendations = ensureMinimumVacationDays(recommendations);
    console.log(`Total de recomendações após a filtragem por tamanho mínimo: ${filteredRecommendations.length}`);
    
    // Se não houver recomendações válidas após a filtragem, retornar recomendações de fallback
    if (filteredRecommendations.length === 0) {
      console.warn("Nenhuma recomendação válida após filtragem! Usando fallback...");
      return createFallbackRecommendations(currentYear);
    }
    
    // Ordenar recomendações priorizando pontes e ordenando por eficiência
    filteredRecommendations.sort((a, b) => {
      // Primeiro ordenar por tipo (super_bridge e bridge têm prioridade)
      if ((a.type === 'super_bridge' || a.type === 'bridge') && 
          (b.type !== 'super_bridge' && b.type !== 'bridge')) {
        return -1;
      }
      if ((b.type === 'super_bridge' || b.type === 'bridge') && 
          (a.type !== 'super_bridge' && a.type !== 'bridge')) {
        return 1;
      }
      
      // Se ambos são do mesmo tipo ou não são pontes, ordenar por eficiência
      return b.efficiencyGain - a.efficiencyGain;
    });
    
    // Não limitar o número de recomendações
    return filteredRecommendations;
  } catch (error) {
    console.error("Erro ao gerar super otimizações:", error);
    return createFallbackRecommendations(currentYear);
  }
};

// Função auxiliar para garantir que todas as recomendações tenham pelo menos 5 dias
const ensureMinimumVacationDays = (recommendations: Recommendation[]): Recommendation[] => {
  console.log("[LOG] Iniciando verificação de tamanho mínimo para todas as recomendações...");
  
  // Filtrar recomendações com pelo menos 5 dias de duração
  const filtered = recommendations.filter(rec => {
    const startDate = rec.suggestedDateRange.startDate;
    const endDate = rec.suggestedDateRange.endDate;
    const totalDays = differenceInDays(endDate, startDate) + 1;
    
    console.log(`[LOG] Verificando recomendação: ${rec.title} - Período: ${format(startDate, 'dd/MM/yyyy')} a ${format(endDate, 'dd/MM/yyyy')} - Dias: ${totalDays}`);
    
    if (totalDays < 5) {
      console.log(`[LOG] REMOVENDO recomendação com apenas ${totalDays} dias: ${rec.title} - ${format(startDate, 'dd/MM/yyyy')} a ${format(endDate, 'dd/MM/yyyy')}`);
      return false;
    }
    return true;
  });
  
  console.log(`[LOG] Filtragem concluída: ${recommendations.length} recomendações originais, ${filtered.length} válidas após filtragem`);
  return filtered;
};

// Filter and sort all remaining recommendations by score
export const filterAndSortRecommendations = (recommendations: Recommendation[], maxRecommendations: number): Recommendation[] => {
  // Primeiro, garantir valores mínimos
  const validRecs = ensureMinimumVacationDays(recommendations);
  
  // Ordenar usando múltiplos critérios para garantir que as melhores recomendações apareçam primeiro
  return validRecs.sort((a, b) => {
    // Definir prioridade por tipo
    const typePriority: Record<string, number> = {
      'optimal_hybrid': 1,      // Prioridade máxima para híbridos otimizados
      'optimal_fraction': 2,    // Alta prioridade para fracionamento ótimo
      'super_bridge': 3,        // Alta prioridade para super pontes
      'hybrid_bridge_split': 4, // Alta prioridade para híbridos de ponte+fracionamento
      'hybrid': 5,              // Prioridade para híbridos comuns
      'bridge': 6,              // Prioridade para pontes regulares
      'split': 7,               // Prioridade média
      'shift': 8,               // Prioridade média-baixa
      'extend': 9,              // Prioridade baixa
      'error': 10,              // Prioridade mínima
      'optimize': 11            // Prioridade mínima
    };
    
    // Obter prioridade (usar 999 como fallback para tipos não definidos)
    const priorityA = typePriority[a.type] || 999;
    const priorityB = typePriority[b.type] || 999;
    
    // Primeiro ordenar por tipo de recomendação
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    // Se ambos são pontes ou super pontes, priorizar por pontuação estratégica
    if ((a.type === 'bridge' || a.type === 'super_bridge') && 
        (b.type === 'bridge' || b.type === 'super_bridge')) {
      if (a.strategicScore && b.strategicScore) {
        return b.strategicScore - a.strategicScore;
      }
    }
    
    // Para recomendações de mesmo tipo, usar pontuação estratégica se disponível
    if (a.strategicScore && b.strategicScore) {
      // Se a diferença for significativa
      if (Math.abs(a.strategicScore - b.strategicScore) > 0.5) {
        return b.strategicScore - a.strategicScore;
      }
    }
    
    // Para pontuações próximas ou inexistentes, priorizar por ganho de eficiência
    const efficiencyDiff = b.efficiencyGain - a.efficiencyGain;
    
    // Se os ganhos forem próximos, considerar a quantidade de dias alterados
    if (Math.abs(efficiencyDiff) < 0.05) {
      // Para ganhos similares, preferir alterações menores
      return a.daysChanged - b.daysChanged;
    }
    
    return efficiencyDiff;
  }).slice(0, maxRecommendations);
};

// Função para verificar se um período desperdiça dias formais de férias em dias não úteis
const checkForWastedVacationDays = (startDate: Date, endDate: Date): boolean => {
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    // Se encontrar um dia não útil (feriado ou fim de semana) dentro do período formal,
    // consideramos que há desperdício
    if (isWeekend(currentDate) || isHoliday(currentDate)) {
      return true;
    }
    currentDate = addDays(currentDate, 1);
  }
  
  return false;
};

// Função para contar feriados em dias úteis em um intervalo de datas
const countHolidaysOnWorkDays = (startDate: Date, endDate: Date): number => {
  let count = 0;
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    // Contabilizar apenas feriados que caem em dias úteis (não em finais de semana)
    if (isHoliday(currentDate) && !isWeekend(currentDate)) {
      count++;
    }
    currentDate = addDays(currentDate, 1);
  }
  
  return count;
};

/**
 * Calcula o ganho básico de feriados para um período (em porcentagem)
 * Esse é o ganho real em dias de folga: feriados em dias úteis ÷ dias úteis
 * @param period O período de férias ou o objeto com as datas de início e fim
 * @returns Porcentagem de ganho em dias de folga
 */
export const calculateHolidayGain = (period: VacationPeriod | { startDate: Date, endDate: Date }): number => {
  // Se recebemos um VacationPeriod completo, usamos seus dados
  if ('holidayDays' in period && 'workDays' in period) {
    return period.workDays > 0 ? Math.round((period.holidayDays / period.workDays) * 100) : 0;
  }
  
  // Caso contrário, precisamos calcular os dados do período
  const periodDetails = getVacationPeriodDetails(period.startDate, period.endDate);
  return periodDetails.workDays > 0 ? 
    Math.round((periodDetails.holidayDays / periodDetails.workDays) * 100) : 0;
};

// Função auxiliar para calcular períodos fracionados
const calculateFractionedPeriods = (startDate: Date, endDate: Date): VacationPeriod[] => {
  const totalDays = differenceInDays(endDate, startDate) + 1;
  const middlePoint = Math.floor(totalDays / 2);
  
  const midDate = addDays(startDate, middlePoint - 1);
  const firstPeriod = getVacationPeriodDetails(startDate, midDate);
  const secondPeriod = getVacationPeriodDetails(addDays(midDate, 1), endDate);
  
  return [firstPeriod, secondPeriod];
};

// Função para validar recomendações híbridas
const validateHybridRecommendation = (rec: Recommendation): boolean => {
  if (rec.suggestedDateRange.startDate > rec.suggestedDateRange.endDate) {
    console.log('Período principal inválido');
    return false;
  }

  if ((rec.type === 'hybrid' || rec.type === 'hybrid_bridge_split') &&
      (!rec.fractionedPeriods || rec.fractionedPeriods.length === 0)) {
    console.log('Recomendação híbrida sem períodos fracionados');
    return false;
  }

  if (rec.fractionedPeriods) {
    const invalidPeriods = rec.fractionedPeriods.filter(p => !p.isValid);
    if (invalidPeriods.length > 0) {
      console.log('Períodos fracionados inválidos encontrados');
      return false;
    }

    for (let i = 0; i < rec.fractionedPeriods.length; i++) {
      for (let j = i + 1; j < rec.fractionedPeriods.length; j++) {
        if (dateRangesOverlap(
          rec.fractionedPeriods[i].startDate,
          rec.fractionedPeriods[i].endDate,
          rec.fractionedPeriods[j].startDate,
          rec.fractionedPeriods[j].endDate
        )) {
          console.log('Sobreposição detectada entre períodos fracionados');
          return false;
        }
      }
    }
  }

  return true;
};
