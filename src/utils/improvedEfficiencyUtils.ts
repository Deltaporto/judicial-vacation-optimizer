import { addDays, differenceInDays, format, isBefore, isSameDay, getDay, getYear, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { v4 as uuidv4 } from 'uuid';
import { isHoliday as isHolidayDefault, isWeekend as isWeekendDefault, getHolidaysInRange as getHolidaysInRangeDefault } from './holidayData';
import { VacationPeriod, Holiday, Recommendation } from '../types';

// 1. Flexibilização dos dias de início das férias
const dayWeights = {
  0: 0.9,  // Domingo
  1: 1.0,  // Segunda
  2: 0.8,  // Terça
  3: 0.7,  // Quarta
  4: 0.9,  // Quinta
  5: 1.1,  // Sexta
  6: 0.8   // Sábado
};

// 2. Análise específica para feriados em diferentes dias da semana
function classifyHolidayByWeekday(date: Date): number {
  const day = date.getDay();
  // Terças e quintas são estratégicas para pontes
  if (day === 2 || day === 4) return 2;
  // Segunda e sexta estendem fim de semana
  if (day === 1 || day === 5) return 1.5;
  // Quarta no meio da semana
  if (day === 3) return 1;
  // Fins de semana não adicionam valor estratégico
  return 0;
}

interface ExtendableHoliday {
  date: Date;
  name: string;
  extensionDays: number;
  extensionEfficiency: number;
}

function findExtendableHolidays(year: number): ExtendableHoliday[] {
  const holidays = getHolidaysInRangeDefault(
    new Date(year, 0, 1),
    new Date(year, 11, 31)
  );

  return holidays.map(holiday => {
    const date = new Date(holiday.date);
    const weekday = date.getDay();
    const extensionDays = calculateExtensionDays(weekday);
    return {
      date,
      name: holiday.name,
      extensionDays,
      extensionEfficiency: calculateExtensionEfficiency(weekday, extensionDays)
    };
  }).filter(h => h.extensionEfficiency > 1.2);
}

function calculateExtensionDays(weekday: number): number {
  switch (weekday) {
    case 2: // Terça
      return 1; // Segunda
    case 3: // Quarta
      return 2; // Segunda e terça
    case 4: // Quinta
      return 1; // Sexta
    case 1: // Segunda
    case 5: // Sexta
      return 0; // Não precisa extensão
    default:
      return 0;
  }
}

function calculateExtensionEfficiency(weekday: number, extensionDays: number): number {
  if (extensionDays === 0) return 1.0;
  
  // Base efficiency is higher for strategic days
  const baseEfficiency = classifyHolidayByWeekday(new Date(0, 0, weekday)) / extensionDays;
  
  // Bonus for creating long weekends
  if ((weekday === 2 && extensionDays === 1) || // Segunda + Terça
      (weekday === 4 && extensionDays === 1)) { // Quinta + Sexta
    return baseEfficiency * 1.5;
  }
  
  return baseEfficiency;
}

// 3. Evitar períodos que incluam feriados
function verificarFeriadosNoPeriodo(startDate: Date, endDate: Date): boolean {
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    if (isHolidayDefault(currentDate)) {
      return true;
    }
    currentDate = addDays(currentDate, 1);
  }
  return false;
}

function countHolidaysInPeriod(startDate: Date, endDate: Date): number {
  let count = 0;
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    if (isHolidayDefault(currentDate)) {
      count++;
    }
    currentDate = addDays(currentDate, 1);
  }
  return count;
}

// 4. Otimizações específicas para Carnaval e outros feriados especiais
interface SpecialHoliday {
  name: string;
  getDate: (year: number) => Date;
  extendBefore: number;
  extendAfter: number;
  strategicValue: number;
}

