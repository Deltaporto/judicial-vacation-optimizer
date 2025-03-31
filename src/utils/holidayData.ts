import { Holiday, HolidayType } from '../types';
import { isSameDay, parseISO } from 'date-fns';

// Lista de feriados nacionais e judiciais fixos
const nationalHolidays: Holiday[] = [
  // 2024
  { date: new Date(2024, 0, 1), name: 'Confraternização Universal', type: 'national' },
  { date: new Date(2024, 1, 12), name: 'Carnaval', type: 'national' },
  { date: new Date(2024, 1, 13), name: 'Carnaval', type: 'national' },
  { date: new Date(2024, 2, 29), name: 'Sexta-feira Santa', type: 'national' },
  { date: new Date(2024, 3, 21), name: 'Tiradentes', type: 'national' },
  { date: new Date(2024, 4, 1), name: 'Dia do Trabalho', type: 'national' },
  { date: new Date(2024, 5, 30), name: 'Corpus Christi', type: 'national' }, 
  { date: new Date(2024, 8, 7), name: 'Independência do Brasil', type: 'national' },
  { date: new Date(2024, 9, 12), name: 'Nossa Senhora Aparecida', type: 'national' },
  { date: new Date(2024, 10, 2), name: 'Finados', type: 'national' },
  { date: new Date(2024, 10, 15), name: 'Proclamação da República', type: 'national' },
  { date: new Date(2024, 11, 25), name: 'Natal', type: 'national' },
  // 2025
  { date: new Date(2025, 0, 1), name: 'Confraternização Universal', type: 'national' },
  { date: new Date(2025, 2, 3), name: 'Carnaval', type: 'national' }, 
  { date: new Date(2025, 2, 4), name: 'Carnaval', type: 'national' }, 
  { date: new Date(2025, 3, 18), name: 'Sexta-feira Santa', type: 'national' }, 
  { date: new Date(2025, 3, 21), name: 'Tiradentes', type: 'national' },
  { date: new Date(2025, 4, 1), name: 'Dia do Trabalho', type: 'national' },
  { date: new Date(2025, 5, 19), name: 'Corpus Christi', type: 'national' }, 
  { date: new Date(2025, 8, 7), name: 'Independência do Brasil', type: 'national' },
  { date: new Date(2025, 9, 12), name: 'Nossa Senhora Aparecida', type: 'national' },
  { date: new Date(2025, 10, 2), name: 'Finados', type: 'national' },
  { date: new Date(2025, 10, 15), name: 'Proclamação da República', type: 'national' },
  { date: new Date(2025, 11, 25), name: 'Natal', type: 'national' },
  // 2026
  { date: new Date(2026, 0, 1), name: 'Confraternização Universal', type: 'national' },
  { date: new Date(2026, 1, 16), name: 'Carnaval', type: 'national' }, 
  { date: new Date(2026, 1, 17), name: 'Carnaval', type: 'national' }, 
  { date: new Date(2026, 3, 3), name: 'Sexta-feira Santa', type: 'national' }, 
  { date: new Date(2026, 3, 21), name: 'Tiradentes', type: 'national' },
  { date: new Date(2026, 4, 1), name: 'Dia do Trabalho', type: 'national' },
  { date: new Date(2026, 5, 4), name: 'Corpus Christi', type: 'national' }, 
  { date: new Date(2026, 8, 7), name: 'Independência do Brasil', type: 'national' },
  { date: new Date(2026, 9, 12), name: 'Nossa Senhora Aparecida', type: 'national' },
  { date: new Date(2026, 10, 2), name: 'Finados', type: 'national' },
  { date: new Date(2026, 10, 15), name: 'Proclamação da República', type: 'national' },
  { date: new Date(2026, 11, 25), name: 'Natal', type: 'national' },
];

const judicialHolidays: Holiday[] = [
  // 2024
  { date: new Date(2024, 0, 31), name: 'Dia da Justiça Federal', type: 'judicial' }, 
  { date: new Date(2024, 7, 11), name: 'Dia do Advogado', type: 'judicial' }, 
  { date: new Date(2024, 9, 31), name: 'Dia do Servidor Público', type: 'judicial' }, 
  { date: new Date(2024, 11, 8), name: 'Dia da Justiça', type: 'judicial' }, 
  // 2025
  { date: new Date(2025, 0, 31), name: 'Dia da Justiça Federal', type: 'judicial' }, 
  { date: new Date(2025, 7, 11), name: 'Dia do Advogado', type: 'judicial' }, 
  { date: new Date(2025, 9, 28), name: 'Dia do Servidor Público', type: 'judicial' }, 
  { date: new Date(2025, 11, 8), name: 'Dia da Justiça', type: 'judicial' }, 
  // 2026
  { date: new Date(2026, 0, 31), name: 'Dia da Justiça Federal', type: 'judicial' }, 
  { date: new Date(2026, 7, 11), name: 'Dia do Advogado', type: 'judicial' }, 
  { date: new Date(2026, 9, 28), name: 'Dia do Servidor Público', type: 'judicial' }, 
  { date: new Date(2026, 11, 8), name: 'Dia da Justiça', type: 'judicial' }, 
];

