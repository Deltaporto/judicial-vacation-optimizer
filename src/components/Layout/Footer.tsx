import React from 'react';
import { ExternalLink, Info, Calendar } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="w-full py-5 px-6 bg-gradient-to-t from-blue-50 to-white dark:from-slate-900 dark:to-slate-800 border-t border-slate-200 dark:border-slate-700">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex items-start md:items-center text-sm text-slate-600 dark:text-slate-300">
            <Info className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5 md:mt-0" />
            <p>
              Esta ferramenta não é oficial e não substitui os sistemas do Judiciário Federal.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Otimizador de Férias v1.0
              </span>
            </div>

            <div className="text-xs px-3 py-1.5 bg-blue-50/60 dark:bg-blue-900/30 rounded-full border border-blue-100 dark:border-blue-800 shadow-sm">
              Algoritmos em desenvolvimento
            </div>
            
            <a 
              href="https://www.cjf.jus.br/publico/biblioteca/Res%20764-2022.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs flex items-center text-primary hover:text-primary/80 transition-colors"
            >
              <span>Resoluções CJF</span>
              <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
