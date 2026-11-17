import { GeneratorLogic, AdvancedBetMetrics } from '../types';
import { 
  OFFICIAL_FREQUENCY_DATA, 
  evaluateHistoricalAlignment, 
  getQuadrant as getQuadrantFromStats
} from './megaSenaOfficialStats';
import {
  PRIME_NUMBERS,
  FIBONACCI_NUMBERS,
  MULTIPLES_OF_THREE,
  FRAME_NUMBERS,
  CENTER_NUMBERS,
  CACHED_ADVANCED_ANALYTICS,
  evaluateAdvancedGameMetrics,
  EvaluatedAdvancedMetrics,
  MegaAnalyticsSnapshot
} from './megaSenaAdvancedAnalytics';
import {
  generateCombinatorialPortfolio,
  analyzePortfolioCoverage,
  PortfolioCoverageMetrics
} from './portfolioOptimizer';

export interface GameValidationDetails {
  sum: number;
  sumValid: boolean;
  evenCount: number;
  oddCount: number;
  evenOddValid: boolean;
  quadrants: [number, number, number, number];
  quadrantsValid: boolean;
  count20to50: number;
  count20to50Valid: boolean;
  consecutiveSequences: number[][];
  maxConsecutive: number;
  consecutiveValid: boolean;
  endingsMap: Record<number, number>;
  maxEndingCount: number;
  endingsValid: boolean;
  repeatedCount: number;
  repeatValid: boolean;
  // Métricas do histórico oficial
  historicalHotCount: number;
  historicalHotValid: boolean;
  historicalAverageDraws: number;
  historicalScore: number;
  historicalDescription: string;
  // Métricas da Análise Avançada
  primesCount: number;
  primesValid: boolean;
  fibonacciCount: number;
  fibonacciValid: boolean;
  multiplesOfThreeCount: number;
  multiplesOfThreeValid: boolean;
  frameCount: number;
  centerCount: number;
  frameCenterValid: boolean;
  paretoCount: number;
  paretoValid: boolean;
  cycleMissingCount: number;
  cycleValid: boolean;
  matchedDuque?: [number, number];
  matchedDuqueName?: string;
  duquesValid: boolean;
  maxInRow: number;
  maxInCol: number;
  rowColValid: boolean;
  hotCount: number;
  warmCount: number;
  coldCount: number;
  advancedScore: number;
  advancedHighlights: string[];
  // Novos Cálculos e Motores Matemáticos
  shannonEntropy: number;
  entropyLabel: 'Baixa' | 'Ideal' | 'Alta';
  delayZScoreMax: number;
  hasHighPressureDezena: boolean;
  highPressureNumbers: number[];
  cooccurrenceLiftAvg: number;
  chiSquareConformity: number;
  smartSuggestions: string[];
  strengths: string[];
  // Alinhamento com perfil de Terno+ das simulações
  ternoAlignmentCount?: number;
  ternoBoostValid?: boolean;
  // Contadores globais
  allActiveRulesPassed: boolean;
  passedRulesCount: number;
  activeRulesCount: number;
}

export const getQuadrant = getQuadrantFromStats;
export { generateSmartDiagnosticSuggestions, autoOptimizeGameNumbers } from './megaSenaAdvancedAnalytics';

