/**
 * Motor de Benchmark Pareado, Backtest Cronológico Walk-Forward e Testes Estatísticos
 * para comparação rigorosa entre:
 *   1. Estratégia Híbrida (hybrid_combinatorial)
 *   2. Cobertura Combinatória Pura (combinatorial_cover)
 *   3. Carteira Aleatória Pareada (random_distinct)
 *
 * Separa estritamente:
 *   - Simulação Sintética Pareada (50+ sorteios pós-geração)
 *   - Backtest Histórico Cronológico Walk-Forward (concursos reais disponíveis no arquivo)
 *   - Auditoria Prospectiva Real (registrada no Ledger SHA-256)
 */

import { OfficialDrawResult } from '../types';
import { getHistoricalDrawsForBacktest } from './backtestingEngine';
import {
  analyzePortfolioStructuralMetrics,
  deriveDeterministicSeed,
  generateHybridCoveragePortfolio,
  SeededRng
} from './hybridCoverageStrategy';
import {
  analyzePortfolioCoverage,
  drawRandomTicket,
  evaluatePortfolioAgainstDraw,
  generateCombinatorialPortfolio,
  generateRandomDistinctPortfolio,
  twoProportionZTest
} from './portfolioOptimizer';

export type BenchmarkStrategyId = 'hybrid_combinatorial' | 'combinatorial_cover' | 'random_distinct';

export interface WilsonCI {
  proportionPct: number;
  lowPct: number;
  highPct: number;
}

export interface McNemarTestResult {
  bothWin: number;
  aOnlyWin: number;
  bOnlyWin: number;
  bothLose: number;
  discordantTotal: number;
  chiSquare: number;
  pValue: number;
  exactBinomialUsed: boolean;
  significantAt05: boolean;
}

export interface WinDrawLossSummary {
  aWins: number;
  ties: number;
  bWins: number;
}

export interface PairedComparisonStats {
  label: string;
  mcnemar3Plus: McNemarTestResult;
  mcnemar4Plus: McNemarTestResult;
  zTest3Plus: { zScore: number; pValue: number; diffPctPoints: number };
  wdlMaxHits: WinDrawLossSummary;
  wdlPrizes3PlusCount: WinDrawLossSummary;
}

export interface StrategyBenchmarkMetrics {
  strategyId: BenchmarkStrategyId;
  strategyName: string;
  simulationsCount: number;
  ticketCount: number;
  betSize: number;
  costPerContest: number;
  totalCost: number;
  // Métricas combinatórias médias
  avgUniquePairs: number;
  avgPairCoveragePct: number;
  avgUniqueTriples: number;
  avgTripleCoveragePct: number;
  avgGini: number;
  avgMeanJaccard: number;
  // Métricas estruturais médias
  avgSum: number;
  pctSum160to240: number;
  pctBalancedParity: number;
  avgDistinctQuadrants: number;
  pct3PlusConsecutive: number;
  avgMaxOverlap: number;
  // Métricas de desempenho
  contestsWith3Plus: number;
  rate3PlusPct: number;
  ci95_3Plus: WilsonCI;
  contestsWith4Plus: number;
  rate4PlusPct: number;
  ci95_4Plus: WilsonCI;
  ternos: number;
  quadras: number;
  quinas: number;
  senas: number;
  maxHitsObserved: number;
  avgMaxHitsPerDraw: number;
  hitDistribution: Record<number, number>; // 0..6 acertos em todos os bilhetes
}

export interface ThreeWayBenchmarkReport {
  kind: 'synthetic_paired';
  executedAt: number;
  baseSeed: number;
  simulationsCount: number;
  ticketCount: number;
  betSize: number;
  ticketPrice: number;
  hybrid: StrategyBenchmarkMetrics;
  pureCombinatorial: StrategyBenchmarkMetrics;
  randomBaseline: StrategyBenchmarkMetrics;
  comparisons: {
    hybridVsRandom: PairedComparisonStats;
    hybridVsPure: PairedComparisonStats;
    pureVsRandom: PairedComparisonStats;
  };
  sampleDrawsPreview: Array<{
    index: number;
    draw: number[];
    hybridMaxHits: number;
    pureMaxHits: number;
    randomMaxHits: number;
  }>;
}

