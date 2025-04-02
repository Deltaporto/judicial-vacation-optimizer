import React from 'react';
import { VacationPeriod, EfficiencyBreakdown } from '@/types';
import { formatDate } from '@/utils/dateUtils';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { 
  ArrowUp, 
  ArrowDown, 
  ArrowRight, 
  Calendar, 
  DownloadIcon, 
  Info,
  Sun,
  Umbrella,
  Trophy,
  Star,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateICSFile, downloadFile } from '@/utils/dateUtils';
import { differenceInDays } from 'date-fns';
import { calculateAdjustedEfficiency, calculateHolidayGain } from '@/utils/efficiencyUtils';
import { Progress } from '@/components/ui/progress';

interface EfficiencyCalculatorProps {
  vacationPeriod: VacationPeriod | null;
  fractionedPeriods?: VacationPeriod[];
  isFractionated?: boolean;
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
  
  // Get rating based on efficiency
  const getEfficiencyRating = (efficiency: number) => {
    if (efficiency >= 1.4) return { label: 'Excelente', color: 'text-green-600', icon: <Trophy className="h-5 w-5" /> };
    if (efficiency >= 1.2) return { label: 'Ótima', color: 'text-blue-600', icon: <Star className="h-5 w-5" /> };
    if (efficiency >= 1.1) return { label: 'Boa', color: 'text-amber-500', icon: <Sun className="h-5 w-5" /> };
    return { label: 'Regular', color: 'text-gray-600', icon: <Umbrella className="h-5 w-5" /> };
  };

  // Get efficiency progress percentage
  const getEfficiencyProgress = (efficiency: number) => {
    // Normalizar para uma escala de 0-100
    const base = Math.max(0, efficiency - 1); // Eficiência base começa em 1
    const maxEfficiency = 0.4; // Máxima eficiência adicional esperada (40%)
    return Math.min(100, (base / maxEfficiency) * 100);
  };

  // Função para gerar recomendações de melhoria
  const getEfficiencyRecommendations = (period: VacationPeriod) => {
    const recommendations = [];
    const startDay = period.startDate.getDay();
    const endDay = period.endDate.getDay();

    // Verificar início e fim da semana
    if (startDay !== 1) {
      recommendations.push({
        icon: <Calendar className="h-4 w-4" />,
        text: 'Comece na segunda-feira para aproveitar o fim de semana anterior'
      });
    }
    if (endDay !== 5) {
      recommendations.push({
        icon: <Calendar className="h-4 w-4" />,
        text: 'Termine na sexta-feira para aproveitar o fim de semana seguinte'
      });
    }

    // Verificar presença de feriados
    if (period.holidayDays === 0) {
      recommendations.push({
        icon: <Star className="h-4 w-4" />,
        text: 'Procure períodos que incluam feriados em dias úteis'
      });
    }

    // Sugerir fracionamento se período for longo
    if (period.totalDays >= 14) {
      recommendations.push({
        icon: <AlertCircle className="h-4 w-4" />,
        text: 'Considere fracionar as férias para maior flexibilidade'
      });
    }

    return recommendations;
  };

  // Função auxiliar para calcular o ganho real em dias de folga
  const calculateVacationGain = (period: VacationPeriod): string => {
    // Usar a função utilitária para calcular o ganho
    const gainPercentage = calculateHolidayGain(period);
    return `${gainPercentage}%`;
  };
  
  // Função auxiliar para formatar a eficiência em porcentagem de ganho
  const formatEfficiencyGain = (efficiency: number): string => {
    return `${((efficiency - 1) * 100).toFixed(0)}%`;
  };
  
