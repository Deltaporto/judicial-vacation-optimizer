import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Plus, Trash2, X, Info, AlertTriangle } from 'lucide-react';
import { Holiday } from '@/types';
import { 
  getAllHolidays, 
  addCustomHoliday, 
  removeCustomHoliday, 
  updateCustomHolidays,
  getCustomHolidays
} from '@/utils/holidayData';
import TRF2HolidayImporter from '@/components/TRF2HolidayImporter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface HolidayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onHolidaysUpdated?: () => void;
}

const HolidayModal: React.FC<HolidayModalProps> = ({ 
  open, 
  onOpenChange,
  onHolidaysUpdated 
}) => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [filteredHolidays, setFilteredHolidays] = useState<Holiday[]>([]);
  const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear());
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchText, setSearchText] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('view');
  
  // Estados para adicionar novo feriado
  const [newHolidayName, setNewHolidayName] = useState<string>('');
  const [newHolidayDate, setNewHolidayDate] = useState<string>('');
  const [newHolidayType, setNewHolidayType] = useState<'national' | 'judicial' | 'recess'>('judicial');
  
  // Carregar feriados ao abrir o modal
  useEffect(() => {
    if (open) {
      loadHolidays();
    }
  }, [open]);
  
  // Filtrar feriados quando os filtros mudam
  useEffect(() => {
    filterHolidays();
  }, [holidays, yearFilter, typeFilter, searchText]);
  
  const loadHolidays = () => {
    const allHolidays = getAllHolidays();
    setHolidays(allHolidays);
  };
  
  const filterHolidays = () => {
    let filtered = [...holidays];
    
    // Filtrar por ano
    if (yearFilter) {
      filtered = filtered.filter(holiday => 
        holiday.date.startsWith(`${yearFilter}`)
      );
    }
    
    // Filtrar por tipo
    if (typeFilter !== 'all') {
      filtered = filtered.filter(holiday => 
        holiday.type === typeFilter
      );
    }
    
    // Filtrar por texto de busca
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(holiday => 
        holiday.name.toLowerCase().includes(searchLower)
      );
    }
    
    // Ordenar por data
    filtered.sort((a, b) => a.date.localeCompare(b.date));
    
    setFilteredHolidays(filtered);
  };
  
  const handleAddHoliday = () => {
    if (!newHolidayName.trim() || !newHolidayDate) {
      toast({
        title: "Erro ao adicionar feriado",
        description: "O nome e a data são obrigatórios.",
        variant: "destructive"
      });
      return;
    }
    
    const newHoliday: Holiday = {
      name: newHolidayName.trim(),
      date: newHolidayDate,
      type: newHolidayType
    };
    
    addCustomHoliday(newHoliday);
    loadHolidays();
    
    // Limpar formulário
    setNewHolidayName('');
    setNewHolidayDate('');
    setNewHolidayType('judicial');
    
    toast({
      title: "Feriado adicionado",
      description: `${newHoliday.name} (${formatDate(newHoliday.date)}) foi adicionado com sucesso.`,
      variant: "default"
    });
    
    if (onHolidaysUpdated) {
      onHolidaysUpdated();
    }
  };
  
  const handleDeleteHoliday = (holiday: Holiday) => {
    removeCustomHoliday(holiday.date);
    loadHolidays();
    
    toast({
      title: "Feriado removido",
      description: `${holiday.name} (${formatDate(holiday.date)}) foi removido com sucesso.`,
      variant: "default"
    });
    
    if (onHolidaysUpdated) {
      onHolidaysUpdated();
    }
  };
  
  const handleHolidaysImported = (importedHolidays: Holiday[]) => {
    console.log("Feriados recebidos na importação:", importedHolidays);
    
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
    
    // Atualiza a lista global de feriados personalizados
    updateCustomHolidays(holidaysToUpdate);
    
    console.log("Feriados personalizados após a importação:", getCustomHolidays());
    
    // Recarrega a lista de feriados no componente
    loadHolidays();
    
    // Notifica o app que os feriados foram atualizados
    if (onHolidaysUpdated) {
      onHolidaysUpdated();
    }
    
    // Muda para a aba de visualização
    setActiveTab('view');
    
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
    } else {
      // Toast simples sem lista de feriados municipais
      toast({
        title: "Feriados importados",
        description: "Os feriados foram importados com sucesso!",
        variant: "default"
      });
    }
  };
  
  const formatDate = (dateStr: string) => {
    // Método alternativo que preserva o dia exato sem ajuste de fuso horário
    const [year, month, day] = dateStr.split('-');
    
    // Criar a data usando ano, mês (0-11) e dia
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  };
  
  const getHolidayTypeName = (type: string) => {
    switch (type) {
      case 'national': return 'Nacional';
      case 'judicial': return 'Judicial';
      case 'recess': return 'Recesso';
      default: return type;
    }
  };
  
  const getHolidayTypeBadge = (type: string) => {
    switch (type) {
      case 'national': 
        return <Badge variant="default" className="bg-blue-500">Nacional</Badge>;
      case 'judicial': 
        return <Badge variant="default" className="bg-green-500">Judicial</Badge>;
      case 'recess': 
        return <Badge variant="default" className="bg-purple-500">Recesso</Badge>;
      default: 
        return <Badge variant="default">{type}</Badge>;
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <span>Gerenciador de Feriados</span>
          </DialogTitle>
          <DialogDescription>
            Visualize, adicione, remova ou importe feriados para o planejador de férias.
          </DialogDescription>
        </DialogHeader>
        
        <Alert className="my-3">
          <Info className="h-4 w-4" />
          <AlertTitle>Informação sobre feriados</AlertTitle>
          <AlertDescription>
            Por padrão, são importados os feriados estaduais do RJ. Os feriados municipais devem ser adicionados manualmente nesta tela.
          </AlertDescription>
        </Alert>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="view">Visualizar Feriados</TabsTrigger>
            <TabsTrigger value="add">Adicionar Feriado</TabsTrigger>
            <TabsTrigger value="import">Importar do TRF2</TabsTrigger>
          </TabsList>
          
          <TabsContent value="view" className="flex-1 flex flex-col overflow-hidden">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <Label htmlFor="yearFilter">Ano</Label>
                <Select
                  value={yearFilter.toString()}
                  onValueChange={(value) => setYearFilter(Number(value))}
                >
                  <SelectTrigger id="yearFilter">
                    <SelectValue placeholder="Selecione o ano" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2023">2023</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2026">2026</SelectItem>
                    <SelectItem value="2027">2027</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="typeFilter">Tipo</Label>
                <Select
                  value={typeFilter}
                  onValueChange={setTypeFilter}
                >
                  <SelectTrigger id="typeFilter">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="national">Nacional</SelectItem>
                    <SelectItem value="judicial">Judicial</SelectItem>
                    <SelectItem value="recess">Recesso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="searchText">Buscar</Label>
                <Input
                  id="searchText"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Nome do feriado"
                />
              </div>
            </div>
            
            <div className="overflow-y-auto flex-1 border rounded max-h-[50vh]">
              {filteredHolidays.length > 0 ? (
                <table className="min-w-full">
                  <thead className="sticky top-0 bg-background border-b">
                    <tr>
                      <th className="py-2 px-3 text-left">Data</th>
                      <th className="py-2 px-3 text-left">Nome</th>
                      <th className="py-2 px-3 text-left">Tipo</th>
                      <th className="py-2 px-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHolidays.map((holiday, index) => (
                      <tr key={`${holiday.date}-${index}`} className="border-b hover:bg-muted/30">
                        <td className="py-2 px-3">{formatDate(holiday.date)}</td>
                        <td className="py-2 px-3">{holiday.name}</td>
                        <td className="py-2 px-3">{getHolidayTypeBadge(holiday.type)}</td>
                        <td className="py-2 px-3 text-right">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                              <div className="space-y-3">
                                <h4 className="font-medium">Confirmar exclusão</h4>
                                <p className="text-sm text-muted-foreground">
                                  Tem certeza que deseja excluir o feriado "{holiday.name}" do dia {formatDate(holiday.date)}?
                                </p>
                                <div className="flex justify-end space-x-2">
                                  <Button variant="outline" size="sm">Cancelar</Button>
                                  <Button 
                                    variant="destructive" 
                                    size="sm"
                                    onClick={() => handleDeleteHoliday(holiday)}
                                  >
                                    Excluir
                                  </Button>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-4 text-center text-muted-foreground">
                  Nenhum feriado encontrado para os filtros selecionados.
                </div>
              )}
            </div>
            <div className="pt-2 text-sm text-muted-foreground">
              Total: {filteredHolidays.length} feriados
            </div>
          </TabsContent>
          
          <TabsContent value="add" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="holidayName">Nome do Feriado</Label>
                <Input
                  id="holidayName"
                  value={newHolidayName}
                  onChange={(e) => setNewHolidayName(e.target.value)}
                  placeholder="Ex: Aniversário da Cidade"
                />
              </div>
              
              <div>
                <Label htmlFor="holidayDate">Data</Label>
                <Input
                  id="holidayDate"
                  type="date"
                  value={newHolidayDate}
                  onChange={(e) => setNewHolidayDate(e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="holidayType">Tipo</Label>
              <Select
                value={newHolidayType}
                onValueChange={(value) => setNewHolidayType(value as 'national' | 'judicial' | 'recess')}
              >
                <SelectTrigger id="holidayType">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="national">Nacional</SelectItem>
                  <SelectItem value="judicial">Judicial</SelectItem>
                  <SelectItem value="recess">Recesso</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="bg-muted/50 p-4 rounded border text-sm">
              <h4 className="font-medium mb-2">Tipos de feriados:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li><strong>Nacional:</strong> Feriados nacionais como Natal, Ano Novo, etc.</li>
                <li><strong>Judicial:</strong> Feriados específicos da Justiça.</li>
                <li><strong>Recesso:</strong> Período de recesso forense.</li>
              </ul>
            </div>
            
            <Button 
              onClick={handleAddHoliday} 
              className="w-full"
              disabled={!newHolidayName.trim() || !newHolidayDate}
            >
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Feriado
            </Button>
          </TabsContent>
          
          <TabsContent value="import" className="overflow-y-auto">
            <TRF2HolidayImporter
              existingHolidays={holidays}
              onImport={handleHolidaysImported}
            />
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="flex justify-between items-center">
          <div className="text-xs text-muted-foreground">
            Os feriados são usados para calcular a eficiência das férias.
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default HolidayModal; 