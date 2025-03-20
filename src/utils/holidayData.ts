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

// Estado para armazenar feriados personalizados/importados
let customHolidays: Holiday[] = [];

// All holidays combined
export const getAllHolidays = (): Holiday[] => {
  const nacionais = [...nationalHolidays];
  const judiciais = [...judicialHolidays];
  const recesso = [...recessPeriods];
  const custom = [...customHolidays];
  
  // Apenas para depuração, se necessário
  // console.log(`[getAllHolidays] Feriados nacionais: ${nacionais.length}`);
  // console.log(`[getAllHolidays] Feriados judiciais: ${judiciais.length}`);
  // console.log(`[getAllHolidays] Períodos de recesso: ${recesso.length}`);
  // console.log(`[getAllHolidays] Feriados personalizados: ${custom.length}`);
  
  // Verificar explicitamente por feriados municipais
  const municipalHolidays = custom.filter(h => 
    h.abrangencia && h.abrangencia.toLowerCase().includes('municipal')
  );
  // console.log(`[getAllHolidays] Feriados municipais (em personalizados): ${municipalHolidays.length}`);
  
  // Se não houver feriados municipais, isso pode indicar um problema
  if (municipalHolidays.length === 0 && custom.length > 0) {
    console.log("[getAllHolidays] AVISO: Não foram encontrados feriados municipais entre os personalizados!");
  }
  
  const allHolidays = [
    ...nacionais, 
    ...judiciais, 
    ...recesso,
    ...custom
  ];
  
  // console.log(`[getAllHolidays] Total de feriados: ${allHolidays.length}`);
  return allHolidays;
};

// Método para obter apenas os feriados personalizados (para debugging)
export const getCustomHolidays = (): Holiday[] => {
  return [...customHolidays];
};

// Método para atualizar os feriados personalizados
export const updateCustomHolidays = (holidays: Holiday[]): void => {
  console.log("Atualizando feriados personalizados:", holidays);
  
  // Logs adicionais para ajudar a depurar o problema
  console.log(`Total de feriados passados para atualização: ${holidays.length}`);
  
  // Verificar se há feriados municipais na lista
  const municipalHolidays = holidays.filter(h => 
    h.abrangencia && h.abrangencia.toLowerCase().includes('municipal')
  );
  console.log(`Feriados municipais sendo salvos: ${municipalHolidays.length}`);
  
  // Se houver feriados municipais novos, remover todos os municipais antigos
  if (municipalHolidays.length > 0) {
    // Verificar de qual município são os novos feriados
    const municipalityMatch = municipalHolidays[0].abrangencia?.match(/Municipal \((.*?)\)/);
    const selectedMunicipality = municipalityMatch ? municipalityMatch[1] : null;
    
    console.log(`Município detectado nos novos feriados: ${selectedMunicipality}`);
    
    // Remover os feriados municipais antigos e manter outros feriados personalizados
    customHolidays = customHolidays.filter(h => 
      !h.abrangencia || !h.abrangencia.toLowerCase().includes('municipal')
    );
    
    console.log(`Feriados municipais anteriores removidos. Restantes: ${customHolidays.length}`);
  }
  
  if (municipalHolidays.length > 0) {
    console.log("Detalhes dos feriados municipais sendo salvos:");
    municipalHolidays.forEach((h, i) => {
      console.log(`#${i+1}: ${h.name} (${h.date}), tipo: ${h.type}, abrangência: ${h.abrangencia}`);
    });
  }
  
  // Atualiza a lista de feriados personalizados
  customHolidays = [...customHolidays, ...holidays];
  
  // Verifica se os feriados foram salvos corretamente
  console.log(`Total de feriados personalizados após atualização: ${customHolidays.length}`);
};

// Método para adicionar um novo feriado
export const addCustomHoliday = (holiday: Holiday): void => {
  // Verifica se o feriado já existe
  const existingIndex = customHolidays.findIndex(h => h.date === holiday.date);
  
  if (existingIndex >= 0) {
    // Substitui o feriado existente
    customHolidays[existingIndex] = holiday;
    console.log(`Feriado substituído: ${holiday.name} (${holiday.date})`);
  } else {
    // Adiciona novo feriado
    customHolidays.push(holiday);
    console.log(`Novo feriado adicionado: ${holiday.name} (${holiday.date})`);
  }
};

// Método para remover um feriado personalizado
export const removeCustomHoliday = (date: string): void => {
  customHolidays = customHolidays.filter(h => h.date !== date);
};

// Function to check if a date is a holiday
export const isHoliday = (date: Date): Holiday | undefined => {
  const dateStr = date.toISOString().split('T')[0];
  const allHolidays = getAllHolidays();
  
  // Descomente esta linha para depuração, se necessário
  // console.log(`[DEBUG-isHoliday] Verificando se ${dateStr} é um feriado entre ${allHolidays.length} feriados`);
  
  const foundHoliday = allHolidays.find(holiday => holiday.date === dateStr);
  
  if (foundHoliday) {
    // Descomente esta linha para depuração, se necessário
    // console.log(`[DEBUG-isHoliday] Encontrado feriado: ${foundHoliday.name} (${foundHoliday.type})`);
  }
  
  return foundHoliday;
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
  
  return getAllHolidays().filter(holiday => {
    const holidayDate = new Date(holiday.date);
    return holidayDate >= start && holidayDate <= end;
  });
};

// Para manter compatibilidade com código existente
export const allHolidays = getAllHolidays();