export interface ChronologicalBacktestReport {
  kind: 'chronological_walk_forward';
  executedAt: number;
  baseSeed: number;
  contestsEvaluated: number;
  totalAvailableInArchive: number;
  startContest: number;
  endContest: number;
  ticketCount: number;
  betSize: number;
  ticketPrice: number;
  historicalPrizesAvailable: false;
  historicalLimitationNote: string;
  hybrid: StrategyBenchmarkMetrics;
  pureCombinatorial: StrategyBenchmarkMetrics;
  randomBaseline: StrategyBenchmarkMetrics;
  comparisons: {
    hybridVsRandom: PairedComparisonStats;
    hybridVsPure: PairedComparisonStats;
    pureVsRandom: PairedComparisonStats;
  };
  perContestTimeline: Array<{
    contest: number;
    date: string;
    drawnNumbers: number[];
    hybridMaxHits: number;
    hybridTernos: number;
    hybridQuadrasPlus: number;
    pureMaxHits: number;
    pureTernos: number;
    pureQuadrasPlus: number;
    randomMaxHits: number;
    randomTernos: number;
    randomQuadrasPlus: number;
  }>;
}

/**
 * Intervalo de confiança de Wilson (95% por padrão) para proporção binomial k/n.
 */
export function wilsonConfidenceInterval(k: number, n: number, z: number = 1.96): WilsonCI {
  if (n <= 0) return { proportionPct: 0, lowPct: 0, highPct: 0 };
  const p = k / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denom;
  const margin = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  return {
    proportionPct: p * 100,
    lowPct: Math.max(0, (center - margin) * 100),
    highPct: Math.min(100, (center + margin) * 100)
  };
}

function logFactorial(n: number): number {
  let sum = 0;
  for (let i = 2; i <= n; i++) sum += Math.log(i);
  return sum;
}

function erfcApprox(x: number): number {
  const absX = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * absX);
  const res =
    t *
    (0.254829592 +
      t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429)))) *
    Math.exp(-absX * absX);
  return x >= 0 ? res : 2 - res;
}

/**
 * Teste pareado de McNemar para desfechos binários em amostras pareadas.
 * Utiliza teste binomial exato bicaudal quando o total de pares discordantes (b+c) <= 25
 * e aproximação qui-quadrado com correção de continuidade de Edwards caso contrário.
 */
export function mcnemarTest(
  bothWin: number,
  aOnlyWin: number,
  bOnlyWin: number,
  bothLose: number
): McNemarTestResult {
  const discordant = aOnlyWin + bOnlyWin;
  if (discordant === 0) {
    return {
      bothWin,
      aOnlyWin,
      bOnlyWin,
      bothLose,
      discordantTotal: 0,
      chiSquare: 0,
      pValue: 1,
      exactBinomialUsed: true,
      significantAt05: false
    };
  }

  const diff = Math.abs(aOnlyWin - bOnlyWin);
  const corrected = Math.max(0, diff - 1);
  const chiSquare = (corrected * corrected) / discordant;

  let pValue = 1;
  let exactBinomialUsed = false;

  if (discordant <= 25) {
    exactBinomialUsed = true;
    const minDiscordant = Math.min(aOnlyWin, bOnlyWin);
    const logHalfPow = discordant * Math.log(0.5);
    const logNFact = logFactorial(discordant);
    let tail = 0;
    for (let i = 0; i <= minDiscordant; i++) {
      const logC = logNFact - logFactorial(i) - logFactorial(discordant - i);
      tail += Math.exp(logC + logHalfPow);
    }
    pValue = Math.min(1, 2 * tail);
  } else {
    pValue = Math.min(1, Math.max(0, erfcApprox(Math.sqrt(chiSquare / 2))));
  }

  return {
    bothWin,
    aOnlyWin,
    bOnlyWin,
    bothLose,
    discordantTotal: discordant,
    chiSquare,
    pValue,
    exactBinomialUsed,
    significantAt05: pValue < 0.05
  };
}

