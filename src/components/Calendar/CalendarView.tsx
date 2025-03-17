
import React, { useState, useEffect } from 'react';
import { format, getMonth, getYear, addMonths, subMonths, isSameMonth } from 'date-fns';
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

interface CalendarViewProps {
  selectedRange: DateRange | null;
  onDateSelect: (date: Date) => void;
  onDateRangeSelect: (range: DateRange) => void;
}

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

const CalendarView: React.FC<CalendarViewProps> = ({ 
  selectedRange, 
  onDateSelect,
  onDateRangeSelect
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [selectionStart, setSelectionStart] = useState<Date | null>(null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Update calendar days when month changes
  useEffect(() => {
    setCalendarDays(getCalendarDays(currentMonth, selectedRange));
  }, [currentMonth, selectedRange]);
  
  // Navigation functions
  const goToPreviousMonth = () => setCurrentMonth(prevMonth => subMonths(prevMonth, 1));
  const goToNextMonth = () => setCurrentMonth(prevMonth => addMonths(prevMonth, 1));
  
  // Handle mouse events for date selection
  const handleMouseDown = (day: CalendarDay) => {
    if (!day.isCurrentMonth) return;
    
    setSelectionStart(day.date);
    setIsDragging(true);
    onDateSelect(day.date);
  };
  
  const handleMouseEnter = (day: CalendarDay) => {
    setHoverDate(day.date);
    
    if (isDragging && selectionStart && day.isCurrentMonth) {
      const start = selectionStart < day.date ? selectionStart : day.date;
      const end = selectionStart < day.date ? day.date : selectionStart;
      
      onDateRangeSelect({ startDate: start, endDate: end });
    }
  };
  
  const handleMouseUp = (day: CalendarDay) => {
    if (!day.isCurrentMonth || !selectionStart) return;
    
    setIsDragging(false);
    
    const start = selectionStart < day.date ? selectionStart : day.date;
    const end = selectionStart < day.date ? day.date : selectionStart;
    
    onDateRangeSelect({ startDate: start, endDate: end });
    setSelectionStart(null);
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
  
  // Render month view or year view
  const renderMonthView = () => (
    <div 
      className="grid grid-cols-7 gap-1" 
      onMouseLeave={() => {
        setIsDragging(false);
        setHoverDate(null);
      }}
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
        let className = "calendar-day relative cursor-pointer transition-all duration-200 text-sm";
        
        // Base styling
        if (!day.isCurrentMonth) {
          className += " opacity-30";
        }
        
        if (day.isToday) {
          className += " border border-primary";
        }
        
        // Special day styling
        if (day.holiday) {
          if (day.holiday.type === 'national') className += " calendar-day-holiday";
          if (day.holiday.type === 'judicial') className += " bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200";
          if (day.holiday.type === 'recess') className += " calendar-day-recess";
        } else if (day.isWeekend) {
          className += " calendar-day-weekend";
        }
        
        // Selection styling
        if (day.isInSelection) {
          className += " calendar-day-selected";
        }
        
        // Hover effect during selection
        if (selectionStart && hoverDate) {
          const isInHoverRange = 
            (day.date >= selectionStart && day.date <= hoverDate) || 
            (day.date <= selectionStart && day.date >= hoverDate);
          
          if (isInHoverRange && isDragging) {
            className += " bg-primary/20";
          }
        }
        
        return (
          <div
            key={`day-${index}`}
            className={className}
            onMouseDown={() => handleMouseDown(day)}
            onMouseEnter={() => handleMouseEnter(day)}
            onMouseUp={() => handleMouseUp(day)}
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
      
      {/* Legend */}
      <div className="p-4 border-t border-gray-100 bg-gray-50 flex flex-wrap gap-x-4 gap-y-2 text-xs">
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
