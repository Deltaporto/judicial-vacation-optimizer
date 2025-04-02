import React from 'react';
import { ExternalLink, Info } from 'lucide-react';
const Footer = () => {
    return (<footer className="w-full py-6 px-6 bg-gradient-to-b from-transparent to-gray-50 border-t border-gray-100">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex items-center text-sm text-gray-500">
            <Info className="h-4 w-4 mr-2"/>
            <p>
              Esta ferramenta não é oficial e não substitui os sistemas do Judiciário Federal.
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-xs px-3 py-1 bg-white rounded-full border border-gray-200 shadow-sm">
              Processamento 100% local
            </div>
            
            <a href="https://www.cjf.jus.br/cjf/noticias/2022/09/cjf-aprova-resolucao-que-regulamenta-ferias-de-magistrados-federais" target="_blank" rel="noopener noreferrer" className="text-xs flex items-center text-primary hover:text-primary/80 transition-colors">
              <span>Resoluções CJF</span>
              <ExternalLink className="h-3 w-3 ml-1"/>
            </a>
          </div>
        </div>
      </div>
    </footer>);
};
export default Footer;