interface RawIterationRecord {
  games: number[][];
  drawn: number[];
  hits3PlusFlag: boolean;
  hits4PlusFlag: boolean;
  ternos: number;
  quadras: number;
  quinas: number;
  senas: number;
  maxHits: number;
  total3PlusTickets: number;
  pairCovPct: number;
  uniquePairs: number;
  tripleCovPct: number;
  uniqueTriples: number;
  gini: number;
  meanJaccard: number;
  avgSum: number;
  pctSum160to240: number;
  pctBalancedParity: number;
  avgDistinctQuadrants: number;
  pct3PlusConsecutive: number;
  maxOverlapBetweenTickets: number;
  ticketHitsCounts: Record<number, number>;
}

function recordIteration(
  games: number[][],
  drawn: number[],
  precomputedCoverage?: ReturnType<typeof analyzePortfolioCoverage>,
  precomputedStruct?: ReturnType<typeof analyzePortfolioStructuralMetrics>
): RawIterationRecord {
  const cov = precomputedCoverage || analyzePortfolioCoverage(games, 60);
  const st = precomputedStruct || analyzePortfolioStructuralMetrics(games);
  const evalDraw = evaluatePortfolioAgainstDraw(games, drawn);

  const drawnSet = new Set(drawn);
  const ticketHitsCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  for (const g of games) {
    let h = 0;
    for (const n of g) if (drawnSet.has(n)) h++;
    const clamped = Math.min(6, h);
    ticketHitsCounts[clamped] = (ticketHitsCounts[clamped] || 0) + 1;
  }

  return {
    games,
    drawn,
    hits3PlusFlag: evalDraw.hasAny3Plus,
    hits4PlusFlag: evalDraw.hasAny4Plus,
    ternos: evalDraw.ternos,
    quadras: evalDraw.quadras,
    quinas: evalDraw.quinas,
    senas: evalDraw.senas,
    maxHits: evalDraw.maxHitsInPortfolio,
    total3PlusTickets: evalDraw.ternos + evalDraw.quadras + evalDraw.quinas + evalDraw.senas,
    pairCovPct: cov.pairCoveragePct,
    uniquePairs: cov.uniquePairs,
    tripleCovPct: cov.tripleCoveragePct,
    uniqueTriples: cov.uniqueTriples,
    gini: cov.giniCoefficient,
    meanJaccard: cov.meanJaccard,
    avgSum: st.avgSum,
    pctSum160to240: st.pctSum160to240,
    pctBalancedParity: st.pctBalancedParity,
    avgDistinctQuadrants: st.avgDistinctQuadrants,
    pct3PlusConsecutive: games.length > 0 ? (st.gamesWith3PlusConsecutive / games.length) * 100 : 0,
    maxOverlapBetweenTickets: st.maxOverlapBetweenTickets,
    ticketHitsCounts
  };
}

