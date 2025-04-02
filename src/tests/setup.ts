import '@testing-library/jest-dom';

// Configurações globais para testes
beforeAll(() => {
  // Configurações globais antes de todos os testes
});

afterAll(() => {
  // Limpeza após todos os testes
});

// Mock do ResizeObserver (necessário para alguns componentes UI)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}; 