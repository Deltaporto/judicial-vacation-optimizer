/**
 * Teste do Método Híbrido de Penalização
 * 
 * Este arquivo implementa funções para testar e demonstrar o método híbrido
 * de penalização usado no cálculo de eficiência de férias judiciais.
 * 
 * O método híbrido aplica uma penalização exponencial para dias não úteis:
 * - Penalização base para o primeiro dia não útil: 0.35
 * - Fator de crescimento exponencial: 1.8
 */

// Implementação do método híbrido de penalização
function calcularPenalizacaoHibrida(diasNaoUteis) {
  if (diasNaoUteis <= 0) return 0;
  
  // Constantes do algoritmo
  const penalizacaoPrimeiroDia = 0.35;
  const fatorCrescimento = 1.8;
  
  if (diasNaoUteis === 1) {
    return penalizacaoPrimeiroDia;
  } else {
    // Primeiro dia tem penalidade fixa maior
    // Dias adicionais têm penalidade incremental com taxa de crescimento mais acentuada
    let diasAdicionais = diasNaoUteis - 1;
    let penalizacaoAdicional = 0;
    
    for (let i = 0; i < diasAdicionais; i++) {
      // Cada dia adicional tem penalidade 80% maior que o anterior
      penalizacaoAdicional += penalizacaoPrimeiroDia * Math.pow(fatorCrescimento, i);
    }
    
    return penalizacaoPrimeiroDia + penalizacaoAdicional;
  }
}

// Função para calcular a eficiência usando o método híbrido
function calcularEficienciaHibrida(
  diasUteis, 
  diasNaoUteis, 
  feriadosEmDiasUteis = 0,
  valorEstrategico = 0,
  valorAtivacaoFimDeSemana = 0
) {
  // Calcular penalização por desperdício usando método híbrido
  const penalizacaoDesperdicio = calcularPenalizacaoHibrida(diasNaoUteis);
  
  // Cálculo da eficiência final
  const eficiencia = (feriadosEmDiasUteis + valorEstrategico + valorAtivacaoFimDeSemana - penalizacaoDesperdicio) / diasUteis;
  
  // Eficiência base é 1.0 (sem ganho adicional)
  return eficiencia + 1.0;
}

// Função para classificar a eficiência
function classificarEficiencia(eficiencia) {
  if (eficiencia >= 1.4) return "Alta";
  if (eficiencia >= 1.2) return "Média";
  return "Baixa";
}

// Função para formatar a eficiência como porcentagem
function formatarEficiencia(eficiencia) {
  const ganhoPercentual = (eficiencia - 1) * 100;
  return `${ganhoPercentual.toFixed(1)}%`;
}

