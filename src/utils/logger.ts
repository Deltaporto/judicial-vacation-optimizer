export const logger = {
  info: (message: string, ...args: any[]) => {
    console.log(`[INFO] ${message}`, ...args);
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error);
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`[WARN] ${message}`, ...args);
  }
};

// Função para registrar erros de renderização
export const logRenderError = (component: string, error: any) => {
  logger.error(`Erro ao renderizar componente ${component}:`, error);
  console.trace(); // Adiciona stack trace para debug
};

// Função para registrar carregamento de dados
export const logDataLoad = (component: string, data: any) => {
  logger.info(`Dados carregados em ${component}:`, data);
}; 