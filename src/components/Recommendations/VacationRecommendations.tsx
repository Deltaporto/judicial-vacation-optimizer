
import React from 'react';
import { Recommendation, VacationPeriod } from '@/types';
import { generateRecommendations } from '@/utils/efficiencyUtils';
import { formatDate } from '@/utils/dateUtils';
import { 
  ArrowRight, 
  Calendar, 
  MoveRight, 
  Expand, 
  SplitSquareVertical,
  BarChart4,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VacationRecommendationsProps {
  vacationPeriod: VacationPeriod | null;
  onRecommendationSelect: (dateRange: { startDate: Date, endDate: Date }) => void;
}

const VacationRecommendations: React.FC<VacationRecommendationsProps> = ({ 
  vacationPeriod,
  onRecommendationSelect
}) => {
  // No recommendations if no valid period
  if (!vacationPeriod || !vacationPeriod.isValid) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-scale-in">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-medium flex items-center">
            Recomendações
          </h2>
        </div>
        
        <div className="p-8 flex flex-col items-center justify-center text-gray-400">
          <BarChart4 className="h-10 w-10 mb-4 opacity-20" />
          <p className="text-sm text-center">
            Selecione um período válido para receber recomendações de otimização
          </p>
        </div>
      </div>
    );
  }
  
  // Generate recommendations
  const recommendations: Recommendation[] = generateRecommendations(vacationPeriod);
  
  // Get icon for recommendation type
  const getRecommendationIcon = (type: Recommendation['type']) => {
    switch (type) {
      case 'extend':
        return <Expand className="h-5 w-5 text-green-600" />;
      case 'reduce':
        return <Check className="h-5 w-5 text-amber-600" />;
      case 'shift':
        return <MoveRight className="h-5 w-5 text-blue-600" />;
      case 'split':
        return <SplitSquareVertical className="h-5 w-5 text-purple-600" />;
      case 'combine':
        return <Calendar className="h-5 w-5 text-indigo-600" />;
      default:
        return <ArrowRight className="h-5 w-5 text-gray-600" />;
    }
  };
  
  // Get background color for recommendation type
  const getRecommendationBackground = (type: Recommendation['type']) => {
    switch (type) {
      case 'extend':
        return 'bg-green-50';
      case 'reduce':
        return 'bg-amber-50';
      case 'shift':
        return 'bg-blue-50';
      case 'split':
        return 'bg-purple-50';
      case 'combine':
        return 'bg-indigo-50';
      default:
        return 'bg-gray-50';
    }
  };
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-scale-in">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-lg font-medium flex items-center">
          Recomendações de Otimização
          <span className="ml-2 text-sm bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
            {recommendations.length}
          </span>
        </h2>
      </div>
      
      <div className="p-4">
        {recommendations.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <p>Não há recomendações adicionais para este período.</p>
            <p className="text-sm mt-2 text-green-600">Este período já apresenta uma boa eficiência!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recommendations.map(rec => (
              <div 
                key={rec.id} 
                className={`p-4 rounded-lg ${getRecommendationBackground(rec.type)} border border-${rec.type === 'extend' ? 'green' : rec.type === 'reduce' ? 'amber' : rec.type === 'shift' ? 'blue' : rec.type === 'split' ? 'purple' : rec.type === 'combine' ? 'indigo' : 'gray'}-100`}
              >
                <div className="flex items-start">
                  <div className="mr-3 mt-1">
                    {getRecommendationIcon(rec.type)}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-medium mb-1">{rec.title}</h3>
                    <p className="text-sm text-gray-600 mb-3">{rec.description}</p>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                      <div className="text-sm">
                        <span className="text-gray-500">Novo período: </span>
                        <span className="font-medium">
                          {formatDate(rec.suggestedDateRange.startDate)} a {formatDate(rec.suggestedDateRange.endDate)}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        {rec.efficiencyGain > 0 && (
                          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                            +{(rec.efficiencyGain * 100).toFixed(1)}% eficiência
                          </span>
                        )}
                        
                        <Button 
                          size="sm"
                          onClick={() => onRecommendationSelect(rec.suggestedDateRange)}
                        >
                          Aplicar
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VacationRecommendations;
