import { Holiday, HolidayType } from '../types';

// Função para verificar se uma data é feriado
export function isHolidayFixed(date: Date): boolean {
  const holidays = getHolidaysInRangeFixed(
    new Date(date.getFullYear(), 0, 1),
    new Date(date.getFullYear(), 11, 31)
  );
  
  // Normalizar a data para comparar apenas dia, mês e ano
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  return holidays.some(holiday => 
    new Date(holiday.date.getFullYear(), holiday.date.getMonth(), holiday.date.getDate()).getTime() === targetDate.getTime()
  );
}

// Função para verificar se uma data é fim de semana
export function isWeekendFixed(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

// Função para obter feriados em um intervalo de datas
export function getHolidaysInRangeFixed(startDate: Date, endDate: Date): Holiday[] {
  // Definir o tipo padrão como 'national'
  const defaultType: HolidayType = 'national'; 
  
  const holidays: Holiday[] = [
    { date: new Date(2024, 0, 1), name: 'Ano Novo', type: defaultType },
    { date: new Date(2024, 1, 12), name: 'Carnaval', type: defaultType },
    { date: new Date(2024, 1, 13), name: 'Carnaval', type: defaultType },
    { date: new Date(2024, 2, 29), name: 'Sexta-feira Santa', type: defaultType },
    { date: new Date(2024, 3, 21), name: 'Tiradentes', type: defaultType },
    { date: new Date(2024, 4, 1), name: 'Dia do Trabalho', type: defaultType },
    { date: new Date(2024, 5, 30), name: 'Corpus Christi', type: defaultType },
    { date: new Date(2024, 8, 7), name: 'Independência do Brasil', type: defaultType },
    { date: new Date(2024, 9, 12), name: 'Nossa Senhora Aparecida', type: defaultType },
    { date: new Date(2024, 10, 2), name: 'Finados', type: defaultType },
    { date: new Date(2024, 10, 15), name: 'Proclamação da República', type: defaultType },
    { date: new Date(2024, 11, 25), name: 'Natal', type: defaultType }
  ];

  // Normalizar datas para comparação
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

  return holidays.filter(holiday => {
    const holidayDateOnly = new Date(holiday.date.getFullYear(), holiday.date.getMonth(), holiday.date.getDate());
    return holidayDateOnly >= start && holidayDateOnly <= end;
  });
} 