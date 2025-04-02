import React, { useState, useEffect } from 'react';
import { fetchTRF2Holidays, mergeHolidays } from '@/utils/trf2HolidayScraper';
import { allMunicipalities, getMunicipalHolidays } from '@/utils/municipalHolidaysData';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { toast } from "@/hooks/use-toast";
const TRF2HolidayImporter = ({ existingHolidays, onImport }) => {
    const [year, setYear] = useState(new Date().getFullYear());
    const [importState, setImportState] = useState(true);
    const [importMunicipal, setImportMunicipal] = useState(false);
    const [selectedMunicipality, setSelectedMunicipality] = useState('');
    const [municipalities, setMunicipalities] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingMunicipalities, setIsFetchingMunicipalities] = useState(false);
    const [error, setError] = useState(null);
    const [importedCount, setImportedCount] = useState(0);
    const [importedHolidays, setImportedHolidays] = useState([]);
    // Inicializar municípios ao carregar o componente
    useEffect(() => {
        // Usamos diretamente a lista estática de municípios em vez de buscar do TRF2
        setMunicipalities(allMunicipalities);
        if (allMunicipalities.length > 0 && !selectedMunicipality) {
            setSelectedMunicipality(allMunicipalities[0]);
        }
    }, []);
    // Atualizar seleção quando importMunicipal mudar
    useEffect(() => {
        if (importMunicipal && municipalities.length > 0 && !selectedMunicipality) {
            setSelectedMunicipality(municipalities[0]);
        }
    }, [importMunicipal, municipalities, selectedMunicipality]);
    // Importar feriados automaticamente quando o município for selecionado
    useEffect(() => {
        // Executar apenas se um município estiver selecionado e se a opção de importar municipais estiver ativa
        if (importMunicipal && selectedMunicipality) {
            console.log(`Município selecionado alterado para: ${selectedMunicipality}. Importando feriados...`);
            handleMunicipalHolidayImport();
        }
    }, [selectedMunicipality]); // eslint-disable-line react-hooks/exhaustive-deps
    const handleYearChange = (e) => {
        const yearValue = parseInt(e.target.value);
        if (!isNaN(yearValue) && yearValue > 2000 && yearValue < 2100) {
            setYear(yearValue);
        }
    };
    // Nova função para importar apenas feriados municipais
    const handleMunicipalHolidayImport = async () => {
        if (!selectedMunicipality)
            return;
        setIsLoading(true);
        setError(null);
        try {
            console.log(`Buscando feriados municipais para ${selectedMunicipality} (${year})`);
            const municipalHolidays = getMunicipalHolidays(selectedMunicipality, year);
            if (municipalHolidays.length === 0) {
                setError(`Não foram encontrados feriados municipais para ${selectedMunicipality} no ano ${year}`);
                setIsLoading(false);
                return;
            }
            console.log(`Encontrados ${municipalHolidays.length} feriados para ${selectedMunicipality}`);
            console.log("Feriados detalhados:", JSON.stringify(municipalHolidays));
            // Filtrar feriados existentes para remover os municipais anteriores
            const nonMunicipalHolidays = existingHolidays.filter(h => !h.abrangencia || !h.abrangencia.toLowerCase().includes('municipal'));
            // Mesclar feriados não-municipais com os novos feriados municipais
            const updatedHolidays = [...nonMunicipalHolidays, ...municipalHolidays];
            // Chama a função de importação
            onImport(updatedHolidays);
            // Armazena os feriados importados para exibição
            setImportedHolidays([...municipalHolidays]);
            setImportedCount(municipalHolidays.length);
            // Criar o conteúdo HTML da lista de feriados para o toast
            const holidaysList = (<div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
          {municipalHolidays.map((holiday, index) => (<div key={index} className="flex justify-between text-xs">
              <span>{holiday.name}</span>
              <span className="font-medium ml-2">{formatDate(holiday.date)}</span>
            </div>))}
          <div className="mt-2 pt-1 border-t text-xs font-medium">
            Total: {municipalHolidays.length} feriado{municipalHolidays.length !== 1 ? 's' : ''}
          </div>
        </div>);
            // Exibir toast com a lista de feriados
            toast({
                title: "Feriados importados",
                description: (<div>
            <p>Os feriados municipais de <strong>{selectedMunicipality}</strong> foram importados com sucesso!</p>
            {holidaysList}
          </div>),
                variant: "default",
                duration: 5000, // 5 segundos para permitir a leitura da lista
            });
            console.log("Estado após importação:");
            console.log("- importedCount:", municipalHolidays.length);
            console.log("- importedHolidays:", municipalHolidays);
            console.log("- error:", null);
        }
        catch (err) {
            console.error("Erro durante a importação de feriados municipais:", err);
            setError(`Erro ao importar feriados: ${err instanceof Error ? err.message : String(err)}`);
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleImport = async () => {
        setIsLoading(true);
        setError(null);
        try {
            let allImportedHolidays = [];
            // Importar feriados estaduais
            if (importState) {
                const stateHolidays = await fetchTRF2Holidays(year, '1');
                console.log(`Obtidos ${stateHolidays.length} feriados estaduais`);
                allImportedHolidays = [...allImportedHolidays, ...stateHolidays];
            }
            // Importar feriados municipais se selecionado
            if (importMunicipal && selectedMunicipality) {
                console.log(`Buscando feriados municipais para ${selectedMunicipality} (${year})`);
                // Usamos a função local em vez de buscar do TRF2
                const municipalHolidays = getMunicipalHolidays(selectedMunicipality, year);
                console.log(`Município selecionado: ${selectedMunicipality}`);
                console.log(`Feriados municipais encontrados:`, municipalHolidays);
                // Log detalhado de cada feriado municipal
                console.log("Detalhes dos feriados municipais:");
                municipalHolidays.forEach((h, index) => {
                    console.log(`Feriado #${index + 1}:`);
                    console.log(`- Nome: ${h.name}`);
                    console.log(`- Data: ${h.date}`);
                    console.log(`- Tipo: ${h.type}`);
                    console.log(`- Abrangência: ${h.abrangencia}`);
                });
                // Verificação específica para Barra do Piraí
                if (selectedMunicipality === 'Barra do Piraí') {
                    console.log('[DEBUG-BDP] Depuração específica para Barra do Piraí:');
                    municipalHolidays.forEach(holiday => {
                        const dateObj = new Date(holiday.date);
                        console.log(`[DEBUG-BDP] Feriado: ${holiday.name}`);
                        console.log(`[DEBUG-BDP] Data ISO: ${holiday.date}`);
                        console.log(`[DEBUG-BDP] Objeto Date: ${dateObj}`);
                        console.log(`[DEBUG-BDP] ToLocaleDateString: ${dateObj.toLocaleDateString('pt-BR')}`);
                        console.log(`[DEBUG-BDP] Dia: ${dateObj.getDate()}, Mês: ${dateObj.getMonth() + 1}`);
                        // Teste de criação manual para comparação
                        const dateParts = holiday.date.split('-');
                        const manualDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
                        console.log(`[DEBUG-BDP] Data manual: ${manualDate.toLocaleDateString('pt-BR')}`);
                    });
                }
                allImportedHolidays = [...allImportedHolidays, ...municipalHolidays];
            }
            if (allImportedHolidays.length === 0) {
                setError("Nenhum feriado encontrado para os critérios selecionados");
                setIsLoading(false);
                return;
            }
            // Imprime os feriados antes da mesclagem
            console.log("Feriados existentes antes da mesclagem:", existingHolidays);
            console.log("Feriados a serem importados:", allImportedHolidays);
            const mergedHolidays = mergeHolidays(existingHolidays, allImportedHolidays);
            console.log("Feriados após a mesclagem:", mergedHolidays);
            // Chama a função de importação, que atualizará o estado global
            onImport(mergedHolidays);
            setImportedCount(allImportedHolidays.length);
            // Mostrar mensagem explícita sobre os feriados importados
            if (importMunicipal && selectedMunicipality) {
                const municipalCount = allImportedHolidays.filter(h => h.abrangencia && h.abrangencia.includes(`Municipal (${selectedMunicipality})`)).length;
                console.log(`Foram importados ${municipalCount} feriados municipais para ${selectedMunicipality}`);
                if (municipalCount === 0) {
                    setError(`Não foram encontrados feriados municipais para ${selectedMunicipality} no ano ${year}`);
                }
            }
        }
        catch (err) {
            console.error("Erro durante a importação:", err);
            setError(`Erro ao importar feriados: ${err instanceof Error ? err.message : String(err)}`);
        }
        finally {
            setIsLoading(false);
        }
    };
    // Função para formatar a data para o formato brasileiro
    const formatDate = (dateString) => {
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    };
    return (<div className="p-4 border rounded shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Importar Feriados Estaduais e Municipais do TRF2</h3>
      
      <div className="mb-4">
        <Label htmlFor="year">Ano</Label>
        <Input id="year" type="number" min="2020" max="2099" value={year} onChange={handleYearChange} className="w-full" disabled={isLoading}/>
      </div>
      
      <div className="mb-4">
        <p className="font-medium mb-2">Tipo de Feriados a Importar</p>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox id="import-state" checked={importState} onCheckedChange={() => setImportState(!importState)} disabled={isLoading}/>
            <Label htmlFor="import-state" className="cursor-pointer">Estaduais (Rio de Janeiro)</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox id="import-municipal" checked={importMunicipal} onCheckedChange={() => setImportMunicipal(!importMunicipal)} disabled={isLoading}/>
            <Label htmlFor="import-municipal" className="cursor-pointer">
              Municipais 
              <span className="text-xs text-destructive ml-1">(não recomendado)</span>
            </Label>
          </div>
        </div>
      </div>
      
      {/* Seleção de município - aparece apenas quando municipais está marcado */}
      {importMunicipal && (<div className="mb-4">
          <Label htmlFor="municipality">
            Selecione o Município
          </Label>
          
          <Select value={selectedMunicipality} onValueChange={setSelectedMunicipality} disabled={isLoading}>
            <SelectTrigger id="municipality" className="w-full">
              <SelectValue placeholder="Selecione um município"/>
            </SelectTrigger>
            <SelectContent className="max-h-60 overflow-y-auto">
              {municipalities.map(municipality => (<SelectItem key={municipality} value={municipality}>
                  {municipality}
                </SelectItem>))}
            </SelectContent>
          </Select>
          
          <p className="text-xs text-muted-foreground mt-1">
            Apenas feriados deste município específico serão importados
          </p>
          
          <p className="text-xs text-green-600 font-medium mt-1">
            Os feriados municipais são atualizados automaticamente ao selecionar um município
          </p>
        </div>)}
      
      <Button onClick={handleImport} disabled={isLoading || (!importState && !importMunicipal) || (importMunicipal && !selectedMunicipality)} className="w-full" variant="default">
        {isLoading ? (<>
            <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
            Importando...
          </>) : ("Importar Feriados Estaduais/Municipais")}
      </Button>
      
      {error && (<div className="mt-3 p-2 bg-destructive/10 text-destructive rounded">
          {error}
        </div>)}
      
      <div className="mt-4 text-xs text-muted-foreground">
        <p>Os feriados nacionais são importados por padrão no sistema.</p>
        <p>A importação do TRF2 é apenas para feriados estaduais (Rio de Janeiro) e municipais.</p>
        <p>Os feriados estaduais do Espírito Santo serão adicionados em breve.</p>
      </div>
    </div>);
};
export default TRF2HolidayImporter;
