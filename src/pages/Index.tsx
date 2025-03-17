
import React, { useState, useEffect } from 'react';
import Header from '@/components/Layout/Header';
import Footer from '@/components/Layout/Footer';
import CalendarView from '@/components/Calendar/CalendarView';
import EfficiencyCalculator from '@/components/Analysis/EfficiencyCalculator';
import VacationRecommendations from '@/components/Recommendations/VacationRecommendations';
import { DateRange, VacationPeriod } from '@/types';
import { getVacationPeriodDetails } from '@/utils/dateUtils';
import { toast } from '@/components/ui/use-toast';

const Index = () => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedRange, setSelectedRange] = useState<DateRange | null>(null);
  const [vacationPeriod, setVacationPeriod] = useState<VacationPeriod | null>(null);
  const [isRangeComplete, setIsRangeComplete] = useState<boolean>(false);
  
  // Update vacation period when date range changes
  useEffect(() => {
    if (selectedRange) {
      // Check if this is a complete range (not just a single date)
      const isComplete = selectedRange.startDate.getTime() !== selectedRange.endDate.getTime();
      setIsRangeComplete(isComplete);
      
      const periodDetails = getVacationPeriodDetails(selectedRange.startDate, selectedRange.endDate);
      setVacationPeriod(periodDetails);
      
      // Only show validation toast for complete ranges (when both start and end dates are selected)
      if (isComplete && !periodDetails.isValid && periodDetails.invalidReason) {
        toast({
          title: "Período Inválido",
          description: periodDetails.invalidReason,
          variant: "destructive",
        });
      }
    } else {
      setVacationPeriod(null);
      setIsRangeComplete(false);
    }
  }, [selectedRange]);
  
  // Handle single date selection
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    // For a single date, set the range to just that day
    setSelectedRange({ 
      startDate: new Date(date), 
      endDate: new Date(date) 
    });
    // This is just the start of a selection, not a complete range yet
    setIsRangeComplete(false);
  };
  
  // Handle date range selection
  const handleDateRangeSelect = (range: DateRange) => {
    console.log("Range selected:", range);
    // Always create a new range object with proper dates to avoid circular references
    setSelectedRange({
      startDate: new Date(range.startDate),
      endDate: new Date(range.endDate)
    });
    // Only consider it a complete range if start and end are different
    setIsRangeComplete(range.startDate.getTime() !== range.endDate.getTime());
  };
  
  // Handle recommendation selection
  const handleRecommendationSelect = (dateRange: DateRange) => {
    setSelectedRange({
      startDate: new Date(dateRange.startDate),
      endDate: new Date(dateRange.endDate)
    });
    setIsRangeComplete(true);
    toast({
      title: "Recomendação Aplicada",
      description: "O período de férias foi atualizado conforme a recomendação.",
    });
  };
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      
      <main className="flex-1 pt-24 pb-16 px-4 max-w-7xl w-full mx-auto">
        <div className="mb-6">
          <div className="inline-block bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs uppercase tracking-wide font-medium mb-3">
            Otimizador de Férias
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-3">Planeje suas férias com eficiência</h1>
          <p className="text-lg text-gray-600 max-w-2xl">
            Ferramenta exclusiva para magistrados federais selecionarem os melhores períodos de férias, seguindo estritamente as resoluções do CJF.
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-12">
          {/* Left column - Calendar */}
          <div className="lg:col-span-2">
            <CalendarView 
              selectedRange={selectedRange}
              onDateSelect={handleDateSelect}
              onDateRangeSelect={handleDateRangeSelect}
            />
          </div>
          
          {/* Right column - Analysis & Recommendations */}
          <div className="lg:col-span-3 space-y-6">
            <EfficiencyCalculator vacationPeriod={isRangeComplete ? vacationPeriod : null} />
            <VacationRecommendations 
              vacationPeriod={isRangeComplete ? vacationPeriod : null}
              onRecommendationSelect={handleRecommendationSelect}
            />
          </div>
        </div>
        
        {/* Additional information */}
        <div className="rounded-xl shadow-sm border border-gray-100 overflow-hidden bg-gradient-to-r from-white to-gray-50 p-6">
          <h2 className="text-xl font-bold mb-4">Sobre a Ferramenta</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Características Principais</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start">
                  <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center mr-2 mt-0.5 text-xs text-blue-600 font-medium">1</div>
                  <span>Processamento 100% no navegador, sem armazenamento de dados em servidores.</span>
                </li>
                <li className="flex items-start">
                  <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center mr-2 mt-0.5 text-xs text-blue-600 font-medium">2</div>
                  <span>Análise em tempo real da eficiência do período selecionado.</span>
                </li>
                <li className="flex items-start">
                  <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center mr-2 mt-0.5 text-xs text-blue-600 font-medium">3</div>
                  <span>Recomendações inteligentes para otimizar o aproveitamento das férias.</span>
                </li>
                <li className="flex items-start">
                  <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center mr-2 mt-0.5 text-xs text-blue-600 font-medium">4</div>
                  <span>Calendário especializado com feriados nacionais, judiciais e recesso forense.</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">Como Usar</h3>
              <ol className="space-y-2 text-gray-600">
                <li className="flex items-start">
                  <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center mr-2 mt-0.5 text-xs text-green-600 font-medium">1</div>
                  <span>Selecione um intervalo de datas no calendário, arrastando do dia inicial ao final.</span>
                </li>
                <li className="flex items-start">
                  <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center mr-2 mt-0.5 text-xs text-green-600 font-medium">2</div>
                  <span>Veja a análise de eficiência e a composição dos dias selecionados.</span>
                </li>
                <li className="flex items-start">
                  <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center mr-2 mt-0.5 text-xs text-green-600 font-medium">3</div>
                  <span>Confira as recomendações para otimizar seu período.</span>
                </li>
                <li className="flex items-start">
                  <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center mr-2 mt-0.5 text-xs text-green-600 font-medium">4</div>
                  <span>Exporte o período selecionado para seu calendário pessoal.</span>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
