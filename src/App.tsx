import { useEffect } from 'react';
import { logger } from './utils/logger';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import TestTRF2Import from "./scripts/testImportTRF2";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    logger.info('Aplicação iniciada');
    try {
      // Verificar se o GitHub Pages está carregando corretamente
      if (window.location.hostname.includes('github.io')) {
        logger.info('Executando no GitHub Pages');
      }
    } catch (error) {
      logger.error('Erro durante a inicialização:', error);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <HashRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/test-import" element={<TestTRF2Import />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </HashRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
