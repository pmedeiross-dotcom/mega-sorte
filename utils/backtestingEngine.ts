import { CalculationStrategy, GeneratorLogic, LotteryType, OfficialDrawResult, TernoBoostProfile } from '../types';
import { generateGameWithRules } from './lotteryRules';
import { generateMaisMilionariaGameWithRules } from './maisMilionariaRules';
import { generateLotofacilWithRules } from './lotofacilRules';
import { buildDrawsListWithLatest, computeAllMegaSenaAnalytics, FRAME_NUMBERS, MegaAnalyticsSnapshot, PRIME_NUMBERS } from './megaSenaAdvancedAnalytics';
import { buildMaisMilionariaDrawsListWithLatest, MAIS_MILIONARIA_FRAME, MAIS_MILIONARIA_PRIME_NUMBERS } from './maisMilionariaAdvancedAnalytics';
import { buildLotofacilDrawsListWithLatest } from './lotofacilContestsData';
import { LOTOFACIL_FRAME, LOTOFACIL_PRIMES } from './lotofacilOfficialStats';
import { MAIS_MILIONARIA_OFFICIAL_DRAWS } from './maisMilionariaContestsData';
import { isGamePlausible } from './plausibilityFilter';
import { STRATEGY_LABELS } from './strategyCatalog';
export { STRATEGY_LABELS };

export interface HistoricalBacktestDraw {
  contest: number;
  date: string;
  numbers: number[];
  trevos?: number[];
}

export interface BacktestDrawResult {
  contest: number;
  date: string;
  drawnNumbers: number[];
  drawnTrevos?: number[];
  generatedNumbers: number[];
  generatedTrevos?: number[];
  matchedNumbers: number[];
  matchedTrevos?: number[];
  hits: number;
  trevosHits: number;
  prizeLabel: string | null;
  isPrize: boolean;
  advancedScore?: number;
}

export interface BacktestSummary {
  lottery: LotteryType;
  strategyUsed: CalculationStrategy;
  totalContests: number;
  startContest: number;
  endContest: number;
  maxHits: number;
  bestContestNumber: number | null;
  averageHits: number;
  totalPrizes: number;
  hitsDistribution: Record<number, number>;
  results: BacktestDrawResult[];
}

export interface CalibrationRoundLog {
  round: number;
  strategy: CalculationStrategy;
  label: string;
  maxHits: number;
  avgHits: number;
  prizesCount: number;
  hitTarget: boolean;
  logicSnapshot: GeneratorLogic;
}

export interface CalibrationResult {
  achievedTarget: boolean;
  targetHits: number;
  roundsExecuted: number;
  baselineMaxHits: number;
  baselineAvgHits: number;
  bestMaxHits: number;
  bestAvgHits: number;
  bestStrategy: CalculationStrategy;
  bestLabel: string;
  bestLogic: GeneratorLogic;
  bestSummary: BacktestSummary;
  roundLogs: CalibrationRoundLog[];
}


/**
 * Constrói a lista unificada de concursos históricos (mais recente primeiro) para backtesting.
 */
export function getHistoricalDrawsForBacktest(
  lottery: LotteryType,
  latestDraw?: OfficialDrawResult
): HistoricalBacktestDraw[] {
  if (lottery === 'lotofacil') {
    return buildLotofacilDrawsListWithLatest(latestDraw).map(d => ({
      contest: d.contest,
      date: d.date,
      numbers: d.numbers
    }));
  }

  if (lottery === 'maismilionaria') {
    const baseList = buildMaisMilionariaDrawsListWithLatest(latestDraw);
    const trevosMap = new Map<number, number[]>();
    MAIS_MILIONARIA_OFFICIAL_DRAWS.forEach(d => {
      if (d.trevos && d.trevos.length > 0) {
        trevosMap.set(d.contest, d.trevos);
      }
    });
    if (latestDraw?.contestNumber && latestDraw.trevos && latestDraw.trevos.length > 0) {
      trevosMap.set(latestDraw.contestNumber, latestDraw.trevos);
    }

    return baseList.map(d => ({
      contest: d.contest,
      date: d.date,
      numbers: d.numbers,
      trevos: d.trevos || trevosMap.get(d.contest)
    }));
  }

  return buildDrawsListWithLatest(latestDraw).map(d => ({
    contest: d.contest,
    date: d.date,
    numbers: d.numbers
  }));
}

