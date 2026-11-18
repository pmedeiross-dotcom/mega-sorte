/**
 * Estratégia Híbrida de Cobertura Combinatória (Hybrid Combinatorial Coverage)
 *
 * Algoritmo determinístico baseado em heurística gulosa multicritério (com gancho opcional
 * para pós-otimização global por busca local) que maximiza cobertura de pares e trincas
 * inéditas enquanto equilibra suavemente frequência das dezenas, soma (160–240), paridade,
 * dispersão em quadrantes/faixas do volante 6x10, sequências consecutivas e redundância.
 *
 * Princípio fundamental: critérios estatísticos (soma, paridade, quadrantes, sequências)
 * atuam como preferências suaves na pontuação, jamais como filtros eliminatórios absolutos.
 */

import { getQuadrant } from './megaSenaOfficialStats';
import { analyzePortfolioCoverage, PortfolioCoverageMetrics } from './portfolioOptimizer';

export interface HybridScoringWeights {
  /** Recompensa por cada par inédito ainda não coberto na carteira */
  newPairWeight: number;
  /** Penalização quadrática suave quando um par já apareceu na carteira */
  pairCollisionPenalty: number;
  /** Recompensa por cada trinca inédita ainda não coberta na carteira */
  newTripleWeight: number;
  /** Penalização quando uma trinca já apareceu na carteira */
  tripleCollisionPenalty: number;
  /** Penalização pelo desvio quadrático em relação à frequência média esperada das 60 dezenas */
  frequencyBalancePenalty: number;
  /** Bônus máximo quando a soma está na faixa preferencial [160, 240] */
  sumSoftBonus: number;
  /** Inclinação da penalidade suave por unidade fora da faixa [160, 240] (não eliminatório) */
  sumSoftSlopePenalty: number;
  /** Bônus máximo para paridade equilibrada (3P/3I > 2P/4I ou 4P/2I) */
  parityBalanceBonus: number;
  /** Penalidade suave para paridades extremas (0P/6I, 1P/5I, 5P/1I, 6P/0I) */
  parityExtremePenalty: number;
  /** Bônus por dispersão entre os 4 quadrantes reais do volante (6x10) */
  quadrantDispersionBonus: number;
  /** Bônus por dispersão entre as 6 faixas/linhas (dezenas 01-10 .. 51-60) */
  decadeDispersionBonus: number;
  /** Penalidade por concentração excessiva no mesmo quadrante (>=4) ou mesma linha/faixa (>=3) */
  regionConcentrationPenalty: number;
  /** Penalidade leve por par consecutivo (ex: 12-13) — valor baixo para não proibir */
  consecutiveLen2Penalty: number;
  /** Penalidade moderada por trinca consecutiva (ex: 12-13-14) */
  consecutiveLen3Penalty: number;
  /** Penalidade forte (não eliminatória) por sequência de 4+ dezenas consecutivas */
  consecutiveLen4PlusPenalty: number;
  /** Penalização por redundância/sobreposição elevada com jogos já selecionados na carteira */
  redundancyOverlapPenalty: number;
}

export const DEFAULT_HYBRID_WEIGHTS: HybridScoringWeights = {
  newPairWeight: 24,
  pairCollisionPenalty: 5.5,
  newTripleWeight: 14,
  tripleCollisionPenalty: 15,
  frequencyBalancePenalty: 7.5,
  sumSoftBonus: 11,
  sumSoftSlopePenalty: 0.22,
  parityBalanceBonus: 9,
  parityExtremePenalty: 7,
  quadrantDispersionBonus: 8,
  decadeDispersionBonus: 5,
  regionConcentrationPenalty: 9,
  consecutiveLen2Penalty: 1.5,
  consecutiveLen3Penalty: 11,
  consecutiveLen4PlusPenalty: 26,
  redundancyOverlapPenalty: 12
};

export interface HybridScoreBreakdown {
  totalScore: number;
  newPairsCount: number;
  pairReward: number;
  pairCollisionCost: number;
  newTriplesCount: number;
  tripleReward: number;
  tripleCollisionCost: number;
  frequencyBalanceCost: number;
  sumScore: number;
  parityScore: number;
  spatialScore: number;
  consecutivePenalty: number;
  redundancyCost: number;
}

