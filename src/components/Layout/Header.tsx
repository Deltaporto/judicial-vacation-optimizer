import React, { useState } from 'react';
import { CalendarDays, ArrowRight, HelpCircle, Calendar } from 'lucide-react';
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

interface HeaderProps {
  onHolidaysUpdated?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onHolidaysUpdated }) => {
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  
  return (
    <>
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
            
            <Button
              variant="ghost" 
              size="sm"
              onClick={() => setShowHolidayModal(true)}
              className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Calendar className="h-4 w-4" />
              <span>Feriados</span>
            </Button>
            
            <Dialog>
              <DialogTrigger asChild>
                <button className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  <HelpCircle className="h-4 w-4" />
                  <span>Ajuda</span>
                </button>
              </DialogTrigger>
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
