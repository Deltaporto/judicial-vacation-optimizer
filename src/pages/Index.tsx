import React, { useState, useEffect, useRef } from 'react';
import Header from '@/components/Layout/Header';
import Footer from '@/components/Layout/Footer';
import CalendarView from '@/components/Calendar/CalendarView';
import EfficiencyCalculator from '@/components/Analysis/EfficiencyCalculator';
import VacationRecommendations from '@/components/Recommendations/VacationRecommendations';
import { DateRange, VacationPeriod, SplitVacationPeriods } from '@/types';
import { getVacationPeriodDetails, formatDate } from '@/utils/dateUtils';
import { toast } from '@/components/ui/use-toast';
import { runOptimizationTests } from '@/utils/test-optimization';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { generateRecommendations } from '@/utils/efficiencyUtils';
import { Lightbulb } from 'lucide-react';
import HolidayModal from '@/components/Holidays/HolidayModal';

const Index = () => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedRange, setSelectedRange] = useState<DateRange | null>(null);
  const [vacationPeriod, setVacationPeriod] = useState<VacationPeriod | null>(null);
  const [isRangeComplete, setIsRangeComplete] = useState<boolean>(false);
  const [splitVacations, setSplitVacations] = useState<SplitVacationPeriods | null>(null);
  const [activeVacationTab, setActiveVacationTab] = useState<string>("single");
  
  // New states for fractionated periods
  const [splitPeriod, setSplitPeriod] = useState<DateRange | null>(null);
  const [splitPeriods, setSplitPeriods] = useState<DateRange[]>([]);
  const [vacationRecommendations, setVacationRecommendations] = useState<any[]>([]);
  
  const [showHolidayModal, setShowHolidayModal] = useState<boolean>(false);
  // Adicionar estado para forçar a renderização do calendário
  const [calendarKey, setCalendarKey] = useState<number>(0);
  // Adicionar referência para o componente VacationRecommendations
  const vacationRecommendationsRef = useRef<any>(null);
  
  // Update vacation period when date range changes
  useEffect(() => {
    if (selectedRange) {
      // Check if this is a complete range (not just a single date)
      const isComplete = selectedRange.startDate.getTime() !== selectedRange.endDate.getTime();
      setIsRangeComplete(isComplete);
      
      // Only calculate and show validation for complete ranges
      if (isComplete) {
        const periodDetails = getVacationPeriodDetails(selectedRange.startDate, selectedRange.endDate);
        setVacationPeriod(periodDetails);
        
        // Reset split vacations when changing the main vacation period
        setSplitVacations(null);
        setActiveVacationTab("single");
        
        // Only show validation toast for complete ranges
        if (!periodDetails.isValid && periodDetails.invalidReason) {
          toast({
            title: "Período Inválido",
            description: periodDetails.invalidReason,
            variant: "destructive",
          });
        }
      } else {
        // For incomplete ranges (single day selections), don't validate yet
        setVacationPeriod(null);
      }
    } else {
      setVacationPeriod(null);
      setIsRangeComplete(false);
    }
  }, [selectedRange]);
  
  // Handle single date selection
  const handleDateSelect = (date: Date) => {
    console.log("Index: Date selected:", date);
    setSelectedDate(date);
    
    // Always create a new date object to avoid reference issues
    const newDate = new Date(date);
    
    // For a single date, set the range to just that day
    setSelectedRange({ 
      startDate: newDate, 
      endDate: newDate 
    });
    
    // This is just the start of a selection, not a complete range yet
    setIsRangeComplete(false);
    
    // Reset split vacations when starting a new selection
    setSplitVacations(null);
    setActiveVacationTab("single");
  };
  
  // Handle date range selection
  const handleDateRangeSelect = (range: DateRange) => {
    console.log("Index: Range selected:", range.startDate, "to", range.endDate);
    
    // Always create a new range object with proper dates to avoid circular references
    const newRange = {
      startDate: new Date(range.startDate),
      endDate: new Date(range.endDate)
    };
    
    // Only update if the range is different
    if (!selectedRange || 
        selectedRange.startDate.getTime() !== newRange.startDate.getTime() || 
        selectedRange.endDate.getTime() !== newRange.endDate.getTime()) {
      console.log("Index: Updating range state");
      setSelectedRange(newRange);
      
      // Only consider it a complete range if start and end are different
      const isComplete = newRange.startDate.getTime() !== newRange.endDate.getTime();
      setIsRangeComplete(isComplete);
      
      // Reset split vacations when selecting a new range
      setSplitVacations(null);
      setActiveVacationTab("single");
    } else {
      console.log("Index: Range not changed, skipping update");
    }
  };
  
  // Handle recommendation selection
  const handleRecommendationSelect = (dateRange: DateRange, recommendationType?: string) => {
    // Special handling for hybrid recommendation
    if (recommendationType === 'hybrid' && dateRange.description) {
      // Verificar se a descrição contém padrões que indicam um fracionamento
      const hasSplitPattern = /Divida suas férias em dois períodos/.test(dateRange.description);
      
      if (hasSplitPattern) {
        // Extrair informações de data para o fracionamento
        const splitPattern = /\b(\d{1,2}\/\d{1,2})\b.*?\b(\d{1,2}\/\d{1,2})\b.*?\b(\d{1,2}\/\d{1,2})\b.*?\b(\d{1,2}\/\d{1,2})\b/;
        const splitMatches = splitPattern.exec(dateRange.description);
        
        if (splitMatches && splitMatches.length >= 5) {
          // Obter o ano atual
          const currentYear = new Date().getFullYear();
          
          // Parse do primeiro período
          const firstStart = parseShortDate(splitMatches[1], currentYear);
          const firstEnd = parseShortDate(splitMatches[2], currentYear);
          
          // Parse do segundo período
          const secondStart = parseShortDate(splitMatches[3], currentYear);
          const secondEnd = parseShortDate(splitMatches[4], currentYear);
          
          // Aplicar ambos os períodos se forem válidos
          if (firstStart && firstEnd && secondStart && secondEnd) {
            showSuccess('Estratégia híbrida aplicada com sucesso!');
            
            // Aplicar o primeiro período como principal
            setDateRange({
              startDate: firstStart,
              endDate: firstEnd
            });
            
            // Salvar o segundo período como um período fracionado
            setSplitPeriods([{ 
              startDate: secondStart, 
              endDate: secondEnd 
            }]);
            
            // Atualizar o mês do calendário para o mês do período recomendado
            setCalendarKey(prev => prev + 1);
            
            return;
          }
        }
      }
      
      // Se não encontrou padrão de fracionamento ou não conseguiu extrair as datas,
      // aplicar apenas a primeira parte da estratégia híbrida
      setDateRange({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
      
      // Atualizar o mês do calendário para o mês do período recomendado
      setCalendarKey(prev => prev + 1);
      
      showSuccess('Recomendação híbrida aplicada com sucesso!');
      return;
    }
    
    // Special handling for split recommendation
    if (recommendationType === 'split' && vacationPeriod) {
      // Extract split points from description
      // Parse the description which contains dates like "dd/MM a dd/MM" for both periods
      const descriptionMatch = /\b(\d{1,2}\/\d{1,2})\b.*?\b(\d{1,2}\/\d{1,2})\b.*?\b(\d{1,2}\/\d{1,2})\b.*?\b(\d{1,2}\/\d{1,2})\b/;
      const dateMatches = descriptionMatch.exec(dateRange.description || "");
      
      if (dateMatches && dateMatches.length >= 5) {
        // Get the current year
        const currentYear = vacationPeriod.startDate.getFullYear();
        
        // Parse first period dates
        const firstStart = parseShortDate(dateMatches[1], currentYear);
        const firstEnd = parseShortDate(dateMatches[2], currentYear);
        
        // Parse second period dates
        const secondStart = parseShortDate(dateMatches[3], currentYear);
        const secondEnd = parseShortDate(dateMatches[4], currentYear);
        
        // Show the first period, and save the second one for later display
        if (firstStart && firstEnd && secondStart && secondEnd) {
          showSuccess('Período dividido com sucesso!');
          setSplitPeriods([{ 
            startDate: secondStart, 
            endDate: secondEnd 
          }]);
          setDateRange({
            startDate: firstStart,
            endDate: firstEnd
          });
          
          // Atualizar o mês do calendário para o mês do período recomendado
          setCalendarKey(prev => prev + 1);
          
          return;
        }
      }
    }
    
    // Special handling for optimal fraction recommendation
    if (recommendationType === 'optimal_fraction' && dateRange.description) {
      // Find recommendation to get all period data
      const recommendation = vacationRecommendations.find(r => r.type === 'optimal_fraction');
      
      if (recommendation && recommendation.fractionedPeriods && recommendation.fractionedPeriods.length > 0) {
        showSuccess('Períodos fracionados aplicados com sucesso!');
        
        // Show the first period and store the rest as split periods
        const [firstPeriod, ...otherPeriods] = recommendation.fractionedPeriods;
        
        // Set the first period as the main date range
        setDateRange({
          startDate: firstPeriod.startDate,
          endDate: firstPeriod.endDate
        });
        
        // Save the remaining periods for display in the split section
        if (otherPeriods.length > 0) {
          setSplitPeriods(otherPeriods.map(period => ({
            startDate: period.startDate,
            endDate: period.endDate
          })));
        }
        
        // Atualizar o mês do calendário para o mês do período recomendado
        setCalendarKey(prev => prev + 1);
        
        return;
      }
    }
    
    // Default handling for other recommendation types
    setDateRange({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    });
    
    // Atualizar o mês do calendário para o mês do período recomendado
    setCalendarKey(prev => prev + 1);
    
    if (recommendationType) {
      showSuccess('Recomendação aplicada com sucesso!');
    }
  };
  
  // Helper to parse dates in format "dd/MM" and add the year
  const parseShortDate = (shortDate: string, year: number): Date | null => {
    const parts = shortDate.split('/');
    if (parts.length === 2) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // JavaScript months are 0-indexed
      return new Date(year, month, day);
    }
    return null;
  };
  
  // Handle running optimization tests
  const handleRunTests = () => {
    console.log('Executando testes de otimização...');
    runOptimizationTests();
    toast({
      title: "Testes executados",
      description: "Verifique o console para ver os resultados dos testes de otimização",
    });
  };
  
  // Helper function to show success toast
  const showSuccess = (message: string) => {
    toast({
      title: "Sucesso",
      description: message,
    });
  };
  
  // Helper function to set date range
  const setDateRange = (range: DateRange) => {
    setSelectedRange({
      startDate: new Date(range.startDate),
      endDate: new Date(range.endDate)
    });
  };
  
  // Update vacation recommendations when vacation period changes
  useEffect(() => {
    if (vacationPeriod && vacationPeriod.isValid) {
      const recommendations = generateRecommendations(vacationPeriod);
      setVacationRecommendations(recommendations);
    } else {
      setVacationRecommendations([]);
    }
  }, [vacationPeriod]);
  
  // Atualizar a aba ativa quando houver mudanças nos períodos
  useEffect(() => {
    if (splitPeriods.length > 0) {
      setActiveVacationTab("optimal");
    } else if (splitVacations || splitPeriod) {
      setActiveVacationTab("split");
    } else if (vacationPeriod && vacationPeriod.isValid) {
      setActiveVacationTab("single");
    }
  }, [vacationPeriod, splitVacations, splitPeriod, splitPeriods]);
  
  const handleHolidaysUpdated = () => {
    // Se houver um período de férias selecionado, recalcular após atualização dos feriados
    if (selectedRange && isRangeComplete) {
      const periodDetails = getVacationPeriodDetails(selectedRange.startDate, selectedRange.endDate);
      setVacationPeriod(periodDetails);
      
      // Atualizar recomendações com base nos novos feriados
      if (periodDetails.isValid) {
        const recommendations = generateRecommendations(
          selectedRange.startDate,
          selectedRange.endDate,
          periodDetails
        );
        setVacationRecommendations(recommendations);
      }
      
      // Notificar o usuário
      toast({
        title: "Feriados atualizados",
        description: "O período de férias foi recalculado com os novos feriados.",
      });
    }
    
    // Forçar a renderização do calendário atualizando o key
    setCalendarKey(prev => prev + 1);
  };
  
  // Função para lidar com o botão de limpar seleção do calendário
  const handleClearSelection = () => {
    // Limpar a seleção atual
    setSelectedRange(null);
    setSelectedDate(null);
    setVacationPeriod(null);
    setIsRangeComplete(false);
    setSplitVacations(null);
    setSplitPeriods([]);
    
    // Mostrar toast informando que a seleção foi limpa
    toast({
      title: "Período Limpo",
      description: "Seleção de período removida. Exibindo super otimizações.",
    });
    
    // Forçar a renderização do calendário para atualizar o estado
    setCalendarKey(prev => prev + 1);
    
    // Mostrar super otimizações usando a ref
    if (vacationRecommendationsRef.current) {
      vacationRecommendationsRef.current.showSuperOptimizations();
    }
  };
  
  const handleOpenHolidayModal = () => {
    setShowHolidayModal(true);
  };
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header onHolidaysUpdated={handleHolidaysUpdated} />
      
      {/* Modal de feriados */}
      <HolidayModal
        open={showHolidayModal}
        onOpenChange={setShowHolidayModal}
        onHolidaysUpdated={handleHolidaysUpdated}
      />
      
      <main className="flex-grow container mx-auto py-8 px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4 sm:mb-0">
            Planejador de Férias Judiciais
          </h1>
          
          <Button 
            variant="outline" 
            onClick={handleRunTests} 
            className="text-sm"
          >
            Testar Novas Estratégias de Otimização
          </Button>
        </div>
        
        <p className="text-lg text-gray-600 mb-4">
          Selecione um período no calendário para visualizar a eficiência de suas férias e receber recomendações de otimização.
          <span className="block mt-2 text-sm text-indigo-600">Por padrão, são considerados os feriados estaduais do RJ. Utilize o botão "Feriados: RJ" acima do calendário para alternar para os feriados do ES.</span>
        </p>
        
        <div className="flex items-center p-5 bg-blue-50 rounded-lg mb-8 text-blue-700 text-sm">
          <Lightbulb className="h-5 w-5 mr-3 flex-shrink-0" />
          <div>
            <span className="font-medium">Dica:</span> Utilize o botão <strong>"Ver Super Otimizações"</strong> no painel lateral para descobrir os melhores períodos de férias do ano, sem precisar selecionar datas manualmente.
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          {/* Left column - Calendar */}
          <div className="lg:col-span-2">
            {/* Usar key para forçar a renderização do CalendarView */}
            <CalendarView
              key={calendarKey}
              selectedRange={selectedRange}
              secondaryRange={splitPeriods.length > 0 ? splitPeriods[0] : null}
              onDateSelect={handleDateSelect}
              onDateRangeSelect={handleDateRangeSelect}
              onOpenHolidayModal={handleOpenHolidayModal}
              onClearSelection={handleClearSelection}
            />
            
            {/* Análise de Eficiência agora abaixo do calendário */}
            <div className="mt-6">
              {isRangeComplete && (
                <Tabs 
                  value={activeVacationTab}
                  onValueChange={setActiveVacationTab}
                  className="w-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
                >
                  <div className="p-4 border-b border-gray-100">
                    <TabsList className={`grid ${splitPeriods.length > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                      <TabsTrigger value="single" disabled={!vacationPeriod}>
                        Período Único
                      </TabsTrigger>
                      <TabsTrigger value="split" disabled={!splitVacations && splitPeriod === null && splitPeriods.length === 0}>
                        Período Fracionado
                      </TabsTrigger>
                      {splitPeriods.length > 0 && (
                        <TabsTrigger value="optimal">
                          Fracionamento Ótimo
                        </TabsTrigger>
                      )}
                    </TabsList>
                  </div>
                  
                  <TabsContent value="single" className="p-0">
                    <EfficiencyCalculator vacationPeriod={vacationPeriod} />
                  </TabsContent>
                  
                  <TabsContent value="split" className="p-0">
                    {splitVacations && (
                      <EfficiencyCalculator 
                        vacationPeriod={null}
                        fractionedPeriods={[
                          splitVacations.firstPeriod && splitVacations.firstPeriod.isValid ? splitVacations.firstPeriod : null,
                          splitVacations.secondPeriod && splitVacations.secondPeriod.isValid ? splitVacations.secondPeriod : null
                        ].filter(Boolean)}
                        isFractionated={true}
                      />
                    )}
                    
                    {/* Display single split period */}
                    {!splitVacations && splitPeriod && (
                      <>
                        {/* Get vacation period details for the split period */}
                        {vacationPeriod && (
                          <EfficiencyCalculator 
                            vacationPeriod={null}
                            fractionedPeriods={[
                              vacationPeriod,
                              getVacationPeriodDetails(splitPeriod.startDate, splitPeriod.endDate)
                            ].filter(period => period && period.isValid)}
                            isFractionated={true}
                          />
                        )}
                      </>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="optimal" className="p-0">
                    {splitPeriods.length > 0 && (
                      <EfficiencyCalculator 
                        vacationPeriod={vacationPeriod}
                        fractionedPeriods={[
                          vacationPeriod, 
                          ...splitPeriods.map(period => getVacationPeriodDetails(period.startDate, period.endDate))
                        ].filter(period => period && period.isValid)}
                        isFractionated={true}
                      />
                    )}
                  </TabsContent>
                </Tabs>
              )}
              {!isRangeComplete && (
                <EfficiencyCalculator vacationPeriod={null} />
              )}
            </div>
          </div>
          
          {/* Right column - Recommendations */}
          <div className="lg:col-span-1">
            <VacationRecommendations 
              vacationPeriod={isRangeComplete ? vacationPeriod : null}
              onRecommendationSelect={handleRecommendationSelect}
              ref={vacationRecommendationsRef}
            />
          </div>
        </div>
        
        {/* Additional information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-12">
          <h2 className="text-xl font-semibold mb-4">Como funciona o cálculo de eficiência?</h2>
          <div className="space-y-4">
            <p>
              O cálculo de eficiência considera a proporção entre dias não úteis (fins de semana e feriados) 
              e o total de dias do período selecionado.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-medium text-green-800 mb-2">Alta Eficiência (60%+)</h3>
                <p className="text-sm">Excelente aproveitamento de feriados e fins de semana.</p>
              </div>
              <div className="bg-amber-50 p-4 rounded-lg">
                <h3 className="font-medium text-amber-800 mb-2">Média Eficiência (40-59%)</h3>
                <p className="text-sm">Bom equilíbrio entre dias úteis e não úteis.</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <h3 className="font-medium text-red-800 mb-2">Baixa Eficiência (0-39%)</h3>
                <p className="text-sm">Muitos dias úteis em relação aos não úteis.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
