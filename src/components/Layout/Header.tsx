
import React from 'react';
import { CalendarDays, ArrowRight, HelpCircle } from 'lucide-react';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';

const Header = () => {
  return (
    <header className="w-full bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-100 py-4 px-6 fixed top-0 left-0 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center text-white">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-medium leading-tight tracking-tight text-gray-900">
              Otimizador de Férias
            </h1>
            <p className="text-xs text-gray-500">Para Magistrados Federais</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <span className="text-xs px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-100">
            CJF Resoluções nº 764/2022 e nº 940/2025
          </span>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  <HelpCircle className="h-4 w-4" />
                  <span>Ajuda</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <div className="space-y-2">
                  <p className="font-medium">Regras do CJF implementadas:</p>
                  <ul className="text-xs space-y-1">
                    <li className="flex items-start">
                      <ArrowRight className="h-3 w-3 mt-0.5 mr-1 flex-shrink-0" />
                      <span>Mínimo de 5 dias por período (Resolução nº 940/2025)</span>
                    </li>
                    <li className="flex items-start">
                      <ArrowRight className="h-3 w-3 mt-0.5 mr-1 flex-shrink-0" />
                      <span>Total de 30 dias por semestre (60 dias anuais)</span>
                    </li>
                  </ul>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </header>
  );
};

export default Header;