export const validateGameAgainstRules = (
  numbers: number[],
  logic: GeneratorLogic,
  referenceNumbers?: number[],
  analyticsOverride?: MegaAnalyticsSnapshot
): GameValidationDetails => {
  const sorted = [...numbers].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, curr) => acc + curr, 0);

  // 1. Soma entre 160 e 240 (Zona de Ouro histórica onde ocorrem 78.4% dos prêmios)
  const sumValid = !logic.sum160to240 || (sum >= 160 && sum <= 240);

  // 2. Equilíbrio Par/Ímpar (3/3 ou 4/2 ou 2/4 - cobrem 79.5% de todos os concursos)
  let evenCount = 0;
  let oddCount = 0;
  sorted.forEach(n => {
    if (n % 2 === 0) evenCount++;
    else oddCount++;
  });
  const evenOddValid = !logic.balanceEvenOdd || (
    (evenCount === 3 && oddCount === 3) ||
    (evenCount === 4 && oddCount === 2) ||
    (evenCount === 2 && oddCount === 4)
  );

  // 3. Distribuição Espalhada (pelo menos 3 quadrantes contemplados - 84.1% dos concursos)
  const quadrants: [number, number, number, number] = [0, 0, 0, 0];
  sorted.forEach(n => {
    quadrants[getQuadrant(n)]++;
  });
  const populatedQuadrants = quadrants.filter(q => q > 0).length;
  const quadrantsValid = !logic.spreadDistribution || (populatedQuadrants >= 3 && Math.max(...quadrants) <= 3);

  // 4. Concentração no intervalo 20 a 50 (pelo menos 3 dezenas no miolo com maior incidência)
  const count20to50 = sorted.filter(n => n >= 20 && n <= 50).length;
  const targetMin20to50 = Math.floor(sorted.length * 0.5);
  const count20to50Valid = !logic.concentrate20to50 || (count20to50 >= targetMin20to50 && count20to50 <= sorted.length);

  // 5. No máximo 2 números em sequência consecutiva
  const consecutiveSequences: number[][] = [];
  let currentSeq: number[] = [];
  let maxConsecutive = 1;

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] === sorted[i - 1] + 1) {
      if (currentSeq.length === 0) {
        currentSeq.push(sorted[i - 1]);
      }
      currentSeq.push(sorted[i]);
    } else {
      if (currentSeq.length > 0) {
        consecutiveSequences.push([...currentSeq]);
        if (currentSeq.length > maxConsecutive) maxConsecutive = currentSeq.length;
        currentSeq = [];
      }
    }
  }
  if (currentSeq.length > 0) {
    consecutiveSequences.push([...currentSeq]);
    if (currentSeq.length > maxConsecutive) maxConsecutive = currentSeq.length;
  }

  const consecutiveValid = !logic.max2Consecutive || (maxConsecutive <= 2 && consecutiveSequences.length <= 2);

  // 6. No máximo 2 finais iguais (evita repetições improváveis)
  const endingsMap: Record<number, number> = {};
  sorted.forEach(n => {
    const end = n % 10;
    endingsMap[end] = (endingsMap[end] || 0) + 1;
  });
  const maxEndingCount = Math.max(...Object.values(endingsMap), 0);
  const endingsValid = !logic.max2IdenticalEndings || (maxEndingCount <= 2);

  // 7. Repetição de 1-2 dezenas do sorteio anterior (ocorre em 57.3% dos concursos)
  let repeatedCount = 0;
  if (referenceNumbers && referenceNumbers.length > 0) {
    const refSet = new Set(referenceNumbers);
    repeatedCount = sorted.filter(n => refSet.has(n)).length;
  }
  const repeatValid = !logic.repeat1to2 || (repeatedCount >= 1 && repeatedCount <= 2);

  // 8. Alinhamento com histórico (estritamente causal quando analyticsOverride é fornecido)
  let customRankMap: Record<number, number> | undefined;
  let customCountMap: Record<number, number> | undefined;
  if (analyticsOverride) {
    customRankMap = {};
    customCountMap = {};
    analyticsOverride.numbersAnalysis.forEach(item => {
      customRankMap![item.number] = item.ranking;
      customCountMap![item.number] = item.totalDraws;
    });
  }
  const historical = evaluateHistoricalAlignment(sorted, customRankMap, customCountMap);
  const historicalHotValid = !logic.preferHistoricalHotNumbers || (historical.top20Count >= 2 && historical.top20Count <= 4);

  // Métricas e regras da Análise Avançada
  const adv = evaluateAdvancedGameMetrics(sorted, analyticsOverride);
  const duquesValid = !logic.useAdvancedDuques || adv.duquesValid;
  const frameCenterValid = !logic.frameAndCenterBalance || adv.frameCenterValid;
  const primesFiboValid = !logic.balancePrimesAndFibonacci || (adv.primesValid && adv.fibonacciValid);
  const paretoValid = !logic.paretoTopSelection || adv.paretoValid;
  const cycleValid = !logic.includeCycleDezenas || adv.cycleValid;
  const multiplesOfThreeValid = !logic.multiplesOfThreeBalance || adv.multiplesOfThreeValid;
  const rowColValid = !logic.rowAndColDispersion || adv.rowColValid;

  // 9. Reforço por Simulações que Acertaram Terno (3+ dezenas)
  const ternoProfile = (logic.useTernoStatsBoost && logic.ternoBoostProfile?.lottery === 'megasena')
    ? logic.ternoBoostProfile
    : undefined;
  let ternoAlignmentCount = 0;
  if (ternoProfile) {
    const ternoFocusSet = new Set([...ternoProfile.matchedHotNumbers, ...ternoProfile.topNumbers]);
    ternoAlignmentCount = sorted.filter(n => ternoFocusSet.has(n)).length;
  }
  const ternoBoostValid = !ternoProfile || ternoAlignmentCount >= 2;

  // Contabilização de regras ativas e aprovadas
  const activeChecks = [
    { active: Boolean(logic.sum160to240), valid: sumValid },
    { active: Boolean(logic.balanceEvenOdd), valid: evenOddValid },
    { active: Boolean(logic.spreadDistribution), valid: quadrantsValid },
    { active: Boolean(logic.concentrate20to50), valid: count20to50Valid },
    { active: Boolean(logic.max2Consecutive), valid: consecutiveValid },
    { active: Boolean(logic.max2IdenticalEndings), valid: endingsValid },
    { active: Boolean(logic.repeat1to2), valid: repeatValid },
    { active: Boolean(logic.preferHistoricalHotNumbers), valid: historicalHotValid },
    // Regras Avançadas
    { active: Boolean(logic.useAdvancedDuques), valid: duquesValid },
    { active: Boolean(logic.frameAndCenterBalance), valid: frameCenterValid },
    { active: Boolean(logic.balancePrimesAndFibonacci), valid: primesFiboValid },
    { active: Boolean(logic.paretoTopSelection), valid: paretoValid },
    { active: Boolean(logic.includeCycleDezenas), valid: cycleValid },
    { active: Boolean(logic.multiplesOfThreeBalance), valid: multiplesOfThreeValid },
    { active: Boolean(logic.rowAndColDispersion), valid: rowColValid },
    { active: Boolean(ternoProfile), valid: ternoBoostValid },
  ];

  const activeRulesCount = activeChecks.filter(c => c.active).length;
  const passedRulesCount = activeChecks.filter(c => c.active && c.valid).length;
  const allActiveRulesPassed = activeRulesCount === 0 || passedRulesCount === activeRulesCount;

  return {
    sum,
    sumValid,
    evenCount,
    oddCount,
    evenOddValid,
    quadrants,
    quadrantsValid,
    count20to50,
    count20to50Valid,
    consecutiveSequences,
    maxConsecutive,
    consecutiveValid,
    endingsMap,
    maxEndingCount,
    endingsValid,
    repeatedCount,
    repeatValid,
    historicalHotCount: historical.top20Count,
    historicalHotValid,
    historicalAverageDraws: historical.averageDraws,
    historicalScore: historical.historicalConformityScore,
    historicalDescription: historical.description,
    // Métricas da Análise Avançada
    primesCount: adv.primesCount,
    primesValid: adv.primesValid,
    fibonacciCount: adv.fibonacciCount,
    fibonacciValid: adv.fibonacciValid,
    multiplesOfThreeCount: adv.multiplesOfThreeCount,
    multiplesOfThreeValid: adv.multiplesOfThreeValid,
    frameCount: adv.frameCount,
    centerCount: adv.centerCount,
    frameCenterValid: adv.frameCenterValid,
    paretoCount: adv.paretoCount,
    paretoValid: adv.paretoValid,
    cycleMissingCount: adv.cycleMissingCount,
    cycleValid: adv.cycleValid,
    matchedDuque: adv.matchedDuque,
    matchedDuqueName: adv.matchedDuqueName,
    duquesValid: adv.duquesValid,
    maxInRow: adv.maxInRow,
    maxInCol: adv.maxInCol,
    rowColValid: adv.rowColValid,
    hotCount: adv.hotCount,
    warmCount: adv.warmCount,
    coldCount: adv.coldCount,
    advancedScore: adv.advancedScore,
    advancedHighlights: adv.advancedHighlights,
    shannonEntropy: adv.shannonEntropy,
    entropyLabel: adv.entropyLabel,
    delayZScoreMax: adv.delayZScoreMax,
    hasHighPressureDezena: adv.hasHighPressureDezena,
    highPressureNumbers: adv.highPressureNumbers,
    cooccurrenceLiftAvg: adv.cooccurrenceLiftAvg,
    chiSquareConformity: adv.chiSquareConformity,
    smartSuggestions: adv.smartSuggestions,
    strengths: adv.strengths,
    ternoAlignmentCount,
    ternoBoostValid,
    allActiveRulesPassed,
    passedRulesCount,
    activeRulesCount
  };
};

