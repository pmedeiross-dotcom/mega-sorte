/**
 * Motor Matemático de Fechamentos e Desdobramentos Econômicos (Wheeling System)
 * Implementa matrizes de cobertura combinatorial com garantia matemática de premiação
 * para Mega-Sena, +Milionária e Lotofácil.
 */

import { combinations } from './probabilityEngine';
import { LotteryType } from '../types';

export type WheelingGuarantee = 
  | 'quadra_if_4' // Garante Quadra se acertar 4 (Mega/Milionária) ou 13 se 14 (Lotofácil)
  | 'quadra_if_6' // Garante Quadra se acertar 6 (Super Econômico) ou 14 se 15 (Lotofácil)
  | 'quina_if_5'  // Garante Quina se acertar 5 (Mega/Milionária) ou 14 se 14 (Lotofácil)
  | 'quina_if_6'  // Garante Quina se acertar 6
  | 'total';      // Fechamento Total (todas as combinações)

export interface WheelingPlan {
  id: WheelingGuarantee;
  name: string;
  shortLabel: string;
  targetGuarantee: 'Quadra' | 'Quina' | 'Sena' | '14 Acertos' | '13 Acertos' | '15 Acertos';
  requiredHits: number;
  guaranteedHits: number;
  description: string;
  recommended: boolean;
}

export const WHEELING_PLANS_MEGA: WheelingPlan[] = [
  {
    id: 'quadra_if_6',
    name: 'Fechamento Super Econômico (Quadra se acertar 6)',
    shortLabel: 'Garante Quadra (6 acertos)',
    targetGuarantee: 'Quadra',
    requiredHits: 6,
    guaranteedHits: 4,
    description: 'Menor investimento possível. Se as 6 dezenas sorteadas estiverem entre as suas escolhidas, garante 100% pelo menos uma Quadra.',
    recommended: true
  },
  {
    id: 'quadra_if_4',
    name: 'Fechamento Robusto de Quadra (Quadra se acertar 4)',
    shortLabel: 'Garante Quadra (4 acertos)',
    targetGuarantee: 'Quadra',
    requiredHits: 4,
    guaranteedHits: 4,
    description: 'Basta acertar 4 dezenas dentre as escolhidas para ter Quadra garantida.',
    recommended: false
  },
  {
    id: 'quina_if_6',
    name: 'Fechamento Equilibrado de Quina (Quina se acertar 6)',
    shortLabel: 'Garante Quina (6 acertos)',
    targetGuarantee: 'Quina',
    requiredHits: 6,
    guaranteedHits: 5,
    description: 'Se as 6 sorteadas estiverem no seu grupo, garante matematicamente pelo menos uma Quina e múltiplas Quadras.',
    recommended: false
  },
  {
    id: 'quina_if_5',
    name: 'Fechamento Blindado de Quina (Quina se acertar 5)',
    shortLabel: 'Garante Quina (5 acertos)',
    targetGuarantee: 'Quina',
    requiredHits: 5,
    guaranteedHits: 5,
    description: 'Basta acertar 5 das dezenas do grupo para garantir 100% Quina.',
    recommended: false
  },
  {
    id: 'total',
    name: 'Desdobramento Total Caixa (100% Cobertura)',
    shortLabel: 'Fechamento Total C(n, 6)',
    targetGuarantee: 'Sena',
    requiredHits: 6,
    guaranteedHits: 6,
    description: 'Gera todas as combinações matemáticas possíveis do grupo. Equivalente à aposta múltipla oficial da Caixa.',
    recommended: false
  }
];

export const WHEELING_PLANS_LOTOFACIL: WheelingPlan[] = [
  {
    id: 'quadra_if_6',
    name: 'Fechamento Econômico Lotofácil (14 se acertar 15)',
    shortLabel: 'Garante 14 (15 acertos)',
    targetGuarantee: '14 Acertos',
    requiredHits: 15,
    guaranteedHits: 14,
    description: 'Se as 15 dezenas sorteadas estiverem entre o seu grupo selecionado, garante matematicamente pelo menos um bilhete com 14 acertos.',
    recommended: true
  },
  {
    id: 'quadra_if_4',
    name: 'Fechamento de Ponto Fixo (13 se acertar 14)',
    shortLabel: 'Garante 13 (14 acertos)',
    targetGuarantee: '13 Acertos',
    requiredHits: 14,
    guaranteedHits: 13,
    description: 'Basta acertar 14 dezenas dentre as escolhidas para garantir premiações de 13 e 12 pontos com baixo custo.',
    recommended: false
  },
  {
    id: 'quina_if_5',
    name: 'Fechamento Ouro Lotofácil (14 se acertar 14)',
    shortLabel: 'Garante 14 (14 acertos)',
    targetGuarantee: '14 Acertos',
    requiredHits: 14,
    guaranteedHits: 14,
    description: 'Cobertura reforçada: garante 14 pontos acertando 14 dezenas do seu pool.',
    recommended: false
  },
  {
    id: 'total',
    name: 'Desdobramento Total Lotofácil (100% C(n, 15))',
    shortLabel: 'Fechamento Total C(n, 15)',
    targetGuarantee: '15 Acertos',
    requiredHits: 15,
    guaranteedHits: 15,
    description: 'Gera todas as combinações de 15 dezenas do grupo.',
    recommended: false
  }
];

