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
  ChevronRight,
  Link
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateICSFile, downloadFile } from '@/utils/dateUtils';
import { differenceInDays, addDays, subDays, format } from 'date-fns';
import { calculateAdjustedEfficiency, calculateHolidayGain, detectHolidayAdjacency, calculateContinuousBlock } from '@/utils/efficiencyUtils';
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
    if (efficiency >= 1.4) return { 
      label: 'Alta', 
      color: 'text-green-600', 
      icon: <Trophy className="h-5 w-5" />,
      description: 'Eficiência alta (40%+ de ganho): Ótimo aproveitamento de feriados e posicionamento estratégico.'
    };
    if (efficiency >= 1.2) return { 
      label: 'Média', 
      color: 'text-blue-600', 
      icon: <Star className="h-5 w-5" />,
      description: 'Eficiência média (20-40% de ganho): Bom aproveitamento do período.'
    };
    // Anything below 1.2 is considered Low
    return { 
      label: 'Baixa', 
      color: 'text-gray-600', 
      icon: <Umbrella className="h-5 w-5" />,
      description: 'Eficiência baixa (<20% de ganho): Há oportunidades de otimização.'
    };
  };

  // Get efficiency progress percentage
  const getEfficiencyProgress = (efficiency: number) => {
    // Normalizar para uma escala de 0-100
    const base = Math.max(0, efficiency - 1); // Eficiência base começa em 1
    const maxEfficiency = 0.5; // Máxima eficiência adicional esperada (50%)
    return Math.min(100, (base / maxEfficiency) * 100);
  };

  // Função para gerar recomendações de melhoria
  const getEfficiencyRecommendations = (period: VacationPeriod) => {
    const recommendations = [];
    const startDay = period.startDate.getDay();
    const endDay = period.endDate.getDay();
    
    // Detectar adjacência com feriados e calcular bloco contínuo
    const adjacency = detectHolidayAdjacency(period.startDate, period.endDate);
    const isAdjacentToHoliday = adjacency.isAdjacentBefore || adjacency.isAdjacentAfter;
    
    // PRIORIDADE 1: Adjacência com feriados (se não existir)
    if (!isAdjacentToHoliday) {
      recommendations.push({
        icon: <Link className="h-4 w-4" />,
        text: 'Busque períodos que terminam imediatamente antes de um feriado ou começam logo após um feriado',
        priority: 1
      });
    }

    // Verificar início e fim da semana
    if (startDay !== 1) {
      recommendations.push({
        icon: <Calendar className="h-4 w-4" />,
        text: 'Comece na segunda-feira para aproveitar o fim de semana anterior',
        priority: 2
      });
    }
    if (endDay !== 5) {
      recommendations.push({
        icon: <Calendar className="h-4 w-4" />,
        text: 'Termine na sexta-feira para aproveitar o fim de semana seguinte',
        priority: 2
      });
    }

    // Verificar presença de feriados
    if (period.holidayDays === 0) {
      recommendations.push({
        icon: <Star className="h-4 w-4" />,
        text: 'Procure períodos que incluam feriados em dias úteis',
        priority: 3
      });
    }

    // Sugerir fracionamento se período for longo
    if (period.totalDays >= 14) {
      recommendations.push({
        icon: <AlertCircle className="h-4 w-4" />,
        text: 'Considere fracionar as férias para maior flexibilidade',
        priority: 4
      });
    }
    
    // Ordenar recomendações por prioridade
    recommendations.sort((a, b) => a.priority - b.priority);

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

    // Detectar adjacência com feriados e calcular bloco contínuo
    const adjacency = detectHolidayAdjacency(period.startDate, period.endDate);
    const continuousBlock = calculateContinuousBlock(period);
    const isAdjacentToHoliday = adjacency.isAdjacentBefore || adjacency.isAdjacentAfter;
    
    const data = [
      { name: 'Dias Úteis', value: effectiveWorkDays, color: '#94a3b8' },
      { name: 'Feriados em Dias Úteis', value: holidaysOnWorkdays, color: '#8b5cf6' },
      { name: 'Fins de Semana', value: period.weekendDays, color: '#3b82f6' },
    ];

    const titlePrefix = index !== undefined ? `Período ${index + 1}: ` : '';
    const realGainPercentage = calculateVacationGain(period);
    
    // Formatação de datas para o bloco contínuo
    const blockStartFormatted = format(continuousBlock.continuousBlockStart, 'dd/MM/yyyy');
    const blockEndFormatted = format(continuousBlock.continuousBlockEnd, 'dd/MM/yyyy');

    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-medium flex items-center gap-2">
              {titlePrefix}Eficiência do Período
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm ${efficiencyRating.color} bg-opacity-10`}>
                {efficiencyRating.icon}
                {efficiencyRating.label}
              </span>
              {isAdjacentToHoliday && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm text-emerald-600 bg-emerald-50">
                  <Link className="h-4 w-4" />
                  Adjacente a Feriado
                </span>
              )}
            </h3>
            <p className="text-sm text-gray-500 mt-1">{efficiencyRating.description}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            onClick={() => handleExportCalendar(period)}
          >
            <DownloadIcon className="h-4 w-4" />
            Exportar para Calendário
          </Button>
        </div>

        {/* Nova seção: Bloco Contínuo de Descanso */}
        {isAdjacentToHoliday && (
          <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
            <h4 className="font-medium text-emerald-700 flex items-center gap-2 mb-2">
              <Link className="h-5 w-5" />
              Bloco Contínuo de Descanso
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white rounded p-3 shadow-sm">
                <div className="text-sm text-gray-500">Total de dias de descanso</div>
                <div className="text-2xl font-semibold text-emerald-600">{continuousBlock.totalContinuousDays} dias</div>
              </div>
              <div className="bg-white rounded p-3 shadow-sm">
                <div className="text-sm text-gray-500">Período completo</div>
                <div className="text-base font-medium text-gray-700">{blockStartFormatted} a {blockEndFormatted}</div>
              </div>
              <div className="bg-white rounded p-3 shadow-sm">
                <div className="text-sm text-gray-500">Eficiência do bloco</div>
                <div className="text-2xl font-semibold text-blue-600">
                  {Math.round((continuousBlock.totalContinuousDays / period.workDays) * 100)}%
                </div>
              </div>
            </div>
            <div className="text-xs text-emerald-700 mt-2">
              <p>Este período cria um bloco contínuo de descanso ao conectar-se diretamente com feriados e/ou fins de semana, 
              maximizando seu tempo livre utilizando o mínimo de dias formais de férias.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-500">Ganho em Dias de Folga</div>
            <div className="text-2xl font-semibold text-purple-600 flex items-center gap-2">
              {realGainPercentage}
              <Info className="h-4 w-4 text-gray-400" />
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Porcentagem de dias extras de folga obtidos através de feriados em dias úteis
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-500">Eficiência Total</div>
            <div className="text-2xl font-semibold text-blue-600">
              {formatEfficiencyGain(efficiency)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Ganho total considerando adjacência com feriados, posicionamento estratégico e outros fatores
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-500">Progresso de Otimização</div>
            <Progress value={efficiencyProgress} className="mt-2" />
            <div className="text-xs text-gray-500 mt-1">
              Nível de otimização em relação ao máximo teórico de 50%
            </div>
          </div>
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

          {/* Recomendações */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium mb-3">Como melhorar a eficiência</h3>
            <div className="space-y-2">
              {!isAdjacentToHoliday && (
                <div className="flex items-center text-sm text-emerald-600 font-medium border-l-2 border-emerald-500 pl-2 mb-3">
                  <div className="mr-2"><Link className="h-4 w-4" /></div>
                  <span>Procure períodos adjacentes a feriados para maximizar o bloco contínuo de descanso</span>
                </div>
              )}
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
    let totalNonWorkDays = 0;
    let totalStrategicValue = 0;
    let adjacencyBonus = 0;
    
    validPeriods.forEach(period => {
      totalWorkDays += period.workDays;
      totalHolidaysOnWorkdays += period.holidayDays;
      totalNonWorkDays += (period.weekendDays + period.holidayDays);
      
      // Calcular valor estratégico do período
      const startDay = period.startDate.getDay();
      const endDay = period.endDate.getDay();
      
      // Bônus por posicionamento estratégico
      if (startDay === 1) totalStrategicValue += 0.3; // Começa na segunda
      if (endDay === 5) totalStrategicValue += 0.3;   // Termina na sexta
      if (startDay === 1 && endDay === 5) totalStrategicValue += 0.3; // Período "perfeito"
      
      // Bônus por ativação de fim de semana
      if (endDay === 5) totalStrategicValue += 0.6; // Ativa o fim de semana seguinte
      if (startDay === 1) totalStrategicValue += 0.6; // Aproveita o fim de semana anterior
      
      // NOVO: Verificar adjacência com feriados
      const adjacency = detectHolidayAdjacency(period.startDate, period.endDate);
      
      // Bônus substancial para adjacência com feriados (fator mais importante)
      if (adjacency.isAdjacentBefore || adjacency.isAdjacentAfter) {
        adjacencyBonus += 0.8;
      }
      
      // Bônus adicional para blocos contínuos grandes
      if (adjacency.continuousBlockDays > 10) {
        adjacencyBonus += 0.3;
      }
    });
    
    // Evitar divisão por zero
    if (totalWorkDays === 0) return 0;
    
    // Calcular eficiência usando o método híbrido
    let efficiency = 1.0;

    // 1. Ganho por feriados em dias úteis
    if (totalHolidaysOnWorkdays > 0) {
      efficiency += (totalHolidaysOnWorkdays / totalWorkDays);
    }
    
    // 2. Adicionar o bônus de adjacência com feriados (fator mais importante)
    efficiency += adjacencyBonus / totalWorkDays;

    // 3. Adicionar valor estratégico
    efficiency += totalStrategicValue / totalWorkDays;

    // 4. Penalização por desperdício - MÉTODO HÍBRIDO
    if (totalNonWorkDays > 0) {
      // Penalização para o primeiro dia não-útil (mais substancial)
      const firstDayPenalty = 0.35;
      
      if (totalNonWorkDays === 1) {
        efficiency -= firstDayPenalty / totalWorkDays;
      } else {
        // Primeiro dia tem penalidade fixa maior
        // Dias adicionais têm penalidade incremental com taxa de crescimento mais acentuada
        let additionalDays = totalNonWorkDays - 1;
        let additionalPenalty = 0;
        
        for (let i = 0; i < additionalDays; i++) {
          // Cada dia adicional tem penalidade 80% maior que o anterior
          additionalPenalty += firstDayPenalty * Math.pow(1.8, i);
        }
        
        efficiency -= (firstDayPenalty + additionalPenalty) / totalWorkDays;
      }
    }

    // Garantir que a eficiência não fique abaixo de 1.0
    return Math.max(1.0, efficiency);
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
              A eficiência é calculada considerando quatro fatores principais: 
              1) Adjacência com feriados: fator mais importante, com bônus substancial (+0.8) para períodos que terminam imediatamente antes ou começam imediatamente depois de feriados.
              2) Ganho de feriados: a proporção de feriados em dias úteis em relação ao total de dias úteis. 
              3) Ganho de posicionamento: bônus para períodos que começam na segunda-feira e/ou terminam na sexta-feira. 
              4) Penalização por desperdício: penalidade crescente para dias não úteis.
              O bloco contínuo de descanso é o indicador mais importante para avaliar a qualidade do período de férias.
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
          A eficiência é calculada considerando quatro fatores principais: 
          1) Adjacência com feriados: fator mais importante, com bônus substancial (+0.8) para períodos que terminam imediatamente antes ou começam imediatamente depois de feriados.
          2) Ganho de feriados: a proporção de feriados em dias úteis em relação ao total de dias úteis. 
          3) Ganho de posicionamento: bônus para períodos que começam na segunda-feira e/ou terminam na sexta-feira. 
          4) Penalização por desperdício: penalidade crescente para dias não úteis.
          O bloco contínuo de descanso é o indicador mais importante para avaliar a qualidade do período de férias.
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
  const efficiencyExplanationText = `A eficiência é calculada considerando quatro fatores principais: 
    1) Adjacência com feriados: fator mais importante, com bônus substancial (+0.8) para períodos que terminam imediatamente antes ou começam imediatamente depois de feriados.
    2) Ganho de feriados: a proporção de feriados em dias úteis em relação ao total de dias úteis. 
    3) Ganho de posicionamento: bônus para períodos que começam na segunda-feira e/ou terminam na sexta-feira. 
    4) Penalização por desperdício: penalidade crescente para dias não úteis.
    O bloco contínuo de descanso é o indicador mais importante para avaliar a qualidade do período de férias.`;
  
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
            {efficiencyExplanationText}
          </p>
        </div>
      </div>
    </div>
  );
};

export default EfficiencyCalculator;
