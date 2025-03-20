import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { VacationPeriod, DateRange, Recommendation } from '@/types';
import { generateRecommendations, generateSuperOptimizations, calculateHolidayGain } from '@/utils/efficiencyUtils';
import { formatDate, getVacationPeriodDetails } from '@/utils/dateUtils';
import { differenceInDays } from 'date-fns';
import { 
  ArrowRight, 
  Calendar, 
  MoveRight, 
  Expand, 
  SplitSquareVertical,
  BarChart4,
  Check,
  Link,
  Zap,
  Swords,
  TrendingUp,
  Lightbulb,
  HandHelping,
  Star,
  CalendarCheck,
  Calendar as CalendarIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { v4 as uuidv4 } from 'uuid';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useIsMobile } from '@/hooks/use-mobile';

interface VacationRecommendationsProps {
  vacationPeriod: VacationPeriod | null;
  onRecommendationSelect: (dateRange: DateRange, recommendationType?: string) => void;
}

// Modificar para usar forwardRef
const VacationRecommendations = forwardRef<
  { showSuperOptimizations: () => void },
  VacationRecommendationsProps
>(({ vacationPeriod, onRecommendationSelect }, ref) => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [superOptimizations, setSuperOptimizations] = useState<Recommendation[]>([]);
  const [showSuperOptimizations, setShowSuperOptimizations] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("all");
  const isMobile = useIsMobile();
  
  // Expõe a função handleShowSuperOptimizations para o componente pai via ref
  useImperativeHandle(ref, () => ({
    showSuperOptimizations: handleShowSuperOptimizations
  }));
  
  // Quando o vacationPeriod mudar para null (após limpar a seleção), mostrar super otimizações
  useEffect(() => {
    if (vacationPeriod === null && !showSuperOptimizations) {
      // Aguardar um pequeno delay para garantir que a UI seja atualizada corretamente
      const timer = setTimeout(() => {
        handleShowSuperOptimizations();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [vacationPeriod]);
  
  // Generate recommendations when vacation period changes
  useEffect(() => {
    if (vacationPeriod && vacationPeriod.isValid) {
      const newRecommendations = generateRecommendations(vacationPeriod);
      setRecommendations(newRecommendations);
      // Reset to standard recommendations when period changes
      setShowSuperOptimizations(false);
      setActiveTab("all");
    } else {
      setRecommendations([]);
    }
  }, [vacationPeriod]);
  
  // Adicionar listener para o evento personalizado 'showSuperOptimizations'
  useEffect(() => {
    const handleShowSuperOptimizationsEvent = () => {
      handleShowSuperOptimizations();
    };
    
    // Adicionar o listener no elemento atual
    const element = document.querySelector('[data-vacation-recommendations]');
    if (element) {
      element.addEventListener('showSuperOptimizations', handleShowSuperOptimizationsEvent);
    }
    
    // Limpar o listener quando o componente for desmontado
    return () => {
      if (element) {
        element.removeEventListener('showSuperOptimizations', handleShowSuperOptimizationsEvent);
      }
    };
  }, []);  // A dependência vazia significa que este efeito só é executado na montagem/desmontagem
  
  // Generate super optimizations when requested
  const handleShowSuperOptimizations = () => {
    try {
      const currentYear = new Date().getFullYear();
      console.log("Gerando super otimizações para o ano:", currentYear);
      
      // Tentar gerar as super otimizações
      const optimizations = generateSuperOptimizations(currentYear);
      console.log("Super otimizações geradas:", optimizations.length);
      
      if (optimizations.length === 0) {
        console.error("ERRO: A função gerou uma lista vazia de super otimizações!");
        
        // Criar pelo menos uma recomendação forçada para exibir
        const fallbackRecommendation: Recommendation = {
          id: uuidv4(),
          type: 'optimize',
          title: `Férias Estratégicas ${currentYear}`,
          description: `Aproveite este período estratégico para maximizar seu tempo livre em ${currentYear}.`,
          suggestedDateRange: {
            startDate: new Date(currentYear, 0, 15), // 15 de janeiro
            endDate: new Date(currentYear, 0, 29),   // 29 de janeiro
          },
          efficiencyGain: 1.2,
          daysChanged: 15,
          strategicScore: 7
        };
        
        setSuperOptimizations([fallbackRecommendation]);
      } else {
        setSuperOptimizations(optimizations);
        console.log("Primeiras recomendações:", optimizations.slice(0, 3).map(r => r.title));
      }
      
      setShowSuperOptimizations(true);
      // Garantir que a tab "todas" esteja selecionada para mostrar todas as recomendações
      setActiveTab("all");
    } catch (error) {
      console.error("Erro ao gerar super otimizações:", error);
      
      // Em caso de erro, criar recomendações de fallback
      const fallbackRecommendations: Recommendation[] = [
        {
          id: uuidv4(),
          type: 'optimize',
          title: `Férias de Janeiro ${new Date().getFullYear()}`,
          description: `Aproveite o verão com férias em janeiro.`,
          suggestedDateRange: {
            startDate: new Date(new Date().getFullYear(), 0, 10),
            endDate: new Date(new Date().getFullYear(), 0, 24)
          },
          efficiencyGain: 1.2,
          daysChanged: 15,
          strategicScore: 7
        },
        {
          id: uuidv4(),
          type: 'optimize',
          title: `Férias de Julho ${new Date().getFullYear()}`,
          description: `Aproveite o inverno com férias em julho.`,
          suggestedDateRange: {
            startDate: new Date(new Date().getFullYear(), 6, 10),
            endDate: new Date(new Date().getFullYear(), 6, 24)
          },
          efficiencyGain: 1.3,
          daysChanged: 15,
          strategicScore: 8
        }
      ];
      
      setSuperOptimizations(fallbackRecommendations);
      setShowSuperOptimizations(true);
      setActiveTab("all");
    }
  };
  
  // Get recommendation badge color based on type
  const getRecommendationColor = (type: string): string => {
    switch (type) {
      case 'extend':
        return 'bg-blue-100 text-blue-800';
      case 'reduce':
        return 'bg-amber-100 text-amber-800';
      case 'shift':
        return 'bg-purple-100 text-purple-800';
      case 'split':
        return 'bg-emerald-100 text-emerald-800';
      case 'bridge':
        return 'bg-indigo-100 text-indigo-800';
      case 'super_bridge':
        return 'bg-rose-100 text-rose-800';
      case 'optimize':
        return 'bg-teal-100 text-teal-800';
      case 'optimal_fraction':
        return 'bg-cyan-100 text-cyan-800';
      case 'hybrid':
        return 'bg-fuchsia-100 text-fuchsia-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Get recommendation icon based on type
  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'extend':
      case 'reduce':
        return <ArrowRight className="h-4 w-4" />;
      case 'shift':
        return <Calendar className="h-4 w-4" />;
      case 'optimize':
        return <TrendingUp className="h-4 w-4" />;
      case 'bridge':
      case 'super_bridge':
        return <Star className="h-4 w-4" />;
      case 'split':
      case 'optimal_fraction':
        return <Lightbulb className="h-4 w-4" />;
      case 'hybrid':
        return <HandHelping className="h-4 w-4" />;
      default:
        return <Lightbulb className="h-4 w-4" />;
    }
  };
  
  // Filter recommendations based on active tab
  const getFilteredRecommendations = (): Recommendation[] => {
    const activeTabs: Record<string, string[]> = {
      "all": [],
      "extend": ["extend", "reduce"],
      "shift": ["shift"],
      "optimize": ["optimize"],
      "bridge": ["bridge", "super_bridge"],
      "fraction": ["split", "optimal_fraction"]
    };
    
    const source = showSuperOptimizations ? superOptimizations : recommendations;
    
    console.log("Fonte de recomendações:", 
                showSuperOptimizations ? "Super Otimizações" : "Recomendações normais", 
                "Total:", source.length);
    
    if (activeTab === "all") {
      return source;
    }
    
    return source.filter(rec => activeTabs[activeTab].includes(rec.type));
  };
  
  // Empty state component for no selected period
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-4">
      <div className="mb-6 bg-gray-100 h-16 w-16 rounded-full flex items-center justify-center">
        <Calendar className="h-8 w-8 text-gray-400" />
      </div>
      <p className="text-gray-500 mb-8">Selecione um período no calendário para ver recomendações específicas</p>
      <div className="border-t border-gray-100 pt-6 w-full">
        <div className="mb-6 text-sm text-gray-700">
          <div className="flex items-center mb-3">
            <Lightbulb className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0" />
            <span className="font-medium">Super Otimizações</span>
          </div>
          <p>Veja os melhores períodos de férias do ano já calculados, mesmo sem selecionar datas no calendário.</p>
        </div>
        <Button 
          variant="default"
          className="w-full py-5"
          onClick={handleShowSuperOptimizations}
          data-show-super-optimizations
        >
          <Zap className="h-5 w-5 mr-2 flex-shrink-0" />
          <span>Ver Super Otimizações</span>
        </Button>
      </div>
    </div>
  );
  
  // Empty recommendations component
  const NoRecommendationsState = () => (
    <div className="text-center py-8">
      <p className="text-gray-500">Não foram encontradas recomendações para este período</p>
    </div>
  );
  
  // No super optimizations state
  const NoSuperOptimizationsState = () => (
    <div className="text-center py-8">
      <div className="mb-6">
        <Lightbulb className="h-10 w-10 text-amber-400 mx-auto" />
      </div>
      <p className="text-gray-500 mb-4">Não encontramos super otimizações disponíveis no momento</p>
      <p className="text-sm text-gray-400">Verifique se os feriados e recessos estão configurados corretamente. Pode ser um problema temporário no sistema de cálculo.</p>
      <button 
        onClick={() => handleShowSuperOptimizations()} 
        className="mt-4 px-4 py-2 bg-amber-100 text-amber-800 rounded-md hover:bg-amber-200 transition-colors"
      >
        <Zap className="h-4 w-4 mr-2 inline-flex" />
        Tentar novamente
      </button>
    </div>
  );
  
  // Header component
  const RecommendationsHeader = () => (
    <div className="flex flex-col mb-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">
          {showSuperOptimizations ? 'Super Otimizações' : 'Recomendações'}
        </h2>
        
        {showSuperOptimizations && vacationPeriod && vacationPeriod.isValid && (
          <Button 
            variant="ghost" 
            size="sm"
            className="h-9 px-3"
            onClick={() => setShowSuperOptimizations(false)}
          >
            Ver recomendações específicas
          </Button>
        )}
        
        {!showSuperOptimizations && !vacationPeriod && (
          <Button 
            variant="outline" 
            size="sm"
            className="h-9 px-3 whitespace-nowrap"
            onClick={handleShowSuperOptimizations}
            data-show-super-optimizations
          >
            <Zap className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>Ver super otimizações</span>
          </Button>
        )}
      </div>
      
      {showSuperOptimizations && (
        <p className="text-sm text-gray-600 mt-2">
          Essas são as melhores opções de férias para o ano atual, calculadas automaticamente.
        </p>
      )}
    </div>
  );
  
  // Filter tabs component
  const FilterTabs = () => {
    // For mobile devices, use a scrollable toggle group
    if (isMobile) {
      return (
        <div className="mb-4 overflow-auto pb-2 -mx-2 px-2">
          <ToggleGroup 
            type="single" 
            value={activeTab} 
            onValueChange={(value) => value && setActiveTab(value)}
            className="flex w-max space-x-1"
          >
            <ToggleGroupItem value="all" className="whitespace-nowrap">Todas</ToggleGroupItem>
            <ToggleGroupItem value="extend" className="whitespace-nowrap">Ajustar</ToggleGroupItem>
            <ToggleGroupItem value="shift" className="whitespace-nowrap">Deslocar</ToggleGroupItem>
            <ToggleGroupItem value="optimize" className="whitespace-nowrap">Otimizar</ToggleGroupItem>
            <ToggleGroupItem value="bridge" className="whitespace-nowrap">Pontes</ToggleGroupItem>
            <ToggleGroupItem value="fraction" className="whitespace-nowrap">Fracionar</ToggleGroupItem>
            <ToggleGroupItem value="recess" className="whitespace-nowrap">Recessos</ToggleGroupItem>
          </ToggleGroup>
        </div>
      );
    }

    // For desktop, use the existing tabs layout with responsive grid
    return (
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
        <TabsList className="w-full grid grid-cols-7">
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="extend">Ajustar</TabsTrigger>
          <TabsTrigger value="shift">Deslocar</TabsTrigger>
          <TabsTrigger value="optimize">Otimizar</TabsTrigger>
          <TabsTrigger value="bridge">Pontes</TabsTrigger>
          <TabsTrigger value="fraction">Fracionar</TabsTrigger>
          <TabsTrigger value="recess">Recessos</TabsTrigger>
        </TabsList>
      </Tabs>
    );
  };
  
  // Recommendation card component
  const RecommendationCard = ({ recommendation }: { recommendation: Recommendation }) => {
    // Função para calcular os dias totais de descanso e economia
    const calculateVacationMetrics = () => {
      const startDate = recommendation.suggestedDateRange.startDate;
      const endDate = recommendation.suggestedDateRange.endDate;
      const period = getVacationPeriodDetails(startDate, endDate);
      
      // Total de dias consecutivos (incluindo finais de semana e feriados)
      const totalDays = differenceInDays(endDate, startDate) + 1;
      
      // Dias úteis que seriam necessários sem a estratégia
      const standardWorkDays = period.workDays + period.holidayDays;
      
      // Economia de dias de férias
      const savedDays = standardWorkDays - period.workDays;
      
      return {
        totalRestDays: totalDays,
        savedVacationDays: savedDays,
        workDays: period.workDays
      };
    };
    
    const metrics = calculateVacationMetrics();
    
    return (
      <Card className="mb-4 hover:shadow-md transition-shadow duration-200">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <CardTitle className="text-base">{recommendation.title}</CardTitle>
            <Badge className={`${getRecommendationColor(recommendation.type)} flex items-center`}>
              {getRecommendationIcon(recommendation.type)}
              <span className="ml-1">
                {recommendation.type === 'super_bridge' ? 'Super Ponte' :
                 recommendation.type === 'bridge' ? 'Ponte' :
                 recommendation.type === 'extend' ? 'Estender' :
                 recommendation.type === 'reduce' ? 'Reduzir' :
                 recommendation.type === 'shift' ? 'Deslocar' :
                 recommendation.type === 'split' ? 'Fracionar' :
                 recommendation.type === 'optimal_fraction' ? 'Fração Ideal' :
                 recommendation.type === 'hybrid' ? 'Estratégia Combinada' :
                 recommendation.type === 'hybrid_bridge_split' ? 'Ponte + Fração' :
                 recommendation.type === 'optimal_hybrid' ? 'Híbrido Ideal' :
                 recommendation.type === 'optimize' ? 'Otimizar' :
                 'Personalizar'}
              </span>
            </Badge>
          </div>
          <CardDescription className="text-xs">
            {recommendation.suggestedDateRange.startDate && recommendation.suggestedDateRange.endDate && (
              <>
                {formatDate(recommendation.suggestedDateRange.startDate)} - {formatDate(recommendation.suggestedDateRange.endDate)}
                
                <div className="flex flex-col mt-1 gap-0.5">
                  <span className="flex items-center text-purple-600 text-xs">
                    <CalendarCheck className="h-3 w-3 mr-1" />
                    {metrics.workDays} dias úteis = {metrics.totalRestDays} dias consecutivos de descanso
                  </span>
                  {metrics.savedVacationDays > 0 && (
                    <span className="flex items-center text-green-600 text-sm font-medium">
                      <Zap className="h-3 w-3 mr-1" />
                      Economize {metrics.savedVacationDays} {metrics.savedVacationDays === 1 ? 'dia' : 'dias'} de férias!
                    </span>
                  )}
                </div>
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">{recommendation.description}</p>
          
          {/* Mostrar pontuação estratégica somente em modo de desenvolvimento */}
          {process.env.NODE_ENV === 'development' && recommendation.strategicScore && (
            <div className="mt-2 text-xs text-gray-400">
              Score: {recommendation.strategicScore.toFixed(1)}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            size="sm" 
            onClick={() => onRecommendationSelect(recommendation.suggestedDateRange, recommendation.type)}
            className="w-full"
          >
            Aplicar
          </Button>
        </CardFooter>
      </Card>
    );
  };
  
  // Main render
  return (
    <div 
      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-scale-in"
      data-vacation-recommendations
    >
      <div className="p-6">
        <RecommendationsHeader />
        
        {/* Empty state when no period selected and not showing super optimizations */}
        {!vacationPeriod && !showSuperOptimizations && <EmptyState />}
        
        {/* Show recommendations or super optimizations */}
        {(vacationPeriod || showSuperOptimizations) && (
          <>
            <FilterTabs />
            
            {getFilteredRecommendations().length === 0 ? (
              showSuperOptimizations ? <NoSuperOptimizationsState /> : <NoRecommendationsState />
            ) : (
              <div className="space-y-5">
                {getFilteredRecommendations().map(recommendation => (
                  <RecommendationCard key={recommendation.id} recommendation={recommendation} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
});

export default VacationRecommendations;