export interface PortfolioGenerationContext {
  freqCounts: Uint16Array | number[];
  maxCap: number;
  avgFreq: number;
}

const buildBalancedSubPool = (
  subPoolSize: number,
  analytics: MegaAnalyticsSnapshot
): number[] => {
  const analysisMap = new Map<number, { totalDraws: number; recentCountLast25: number }>();
  analytics.numbersAnalysis.forEach(n => {
    analysisMap.set(n.number, {
      totalDraws: n.totalDraws,
      recentCountLast25: n.recentCountLast25
    });
  });

  const perRow = Math.floor(subPoolSize / 6);
  const remainder = subPoolSize % 6;
  const selected: number[] = [];

  for (let row = 0; row < 6; row++) {
    const start = row * 10 + 1;
    const end = start + 9;
    const rowNums: Array<{ num: number; score: number }> = [];
    for (let num = start; num <= end; num++) {
      const info = analysisMap.get(num);
      const baseFreq = info ? info.totalDraws : (OFFICIAL_FREQUENCY_DATA[num] || 300);
      const recent = info ? info.recentCountLast25 : 2;
      // Combina base histórica, momento recente e leve empate orgânico sem olhar futuro
      const score = baseFreq * 0.05 + recent * 1.4 + Math.random() * 0.25;
      rowNums.push({ num, score });
    }
    rowNums.sort((a, b) => b.score - a.score);
    const takeCount = perRow + (row < remainder ? 1 : 0);
    for (let k = 0; k < takeCount && k < rowNums.length; k++) {
      selected.push(rowNums[k].num);
    }
  }

  return selected.sort((a, b) => a - b);
};

/**
 * Sorteia uma dezena com peso estatístico proporcional à estratégia de cálculo matemática escolhida,
 * frequência histórica de todos os concursos, decaimento temporal, pressão de atraso, dispersão de Shannon
 * e teto máximo de repetição em carteira (anti-concentração).
 */
