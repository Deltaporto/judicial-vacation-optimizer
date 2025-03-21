import React, { useState } from 'react';
import { CalendarDays, ArrowRight, HelpCircle, Calendar, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import HolidayModal from '../Holidays/HolidayModal';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface HeaderProps {
  onHolidaysUpdated?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onHolidaysUpdated }) => {
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  
  return (
    <>
      <header className="w-full bg-gradient-to-r from-blue-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm py-3 px-4 md:px-6 z-40 transition-all duration-300">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-200 dark:shadow-blue-900/20">
              <CalendarDays className="h-6 w-6" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-semibold leading-tight tracking-tight text-gray-900 dark:text-white">
                Otimizador de Férias
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Para Magistrados Federais</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-5">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost" 
                    size="sm"
                    className="flex items-center space-x-1.5 text-xs font-medium text-blue-600/80 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>Resoluções CJF 764/2022 e 940/2025</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Resoluções do CJF</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowHolidayModal(true)}
                    className="flex items-center space-x-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-blue-900/20 transition-colors"
                  >
                    <Calendar className="h-4 w-4" />
                    <span>Feriados</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Gerenciar feriados e recessos</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <Dialog>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="flex items-center space-x-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-blue-900/20 transition-colors"
                      >
                        <HelpCircle className="h-4 w-4" />
                        <span>Ajuda</span>
                      </Button>
                    </DialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Saiba como usar a ferramenta</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Sobre o Otimizador de Férias Judiciais</DialogTitle>
                  <DialogDescription>
                    Uma ferramenta para auxiliar magistrados no planejamento estratégico de suas férias
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <h3 className="font-medium text-sm">Como funciona?</h3>
                  <p className="text-sm text-gray-500">
                    O otimizador calcula a eficiência dos períodos de férias considerando a proporção entre dias não úteis 
                    (fins de semana e feriados) e o total de dias do período selecionado. Quanto mais dias não úteis incluídos 
                    no seu período de férias, maior a eficiência.
                  </p>
                  
                  <h3 className="font-medium text-sm mt-4">Principais funcionalidades:</h3>
                  <ul className="text-sm text-gray-500 space-y-2">
                    <li className="flex items-start">
                      <ArrowRight className="h-3 w-3 mt-1 mr-2 flex-shrink-0" />
                      <span><strong>Seleção de períodos:</strong> Clique e arraste no calendário para selecionar o período desejado.</span>
                    </li>
                    <li className="flex items-start">
                      <ArrowRight className="h-3 w-3 mt-1 mr-2 flex-shrink-0" />
                      <span><strong>Visualização de eficiência:</strong> Veja a análise detalhada com dias úteis, não úteis e eficiência calculada.</span>
                    </li>
                    <li className="flex items-start">
                      <ArrowRight className="h-3 w-3 mt-1 mr-2 flex-shrink-0" />
                      <span><strong>Recomendações personalizadas:</strong> Receba sugestões para otimizar suas férias com base no período selecionado.</span>
                    </li>
                    <li className="flex items-start">
                      <ArrowRight className="h-3 w-3 mt-1 mr-2 flex-shrink-0" />
                      <span><strong>Super Otimizações:</strong> Descubra automaticamente os melhores períodos do ano sem precisar testar manualmente.</span>
                    </li>
                    <li className="flex items-start">
                      <ArrowRight className="h-3 w-3 mt-1 mr-2 flex-shrink-0" />
                      <span><strong>Fracionamento de férias:</strong> Analise como dividir suas férias pode aumentar a eficiência total.</span>
                    </li>
                    <li className="flex items-start">
                      <ArrowRight className="h-3 w-3 mt-1 mr-2 flex-shrink-0" />
                      <span><strong>Configuração de feriados:</strong> Alterne entre feriados do RJ e ES para cálculos mais precisos conforme sua localidade.</span>
                    </li>
                  </ul>
                  
                  <h3 className="font-medium text-sm mt-4">Regras implementadas:</h3>
                  <ul className="text-sm text-gray-500 space-y-2">
                    <li className="flex items-start">
                      <ArrowRight className="h-3 w-3 mt-1 mr-2 flex-shrink-0" />
                      <span>Mínimo de 5 dias por período (Resolução nº 940/2025)</span>
                    </li>
                    <li className="flex items-start">
                      <ArrowRight className="h-3 w-3 mt-1 mr-2 flex-shrink-0" />
                      <span>Total de 30 dias por semestre (60 dias anuais)</span>
                    </li>
                    <li className="flex items-start">
                      <ArrowRight className="h-3 w-3 mt-1 mr-2 flex-shrink-0" />
                      <span>Por padrão, são considerados os feriados estaduais do RJ. Utilize o botão "Feriados: RJ" para alternar para os feriados do ES.</span>
                    </li>
                  </ul>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>
      
      <HolidayModal
        open={showHolidayModal}
        onOpenChange={setShowHolidayModal}
        onHolidaysUpdated={onHolidaysUpdated}
      />
    </>
  );
};

export default Header;