export interface PortfolioStructuralMetrics {
  avgSum: number;
  minSum: number;
  maxSum: number;
  pctSum160to240: number;
  pctBalancedParity: number; // 3P/3I, 2P/4I, 4P/2I
  parityCounts: Record<string, number>; // e.g. '3P/3I'
  avgDistinctQuadrants: number;
  pctThreeOrFourQuadrants: number;
  avgDistinctDecades: number;
  gamesWith3PlusConsecutive: number;
  gamesWith4PlusConsecutive: number;
  maxConsecutiveRunInPortfolio: number;
  avgMaxOverlapBetweenTickets: number;
  maxOverlapBetweenTickets: number;
}

export interface HybridPostOptimizerContext {
  games: number[][];
  betSize: number;
  maxNum: number;
  rng: SeededRng;
  weights: HybridScoringWeights;
}

/**
 * Interface extensível para segunda etapa opcional de pós-otimização global
 * (ex: busca local por trocas, simulated annealing, algoritmo genético).
 */
export type HybridPostOptimizerHook = (ctx: HybridPostOptimizerContext) => number[][];

export interface HybridCoverageOptions {
  portfolioSize?: number;
  betSize?: number;
  maxNum?: number;
  seed?: number | string;
  candidatesPerTicket?: number;
  weights?: Partial<HybridScoringWeights>;
  /** Ativa etapa 2 opcional de refinamento por busca local pós-construção gulosa */
  enablePostOptimization?: boolean;
  /** Quantidade máxima de iterações da busca local opcional */
  postOptimizationIterations?: number;
  /** Gancho customizado para algoritmo global de pós-otimização (SA/Genético/etc.) */
  customPostOptimizer?: HybridPostOptimizerHook;
  /** Subconjunto opcional de dezenas (padrão 01..60) */
  subPoolNumbers?: number[];
}

export interface HybridPortfolioResult {
  strategyId: 'hybrid_combinatorial';
  strategyName: 'Estratégia Híbrida';
  seed: number;
  generatedAt: number;
  ticketCount: number;
  betSize: number;
  maxNum: number;
  candidatesPerTicket: number;
  weightsUsed: HybridScoringWeights;
  postOptimizationApplied: boolean;
  games: number[][];
  coverage: PortfolioCoverageMetrics;
  structuralMetrics: PortfolioStructuralMetrics;
}

/**
 * Gerador pseudoaleatório determinístico (PRNG) baseado em Xorshift32
 * com mistura inicial SplitMix32/FNV-1a para evitar padrões degenerados em seeds pequenas.
 */
export class SeededRng {
  private state: number;
  public readonly initialSeed: number;

  constructor(seedInput: number | string) {
    const normalized = normalizeSeed(seedInput);
    this.initialSeed = normalized;
    // Aquecimento SplitMix32 para espalhar bits da seed inicial
    let z = (normalized + 0x9e3779b9) >>> 0;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
    this.state = (z ^ (z >>> 16)) >>> 0 || 0x6d2b79f5;
  }

  /** Retorna inteiro pseudoaleatório uint32 via xorshift32 */
  nextUint32(): number {
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x >>> 0;
    return this.state;
  }

  /** Retorna ponto flutuante determinístico no intervalo [0, 1) */
  next(): number {
    return this.nextUint32() / 4294967296;
  }

  /** Retorna inteiro determinístico no intervalo [min, max] inclusivo */
  nextInt(min: number, max: number): number {
    if (max <= min) return min;
    return min + Math.floor(this.next() * (max - min + 1));
  }
}

/**
 * Normaliza uma seed numérica ou string em um inteiro uint32 positivo e determinístico.
 */
export function normalizeSeed(seedInput: number | string): number {
  if (typeof seedInput === 'number' && Number.isFinite(seedInput)) {
    const intVal = Math.abs(Math.trunc(seedInput)) >>> 0;
    return intVal === 0 ? 1 : intVal;
  }
  const str = String(seedInput ?? 'mega-sorte-hybrid');
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash === 0 ? 1 : hash;
}

/**
 * Deriva uma seed determinística a partir de parâmetros estruturais (não depende exclusivamente de Date.now()).
 */
