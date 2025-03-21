import React, { useState, useEffect } from 'react';
import { format, getMonth, getYear, addMonths, subMonths, isSameMonth, isSameDay, differenceInDays, isWithinInterval, isWeekend } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDay, DateRange, Holiday, ViewMode } from '@/types';
import { getCalendarDays } from '@/utils/dateUtils';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Info, X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { isValidVacationPeriod } from '@/utils/dateUtils';

interface CalendarViewProps {
  onDateSelect: (date: Date) => void;
  onDateRangeSelect: (range: DateRange) => void;
  selectedRange: DateRange | null;
  onClearSelection: () => void;
  splitPeriods?: DateRange[];
  showFractionedPeriods?: boolean;
  onOpenHolidayModal?: () => void;
}

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

const CalendarView: React.FC<CalendarViewProps> = ({ 
  onDateSelect, 
  onDateRangeSelect, 
  selectedRange, 
  onClearSelection,
  splitPeriods = [],
  showFractionedPeriods = false,
  onOpenHolidayModal
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [selectionStart, setSelectionStart] = useState<Date | null>(null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [previewRange, setPreviewRange] = useState<DateRange | null>(null);
  
  // Update calendar days when month changes or selection/preview changes
  useEffect(() => {
    // Calculate actual range to highlight (either confirmed selection or preview)
    const effectiveRange = previewRange || selectedRange;
    
    setCalendarDays(getCalendarDays(currentMonth, effectiveRange, splitPeriods));
  }, [currentMonth, selectedRange, previewRange, splitPeriods]);
  
  // Atualizar o mês para exibir o mês do período selecionado quando o selectedRange mudar
  useEffect(() => {
    if (selectedRange && selectedRange.startDate) {
      setCurrentMonth(new Date(selectedRange.startDate));
    }
  }, [selectedRange]);
  
  // Navigation functions
  const goToPreviousMonth = () => setCurrentMonth(prevMonth => subMonths(prevMonth, 1));
  const goToNextMonth = () => setCurrentMonth(prevMonth => addMonths(prevMonth, 1));
  
  // Verificar se existe um período completo selecionado (não apenas uma data única)
  const hasCompletePeriod = selectedRange && 
    selectedRange.startDate && 
    selectedRange.endDate && 
    selectedRange.startDate.getTime() !== selectedRange.endDate.getTime();
  
  // Handle click on a day - either start selection or complete it
  const handleDayClick = (day: CalendarDay) => {
    // Se já temos um ponto de início selecionado e clicamos em outro dia,
    // devemos completar a seleção, independentemente do preview
    if (selectionStart) {
      const start = selectionStart < day.date ? new Date(selectionStart) : new Date(day.date);
      const end = selectionStart < day.date ? new Date(day.date) : new Date(selectionStart);
      
      // Create a new DateRange object with proper dates
      const range: DateRange = {
        startDate: start,
        endDate: end
      };
      
      setSelectionStart(null);
      setPreviewRange(null);
      onDateRangeSelect(range);
      return;
    }
    
    // Verificar se estamos clicando em um dia que já está em uma seleção existente
    // (mas não durante o processo de seleção) para limpar
    if (selectedRange && !selectionStart && day.isInSelection) {
      setSelectionStart(null);
      setPreviewRange(null);
      onDateRangeSelect({ startDate: new Date(day.date), endDate: new Date(day.date) });
      return;
    }
    
    // Se estamos iniciando uma nova seleção
    const newStartDate = new Date(day.date);
    setSelectionStart(newStartDate);
    onDateSelect(newStartDate);
    // Inicialize o preview range com a data inicial
    setPreviewRange({
      startDate: newStartDate,
      endDate: newStartDate
    });
  };
  
  // Handle clear selection button click
  const handleClearSelection = () => {
    if (onClearSelection) {
      setSelectionStart(null);
      setPreviewRange(null);
      onClearSelection();
    }
  };
  
  // Handle mouse enter (hover) on a day
  const handleDayHover = (day: CalendarDay) => {
    // Sempre atualiza a data de hover
    setHoverDate(day.date);
    
    // Só atualize a visualização prévia se tivermos um ponto de início de seleção
    if (selectionStart) {
      // Garanta que a ordem das datas seja a correta (menor para maior)
      const startDate = selectionStart < day.date ? new Date(selectionStart) : new Date(day.date);
      const endDate = selectionStart < day.date ? new Date(day.date) : new Date(selectionStart);
      
      setPreviewRange({
        startDate,
        endDate
      });
    }
  };
  
  // Handle mouse leave from calendar
  const handleCalendarMouseLeave = () => {
    setHoverDate(null);
    setPreviewRange(null);
  };
  
  // Generate holiday tooltip content
  const renderHolidayTooltip = (holiday: Holiday) => {
    let className = '';
    if (holiday.type === 'national') className = 'bg-red-50 text-red-700 border-red-100';
    if (holiday.type === 'judicial') className = 'bg-amber-50 text-amber-700 border-amber-100';
    if (holiday.type === 'recess') className = 'bg-purple-50 text-purple-700 border-purple-100';
    // Adicionar estilo para feriados municipais
    if (holiday.abrangencia && holiday.abrangencia.toLowerCase().includes('municipal')) {
      className = 'bg-green-50 text-green-700 border-green-100';
    }
    
    return (
      <div className={`px-2 py-1 rounded text-xs ${className}`}>
        {holiday.name}
      </div>
    );
  };
  
  // Check if a range is valid (minimum 5 days)
  const isRangeValid = (range: DateRange | null): boolean => {
    if (!range) return true;
    return isValidVacationPeriod(range.startDate, range.endDate).isValid;
  };
  
  // Handle export calendar event
  const handleExportCalendarEvent = () => {
    if (!selectedRange || !selectedRange.startDate || !selectedRange.endDate) return;
    
    // Formato da data para ICS: YYYYMMDD
    const formatDateForICS = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}${month}${day}`;
    };
    
    // Criar conteúdo do arquivo ICS
    const startDate = formatDateForICS(selectedRange.startDate);
    const endDate = formatDateForICS(new Date(selectedRange.endDate.getTime() + 24 * 60 * 60 * 1000)); // Adiciona 1 dia para inclusão da data final
    
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Planejador de Férias Judiciais//BR
BEGIN:VEVENT
SUMMARY:Férias
DTSTART;VALUE=DATE:${startDate}
DTEND;VALUE=DATE:${endDate}
DESCRIPTION:Período de férias judiciais
STATUS:CONFIRMED
TRANSP:TRANSPARENT
END:VEVENT
END:VCALENDAR`;
    
    // Criar um blob e fazer download
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ferias_${startDate}_${endDate}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  // Render month view
  const renderMonthView = () => {
    // Check if preview or selected range is valid
    const effectiveRange = previewRange || selectedRange;
    const isCurrentRangeValid = isRangeValid(effectiveRange);
    
    return (
      <div 
        className="grid grid-cols-7 gap-1" 
        onMouseLeave={handleCalendarMouseLeave}
      >
        {/* Weekday headers */}
        {WEEKDAYS.map(day => (
          <div 
            key={day} 
            className="text-xs font-medium text-gray-500 h-8 flex items-center justify-center"
          >
            {day}
          </div>
        ))}
        
        {/* Calendar days */}
        {calendarDays.map((day, index) => {
          // Base styling
          let className = "h-16 w-full flex flex-col items-center relative rounded-md transition-all duration-200";
          
          if (!day.isCurrentMonth) {
            className += " text-gray-300";
          } else {
            className += " cursor-pointer hover:bg-gray-100";
          }
          
          if (day.isToday) {
            className += " border border-primary";
          }
          
          // Special day styling (apenas para o número)
          let dayNumberClass = "text-sm font-medium mt-1";
          
          if (day.isWeekend) {
            dayNumberClass += " text-blue-500";
          }
          
          // Selection styling
          if (day.isInSelection) {
            if (effectiveRange && !isCurrentRangeValid && previewRange === null) {
              // Invalid selection styling - only apply to confirmed selections, not previews
              className += " bg-red-100";
              dayNumberClass += " text-red-800";
            } else {
              // Valid selection styling
              className += " bg-blue-100";
              
              // Special styling for start and end
              if (day.isSelectionStart) {
                className += " bg-blue-500 rounded-l-md";
                dayNumberClass = "text-sm font-medium text-white mt-1";
              }
              if (day.isSelectionEnd) {
                className += " bg-blue-500 rounded-r-md";
                dayNumberClass = "text-sm font-medium text-white mt-1";
              }
            }
          }
          
          // Secondary range styling (período fracionado)
          if (day.isInSecondarySelection) {
            // Cores diferentes para cada período fracionado
            const colorClasses = [
              "bg-emerald-100", // Primeiro período
              "bg-purple-100",  // Segundo período
              "bg-amber-100",   // Terceiro período
              "bg-pink-100",    // Quarto período
              "bg-indigo-100",  // Quinto período
              "bg-cyan-100"     // Sexto período
            ];
            
            // Texto (branco) para as datas de início e fim
            const textClasses = [
              "text-emerald-800",
              "text-purple-800",
              "text-amber-800",
              "text-pink-800",
              "text-indigo-800",
              "text-cyan-800"
            ];
            
            // Selecionar a cor baseado no índice do período (ou usar a primeira cor como fallback)
            const colorIndex = typeof day.secondarySelectionIndex === 'number' ? 
              Math.min(day.secondarySelectionIndex, colorClasses.length - 1) : 0;
            
            className += ` ${colorClasses[colorIndex]}`;
            
            if (day.isSecondarySelectionStart) {
              className += ` ${colorClasses[colorIndex].replace('100', '500')} rounded-l-md`;
              dayNumberClass = `text-sm font-medium text-white mt-1`;
            }
            
            if (day.isSecondarySelectionEnd) {
              className += ` ${colorClasses[colorIndex].replace('100', '500')} rounded-r-md`;
              dayNumberClass = `text-sm font-medium text-white mt-1`;
            }
          }
          
          // Estilo para o rótulo do feriado (sem fundo colorido)
          let holidayClass = "text-center text-[10px] mt-1";
          
          if (day.holiday) {
            if (day.holiday.abrangencia && day.holiday.abrangencia.toLowerCase().includes('municipal')) {
              holidayClass += " text-green-700 font-medium";
            } else if (day.holiday.type === 'national') {
              holidayClass += " text-red-700 font-medium";
            } else if (day.holiday.type === 'judicial') {
              holidayClass += " text-amber-700 font-medium";
            } else if (day.holiday.type === 'recess') {
              holidayClass += " text-purple-700 font-medium";
            }
          }
          
          return (
            <div
              key={`day-${index}`}
              className={className}
              onClick={() => handleDayClick(day)}
              onMouseEnter={() => handleDayHover(day)}
            >
              <div className={dayNumberClass}>
                {format(day.date, 'd')}
              </div>
              
              {day.holiday && (
                <div className={holidayClass}>
                  {day.holiday.name}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-scale-in">
      {/* Calendar header */}
      <div className="p-4 border-b border-gray-100">
        {/* Título e botões de navegação do mês em uma linha */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <CalendarIcon className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-medium">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </h2>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8" 
              onClick={goToPreviousMonth}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8" 
              onClick={goToNextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Botões de funcionalidades em uma linha separada */}
        <div className="flex items-center justify-between">
          {/* Botão para alternar feriados estaduais (lado esquerdo) */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => alert("Alternando entre feriados do RJ e ES - Funcionalidade em implementação")}
                  className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                >
                  <span>Feriados: RJ</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[250px] z-50">
                Alternar entre feriados estaduais do RJ e ES
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <div className="flex items-center space-x-2">
            {/* Botão de feriados no meio */}
            {onOpenHolidayModal && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onOpenHolidayModal}
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                    >
                      <CalendarIcon className="h-4 w-4 mr-1" />
                      <span>Feriados</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    Visualizar e gerenciar feriados
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {/* Botão para exportar para calendário */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportCalendarEvent}
                    disabled={!hasCompletePeriod}
                    className={`${hasCompletePeriod ? 'text-indigo-600 border-indigo-200 hover:bg-indigo-50' : 'text-gray-400 border-gray-200'}`}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    <span>Exportar</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Exportar período para calendário iOS/Android
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {/* Botão para limpar seleção - sempre mostra, mas desabilitado quando não há seleção */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearSelection}
                    disabled={!hasCompletePeriod || !onClearSelection}
                    className={`${hasCompletePeriod ? 'text-red-600 border-red-200 hover:bg-red-50' : 'text-gray-400 border-gray-200'}`}
                  >
                    <X className="h-4 w-4 mr-1" />
                    <span>Limpar</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Limpar período selecionado
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
      
      {/* Calendar body */}
      <div className="p-4">
        {viewMode === 'month' ? renderMonthView() : null}
      </div>
      
      {/* Selection status */}
      {selectionStart && (
        <div className="px-4 py-2 bg-blue-50 border-t border-blue-100 text-sm text-blue-700">
          Início selecionado: {format(selectionStart, 'dd/MM/yyyy')}. Clique em outro dia para completar a seleção.
        </div>
      )}
      
      {/* Super optimization reminder - only shown when no selection started */}
      {!selectionStart && !selectedRange && (
        <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-500 flex items-center">
          <Info className="h-3 w-3 mr-1 flex-shrink-0" />
          <span>Prefere não escolher manualmente? Experimente as "Super Otimizações" no painel lateral.</span>
        </div>
      )}
      
      {/* Legend */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 p-4 border-t border-gray-100 text-xs">
        <div className="flex items-center">
          <div className="h-3 w-3 rounded-full bg-rose-500 mr-2" />
          <span>Feriado Nacional</span>
        </div>
        <div className="flex items-center">
          <div className="h-3 w-3 rounded-full bg-amber-500 mr-2" />
          <span>Feriado Judicial</span>
        </div>
        <div className="flex items-center">
          <div className="h-3 w-3 rounded-full bg-purple-500 mr-2" />
          <span>Recesso Forense</span>
        </div>
        <div className="flex items-center">
          <div className="h-3 w-3 rounded-full bg-green-500 mr-2" />
          <span>Feriado Municipal</span>
        </div>
        <div className="flex items-center">
          <div className="h-3 w-3 rounded-full bg-blue-100 mr-2" />
          <span>Fim de Semana</span>
        </div>
      </div>
      
      {/* Nota sobre feriados estaduais */}
      <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-500 flex items-center">
        <Info className="h-3 w-3 mr-1 flex-shrink-0" />
        <span>Por padrão, são importados os feriados estaduais do RJ. Feriados municipais devem ser incluídos clicando em "Feriados".</span>
      </div>
    </div>
  );
};

export default CalendarView;