function aggregateStrategyRecords(
  strategyId: BenchmarkStrategyId,
  strategyName: string,
  records: RawIterationRecord[],
  ticketCount: number,
  betSize: number,
  ticketPrice: number
): StrategyBenchmarkMetrics {
  const n = records.length;
  const dist: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  let sumUniquePairs = 0;
  let sumPairPct = 0;
  let sumUniqueTriples = 0;
  let sumTriplePct = 0;
  let sumGini = 0;
  let sumJaccard = 0;
  let sumAvgSum = 0;
  let sumPct160to240 = 0;
  let sumPctParity = 0;
  let sumQuad = 0;
  let sum3Cons = 0;
  let sumMaxOverlap = 0;

  let contests3Plus = 0;
  let contests4Plus = 0;
  let ternos = 0;
  let quadras = 0;
  let quinas = 0;
  let senas = 0;
  let maxHitsObserved = 0;
  let sumMaxHits = 0;

  for (const r of records) {
    sumUniquePairs += r.uniquePairs;
    sumPairPct += r.pairCovPct;
    sumUniqueTriples += r.uniqueTriples;
    sumTriplePct += r.tripleCovPct;
    sumGini += r.gini;
    sumJaccard += r.meanJaccard;
    sumAvgSum += r.avgSum;
    sumPct160to240 += r.pctSum160to240;
    sumPctParity += r.pctBalancedParity;
    sumQuad += r.avgDistinctQuadrants;
    sum3Cons += r.pct3PlusConsecutive;
    sumMaxOverlap += r.maxOverlapBetweenTickets;

    if (r.hits3PlusFlag) contests3Plus++;
    if (r.hits4PlusFlag) contests4Plus++;
    ternos += r.ternos;
    quadras += r.quadras;
    quinas += r.quinas;
    senas += r.senas;
    if (r.maxHits > maxHitsObserved) maxHitsObserved = r.maxHits;
    sumMaxHits += r.maxHits;

    for (let h = 0; h <= 6; h++) {
      dist[h] = (dist[h] || 0) + (r.ticketHitsCounts[h] || 0);
    }
  }

  const div = Math.max(1, n);
  const costPerContest = ticketCount * ticketPrice;
  return {
    strategyId,
    strategyName,
    simulationsCount: n,
    ticketCount,
    betSize,
    costPerContest,
    totalCost: costPerContest * n,
    avgUniquePairs: sumUniquePairs / div,
    avgPairCoveragePct: sumPairPct / div,
    avgUniqueTriples: sumUniqueTriples / div,
    avgTripleCoveragePct: sumTriplePct / div,
    avgGini: sumGini / div,
    avgMeanJaccard: sumJaccard / div,
    avgSum: sumAvgSum / div,
    pctSum160to240: sumPct160to240 / div,
    pctBalancedParity: sumPctParity / div,
    avgDistinctQuadrants: sumQuad / div,
    pct3PlusConsecutive: sum3Cons / div,
    avgMaxOverlap: sumMaxOverlap / div,
    contestsWith3Plus: contests3Plus,
    rate3PlusPct: n > 0 ? (contests3Plus / n) * 100 : 0,
    ci95_3Plus: wilsonConfidenceInterval(contests3Plus, n),
    contestsWith4Plus: contests4Plus,
    rate4PlusPct: n > 0 ? (contests4Plus / n) * 100 : 0,
    ci95_4Plus: wilsonConfidenceInterval(contests4Plus, n),
    ternos,
    quadras,
    quinas,
    senas,
    maxHitsObserved,
    avgMaxHitsPerDraw: sumMaxHits / div,
    hitDistribution: dist
  };
}

function buildPairedComparison(
  label: string,
  recordsA: RawIterationRecord[],
  recordsB: RawIterationRecord[]
): PairedComparisonStats {
  const n = Math.min(recordsA.length, recordsB.length);
  let bw3 = 0, aOnly3 = 0, bOnly3 = 0, bl3 = 0;
  let bw4 = 0, aOnly4 = 0, bOnly4 = 0, bl4 = 0;
  let a3Total = 0, b3Total = 0;

  const wdlMaxHits: WinDrawLossSummary = { aWins: 0, ties: 0, bWins: 0 };
  const wdlPrizes3PlusCount: WinDrawLossSummary = { aWins: 0, ties: 0, bWins: 0 };

  for (let i = 0; i < n; i++) {
    const a = recordsA[i];
    const b = recordsB[i];

    if (a.hits3PlusFlag) a3Total++;
    if (b.hits3PlusFlag) b3Total++;

    if (a.hits3PlusFlag && b.hits3PlusFlag) bw3++;
    else if (a.hits3PlusFlag && !b.hits3PlusFlag) aOnly3++;
    else if (!a.hits3PlusFlag && b.hits3PlusFlag) bOnly3++;
    else bl3++;

    if (a.hits4PlusFlag && b.hits4PlusFlag) bw4++;
    else if (a.hits4PlusFlag && !b.hits4PlusFlag) aOnly4++;
    else if (!a.hits4PlusFlag && b.hits4PlusFlag) bOnly4++;
    else bl4++;

    if (a.maxHits > b.maxHits) wdlMaxHits.aWins++;
    else if (b.maxHits > a.maxHits) wdlMaxHits.bWins++;
    else wdlMaxHits.ties++;

    if (a.total3PlusTickets > b.total3PlusTickets) wdlPrizes3PlusCount.aWins++;
    else if (b.total3PlusTickets > a.total3PlusTickets) wdlPrizes3PlusCount.bWins++;
    else wdlPrizes3PlusCount.ties++;
  }

  return {
    label,
    mcnemar3Plus: mcnemarTest(bw3, aOnly3, bOnly3, bl3),
    mcnemar4Plus: mcnemarTest(bw4, aOnly4, bOnly4, bl4),
    zTest3Plus: twoProportionZTest(a3Total, n, b3Total, n),
    wdlMaxHits,
    wdlPrizes3PlusCount
  };
}

