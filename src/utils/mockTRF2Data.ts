import { Holiday } from '@/types';
import { 
  allMunicipalities, 
  getMunicipalHolidays,
  getAllMunicipalHolidays 
} from './municipalHolidaysData';

/**
 * Dados simulados de municípios para desenvolvimento
 */
export const mockMunicipalities = allMunicipalities;

/**
 * Gera feriados municipais simulados para um município específico
 */
export function getMockMunicipalHolidays(
  municipality: string,
  year: number
): Holiday[] {
  return getMunicipalHolidays(municipality, year);
}

/**
 * Retorna feriados simulados (nacionais, estaduais ou municipais)
 */
export function getMockHolidays(
  year: number,
  type: '0' | '1' | '2' | 'All' = 'All',
  municipality?: string
): Holiday[] {
  const holidays: Holiday[] = [];
  
  // Feriados nacionais
  if (type === '0' || type === 'All') {
    holidays.push(
      { date: `${year}-01-01`, name: 'Confraternização Universal', type: 'national', abrangencia: 'Nacional' },
      { date: `${year}-04-21`, name: 'Tiradentes', type: 'national', abrangencia: 'Nacional' },
      { date: `${year}-05-01`, name: 'Dia do Trabalho', type: 'national', abrangencia: 'Nacional' },
      { date: `${year}-09-07`, name: 'Independência do Brasil', type: 'national', abrangencia: 'Nacional' },
      { date: `${year}-10-12`, name: 'Nossa Senhora Aparecida', type: 'national', abrangencia: 'Nacional' },
      { date: `${year}-11-02`, name: 'Finados', type: 'national', abrangencia: 'Nacional' },
      { date: `${year}-11-15`, name: 'Proclamação da República', type: 'national', abrangencia: 'Nacional' },
      { date: `${year}-12-25`, name: 'Natal', type: 'national', abrangencia: 'Nacional' }
    );
  }
  
  // Feriados estaduais (RJ)
  if (type === '1' || type === 'All') {
    holidays.push(
      { date: `${year}-04-23`, name: 'Dia de São Jorge', type: 'judicial', abrangencia: 'Estadual (Rio de Janeiro)' },
      { date: `${year}-10-28`, name: 'Dia do Servidor Público', type: 'judicial', abrangencia: 'Estadual (Rio de Janeiro)' },
      { date: `${year}-11-20`, name: 'Dia da Consciência Negra', type: 'judicial', abrangencia: 'Estadual (Rio de Janeiro)' }
    );
  }
  
  // Feriados municipais
  if ((type === '2' || type === 'All') && municipality) {
    const municipalHolidays = getMunicipalHolidays(municipality, year);
    holidays.push(...municipalHolidays);
  } else if (type === '2' || type === 'All') {
    // Se não especificou município, retorna alguns feriados de amostra
    ['Rio de Janeiro', 'Niterói', 'Angra dos Reis'].forEach(city => {
      const cityHolidays = getMunicipalHolidays(city, year);
      holidays.push(...cityHolidays);
    });
  }
  
  return holidays;
} 