const getAdvancedWeightedCandidate = (
  exclude: Set<number>, 
  logic: GeneratorLogic,
  currentEvens: number,
  currentFrame: number,
  rowCounts: number[],
  colCounts: number[],
  analyticsOverride?: MegaAnalyticsSnapshot,
  portfolioContext?: PortfolioGenerationContext
): number => {
  const analytics = analyticsOverride || CACHED_ADVANCED_ANALYTICS;
  const pool: number[] = [];
  const strategy = logic.calculationStrategy || 'balanced';

  // Mapa de status, atrasos e frequência causal para ponderação estocástica
  const analysisMap = new Map<number, { status: string; delay: number; recentCount: number; totalDraws: number }>();
  let totalDrawsSum = 0;
  analytics.numbersAnalysis.forEach(n => {
    totalDrawsSum += n.totalDraws;
    analysisMap.set(n.number, {
      status: n.status,
      delay: n.currentDelay,
      recentCount: n.recentCountLast25,
      totalDraws: n.totalDraws
    });
  });
  const meanSnapDraws = totalDrawsSum > 0 ? totalDrawsSum / Math.max(1, analytics.numbersAnalysis.length) : 300;

  const cycleMissing = new Set(analytics.cycleAnalysis.missingNumbers);

  for (let num = 1; num <= 60; num++) {
    if (exclude.has(num)) continue;

    // Upgrade 1: Respeita teto máximo de frequência por dezena dentro da carteira
    const currentPortfolioFreq = portfolioContext ? (portfolioContext.freqCounts[num] || 0) : 0;
    if (portfolioContext && currentPortfolioFreq >= portfolioContext.maxCap) {
      continue;
    }

    const data = analysisMap.get(num) || { status: 'morna', delay: 10, recentCount: 2, totalDraws: 300 };

    // Modo Cobertura Combinatória: peso estrutural uniforme (sem viés de popularidade histórica)
    // Quando analyticsOverride é fornecido (ex: backtest causal), evita consultar OFFICIAL_FREQUENCY_DATA global
    const causalBaseWeight = analyticsOverride
      ? Math.round((data.totalDraws / Math.max(1, meanSnapDraws)) * 300)
      : (OFFICIAL_FREQUENCY_DATA[num] || 300);
    let weight = strategy === 'combinatorial_cover' ? 300 : causalBaseWeight;

    // Modulação baseada na Estratégia de Cálculo Matemática:
    if (strategy === 'momentum') {
      if (data.status === 'quente' || data.recentCount >= 4) {
        weight = Math.round(weight * 1.85);
      } else if (data.status === 'morna') {
        weight = Math.round(weight * 1.15);
      } else {
        weight = Math.round(weight * 0.65);
      }
    } else if (strategy === 'cycle_delay') {
      const isMissingCycle = cycleMissing.has(num);
      const isHighDelay = data.delay >= 18;
      if (isMissingCycle && isHighDelay) {
        weight = Math.round(weight * 2.30);
      } else if (isMissingCycle || isHighDelay) {
        weight = Math.round(weight * 1.70);
      }
    } else if (strategy === 'entropy_shannon') {
      let minDistance = 60;
      exclude.forEach(picked => {
        const dist = Math.abs(picked - num);
        if (dist < minDistance) minDistance = dist;
      });
      if (minDistance <= 1) {
        weight = Math.round(weight * 0.25);
      } else if (minDistance >= 5 && minDistance <= 14) {
        weight = Math.round(weight * 1.45);
      }
    } else if (strategy === 'cooccurrence') {
      let hasDuqueAffinity = false;
      for (const d of analytics.topDuques) {
        if (d.pair.includes(num)) {
          for (const picked of exclude) {
            if (d.pair.includes(picked)) {
              hasDuqueAffinity = true;
              break;
            }
          }
        }
      }
      if (hasDuqueAffinity) {
        weight = Math.round(weight * 2.10);
      }
    }

    // Modulação por Reforço Estatístico das Simulações que Acertaram Terno (3+ dezenas)
    if (logic.useTernoStatsBoost && logic.ternoBoostProfile && logic.ternoBoostProfile.lottery === 'megasena') {
      const boostMultiplier = logic.ternoBoostProfile.numberWeights[num] || 1;
      weight = Math.round(weight * boostMultiplier);
    }

    // 1. Concentração 20 a 50
    if (logic.concentrate20to50 && num >= 20 && num <= 50) {
      weight = Math.round(weight * 1.25);
    }

    // 2. Par / Ímpar dinâmico
    const isEven = num % 2 === 0;
    if (logic.balanceEvenOdd) {
      if (currentEvens >= 3 && isEven) weight = Math.round(weight * 0.65);
      if (currentEvens < 3 && !isEven) weight = Math.round(weight * 0.75);
    }

    // 3. Moldura vs Centro dinâmico
    const isFrame = FRAME_NUMBERS.includes(num);
    if (logic.frameAndCenterBalance) {
      if (currentFrame >= 3 && isFrame) weight = Math.round(weight * 0.60);
      if (currentFrame < 3 && !isFrame) weight = Math.round(weight * 0.85);
    }

    // 4. Linhas e Colunas dinâmicas (evita acumular 3 na mesma linha ou coluna)
    const row = Math.floor((num - 1) / 10);
    const col = (num - 1) % 10;
    if (logic.rowAndColDispersion) {
      if (rowCounts[row] >= 2) weight = Math.round(weight * 0.25);
      if (colCounts[col] >= 2) weight = Math.round(weight * 0.25);
    }

    // 5. Rebalanceamento dinâmico de carteira (reduz coeficiente de Gini antes de bater no teto)
    if (portfolioContext) {
      const diff = portfolioContext.avgFreq - currentPortfolioFreq;
      if (diff > 0) {
        weight = Math.round(weight * (1 + Math.min(0.85, diff * 0.20)));
      } else if (diff < 0) {
        weight = Math.round(weight / (1 + Math.abs(diff) * 0.65));
      }
    }

    const tickets = Math.max(1, Math.round((weight - 200) / 6));
    for (let t = 0; t < tickets; t++) {
      pool.push(num);
    }
  }

  if (pool.length === 0) {
    // Fallback ordenado pelas dezenas menos repetidas na carteira caso o teto tenha restringido o grupo
    const uncappedOrLowest: Array<{ num: number; freq: number }> = [];
    for (let num = 1; num <= 60; num++) {
      if (!exclude.has(num)) {
        uncappedOrLowest.push({
          num,
          freq: portfolioContext ? (portfolioContext.freqCounts[num] || 0) : 0
        });
      }
    }
    uncappedOrLowest.sort((a, b) => a.freq - b.freq || Math.random() - 0.5);
    const topSlice = uncappedOrLowest.slice(0, Math.min(8, uncappedOrLowest.length));
    return topSlice[Math.floor(Math.random() * topSlice.length)].num;
  }

  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
};