function evaluatePrizeTier(
  lottery: LotteryType,
  hits: number,
  trevosHits: number,
  hasDrawnTrevos: boolean
): { prizeLabel: string | null; isPrize: boolean } {
  if (lottery === 'lotofacil') {
    if (hits === 15) return { prizeLabel: '15 Acertos (Prêmio Máximo)', isPrize: true };
    if (hits === 14) return { prizeLabel: '14 Acertos (2ª Faixa)', isPrize: true };
    if (hits === 13) return { prizeLabel: '13 Acertos (R$ 30)', isPrize: true };
    if (hits === 12) return { prizeLabel: '12 Acertos (R$ 12)', isPrize: true };
    if (hits === 11) return { prizeLabel: '11 Acertos (R$ 6)', isPrize: true };
    return { prizeLabel: null, isPrize: false };
  }

  if (lottery === 'maismilionaria') {
    if (hasDrawnTrevos) {
      if (hits === 6 && trevosHits === 2) return { prizeLabel: 'Faixa 1 (6 + 2 Trevos)', isPrize: true };
      if (hits === 6) return { prizeLabel: `Faixa 2 (6 + ${trevosHits} Trevo)`, isPrize: true };
      if (hits === 5 && trevosHits === 2) return { prizeLabel: 'Faixa 3 (5 + 2 Trevos)', isPrize: true };
      if (hits === 5) return { prizeLabel: `Faixa 4 (5 + ${trevosHits} Trevo)`, isPrize: true };
      if (hits === 4 && trevosHits === 2) return { prizeLabel: 'Faixa 5 (4 + 2 Trevos)', isPrize: true };
      if (hits === 4) return { prizeLabel: `Faixa 6 (4 + ${trevosHits} Trevo)`, isPrize: true };
      if (hits === 3 && trevosHits === 2) return { prizeLabel: 'Faixa 7 (3 + 2 Trevos)', isPrize: true };
      if (hits === 3 && trevosHits === 1) return { prizeLabel: 'Faixa 8 (3 + 1 Trevo)', isPrize: true };
      if (hits === 2 && trevosHits === 2) return { prizeLabel: 'Faixa 9 (2 + 2 Trevos)', isPrize: true };
      if (hits === 2 && trevosHits === 1) return { prizeLabel: 'Faixa 10 (2 + 1 Trevo)', isPrize: true };
    } else {
      if (hits === 6) return { prizeLabel: '6 Dezenas (Faixa 1/2)', isPrize: true };
      if (hits === 5) return { prizeLabel: '5 Dezenas (Quina)', isPrize: true };
      if (hits === 4) return { prizeLabel: '4 Dezenas (Quadra)', isPrize: true };
      if (hits === 3) return { prizeLabel: '3 Dezenas (Elegível Faixa 7/8)', isPrize: false };
    }
    return { prizeLabel: null, isPrize: false };
  }

  // Mega-Sena
  if (hits >= 6) return { prizeLabel: 'SENA (6 Acertos)', isPrize: true };
  if (hits === 5) return { prizeLabel: 'QUINA (5 Acertos)', isPrize: true };
  if (hits === 4) return { prizeLabel: 'QUADRA (4 Acertos)', isPrize: true };
  if (hits === 3) return { prizeLabel: 'Terno (3 Acertos)', isPrize: false };
  return { prizeLabel: null, isPrize: false };
}

