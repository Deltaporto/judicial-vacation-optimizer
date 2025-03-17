
import React from 'react';
import { VacationPeriod, EfficiencyBreakdown } from '@/types';
import { formatDate } from '@/utils/dateUtils';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { ArrowUp, ArrowDown, ArrowRight, Calendar, DownloadIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateICSFile, downloadFile } from '@/utils/dateUtils';

interface EfficiencyCalculatorProps {
  vacationPeriod: VacationPeriod | null;
}

const EfficiencyCalculator: React.FC<EfficiencyCalculatorProps> = ({ vacationPeriod }) => {
  if (!vacationPeriod) {
    return (
      <div className="animate-pulse flex flex-col items-center justify-center h-full bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <div className="text-gray-400">
          <Calendar className="h-12 w-12 mb-4 opacity-20" />
          <p className="text-sm">Selecione um período no calendário para visualizar a análise de eficiência</p>
        </div>
      </div>
    );
  }
  
  // Prepare data for pie chart
  const data = [
    { name: 'Dias Úteis', value: vacationPeriod.workDays, color: '#ef4444' },
    { name: 'Finais de Semana', value: vacationPeriod.weekendDays, color: '#3b82f6' },
    { name: 'Feriados', value: vacationPeriod.holidayDays, color: '#8b5cf6' },
  ];
  
  // Get rating color based on efficiency
  const getEfficiencyColor = () => {
    switch (vacationPeriod.efficiencyRating) {
      case 'high':
        return 'text-green-600';
      case 'medium':
        return 'text-amber-500';
      case 'low':
        return 'text-red-500';
      default:
        return 'text-gray-600';
    }
  };
  
  // Get rating icon based on efficiency
  const getEfficiencyIcon = () => {
    switch (vacationPeriod.efficiencyRating) {
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
  
  // Handle calendar export
  const handleExportCalendar = () => {
    const icsContent = generateICSFile(vacationPeriod);
    downloadFile(
      icsContent, 
      `ferias-${formatDate(vacationPeriod.startDate, 'yyyy-MM-dd')}.ics`,
      'text/calendar'
    );
  };
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-scale-in">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-lg font-medium flex items-center">
          Análise de Eficiência
          {vacationPeriod.isValid ? (
            <span className={`ml-2 text-sm px-2 py-0.5 rounded-full ${getEfficiencyColor()} bg-opacity-10`}>
              {(vacationPeriod.efficiency * 100).toFixed(0)}% eficiente
            </span>
          ) : (
            <span className="ml-2 text-sm px-2 py-0.5 rounded-full bg-red-100 text-red-600">
              Período Inválido
            </span>
          )}
        </h2>
      </div>
      
      {!vacationPeriod.isValid ? (
        <div className="p-6 bg-red-50 text-red-600 text-sm">
          <p>{vacationPeriod.invalidReason}</p>
        </div>
      ) : (
        <>
          <div className="p-6">
            {/* Period overview */}
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Período selecionado</div>
                  <div className="text-lg font-medium">
                    {formatDate(vacationPeriod.startDate)} a {formatDate(vacationPeriod.endDate)}
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  className="mt-2 sm:mt-0"
                  onClick={handleExportCalendar}
                >
                  <DownloadIcon className="h-4 w-4 mr-2" />
                  Exportar para Calendário
                </Button>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm text-gray-500">Total de dias</div>
                  <div className="text-2xl font-semibold">{vacationPeriod.totalDays}</div>
                </div>
                
                <div className="bg-red-50 rounded-lg p-3">
                  <div className="text-sm text-red-600">Dias úteis</div>
                  <div className="text-2xl font-semibold text-red-600">{vacationPeriod.workDays}</div>
                </div>
                
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-sm text-blue-600">Fins de semana</div>
                  <div className="text-2xl font-semibold text-blue-600">{vacationPeriod.weekendDays}</div>
                </div>
                
                <div className="bg-purple-50 rounded-lg p-3">
                  <div className="text-sm text-purple-600">Feriados</div>
                  <div className="text-2xl font-semibold text-purple-600">{vacationPeriod.holidayDays}</div>
                </div>
              </div>
            </div>
            
            {/* Efficiency visualization */}
            <div className="flex flex-col sm:flex-row items-center justify-between mb-4">
              <div className="flex items-center mb-4 sm:mb-0">
                <div className={`flex items-center justify-center h-12 w-12 rounded-full ${
                  vacationPeriod.efficiencyRating === 'high' ? 'bg-green-100' :
                  vacationPeriod.efficiencyRating === 'medium' ? 'bg-amber-100' :
                  'bg-red-100'
                } mr-4`}>
                  {getEfficiencyIcon()}
                </div>
                
                <div>
                  <div className="text-sm text-gray-500">Classificação de eficiência</div>
                  <div className={`text-xl font-medium ${getEfficiencyColor()}`}>
                    {vacationPeriod.efficiencyRating === 'high' ? 'Alta' :
                     vacationPeriod.efficiencyRating === 'medium' ? 'Média' :
                     'Baixa'}
                  </div>
                </div>
              </div>
              
              <div className="h-48 w-full sm:w-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          
          <div className="p-4 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
            A eficiência é calculada com base na proporção de dias não úteis (fins de semana e feriados) em relação ao total de dias do período.
          </div>
        </>
      )}
    </div>
  );
};

export default EfficiencyCalculator;