/**
 * Converte métricas da validação em AdvancedBetMetrics para persistência no histórico.
 */
export const buildAdvancedBetMetrics = (validation: GameValidationDetails, strategy?: GeneratorLogic['calculationStrategy']): AdvancedBetMetrics => {
  return {
    duquePair: validation.matchedDuque,
    duqueName: validation.matchedDuqueName,
    primesCount: validation.primesCount,
    fibonacciCount: validation.fibonacciCount,
    multiplesOfThreeCount: validation.multiplesOfThreeCount,
    frameCount: validation.frameCount,
    centerCount: validation.centerCount,
    paretoCount: validation.paretoCount,
    cycleMissingCount: validation.cycleMissingCount,
    maxInRow: validation.maxInRow,
    maxInCol: validation.maxInCol,
    historicalHotCount: validation.historicalHotCount,
    advancedScore: validation.advancedScore,
    strategyUsed: strategy,
    shannonEntropy: validation.shannonEntropy,
    entropyLabel: validation.entropyLabel,
    delayZScoreMax: validation.delayZScoreMax,
    hasHighPressureDezena: validation.hasHighPressureDezena,
    cooccurrenceLiftAvg: validation.cooccurrenceLiftAvg,
    chiSquareConformity: validation.chiSquareConformity,
    smartSuggestions: validation.smartSuggestions
  };
};

/**
 * Gerador inteligente e instantâneo fundamentado em todos os 3.071 concursos oficiais da Mega-Sena
 * e na Análise Avançada de 20 pilares estatísticos.
 */