export function deriveDeterministicSeed(params: {
  contestNumber?: number;
  portfolioSize?: number;
  betSize?: number;
  salt?: number;
  entropyNonce?: number;
}): number {
  const parts = [
    params.contestNumber ?? 3070,
    params.portfolioSize ?? 78,
    params.betSize ?? 6,
    params.salt ?? 104729,
    params.entropyNonce ?? 0
  ];
  let h = 2166136261 >>> 0;
  for (const v of parts) {
    h ^= Math.trunc(v) >>> 0;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h === 0 ? 1337 : h;
}

/**
 * Gera uma seed explícita amigável (uint32 entre 100_000 e 999_999_999) usando crypto.getRandomValues
 * quando disponível ou mistura determinística sem depender exclusivamente de Date.now().
 */
export function createExplicitRandomSeed(counter: number = 1): number {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    const candidate = (buf[0] % 900000000) + 100000;
    return candidate;
  }
  return deriveDeterministicSeed({
    contestNumber: 3070,
    salt: 7919 + counter * 1013,
    entropyNonce: Math.floor(Math.random() * 1000000)
  });
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

/**
 * Calcula estatísticas estruturais de uma única aposta (soma, paridade, quadrantes reais, faixas, sequências).
 */
export function inspectTicketStructure(numbers: number[]): {
  sum: number;
  inGoldSumBand: boolean;
  evenCount: number;
  oddCount: number;
  isBalancedParity: boolean;
  quadrantCounts: [number, number, number, number];
  distinctQuadrants: number;
  maxInQuadrant: number;
  decadeCounts: [number, number, number, number, number, number];
  distinctDecades: number;
  maxInDecade: number;
  maxConsecutiveRun: number;
  consecutiveRunsOf2: number;
  consecutiveRunsOf3: number;
  consecutiveRunsOf4Plus: number;
} {
  const sorted = [...numbers].sort((a, b) => a - b);
  let sum = 0;
  let evenCount = 0;
  const quadrantCounts: [number, number, number, number] = [0, 0, 0, 0];
  const decadeCounts: [number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0];

  for (let i = 0; i < sorted.length; i++) {
    const n = sorted[i];
    sum += n;
    if (n % 2 === 0) evenCount++;
    const q = getQuadrant(n);
    if (q >= 0 && q <= 3) quadrantCounts[q]++;
    const dec = Math.min(5, Math.max(0, Math.floor((n - 1) / 10)));
    decadeCounts[dec]++;
  }

  const oddCount = sorted.length - evenCount;
  const isBalancedParity =
    (evenCount === 3 && oddCount === 3) ||
    (evenCount === 2 && oddCount === 4) ||
    (evenCount === 4 && oddCount === 2);

  let distinctQuadrants = 0;
  let maxInQuadrant = 0;
  for (let q = 0; q < 4; q++) {
    if (quadrantCounts[q] > 0) distinctQuadrants++;
    if (quadrantCounts[q] > maxInQuadrant) maxInQuadrant = quadrantCounts[q];
  }

  let distinctDecades = 0;
  let maxInDecade = 0;
  for (let d = 0; d < 6; d++) {
    if (decadeCounts[d] > 0) distinctDecades++;
    if (decadeCounts[d] > maxInDecade) maxInDecade = decadeCounts[d];
  }

  let maxConsecutiveRun = 1;
  let currentRun = 1;
  let consecutiveRunsOf2 = 0;
  let consecutiveRunsOf3 = 0;
  let consecutiveRunsOf4Plus = 0;

  const flushRun = (len: number) => {
    if (len > maxConsecutiveRun) maxConsecutiveRun = len;
    if (len === 2) consecutiveRunsOf2++;
    else if (len === 3) consecutiveRunsOf3++;
    else if (len >= 4) consecutiveRunsOf4Plus++;
  };

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) {
      currentRun++;
    } else {
      flushRun(currentRun);
      currentRun = 1;
    }
  }
  flushRun(currentRun);

  return {
    sum,
    inGoldSumBand: sum >= 160 && sum <= 240,
    evenCount,
    oddCount,
    isBalancedParity,
    quadrantCounts,
    distinctQuadrants,
    maxInQuadrant,
    decadeCounts,
    distinctDecades,
    maxInDecade,
    maxConsecutiveRun,
    consecutiveRunsOf2,
    consecutiveRunsOf3,
    consecutiveRunsOf4Plus
  };
}

/**
 * Calcula métricas estruturais agregadas de toda a carteira.
 */