function generateCandidateForDraw(
  lottery: LotteryType,
  logic: GeneratorLogic,
  betCount: number,
  referenceNumbers: number[],
  megaAnalyticsOverride?: MegaAnalyticsSnapshot
): { numbers: number[]; trevos?: number[]; advancedScore?: number } {
  const safeCount = lottery === 'lotofacil'
    ? Math.min(20, Math.max(15, betCount || 15))
    : Math.min(12, Math.max(6, betCount || 6));
  const usePlausibility = logic.strictPlausibilityFilter !== false;

  if (lottery === 'lotofacil') {
    const res = generateLotofacilWithRules(safeCount, logic, referenceNumbers);
    return {
      numbers: res.numbers,
      advancedScore: res.validation.advancedScore
    };
  }

  if (lottery === 'maismilionaria') {
    let fallback: { numbers: number[]; trevos: number[]; advancedScore: number } | null = null;
    const maxTries = usePlausibility ? 4 : 1;
    for (let i = 0; i < maxTries; i++) {
      const res = generateMaisMilionariaGameWithRules(safeCount, logic, referenceNumbers);
      const current = {
        numbers: res.numbers,
        trevos: res.trevos,
        advancedScore: res.validation.advancedScore
      };
      if (!usePlausibility || isGamePlausible(res.numbers, 'maismilionaria')) {
        return current;
      }
      if (!fallback || current.advancedScore > fallback.advancedScore) {
        fallback = current;
      }
    }
    return fallback!;
  }

  // Mega-Sena
  let fallback: { numbers: number[]; advancedScore: number } | null = null;
  const maxTries = usePlausibility ? 4 : 1;
  for (let i = 0; i < maxTries; i++) {
    const res = generateGameWithRules(safeCount, logic, referenceNumbers, megaAnalyticsOverride);
    const current = {
      numbers: res.numbers,
      advancedScore: res.validation.advancedScore
    };
    if (!usePlausibility || isGamePlausible(res.numbers, 'megasena')) {
      return current;
    }
    if (!fallback || current.advancedScore > fallback.advancedScore) {
      fallback = current;
    }
  }
  return fallback!;
}

/**
 * Executa o Backtesting Histórico em um intervalo de concursos [startContest, endContest].
 * Para cada concurso, usa o concurso imediatamente anterior como referência (sem vazamento futuro)
 * e gera uma aposta com a estratégia e regras configuradas.
 */
export function runBacktestRange(params: {
  lottery: LotteryType;
  startContest: number;
  endContest: number;
  logic: GeneratorLogic;
  betCount: number;
  latestDraw?: OfficialDrawResult;
}): BacktestSummary {
  const { lottery, startContest, endContest, logic, betCount, latestDraw } = params;
  const allDraws = getHistoricalDrawsForBacktest(lottery, latestDraw);

  const minC = Math.min(startContest, endContest);
  const maxC = Math.max(startContest, endContest);

  // Filtra o intervalo mantendo ordem decrescente (mais recente primeiro)
  const targetDraws = allDraws.filter(d => d.contest >= minC && d.contest <= maxC);

  const results: BacktestDrawResult[] = [];
  const hitsDistribution: Record<number, number> = {};
  let totalHitsSum = 0;
  let maxHits = 0;
  let bestContestNumber: number | null = null;
  let totalPrizes = 0;

  // Mapa rápido por índice em allDraws para buscar o concurso imediatamente anterior
  const indexByContest = new Map<number, number>();
  allDraws.forEach((d, idx) => indexByContest.set(d.contest, idx));

  for (const draw of targetDraws) {
    const fullIdx = indexByContest.get(draw.contest) ?? -1;
    const prevDraw = fullIdx >= 0 && fullIdx + 1 < allDraws.length ? allDraws[fullIdx + 1] : undefined;
    const refNumbers = prevDraw ? prevDraw.numbers : [];

    // Zero lookahead: na Mega-Sena, recalcula o ciclo/atraso estritamente com concursos anteriores (< t)
    const priorDraws = fullIdx >= 0 && fullIdx + 1 < allDraws.length ? allDraws.slice(fullIdx + 1) : [];
    const megaAnalyticsOverride =
      lottery === 'megasena' && priorDraws.length > 0
        ? computeAllMegaSenaAnalytics(
            priorDraws.map(d => ({ contest: d.contest, date: d.date, numbers: d.numbers }))
          )
        : undefined;

    const generated = generateCandidateForDraw(lottery, logic, betCount, refNumbers, megaAnalyticsOverride);
    const drawnSet = new Set(draw.numbers);
    const matchedNumbers = generated.numbers.filter(n => drawnSet.has(n));
    const hits = matchedNumbers.length;

    let matchedTrevos: number[] | undefined;
    let trevosHits = 0;
    const hasDrawnTrevos = Boolean(draw.trevos && draw.trevos.length > 0);
    if (lottery === 'maismilionaria' && generated.trevos && draw.trevos) {
      const drawnTrevosSet = new Set(draw.trevos);
      matchedTrevos = generated.trevos.filter(t => drawnTrevosSet.has(t));
      trevosHits = matchedTrevos.length;
    }

    const { prizeLabel, isPrize } = evaluatePrizeTier(lottery, hits, trevosHits, hasDrawnTrevos);

    if (isPrize) totalPrizes++;
    totalHitsSum += hits;
    hitsDistribution[hits] = (hitsDistribution[hits] || 0) + 1;

    if (hits > maxHits || bestContestNumber === null) {
      if (hits > maxHits) {
        maxHits = hits;
        bestContestNumber = draw.contest;
      } else if (bestContestNumber === null) {
        bestContestNumber = draw.contest;
      }
    }

    results.push({
      contest: draw.contest,
      date: draw.date,
      drawnNumbers: draw.numbers,
      drawnTrevos: draw.trevos,
      generatedNumbers: generated.numbers,
      generatedTrevos: generated.trevos,
      matchedNumbers,
      matchedTrevos,
      hits,
      trevosHits,
      prizeLabel,
      isPrize,
      advancedScore: generated.advancedScore
    });
  }

  return {
    lottery,
    strategyUsed: logic.calculationStrategy || 'combinatorial_cover',
    totalContests: results.length,
    startContest: minC,
    endContest: maxC,
    maxHits,
    bestContestNumber,
    averageHits: results.length > 0 ? +(totalHitsSum / results.length).toFixed(2) : 0,
    totalPrizes,
    hitsDistribution,
    results
  };
}

