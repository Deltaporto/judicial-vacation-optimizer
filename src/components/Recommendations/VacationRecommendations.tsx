import React, { useState, useEffect } from 'react';
import { VacationPeriod, DateRange, Recommendation } from '@/types';
import { generateRecommendations, generateSuperOptimizations } from '@/utils/efficiencyUtils';
import { formatDate } from '@/utils/dateUtils';
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
  Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface VacationRecommendationsProps {
  vacationPeriod: VacationPeriod | null;
  onRecommendationSelect: (dateRange: DateRange, recommendationType?: string) => void;
}

const VacationRecommendations: React.FC<VacationRecommendationsProps> = ({ 
  vacationPeriod, 
  onRecommendationSelect 
}) => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [superOptimizations, setSuperOptimizations] = useState<Recommendation[]>([]);
  const [showSuperOptimizations, setShowSuperOptimizations] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("all");
  
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
  
  // Generate super optimizations when requested
  const handleShowSuperOptimizations = () => {
    const currentYear = new Date().getFullYear();
    const optimizations = generateSuperOptimizations(currentYear);
    setSuperOptimizations(optimizations);
    setShowSuperOptimizations(true);
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
      case 'recess':
        return 'bg-violet-100 text-violet-800';
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
      "fraction": ["split", "optimal_fraction"],
      "recess": ["recess"]
    };
    
    const source = showSuperOptimizations ? superOptimizations : recommendations;
    
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
  const FilterTabs = () => (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
      <TabsList className="w-full grid grid-cols-3 sm:grid-cols-7">
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
  
  // Recommendation card component
  const RecommendationCard = ({ recommendation }: { recommendation: Recommendation }) => (
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
               recommendation.type === 'optimize' ? 'Otimizar' :
               recommendation.type === 'recess' ? 'Recesso' :
               'Personalizar'}
            </span>
          </Badge>
        </div>
        <CardDescription className="text-xs">
          {recommendation.suggestedDateRange.startDate && recommendation.suggestedDateRange.endDate && (
            <>
              {formatDate(recommendation.suggestedDateRange.startDate)} - {formatDate(recommendation.suggestedDateRange.endDate)}
              {recommendation.efficiencyGain > 0 && (
                <span className="ml-2 text-green-600">
                  +{(recommendation.efficiencyGain * 100).toFixed(0)}% eficiência
                </span>
              )}
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600">{recommendation.description}</p>
      </CardContent>
      <CardFooter>
        <Button 
          size="sm" 
          onClick={() => onRecommendationSelect(recommendation.suggestedDateRange, recommendation.type)}
          className="w-full"
        >
          Aplicar Recomendação
        </Button>
      </CardFooter>
    </Card>
  );
  
  // Main render
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-scale-in">
      <div className="p-6">
        <RecommendationsHeader />
        
        {/* Empty state when no period selected and not showing super optimizations */}
        {!vacationPeriod && !showSuperOptimizations && <EmptyState />}
        
        {/* Show recommendations or super optimizations */}
        {(vacationPeriod || showSuperOptimizations) && (
          <>
            <FilterTabs />
            
            {getFilteredRecommendations().length === 0 ? (
              <NoRecommendationsState />
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
};

export default VacationRecommendations;
