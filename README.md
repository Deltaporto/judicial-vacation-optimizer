# Judicial Vacation Optimizer

Sistema para otimização de períodos de férias judiciais, considerando feriados e eficiência do descanso.

## Cálculo de Eficiência

O sistema utiliza uma fórmula aprimorada para calcular a eficiência dos períodos de férias, considerando três fatores principais:

1. **Ganho Real por Feriados**: Considera apenas feriados que caem em dias úteis como ganho efetivo de descanso.
   - Cada feriado em dia útil aumenta a eficiência proporcionalmente aos dias úteis do período.

2. **Posicionamento Estratégico**: Bonifica períodos que maximizam o descanso efetivo.
   - +5% para início na segunda-feira
   - +5% para término na sexta-feira
   - +5% adicional para períodos que começam na segunda e terminam na sexta

3. **Penalização por Desperdício**: Reduz a eficiência quando dias formais de férias são usados em períodos que já seriam de folga.
   - Penalização de até 20% baseada na proporção de dias não úteis no período

A eficiência mínima é sempre 1.0 (100%), indicando que qualquer período escolhido oferece pelo menos o descanso básico esperado.

## Classificação de Eficiência

Os períodos são classificados nas seguintes categorias:

- **Excelente** (≥ 135%): Período otimizado com máximo aproveitamento
- **Ótima** (≥ 115%): Muito bom aproveitamento dos dias de férias
- **Boa** (≥ 105%): Aproveitamento acima do básico
- **Regular** (< 105%): Aproveitamento básico dos dias de férias 

## Melhorias Recentes do Algoritmo

### 1. Flexibilização dos Dias de Início
- Removida a restrição de início apenas em segunda-feira
- Implementado sistema de ponderação por dia da semana
- Cada dia recebe um peso estratégico diferente para cálculo de eficiência

### 2. Análise Específica de Feriados
- Classificação de feriados por dia da semana
- Identificação de "feriados prolongáveis"
- Cálculo de eficiência considerando pontes estratégicas

### 3. Otimização de Períodos sem Feriados
- Verificação prévia de feriados em períodos gerados
- Penalização para períodos com muitos feriados
- Algoritmo de "contorno de feriados" para sugerir alternativas

### 4. Tratamento Especial para Datas Comemorativas
- Otimizações específicas para Carnaval e outros feriados especiais
- Cálculo automático de datas móveis (ex: Páscoa, Carnaval)
- Recomendações personalizadas para cada tipo de feriado

### Como Funciona

O algoritmo agora utiliza um sistema mais sofisticado de pontuação que considera:
- Dia da semana de início e fim do período
- Proximidade com feriados estratégicos
- Possibilidade de criar pontes eficientes
- Distribuição de dias úteis vs. não úteis
- Penalizações para acúmulo de feriados

As recomendações são geradas considerando:
1. Extensão de feriados existentes
2. Períodos limpos sem interferência de feriados
3. Aproveitamento de datas comemorativas especiais
4. Combinações estratégicas de pontes 