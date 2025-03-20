import React, { useState, useEffect } from 'react';
import { Holiday } from '@/types';
import { 
  getAllHolidays, 
  updateCustomHolidays, 
  addCustomHoliday, 
  removeCustomHoliday, 
  getCustomHolidays 
} from '@/utils/holidayData';
import TRF2HolidayImporter from './TRF2HolidayImporter';
import { HolidayModal } from '@/components/Holidays/HolidayModal';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { toast } from "@/hooks/use-toast";

interface HolidayManagerProps {
  onHolidaysUpdated?: () => void;
}

const HolidayManager: React.FC<HolidayManagerProps> = ({ onHolidaysUpdated }) => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [filteredHolidays, setFilteredHolidays] = useState<Holiday[]>([]);
  const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear());
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchText, setSearchText] = useState<string>('');
  
  // Carrega os feriados ao montar o componente
  useEffect(() => {
    loadHolidays();
  }, []);
  
  // Filtra os feriados quando os filtros mudam
  useEffect(() => {
    filterHolidays();
  }, [holidays, yearFilter, typeFilter, searchText]);
  
  const loadHolidays = () => {
    const allHolidays = getAllHolidays();
    setHolidays(allHolidays);
  };
  
  const filterHolidays = () => {
    let filtered = [...holidays];
    
    // Filtra por ano
    if (yearFilter) {
      filtered = filtered.filter(holiday => 
        holiday.date.startsWith(`${yearFilter}`)
      );
    }
    
    // Filtra por tipo
    if (typeFilter !== 'all') {
      filtered = filtered.filter(holiday => 
        holiday.type === typeFilter
      );
    }
    
    // Filtra por texto de busca
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(holiday => 
        holiday.name.toLowerCase().includes(searchLower)
      );
    }
    
    // Ordena por data
    filtered.sort((a, b) => a.date.localeCompare(b.date));
    
    setFilteredHolidays(filtered);
  };
  
  const handleHolidaysImported = (importedHolidays: Holiday[]) => {
    // Separar os feriados municipais para garantir que sejam preservados
    const municipalHolidays = importedHolidays.filter(h => 
      h.abrangencia && h.abrangencia.toLowerCase().includes('municipal')
    );
    
    // Separar outros feriados (não municipais) e remover os do ano atual
    const otherHolidays = importedHolidays
      .filter(h => !h.abrangencia || !h.abrangencia.toLowerCase().includes('municipal'))
      .filter(h => !h.date.startsWith(`${yearFilter}`));
    
    // Combinar os feriados para atualização
    const holidaysToUpdate = [...otherHolidays, ...municipalHolidays];
    
    console.log("Feriados municipais preservados:", municipalHolidays);
    console.log("Outros feriados (filtrados):", otherHolidays);
    console.log("Feriados a serem salvos:", holidaysToUpdate);
    
    // Atualiza os feriados personalizados no módulo de dados
    updateCustomHolidays(holidaysToUpdate);
    
    // Recarrega todos os feriados
    loadHolidays();
    
    // Notifica o componente pai se necessário
    if (onHolidaysUpdated) {
      onHolidaysUpdated();
    }
    
    // Verificar se há feriados municipais para exibir na mensagem
    if (municipalHolidays.length > 0) {
      // Identificar o município dos feriados importados
      const municipalityMatch = municipalHolidays[0].abrangencia?.match(/Municipal \((.*?)\)/);
      const municipality = municipalityMatch ? municipalityMatch[1] : "desconhecido";
      
      // Criar lista de feriados formatada para o toast
      const holidaysList = (
        <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
          {municipalHolidays.map((holiday, index) => (
            <div key={index} className="flex justify-between text-xs">
              <span>{holiday.name}</span>
              <span className="font-medium ml-2">{formatDate(holiday.date)}</span>
            </div>
          ))}
          <div className="mt-2 pt-1 border-t text-xs font-medium">
            Total: {municipalHolidays.length} feriado{municipalHolidays.length !== 1 ? 's' : ''} municipal(is)
          </div>
        </div>
      );
      
      // Toast com detalhes dos feriados municipais
      toast({
        title: "Feriados importados",
        description: (
          <div>
            <p>Os feriados municipais de <strong>{municipality}</strong> foram importados com sucesso!</p>
            {holidaysList}
          </div>
        ),
        variant: "default",
        duration: 5000,
      });
    }
  };
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
  };
  
  const getHolidayTypeName = (type: string) => {
    switch (type) {
      case 'national': return 'Nacional';
      case 'judicial': return 'Judicial';
      case 'recess': return 'Recesso';
      default: return type;
    }
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Gerenciador de Feriados</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="bg-white p-4 rounded shadow-sm">
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="flex-1">
                <label htmlFor="yearFilter" className="block mb-1 text-sm">Ano</label>
                <select 
                  id="yearFilter"
                  value={yearFilter}
                  onChange={(e) => setYearFilter(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value={2023}>2023</option>
                  <option value={2024}>2024</option>
                  <option value={2025}>2025</option>
                  <option value={2026}>2026</option>
                  <option value={2027}>2027</option>
                </select>
              </div>
              
              <div className="flex-1">
                <label htmlFor="typeFilter" className="block mb-1 text-sm">Tipo</label>
                <select 
                  id="typeFilter"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="all">Todos</option>
                  <option value="national">Nacional</option>
                  <option value="judicial">Judicial</option>
                  <option value="recess">Recesso</option>
                </select>
              </div>
              
              <div className="flex-1">
                <label htmlFor="searchText" className="block mb-1 text-sm">Buscar</label>
                <input 
                  id="searchText"
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Nome do feriado"
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="py-2 px-3 text-left">Data</th>
                    <th className="py-2 px-3 text-left">Nome</th>
                    <th className="py-2 px-3 text-left">Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHolidays.length > 0 ? (
                    filteredHolidays.map((holiday, index) => (
                      <tr key={`${holiday.date}-${index}`} className="border-b">
                        <td className="py-2 px-3">{formatDate(holiday.date)}</td>
                        <td className="py-2 px-3">{holiday.name}</td>
                        <td className="py-2 px-3">{getHolidayTypeName(holiday.type)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-4 px-3 text-center text-gray-500">
                        Nenhum feriado encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 text-sm text-gray-500">
              Total: {filteredHolidays.length} feriados
            </div>
          </div>
        </div>
        
        <div>
          <TRF2HolidayImporter 
            existingHolidays={holidays}
            onImport={handleHolidaysImported}
          />
        </div>
      </div>
    </div>
  );
};

export default HolidayManager; 