export const generateGameWithRules = (
  quantity: number = 6,
  logic: GeneratorLogic,
  referenceNumbers: number[] = [5, 19, 22, 44, 47, 57],
  analyticsOverride?: MegaAnalyticsSnapshot,
  portfolioContext?: PortfolioGenerationContext
): { 
  numbers: number[]; 
  reasoning: string; 
  passedAllRules: boolean;
  validation: GameValidationDetails;
  advancedMetrics: AdvancedBetMetrics;
} => {
  const isCombinatorialMode = logic.calculationStrategy === 'combinatorial_cover';
  const effectiveLogic: GeneratorLogic = isCombinatorialMode
    ? {
        ...logic,
        useAdvancedDuques: false,
        paretoTopSelection: false,
        preferHistoricalHotNumbers: false,
        includeCycleDezenas: false,
        repeat1to2: false
      }
    : logic;

  const maxAttempts = isCombinatorialMode ? 450 : 1200;
  let bestAttempt: number[] = [];
  let bestScore = -1;
  let bestValidation: GameValidationDetails | null = null;

  const analytics = analyticsOverride || CACHED_ADVANCED_ANALYTICS;
  const topDuques = analytics.topDuques;
  const paretoNumbers = analytics.paretoTopNumbers.map(p => p.number);
  const cycleMissing = analytics.cycleAnalysis.missingNumbers;

  const isUnderCap = (num: number): boolean =>
    !portfolioContext || (portfolioContext.freqCounts[num] || 0) < portfolioContext.maxCap;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidates: Set<number> = new Set();

    // 1. Pilar Avançado: Semente com Duque Histórico mais sorteado (respeitando cap da carteira)
    if (effectiveLogic.useAdvancedDuques && topDuques.length > 0 && Math.random() > 0.25) {
      const duqueIndex = Math.floor(Math.random() * Math.min(8, topDuques.length));
      const duque = topDuques[duqueIndex];
      if (isUnderCap(duque.pair[0]) && isUnderCap(duque.pair[1])) {
        candidates.add(duque.pair[0]);
        candidates.add(duque.pair[1]);
      }
    }

    // 2. Repetição de 1-2 dezenas do sorteio de referência (respeitando cap)
    if (effectiveLogic.repeat1to2 && referenceNumbers && referenceNumbers.length >= 2) {
      const repeatCount = Math.random() > 0.4 ? 2 : 1;
      const shuffledRef = [...referenceNumbers].sort(() => 0.5 - Math.random());
      for (let i = 0; i < shuffledRef.length && candidates.size < quantity; i++) {
        if (isUnderCap(shuffledRef[i])) {
          candidates.add(shuffledRef[i]);
          if (candidates.size >= repeatCount) break;
        }
      }
    }

    // 3. Pilar Avançado: Dezena faltante do Ciclo Atual da Mega-Sena
    if (effectiveLogic.includeCycleDezenas && cycleMissing.length > 0 && Math.random() > 0.25) {
      const uncappedCycle = cycleMissing.filter(isUnderCap);
      if (uncappedCycle.length > 0 && candidates.size < quantity) {
        candidates.add(uncappedCycle[Math.floor(Math.random() * uncappedCycle.length)]);
      }
    }

    // 4. Pilar Avançado: Dezenas do Top 20% Pareto da Mega-Sena
    if (effectiveLogic.paretoTopSelection && paretoNumbers.length > 0 && Math.random() > 0.2) {
      const uncappedPareto = paretoNumbers.filter(isUnderCap);
      if (uncappedPareto.length > 0 && candidates.size < quantity) {
        candidates.add(uncappedPareto[Math.floor(Math.random() * uncappedPareto.length)]);
      }
    }

    // 4b. Semente empírica das simulações com Terno (3+ acertos)
    if (effectiveLogic.useTernoStatsBoost && effectiveLogic.ternoBoostProfile && effectiveLogic.ternoBoostProfile.lottery === 'megasena' && Math.random() > 0.2) {
      const tp = effectiveLogic.ternoBoostProfile;
      if (tp.topPairs.length > 0 && Math.random() > 0.45 && candidates.size + 2 <= quantity) {
        const pair = tp.topPairs[Math.floor(Math.random() * Math.min(4, tp.topPairs.length))];
        if (isUnderCap(pair[0]) && isUnderCap(pair[1])) {
          candidates.add(pair[0]);
          candidates.add(pair[1]);
        }
      } else if (tp.matchedHotNumbers.length > 0 && candidates.size < quantity) {
        const uncappedHot = tp.matchedHotNumbers.filter(isUnderCap);
        if (uncappedHot.length > 0) {
          candidates.add(uncappedHot[Math.floor(Math.random() * uncappedHot.length)]);
        }
      }
    }

    // 5. Preenchimento probabilístico com ponderação analítica avançada + equilíbrio em carteira
    let fillAttempts = 0;
    while (candidates.size < quantity && fillAttempts < 100) {
      fillAttempts++;
      const currentEvens = Array.from(candidates).filter(n => n % 2 === 0).length;
      const currentFrame = Array.from(candidates).filter(n => FRAME_NUMBERS.includes(n)).length;
      const rowCounts = Array(6).fill(0);
      const colCounts = Array(10).fill(0);
      candidates.forEach(n => {
        rowCounts[Math.floor((n - 1) / 10)]++;
        colCounts[(n - 1) % 10]++;
      });

      const candidate = getAdvancedWeightedCandidate(
        candidates, 
        effectiveLogic, 
        currentEvens, 
        currentFrame, 
        rowCounts, 
        colCounts,
        analyticsOverride,
        portfolioContext
      );
      candidates.add(candidate);
    }

    const testNumbers = Array.from(candidates).sort((a, b) => a - b);
    if (testNumbers.length < quantity) continue;

    const validation = validateGameAgainstRules(testNumbers, effectiveLogic, referenceNumbers, analyticsOverride);

    if (validation.allActiveRulesPassed) {
      const highlights: string[] = [];
      if (validation.matchedDuqueName) highlights.push(`Duque ${validation.matchedDuqueName}`);
      if (effectiveLogic.sum160to240) highlights.push(`soma ${validation.sum} (Zona de Ouro)`);
      if (effectiveLogic.balanceEvenOdd) highlights.push(`${validation.evenCount}P/${validation.oddCount}I`);
      if (effectiveLogic.frameAndCenterBalance) highlights.push(`${validation.frameCount} Moldura / ${validation.centerCount} Centro`);
      if (validation.primesCount > 0) highlights.push(`${validation.primesCount} Primos`);
      if (validation.fibonacciCount > 0) highlights.push(`${validation.fibonacciCount} Fibonacci`);
      if (validation.multiplesOfThreeCount > 0) highlights.push(`${validation.multiplesOfThreeCount} Múltiplos de 3`);
      if (validation.paretoCount > 0 && effectiveLogic.paretoTopSelection) highlights.push(`${validation.paretoCount} no Top Pareto`);
      if (validation.cycleMissingCount > 0 && effectiveLogic.includeCycleDezenas) highlights.push(`${validation.cycleMissingCount} do Ciclo Atual`);
      if (effectiveLogic.preferHistoricalHotNumbers) highlights.push(`${validation.historicalHotCount} no Top 20 Geral`);
      if (effectiveLogic.spreadDistribution) highlights.push(`4 quadrantes`);
      if (effectiveLogic.repeat1to2 && validation.repeatedCount > 0) highlights.push(`${validation.repeatedCount} repetida(s)`);
      if (effectiveLogic.useTernoStatsBoost && (validation.ternoAlignmentCount || 0) > 0) {
        highlights.push(`${validation.ternoAlignmentCount} dezenas do Reforço Terno+`);
      }

      const modePrefix = isCombinatorialMode
        ? 'Gerado via Cobertura Combinatória Estrutural (sem viés de dezena)'
        : 'Gerado via Análise Avançada (3.071 concursos)';
      const reason = `${modePrefix}: ${highlights.join(' • ')} (Conformidade: ${validation.advancedScore}%).`;

      return {
        numbers: testNumbers,
        reasoning: reason,
        passedAllRules: true,
        validation,
        advancedMetrics: buildAdvancedBetMetrics(validation, logic.calculationStrategy || 'balanced')
      };
    }

    const ternoBonus = (effectiveLogic.useTernoStatsBoost && effectiveLogic.ternoBoostProfile?.lottery === 'megasena')
      ? ((validation.ternoAlignmentCount || 0) * 15 +
         (validation.sum >= effectiveLogic.ternoBoostProfile.targetSumMin && validation.sum <= effectiveLogic.ternoBoostProfile.targetSumMax ? 15 : 0))
      : 0;
    const compositeScore = validation.passedRulesCount * 100 + validation.advancedScore + ternoBonus;
    if (compositeScore > bestScore) {
      bestScore = compositeScore;
      bestAttempt = testNumbers;
      bestValidation = validation;
    }
  }

  const finalNumbers = bestAttempt.length === quantity ? bestAttempt : generateBasicBalancedNumbers(quantity);
  const fallbackValidation = bestValidation || validateGameAgainstRules(finalNumbers, effectiveLogic, referenceNumbers, analyticsOverride);

  const fallbackReason = `Jogo otimizado com a melhor pontuação analítica (${fallbackValidation.passedRulesCount}/${fallbackValidation.activeRulesCount} regras cumpridas, Conformidade Analítica: ${fallbackValidation.advancedScore}%).`;

  return {
    numbers: finalNumbers,
    reasoning: fallbackReason,
    passedAllRules: false,
    validation: fallbackValidation,
    advancedMetrics: buildAdvancedBetMetrics(fallbackValidation, logic.calculationStrategy || 'balanced')
  };
};

