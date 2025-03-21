import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Tenta encontrar o elemento root e montar a aplicação
const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("Erro: Elemento com ID 'root' não encontrado!");
} else {
  createRoot(rootElement).render(<App />);
  console.log("Aplicação montada com sucesso!");
}