export function analyzePortfolioStructuralMetrics(games: number[][]): PortfolioStructuralMetrics {
  if (games.length === 0) {
    return {
      avgSum: 0,
      minSum: 0,
      maxSum: 0,
      pctSum160to240: 0,
      pctBalancedParity: 0,
      parityCounts: {},
      avgDistinctQuadrants: 0,
      pctThreeOrFourQuadrants: 0,
      avgDistinctDecades: 0,
      gamesWith3PlusConsecutive: 0,
      gamesWith4PlusConsecutive: 0,
      maxConsecutiveRunInPortfolio: 0,
      avgMaxOverlapBetweenTickets: 0,
      maxOverlapBetweenTickets: 0
    };
  }

  let sumTotal = 0;
  let minSum = Infinity;
  let maxSum = -Infinity;
  let count160to240 = 0;
  let countBalancedParity = 0;
  const parityCounts: Record<string, number> = {};
  let totalQuadrants = 0;
  let count3Or4Quad = 0;
  let totalDecades = 0;
  let gamesWith3PlusConsecutive = 0;
  let gamesWith4PlusConsecutive = 0;
  let maxConsecutiveRunInPortfolio = 1;

  for (const g of games) {
    const st = inspectTicketStructure(g);
    sumTotal += st.sum;
    if (st.sum < minSum) minSum = st.sum;
    if (st.sum > maxSum) maxSum = st.sum;
    if (st.inGoldSumBand) count160to240++;
    if (st.isBalancedParity) countBalancedParity++;
    const pKey = `${st.evenCount}P/${st.oddCount}I`;
    parityCounts[pKey] = (parityCounts[pKey] || 0) + 1;
    totalQuadrants += st.distinctQuadrants;
    if (st.distinctQuadrants >= 3) count3Or4Quad++;
    totalDecades += st.distinctDecades;
    if (st.maxConsecutiveRun >= 3) gamesWith3PlusConsecutive++;
    if (st.maxConsecutiveRun >= 4) gamesWith4PlusConsecutive++;
    if (st.maxConsecutiveRun > maxConsecutiveRunInPortfolio) {
      maxConsecutiveRunInPortfolio = st.maxConsecutiveRun;
    }
  }

  let maxOverlapSum = 0;
  let maxOverlapGlobal = 0;
  if (games.length > 1) {
    const masks = games.map(encodeMask60);
    for (let i = 0; i < games.length; i++) {
      let bestForI = 0;
      for (let j = 0; j < games.length; j++) {
        if (i === j) continue;
        const inter =
          popcount32(masks[i][0] & masks[j][0]) +
          popcount32(masks[i][1] & masks[j][1]);
        if (inter > bestForI) bestForI = inter;
      }
      maxOverlapSum += bestForI;
      if (bestForI > maxOverlapGlobal) maxOverlapGlobal = bestForI;
    }
  }

  const n = games.length;
  return {
    avgSum: sumTotal / n,
    minSum,
    maxSum,
    pctSum160to240: (count160to240 / n) * 100,
    pctBalancedParity: (countBalancedParity / n) * 100,
    parityCounts,
    avgDistinctQuadrants: totalQuadrants / n,
    pctThreeOrFourQuadrants: (count3Or4Quad / n) * 100,
    avgDistinctDecades: totalDecades / n,
    gamesWith3PlusConsecutive,
    gamesWith4PlusConsecutive,
    maxConsecutiveRunInPortfolio,
    avgMaxOverlapBetweenTickets: maxOverlapSum / n,
    maxOverlapBetweenTickets: maxOverlapGlobal
  };
}

/**
 * Avalia um jogo candidato em relação ao estado atual da carteira utilizando os 8 fatores
 * configuráveis da Estratégia Híbrida. Retorna o score total e a decomposição por componente
 * para fins de auditoria, explicabilidade e testes automatizados.
 */