  // Função para obter o texto de classificação de eficiência
  const getEfficiencyLabel = (rating: string): string => {
    switch (rating) {
      case 'high':
        return 'Alta';
      case 'medium':
        return 'Média';
      case 'low':
        return 'Baixa';
      default:
        return '';
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
    const holidaysOnWorkdays = period.holidayDays;
    const effectiveWorkDays = period.workDays - holidaysOnWorkdays;
    const efficiency = period.efficiency;
    const efficiencyRating = getEfficiencyRating(efficiency);
    const efficiencyProgress = getEfficiencyProgress(efficiency);
    const recommendations = getEfficiencyRecommendations(period);

    const data = [
      { name: 'Dias Úteis', value: effectiveWorkDays, color: '#94a3b8' },
      { name: 'Feriados em Dias Úteis', value: holidaysOnWorkdays, color: '#8b5cf6' },
      { name: 'Fins de Semana', value: period.weekendDays, color: '#3b82f6' },
    ];

    const titlePrefix = index !== undefined ? `Período ${index + 1}: ` : '';
    const realGainPercentage = calculateVacationGain(period);

    return (
      <div className={`${index !== undefined ? 'mb-8 pb-8 border-b border-gray-200' : ''}`}>
        {/* Cabeçalho do Período */}
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

          {/* Indicador de Eficiência */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex items-center mb-2">
              <div className={`mr-2 ${efficiencyRating.color}`}>
                {efficiencyRating.icon}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">Eficiência {efficiencyRating.label}</div>
                <div className="text-xs text-gray-500">
                  Ganho real em dias de folga: {realGainPercentage}
                </div>
              </div>
            </div>
            <Progress value={efficiencyProgress} className="h-2" />
          </div>

          {/* Estatísticas do Período */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm text-gray-500">Total de dias</div>
              <div className="text-2xl font-semibold">{period.totalDays}</div>
            </div>
            
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-sm text-slate-600">Dias úteis</div>
              <div className="text-2xl font-semibold text-slate-600">{effectiveWorkDays}</div>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-sm text-blue-600">Fins de semana</div>
              <div className="text-2xl font-semibold text-blue-600">{period.weekendDays}</div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-3">
              <div className="text-sm text-purple-600">Feriados em dias úteis</div>
              <div className="text-2xl font-semibold text-purple-600">{holidaysOnWorkdays}</div>
            </div>
          </div>
        </div>

        {/* Visualização e Recomendações */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Gráfico */}
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={65}
                  paddingAngle={2}
                  dataKey="value"
                  label={null}
                  labelLine={false}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Legend 
                  layout="vertical" 
                  verticalAlign="middle" 
                  align="right"
                  wrapperStyle={{ 
                    paddingLeft: '25px',  // Aumentado para maior espaçamento 
                    marginRight: '10px',  // Margem à direita
                    lineHeight: '24px'    // Espaçamento entre itens da legenda
                  }}
                  iconSize={10}           // Tamanho reduzido dos ícones da legenda
                  iconType="circle"       // Formato circular para os ícones (combina melhor com o gráfico)
                />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Recomendações */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium mb-3">Como melhorar a eficiência</h3>
            <div className="space-y-2">
              {recommendations.map((rec, idx) => (
                <div key={idx} className="flex items-center text-sm text-gray-600">
                  <div className="mr-2 text-blue-600">{rec.icon}</div>
                  <span>{rec.text}</span>
                </div>
              ))}
            </div>
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
    let totalHolidaysOnWorkdays = 0;
    
    validPeriods.forEach(period => {
      // Acumular dias úteis e feriados em dias úteis
      totalWorkDays += period.workDays;
      totalHolidaysOnWorkdays += period.holidayDays;
    });
    
    // Evitar divisão por zero
    if (totalWorkDays === 0) return 0;
    
    // Calcular a eficiência combinada usando a mesma lógica do calculateAdjustedEfficiency
    // Onde o ganho é proporcional aos feriados em dias úteis
    return 1.0 + (totalHolidaysOnWorkdays / totalWorkDays);
  };
  
  // Calcular ganho real combinado para períodos fracionados
  const calculateCombinedVacationGain = (periods: VacationPeriod[]): string => {
    const validPeriods = periods.filter(Boolean);
    
    if (validPeriods.length === 0) return '0%';
    
    let totalWorkDays = 0;
    let totalHolidaysOnWorkdays = 0;
    
    validPeriods.forEach(period => {
      totalWorkDays += period.workDays;
      totalHolidaysOnWorkdays += period.holidayDays;
    });
    
    if (totalWorkDays === 0 || totalHolidaysOnWorkdays === 0) return '0%';
    
    // Calcular ganho percentual de dias de folga usando a mesma lógica
    const gainPercentage = Math.round((totalHolidaysOnWorkdays / totalWorkDays) * 100);
    return `${gainPercentage}%`;
  };
  
  // Fractionated periods summary component
  const renderFractionedSummary = (periods: VacationPeriod[]) => {
    // Filter out any null or undefined periods
    const validPeriods = periods.filter(Boolean);
    
    // If no valid periods, don't render anything
    if (validPeriods.length === 0) return null;
    
    const combinedEfficiency = calculateCombinedEfficiency(validPeriods);
    const realGainPercentage = calculateCombinedVacationGain(validPeriods);
    
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
            <div className={`text-xl font-semibold ${getEfficiencyRating(combinedEfficiency).color}`}>
              {getEfficiencyRating(combinedEfficiency).label}
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-3 flex-1">
            <div className="text-sm text-gray-500">Ganho real em dias de folga</div>
            <div className="text-xl font-semibold text-purple-600">
              {realGainPercentage}
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
                <span className={`ml-2 text-sm px-2 py-0.5 rounded-full ${getEfficiencyRating(singlePeriod.efficiency).color} bg-opacity-10`}>
                  {getEfficiencyRating(singlePeriod.efficiency).label}
                </span>
              </h2>
            </div>
            
            <div className="p-6">
              {renderPeriodAnalysis(singlePeriod)}
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
              A eficiência é calculada com base em dois fatores principais: 
              1) Ganho de feriados: a proporção de feriados em dias úteis em relação ao total de dias úteis (principal benefício). 
              2) Ganho de posicionamento: bônus para períodos que começam na segunda-feira e/ou terminam na sexta-feira, otimizando o uso dos finais de semana. 
              O ganho real em dias de folga indica a porcentagem direta de dias extras de folga obtidos (feriados em dias úteis ÷ dias úteis).
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
          A eficiência é calculada com base em dois fatores principais: 
          1) Ganho de feriados: a proporção de feriados em dias úteis em relação ao total de dias úteis (principal benefício). 
          2) Ganho de posicionamento: bônus para períodos que começam na segunda-feira e/ou terminam na sexta-feira, otimizando o uso dos finais de semana. 
          O ganho real em dias de folga indica a porcentagem direta de dias extras de folga obtidos (feriados em dias úteis ÷ dias úteis).
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
  
  // Updated explanation text
  const efficiencyExplanationText = `A eficiência é calculada com base em dois fatores principais: 
    1) Ganho de feriados: a proporção de feriados em dias úteis em relação ao total de dias úteis (principal benefício). 
    2) Ganho de posicionamento: bônus para períodos que começam na segunda-feira e/ou terminam na sexta-feira, otimizando o uso dos finais de semana. 
    O ganho real em dias de folga indica a porcentagem direta de dias extras de folga obtidos (feriados em dias úteis ÷ dias úteis).`;
  
  // Display single period analysis
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-scale-in">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-lg font-medium flex items-center">
          Análise de Eficiência
          {vacationPeriod && (
            <span className={`ml-2 text-sm px-2 py-0.5 rounded-full ${getEfficiencyRating(vacationPeriod.efficiency).color} bg-opacity-10`}>
              {getEfficiencyRating(vacationPeriod.efficiency).label}
            </span>
          )}
        </h2>
      </div>
      
      <div className="p-6">
        {renderPeriodAnalysis(vacationPeriod)}
      </div>
      
      <div className="p-4 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
        <div className="flex items-start">
          <Info className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
          <p>
            A eficiência indica quanto suas férias otimizam seu tempo livre. 
            Uma eficiência Regular significa que você está usando dias úteis normalmente, 
            enquanto classificações melhores indicam que você está aproveitando feriados 
            e posicionamento estratégico para maximizar seu descanso.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EfficiencyCalculator;
