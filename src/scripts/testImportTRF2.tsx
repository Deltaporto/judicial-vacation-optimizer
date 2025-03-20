import React, { useState, useEffect } from 'react';
import { 
  fetchTRF2Holidays, 
  mergeHolidays 
} from '@/utils/trf2HolidayScraper';
import { getAllMunicipalHolidays, getMunicipalHolidays } from '@/utils/municipalHolidaysData';
import { Holiday } from '@/types';

const TestTRF2Import: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nationalHolidays, setNationalHolidays] = useState<Holiday[]>([]);
  const [stateHolidays, setStateHolidays] = useState<Holiday[]>([]);
  const [municipalHolidaysSG, setMunicipalHolidaysSG] = useState<Holiday[]>([]);
  const [municipalHolidaysRJ, setMunicipalHolidaysRJ] = useState<Holiday[]>([]);
  const [allHolidays, setAllHolidays] = useState<Holiday[]>([]);
  
  const runTest = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const year = 2025;
      
      // Buscar feriados nacionais
      const national = await fetchTRF2Holidays(year, '0');
      console.log(`Obtidos ${national.length} feriados nacionais`);
      setNationalHolidays(national);
      
      // Buscar feriados estaduais
      const state = await fetchTRF2Holidays(year, '1');
      console.log(`Obtidos ${state.length} feriados estaduais`);
      setStateHolidays(state);
      
      // Buscar feriados municipais - São Gonçalo (exemplo com evento especial)
      const sgHolidays = getMunicipalHolidays('São Gonçalo', year);
      console.log(`Obtidos ${sgHolidays.length} feriados municipais para São Gonçalo`);
      setMunicipalHolidaysSG(sgHolidays);
      
      // Buscar feriados municipais - Rio de Janeiro (outro exemplo com evento especial)
      const rjHolidays = getMunicipalHolidays('Rio de Janeiro', year);
      console.log(`Obtidos ${rjHolidays.length} feriados municipais para Rio de Janeiro`);
      setMunicipalHolidaysRJ(rjHolidays);
      
      // Combinar todos os feriados
      const allTestHolidays = [...national, ...state, ...sgHolidays, ...rjHolidays];
      setAllHolidays(allTestHolidays);
      
      console.log(`Total de ${allTestHolidays.length} feriados combinados`);
      
    } catch (err) {
      setError(`Erro ao testar importação: ${err instanceof Error ? err.message : String(err)}`);
      console.error('Erro no teste:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    runTest();
  }, []);
  
  const renderHolidayTable = (holidays: Holiday[], title: string) => (
    <div className="mb-5">
      <h3 className="text-lg font-medium mb-2">{title} ({holidays.length})</h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-200">
              <th className="border p-2 text-left">Data</th>
              <th className="border p-2 text-left">Nome</th>
              <th className="border p-2 text-left">Tipo</th>
              <th className="border p-2 text-left">Abrangência</th>
            </tr>
          </thead>
          <tbody>
            {holidays.map((holiday, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                <td className="border p-2">{formatDate(holiday.date)}</td>
                <td className="border p-2">{holiday.name}</td>
                <td className="border p-2">{holiday.type}</td>
                <td className="border p-2">{holiday.abrangencia}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Teste de Importação de Feriados TRF2 - 2025</h1>
      
      {isLoading && (
        <div className="p-4 mb-4 bg-blue-100 text-blue-700 rounded">
          Carregando feriados... Por favor aguarde.
        </div>
      )}
      
      {error && (
        <div className="p-4 mb-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {!isLoading && !error && (
        <div>
          <div className="p-4 mb-4 bg-green-100 text-green-700 rounded">
            Teste concluído com sucesso! Foram obtidos {allHolidays.length} feriados.
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {renderHolidayTable(nationalHolidays, "Feriados Nacionais")}
            {renderHolidayTable(stateHolidays, "Feriados Estaduais (RJ)")}
            {renderHolidayTable(municipalHolidaysSG, "Feriados Municipais - São Gonçalo")}
            {renderHolidayTable(municipalHolidaysRJ, "Feriados Municipais - Rio de Janeiro")}
            
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-amber-800 font-medium">Observações importantes:</p>
              <ul className="list-disc pl-5 text-amber-700">
                <li>Identifiquei feriados pontuais além dos recorrentes (como o evento de inauguração em São Gonçalo)</li>
                <li>Os feriados em tela de fundo amarelo são eventos específicos não recorrentes</li>
                <li>Não é recomendado importar todos os feriados municipais, apenas os da sua comarca</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestTRF2Import; 