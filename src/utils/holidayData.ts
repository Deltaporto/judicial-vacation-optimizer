
import { Holiday } from '@/types';

// National holidays for 2024-2026
export const nationalHolidays: Holiday[] = [
  // 2024
  { date: '2024-01-01', name: 'Confraternização Universal', type: 'national' },
  { date: '2024-02-12', name: 'Carnaval', type: 'national' },
  { date: '2024-02-13', name: 'Carnaval', type: 'national' },
  { date: '2024-03-29', name: 'Sexta-feira Santa', type: 'national' },
  { date: '2024-04-21', name: 'Tiradentes', type: 'national' },
  { date: '2024-05-01', name: 'Dia do Trabalho', type: 'national' },
  { date: '2024-05-30', name: 'Corpus Christi', type: 'national' },
  { date: '2024-09-07', name: 'Independência do Brasil', type: 'national' },
  { date: '2024-10-12', name: 'Nossa Senhora Aparecida', type: 'national' },
  { date: '2024-11-02', name: 'Finados', type: 'national' },
  { date: '2024-11-15', name: 'Proclamação da República', type: 'national' },
  { date: '2024-12-25', name: 'Natal', type: 'national' },
  
  // 2025
  { date: '2025-01-01', name: 'Confraternização Universal', type: 'national' },
  { date: '2025-03-03', name: 'Carnaval', type: 'national' },
  { date: '2025-03-04', name: 'Carnaval', type: 'national' },
  { date: '2025-04-18', name: 'Sexta-feira Santa', type: 'national' },
  { date: '2025-04-21', name: 'Tiradentes', type: 'national' },
  { date: '2025-05-01', name: 'Dia do Trabalho', type: 'national' },
  { date: '2025-06-19', name: 'Corpus Christi', type: 'national' },
  { date: '2025-09-07', name: 'Independência do Brasil', type: 'national' },
  { date: '2025-10-12', name: 'Nossa Senhora Aparecida', type: 'national' },
  { date: '2025-11-02', name: 'Finados', type: 'national' },
  { date: '2025-11-15', name: 'Proclamação da República', type: 'national' },
  { date: '2025-12-25', name: 'Natal', type: 'national' },
  
  // 2026
  { date: '2026-01-01', name: 'Confraternização Universal', type: 'national' },
  { date: '2026-02-16', name: 'Carnaval', type: 'national' },
  { date: '2026-02-17', name: 'Carnaval', type: 'national' },
  { date: '2026-04-03', name: 'Sexta-feira Santa', type: 'national' },
  { date: '2026-04-21', name: 'Tiradentes', type: 'national' },
  { date: '2026-05-01', name: 'Dia do Trabalho', type: 'national' },
  { date: '2026-06-04', name: 'Corpus Christi', type: 'national' },
  { date: '2026-09-07', name: 'Independência do Brasil', type: 'national' },
  { date: '2026-10-12', name: 'Nossa Senhora Aparecida', type: 'national' },
  { date: '2026-11-02', name: 'Finados', type: 'national' },
  { date: '2026-11-15', name: 'Proclamação da República', type: 'national' },
  { date: '2026-12-25', name: 'Natal', type: 'national' },
];

// Judicial specific holidays
export const judicialHolidays: Holiday[] = [
  // 2024
  { date: '2024-01-31', name: 'Dia da Justiça Federal', type: 'judicial' },
  { date: '2024-08-11', name: 'Dia do Advogado', type: 'judicial' },
  { date: '2024-10-31', name: 'Dia do Servidor Público', type: 'judicial' },
  { date: '2024-12-08', name: 'Dia da Justiça', type: 'judicial' },
  
  // 2025
  { date: '2025-01-31', name: 'Dia da Justiça Federal', type: 'judicial' },
  { date: '2025-08-11', name: 'Dia do Advogado', type: 'judicial' },
  { date: '2025-10-28', name: 'Dia do Servidor Público', type: 'judicial' },
  { date: '2025-12-08', name: 'Dia da Justiça', type: 'judicial' },
  
  // 2026
  { date: '2026-01-31', name: 'Dia da Justiça Federal', type: 'judicial' },
  { date: '2026-08-11', name: 'Dia do Advogado', type: 'judicial' },
  { date: '2026-10-28', name: 'Dia do Servidor Público', type: 'judicial' },
  { date: '2026-12-08', name: 'Dia da Justiça', type: 'judicial' },
];

// Function to generate recess periods for multiple years
export const generateRecessPeriods = (startYear: number, endYear: number): Holiday[] => {
  const recessPeriods: Holiday[] = [];
  
  for (let year = startYear; year <= endYear; year++) {
    // End of previous year to beginning of current year
    for (let day = 20; day <= 31; day++) {
      recessPeriods.push({
        date: `${year-1}-12-${day.toString().padStart(2, '0')}`,
        name: 'Recesso Forense',
        type: 'recess'
      });
    }
    
    // Beginning of current year
    for (let day = 1; day <= 6; day++) {
      recessPeriods.push({
        date: `${year}-01-${day.toString().padStart(2, '0')}`,
        name: 'Recesso Forense',
        type: 'recess'
      });
    }
  }
  
  return recessPeriods;
};

// Generate recess periods for 2024-2026
export const recessPeriods: Holiday[] = generateRecessPeriods(2024, 2027);

// All holidays combined
export const allHolidays: Holiday[] = [
  ...nationalHolidays, 
  ...judicialHolidays, 
  ...recessPeriods
];

// Function to check if a date is a holiday
export const isHoliday = (date: Date): Holiday | undefined => {
  const dateStr = date.toISOString().split('T')[0];
  return allHolidays.find(holiday => holiday.date === dateStr);
};

// Function to check if a date is a weekend
export const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

// Function to get holidays in a date range
export const getHolidaysInRange = (startDate: Date, endDate: Date): Holiday[] => {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  
  return allHolidays.filter(holiday => {
    const holidayDate = new Date(holiday.date);
    return holidayDate >= start && holidayDate <= end;
  });
};
