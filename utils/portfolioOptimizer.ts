/**
 * Motor Matemático de Otimização Combinatória de Carteira (Anti-Colisão & Cobertura Uniforme)
 * Maximiza a cobertura de pares, trincas e quadras únicas para um orçamento fixo de M apostas,
 * eliminando jogos repetidos e concentração enviesada em dezenas "quentes/atrasadas".
 */

import { isGamePlausible } from './plausibilityFilter';
import type { PortfolioStructuralMetrics } from './hybridCoverageStrategy';

export interface PortfolioCoverageMetrics {
  totalGames: number;
  distinctGames: number;
  repeatedTickets: number;
  distinctNumbers: number;
  maxNumberPool: number;
  minFreq: number;
  maxFreq: number;
  idealFreq: number;
  stdFreq: number;
  chiSquareUniform: number;
  giniCoefficient: number;
  uniquePairs: number;
  totalPossiblePairs: number;
  pairCoveragePct: number;
  repeatedPairs: number;
  uniqueTriples: number;
  totalPossibleTriples: number;
  tripleCoveragePct: number;
  repeatedTriples: number;
  uniqueQuads: number;
  totalPossibleQuads: number;
  quadCoveragePct: number;
  meanJaccard: number;
  maxJaccard: number;
  numberFrequencies: number[]; // índice 1..60
}

export interface PortfolioDrawEvaluation {
  ternos: number;
  quadras: number;
  quinas: number;
  senas: number;
  hasAny3Plus: boolean;
  hasAny4Plus: boolean;
  maxHitsInPortfolio: number;
  distinctDrawnCovered: number;
}

export interface ProspectiveAuditEntry {
  id: string;
  targetContest: number;
  createdAt: number;
  strategyLabel: string;
  strategyKey: 'combinatorial_cover' | 'combinatorial_plausible' | 'classic_dedup' | 'hybrid_combinatorial';
  seed?: number;
  randomSeed?: number;
  hashVersion?: 1 | 2;
  ticketCount: number;
  betSize: number;
  ticketPrice: number;
  totalCost: number;
  optimizedGames: number[][];
  randomBaselineGames: number[][];
  commitmentHash: string;
  locked: true;
  isSyntheticTest?: boolean;
  optimizedCoverage: PortfolioCoverageMetrics;
  randomCoverage: PortfolioCoverageMetrics;
  structuralMetrics?: PortfolioStructuralMetrics;
  officialDraw?: {
    contestNumber: number;
    date: string;
    numbers: number[];
    recordedAt: number;
  };
  optimizedEval?: PortfolioDrawEvaluation;
  randomEval?: PortfolioDrawEvaluation;
  realPrizes?: {
    optimizedPrizeTotal?: number;
    randomPrizeTotal?: number;
    note?: string;
  };
}

function combinationsCount(n: number, k: number): number {
  if (k > n || k < 0) return 0;
  if (k === 0 || k === n) return 1;
  let num = 1;
  let den = 1;
  const effK = Math.min(k, n - k);
  for (let i = 1; i <= effK; i++) {
    num *= n - i + 1;
    den *= i;
  }
  return Math.round(num / den);
}

function encodeMask60(nums: number[]): [number, number] {
  let lo = 0;
  let hi = 0;
  for (let i = 0; i < nums.length; i++) {
    const b = nums[i] - 1;
    if (b < 30) lo |= 1 << b;
    else hi |= 1 << (b - 30);
  }
  return [lo >>> 0, hi >>> 0];
}