/**
 * Executa benchmark pareado entre Estratégia Híbrida, Cobertura Combinatória Pura
 * e Carteira Aleatória em N simulações (padrão 50) com orçamento e sorteios idênticos.
 */
export async function runThreeWayPairedBenchmark(options?: {
  simulationsCount?: number;
  ticketCount?: number;
  betSize?: number;
  baseSeed?: number;
  candidatesPerTicket?: number;
  ticketPrice?: number;
  onProgress?: (completed: number, total: number) => void;
}): Promise<ThreeWayBenchmarkReport> {
  const simulationsCount = Math.max(10, Math.min(300, Math.trunc(options?.simulationsCount ?? 50)));
  const ticketCount = Math.max(5, Math.min(200, Math.trunc(options?.ticketCount ?? 78)));
  const betSize = Math.max(6, Math.min(10, Math.trunc(options?.betSize ?? 6)));
  const ticketPrice = options?.ticketPrice ?? 5.0;
  const candidatesPerTicket = options?.candidatesPerTicket ?? 200;
  const baseSeed =
    options?.baseSeed ??
    deriveDeterministicSeed({
      contestNumber: 3070,
      portfolioSize: ticketCount,
      betSize,
      salt: 50021
    });

  const hybridRecords: RawIterationRecord[] = [];
  const pureRecords: RawIterationRecord[] = [];
  const randomRecords: RawIterationRecord[] = [];
  const preview: ThreeWayBenchmarkReport['sampleDrawsPreview'] = [];

  for (let i = 0; i < simulationsCount; i++) {
    const iterHybridSeed = deriveDeterministicSeed({
      contestNumber: 4000 + i,
      portfolioSize: ticketCount,
      betSize,
      salt: baseSeed
    });
    const iterRandomSeed = deriveDeterministicSeed({
      contestNumber: 9000 + i,
      portfolioSize: ticketCount,
      betSize,
      salt: baseSeed + 77
    });
    const iterDrawSeed = deriveDeterministicSeed({
      contestNumber: 15000 + i,
      portfolioSize: ticketCount,
      betSize,
      salt: baseSeed + 991
    });

    const hybridRes = generateHybridCoveragePortfolio({
      portfolioSize: ticketCount,
      betSize,
      maxNum: 60,
      seed: iterHybridSeed,
      candidatesPerTicket
    });

    const pureGames = generateCombinatorialPortfolio(ticketCount, {
      betSize,
      maxNum: 60,
      useStructuralPlausibility: false,
      candidatesPerTicket: Math.min(candidatesPerTicket, 180)
    });

    const randRng = new SeededRng(iterRandomSeed);
    const randomGames = generateRandomDistinctPortfolio(ticketCount, betSize, 60, () => randRng.next());

    // Sorteio simulado gerado estritamente APÓS as 3 carteiras com RNG independente
    const drawRng = new SeededRng(iterDrawSeed);
    const simulatedDraw = drawRandomTicket(6, 60, () => drawRng.next());

    const hRec = recordIteration(hybridRes.games, simulatedDraw, hybridRes.coverage, hybridRes.structuralMetrics);
    const pRec = recordIteration(pureGames, simulatedDraw);
    const rRec = recordIteration(randomGames, simulatedDraw);

    hybridRecords.push(hRec);
    pureRecords.push(pRec);
    randomRecords.push(rRec);

    if (preview.length < 10) {
      preview.push({
        index: i + 1,
        draw: simulatedDraw,
        hybridMaxHits: hRec.maxHits,
        pureMaxHits: pRec.maxHits,
        randomMaxHits: rRec.maxHits
      });
    }

    if (options?.onProgress && (i % 5 === 4 || i === simulationsCount - 1)) {
      options.onProgress(i + 1, simulationsCount);
    }
    if (i % 5 === 4) {
      await new Promise<void>(resolve => setTimeout(resolve, 0));
    }
  }

  return {
    kind: 'synthetic_paired',
    executedAt: Date.now(),
    baseSeed,
    simulationsCount,
    ticketCount,
    betSize,
    ticketPrice,
    hybrid: aggregateStrategyRecords('hybrid_combinatorial', 'Estratégia Híbrida', hybridRecords, ticketCount, betSize, ticketPrice),
    pureCombinatorial: aggregateStrategyRecords('combinatorial_cover', 'Cobertura Combinatória Pura', pureRecords, ticketCount, betSize, ticketPrice),
    randomBaseline: aggregateStrategyRecords('random_distinct', 'Carteira Aleatória Pareada', randomRecords, ticketCount, betSize, ticketPrice),
    comparisons: {
      hybridVsRandom: buildPairedComparison('Estratégia Híbrida vs Aleatória', hybridRecords, randomRecords),
      hybridVsPure: buildPairedComparison('Estratégia Híbrida vs Cobertura Pura', hybridRecords, pureRecords),
      pureVsRandom: buildPairedComparison('Cobertura Pura vs Aleatória', pureRecords, randomRecords)
    },
    sampleDrawsPreview: preview
  };
}