// Executar testes demonstrativos
function executarTestes() {
  console.log("=== TESTE DO MÉTODO HÍBRIDO DE PENALIZAÇÃO ===\n");
  
  // Testar a função de penalização diretamente
  console.log("PENALIZAÇÃO POR DIAS NÃO ÚTEIS:");
  console.log("-----------------------------------");
  console.log("1 dia não útil:", calcularPenalizacaoHibrida(1).toFixed(2));
  console.log("2 dias não úteis:", calcularPenalizacaoHibrida(2).toFixed(2));
  console.log("3 dias não úteis:", calcularPenalizacaoHibrida(3).toFixed(2));
  console.log("4 dias não úteis:", calcularPenalizacaoHibrida(4).toFixed(2));
  console.log("5 dias não úteis:", calcularPenalizacaoHibrida(5).toFixed(2));
  console.log();
  
  // Testar cenários de férias
  console.log("CENÁRIOS DE FÉRIAS:");
  console.log("-----------------------------------");
  
  const cenarios = [
    { nome: "Período ideal (5 dias úteis)", diasUteis: 5, diasNaoUteis: 0, feriadosEmDiasUteis: 0, valorEstrategico: 0.6, valorAtivacaoFimDeSemana: 1.2 },
    { nome: "Período com 1 feriado", diasUteis: 4, diasNaoUteis: 0, feriadosEmDiasUteis: 1, valorEstrategico: 0.6, valorAtivacaoFimDeSemana: 1.2 },
    { nome: "Período com 1 dia desperdiçado", diasUteis: 5, diasNaoUteis: 1, feriadosEmDiasUteis: 0, valorEstrategico: 0.6, valorAtivacaoFimDeSemana: 1.2 },
    { nome: "Período com 2 dias desperdiçados", diasUteis: 5, diasNaoUteis: 2, feriadosEmDiasUteis: 0, valorEstrategico: 0.6, valorAtivacaoFimDeSemana: 1.2 },
    { nome: "Período com 3 dias desperdiçados", diasUteis: 5, diasNaoUteis: 3, feriadosEmDiasUteis: 0, valorEstrategico: 0.6, valorAtivacaoFimDeSemana: 1.2 },
    { nome: "Período ruim (4 dias desperdiçados)", diasUteis: 5, diasNaoUteis: 4, feriadosEmDiasUteis: 0, valorEstrategico: 0, valorAtivacaoFimDeSemana: 0 },
    { nome: "Período péssimo (5 dias desperdiçados)", diasUteis: 5, diasNaoUteis: 5, feriadosEmDiasUteis: 0, valorEstrategico: 0, valorAtivacaoFimDeSemana: 0 },
  ];
  
  cenarios.forEach(cenario => {
    const eficiencia = calcularEficienciaHibrida(
      cenario.diasUteis,
      cenario.diasNaoUteis,
      cenario.feriadosEmDiasUteis,
      cenario.valorEstrategico,
      cenario.valorAtivacaoFimDeSemana
    );
    
    console.log(`${cenario.nome}:`);
    console.log(`  Dias úteis: ${cenario.diasUteis}`);
    console.log(`  Dias não úteis: ${cenario.diasNaoUteis}`);
    console.log(`  Feriados em dias úteis: ${cenario.feriadosEmDiasUteis}`);
    console.log(`  Eficiência: ${eficiencia.toFixed(2)} (${formatarEficiencia(eficiencia)})`);
    console.log(`  Classificação: ${classificarEficiencia(eficiencia)}`);
    console.log();
  });
  
  // Comparar com algoritmo hipotético sem penalização exponencial
  console.log("COMPARAÇÃO COM ALGORITMO SEM PENALIZAÇÃO EXPONENCIAL:");
  console.log("-----------------------------------");
  
  // Simular algoritmo tradicional (penalização linear)
  function calcularPenalizacaoLinear(diasNaoUteis) {
    const penalizacaoPorDia = 0.2;
    return diasNaoUteis * penalizacaoPorDia;
  }
  
  function calcularEficienciaLinear(
    diasUteis, 
    diasNaoUteis, 
    feriadosEmDiasUteis = 0,
    valorEstrategico = 0,
    valorAtivacaoFimDeSemana = 0
  ) {
    const penalizacaoDesperdicio = calcularPenalizacaoLinear(diasNaoUteis);
    const eficiencia = (feriadosEmDiasUteis + valorEstrategico + valorAtivacaoFimDeSemana - penalizacaoDesperdicio) / diasUteis;
    return eficiencia + 1.0;
  }
  
  for (let diasNaoUteis = 1; diasNaoUteis <= 5; diasNaoUteis++) {
    const diasUteis = 5;
    const eficienciaHibrida = calcularEficienciaHibrida(diasUteis, diasNaoUteis, 0, 0, 0);
    const eficienciaLinear = calcularEficienciaLinear(diasUteis, diasNaoUteis, 0, 0, 0);
    
    console.log(`${diasNaoUteis} dias não úteis:`);
    console.log(`  Penalização híbrida: ${calcularPenalizacaoHibrida(diasNaoUteis).toFixed(2)}`);
    console.log(`  Penalização linear: ${calcularPenalizacaoLinear(diasNaoUteis).toFixed(2)}`);
    console.log(`  Eficiência híbrida: ${eficienciaHibrida.toFixed(2)} (${formatarEficiencia(eficienciaHibrida)})`);
    console.log(`  Eficiência linear: ${eficienciaLinear.toFixed(2)} (${formatarEficiencia(eficienciaLinear)})`);
    console.log(`  Diferença: ${(eficienciaHibrida - eficienciaLinear).toFixed(2)}`);
    console.log();
  }
}

// Executar os testes
executarTestes();

// Exportar as funções para uso em outros arquivos
export {
  calcularPenalizacaoHibrida,
  calcularEficienciaHibrida,
  classificarEficiencia,
  formatarEficiencia
}; 