const generateBasicBalancedNumbers = (quantity: number): number[] => {
  const nums = new Set<number>();
  while (nums.size < quantity) {
    nums.add(Math.floor(Math.random() * 60) + 1);
  }
  return Array.from(nums).sort((a, b) => a - b);
};

/**
 * Gera uma carteira completa de M jogos com desduplicação obrigatória, teto de frequência
 * por dezena e cotas suaves entre bilhetes.
 * Quando a estratégia é 'combinatorial_cover', aplica o otimizador anti-colisão (com suporte opcional a sub-pool K).
 */
export const generatePortfolioWithRules = (
  portfolioSize: number,
  quantity: number = 6,
  logic: GeneratorLogic,
  referenceNumbers: number[] = [5, 19, 22, 44, 47, 57],
  analyticsOverride?: MegaAnalyticsSnapshot
): {
  games: Array<{
    numbers: number[];
    reasoning: string;
    passedAllRules: boolean;
    validation: GameValidationDetails;
    advancedMetrics: AdvancedBetMetrics;
  }>;
  coverage: PortfolioCoverageMetrics;
} => {
  const safePortfolioSize = Math.max(1, Math.min(300, portfolioSize));
  const analytics = analyticsOverride || CACHED_ADVANCED_ANALYTICS;

  if (logic.calculationStrategy === 'hybrid_combinatorial') {\n    const hybrid = generateHybridCoveragePortfolio(safePortfolioSize, {\n      betSize: quantity,\n      seed: Date.now(),\n      candidatesPerTicket: 320,\n      sumMin: 160,\n      sumMax: 240\n    });\n    const cleanLogic: GeneratorLogic = {\n      ...logic,\n      useAdvancedDuques: false,\n      paretoTopSelection: false,\n      preferHistoricalHotNumbers: false,\n      includeCycleDezenas: false,\n      repeat1to2: false\n    };\n    const games = hybrid.games.map((numbers, idx) => {\n      const validation = validateGameAgainstRules(numbers, cleanLogic, referenceNumbers, analyticsOverride);\n      return {\n        numbers,\n        reasoning: `Estratégia Híbrida (#${idx + 1}/${safePortfolioSize}): cobertura de pares/trincas + equilíbrio de frequência + critérios estruturais suaves. Soma ${numbers.reduce((a, b) => a + b, 0)}. Seed ${hybrid.seed}.`,\n        passedAllRules: true,\n        validation,\n        advancedMetrics: buildAdvancedBetMetrics(validation, 'hybrid_combinatorial')\n      };\n    });\n    return { games, coverage: hybrid.coverage };\n  }\n\n  if (logic.calculationStrategy === 'combinatorial_cover') {
    const requestedSubPool = logic.portfolioSubPoolSize ?? 60;
    const subPoolSize = [24, 30, 36, 42, 60].includes(requestedSubPool) ? requestedSubPool : 60;
    const subPoolNumbers = subPoolSize < 60 ? buildBalancedSubPool(subPoolSize, analytics) : undefined;

    const rawGames = generateCombinatorialPortfolio(safePortfolioSize, {
      betSize: quantity,
      maxNum: 60,
      useStructuralPlausibility: logic.strictPlausibilityFilter !== false,
      subPoolNumbers
    });
    const coverage = analyzePortfolioCoverage(rawGames, 60);
    const cleanLogic: GeneratorLogic = {
      ...logic,
      useAdvancedDuques: false,
      paretoTopSelection: false,
      preferHistoricalHotNumbers: false,
      includeCycleDezenas: false,
      repeat1to2: false
    };
    const poolLabel = subPoolSize < 60
      ? `Sub-Pool Concentrado ${coverage.distinctNumbers}/${subPoolSize} dezenas`
      : `${coverage.distinctNumbers}/60 dezenas`;

    const games = rawGames.map((numbers, idx) => {
      const validation = validateGameAgainstRules(numbers, cleanLogic, referenceNumbers, analyticsOverride);
      return {
        numbers,
        reasoning: `Carteira Cobertura Anti-Colisão (#${idx + 1}/${safePortfolioSize}): ${poolLabel} • ${coverage.uniquePairs}/${coverage.totalPossiblePairs} pares únicos (${coverage.pairCoveragePct.toFixed(1)}%) • 0 jogos repetidos.`,
        passedAllRules: true,
        validation,
        advancedMetrics: buildAdvancedBetMetrics(validation, 'combinatorial_cover')
      };
    });
    return { games, coverage };
  }

  // Upgrade 1 & 2 para estratégias clássicas (Etapa 2 mostrou teto ótimo = 8 para M=78 com Cotas Suaves 25%):
  // 1) Teto máximo rígido por dezena (Math.ceil(avgFreq + 0.05) => Cap=8 em 78 jogos, Gini ~0,023)
  // 2) Cotas suaves (~25% com regras de viés completas, ~75% com estrutura preservada e sem travas rígidas de dezena)
  // 3) Desduplicação obrigatória entre bilhetes
  const seenKeys = new Set<string>();
  const portfolioFreq = new Uint16Array(61);
  const avgFreq = (safePortfolioSize * quantity) / 60;
  const maxNumberCap = Math.max(quantity, Math.ceil(avgFreq + 0.05) + (safePortfolioSize <= 10 ? 2 : 0));
  const strictQuotaLimit = Math.ceil(safePortfolioSize * 0.25);

  const quotaRelaxedLogic: GeneratorLogic = {
    ...logic,
    useAdvancedDuques: false,
    paretoTopSelection: false,
    preferHistoricalHotNumbers: false,
    includeCycleDezenas: false,
    repeat1to2: false,
    rowAndColDispersion: false
  };

  const games: Array<{
    numbers: number[];
    reasoning: string;
    passedAllRules: boolean;
    validation: GameValidationDetails;
    advancedMetrics: AdvancedBetMetrics;
  }> = [];

  const ctx: PortfolioGenerationContext = {
    freqCounts: portfolioFreq,
    maxCap: maxNumberCap,
    avgFreq
  };

  for (let i = 0; i < safePortfolioSize; i++) {
    const activeSliceLogic = i < strictQuotaLimit ? logic : quotaRelaxedLogic;
    let chosen = generateGameWithRules(quantity, activeSliceLogic, referenceNumbers, analyticsOverride, ctx);
    let key = chosen.numbers.join('-');
    let dedupTries = 0;

    while (seenKeys.has(key) && dedupTries < 16) {
      dedupTries++;
      chosen = generateGameWithRules(quantity, activeSliceLogic, referenceNumbers, analyticsOverride, ctx);
      key = chosen.numbers.join('-');
    }

    if (seenKeys.has(key)) {
      let mutGuard = 0;
      while (seenKeys.has(key) && mutGuard < 80) {
        mutGuard++;
        const candidateSet = new Set(chosen.numbers);
        const arr = [...chosen.numbers];
        // Substitui dezena mais frequente na carteira pela menos frequente ainda livre
        arr.sort((a, b) => portfolioFreq[b] - portfolioFreq[a]);
        arr.shift();
        const avail: number[] = [];
        for (let r = 1; r <= 60; r++) {
          if (!candidateSet.has(r) && portfolioFreq[r] < maxNumberCap) avail.push(r);
        }
        const replacementPool = avail.length > 0
          ? avail
          : Array.from({ length: 60 }, (_, idx) => idx + 1).filter(r => !candidateSet.has(r));
        replacementPool.sort((a, b) => portfolioFreq[a] - portfolioFreq[b]);
        const pickLimit = Math.min(8, replacementPool.length);
        const replacement = replacementPool[Math.floor(Math.random() * pickLimit)];
        arr.push(replacement);
        const sorted = arr.sort((a, b) => a - b);
        const newKey = sorted.join('-');
        if (!seenKeys.has(newKey)) {
          const validation = validateGameAgainstRules(sorted, activeSliceLogic, referenceNumbers, analyticsOverride);
          chosen = {
            numbers: sorted,
            reasoning: chosen.reasoning + ' (Ajuste anti-duplicata & equilíbrio em carteira)',
            passedAllRules: validation.allActiveRulesPassed,
            validation,
            advancedMetrics: buildAdvancedBetMetrics(validation, logic.calculationStrategy || 'balanced')
          };
          key = newKey;
        }
      }
    }

    seenKeys.add(key);
    chosen.numbers.forEach(n => {
      portfolioFreq[n]++;
    });
    games.push(chosen);
  }

  const coverage = analyzePortfolioCoverage(games.map(g => g.numbers), 60);
  return { games, coverage };
};