/**
 * Executa Backtest Cronológico Walk-Forward utilizando exclusivamente os concursos
 * oficiais disponíveis no arquivo histórico local (em ordem crescente de concurso),
 * garantindo causalidade estrita (apenas concursos < t são conhecidos em t).
 */
export async function runChronologicalPortfolioBacktest(options?: {
  ticketCount?: number;
  betSize?: number;
  baseSeed?: number;
  maxContests?: number;
  candidatesPerTicket?: number;
  latestOfficialDraw?: OfficialDrawResult;
  onProgress?: (completed: number, total: number) => void;
}): Promise<ChronologicalBacktestReport> {
  const ticketCount = Math.max(5, Math.min(200, Math.trunc(options?.ticketCount ?? 78)));
  const betSize = Math.max(6, Math.min(10, Math.trunc(options?.betSize ?? 6)));
  const ticketPrice = 5.0;
  const candidatesPerTicket = options?.candidatesPerTicket ?? 180;
  const baseSeed =
    options?.baseSeed ??
    deriveDeterministicSeed({
      contestNumber: 3010,
      portfolioSize: ticketCount,
      betSize,
      salt: 88211
    });

  // getHistoricalDrawsForBacktest retorna ordem decrescente; invertemos para ordem cronológica estrita
  const allDesc = getHistoricalDrawsForBacktest('megasena', options?.latestOfficialDraw);
  const allAsc = [...allDesc].sort((a, b) => a.contest - b.contest);
  const totalAvailableInArchive = allAsc.length;
  const limit = Math.max(5, Math.min(totalAvailableInArchive, options?.maxContests ?? Math.min(62, totalAvailableInArchive)));
  const targetWindow = allAsc.slice(allAsc.length - limit);

  const hybridRecords: RawIterationRecord[] = [];
  const pureRecords: RawIterationRecord[] = [];
  const randomRecords: RawIterationRecord[] = [];
  const timeline: ChronologicalBacktestReport['perContestTimeline'] = [];

  for (let i = 0; i < targetWindow.length; i++) {
    const draw = targetWindow[i];
    // Garantia causal explícita: priorDraws contém apenas concursos com contest < draw.contest
    const priorDrawsCount = allAsc.filter(d => d.contest < draw.contest).length;

    const iterHybridSeed = deriveDeterministicSeed({
      contestNumber: draw.contest,
      portfolioSize: ticketCount,
      betSize,
      salt: baseSeed + priorDrawsCount
    });
    const iterRandomSeed = deriveDeterministicSeed({
      contestNumber: draw.contest,
      portfolioSize: ticketCount,
      betSize,
      salt: baseSeed + 503 + priorDrawsCount
    });

    const hybridRes = generateHybridCoveragePortfolio({
      portfolioSize: ticketCount,
      betSize,
      maxNum: 60,
      seed: iterHybridSeed,
      candidatesPerTicket
    });

    const pureGames = generateCombinatorialPortfolio(ticketCount, {
      betSize,
      maxNum: 60,
      useStructuralPlausibility: false,
      candidatesPerTicket: Math.min(candidatesPerTicket, 160)
    });

    const randRng = new SeededRng(iterRandomSeed);
    const randomGames = generateRandomDistinctPortfolio(ticketCount, betSize, 60, () => randRng.next());

    const hRec = recordIteration(hybridRes.games, draw.numbers, hybridRes.coverage, hybridRes.structuralMetrics);
    const pRec = recordIteration(pureGames, draw.numbers);
    const rRec = recordIteration(randomGames, draw.numbers);

    hybridRecords.push(hRec);
    pureRecords.push(pRec);
    randomRecords.push(rRec);

    timeline.push({
      contest: draw.contest,
      date: draw.date,
      drawnNumbers: draw.numbers,
      hybridMaxHits: hRec.maxHits,
      hybridTernos: hRec.ternos,
      hybridQuadrasPlus: hRec.quadras + hRec.quinas + hRec.senas,
      pureMaxHits: pRec.maxHits,
      pureTernos: pRec.ternos,
      pureQuadrasPlus: pRec.quadras + pRec.quinas + pRec.senas,
      randomMaxHits: rRec.maxHits,
      randomTernos: rRec.ternos,
      randomQuadrasPlus: rRec.quadras + rRec.quinas + rRec.senas
    });

    if (options?.onProgress && (i % 4 === 3 || i === targetWindow.length - 1)) {
      options.onProgress(i + 1, targetWindow.length);
    }
    if (i % 4 === 3) {
      await new Promise<void>(resolve => setTimeout(resolve, 0));
    }
  }

  return {
    kind: 'chronological_walk_forward',
    executedAt: Date.now(),
    baseSeed,
    contestsEvaluated: targetWindow.length,
    totalAvailableInArchive,
    startContest: targetWindow[0]?.contest ?? 0,
    endContest: targetWindow[targetWindow.length - 1]?.contest ?? 0,
    ticketCount,
    betSize,
    ticketPrice,
    historicalPrizesAvailable: false,
    historicalLimitationNote: `A base histórica local contém as dezenas sorteadas de ${totalAvailableInArchive.toLocaleString('pt-BR')} concursos detalhados (#${allAsc[0]?.contest ?? 1}–#${allAsc[allAsc.length - 1]?.contest ?? 3087}), com janela avaliada de ${targetWindow.length} concursos (#${targetWindow[0]?.contest ?? 1}–#${targetWindow[targetWindow.length - 1]?.contest ?? 3087}), sem tabela histórica de valores pagos por faixa (Quadra/Quina/Sena). Por integridade financeira, apenas o custo real das apostas é contabilizado e nenhum prêmio médio fictício é inventado.`,
    hybrid: aggregateStrategyRecords('hybrid_combinatorial', 'Estratégia Híbrida', hybridRecords, ticketCount, betSize, ticketPrice),
    pureCombinatorial: aggregateStrategyRecords('combinatorial_cover', 'Cobertura Combinatória Pura', pureRecords, ticketCount, betSize, ticketPrice),
    randomBaseline: aggregateStrategyRecords('random_distinct', 'Carteira Aleatória Pareada', randomRecords, ticketCount, betSize, ticketPrice),
    comparisons: {
      hybridVsRandom: buildPairedComparison('Estratégia Híbrida vs Aleatória', hybridRecords, randomRecords),
      hybridVsPure: buildPairedComparison('Estratégia Híbrida vs Cobertura Pura', hybridRecords, pureRecords),
      pureVsRandom: buildPairedComparison('Cobertura Pura vs Aleatória', pureRecords, randomRecords)
    },
    perContestTimeline: timeline
  };
}