// Função para gerar feriados do recesso forense
const getRecessHolidays = (year: number): Holiday[] => {
  const recessHolidays: Holiday[] = [];
  // Período de 20 de dezembro a 6 de janeiro
  
  // Dezembro do ano anterior ao recesso
  for (let day = 20; day <= 31; day++) {
    recessHolidays.push({
      date: new Date(year - 1, 11, day),
      name: 'Recesso Forense',
      type: 'recess'
    });
  }
  
  // Janeiro do ano do recesso
  for (let day = 1; day <= 6; day++) {
    recessHolidays.push({
      date: new Date(year, 0, day),
      name: 'Recesso Forense',
      type: 'recess'
    });
  }
  
  return recessHolidays;
};

// Lista mutável para feriados personalizados (ex: locais)
let customHolidays: Holiday[] = [];

/**
 * Obtém todos os feriados (nacionais, judiciais, recesso e personalizados)
 * para um determinado ano.
 * @param year O ano para o qual obter os feriados.
 * @returns Uma lista de todos os feriados relevantes para o ano.
 */
export const getAllHolidaysForYear = (year: number): Holiday[] => {
  const yearNational = nationalHolidays.filter(h => h.date.getFullYear() === year);
  const yearJudicial = judicialHolidays.filter(h => h.date.getFullYear() === year);
  const yearRecess = getRecessHolidays(year);
  const yearCustom = customHolidays.filter(h => h.date.getFullYear() === year);
  
  // Combina e remove duplicatas (pode haver sobreposição entre custom e outros)
  const combined = [...yearNational, ...yearJudicial, ...yearRecess, ...yearCustom];
  const uniqueHolidays: Holiday[] = [];
  const seenDates = new Set<number>();
  
  for (const holiday of combined) {
    const dateKey = new Date(holiday.date.getFullYear(), holiday.date.getMonth(), holiday.date.getDate()).getTime();
    if (!seenDates.has(dateKey)) {
      uniqueHolidays.push(holiday);
      seenDates.add(dateKey);
    }
  }
  
  return uniqueHolidays;
};

/**
 * Adiciona um feriado personalizado à lista.
 * @param holiday O feriado a ser adicionado.
 */
export const addCustomHoliday = (holiday: Holiday): void => {
  // Validar se a data já existe para evitar duplicatas exatas
  if (!customHolidays.some(h => isSameDay(h.date, holiday.date))) {
    customHolidays.push(holiday);
  }
};

/**
 * Remove um feriado personalizado da lista pela data.
 * @param date A data do feriado a ser removido.
 */
export const removeCustomHoliday = (date: Date): void => {
  // Corrigido: Comparar usando isSameDay
  customHolidays = customHolidays.filter(h => !isSameDay(h.date, date));
};

/**
 * Limpa todos os feriados personalizados.
 */
export const clearCustomHolidays = (): void => {
  customHolidays = [];
};

/**
 * Atualiza a lista completa de feriados personalizados.
 * Use com cuidado, pois substitui todos os feriados customizados existentes.
 * @param holidays A nova lista de feriados personalizados.
 */
export const updateCustomHolidays = (holidays: Holiday[]): void => {
  console.log('Atualizando customHolidays com:', holidays);
  customHolidays = [...holidays]; // Substitui a lista atual pela nova
};

/**
 * Retorna a lista atual de feriados personalizados.
 */
export const getCustomHolidays = (): Holiday[] => {
  return [...customHolidays]; // Retorna uma cópia
};

/**
 * Verifica se uma determinada data é feriado (considerando todos os tipos).
 * @param date A data a ser verificada.
 * @returns True se for feriado, False caso contrário.
 */
export const isHoliday = (date: Date): boolean => {
  const year = date.getFullYear();
  const allHolidays = getAllHolidaysForYear(year);
  
  // Corrigido: Comparar usando isSameDay
  return allHolidays.some(holiday => isSameDay(holiday.date, date));
};

/**
 * Obtém uma lista de feriados dentro de um intervalo de datas.
 * @param startDate Data de início do intervalo.
 * @param endDate Data de fim do intervalo.
 * @returns Uma lista de feriados dentro do intervalo.
 */
export const getHolidaysInRange = (startDate: Date, endDate: Date): Holiday[] => {
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();
  let holidaysInRange: Holiday[] = [];

  // Coleta feriados para todos os anos abrangidos pelo intervalo
  for (let year = startYear; year <= endYear; year++) {
    holidaysInRange.push(...getAllHolidaysForYear(year));
  }

  // Filtra para incluir apenas feriados dentro do intervalo exato
  // Normaliza as datas para comparar apenas dia/mês/ano
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

  return holidaysInRange.filter(holiday => {
    const holidayDateOnly = new Date(holiday.date.getFullYear(), holiday.date.getMonth(), holiday.date.getDate());
    return holidayDateOnly >= start && holidayDateOnly <= end;
  });
};

/**
 * Verifica se uma data é fim de semana.
 * @param date A data a ser verificada.
 * @returns True se for sábado ou domingo, False caso contrário.
 */
export const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 = Domingo, 6 = Sábado
};