export function evaluateHybridCandidateScore(params: {
  candidate: number[];
  maxNum: number;
  pairCounts: Uint16Array;
  tripleCounts: Uint16Array;
  numFreq: Uint16Array;
  expectedFreqPerNumber: number;
  existingMasks: Array<[number, number]>;
  weights: HybridScoringWeights;
}): HybridScoreBreakdown {
  const {
    candidate,
    maxNum,
    pairCounts,
    tripleCounts,
    numFreq,
    expectedFreqPerNumber,
    existingMasks,
    weights
  } = params;

  const k = candidate.length;
  const stride1 = maxNum + 1;

  // 1. Cobertura de pares inéditos e penalização por repetição de pares
  let newPairsCount = 0;
  let pairCollisionRaw = 0;
  for (let i = 0; i < k; i++) {
    const a = candidate[i];
    for (let j = i + 1; j < k; j++) {
      const cnt = pairCounts[a * stride1 + candidate[j]];
      if (cnt === 0) newPairsCount++;
      else pairCollisionRaw += cnt * cnt;
    }
  }
  const pairReward = newPairsCount * weights.newPairWeight;
  const pairCollisionCost = pairCollisionRaw * weights.pairCollisionPenalty;

  // 2. Cobertura de trincas inéditas e penalização por repetição de trincas
  let newTriplesCount = 0;
  let tripleCollisionRaw = 0;
  if (k <= 9 && maxNum <= 60) {
    for (let i = 0; i < k; i++) {
      const a = candidate[i];
      for (let j = i + 1; j < k; j++) {
        const ab = (a * stride1 + candidate[j]) * stride1;
        for (let l = j + 1; l < k; l++) {
          const tCnt = tripleCounts[ab + candidate[l]];
          if (tCnt === 0) newTriplesCount++;
          else tripleCollisionRaw += tCnt * tCnt;
        }
      }
    }
  }
  const tripleReward = newTriplesCount * weights.newTripleWeight;
  const tripleCollisionCost = tripleCollisionRaw * weights.tripleCollisionPenalty;

  // 3. Equilíbrio suave de frequência das 60 dezenas (desvio quadrático da média esperada)
  let freqDeviationSum = 0;
  for (let i = 0; i < k; i++) {
    const projectedFreq = numFreq[candidate[i]] + 1;
    const diff = projectedFreq - expectedFreqPerNumber;
    // Penalidade assimétrica suave: exceder a média pesa um pouco mais que ficar abaixo
    freqDeviationSum += diff > 0 ? diff * diff * 1.15 : diff * diff * 0.85;
  }
  const frequencyBalanceCost = freqDeviationSum * weights.frequencyBalancePenalty;

  // Análise estrutural do candidato (itens 4, 5, 6 e 7)
  const st = inspectTicketStructure(candidate);

  // 4. Adequação da soma (160–240 como preferência estatística SUAVE, não eliminatória)
  let sumScore = 0;
  if (st.sum >= 160 && st.sum <= 240) {
    // Pico suave perto do centro histórico (~183–200)
    const distFromCenter = Math.abs(st.sum - 190);
    sumScore = weights.sumSoftBonus * (1 - (distFromCenter / 60) * 0.25);
  } else {
    const excess = st.sum < 160 ? 160 - st.sum : st.sum - 240;
    sumScore = -Math.min(weights.sumSoftBonus * 2.2, excess * weights.sumSoftSlopePenalty);
  }

  // 5. Equilíbrio de paridade (3P/3I > 2P/4I ou 4P/2I; extremos recebem penalidade suave)
  let parityScore = 0;
  if (st.evenCount === 3 && st.oddCount === 3) {
    parityScore = weights.parityBalanceBonus;
  } else if (st.isBalancedParity) {
    parityScore = weights.parityBalanceBonus * 0.72;
  } else if (st.evenCount === 1 || st.evenCount === 5) {
    parityScore = -weights.parityExtremePenalty;
  } else {
    parityScore = -weights.parityExtremePenalty * 1.8;
  }

  // 6. Dispersão espacial por quadrantes reais (6x10) e faixas de dezenas
  let spatialScore = 0;
  if (st.distinctQuadrants === 4) spatialScore += weights.quadrantDispersionBonus;
  else if (st.distinctQuadrants === 3) spatialScore += weights.quadrantDispersionBonus * 0.65;
  else if (st.distinctQuadrants <= 2) spatialScore -= weights.regionConcentrationPenalty;

  if (st.distinctDecades >= 5) spatialScore += weights.decadeDispersionBonus;
  else if (st.distinctDecades === 4) spatialScore += weights.decadeDispersionBonus * 0.6;
  else if (st.distinctDecades <= 2) spatialScore -= weights.regionConcentrationPenalty * 0.8;

  if (st.maxInQuadrant >= 4) spatialScore -= weights.regionConcentrationPenalty;
  if (st.maxInDecade >= 3) spatialScore -= weights.regionConcentrationPenalty * 0.7;

  // 7. Penalização progressiva por sequências consecutivas (não eliminatória)
  const consecutivePenalty =
    st.consecutiveRunsOf2 * weights.consecutiveLen2Penalty +
    st.consecutiveRunsOf3 * weights.consecutiveLen3Penalty +
    st.consecutiveRunsOf4Plus * weights.consecutiveLen4PlusPenalty;

  // 8. Penalização de redundância com jogos já presentes na carteira
  let redundancyCost = 0;
  if (existingMasks.length > 0 && maxNum <= 60) {
    const [cLo, cHi] = encodeMask60(candidate);
    let maxOverlap = 0;
    let highOverlapCount = 0;
    for (let i = 0; i < existingMasks.length; i++) {
      const m = existingMasks[i];
      const overlap = popcount32(cLo & m[0]) + popcount32(cHi & m[1]);
      if (overlap > maxOverlap) maxOverlap = overlap;
      if (overlap >= 4) highOverlapCount++;
    }
    if (maxOverlap >= 4) {
      redundancyCost = weights.redundancyOverlapPenalty * (maxOverlap - 2.5) + highOverlapCount * 4;
    } else if (maxOverlap === 3) {
      redundancyCost = weights.redundancyOverlapPenalty * 0.35;
    }
  }

  const totalScore =
    pairReward +
    tripleReward +
    sumScore +
    parityScore +
    spatialScore -
    pairCollisionCost -
    tripleCollisionCost -
    frequencyBalanceCost -
    consecutivePenalty -
    redundancyCost;

  return {
    totalScore,
    newPairsCount,
    pairReward,
    pairCollisionCost,
    newTriplesCount,
    tripleReward,
    tripleCollisionCost,
    frequencyBalanceCost,
    sumScore,
    parityScore,
    spatialScore,
    consecutivePenalty,
    redundancyCost
  };
}

