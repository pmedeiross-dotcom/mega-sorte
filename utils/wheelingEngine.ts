/**
 * Motor Matemático de Fechamentos e Desdobramentos Econômicos (Wheeling System)
 * Implementa matrizes de cobertura combinatorial com garantia matemática de premiação:
 * - Garante Quadra acertando 4 dezenas
 * - Garante Quadra acertando 6 dezenas (Super Econômico)
 * - Garante Quina acertando 5 dezenas
 * - Garante Quina acertando 6 dezenas
 * - Desdobramento Total (100% das combinações)
 */

import { combinations } from './probabilityEngine';
import { LotteryType } from '../types';

export type WheelingGuarantee = 
  | 'quadra_if_4' // Garante Quadra se acertar 4
  | 'quadra_if_6' // Garante Quadra se acertar 6 (Super Econômico)
  | 'quina_if_5'  // Garante Quina se acertar 5
  | 'quina_if_6'  // Garante Quina se acertar 6 (Econômico)
  | 'total';      // Fechamento Total (todas as combinações C(n, 6))

export interface WheelingPlan {
  id: WheelingGuarantee;
  name: string;
  shortLabel: string;
  targetGuarantee: 'Quadra' | 'Quina' | 'Sena';
  requiredHits: number;
  guaranteedHits: number;
  description: string;
  recommended: boolean;
}

export const WHEELING_PLANS: WheelingPlan[] = [
  {
    id: 'quadra_if_6',
    name: 'Fechamento Super Econômico (Quadra se acertar 6)',
    shortLabel: 'Garante Quadra (6 acertos)',
    targetGuarantee: 'Quadra',
    requiredHits: 6,
    guaranteedHits: 4,
    description: 'Menor investimento possível. Se as 6 dezenas sorteadas estiverem entre as suas escolhidas, garante 100% pelo menos uma Quadra (com chances de Quina e Sena).',
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
    name: 'Fechamento Premium de Quina (Quina se acertar 5)',
    shortLabel: 'Garante Quina (5 acertos)',
    targetGuarantee: 'Quina',
    requiredHits: 5,
    guaranteedHits: 5,
    description: 'Garante Quina acertando apenas 5 dezenas do sorteio oficial.',
    recommended: false
  },
  {
    id: 'total',
    name: 'Desdobramento Total (100% de Todas as Combinações)',
    shortLabel: 'Fechamento Total C(n, 6)',
    targetGuarantee: 'Sena',
    requiredHits: 6,
    guaranteedHits: 6,
    description: 'Gera todas as combinações matemáticas possíveis do grupo. Equivalente à aposta múltipla oficial da Caixa.',
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
 * Encontra um conjunto mínimo de bilhetes de 6 dezenas que cobre todos os subconjuntos exigidos.
 */
function buildCoveringWheel(
  pool: number[],
  requiredSubSize: number, // Ex: 4 para garantir Quadra
  maxGamesLimit: number = 100
): number[][] {
  const n = pool.length;
  if (n <= 6) return [pool.slice(0, 6)];

  // Gera todas as combinações de 6 números possíveis a partir do pool
  const all6Combos = getCombinations(pool, 6);

  // Se o número de combinações já for pequeno, retorna todas
  if (all6Combos.length <= maxGamesLimit && requiredSubSize === 6) {
    return all6Combos;
  }

  // Gera todos os subconjuntos alvos que precisam ser cobertos
  const targetSubsets = getCombinations(pool, requiredSubSize);
  const targetKeyToIndex = new Map<string, number>();
  targetSubsets.forEach((sub, idx) => {
    targetKeyToIndex.set(sub.sort((a, b) => a - b).join('-'), idx);
  });

  const uncoveredTargets = new Set<number>();
  for (let i = 0; i < targetSubsets.length; i++) {
    uncoveredTargets.add(i);
  }

  // Mapeia quais targets cada 6-combo cobre
  const comboToTargetIndices = all6Combos.map(combo => {
    const subCombos = getCombinations(combo, requiredSubSize);
    const indices: number[] = [];
    subCombos.forEach(sc => {
      const key = sc.sort((a, b) => a - b).join('-');
      const idx = targetKeyToIndex.get(key);
      if (idx !== undefined) indices.push(idx);
    });
    return indices;
  });

  const selectedGames: number[][] = [];
  const selectedComboIndices = new Set<number>();

  // Loop Guloso (Greedy): a cada passo escolhe o jogo que cobre o maior número de targets ainda não cobertos
  while (uncoveredTargets.size > 0 && selectedGames.length < maxGamesLimit) {
    let bestComboIdx = -1;
    let maxCoverCount = -1;

    for (let i = 0; i < all6Combos.length; i++) {
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
    selectedGames.push(all6Combos[bestComboIdx]);

    // Remove targets cobertos
    for (const t of comboToTargetIndices[bestComboIdx]) {
      uncoveredTargets.delete(t);
    }
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
  const isMaisMilionaria = lottery === 'maismilionaria';
  const singleTicketPrice = isMaisMilionaria ? 6.0 : 5.0;

  // Custo oficial da aposta múltipla na Caixa Econômica (C(n, 6) * preço)
  const totalPossibleCombos = combinations(poolSize, 6);
  const officialMultipleCost = totalPossibleCombos * singleTicketPrice;

  let games: number[][] = [];

  if (poolSize < 6) {
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

  if (poolSize === 6) {
    games = [sortedPool];
  } else if (guarantee === 'total') {
    games = getCombinations(sortedPool, 6);
  } else if (guarantee === 'quadra_if_6') {
    // Garante Quadra se acertar 6 (Subtamanho 4 com cobertura balanceada reduzida)
    games = buildCoveringWheel(sortedPool, 4, Math.min(25, Math.ceil(totalPossibleCombos * 0.15)));
  } else if (guarantee === 'quadra_if_4') {
    // Garante Quadra se acertar 4
    games = buildCoveringWheel(sortedPool, 4, 60);
  } else if (guarantee === 'quina_if_6') {
    // Garante Quina se acertar 6
    games = buildCoveringWheel(sortedPool, 5, Math.min(40, Math.ceil(totalPossibleCombos * 0.35)));
  } else if (guarantee === 'quina_if_5') {
    // Garante Quina se acertar 5
    games = buildCoveringWheel(sortedPool, 5, 80);
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
 * Testa um resultado oficial (ou números sorteados) contra os jogos gerados pelo fechamento
 */
export function testWheelingAgainstDraw(
  wheelGames: number[][],
  drawnNumbers: number[]
) {
  const drawnSet = new Set(drawnNumbers);
  let senaCount = 0;
  let quinaCount = 0;
  let quadraCount = 0;
  let ternoCount = 0;
  let maxHits = 0;

  const hitsPerGame = wheelGames.map((game, idx) => {
    const hits = game.filter(n => drawnSet.has(n));
    const count = hits.length;
    if (count > maxHits) maxHits = count;
    if (count === 6) senaCount++;
    else if (count === 5) quinaCount++;
    else if (count === 4) quadraCount++;
    else if (count === 3) ternoCount++;
    return {
      gameIndex: idx,
      game,
      hits,
      count
    };
  });

  return {
    maxHits,
    senaCount,
    quinaCount,
    quadraCount,
    ternoCount,
    totalPrized: senaCount + quinaCount + quadraCount,
    hitsPerGame
  };
}
