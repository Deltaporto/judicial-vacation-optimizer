import React from 'react';
import { VacationPeriod, EfficiencyBreakdown } from '@/types';
import { formatDate } from '@/utils/dateUtils';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { ArrowUp, ArrowDown, ArrowRight, Calendar, DownloadIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateICSFile, downloadFile } from '@/utils/dateUtils';
import { differenceInDays } from 'date-fns';

interface EfficiencyCalculatorProps {
  vacationPeriod: VacationPeriod | null;
  fractionedPeriods?: VacationPeriod[]; // Added for fractionated mode
  isFractionated?: boolean; // Flag to indicate fractionated mode
}

const EfficiencyCalculator: React.FC<EfficiencyCalculatorProps> = ({ 
  vacationPeriod, 
  fractionedPeriods = [], 
  isFractionated = false 
}) => {
  // Função para detectar e remover sobreposições entre períodos
  const removePeriodOverlaps = (periods: VacationPeriod[]): VacationPeriod[] => {
    if (!periods || periods.length <= 1) return periods;
    
    // Ordenar períodos por data de início
    const sortedPeriods = [...periods].sort((a, b) => 
      a.startDate.getTime() - b.startDate.getTime()
    );
    
    const result: VacationPeriod[] = [];
    
    // Verificar cada período
    for (const period of sortedPeriods) {
      // Se é o primeiro período ou não há sobreposição com o último adicionado, adicionar
      if (result.length === 0 || 
          period.startDate > result[result.length - 1].endDate) {
        result.push(period);
      } else {
        // Verificar se este período é uma fração válida de outro período
        const isValidFraction = result.every(existingPeriod => {
          // Períodos são frações válidas se não se sobrepõem completamente
          if (period.startDate >= existingPeriod.startDate && 
              period.endDate <= existingPeriod.endDate) {
            // Este período está completamente contido em outro
            return false;
          }
          
          if (existingPeriod.startDate >= period.startDate && 
              existingPeriod.endDate <= period.endDate) {
            // Outro período está completamente contido neste
            return false;
          }
          
          // Verificar sobreposição parcial
          const hasPartialOverlap = (
            (period.startDate <= existingPeriod.endDate && period.startDate >= existingPeriod.startDate) ||
            (period.endDate >= existingPeriod.startDate && period.endDate <= existingPeriod.endDate)
          );
          
          // Se há sobreposição parcial, não é uma fração válida
          return !hasPartialOverlap;
        });
        
        if (isValidFraction) {
          result.push(period);
        }
      }
    }
    
    // Verificar períodos para garantir que não haja sobreposições
    // e que períodos maiores não englobem períodos menores
    const cleanedPeriods: VacationPeriod[] = [];
    const allPeriods = [...result];
    
    // Ordenar por duração (do menor para o maior)
    allPeriods.sort((a, b) => {
      const durationA = differenceInDays(a.endDate, a.startDate) + 1;
      const durationB = differenceInDays(b.endDate, b.startDate) + 1;
      return durationA - durationB;
    });
    
    // Adicionar períodos verificando sobreposições
    for (const period of allPeriods) {
      // Verificar se este período já está contido em algum dos períodos limpos
      const isSubsetOfExisting = cleanedPeriods.some(existingPeriod => {
        // Verificar se o período atual está completamente contido em outro período
        return (
          period.startDate >= existingPeriod.startDate && 
          period.endDate <= existingPeriod.endDate
        );
      });
      
      // Se não estiver contido em nenhum outro, adicionar
      if (!isSubsetOfExisting) {
        cleanedPeriods.push(period);
      }
    }
    
    // Ordenar novamente por data de início para apresentação
    return cleanedPeriods.sort((a, b) => 
      a.startDate.getTime() - b.startDate.getTime()
    );
  };
  
  // For empty state - no periods selected
  if (!vacationPeriod && fractionedPeriods.length === 0) {
    return (
      <div className="animate-pulse flex flex-col items-center justify-center h-full bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <div className="text-gray-400">
          <Calendar className="h-12 w-12 mb-4 opacity-20" />
          <p className="text-sm">Selecione um período no calendário para visualizar a análise de eficiência</p>
        </div>
      </div>
    );
  }
  
  // Get rating color based on efficiency
  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 0.4) return 'text-green-600';
    if (efficiency >= 0.3) return 'text-amber-500';
    return 'text-red-500';
  };
  
  // Get rating icon based on efficiency
  const getEfficiencyIcon = (rating: string) => {
    switch (rating) {
      case 'high':
        return <ArrowUp className="h-5 w-5 text-green-600" />;
      case 'medium':
        return <ArrowRight className="h-5 w-5 text-amber-500" />;
      case 'low':
        return <ArrowDown className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };
  
  // Handle calendar export for a single period
  const handleExportCalendar = (period: VacationPeriod) => {
    const icsContent = generateICSFile(period);
    downloadFile(
      icsContent, 
      `ferias-${formatDate(period.startDate, 'yyyy-MM-dd')}.ics`,
      'text/calendar'
    );
  };
  
  // Single period analysis component
  const renderPeriodAnalysis = (period: VacationPeriod, index?: number) => {
    // Prepare data for pie chart
    const data = [
      { name: 'Dias Úteis', value: period.workDays, color: '#ef4444' },
      { name: 'Finais de Semana', value: period.weekendDays, color: '#3b82f6' },
      { name: 'Feriados', value: period.holidayDays, color: '#8b5cf6' },
    ];
    
    const titlePrefix = index !== undefined ? `Período ${index + 1}: ` : '';
    
    return (
      <div className={`${index !== undefined ? 'mb-8 pb-8 border-b border-gray-200' : ''}`}>
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4">
            <div>
              <div className="text-sm text-gray-500 mb-1">{titlePrefix}Período selecionado</div>
              <div className="text-lg font-medium">
                {formatDate(period.startDate)} a {formatDate(period.endDate)}
              </div>
            </div>
            
            <Button 
              variant="outline" 
              size="sm"
              className="mt-2 sm:mt-0"
              onClick={() => handleExportCalendar(period)}
            >
              <DownloadIcon className="h-4 w-4 mr-2" />
              Exportar para Calendário
            </Button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm text-gray-500">Total de dias</div>
              <div className="text-2xl font-semibold">{period.totalDays}</div>
            </div>
            
            <div className="bg-red-50 rounded-lg p-3">
              <div className="text-sm text-red-600">Dias úteis</div>
              <div className="text-2xl font-semibold text-red-600">{period.workDays}</div>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-sm text-blue-600">Fins de semana</div>
              <div className="text-2xl font-semibold text-blue-600">{period.weekendDays}</div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-3">
              <div className="text-sm text-purple-600">Feriados</div>
              <div className="text-2xl font-semibold text-purple-600">{period.holidayDays}</div>
            </div>
          </div>
        </div>
        
        {/* Efficiency visualization */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-4">
          <div className="flex items-center mb-4 sm:mb-0">
            <div className={`flex items-center justify-center h-12 w-12 rounded-full ${
              period.efficiencyRating === 'high' ? 'bg-green-100' :
              period.efficiencyRating === 'medium' ? 'bg-amber-100' :
              'bg-red-100'
            } mr-4`}>
              {getEfficiencyIcon(period.efficiencyRating)}
            </div>
            
            <div>
              <div className="text-sm text-gray-500">Classificação de eficiência</div>
              <div className={`text-xl font-medium ${getEfficiencyColor(period.efficiency)}`}>
                {period.efficiencyRating === 'high' ? 'Alta' :
                 period.efficiencyRating === 'medium' ? 'Média' :
                 'Baixa'} ({(period.efficiency * 100).toFixed(0)}%)
              </div>
            </div>
          </div>
          
          <div className="h-[250px] w-full sm:w-[250px] mx-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={true}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Legend verticalAlign="bottom" height={36} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };
  
  // Calculate combined efficiency for all periods (if fractionated)
  const calculateCombinedEfficiency = (periods: VacationPeriod[]) => {
    // Filter out any null or undefined periods
    const validPeriods = periods.filter(Boolean);
    
    // If no valid periods, return 0
    if (validPeriods.length === 0) return 0;
    
    let totalWorkDays = 0;
    let totalDays = 0;
    
    validPeriods.forEach(period => {
      totalWorkDays += period.workDays;
      totalDays += period.totalDays;
    });
    
    // Avoid division by zero
    if (totalDays === 0) return 0;
    
    return (totalDays - totalWorkDays) / totalDays;
  };
  
  // Fractionated periods summary component
  const renderFractionedSummary = (periods: VacationPeriod[]) => {
    // Filter out any null or undefined periods
    const validPeriods = periods.filter(Boolean);
    
    // If no valid periods, don't render anything
    if (validPeriods.length === 0) return null;
    
    const combinedEfficiency = calculateCombinedEfficiency(validPeriods);
    
    return (
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <div className="font-medium text-blue-800 mb-2">Resumo dos Períodos Fracionados</div>
        <div className="flex flex-wrap gap-4">
          <div className="bg-white rounded-lg p-3 flex-1">
            <div className="text-sm text-gray-500">Total de períodos</div>
            <div className="text-xl font-semibold">{validPeriods.length}</div>
          </div>
          
          <div className="bg-white rounded-lg p-3 flex-1">
            <div className="text-sm text-gray-500">Eficiência combinada</div>
            <div className={`text-xl font-semibold ${getEfficiencyColor(combinedEfficiency)}`}>
              {(combinedEfficiency * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Handle the different rendering modes
  if (isFractionated && fractionedPeriods.length > 0) {
    // Filter out any null or undefined periods
    const validPeriods = fractionedPeriods.filter(Boolean);
    
    // Remover sobreposições entre períodos
    const cleanedPeriods = removePeriodOverlaps(validPeriods);
    
    // Only use fractionated mode if we actually have multiple periods
    if (cleanedPeriods.length <= 1) {
      // Fall back to single period mode if there's only one valid period
      const singlePeriod = cleanedPeriods[0];
      if (singlePeriod) {
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-scale-in">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-medium flex items-center">
                Análise de Eficiência
                <span className={`ml-2 text-sm px-2 py-0.5 rounded-full ${getEfficiencyColor(singlePeriod.efficiency)} bg-opacity-10`}>
                  {(singlePeriod.efficiency * 100).toFixed(0)}% eficiente
                </span>
              </h2>
            </div>
            
            <div className="p-6">
              {renderPeriodAnalysis(singlePeriod)}
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
              A eficiência é calculada com base na proporção de dias não úteis (fins de semana e feriados) em relação ao total de dias do período.
            </div>
          </div>
        );
      }
    }
    
    // Continue with fractionated mode for multiple periods
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-scale-in">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-medium flex items-center">
            Análise de Férias Fracionadas
          </h2>
        </div>
        
        <div className="p-6">
          {renderFractionedSummary(cleanedPeriods)}
          
          {cleanedPeriods.map((period, index) => (
            <React.Fragment key={index}>
              {renderPeriodAnalysis(period, index)}
            </React.Fragment>
          ))}
        </div>
        
        <div className="p-4 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
          A eficiência é calculada com base na proporção de dias não úteis (fins de semana e feriados) em relação ao total de dias do período.
        </div>
      </div>
    );
  }
  
  // Regular single period mode
  if (!vacationPeriod || !vacationPeriod.isValid) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-scale-in">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-medium flex items-center">
            Análise de Eficiência
            {vacationPeriod && !vacationPeriod.isValid && (
              <span className="ml-2 text-sm px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                Período Inválido
              </span>
            )}
          </h2>
        </div>
        
        {vacationPeriod && !vacationPeriod.isValid ? (
          <div className="p-6 bg-red-50 text-red-600 text-sm">
            <p>{vacationPeriod.invalidReason}</p>
          </div>
        ) : (
          <div className="animate-pulse flex flex-col items-center justify-center h-full p-8">
            <div className="text-gray-400">
              <Calendar className="h-12 w-12 mb-4 opacity-20" />
              <p className="text-sm">Selecione um período no calendário para visualizar a análise de eficiência</p>
            </div>
          </div>
        )}
      </div>
    );
  }
  
  // Display single period analysis
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-scale-in">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-lg font-medium flex items-center">
          Análise de Eficiência
          <span className={`ml-2 text-sm px-2 py-0.5 rounded-full ${getEfficiencyColor(vacationPeriod.efficiency)} bg-opacity-10`}>
            {(vacationPeriod.efficiency * 100).toFixed(0)}% eficiente
          </span>
        </h2>
      </div>
      
      <div className="p-6">
        {renderPeriodAnalysis(vacationPeriod)}
      </div>
      
      <div className="p-4 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
        A eficiência é calculada com base na proporção de dias não úteis (fins de semana e feriados) em relação ao total de dias do período.
      </div>
    </div>
  );
};

export default EfficiencyCalculator;