/**
 * Calibra e testa variações iterativas de estratégia e regras matemáticas até atingir
 * a meta de acertos desejada (ex: 3, 4, 5, 6 acertos ou 11-15 na Lotofácil) ou encontrar
 * a configuração de melhor desempenho no intervalo histórico selecionado.
 */
export function calibrateStrategyAgainstHistory(params: {
  lottery: LotteryType;
  startContest: number;
  endContest: number;
  baseLogic: GeneratorLogic;
  betCount: number;
  targetHits: number;
  maxRounds?: number;
  latestDraw?: OfficialDrawResult;
}): CalibrationResult {
  const {
    lottery,
    startContest,
    endContest,
    baseLogic,
    betCount,
    targetHits,
    maxRounds = 14,
    latestDraw
  } = params;

  const candidatePresets: Array<{ label: string; strategy: CalculationStrategy; overrides: Partial<GeneratorLogic> }> = [
    {
      label: 'Configuração Atual do Gerador',
      strategy: baseLogic.calculationStrategy || 'combinatorial_cover',
      overrides: {}
    },
    {
      label: 'Cobertura Combinatória Anti-Colisão + Plausibilidade',
      strategy: 'combinatorial_cover',
      overrides: {
        strictPlausibilityFilter: true,
        useAdvancedDuques: false,
        paretoTopSelection: false,
        preferHistoricalHotNumbers: false,
        includeCycleDezenas: false,
        repeat1to2: false
      }
    },
    {
      label: 'Padrão Ouro + Plausibilidade Estrita',
      strategy: 'balanced',
      overrides: {
        strictPlausibilityFilter: true,
        useAdvancedDuques: true,
        paretoTopSelection: true,
        includeCycleDezenas: true,
        repeat1to2: true
      }
    },
    {
      label: 'Momentum Recente + Dezenas Quentes',
      strategy: 'momentum',
      overrides: {
        preferHistoricalHotNumbers: true,
        useAdvancedDuques: true,
        strictPlausibilityFilter: true
      }
    },
    {
      label: 'Pressão de Ciclo & Z-Score de Atraso',
      strategy: 'cycle_delay',
      overrides: {
        includeCycleDezenas: true,
        frameAndCenterBalance: true,
        strictPlausibilityFilter: true
      }
    },
    {
      label: 'Afinidade de Duques & Coocorrência (Lift)',
      strategy: 'cooccurrence',
      overrides: {
        useAdvancedDuques: true,
        paretoTopSelection: true,
        balanceEvenOdd: true
      }
    },
    {
      label: 'Entropia de Shannon + Dispersão Ampla',
      strategy: 'entropy_shannon',
      overrides: {
        spreadDistribution: true,
        rowAndColDispersion: true,
        strictPlausibilityFilter: false
      }
    },
    {
      label: 'Momentum Agressivo (Sem Filtro Estrito)',
      strategy: 'momentum',
      overrides: {
        strictPlausibilityFilter: false,
        repeat1to2: true,
        preferHistoricalHotNumbers: true
      }
    },
    {
      label: 'Ciclo Puro + Pareto + Primos/Fibonacci',
      strategy: 'cycle_delay',
      overrides: {
        includeCycleDezenas: true,
        paretoTopSelection: true,
        balancePrimesAndFibonacci: true,
        strictPlausibilityFilter: false
      }
    }
  ];

  const roundLogs: CalibrationRoundLog[] = [];
  let baselineMaxHits = 0;
  let baselineAvgHits = 0;

  let bestSummary: BacktestSummary | null = null;
  let bestLogic: GeneratorLogic = { ...baseLogic };
  let bestLabel = candidatePresets[0].label;
  let achievedTarget = false;

  const totalIterations = Math.max(candidatePresets.length, maxRounds);

  for (let roundIdx = 0; roundIdx < totalIterations; roundIdx++) {
    const preset = candidatePresets[roundIdx % candidatePresets.length];
    const isReexploration = roundIdx >= candidatePresets.length;
    const roundLabel = isReexploration
      ? `${preset.label} (Reamostragem #${roundIdx - candidatePresets.length + 2})`
      : preset.label;

    const testLogic: GeneratorLogic = {
      ...baseLogic,
      ...preset.overrides,
      calculationStrategy: preset.strategy
    };

    const summary = runBacktestRange({
      lottery,
      startContest,
      endContest,
      logic: testLogic,
      betCount,
      latestDraw
    });

    if (roundIdx === 0) {
      baselineMaxHits = summary.maxHits;
      baselineAvgHits = summary.averageHits;
    }

    const hitTarget = summary.maxHits >= targetHits;
    roundLogs.push({
      round: roundIdx + 1,
      strategy: preset.strategy,
      label: roundLabel,
      maxHits: summary.maxHits,
      avgHits: summary.averageHits,
      prizesCount: summary.totalPrizes,
      hitTarget,
      logicSnapshot: testLogic
    });

    const isBetter =
      !bestSummary ||
      summary.maxHits > bestSummary.maxHits ||
      (summary.maxHits === bestSummary.maxHits && summary.totalPrizes > bestSummary.totalPrizes) ||
      (summary.maxHits === bestSummary.maxHits &&
        summary.totalPrizes === bestSummary.totalPrizes &&
        summary.averageHits > bestSummary.averageHits);

    if (isBetter) {
      bestSummary = summary;
      bestLogic = testLogic;
      bestLabel = roundLabel;
    }

    if (hitTarget) {
      achievedTarget = true;
      break;
    }
  }

  return {
    achievedTarget,
    targetHits,
    roundsExecuted: roundLogs.length,
    baselineMaxHits,
    baselineAvgHits,
    bestMaxHits: bestSummary?.maxHits || 0,
    bestAvgHits: bestSummary?.averageHits || 0,
    bestStrategy: bestLogic.calculationStrategy || 'combinatorial_cover',
    bestLabel,
    bestLogic,
    bestSummary: bestSummary!,
    roundLogs
  };
}

