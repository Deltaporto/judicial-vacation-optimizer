import { max, min, differenceInDays } from 'date-fns';

/**
 * Verifica se dois intervalos de datas têm sobreposição
 */
export const dateRangesOverlap = (
  startDateA: Date, endDateA: Date,
  startDateB: Date, endDateB: Date
): boolean => {
  // Garante que as datas de início não sejam posteriores às datas de fim
  const validA = startDateA <= endDateA;
  const validB = startDateB <= endDateB;
  if (!validA || !validB) {
    // Se um dos intervalos for inválido, não podem se sobrepor
    return false; 
  }
  // A sobreposição ocorre se o início de A for antes ou igual ao fim de B
  // E o fim de A for depois ou igual ao início de B
  return startDateA <= endDateB && endDateA >= startDateB;
};

/**
 * Calcula o número de dias de sobreposição entre dois intervalos de datas
 */
export const getOverlapDays = (
  startDateA: Date, endDateA: Date,
  startDateB: Date, endDateB: Date
): number => {
  // Verifica se há sobreposição primeiro
  if (!dateRangesOverlap(startDateA, endDateA, startDateB, endDateB)) {
    return 0;
  }

  // Encontra o início e o fim do período de sobreposição
  const overlapStart = max([startDateA, startDateB]);
  const overlapEnd = min([endDateA, endDateB]);

  // Calcula a diferença em dias e adiciona 1 para incluir ambos os dias
  const overlapDuration = differenceInDays(overlapEnd, overlapStart) + 1;

  // Retorna 0 se a duração for negativa (caso raro, mas por segurança)
  return Math.max(0, overlapDuration);
}; 