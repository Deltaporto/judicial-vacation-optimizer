import React, { useState, useEffect } from 'react';
import { format, getMonth, getYear, addMonths, subMonths, isSameMonth, isSameDay, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDay, DateRange, Holiday, ViewMode } from '@/types';
import { getCalendarDays } from '@/utils/dateUtils';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { isValidVacationPeriod } from '@/utils/dateUtils';

interface CalendarViewProps {
  selectedRange: DateRange | null;
  secondaryRange?: DateRange | null; // Novo: para o segundo período fracionado
  onDateSelect: (date: Date) => void;
  onDateRangeSelect: (range: DateRange) => void;
}

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

const CalendarView: React.FC<CalendarViewProps> = ({ 
  selectedRange, 
  secondaryRange,
  onDateSelect,
  onDateRangeSelect
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [selectionStart, setSelectionStart] = useState<Date | null>(null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [previewRange, setPreviewRange] = useState<DateRange | null>(null);
  
  // Update calendar days when month changes or selection/preview changes
  useEffect(() => {
    console.log("UseEffect triggered - Recalculating calendar days");
    console.log("Current selected range:", selectedRange);
    console.log("Current preview range:", previewRange);
    console.log("Current secondary range:", secondaryRange);
    
    // Calculate actual range to highlight (either confirmed selection or preview)
    const effectiveRange = previewRange || selectedRange;
    console.log("Effective range for rendering:", effectiveRange);
    
    setCalendarDays(getCalendarDays(currentMonth, effectiveRange, secondaryRange));
  }, [currentMonth, selectedRange, previewRange, secondaryRange]);
  
  // Navigation functions
  const goToPreviousMonth = () => setCurrentMonth(prevMonth => subMonths(prevMonth, 1));
  const goToNextMonth = () => setCurrentMonth(prevMonth => addMonths(prevMonth, 1));
  
  // Handle click on a day - either start selection or complete it
  const handleDayClick = (day: CalendarDay) => {
    console.log("Day clicked:", day.date, "isCurrentMonth:", day.isCurrentMonth, "isInSelection:", day.isInSelection);
    console.log("Current selection start:", selectionStart);
    
    // Se já temos um ponto de início selecionado e clicamos em outro dia,
    // devemos completar a seleção, independentemente do preview
    if (selectionStart) {
      console.log("Completing selection");
      const start = selectionStart < day.date ? new Date(selectionStart) : new Date(day.date);
      const end = selectionStart < day.date ? new Date(day.date) : new Date(selectionStart);
      
      console.log("Final range:", start, "to", end);
      
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
      console.log("Clearing existing selection");
      setSelectionStart(null);
      setPreviewRange(null);
      onDateRangeSelect({ startDate: new Date(day.date), endDate: new Date(day.date) });
      return;
    }
    
    // Se estamos iniciando uma nova seleção
    console.log("Starting new selection");
    const newStartDate = new Date(day.date);
    setSelectionStart(newStartDate);
    onDateSelect(newStartDate);
    // Inicialize o preview range com a data inicial
    setPreviewRange({
      startDate: newStartDate,
      endDate: newStartDate
    });
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
          let className = "h-10 w-full flex items-center justify-center relative rounded-md transition-all duration-200 text-sm";
          
          if (!day.isCurrentMonth) {
            className += " text-gray-300";
          } else {
            className += " cursor-pointer hover:bg-gray-100";
          }
          
          if (day.isToday) {
            className += " border border-primary";
          }
          
          // Special day styling
          if (day.holiday) {
            if (day.holiday.type === 'national') className += " text-red-600";
            if (day.holiday.type === 'judicial') className += " text-amber-600";
            if (day.holiday.type === 'recess') className += " text-purple-600";
          } else if (day.isWeekend) {
            className += " text-blue-500";
          }
          
          // Selection styling
          if (day.isInSelection) {
            if (effectiveRange && !isCurrentRangeValid && previewRange === null) {
              // Invalid selection styling - only apply to confirmed selections, not previews
              className += " bg-red-100 text-red-800";
            } else {
              // Valid selection styling
              className += " bg-blue-100";
              
              // Special styling for start and end
              if (day.isSelectionStart) {
                className += " bg-blue-500 text-white rounded-l-md";
              }
              if (day.isSelectionEnd) {
                className += " bg-blue-500 text-white rounded-r-md";
              }
            }
          }
          
          // Secondary range styling (período fracionado)
          if (day.isInSecondarySelection) {
            className += " bg-emerald-100";
            if (day.isSecondarySelectionStart) {
              className += " bg-emerald-500 text-white rounded-l-md";
            }
            if (day.isSecondarySelectionEnd) {
              className += " bg-emerald-500 text-white rounded-r-md";
            }
          }
          
          return (
            <div
              key={`day-${index}`}
              className={className}
              onClick={() => handleDayClick(day)}
              onMouseEnter={() => handleDayHover(day)}
            >
              <div className="absolute top-1 right-1 z-10">
                {day.holiday && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {renderHolidayTooltip(day.holiday)}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              
              <span>{format(day.date, 'd')}</span>
            </div>
          );
        })}
      </div>
    );
  };
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-scale-in">
      {/* Calendar header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center space-x-2">
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 border-t border-gray-100 text-xs">
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
          <div className="h-3 w-3 rounded-full bg-blue-100 mr-2" />
          <span>Fim de Semana</span>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