const specialHolidays: SpecialHoliday[] = [
  {
    name: "Carnaval",
    getDate: (year: number) => calculateCarnavalDate(year),
    extendBefore: 2,
    extendAfter: 1,
    strategicValue: 2.5
  },
  // Outros feriados especiais podem ser adicionados aqui
];

function calculateCarnavalDate(year: number): Date {
  // Implementação simplificada - em produção usar biblioteca específica
  // Carnaval é 47 dias antes da Páscoa
  const easter = calculateEasterDate(year);
  return addDays(easter, -47);
}

function calculateEasterDate(year: number): Date {
  // Implementação do algoritmo de Meeus/Jones/Butcher
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  
  return new Date(year, month - 1, day);
}

// Funções auxiliares
function countWorkDays(
  startDate: Date,
  endDate: Date,
  isHoliday: (date: Date) => boolean,
  isWeekend: (date: Date) => boolean
): number {
  let workDays = 0;
  let currentDate = new Date(startDate);
  
  while (isBefore(currentDate, endDate) || isSameDay(currentDate, endDate)) {
    if (!isWeekend(currentDate) && !isHoliday(currentDate)) {
      workDays++;
    }
    currentDate = addDays(currentDate, 1);
  }
  
  return workDays;
}

function countHolidayDays(
  startDate: Date,
  endDate: Date,
  isHoliday: (date: Date) => boolean
): number {
  let holidayDays = 0;
  let currentDate = new Date(startDate);
  
  while (isBefore(currentDate, endDate) || isSameDay(currentDate, endDate)) {
    if (isHoliday(currentDate)) {
      holidayDays++;
    }
    currentDate = addDays(currentDate, 1);
  }
  
  return holidayDays;
}

function countWeekendDays(
  startDate: Date,
  endDate: Date,
  isWeekend: (date: Date) => boolean
): number {
  let weekendDays = 0;
  let currentDate = new Date(startDate);
  
  while (isBefore(currentDate, endDate) || isSameDay(currentDate, endDate)) {
    if (isWeekend(currentDate)) {
      weekendDays++;
    }
    currentDate = addDays(currentDate, 1);
  }
  
  return weekendDays;
}

function countWastedDays(
  startDate: Date,
  endDate: Date,
  isHoliday: (date: Date) => boolean,
  isWeekend: (date: Date) => boolean
): number {
  let wastedDays = 0;
  let currentDate = new Date(startDate);
  
  while (isBefore(currentDate, endDate) || isSameDay(currentDate, endDate)) {
    if (isHoliday(currentDate) || isWeekend(currentDate)) {
      wastedDays++;
    }
    currentDate = addDays(currentDate, 1);
  }
  
  return wastedDays;
}

function findCleanPeriods(
  startDate: Date,
  endDate: Date,
  isHoliday: (date: Date) => boolean,
  isWeekend: (date: Date) => boolean
): Array<{ startDate: Date; endDate: Date }> {
  const cleanPeriods: Array<{ startDate: Date; endDate: Date }> = [];
  let currentDate = new Date(startDate);
  
  while (isBefore(currentDate, endDate)) {
    // Procurar períodos que começam em segunda-feira
    if (getDay(currentDate) === 1 && !isHoliday(currentDate)) {
      let periodEnd = addDays(currentDate, 4); // Até sexta-feira
      let isClean = true;
      let checkDate = new Date(currentDate);
      
      // Verificar se há feriados no período
      while (isBefore(checkDate, periodEnd) || isSameDay(checkDate, periodEnd)) {
        if (isHoliday(checkDate)) {
          isClean = false;
          break;
        }
        checkDate = addDays(checkDate, 1);
      }
      
      if (isClean) {
        cleanPeriods.push({
          startDate: new Date(currentDate),
          endDate: new Date(periodEnd)
        });
      }
    }
    currentDate = addDays(currentDate, 1);
  }
  
  return cleanPeriods;
}

