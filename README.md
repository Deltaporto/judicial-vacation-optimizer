# Otimizador de Férias Judiciais

Uma ferramenta para auxiliar magistrados federais no planejamento estratégico de suas férias, maximizando a eficiência dos períodos escolhidos.

## Funcionalidades

- Seleção de períodos no calendário para análise
- Cálculo de eficiência com base em dias úteis e não úteis
- Recomendações personalizadas para otimização
- Suporte a fracionamento de férias
- Configuração de feriados estaduais (RJ/ES)
- Super otimizações para descobrir automaticamente os melhores períodos do ano

## Arquitetura

O sistema utiliza um padrão de design Strategy para implementar diferentes estratégias de otimização:

### Estratégias de Otimização

- **ContinuousPeriodsStrategy**: Encontra períodos contínuos otimizados
- **BridgePeriodsStrategy**: Identifica pontes estratégicas entre feriados
- **HolidayAdjacencyStrategy**: Localiza períodos adjacentes a feriados importantes
- **JudicialRecessStrategy**: Otimiza períodos durante o recesso judicial

### Componentes Principais

- **SuperOptimizationOrchestrator**: Coordena todas as estratégias de otimização
- **RecommendationBuilder**: Padroniza a criação de recomendações
- **EfficiencyCalculator**: Calcula a eficiência dos períodos de férias

## Tecnologias

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- date-fns (manipulação de datas)

## Desenvolvimento

### Pré-requisitos

- Node.js 18+
- npm ou yarn

### Instalação

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

### Testes

O projeto inclui testes unitários e de integração organizados da seguinte forma:

```
src/
  ├── tests/
  │   ├── unit/
  │   │   ├── strategies/     # Testes das estratégias de otimização
  │   │   ├── utils/         # Testes dos utilitários
  │   │   └── types/         # Testes dos tipos
  │   └── integration/       # Testes de integração
```

Para executar os testes:

```bash
# Executar todos os testes
npm test

# Executar testes com cobertura
npm test -- --coverage
```

#### Estratégia de Testes

- **Testes Unitários**:
  - **Estratégias**: Testes específicos para cada estratégia de otimização
  - **Utilitários**: Testes do RecommendationBuilder e outros utilitários
  - **Tipos**: Testes de tipos e interfaces

- **Testes de Integração**:
  - Testes end-to-end do fluxo completo
  - Validação da integração entre componentes
  - Testes de cenários reais

## Acesso

Acesse a aplicação: [Otimizador de Férias Judiciais](https://deltaporto.github.io/judicial-vacation-optimizer/)

## Estrutura do Projeto

```
src/
  ├── strategies/          # Estratégias de otimização
  ├── types/              # Definições de tipos TypeScript
  ├── utils/              # Utilitários e funções auxiliares
  ├── components/         # Componentes React
  └── pages/             # Páginas da aplicação
```

---

*Última atualização: 30 de Janeiro de 2024* 