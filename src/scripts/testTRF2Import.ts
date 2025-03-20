import { fetchTRF2Holidays, mergeHolidays } from '../utils/trf2HolidayScraper';
import { getAllHolidays, updateCustomHolidays } from '../utils/holidayData';

/**
 * Script de teste para importação de feriados do TRF2
 */
async function testTRF2Import() {
  console.log('Iniciando teste de importação de feriados do TRF2...');
  
  try {
    // Buscar feriados nacionais do TRF2 para 2025
    console.log('Buscando feriados nacionais de 2025...');
    const nationalHolidays = await fetchTRF2Holidays(2025, '0');
    console.log(`Feriados nacionais encontrados: ${nationalHolidays.length}`);
    console.log('Amostra de feriados nacionais:');
    nationalHolidays.slice(0, 3).forEach(holiday => {
      console.log(`- ${holiday.date}: ${holiday.name} (${holiday.type})`);
    });
    
    // Buscar todos os feriados (incluindo estaduais e municipais)
    console.log('\nBuscando todos os feriados de 2025...');
    const allHolidays = await fetchTRF2Holidays(2025, 'All');
    console.log(`Total de feriados encontrados: ${allHolidays.length}`);
    
    // Exemplo de mesclagem de feriados
    console.log('\nTeste de mesclagem de feriados...');
    const existingHolidays = getAllHolidays();
    console.log(`Feriados existentes: ${existingHolidays.length}`);
    
    const mergedHolidays = mergeHolidays(existingHolidays, allHolidays);
    console.log(`Feriados após mesclagem: ${mergedHolidays.length}`);
    
    // Exemplo de atualização do banco de dados de feriados
    console.log('\nAtualizando feriados personalizados...');
    updateCustomHolidays(allHolidays);
    const updatedHolidays = getAllHolidays();
    console.log(`Feriados após atualização: ${updatedHolidays.length}`);
    
    console.log('\nTeste concluído com sucesso!');
    return {
      success: true,
      nationalHolidays,
      allHolidays,
      mergedHolidays
    };
  } catch (error) {
    console.error('Erro durante o teste:', error);
    return {
      success: false,
      error
    };
  }
}

// Executa o teste e exporta a função para uso externo
const testResult = testTRF2Import();
export default testTRF2Import; 