// Função principal de cálculo de eficiência melhorada
export function calculateImprovedEfficiency(
  startDate: Date,
  endDate: Date,
  isHoliday: (date: Date) => boolean,
  isWeekend: (date: Date) => boolean
): number {
  const totalDays = differenceInDays(endDate, startDate) + 1;
  const workDays = countWorkDays(startDate, endDate, isHoliday, isWeekend);
  const holidayDays = countHolidayDays(startDate, endDate, isHoliday);
  const weekendDays = countWeekendDays(startDate, endDate, isWeekend);
  const wastedDays = countWastedDays(startDate, endDate, isHoliday, isWeekend);

  // Penalidade base para feriados (aumentada para 0.5)
  const holidayPenalty = 0.5;
  
  // Penalidade adicional para feriados consecutivos
  const consecutiveHolidayPenalty = 0.2;
  let consecutiveHolidays = 0;
  let currentDate = startDate;
  
  while (isBefore(currentDate, endDate) || isSameDay(currentDate, endDate)) {
    if (isHoliday(currentDate)) {
      consecutiveHolidays++;
    } else {
      consecutiveHolidays = 0;
    }
    currentDate = addDays(currentDate, 1);
  }

  // Calcula a eficiência base
  let efficiency = 1.0;

  // Aplica bônus para períodos que começam na segunda-feira
  if (getDay(startDate) === 1) {
    efficiency += 0.1;
  }

  // Aplica bônus para períodos que terminam na sexta-feira
  if (getDay(endDate) === 5) {
    efficiency += 0.1;
  }

  // Aplica penalidades para feriados
  if (holidayDays > 0) {
    efficiency -= holidayDays * holidayPenalty;
    if (consecutiveHolidays > 1) {
      efficiency -= (consecutiveHolidays - 1) * consecutiveHolidayPenalty;
    }
  }

  // Normaliza a eficiência para evitar valores negativos
  efficiency = Math.max(0.1, efficiency);
  
  // Limita a eficiência máxima
  efficiency = Math.min(1.5, efficiency);

  return efficiency;
}