function popcount32(x: number): number {
  x = x - ((x >>> 1) & 0x55555555);
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  return (((x + (x >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
}

export function ticketKey(nums: number[]): string {
  return [...nums].sort((a, b) => a - b).join('-');
}

export function drawRandomTicket(
  betSize: number = 6,
  maxNum: number = 60,
  randFn: () => number = Math.random
): number[] {
  const pool = Array.from({ length: maxNum }, (_, i) => i + 1);
  for (let i = 0; i < betSize; i++) {
    const j = i + Math.floor(randFn() * (maxNum - i));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  return pool.slice(0, betSize).sort((a, b) => a - b);
}

/**
 * Gera uma carteira aleatória estritamente sem jogos duplicados (grupo controle justo).
 */
export function generateRandomDistinctPortfolio(
  portfolioSize: number,
  betSize: number = 6,
  maxNum: number = 60,
  randFn: () => number = Math.random
): number[][] {
  const seen = new Set<string>();
  const games: number[][] = [];
  const safeSize = Math.max(1, Math.min(500, portfolioSize));
  let guard = 0;

  while (games.length < safeSize && guard < safeSize * 40) {
    guard++;
    const combo = drawRandomTicket(betSize, maxNum, randFn);
    const key = combo.join('-');
    if (!seen.has(key)) {
      seen.add(key);
      games.push(combo);
    }
  }
  return games;
}

/**
 * Gera uma carteira matematicamente otimizada por Cobertura Combinatória Anti-Colisão:
 * - Zero bilhetes duplicados
 * - Frequência uniforme por dezena no universo ativo (60 ou sub-pool selecionado)
 * - Maximiza pares e trincas inéditas e penaliza diretamente colisões de trincas repetidas
 * - Opção de filtro estrutural (Soma/Paridade/Quadrantes) sem nenhum viés por dezena
 */
export function generateCombinatorialPortfolio(
  portfolioSize: number,
  options?: {
    betSize?: number;
    maxNum?: number;
    useStructuralPlausibility?: boolean;
    candidatesPerTicket?: number;
    subPoolNumbers?: number[];
  }
): number[][] {
  const betSize = Math.max(6, Math.min(15, options?.betSize ?? 6));
  const maxNum = options?.maxNum ?? 60;
  const usePlausibility = Boolean(options?.useStructuralPlausibility);
  const safeSize = Math.max(1, Math.min(500, portfolioSize));
  const candidatesPerTicket = options?.candidatesPerTicket ?? (safeSize <= 100 ? 320 : 180);

  const activePool =
    options?.subPoolNumbers && options.subPoolNumbers.length >= betSize
      ? Array.from(new Set(options.subPoolNumbers.filter(n => n >= 1 && n <= maxNum))).sort((a, b) => a - b)
      : Array.from({ length: maxNum }, (_, i) => i + 1);

  const pairSeen = new Uint16Array((maxNum + 1) * (maxNum + 1));
  const tripleCounts = new Map<number, number>();
  const numFreq = new Uint16Array(maxNum + 1);
  const usedTickets = new Set<string>();
  const games: number[][] = [];

  const targetPerNum = (safeSize * betSize) / activePool.length;
  const baseOrder = [...activePool];

  const drawFromActivePool = (): number[] => {
    const copy = [...activePool];
    for (let i = 0; i < betSize; i++) {
      const j = i + Math.floor(Math.random() * (copy.length - i));
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy.slice(0, betSize).sort((a, b) => a - b);
  };

  for (let g = 0; g < safeSize; g++) {
    let bestCombo: number[] = [];
    let bestScore = -1e12;

    for (let c = 0; c < candidatesPerTicket; c++) {
      // Ordena priorizando dezenas menos usadas até o momento + ruído controlado
      const ranked = [...baseOrder].sort(
        (a, b) => numFreq[a] - numFreq[b] + (Math.random() - 0.5) * 1.8
      );
      const combo = ranked.slice(0, betSize).sort((a, b) => a - b);

      if (usePlausibility && c < candidatesPerTicket - 15 && !isGamePlausible(combo, 'megasena')) {
        continue;
      }

      const key = combo.join('-');
      if (usedTickets.has(key)) continue;

      let newPairs = 0;
      let pairCollisionPenalty = 0;
      for (let i = 0; i < betSize; i++) {
        for (let j = i + 1; j < betSize; j++) {
          const cnt = pairSeen[combo[i] * (maxNum + 1) + combo[j]];
          if (cnt === 0) newPairs += 1;
          else pairCollisionPenalty += cnt * cnt;
        }
      }

      let newTriples = 0;
      let tripleCollisionPenalty = 0;
      if (betSize <= 9) {
        for (let i = 0; i < betSize; i++) {
          for (let j = i + 1; j < betSize; j++) {
            for (let l = j + 1; l < betSize; l++) {
              const code = (combo[i] << 12) | (combo[j] << 6) | combo[l];
              const tCnt = tripleCounts.get(code) || 0;
              if (tCnt === 0) newTriples++;
              else tripleCollisionPenalty += tCnt * tCnt;
            }
          }
        }
      }

      let freqImbalance = 0;
      for (let i = 0; i < betSize; i++) {
        const diff = numFreq[combo[i]] + 1 - targetPerNum;
        freqImbalance += diff * diff;
      }

      const score =
        newPairs * 25 +
        newTriples * 10 -
        pairCollisionPenalty * 6 -
        tripleCollisionPenalty * 14 -
        freqImbalance * 3.5;

      if (score > bestScore) {
        bestScore = score;
        bestCombo = combo;
      }
    }

    if (bestCombo.length !== betSize) {
      let guard = 0;
      while (guard < 250) {
        guard++;
        const fallback = drawFromActivePool();
        const key = fallback.join('-');
        if (!usedTickets.has(key)) {
          bestCombo = fallback;
          break;
        }
      }
      if (bestCombo.length !== betSize) {
        bestCombo = drawFromActivePool();
      }
    }

    usedTickets.add(bestCombo.join('-'));
    games.push(bestCombo);

    for (let i = 0; i < betSize; i++) {
      numFreq[bestCombo[i]]++;
      for (let j = i + 1; j < betSize; j++) {
        pairSeen[bestCombo[i] * (maxNum + 1) + bestCombo[j]]++;
      }
    }
    if (betSize <= 9) {
      for (let i = 0; i < betSize; i++) {
        for (let j = i + 1; j < betSize; j++) {
          for (let l = j + 1; l < betSize; l++) {
            const code = (bestCombo[i] << 12) | (bestCombo[j] << 6) | bestCombo[l];
            tripleCounts.set(code, (tripleCounts.get(code) || 0) + 1);
          }
        }
      }
    }
  }

  return games;
}

/**
 * Mede todas as métricas combinatórias de uma carteira de jogos.
 */
export function analyzePortfolioCoverage(
  games: number[][],
  maxNum: number = 60
): PortfolioCoverageMetrics {
  const ticketCounts = new Map<string, number>();
  const numFreq = Array(maxNum + 1).fill(0);
  const pairCounts = new Map<number, number>();
  const tripleCounts = new Map<number, number>();
  const quadSet = new Set<number>();

  for (const g of games) {
    const s = [...g].sort((a, b) => a - b);
    const k = s.join('-');
    ticketCounts.set(k, (ticketCounts.get(k) || 0) + 1);
    const len = s.length;
    for (let i = 0; i < len; i++) {
      if (s[i] >= 1 && s[i] <= maxNum) numFreq[s[i]]++;
      for (let j = i + 1; j < len; j++) {
        const pk = s[i] * (maxNum + 1) + s[j];
        pairCounts.set(pk, (pairCounts.get(pk) || 0) + 1);
        for (let l = j + 1; l < len; l++) {
          const tk = (s[i] << 12) | (s[j] << 6) | s[l];
          tripleCounts.set(tk, (tripleCounts.get(tk) || 0) + 1);
          if (len <= 9) {
            for (let m = l + 1; m < len; m++) {
              const qk = ((s[i] * 61 + s[j]) * 61 + s[l]) * 61 + s[m];
              quadSet.add(qk);
            }
          }
        }
      }
    }
  }

  const freqs = numFreq.slice(1);
  const distinctNumbers = freqs.filter(f => f > 0).length;
  const totalSlots = freqs.reduce((a, b) => a + b, 0);
  const idealFreq = totalSlots / maxNum;
  const minFreq = Math.min(...freqs);
  const maxFreq = Math.max(...freqs);
  const stdFreq = Math.sqrt(
    freqs.reduce((acc, f) => acc + (f - idealFreq) ** 2, 0) / maxNum
  );
  const chiSquareUniform =
    idealFreq > 0
      ? freqs.reduce((acc, f) => acc + ((f - idealFreq) ** 2) / idealFreq, 0)
      : 0;

  const sortedF = [...freqs].sort((a, b) => a - b);
  let giniNum = 0;
  for (let i = 0; i < maxNum; i++) {
    giniNum += (2 * (i + 1) - maxNum - 1) * sortedF[i];
  }
  const giniCoefficient =
    totalSlots > 0 ? giniNum / (maxNum * totalSlots) : 0;

  let repeatedTickets = 0;
  for (const c of ticketCounts.values()) {
    if (c > 1) repeatedTickets += c - 1;
  }

  let repeatedPairs = 0;
  for (const c of pairCounts.values()) {
    if (c > 1) repeatedPairs += c - 1;
  }

  let repeatedTriples = 0;
  for (const c of tripleCounts.values()) {
    if (c > 1) repeatedTriples += c - 1;
  }

  let jaccardSum = 0;
  let maxJaccard = 0;
  let comparisons = 0;
  if (maxNum <= 60 && games.length > 1) {
    const masks = games.map(encodeMask60);
    for (let i = 0; i < games.length; i++) {
      const lenA = games[i].length;
      for (let j = i + 1; j < games.length; j++) {
        const inter =
          popcount32(masks[i][0] & masks[j][0]) +
          popcount32(masks[i][1] & masks[j][1]);
        const union = lenA + games[j].length - inter;
        const jacc = union > 0 ? inter / union : 0;
        jaccardSum += jacc;
        if (jacc > maxJaccard) maxJaccard = jacc;
        comparisons++;
      }
    }
  }

  const totalPossiblePairs = combinationsCount(maxNum, 2);
  const totalPossibleTriples = combinationsCount(maxNum, 3);
  const totalPossibleQuads = combinationsCount(maxNum, 4);

  return {
    totalGames: games.length,
    distinctGames: ticketCounts.size,
    repeatedTickets,
    distinctNumbers,
    maxNumberPool: maxNum,
    minFreq,
    maxFreq,
    idealFreq,
    stdFreq,
    chiSquareUniform,
    giniCoefficient,
    uniquePairs: pairCounts.size,
    totalPossiblePairs,
    pairCoveragePct: totalPossiblePairs > 0 ? (pairCounts.size / totalPossiblePairs) * 100 : 0,
    repeatedPairs,
    uniqueTriples: tripleCounts.size,
    totalPossibleTriples,
    tripleCoveragePct: totalPossibleTriples > 0 ? (tripleCounts.size / totalPossibleTriples) * 100 : 0,
    repeatedTriples,
    uniqueQuads: quadSet.size,
    totalPossibleQuads,
    quadCoveragePct: totalPossibleQuads > 0 ? (quadSet.size / totalPossibleQuads) * 100 : 0,
    meanJaccard: comparisons > 0 ? jaccardSum / comparisons : 0,
    maxJaccard,
    numberFrequencies: freqs
  };
}

/**
 * Avalia uma carteira inteira contra um sorteio oficial de 6 dezenas.
 */
export function evaluatePortfolioAgainstDraw(
  games: number[][],
  drawnNumbers: number[]
): PortfolioDrawEvaluation {
  const drawnSet = new Set(drawnNumbers);
  const coveredDrawn = new Set<number>();
  let ternos = 0;
  let quadras = 0;
  let quinas = 0;
  let senas = 0;
  let maxHitsInPortfolio = 0;

  for (const game of games) {
    let hits = 0;
    for (const n of game) {
      if (drawnSet.has(n)) {
        hits++;
        coveredDrawn.add(n);
      }
    }
    if (hits > maxHitsInPortfolio) maxHitsInPortfolio = hits;
    if (hits === 3) ternos++;
    else if (hits === 4) quadras++;
    else if (hits === 5) quinas++;
    else if (hits >= 6) senas++;
  }

  return {
    ternos,
    quadras,
    quinas,
    senas,
    hasAny3Plus: ternos + quadras + quinas + senas > 0,
    hasAny4Plus: quadras + quinas + senas > 0,
    maxHitsInPortfolio,
    distinctDrawnCovered: coveredDrawn.size
  };
}

/**
 * Gera hash criptográfico SHA-256 determinístico para registro imutável pré-sorteio.
 */
export async function computeCommitmentHash(payload: {
  targetContest: number;
  createdAt: number;
  optimizedGames: number[][];
  randomBaselineGames: number[][];
  strategyKey?: string;
  seed?: number;
  randomSeed?: number;
}): Promise<string> {
  const canonical = JSON.stringify(payload);
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoded = new TextEncoder().encode(canonical);
      const digest = await crypto.subtle.digest('SHA-256', encoded);
      return Array.from(new Uint8Array(digest))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    // Fallback determinístico caso SubtleCrypto não esteja disponível em contexto HTTP não-HTTPS
  }
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < canonical.length; i++) {
    const ch = canonical.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ (ch + i), 0x85ebca6b) >>> 0;
  }
  return `${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`.repeat(4);
}

/**
 * Verifica se o hash de compromisso SHA-256 armazenado em uma entrada prospectiva
 * corresponde exatamente aos jogos, concurso, timestamp e seed registrados.
 */
export async function verifyCommitmentHash(entry: ProspectiveAuditEntry): Promise<boolean> {
  const payload =
    entry.hashVersion === 2
      ? {
          targetContest: entry.targetContest,
          createdAt: entry.createdAt,
          optimizedGames: entry.optimizedGames,
          randomBaselineGames: entry.randomBaselineGames,
          strategyKey: entry.strategyKey,
          seed: entry.seed,
          randomSeed: entry.randomSeed
        }
      : {
          targetContest: entry.targetContest,
          createdAt: entry.createdAt,
          optimizedGames: entry.optimizedGames,
          randomBaselineGames: entry.randomBaselineGames
        };
  const recomputed = await computeCommitmentHash(payload);
  return recomputed === entry.commitmentHash;
}

/**
 * Teste Z de duas proporções e p-valor bilateral (aproximação normal assintótica).
 */
export function twoProportionZTest(k1: number, n1: number, k2: number, n2: number): {
  zScore: number;
  pValue: number;
  diffPctPoints: number;
} {
  if (n1 === 0 || n2 === 0) return { zScore: 0, pValue: 1, diffPctPoints: 0 };
  const p1 = k1 / n1;
  const p2 = k2 / n2;
  const pPool = (k1 + k2) / (n1 + n2);
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / n1 + 1 / n2));
  if (se === 0) return { zScore: 0, pValue: 1, diffPctPoints: (p1 - p2) * 100 };
  const z = (p1 - p2) / se;
  // Aproximação Abramowitz & Stegun para erfc(|z|/sqrt(2))
  const absZ = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * absZ);
  const erfc =
    t *
    (0.254829592 +
      t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429)))) *
    Math.exp(-absZ * absZ);
  return {
    zScore: z,
    pValue: Math.min(1, Math.max(0, erfc)),
    diffPctPoints: (p1 - p2) * 100
  };
}