/**
 * Pós-otimização opcional por busca local determinística (troca de 1 dezena entre jogos
 * ou mutação controlada de 1 dezena em bilhetes com baixa contribuição de pares/trincas).
 * Mantém zero duplicatas e estritamente 6 dezenas válidas entre 01 e 60.
 */
function runLocalSwapPostOptimization(ctx: HybridPostOptimizerContext, maxIterations: number): number[][] {
  const { games, betSize, maxNum, rng } = ctx;
  if (games.length < 2 || maxNum > 60) return games;

  const stride1 = maxNum + 1;
  const pairCounts = new Uint16Array(stride1 * stride1);
  const tripleCounts = new Uint16Array(stride1 * stride1 * stride1);
  const ticketKeys = new Set<string>();
  const working = games.map(g => [...g].sort((a, b) => a - b));

  const addTicketCounts = (g: number[], delta: 1 | -1) => {
    for (let i = 0; i < betSize; i++) {
      for (let j = i + 1; j < betSize; j++) {
        pairCounts[g[i] * stride1 + g[j]] += delta;
        if (betSize <= 9) {
          const ab = (g[i] * stride1 + g[j]) * stride1;
          for (let l = j + 1; l < betSize; l++) {
            tripleCounts[ab + g[l]] += delta;
          }
        }
      }
    }
  };

  let uniquePairsCount = 0;
  let uniqueTriplesCount = 0;
  for (const g of working) {
    ticketKeys.add(g.join('-'));
    addTicketCounts(g, 1);
  }
  for (let i = 0; i < pairCounts.length; i++) if (pairCounts[i] > 0) uniquePairsCount++;
  for (let i = 0; i < tripleCounts.length; i++) if (tripleCounts[i] > 0) uniqueTriplesCount++;

  const countUniqueContributions = (g: number[], arrPairs: Uint16Array, arrTriples: Uint16Array) => {
    let uniqueP = 0;
    let uniqueT = 0;
    for (let i = 0; i < betSize; i++) {
      for (let j = i + 1; j < betSize; j++) {
        if (arrPairs[g[i] * stride1 + g[j]] === 0) uniqueP++;
        if (betSize <= 9) {
          const ab = (g[i] * stride1 + g[j]) * stride1;
          for (let l = j + 1; l < betSize; l++) {
            if (arrTriples[ab + g[l]] === 0) uniqueT++;
          }
        }
      }
    }
    return uniqueP * 2 + uniqueT;
  };

  for (let iter = 0; iter < maxIterations; iter++) {
    const idx = rng.nextInt(0, working.length - 1);
    const oldTicket = working[idx];
    const oldKey = oldTicket.join('-');
    const replacePos = rng.nextInt(0, betSize - 1);
    const newNum = rng.nextInt(1, maxNum);
    if (oldTicket.includes(newNum)) continue;

    const candidate = [...oldTicket];
    candidate[replacePos] = newNum;
    candidate.sort((a, b) => a - b);
    const candKey = candidate.join('-');
    if (ticketKeys.has(candKey)) continue;

    addTicketCounts(oldTicket, -1);
    const oldContrib = countUniqueContributions(oldTicket, pairCounts, tripleCounts);
    const newContrib = countUniqueContributions(candidate, pairCounts, tripleCounts);

    if (newContrib > oldContrib) {
      ticketKeys.delete(oldKey);
      ticketKeys.add(candKey);
      working[idx] = candidate;
      addTicketCounts(candidate, 1);
    } else {
      addTicketCounts(oldTicket, 1);
    }
  }

  // Recontagem apenas informativa não alterando retorno
  void uniquePairsCount;
  void uniqueTriplesCount;
  return working;
}