// Função para gerar recomendações otimizadas
export function generateImprovedRecommendations(
  vacationPeriod: VacationPeriod,
  isHolidayParam?: (date: Date) => boolean,
  isWeekendParam?: (date: Date) => boolean,
  getHolidaysInRangeParam?: (start: Date, end: Date) => Holiday[]
): Recommendation[] {
  // Use parameters if provided, otherwise use imported defaults
  const isHoliday = isHolidayParam ?? isHolidayDefault;
  const isWeekend = isWeekendParam ?? isWeekendDefault;
  const getHolidaysInRange = getHolidaysInRangeParam ?? getHolidaysInRangeDefault;

  const recommendations: Recommendation[] = [];
  const startYear = getYear(vacationPeriod.startDate);
  const yearStart = new Date(startYear, 0, 1);
  const yearEnd = new Date(startYear, 11, 31);
  
  // Obtém todos os feriados do ano
  const holidays = getHolidaysInRange(yearStart, yearEnd);

  // Processa cada feriado para gerar recomendações
  holidays.forEach(holiday => {
    const holidayDate = new Date(holiday.date);
    const weekday = getDay(holidayDate);
    
    // Só processa feriados que caem em dias úteis
    if (weekday >= 1 && weekday <= 5) {
      let startDate: Date;
      let endDate: Date;
      let description: string;
      let extensionDays = 0;

      switch(weekday) {
        case 1: // Segunda-feira
          startDate = subDays(holidayDate, 3);
          endDate = addDays(holidayDate, 0);
          description = `Emendar com o final de semana anterior ao feriado de ${holiday.name}`;
          extensionDays = 1;
          break;
        case 2: // Terça-feira
          startDate = subDays(holidayDate, 1);
          endDate = holidayDate;
          description = `Emendar a segunda-feira com o feriado de ${holiday.name}`;
          extensionDays = 1;
          break;
        case 4: // Quinta-feira
          startDate = holidayDate;
          endDate = addDays(holidayDate, 1);
          description = `Emendar a sexta-feira com o feriado de ${holiday.name}`;
          extensionDays = 1;
          break;
        case 5: // Sexta-feira
          startDate = holidayDate;
          endDate = addDays(holidayDate, 2);
          description = `Emendar com o final de semana após o feriado de ${holiday.name}`;
          extensionDays = 0;
          break;
        default:
          return; // Não gera recomendação para quarta-feira
      }

      const efficiency = calculateImprovedEfficiency(startDate, endDate, isHoliday, isWeekend);
      const strategicScore = efficiency * (1 + extensionDays * 0.2);

      recommendations.push({
        id: uuidv4(),
        type: 'holiday_extension',
        title: `Extensão do ${holiday.name}`,
        description,
        suggestedDateRange: {
          startDate,
          endDate
        },
        efficiencyGain: efficiency,
        daysChanged: differenceInDays(endDate, startDate) + 1,
        strategicScore
      });
    }
  });

  // Adiciona recomendações para períodos limpos (sem feriados)
  const cleanPeriods = findCleanPeriods(yearStart, yearEnd, isHoliday, isWeekend);
  cleanPeriods.forEach(period => {
    const efficiency = calculateImprovedEfficiency(period.startDate, period.endDate, isHoliday, isWeekend);
    recommendations.push({
      id: uuidv4(),
      type: 'clean_period',
      title: 'Período Livre de Feriados',
      description: 'Período sem feriados - ideal para férias planejadas',
      suggestedDateRange: {
        startDate: period.startDate,
        endDate: period.endDate
      },
      efficiencyGain: efficiency,
      daysChanged: differenceInDays(period.endDate, period.startDate) + 1,
      strategicScore: efficiency
    });
  });

  // Ordena as recomendações por pontuação estratégica
  return recommendations.sort((a, b) => b.strategicScore - a.strategicScore);
}

// ========================================================
// FUNÇÃO PARA ENCONTRAR OTIMIZAÇÕES ANUAIS (SUPER)
// ========================================================

// Importar a função findPotentialBridges de efficiencyUtils
// @ts-ignore: Ignorar erro de importação fora do topo
import { findPotentialBridges } from './efficiencyUtils';
// Importar funções de dateUtils
// @ts-ignore: Ignorar erro de importação fora do topo
import { getVacationPeriodDetails, formatDate } from './dateUtils';


/**
 * Encontra os melhores períodos de férias potenciais (Super Otimizações) para um ano específico,
 * focando em pontes, feriados estratégicos e recesso.
 * 
 * @param year O ano para análise.
 * @returns Uma lista das melhores recomendações encontradas.
 */