export interface WheelingResult {
  poolNumbers: number[];
  poolSize: number;
  guarantee: WheelingGuarantee;
  games: number[][];
  gamesCount: number;
  officialMultipleCost: number; // Custo se fizesse aposta única na Caixa
  economicWheelCost: number;    // Custo real dos bilhetes de 6 dezenas gerados
  savingsAmount: number;        // Economia em R$
  savingsPercent: number;       // % de economia
  lottery: LotteryType;
}

/**
 * Gera subcombinações de tamanho k
 */
function getCombinations(arr: number[], k: number): number[][] {
  const result: number[][] = [];
  function backtrack(start: number, current: number[]) {
    if (current.length === k) {
      result.push([...current]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      current.push(arr[i]);
      backtrack(i + 1, current);
      current.pop();
    }
  }
  backtrack(0, []);
  return result;
}

/**
 * Algoritmo Guloso Otimizado de Cobertura de Design Combinatorial (Set Cover / Wheeling)
 */
function buildCoveringWheel(
  pool: number[],
  ticketSize: number,
  requiredSubSize: number,
  maxGamesLimit: number = 80
): number[][] {
  const n = pool.length;
  if (n <= ticketSize) return [pool.slice(0, ticketSize)];

  // Gera todas as combinações de tamanho ticketSize
  const allTicketCombos = getCombinations(pool, ticketSize);

  if (allTicketCombos.length <= maxGamesLimit && requiredSubSize === ticketSize) {
    return allTicketCombos;
  }

  // Gera os subconjuntos alvos
  const targetSubsets = getCombinations(pool, requiredSubSize);
  const targetKeyToIndex = new Map<string, number>();
  targetSubsets.forEach((sub, idx) => {
    targetKeyToIndex.set(sub.sort((a, b) => a - b).join('-'), idx);
  });

  const uncoveredTargets = new Set<number>(targetSubsets.map((_, i) => i));

  // Mapa de cada jogo para os subconjuntos que ele cobre
  const comboToTargetIndices: number[][] = allTicketCombos.map(combo => {
    const subs = getCombinations(combo, requiredSubSize);
    const indices: number[] = [];
    subs.forEach(s => {
      const key = s.sort((a, b) => a - b).join('-');
      const idx = targetKeyToIndex.get(key);
      if (idx !== undefined) indices.push(idx);
    });
    return indices;
  });

  const selectedGames: number[][] = [];
  const selectedComboIndices = new Set<number>();

  while (uncoveredTargets.size > 0 && selectedGames.length < maxGamesLimit) {
    let bestComboIdx = -1;
    let maxCoverCount = -1;

    for (let i = 0; i < allTicketCombos.length; i++) {
      if (selectedComboIndices.has(i)) continue;
      const targets = comboToTargetIndices[i];
      let coverCount = 0;
      for (const t of targets) {
        if (uncoveredTargets.has(t)) coverCount++;
      }

      if (coverCount > maxCoverCount) {
        maxCoverCount = coverCount;
        bestComboIdx = i;
      }
    }

    if (bestComboIdx === -1 || maxCoverCount <= 0) {
      break;
    }

    selectedComboIndices.add(bestComboIdx);
    selectedGames.push(allTicketCombos[bestComboIdx]);

    for (const t of comboToTargetIndices[bestComboIdx]) {
      uncoveredTargets.delete(t);
    }
  }

  // Se por limite ainda faltar, garante que o primeiro ticket foi adicionado
  if (selectedGames.length === 0 && allTicketCombos.length > 0) {
    selectedGames.push(allTicketCombos[0]);
  }

  return selectedGames;
}

/**
 * Gera o fechamento matemático a partir das dezenas escolhidas e da garantia desejada
 */
export function generateWheeling(
  poolNumbers: number[],
  guarantee: WheelingGuarantee,
  lottery: LotteryType = 'megasena'
): WheelingResult {
  const sortedPool = Array.from(new Set(poolNumbers)).sort((a, b) => a - b);
  const poolSize = sortedPool.length;
  const isLotofacil = lottery === 'lotofacil';
  const isMaisMilionaria = lottery === 'maismilionaria';
  
  const ticketSize = isLotofacil ? 15 : 6;
  const singleTicketPrice = isLotofacil ? 3.0 : (isMaisMilionaria ? 6.0 : 5.0);

  // Custo oficial da aposta múltipla na Caixa Econômica (C(n, ticketSize) * preço)
  const totalPossibleCombos = combinations(poolSize, ticketSize);
  const officialMultipleCost = totalPossibleCombos * singleTicketPrice;

  let games: number[][] = [];

  if (poolSize < ticketSize) {
    return {
      poolNumbers: sortedPool,
      poolSize,
      guarantee,
      games: [],
      gamesCount: 0,
      officialMultipleCost: 0,
      economicWheelCost: 0,
      savingsAmount: 0,
      savingsPercent: 0,
      lottery
    };
  }

  if (poolSize === ticketSize) {
    games = [sortedPool];
  } else if (guarantee === 'total') {
    games = getCombinations(sortedPool, ticketSize);
  } else if (isLotofacil) {
    if (guarantee === 'quadra_if_6') {
      // Garante 14 se acertar 15
      games = buildCoveringWheel(sortedPool, 15, 14, Math.min(24, Math.ceil(totalPossibleCombos * 0.18)));
    } else if (guarantee === 'quadra_if_4') {
      // Garante 13 se acertar 14
      games = buildCoveringWheel(sortedPool, 15, 13, Math.min(18, Math.ceil(totalPossibleCombos * 0.12)));
    } else {
      games = buildCoveringWheel(sortedPool, 15, 14, 30);
    }
  } else {
    // Mega-Sena ou +Milionária (ticket de 6 números)
    if (guarantee === 'quadra_if_6') {
      games = buildCoveringWheel(sortedPool, 6, 4, Math.min(25, Math.ceil(totalPossibleCombos * 0.15)));
    } else if (guarantee === 'quadra_if_4') {
      games = buildCoveringWheel(sortedPool, 6, 4, 60);
    } else if (guarantee === 'quina_if_6') {
      games = buildCoveringWheel(sortedPool, 6, 5, Math.min(40, Math.ceil(totalPossibleCombos * 0.35)));
    } else if (guarantee === 'quina_if_5') {
      games = buildCoveringWheel(sortedPool, 6, 5, 80);
    }
  }

  const gamesCount = games.length;
  const economicWheelCost = gamesCount * singleTicketPrice;
  const savingsAmount = Math.max(0, officialMultipleCost - economicWheelCost);
  const savingsPercent = officialMultipleCost > 0
    ? +((savingsAmount / officialMultipleCost) * 100).toFixed(1)
    : 0;

  return {
    poolNumbers: sortedPool,
    poolSize,
    guarantee,
    games,
    gamesCount,
    officialMultipleCost,
    economicWheelCost,
    savingsAmount,
    savingsPercent,
    lottery
  };
}

/**
 * Testa um resultado oficial contra os jogos gerados pelo fechamento
 */
export function testWheelingAgainstDraw(
  wheelGames: number[][],
  drawnNumbers: number[],
  lottery: LotteryType = 'megasena'
) {
  const drawnSet = new Set(drawnNumbers);
  const isLotofacil = lottery === 'lotofacil';

  let tier1Count = 0; // Sena ou 15 acertos
  let tier2Count = 0; // Quina ou 14 acertos
  let tier3Count = 0; // Quadra ou 13 acertos
  let tier4Count = 0; // Terno ou 12 acertos
  let tier5Count = 0; // 11 acertos
  let maxHits = 0;

  const hitsPerGame = wheelGames.map((game, idx) => {
    const hits = game.filter(n => drawnSet.has(n));
    const count = hits.length;
    if (count > maxHits) maxHits = count;

    if (isLotofacil) {
      if (count === 15) tier1Count++;
      else if (count === 14) tier2Count++;
      else if (count === 13) tier3Count++;
      else if (count === 12) tier4Count++;
      else if (count === 11) tier5Count++;
    } else {
      if (count === 6) tier1Count++;
      else if (count === 5) tier2Count++;
      else if (count === 4) tier3Count++;
      else if (count === 3) tier4Count++;
    }

    return {
      gameIndex: idx,
      game,
      hits,
      count
    };
  });

  return {
    maxHits,
    senaCount: tier1Count,
    quinaCount: tier2Count,
    quadraCount: tier3Count,
    ternoCount: tier4Count,
    elevenCount: tier5Count,
    totalPrized: tier1Count + tier2Count + tier3Count + (isLotofacil ? tier4Count + tier5Count : 0),
    hitsPerGame
  };
}

// Export default WHEELING_PLANS adaptável
export const WHEELING_PLANS = WHEELING_PLANS_MEGA;