/**
 * Extrai o perfil estatístico das simulações que acertaram pelo menos `minHitsThreshold`
 * dezenas (ex: Terno = 3 acertos na Mega-Sena/+Milionária, ou 11+ na Lotofácil),
 * para alimentar a Análise Avançada e o Gerador Inteligente.
 */
export function analyzeTernoFilterFromBets(
  simulations: Array<{ numbers: number[]; matchedNumbers?: number[]; hits: number }>,
  lottery: LotteryType,
  totalSimulationsCount: number,
  minHitsThreshold: number = lottery === 'lotofacil' ? 11 : 3
): TernoBoostProfile | null {
  const qualifying = simulations.filter(s => s.hits >= minHitsThreshold);
  if (qualifying.length === 0) return null;

  const maxNum = lottery === 'lotofacil' ? 25 : (lottery === 'maismilionaria' ? 50 : 60);
  const frameSet = new Set(
    lottery === 'lotofacil' ? LOTOFACIL_FRAME : (lottery === 'maismilionaria' ? MAIS_MILIONARIA_FRAME : FRAME_NUMBERS)
  );
  const primeSet = new Set(
    lottery === 'lotofacil' ? LOTOFACIL_PRIMES : (lottery === 'maismilionaria' ? MAIS_MILIONARIA_PRIME_NUMBERS : PRIME_NUMBERS)
  );

  const betFreq: Record<number, number> = {};
  const matchedFreq: Record<number, number> = {};
  const pairFreq: Record<string, { pair: [number, number]; count: number }> = {};
  const evenCountFreq: Record<number, number> = {};

  let sumTotal = 0;
  let minSum = Infinity;
  let maxSum = -Infinity;
  let frameTotal = 0;
  let primesTotal = 0;

  qualifying.forEach(sim => {
    const nums = [...sim.numbers].sort((a, b) => a - b);
    const sum = nums.reduce((a, b) => a + b, 0);
    sumTotal += sum;
    if (sum < minSum) minSum = sum;
    if (sum > maxSum) maxSum = sum;

    const evens = nums.filter(n => n % 2 === 0).length;
    evenCountFreq[evens] = (evenCountFreq[evens] || 0) + 1;

    frameTotal += nums.filter(n => frameSet.has(n)).length;
    primesTotal += nums.filter(n => primeSet.has(n)).length;

    nums.forEach(n => {
      betFreq[n] = (betFreq[n] || 0) + 1;
    });

    (sim.matchedNumbers || []).forEach(n => {
      matchedFreq[n] = (matchedFreq[n] || 0) + 1;
    });

    // Coocorrência de pares dentro das combinações que acertaram Terno+
    for (let i = 0; i < nums.length; i++) {
      for (let j = i + 1; j < nums.length; j++) {
        const key = `${nums[i]}-${nums[j]}`;
        if (!pairFreq[key]) {
          pairFreq[key] = { pair: [nums[i], nums[j]], count: 0 };
        }
        pairFreq[key].count++;
      }
    }
  });

  const topLimit = lottery === 'lotofacil' ? 15 : 12;
  const topNumbers = Object.entries(betFreq)
    .map(([n, c]) => ({ n: Number(n), c }))
    .sort((a, b) => b.c - a.c || a.n - b.n)
    .slice(0, topLimit)
    .map(x => x.n);

  const matchedHotNumbers = Object.entries(matchedFreq)
    .map(([n, c]) => ({ n: Number(n), c }))
    .sort((a, b) => b.c - a.c || (betFreq[b.n] || 0) - (betFreq[a.n] || 0) || a.n - b.n)
    .slice(0, 10)
    .map(x => x.n);

  const maxBetCount = Math.max(...Object.values(betFreq), 1);
  const maxMatchedCount = Math.max(...Object.values(matchedFreq), 1);

  const numberWeights: Record<number, number> = {};
  for (let num = 1; num <= maxNum; num++) {
    const betRatio = (betFreq[num] || 0) / maxBetCount;
    const matchedRatio = (matchedFreq[num] || 0) / maxMatchedCount;
    // Peso base 1.0; acertos efetivos no terno pesam mais (+0.85) e presença nas apostas vencedoras soma (+0.45)
    const boost = 1 + matchedRatio * 0.85 + betRatio * 0.45;
    numberWeights[num] = Number(boost.toFixed(3));
  }

  const avgSum = Math.round(sumTotal / qualifying.length);
  const pad = lottery === 'lotofacil' ? 12 : 18;
  const targetSumMin = Math.max(0, Math.min(minSum, avgSum - pad));
  const targetSumMax = Math.max(maxSum, avgSum + pad);

  const preferredEvenCounts = Object.entries(evenCountFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([even]) => Number(even));

  const topPairs = Object.values(pairFreq)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map(x => x.pair);

  return {
    lottery,
    sourceSimulationsCount: totalSimulationsCount,
    ternoSimulationsCount: qualifying.length,
    minHitsThreshold,
    topNumbers,
    matchedHotNumbers: matchedHotNumbers.length > 0 ? matchedHotNumbers : topNumbers.slice(0, 8),
    numberWeights,
    targetSumMin,
    targetSumMax,
    avgSum,
    preferredEvenCounts,
    avgFrameCount: +(frameTotal / qualifying.length).toFixed(1),
    avgPrimesCount: +(primesTotal / qualifying.length).toFixed(1),
    topPairs,
    updatedAt: Date.now()
  };
}

export function extractTernoStatsProfile(
  summary: BacktestSummary,
  minHitsThreshold: number = summary.lottery === 'lotofacil' ? 11 : 3
): TernoBoostProfile | null {
  return analyzeTernoFilterFromBets(
    summary.results.map(r => ({
      numbers: r.generatedNumbers,
      matchedNumbers: r.matchedNumbers,
      hits: r.hits
    })),
    summary.lottery,
    summary.totalContests,
    minHitsThreshold
  );
}