/**
 * Gera uma carteira completa de apostas da Mega-Sena usando a
 * Estratégia Híbrida de Cobertura Combinatória.
 */
export function generateHybridCoveragePortfolio(
  options: HybridCoverageOptions = {}
): HybridPortfolioResult {
  const safeSize = Math.max(1, Math.min(500, Math.trunc(options.portfolioSize ?? 78)));
  const betSize = Math.max(6, Math.min(15, Math.trunc(options.betSize ?? 6)));
  const maxNum = Math.max(betSize, Math.min(60, Math.trunc(options.maxNum ?? 60)));
  const candidatesPerTicket = Math.max(20, Math.min(2000, Math.trunc(options.candidatesPerTicket ?? 320)));

  const resolvedSeed =
    options.seed !== undefined
      ? normalizeSeed(options.seed)
      : deriveDeterministicSeed({ portfolioSize: safeSize, betSize });

  const rng = new SeededRng(resolvedSeed);
  const weights: HybridScoringWeights = {
    ...DEFAULT_HYBRID_WEIGHTS,
    ...(options.weights || {})
  };

  const activePool =
    options.subPoolNumbers && options.subPoolNumbers.length >= betSize
      ? Array.from(new Set(options.subPoolNumbers.filter(n => Number.isInteger(n) && n >= 1 && n <= maxNum))).sort((a, b) => a - b)
      : Array.from({ length: maxNum }, (_, i) => i + 1);

  const stride1 = maxNum + 1;
  const pairCounts = new Uint16Array(stride1 * stride1);
  const tripleCounts = new Uint16Array(stride1 * stride1 * stride1);
  const numFreq = new Uint16Array(stride1);
  const usedTickets = new Set<string>();
  const existingMasks: Array<[number, number]> = [];
  const games: number[][] = [];

  const expectedFreqPerNumber = (safeSize * betSize) / activePool.length;
  const poolWithNoise = activePool.map(num => ({ num, key: 0 }));

  const drawUniformCandidate = (): number[] => {
    const copy = [...activePool];
    for (let i = 0; i < betSize; i++) {
      const j = rng.nextInt(i, copy.length - 1);
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy.slice(0, betSize).sort((a, b) => a - b);
  };

  const drawFrequencyGuidedCandidate = (noiseAmplitude: number): number[] => {
    for (let i = 0; i < poolWithNoise.length; i++) {
      const n = poolWithNoise[i].num;
      poolWithNoise[i].key = numFreq[n] + (rng.next() - 0.5) * noiseAmplitude;
    }
    poolWithNoise.sort((a, b) => a.key - b.key);
    const chosen: number[] = new Array(betSize);
    for (let i = 0; i < betSize; i++) {
      chosen[i] = poolWithNoise[i].num;
    }
    chosen.sort((a, b) => a - b);
    return chosen;
  };

  for (let g = 0; g < safeSize; g++) {
    let bestCandidate: number[] = [];
    let bestScore = -1e15;
    const progressiveExpectedFreq = ((g + 1) * betSize) / activePool.length;

    for (let c = 0; c < candidatesPerTicket; c++) {
      // 80% candidatos guiados por menor frequência atual + ruído determinístico; 20% exploração uniforme
      const candidate =
        c % 5 === 4
          ? drawUniformCandidate()
          : drawFrequencyGuidedCandidate(2.4);

      const key = candidate.join('-');
      if (usedTickets.has(key)) continue;

      const breakdown = evaluateHybridCandidateScore({
        candidate,
        maxNum,
        pairCounts,
        tripleCounts,
        numFreq,
        expectedFreqPerNumber: progressiveExpectedFreq,
        existingMasks,
        weights
      });

      if (breakdown.totalScore > bestScore) {
        bestScore = breakdown.totalScore;
        bestCandidate = candidate;
      }
    }

    if (bestCandidate.length !== betSize) {
      let guard = 0;
      while (guard < 400) {
        guard++;
        const fallback = drawUniformCandidate();
        const fKey = fallback.join('-');
        if (!usedTickets.has(fKey)) {
          bestCandidate = fallback;
          break;
        }
      }
      if (bestCandidate.length !== betSize) {
        bestCandidate = drawUniformCandidate();
      }
    }

    const finalKey = bestCandidate.join('-');
    usedTickets.add(finalKey);
    games.push(bestCandidate);
    if (maxNum <= 60) {
      existingMasks.push(encodeMask60(bestCandidate));
    }

    // Atualiza frequências, pares e trincas após cada seleção gulosa
    for (let i = 0; i < betSize; i++) {
      const a = bestCandidate[i];
      numFreq[a]++;
      for (let j = i + 1; j < betSize; j++) {
        const b = bestCandidate[j];
        pairCounts[a * stride1 + b]++;
        if (betSize <= 9 && maxNum <= 60) {
          const ab = (a * stride1 + b) * stride1;
          for (let l = j + 1; l < betSize; l++) {
            tripleCounts[ab + bestCandidate[l]]++;
          }
        }
      }
    }
  }

  let finalGames = games;
  let postOptimizationApplied = false;
  if (options.customPostOptimizer) {
    finalGames = options.customPostOptimizer({
      games,
      betSize,
      maxNum,
      rng,
      weights
    });
    postOptimizationApplied = true;
  } else if (options.enablePostOptimization) {
    const iters = Math.max(50, Math.min(2000, options.postOptimizationIterations ?? 240));
    finalGames = runLocalSwapPostOptimization(
      { games, betSize, maxNum, rng, weights },
      iters
    );
    postOptimizationApplied = true;
  }

  const coverage = analyzePortfolioCoverage(finalGames, maxNum);
  const structuralMetrics = analyzePortfolioStructuralMetrics(finalGames);

  return {
    strategyId: 'hybrid_combinatorial',
    strategyName: 'Estratégia Híbrida',
    seed: resolvedSeed,
    generatedAt: Date.now(),
    ticketCount: finalGames.length,
    betSize,
    maxNum,
    candidatesPerTicket,
    weightsUsed: weights,
    postOptimizationApplied,
    games: finalGames,
    coverage,
    structuralMetrics
  };
}

/**
 * Gera um único jogo utilizando os critérios estatísticos e espaciais suaves da Estratégia Híbrida.
 */
export function generateHybridSingleGame(options?: {
  betSize?: number;
  maxNum?: number;
  seed?: number | string;
  candidatesCount?: number;
}): { numbers: number[]; seed: number; breakdown: HybridScoreBreakdown } {
  const betSize = Math.max(6, Math.min(15, Math.trunc(options?.betSize ?? 6)));
  const maxNum = Math.max(betSize, Math.min(60, Math.trunc(options?.maxNum ?? 60)));
  const candidatesCount = Math.max(20, Math.min(500, Math.trunc(options?.candidatesCount ?? 120)));
  const seed = options?.seed !== undefined ? normalizeSeed(options.seed) : createExplicitRandomSeed();
  const rng = new SeededRng(seed);

  const stride1 = maxNum + 1;
  const emptyPairs = new Uint16Array(stride1 * stride1);
  const emptyTriples = new Uint16Array(stride1 * stride1 * stride1);
  const emptyFreq = new Uint16Array(stride1);

  const pool = Array.from({ length: maxNum }, (_, i) => i + 1);
  let bestNumbers: number[] = [];
  let bestBreakdown: HybridScoreBreakdown | null = null;

  for (let c = 0; c < candidatesCount; c++) {
    const copy = [...pool];
    for (let i = 0; i < betSize; i++) {
      const j = rng.nextInt(i, copy.length - 1);
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    const cand = copy.slice(0, betSize).sort((a, b) => a - b);
    const breakdown = evaluateHybridCandidateScore({
      candidate: cand,
      maxNum,
      pairCounts: emptyPairs,
      tripleCounts: emptyTriples,
      numFreq: emptyFreq,
      expectedFreqPerNumber: 1,
      existingMasks: [],
      weights: DEFAULT_HYBRID_WEIGHTS
    });
    if (!bestBreakdown || breakdown.totalScore > bestBreakdown.totalScore) {
      bestBreakdown = breakdown;
      bestNumbers = cand;
    }
  }

  return {
    numbers: bestNumbers,
    seed,
    breakdown: bestBreakdown!
  };
}