export function findYearlyOptimizations(
  year: number
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const yearStartDate = new Date(year, 0, 1);
  const yearEndDate = new Date(year, 11, 31);

  console.log(`[findYearlyOptimizations] Iniciando análise para ${year}`);

  // 1. Encontrar Pontes Potenciais
  try {
    console.log(`[findYearlyOptimizations] Buscando pontes potenciais...`);
    const potentialBridges = findPotentialBridges(year);
    console.log(`[findYearlyOptimizations] Encontradas ${potentialBridges.length} pontes potenciais.`);

    potentialBridges.forEach(bridge => {
      const periodDetails = getVacationPeriodDetails(bridge.startDate, bridge.endDate);
      console.log(`[findYearlyOptimizations] Verificando Ponte: ${formatDate(bridge.startDate)} a ${formatDate(bridge.endDate)}, Score: ${bridge.strategicScore}, Válido: ${periodDetails.isValid}, Dias Úteis: ${periodDetails.workDays}`);
      if (periodDetails.workDays > 0) { 
        console.log(`[findYearlyOptimizations] -> Adicionando recomendação para ponte.`);
        recommendations.push({
          id: uuidv4(),
          type: bridge.strategicScore > 8.0 ? 'super_bridge' : 'bridge',
          title: `Ponte Estratégica (${periodDetails.workDays}d)`,
          description: `Aproveite ${periodDetails.totalDays} dias de descanso usando apenas ${periodDetails.workDays} dias de férias entre ${formatDate(bridge.startDate)} e ${formatDate(bridge.endDate)}. Ideal para conectar feriados ou fins de semana.`, 
          suggestedDateRange: { startDate: bridge.startDate, endDate: bridge.endDate },
          efficiencyGain: periodDetails.efficiency,
          daysChanged: periodDetails.totalDays,
          strategicScore: bridge.strategicScore,
        });
      } else {
          console.log(`[findYearlyOptimizations] -> Rejeitando ponte. Motivo: DiasÚteis=${periodDetails.workDays}`);
      }
    });
  } catch (error) {
    console.error("[findYearlyOptimizations] Erro ao buscar pontes:", error);
  }

  // 2. Analisar Feriados Especiais
  try {
    console.log(`[findYearlyOptimizations] Analisando feriados especiais...`);
    specialHolidays.forEach(special => {
      const holidayDate = special.getDate(year);
      const startDate = subDays(holidayDate, special.extendBefore);
      const endDate = addDays(holidayDate, special.extendAfter);
      const periodDetails = getVacationPeriodDetails(startDate, endDate);

      if (periodDetails.isValid && periodDetails.workDays > 0) { // Removido o uso de minStrategicScore
        recommendations.push({
          id: uuidv4(),
          type: 'optimize',
          title: `Otimização ${special.name} (${periodDetails.workDays}d)`,
          description: `Maximize o feriado de ${special.name}! Descanse ${periodDetails.totalDays} dias usando ${periodDetails.workDays} dias de férias de ${formatDate(startDate)} a ${formatDate(endDate)}.`, 
          suggestedDateRange: { startDate, endDate },
          efficiencyGain: periodDetails.efficiency,
          daysChanged: periodDetails.totalDays,
          strategicScore: special.strategicValue,
        });
      }
    });
  } catch (error) {
    console.error("[findYearlyOptimizations] Erro ao analisar feriados especiais:", error);
  }

  // 3. Identificar Recesso Forense
  try {
    console.log(`[findYearlyOptimizations] Identificando recesso forense...`);
    const recessStart = new Date(year, 0, 1); // Recesso começa em 1 de janeiro
    const recessEnd = new Date(year, 0, 6);   // Recesso termina em 6 de janeiro
    const recessPeriod = getVacationPeriodDetails(recessStart, recessEnd);
    const recessStrategicScore = 7.0; // Score fixo para o recesso

    if (recessPeriod.isValid) { // Removido o uso de minStrategicScore
        recommendations.push({
          id: uuidv4(),
          type: 'recess', 
          title: `Recesso Forense (${recessPeriod.totalDays}d)`,
          description: `O período oficial de recesso forense vai de ${formatDate(recessStart)} a ${formatDate(recessEnd)}. Avalie emendar com férias para um descanso prolongado.`, 
          suggestedDateRange: { startDate: recessStart, endDate: recessEnd },
          efficiencyGain: 1.0, // Não há ganho direto, pois não são dias de férias
          daysChanged: recessPeriod.totalDays,
          strategicScore: recessStrategicScore,
        });
    }

  } catch (error) {
      console.error("[findYearlyOptimizations] Erro ao identificar recesso:", error);
  }

  // 4. Filtrar e Ordenar
  console.log(`[findYearlyOptimizations] Total de recomendações antes de ordenar: ${recommendations.length}`);
  const sortedRecommendations = recommendations.sort((a, b) => (b.strategicScore ?? 0) - (a.strategicScore ?? 0));
  
  console.log(`[findYearlyOptimizations] Retornando todas as recomendações.`);
  return sortedRecommendations;
} 