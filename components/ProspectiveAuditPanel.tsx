import React, { useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
  FlaskConical,
  Scale,
  Plus,
  Download,
  Eye,
  Trash2,
  AlertTriangle,
  Sparkles,
  BarChart3,
  Clock,
  FileDown,
  History,
  GitCompare,
  RefreshCw,
  Check,
  XCircle
} from 'lucide-react';
import { GeneratorLogic, OfficialDrawResult } from '../types';
import { generatePortfolioWithRules } from '../utils/lotteryRules';
import { exportProspectiveAuditPdf } from '../utils/comparatorPdfExport';
import {
  ProspectiveAuditEntry,
  analyzePortfolioCoverage,
  computeCommitmentHash,
  drawRandomTicket,
  evaluatePortfolioAgainstDraw,
  generateCombinatorialPortfolio,
  generateRandomDistinctPortfolio,
  twoProportionZTest,
  verifyCommitmentHash
} from '../utils/portfolioOptimizer';
import {
  analyzePortfolioStructuralMetrics,
  createExplicitRandomSeed,
  deriveDeterministicSeed,
  generateHybridCoveragePortfolio,
  SeededRng
} from '../utils/hybridCoverageStrategy';
import {
  ChronologicalBacktestReport,
  runChronologicalPortfolioBacktest,
  runThreeWayPairedBenchmark,
  ThreeWayBenchmarkReport
} from '../utils/hybridBenchmarkEngine';
import { BET_COST_BY_SIZE_MEGA } from '../utils/probabilityEngine';

interface ProspectiveAuditPanelProps {
  logicOptions: GeneratorLogic;
  latestOfficialDraw: OfficialDrawResult;
  onSaveGamesToHistory?: (games: number[][], label: string) => void;
}

const STORAGE_KEY = 'mega_sorte_prospective_ledger_v1';

type AuditSectionTab = 'prospective' | 'benchmark3way' | 'walkforward';
type StrategyAuditChoice = 'combinatorial_cover' | 'hybrid_combinatorial' | 'combinatorial_plausible' | 'classic_dedup';

export const ProspectiveAuditPanel: React.FC<ProspectiveAuditPanelProps> = ({
  logicOptions,
  latestOfficialDraw,
  onSaveGamesToHistory
}) => {
  const [entries, setEntries] = useState<ProspectiveAuditEntry[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as ProspectiveAuditEntry[];
    } catch {
      // ignore corrupted localStorage
    }
    return [];
  });

  const [sectionTab, setSectionTab] = useState<AuditSectionTab>('prospective');
  const [targetContest, setTargetContest] = useState<number>(() => (latestOfficialDraw?.contestNumber || 3069) + 1);
  const [ticketCount, setTicketCount] = useState<number>(78);
  const [auditBetSize, setAuditBetSize] = useState<6 | 7 | 8>(6);
  const [strategyChoice, setStrategyChoice] = useState<StrategyAuditChoice>('hybrid_combinatorial');
  const [seedInput, setSeedInput] = useState<string>(() => String(createExplicitRandomSeed()));

  const activeTicketPrice = BET_COST_BY_SIZE_MEGA[auditBetSize] || 5.0;

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSimulating50, setIsSimulating50] = useState(false);
  const [viewFilter, setViewFilter] = useState<'real' | 'synthetic' | 'all'>('real');
  const [drawInputs, setDrawInputs] = useState<Record<string, string>>({});
  const [drawErrors, setDrawErrors] = useState<Record<string, string>>({});
  const [inspectedEntryId, setInspectedEntryId] = useState<string | null>(null);
  const [hashVerifyStatus, setHashVerifyStatus] = useState<Record<string, 'valid' | 'invalid'>>({});
  const [prizeInputs, setPrizeInputs] = useState<Record<string, { opt: string; rand: string }>>({});

  // Estado do Benchmark Pareado 3 Vias (Seção 9)
  const [benchmarkCount, setBenchmarkCount] = useState<number>(50);
  const [benchmarkSeed, setBenchmarkSeed] = useState<number>(2026078);
  const [isRunning3Way, setIsRunning3Way] = useState(false);
  const [benchmarkProgress, setBenchmarkProgress] = useState<{ done: number; total: number }>({ done: 0, total: 50 });
  const [benchmarkReport, setBenchmarkReport] = useState<ThreeWayBenchmarkReport | null>(null);

  // Estado do Backtest Cronológico Walk-Forward (Seção 10)
  const [isRunningWalkForward, setIsRunningWalkForward] = useState(false);
  const [walkForwardProgress, setWalkForwardProgress] = useState<{ done: number; total: number }>({ done: 0, total: 62 });
  const [walkForwardReport, setWalkForwardReport] = useState<ChronologicalBacktestReport | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // ignore storage quota errors
    }
  }, [entries]);

  const resolvedCommitSeed = useMemo(() => {
    const num = Number(seedInput);
    if (Number.isFinite(num) && num >= 1) return Math.trunc(num);
    return deriveDeterministicSeed({
      contestNumber: targetContest,
      portfolioSize: ticketCount,
      betSize: auditBetSize
    });
  }, [seedInput, targetContest, ticketCount, auditBetSize]);

  const handleCommitPortfolio = async () => {
    setIsGenerating(true);
    try {
      const safeSize = Math.max(5, Math.min(200, Number(ticketCount) || 78));
      const commitSeed = resolvedCommitSeed;
      const randomSeed = deriveDeterministicSeed({
        contestNumber: targetContest,
        portfolioSize: safeSize,
        betSize: auditBetSize,
        salt: commitSeed + 997
      });

      let optimizedGames: number[][];
      let strategyLabel: string;

      if (strategyChoice === 'hybrid_combinatorial') {
        const res = generateHybridCoveragePortfolio({
          portfolioSize: safeSize,
          betSize: auditBetSize,
          maxNum: 60,
          seed: commitSeed,
          candidatesPerTicket: 320
        });
        optimizedGames = res.games;
        strategyLabel = `Estratégia Híbrida (${auditBetSize} dez. · Seed ${res.seed})`;
      } else if (strategyChoice === 'combinatorial_cover') {
        optimizedGames = generateCombinatorialPortfolio(safeSize, {
          betSize: auditBetSize,
          maxNum: 60,
          useStructuralPlausibility: false
        });
        strategyLabel = `Cobertura Combinatória Pura (${auditBetSize} dez.)`;
      } else if (strategyChoice === 'combinatorial_plausible') {
        optimizedGames = generateCombinatorialPortfolio(safeSize, {
          betSize: auditBetSize,
          maxNum: 60,
          useStructuralPlausibility: true
        });
        strategyLabel = `Cobertura + Plausibilidade (${auditBetSize} dez.)`;
      } else {
        const res = generatePortfolioWithRules(safeSize, auditBetSize, {
          ...logicOptions,
          calculationStrategy:
            logicOptions.calculationStrategy === 'combinatorial_cover' ||
            logicOptions.calculationStrategy === 'hybrid_combinatorial'
              ? 'balanced'
              : logicOptions.calculationStrategy
        }, latestOfficialDraw.numbers);
        optimizedGames = res.games.map(g => g.numbers);
        strategyLabel = `Algoritmo Clássico Deduplicado (${auditBetSize} dez.)`;
      }

      const randRng = new SeededRng(randomSeed);
      const randomBaselineGames = generateRandomDistinctPortfolio(safeSize, auditBetSize, 60, () => randRng.next());
      const createdAt = Date.now();
      const commitmentHash = await computeCommitmentHash({
        targetContest,
        createdAt,
        optimizedGames,
        randomBaselineGames,
        strategyKey: strategyChoice,
        seed: commitSeed,
        randomSeed
      });

      const newEntry: ProspectiveAuditEntry = {
        id: `prosp_${targetContest}_${createdAt}`,
        targetContest,
        createdAt,
        strategyLabel,
        strategyKey: strategyChoice,
        seed: commitSeed,
        randomSeed,
        hashVersion: 2,
        ticketCount: safeSize,
        betSize: auditBetSize,
        ticketPrice: activeTicketPrice,
        totalCost: safeSize * activeTicketPrice,
        optimizedGames,
        randomBaselineGames,
        commitmentHash,
        locked: true,
        isSyntheticTest: false,
        optimizedCoverage: analyzePortfolioCoverage(optimizedGames, 60),
        randomCoverage: analyzePortfolioCoverage(randomBaselineGames, 60),
        structuralMetrics: analyzePortfolioStructuralMetrics(optimizedGames)
      };

      setEntries(prev => [newEntry, ...prev]);
      setTargetContest(c => c + 1);
      setSeedInput(String(createExplicitRandomSeed(entries.length + 2)));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleVerifyEntryHash = async (entry: ProspectiveAuditEntry) => {
    const ok = await verifyCommitmentHash(entry);
    setHashVerifyStatus(prev => ({
      ...prev,
      [entry.id]: ok ? 'valid' : 'invalid'
    }));
  };

  const handleSaveRealPrizes = (entryId: string) => {
    const vals = prizeInputs[entryId];
    if (!vals) return;
    const optVal = Number(vals.opt.replace(',', '.')) || 0;
    const randVal = Number(vals.rand.replace(',', '.')) || 0;
    setEntries(prev =>
      prev.map(e =>
        e.id === entryId
          ? {
              ...e,
              realPrizes: {
                optimizedPrizeTotal: Math.max(0, optVal),
                randomPrizeTotal: Math.max(0, randVal),
                note: 'Valor real informado manualmente pós-sorteio'
              }
            }
          : e
      )
    );
  };

  const handleRecordOfficialResult = (entryId: string, overrideNumbers?: number[]) => {
    const entry = entries.find(e => e.id === entryId);
    if (!entry || entry.officialDraw) return;

    let parsed: number[] = [];
    if (overrideNumbers && overrideNumbers.length === 6) {
      parsed = [...overrideNumbers].sort((a, b) => a - b);
    } else {
      const raw = (drawInputs[entryId] || '').trim();
      const tokens = raw.split(/[\s,;.\-/]+/).filter(Boolean).map(Number);
      const unique: number[] = Array.from(new Set<number>(tokens.filter(n => Number.isInteger(n) && n >= 1 && n <= 60)));
      if (unique.length !== 6) {
        setDrawErrors(prev => ({
          ...prev,
          [entryId]: 'Informe exatamente 6 dezenas válidas e distintas entre 01 e 60.'
        }));
        return;
      }
      parsed = unique.sort((a, b) => a - b);
    }

    setDrawErrors(prev => {
      const copy = { ...prev };
      delete copy[entryId];
      return copy;
    });

    const optimizedEval = evaluatePortfolioAgainstDraw(entry.optimizedGames, parsed);
    const randomEval = evaluatePortfolioAgainstDraw(entry.randomBaselineGames, parsed);

    setEntries(prev =>
      prev.map(e =>
        e.id === entryId
          ? {
              ...e,
              officialDraw: {
                contestNumber: entry.targetContest,
                date: new Date().toLocaleDateString('pt-BR'),
                numbers: parsed,
                recordedAt: Date.now()
              },
              optimizedEval,
              randomEval
            }
          : e
      )
    );
  };

  const handleRun50SyntheticProspective = async () => {
    setIsSimulating50(true);
    try {
      const safeSize = Math.max(10, Math.min(100, Number(ticketCount) || 78));
      const baseContest = (latestOfficialDraw?.contestNumber || 3069) + 100;
      const batch: ProspectiveAuditEntry[] = [];

      for (let i = 0; i < 50; i++) {
        const iterSeed = deriveDeterministicSeed({
          contestNumber: baseContest + i,
          portfolioSize: safeSize,
          betSize: auditBetSize,
          salt: resolvedCommitSeed
        });
        const iterRandSeed = deriveDeterministicSeed({
          contestNumber: baseContest + i,
          portfolioSize: safeSize,
          betSize: auditBetSize,
          salt: resolvedCommitSeed + 701
        });
        const usePlausibility = strategyChoice === 'combinatorial_plausible';

        let optimizedGames: number[][];
        if (strategyChoice === 'hybrid_combinatorial') {
          optimizedGames = generateHybridCoveragePortfolio({
            portfolioSize: safeSize,
            betSize: auditBetSize,
            maxNum: 60,
            seed: iterSeed,
            candidatesPerTicket: 180
          }).games;
        } else if (strategyChoice === 'classic_dedup') {
          optimizedGames = generatePortfolioWithRules(
            safeSize,
            auditBetSize,
            { ...logicOptions, calculationStrategy: 'balanced' },
            latestOfficialDraw.numbers
          ).games.map(g => g.numbers);
        } else {
          optimizedGames = generateCombinatorialPortfolio(safeSize, {
            betSize: auditBetSize,
            maxNum: 60,
            useStructuralPlausibility: usePlausibility,
            candidatesPerTicket: 160
          });
        }

        const randRng = new SeededRng(iterRandSeed);
        const randomBaselineGames = generateRandomDistinctPortfolio(safeSize, auditBetSize, 60, () => randRng.next());
        const createdAt = Date.now() + i;
        const cNum = baseContest + i;
        const commitmentHash = await computeCommitmentHash({
          targetContest: cNum,
          createdAt,
          optimizedGames,
          randomBaselineGames,
          strategyKey: strategyChoice,
          seed: iterSeed,
          randomSeed: iterRandSeed
        });

        const drawRng = new SeededRng(iterSeed + 31337);
        const simulatedDraw = drawRandomTicket(6, 60, () => drawRng.next());
        const optimizedEval = evaluatePortfolioAgainstDraw(optimizedGames, simulatedDraw);
        const randomEval = evaluatePortfolioAgainstDraw(randomBaselineGames, simulatedDraw);

        batch.push({
          id: `synth_${cNum}_${createdAt}`,
          targetContest: cNum,
          createdAt,
          strategyLabel:
            strategyChoice === 'hybrid_combinatorial'
              ? `Estratégia Híbrida (${auditBetSize} dez. · Seed ${iterSeed})`
              : strategyChoice === 'classic_dedup'
              ? `Clássico Deduplicado (${auditBetSize} dez.)`
              : usePlausibility
              ? `Cobertura + Plausibilidade (${auditBetSize} dez.)`
              : `Cobertura Combinatória Pura (${auditBetSize} dez.)`,
          strategyKey: strategyChoice,
          seed: iterSeed,
          randomSeed: iterRandSeed,
          hashVersion: 2,
          ticketCount: safeSize,
          betSize: auditBetSize,
          ticketPrice: activeTicketPrice,
          totalCost: safeSize * activeTicketPrice,
          optimizedGames,
          randomBaselineGames,
          commitmentHash,
          locked: true,
          isSyntheticTest: true,
          optimizedCoverage: analyzePortfolioCoverage(optimizedGames, 60),
          randomCoverage: analyzePortfolioCoverage(randomBaselineGames, 60),
          structuralMetrics: analyzePortfolioStructuralMetrics(optimizedGames),
          officialDraw: {
            contestNumber: cNum,
            date: 'Simulação Prospectiva',
            numbers: simulatedDraw,
            recordedAt: createdAt + 1
          },
          optimizedEval,
          randomEval
        });

        if (i % 5 === 4) {
          await new Promise<void>(resolve => setTimeout(resolve, 0));
        }
      }

      setEntries(prev => [...batch.reverse(), ...prev.filter(e => !e.isSyntheticTest)]);
      setViewFilter('synthetic');
    } finally {
      setIsSimulating50(false);
    }
  };

  const handleRunThreeWayBenchmark = async () => {
    setIsRunning3Way(true);
    setBenchmarkProgress({ done: 0, total: benchmarkCount });
    try {
      const safeSize = Math.max(5, Math.min(200, Number(ticketCount) || 78));
      const report = await runThreeWayPairedBenchmark({
        simulationsCount: benchmarkCount,
        ticketCount: safeSize,
        betSize: auditBetSize,
        ticketPrice: activeTicketPrice,
        baseSeed: benchmarkSeed,
        candidatesPerTicket: 180,
        onProgress: (done, total) => setBenchmarkProgress({ done, total })
      });
      setBenchmarkReport(report);
    } finally {
      setIsRunning3Way(false);
    }
  };

  const handleRunChronologicalBacktest = async () => {
    setIsRunningWalkForward(true);
    setWalkForwardProgress({ done: 0, total: 62 });
    try {
      const safeSize = Math.max(5, Math.min(200, Number(ticketCount) || 78));
      const report = await runChronologicalPortfolioBacktest({
        ticketCount: safeSize,
        betSize: auditBetSize,
        ticketPrice: activeTicketPrice,
        baseSeed: benchmarkSeed,
        candidatesPerTicket: 160,
        latestOfficialDraw,
        onProgress: (done, total) => setWalkForwardProgress({ done, total })
      });
      setWalkForwardReport(report);
    } finally {
      setIsRunningWalkForward(false);
    }
  };

  const handleClearSynthetic = () => {
    setEntries(prev => prev.filter(e => !e.isSyntheticTest));
    if (viewFilter === 'synthetic') setViewFilter('real');
  };

  const visibleEntries = useMemo(() => {
    if (viewFilter === 'real') return entries.filter(e => !e.isSyntheticTest);
    if (viewFilter === 'synthetic') return entries.filter(e => e.isSyntheticTest);
    return entries;
  }, [entries, viewFilter]);

  const evaluatedEntries = useMemo(
    () => visibleEntries.filter(e => e.officialDraw && e.optimizedEval && e.randomEval),
    [visibleEntries]
  );

  const aggregate = useMemo(() => {
    const n = evaluatedEntries.length;
    let optTernos = 0;
    let optQuadras = 0;
    let optQuinas = 0;
    let optSenas = 0;
    let optContestsWith3Plus = 0;
    let optContestsWith4Plus = 0;

    let randTernos = 0;
    let randQuadras = 0;
    let randQuinas = 0;
    let randSenas = 0;
    let randContestsWith3Plus = 0;
    let randContestsWith4Plus = 0;

    let pairCovSum = 0;
    let randPairCovSum = 0;
    let tripleCovSum = 0;
    let randTripleCovSum = 0;
    let totalBets = 0;
    let totalCost = 0;
    let totalOptRealPrize = 0;
    let totalRandRealPrize = 0;
    let realPrizesRecordedCount = 0;

    for (const e of evaluatedEntries) {
      const oe = e.optimizedEval!;
      const re = e.randomEval!;
      optTernos += oe.ternos;
      optQuadras += oe.quadras;
      optQuinas += oe.quinas;
      optSenas += oe.senas;
      if (oe.hasAny3Plus) optContestsWith3Plus++;
      if (oe.hasAny4Plus) optContestsWith4Plus++;

      randTernos += re.ternos;
      randQuadras += re.quadras;
      randQuinas += re.quinas;
      randSenas += re.senas;
      if (re.hasAny3Plus) randContestsWith3Plus++;
      if (re.hasAny4Plus) randContestsWith4Plus++;

      pairCovSum += e.optimizedCoverage.pairCoveragePct;
      randPairCovSum += e.randomCoverage.pairCoveragePct;
      tripleCovSum += e.optimizedCoverage.tripleCoveragePct;
      randTripleCovSum += e.randomCoverage.tripleCoveragePct;
      totalBets += e.ticketCount;
      totalCost += e.totalCost;
      if (e.realPrizes && (e.realPrizes.optimizedPrizeTotal !== undefined || e.realPrizes.randomPrizeTotal !== undefined)) {
        realPrizesRecordedCount++;
        totalOptRealPrize += e.realPrizes.optimizedPrizeTotal || 0;
        totalRandRealPrize += e.realPrizes.randomPrizeTotal || 0;
      }
    }

    const zTest3Plus = twoProportionZTest(optContestsWith3Plus, n, randContestsWith3Plus, n);
    const zTest4Plus = twoProportionZTest(optContestsWith4Plus, n, randContestsWith4Plus, n);

    return {
      count: n,
      totalBets,
      totalCost,
      totalOptRealPrize,
      totalRandRealPrize,
      realPrizesRecordedCount,
      optTernos,
      optQuadras,
      optQuinas,
      optSenas,
      optContestsWith3Plus,
      optContestsWith4Plus,
      optRate3Plus: n > 0 ? (optContestsWith3Plus / n) * 100 : 0,
      optRate4Plus: n > 0 ? (optContestsWith4Plus / n) * 100 : 0,
      randTernos,
      randQuadras,
      randQuinas,
      randSenas,
      randContestsWith3Plus,
      randContestsWith4Plus,
      randRate3Plus: n > 0 ? (randContestsWith3Plus / n) * 100 : 0,
      randRate4Plus: n > 0 ? (randContestsWith4Plus / n) * 100 : 0,
      avgOptPairCov: n > 0 ? pairCovSum / n : 0,
      avgRandPairCov: n > 0 ? randPairCovSum / n : 0,
      avgOptTripleCov: n > 0 ? tripleCovSum / n : 0,
      avgRandTripleCov: n > 0 ? randTripleCovSum / n : 0,
      zTest3Plus,
      zTest4Plus
    };
  }, [evaluatedEntries]);

  const cumulativeSeries = useMemo(() => {
    const chrono = [...evaluatedEntries].sort((a, b) => a.targetContest - b.targetContest);
    let optCum3 = 0;
    let randCum3 = 0;
    return chrono.map((e, idx) => {
      if (e.optimizedEval?.hasAny3Plus) optCum3++;
      if (e.randomEval?.hasAny3Plus) randCum3++;
      return {
        index: idx + 1,
        contest: e.targetContest,
        optRate: (optCum3 / (idx + 1)) * 100,
        randRate: (randCum3 / (idx + 1)) * 100,
        optCumHits: optCum3,
        randCumHits: randCum3
      };
    });
  }, [evaluatedEntries]);

  const handleExportLedgerJSON = () => {
    const data = JSON.stringify(visibleEntries, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auditoria_prospectiva_megasena_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportAuditPdf = () => {
    const filterLabel =
      viewFilter === 'real'
        ? 'Concursos Reais'
        : viewFilter === 'synthetic'
        ? 'Benchmark Prospectivo (50 Sorteios)'
        : 'Todos os Registros';
    exportProspectiveAuditPdf({
      entries: visibleEntries,
      viewFilterLabel: filterLabel,
      aggregate
    });
  };

  const inspectedEntry = entries.find(e => e.id === inspectedEntryId) || null;
  const realCount = entries.filter(e => !e.isSyntheticTest && e.officialDraw).length;

  return (
    <div className="space-y-6">
      {/* Cabeçalho Científico do Protocolo Prospectivo */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-7 border border-emerald-800/70 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                <ShieldCheck size={12} /> Protocolo Commit-Before-Draw (SHA-256)
              </span>
              <span className="text-xs text-slate-300 font-semibold">
                Auditoria Real: {realCount} / 50 concursos acumulados
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
              <Scale size={22} className="text-emerald-400" />
              <span>Auditoria Prospectiva, Benchmark &amp; Backtest Causal</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Separa estritamente a <strong>auditoria prospectiva real (SHA-256 + Seed)</strong>, o <strong>benchmark sintético pareado (50+ simulações)</strong> e o <strong>backtest cronológico walk-forward</strong>. Compara a Estratégia Híbrida, Cobertura Combinatória Pura e Carteira Aleatória com o mesmo orçamento.
            </p>
          </div>

          <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-3.5 min-w-[210px] space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
              <span>Progresso Real (50 conc.)</span>
              <span className="text-emerald-400 font-black">{Math.min(100, Math.round((realCount / 50) * 100))}%</span>
            </div>
            <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${Math.min(100, (realCount / 50) * 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400">
              {realCount} reais concluídos • {entries.filter(e => !e.isSyntheticTest && !e.officialDraw).length} aguardando sorteio
            </p>
          </div>
        </div>

        {/* Navegação clara entre os 3 ambientes científicos */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
          {[
            { id: 'prospective' as const, label: '1. Auditoria Prospectiva Real (SHA-256)', icon: <Lock size={14} /> },
            { id: 'benchmark3way' as const, label: '2. Benchmark 3 Vias (Híbrida × Pura × Aleatória)', icon: <GitCompare size={14} /> },
            { id: 'walkforward' as const, label: '3. Backtest Cronológico Walk-Forward', icon: <History size={14} /> }
          ].map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSectionTab(t.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                sectionTab === t.id
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SEÇÃO 1: AUDITORIA PROSPECTIVA REAL (COMMIT-BEFORE-DRAW SHA-256)      */}
      {/* ===================================================================== */}
      {sectionTab === 'prospective' && (
        <>
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Lock size={18} className="text-emerald-600" />
                  <span>Gerar &amp; Travar Carteira Antes do Sorteio</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Registra estratégia, seed determinística, cobertura de pares/trincas, métricas estruturais e hash SHA-256 junto a uma carteira aleatória controle.
                </p>
              </div>
              <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl">
                Orçamento: R$ {(ticketCount * activeTicketPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({ticketCount} × {auditBetSize} dez.)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Concurso Alvo */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 block">Concurso Alvo (Futuro)</label>
                <input
                  type="number"
                  min={1}
                  value={targetContest}
                  onChange={e => setTargetContest(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-black text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[11px] text-slate-500 block">
                  Último concurso carregado: #{latestOfficialDraw?.contestNumber || 3069}
                </span>
              </div>

              {/* Quantidade de Jogos & Dezenas por Jogo */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 block">Tamanho da Carteira &amp; Dezenas</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={5}
                    max={200}
                    value={ticketCount}
                    onChange={e => setTicketCount(Math.max(5, Math.min(200, Number(e.target.value) || 78)))}
                    className="w-20 px-2.5 py-2.5 rounded-xl border border-slate-200 font-black text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <div className="flex flex-wrap gap-1">
                    {[10, 30, 55, 78].map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setTicketCount(preset)}
                        className={`px-2 py-2 rounded-lg text-xs font-black border cursor-pointer transition-colors ${
                          ticketCount === preset
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1 pt-0.5">
                  <span className="text-[10px] font-bold text-slate-500 mr-1">Dezenas/jogo:</span>
                  {([6, 7, 8] as const).map(sz => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setAuditBetSize(sz)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-black border cursor-pointer transition-colors ${
                        auditBetSize === sz
                          ? 'bg-cyan-700 text-white border-cyan-700'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {sz} dez.
                    </button>
                  ))}
                </div>
              </div>

              {/* Estratégia */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 block">Estratégia da Carteira</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'hybrid_combinatorial' as const, label: '🧬 Estratégia Híbrida' },
                    { id: 'combinatorial_cover' as const, label: '🛡️ Cobertura Pura' },
                    { id: 'combinatorial_plausible' as const, label: '✨ Cob. + Plausib.' },
                    { id: 'classic_dedup' as const, label: '🎯 Clássico Dedup.' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setStrategyChoice(opt.id)}
                      className={`px-2.5 py-2 rounded-xl text-[11px] font-black border text-left transition-all cursor-pointer ${
                        strategyChoice === opt.id
                          ? opt.id === 'hybrid_combinatorial'
                            ? 'bg-cyan-700 text-white border-cyan-700 shadow-xs'
                            : 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Seed Determinística */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 block">Seed Determinística</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    value={seedInput}
                    onChange={e => setSeedInput(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-mono font-bold text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setSeedInput(String(createExplicitRandomSeed(entries.length + 1)))}
                    title="Gerar nova seed"
                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer"
                  >
                    <RefreshCw size={15} />
                  </button>
                </div>
                <span className="text-[11px] text-slate-500 block">
                  Mesma seed + parâmetros = carteira idêntica.
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleCommitPortfolio}
                  disabled={isGenerating || isSimulating50}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm px-5 py-3 rounded-2xl shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Plus size={16} />
                  <span>{isGenerating ? 'Otimizando Carteira...' : `Registrar e Travar Concurso #${targetContest}`}</span>
                </button>

                <button
                  type="button"
                  onClick={handleRun50SyntheticProspective}
                  disabled={isSimulating50 || isGenerating}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-3 rounded-2xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <FlaskConical size={15} className="text-emerald-400" />
                  <span>{isSimulating50 ? 'Executando 50 Concursos...' : 'Gerar 50 Registros Sintéticos no Ledger'}</span>
                </button>
              </div>

              {visibleEntries.length > 0 && (
                <div className="flex items-center gap-2">
                  {entries.some(e => e.isSyntheticTest) && (
                    <button
                      type="button"
                      onClick={handleClearSynthetic}
                      className="text-xs font-bold text-rose-700 hover:bg-rose-50 px-3 py-2 rounded-xl border border-rose-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 size={14} />
                      <span>Limpar Simulações</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleExportLedgerJSON}
                    className="text-xs font-bold text-slate-700 hover:bg-slate-100 px-3 py-2 rounded-xl border border-slate-200 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download size={14} />
                    <span>Exportar Ledger JSON</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportAuditPdf}
                    className="text-xs font-black text-white bg-slate-900 hover:bg-slate-800 px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <FileDown size={14} />
                    <span>Gerar PDF</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Desempenho Acumulado do Ledger */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <BarChart3 size={18} className="text-emerald-600" />
                  <span>Desempenho Acumulado no Ledger (Otimizada vs Aleatória Pareada)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Comparação pareada em concursos encerrados: mesma quantidade de jogos e mesmo sorteio.
                </p>
              </div>

              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-black">
                {[
                  { id: 'real', label: `Reais (${entries.filter(e => !e.isSyntheticTest).length})` },
                  { id: 'synthetic', label: `Sintéticos (${entries.filter(e => e.isSyntheticTest).length})` },
                  { id: 'all', label: `Todos (${entries.length})` }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setViewFilter(tab.id as typeof viewFilter)}
                    className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                      viewFilter === tab.id ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {aggregate.count === 0 ? (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6 text-center space-y-2">
                <Clock size={24} className="mx-auto text-slate-400" />
                <p className="text-sm font-bold text-slate-700">
                  Nenhum concurso encerrado neste filtro ainda.
                </p>
                <p className="text-xs text-slate-500 max-w-lg mx-auto">
                  Trave uma carteira acima para o próximo concurso e incorpore o resultado oficial após o sorteio, ou explore as abas <strong>Benchmark 3 Vias</strong> e <strong>Backtest Cronológico</strong>.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 space-y-1">
                    <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800">Concursos c/ 3+ Acertos</span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-black text-emerald-900">{aggregate.optRate3Plus.toFixed(1)}%</span>
                      <span className="text-xs font-bold text-slate-600">vs {aggregate.randRate3Plus.toFixed(1)}% aleat.</span>
                    </div>
                    <span className="text-[11px] text-emerald-700 font-semibold block">
                      {aggregate.optContestsWith3Plus}/{aggregate.count} conc. (Δ {aggregate.zTest3Plus.diffPctPoints >= 0 ? '+' : ''}{aggregate.zTest3Plus.diffPctPoints.toFixed(1)} p.p.)
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">Ternos / Quadras Totais</span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-black text-slate-900">{aggregate.optTernos} / {aggregate.optQuadras}</span>
                      <span className="text-xs font-bold text-slate-500">vs {aggregate.randTernos} / {aggregate.randQuadras}</span>
                    </div>
                    <span className="text-[11px] text-slate-600 font-semibold block">
                      Quinas: {aggregate.optQuinas} vs {aggregate.randQuinas} • Senas: {aggregate.optSenas} vs {aggregate.randSenas}
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">Cobertura Média Pares &amp; Trincas</span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-black text-slate-900">{aggregate.avgOptPairCov.toFixed(1)}%</span>
                      <span className="text-xs font-bold text-slate-500">vs {aggregate.avgRandPairCov.toFixed(1)}%</span>
                    </div>
                    <span className="text-[11px] text-slate-600 font-semibold block">
                      Trincas: {aggregate.avgOptTripleCov.toFixed(2)}% vs {aggregate.avgRandTripleCov.toFixed(2)}%
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">Custo &amp; Significância (Z)</span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-xl font-black text-slate-900">z = {aggregate.zTest3Plus.zScore.toFixed(2)}</span>
                      <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                        aggregate.zTest3Plus.pValue < 0.05 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                      }`}>
                        p = {aggregate.zTest3Plus.pValue.toFixed(4)}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-600 font-semibold block">
                      Custo: R$ {aggregate.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({aggregate.realPrizesRecordedCount > 0 ? `Retorno real: R$ ${aggregate.totalOptRealPrize.toFixed(2)}` : 'Prêmios reais não informados'})
                    </span>
                  </div>
                </div>

                {cumulativeSeries.length >= 2 && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-black text-slate-800">
                        Taxa Acumulada de Concursos com &ge; 1 Acerto 3+ ao Longo do Tempo
                      </span>
                      <div className="flex items-center gap-4 text-[11px] font-bold">
                        <span className="flex items-center gap-1.5 text-emerald-700">
                          <span className="w-3 h-1 bg-emerald-600 inline-block rounded-full" /> Carteira Otimizada
                        </span>
                        <span className="flex items-center gap-1.5 text-slate-600">
                          <span className="w-3 h-1 bg-slate-400 inline-block rounded-full" /> Aleatória Pareada
                        </span>
                      </div>
                    </div>

                    <div className="w-full overflow-x-auto">
                      <svg viewBox="0 0 640 160" className="w-full h-40 min-w-[420px]">
                        {[0, 25, 50, 75, 100].map(pct => {
                          const y = 140 - (pct / 100) * 120;
                          return (
                            <g key={pct}>
                              <line x1="36" y1={y} x2="625" y2={y} stroke="#e2e8f0" strokeWidth="1" />
                              <text x="4" y={y + 4} fontSize="10" fill="#64748b" fontWeight="bold">
                                {pct}%
                              </text>
                            </g>
                          );
                        })}
                        <polyline
                          fill="none"
                          stroke="#94a3b8"
                          strokeWidth="2.5"
                          strokeDasharray="4 3"
                          points={cumulativeSeries
                            .map((pt, i) => {
                              const x = 40 + (i / Math.max(1, cumulativeSeries.length - 1)) * 580;
                              const y = 140 - (pt.randRate / 100) * 120;
                              return `${x.toFixed(1)},${y.toFixed(1)}`;
                            })
                            .join(' ')}
                        />
                        <polyline
                          fill="none"
                          stroke="#059669"
                          strokeWidth="3"
                          points={cumulativeSeries
                            .map((pt, i) => {
                              const x = 40 + (i / Math.max(1, cumulativeSeries.length - 1)) * 580;
                              const y = 140 - (pt.optRate / 100) * 120;
                              return `${x.toFixed(1)},${y.toFixed(1)}`;
                            })
                            .join(' ')}
                        />
                      </svg>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex items-start gap-2.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 text-xs text-amber-950">
              <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>Transparência matemática:</strong> A cobertura combinatória (Pura ou Híbrida) organiza a carteira para maximizar pares/trincas distintos e reduzir redundâncias entre jogos. Ela <strong>não</strong> prevê dezenas futuras e <strong>não</strong> altera a probabilidade matemática individual de um único bilhete em sorteios independentes.
              </p>
            </div>
          </div>

          {/* Ledger de Carteiras Travadas */}
          {visibleEntries.length > 0 && (
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm sm:text-base font-black text-slate-900">
                Registro Imutável de Carteiras ({visibleEntries.length})
              </h3>

              <div className="space-y-3">
                {visibleEntries.map(entry => {
                  const isEvaluated = Boolean(entry.officialDraw && entry.optimizedEval && entry.randomEval);
                  const canAutoFillOfficial =
                    !isEvaluated &&
                    latestOfficialDraw?.contestNumber === entry.targetContest &&
                    latestOfficialDraw?.numbers?.length === 6;
                  const verifyState = hashVerifyStatus[entry.id];

                  return (
                    <div
                      key={entry.id}
                      className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-slate-50/50"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-xs font-black">
                            Concurso #{entry.targetContest}
                          </span>
                          <span className="text-xs font-bold text-slate-800">{entry.strategyLabel}</span>
                          {entry.seed !== undefined && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-100 text-cyan-900">
                              Seed: {entry.seed}
                            </span>
                          )}
                          {entry.isSyntheticTest && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800">
                              Simulação
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                            <Lock size={10} /> SHA-256: {entry.commitmentHash.slice(0, 12)}…
                          </span>
                          {verifyState === 'valid' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white flex items-center gap-1">
                              <Check size={10} /> Hash Íntegro
                            </span>
                          )}
                          {verifyState === 'invalid' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white flex items-center gap-1">
                              <XCircle size={10} /> Divergência Detectada
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleVerifyEntryHash(entry)}
                            className="text-xs font-bold text-slate-700 hover:bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1 cursor-pointer"
                          >
                            <ShieldCheck size={13} className="text-emerald-600" />
                            <span>Verificar Hash</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setInspectedEntryId(inspectedEntryId === entry.id ? null : entry.id)}
                            className="text-xs font-bold text-slate-700 hover:bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1 cursor-pointer"
                          >
                            <Eye size={13} />
                            <span>{inspectedEntryId === entry.id ? 'Ocultar Jogos' : `Ver ${entry.ticketCount} Jogos`}</span>
                          </button>

                          {onSaveGamesToHistory && !entry.isSyntheticTest && (
                            <button
                              type="button"
                              onClick={() =>
                                onSaveGamesToHistory(
                                  entry.optimizedGames,
                                  `Carteira Prospectiva #${entry.targetContest} (SHA-256 ${entry.commitmentHash.slice(0, 8)})`
                                )
                              }
                              className="text-xs font-bold text-emerald-700 hover:bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1 cursor-pointer"
                            >
                              <Sparkles size={13} />
                              <span>Enviar ao Histórico</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Métricas de cobertura + estrutura */}
                      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-[11px]">
                        <div className="bg-white rounded-xl p-2 border border-slate-200">
                          <span className="text-slate-500 block">Distintos</span>
                          <strong className="text-slate-900">
                            {entry.optimizedCoverage.distinctGames}/{entry.ticketCount}
                          </strong>
                        </div>
                        <div className="bg-white rounded-xl p-2 border border-slate-200">
                          <span className="text-slate-500 block">Dezenas</span>
                          <strong className="text-slate-900">{entry.optimizedCoverage.distinctNumbers}/60</strong>
                        </div>
                        <div className="bg-white rounded-xl p-2 border border-slate-200">
                          <span className="text-slate-500 block">Pares Únicos</span>
                          <strong className="text-slate-900">
                            {entry.optimizedCoverage.uniquePairs} ({entry.optimizedCoverage.pairCoveragePct.toFixed(1)}%)
                          </strong>
                        </div>
                        <div className="bg-white rounded-xl p-2 border border-slate-200">
                          <span className="text-slate-500 block">Trincas Únicas</span>
                          <strong className="text-slate-900">
                            {entry.optimizedCoverage.uniqueTriples} ({entry.optimizedCoverage.tripleCoveragePct.toFixed(2)}%)
                          </strong>
                        </div>
                        <div className="bg-white rounded-xl p-2 border border-slate-200">
                          <span className="text-slate-500 block">Freq. &amp; Gini</span>
                          <strong className="text-slate-900">
                            {entry.optimizedCoverage.minFreq}–{entry.optimizedCoverage.maxFreq} (G {entry.optimizedCoverage.giniCoefficient.toFixed(2)})
                          </strong>
                        </div>
                        <div className="bg-white rounded-xl p-2 border border-slate-200">
                          <span className="text-slate-500 block">Estrutura</span>
                          <strong className="text-slate-900">
                            {entry.structuralMetrics
                              ? `Soma ${entry.structuralMetrics.avgSum.toFixed(0)} (${entry.structuralMetrics.pctSum160to240.toFixed(0)}%)`
                              : `Jaccard ${entry.optimizedCoverage.meanJaccard.toFixed(3)}`}
                          </strong>
                        </div>
                      </div>

                      {isEvaluated ? (
                        <div className="bg-white rounded-2xl p-3.5 border border-emerald-200 space-y-3">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div className="space-y-1">
                              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                                <CheckCircle2 size={12} /> Resultado Incorporado ({entry.officialDraw!.date})
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {entry.officialDraw!.numbers.map(num => (
                                  <span
                                    key={num}
                                    className="w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center"
                                  >
                                    {String(num).padStart(2, '0')}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                                <span className="text-[10px] font-black text-emerald-800 block uppercase">Otimizada</span>
                                <span className="font-black text-emerald-950">
                                  {entry.optimizedEval!.ternos}T • {entry.optimizedEval!.quadras}Q • {entry.optimizedEval!.quinas}Qi • {entry.optimizedEval!.senas}S
                                </span>
                              </div>
                              <div className="bg-slate-100 border border-slate-200 rounded-xl px-3 py-2">
                                <span className="text-[10px] font-black text-slate-600 block uppercase">Aleatória ({entry.ticketCount})</span>
                                <span className="font-black text-slate-800">
                                  {entry.randomEval!.ternos}T • {entry.randomEval!.quadras}Q • {entry.randomEval!.quinas}Qi • {entry.randomEval!.senas}S
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Registro opcional de valores reais recebidos pela Caixa (apenas concursos reais) */}
                          {!entry.isSyntheticTest && (
                            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2 text-[11px]">
                              <span className="font-bold text-slate-600">
                                Custo: R$ {entry.totalCost.toFixed(2).replace('.', ',')}
                              </span>
                              {entry.realPrizes ? (
                                <span className="font-black text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                                  Prêmio real informado: Otim. R$ {(entry.realPrizes.optimizedPrizeTotal || 0).toFixed(2)} | Aleat. R$ {(entry.realPrizes.randomPrizeTotal || 0).toFixed(2)}
                                </span>
                              ) : (
                                <>
                                  <input
                                    type="text"
                                    placeholder="Prêmio Otim. R$"
                                    value={prizeInputs[entry.id]?.opt || ''}
                                    onChange={e =>
                                      setPrizeInputs(prev => ({
                                        ...prev,
                                        [entry.id]: { opt: e.target.value, rand: prev[entry.id]?.rand || '' }
                                      }))
                                    }
                                    className="w-28 px-2 py-1 rounded-lg border border-slate-200 text-xs font-bold"
                                  />
                                  <input
                                    type="text"
                                    placeholder="Prêmio Aleat. R$"
                                    value={prizeInputs[entry.id]?.rand || ''}
                                    onChange={e =>
                                      setPrizeInputs(prev => ({
                                        ...prev,
                                        [entry.id]: { opt: prev[entry.id]?.opt || '', rand: e.target.value }
                                      }))
                                    }
                                    className="w-28 px-2 py-1 rounded-lg border border-slate-200 text-xs font-bold"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSaveRealPrizes(entry.id)}
                                    className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-bold cursor-pointer"
                                  >
                                    Salvar Prêmio Real
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-white rounded-2xl p-3 border border-slate-200 space-y-2">
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="text"
                              placeholder="Digite as 6 dezenas sorteadas (ex: 10 27 29 37 39 59)"
                              value={drawInputs[entry.id] || ''}
                              onChange={e =>
                                setDrawInputs(prev => ({ ...prev, [entry.id]: e.target.value }))
                              }
                              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleRecordOfficialResult(entry.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-4 py-2 rounded-xl cursor-pointer whitespace-nowrap"
                            >
                              Incorporar Resultado
                            </button>
                            {canAutoFillOfficial && (
                              <button
                                type="button"
                                onClick={() => handleRecordOfficialResult(entry.id, latestOfficialDraw.numbers)}
                                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3 py-2 rounded-xl cursor-pointer whitespace-nowrap"
                              >
                                Usar Oficial #{latestOfficialDraw.contestNumber}
                              </button>
                            )}
                          </div>
                          {drawErrors[entry.id] && (
                            <p className="text-xs font-bold text-rose-600">{drawErrors[entry.id]}</p>
                          )}
                        </div>
                      )}

                      {inspectedEntry && inspectedEntry.id === entry.id && (
                        <div className="bg-white border border-slate-200 rounded-2xl p-3 max-h-60 overflow-y-auto space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-black text-slate-700 pb-1 border-b border-slate-100">
                            <span>Bilhetes Travados — Carteira Otimizada ({entry.optimizedGames.length} jogos)</span>
                            <span className="text-slate-400 font-mono">Hash: {entry.commitmentHash.slice(0, 20)}…</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                            {entry.optimizedGames.map((g, gi) => {
                              const drawnSet = entry.officialDraw ? new Set(entry.officialDraw.numbers) : null;
                              const hitsCount = drawnSet ? g.filter(n => drawnSet.has(n)).length : 0;
                              return (
                                <div
                                  key={gi}
                                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono border ${
                                    hitsCount >= 4
                                      ? 'bg-amber-50 border-amber-300 font-black text-amber-950'
                                      : hitsCount === 3
                                      ? 'bg-emerald-50 border-emerald-300 font-bold text-emerald-950'
                                      : 'bg-slate-50 border-slate-200 text-slate-700'
                                  }`}
                                >
                                  <span>#{String(gi + 1).padStart(2, '0')}:</span>
                                  <span>{g.map(n => String(n).padStart(2, '0')).join(' - ')}</span>
                                  {drawnSet && <span className="text-[10px] font-sans font-black">{hitsCount}ac</span>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* ===================================================================== */}
      {/* SEÇÃO 2: BENCHMARK PAREADO 3 VIAS (50+ SIMULAÇÕES SINTÉTICAS)         */}
      {/* ===================================================================== */}
      {sectionTab === 'benchmark3way' && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <GitCompare size={18} className="text-cyan-700" />
                <span>Benchmark Pareado 3 Vias (Simulação Controlada)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Compara <strong>Estratégia Híbrida</strong> vs <strong>Cobertura Combinatória Pura</strong> vs <strong>Carteira Aleatória</strong> no mesmo orçamento, tamanho de carteira e sorteios pós-geração.
              </p>
            </div>
            <span className="px-3 py-1 rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-200 text-[11px] font-black">
              Simulação Sintética Pareada
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
            <div>
              <label className="text-xs font-black text-slate-700 block mb-1">Simulações Pareadas</label>
              <select
                value={benchmarkCount}
                onChange={e => setBenchmarkCount(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-black text-slate-900 bg-slate-50"
              >
                <option value={50}>50 simulações (Mín. recomendado)</option>
                <option value={100}>100 simulações</option>
                <option value={150}>150 simulações</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-black text-slate-700 block mb-1">Jogos por Carteira</label>
              <input
                type="number"
                min={10}
                max={150}
                value={ticketCount}
                onChange={e => setTicketCount(Math.max(10, Math.min(150, Number(e.target.value) || 78)))}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-black text-slate-900 bg-slate-50"
              />
            </div>
            <div>
              <label className="text-xs font-black text-slate-700 block mb-1">Dezenas / Jogo</label>
              <select
                value={auditBetSize}
                onChange={e => setAuditBetSize(Number(e.target.value) as 6 | 7 | 8)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-black text-slate-900 bg-slate-50"
              >
                <option value={6}>6 dezenas (R$ 5)</option>
                <option value={7}>7 dezenas (R$ 35)</option>
                <option value={8}>8 dezenas (R$ 140)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-black text-slate-700 block mb-1">Seed Base Reprodutível</label>
              <input
                type="number"
                min={1}
                value={benchmarkSeed}
                onChange={e => setBenchmarkSeed(Math.max(1, Math.trunc(Number(e.target.value) || 1)))}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-mono text-xs font-bold text-slate-900 bg-slate-50"
              />
            </div>
            <button
              type="button"
              onClick={handleRunThreeWayBenchmark}
              disabled={isRunning3Way}
              className="w-full py-2.5 px-4 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white font-black text-xs cursor-pointer disabled:opacity-50"
            >
              {isRunning3Way
                ? `Rodando (${benchmarkProgress.done}/${benchmarkProgress.total})...`
                : `Executar Benchmark (${benchmarkCount}x)`}
            </button>
          </div>

          {benchmarkReport && (
            <BenchmarkReportView
              strategies={[
                benchmarkReport.hybrid,
                benchmarkReport.pureCombinatorial,
                benchmarkReport.randomBaseline
              ]}
              comparisons={[
                benchmarkReport.comparisons.hybridVsRandom,
                benchmarkReport.comparisons.hybridVsPure,
                benchmarkReport.comparisons.pureVsRandom
              ]}
              subtitle={`Seed Base: ${benchmarkReport.baseSeed} • ${benchmarkReport.simulationsCount} simulações × ${benchmarkReport.ticketCount} jogos (${benchmarkReport.betSize} dez.) (Orçamento/grupo: R$ ${benchmarkReport.hybrid.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`}
            />
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* SEÇÃO 3: BACKTEST CRONOLÓGICO WALK-FORWARD (BASE HISTÓRICA REAL)      */}
      {/* ===================================================================== */}
      {sectionTab === 'walkforward' && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <History size={18} className="text-emerald-700" />
                <span>Backtest Cronológico Walk-Forward (Concursos Reais)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Avaliação sequencial em ordem crescente de concurso usando exclusivamente sorteios oficiais arquivados com causalidade estrita (&lt; t).
              </p>
            </div>
            <span className="px-3 py-1 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-black">
              Histórico Detalhado Local: 62 concursos
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="text-xs text-slate-700 space-y-1">
              <p>
                Executa <strong>Híbrida × Cobertura Pura × Aleatória</strong> com <strong>{ticketCount} jogos de {auditBetSize} dezenas</strong> por concurso ao longo dos concursos oficiais detalhados disponíveis.
              </p>
              <p className="text-[11px] text-slate-500">
                Seed Base: <span className="font-mono font-bold">{benchmarkSeed}</span> • Custo por concurso: R$ {(ticketCount * activeTicketPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <button
              type="button"
              onClick={handleRunChronologicalBacktest}
              disabled={isRunningWalkForward}
              className="py-2.5 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs cursor-pointer disabled:opacity-50"
            >
              {isRunningWalkForward
                ? `Avaliando (${walkForwardProgress.done}/${walkForwardProgress.total})...`
                : 'Executar Walk-Forward Histórico'}
            </button>
          </div>

          {walkForwardReport && (
            <div className="space-y-4">
              <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-950 flex items-start gap-2">
                <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <p>{walkForwardReport.historicalLimitationNote}</p>
              </div>

              <BenchmarkReportView
                strategies={[
                  walkForwardReport.hybrid,
                  walkForwardReport.pureCombinatorial,
                  walkForwardReport.randomBaseline
                ]}
                comparisons={[
                  walkForwardReport.comparisons.hybridVsRandom,
                  walkForwardReport.comparisons.hybridVsPure,
                  walkForwardReport.comparisons.pureVsRandom
                ]}
                subtitle={`Walk-Forward #${walkForwardReport.startContest} a #${walkForwardReport.endContest} (${walkForwardReport.contestsEvaluated} concursos reais avaliados) • Custo por estratégia: R$ ${walkForwardReport.hybrid.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ============================================================================
 * SUBCOMPONENTE DE TABELA COMPARATIVA, TESTE DE MCNEMAR E IC 95% (WILSON)
 * ============================================================================ */

interface BenchmarkReportViewProps {
  strategies: ThreeWayBenchmarkReport['hybrid'][];
  comparisons: ThreeWayBenchmarkReport['comparisons']['hybridVsRandom'][];
  subtitle: string;
}

const BenchmarkReportView: React.FC<BenchmarkReportViewProps> = ({
  strategies,
  comparisons,
  subtitle
}) => {
  return (
    <div className="space-y-5">
      <p className="text-xs font-bold text-slate-600">{subtitle}</p>

      {/* Tabela Comparativa Combinatória + Estrutural + Desempenho */}
      <div className="overflow-x-auto border border-slate-200 rounded-2xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900 text-white text-[11px]">
            <tr>
              <th className="p-3">Estratégia</th>
              <th className="p-3">Pares Méd.</th>
              <th className="p-3">Trincas Méd.</th>
              <th className="p-3">Gini / Jaccard</th>
              <th className="p-3">Estrutura (Soma 160–240 / Parid.)</th>
              <th className="p-3">Conc. c/ 3+ (IC 95% Wilson)</th>
              <th className="p-3">T / Q / Qi / S (Máx)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {strategies.map(s => (
              <tr key={s.strategyId} className="hover:bg-slate-50/80">
                <td className="p-3 font-black text-slate-900">
                  {s.strategyName}
                  <span className="block text-[10px] font-semibold text-slate-500">
                    Custo: R$ {s.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </td>
                <td className="p-3 font-mono font-bold text-slate-800">
                  {s.avgUniquePairs.toFixed(0)} ({s.avgPairCoveragePct.toFixed(1)}%)
                </td>
                <td className="p-3 font-mono font-bold text-slate-800">
                  {s.avgUniqueTriples.toFixed(0)} ({s.avgTripleCoveragePct.toFixed(2)}%)
                </td>
                <td className="p-3 font-mono text-slate-700">
                  G {s.avgGini.toFixed(3)} / J {s.avgMeanJaccard.toFixed(3)}
                </td>
                <td className="p-3 text-slate-700">
                  <span className="font-bold">Soma {s.avgSum.toFixed(0)}</span> ({s.pctSum160to240.toFixed(0)}% faixa)
                  <span className="block text-[10px] text-slate-500">
                    Parid. equil.: {s.pctBalancedParity.toFixed(0)}% • Quad: {s.avgDistinctQuadrants.toFixed(2)}
                  </span>
                </td>
                <td className="p-3">
                  <span className="font-black text-emerald-800">
                    {s.rate3PlusPct.toFixed(1)}% ({s.contestsWith3Plus}/{s.simulationsCount})
                  </span>
                  <span className="block text-[10px] text-slate-500 font-mono">
                    IC95%: [{s.ci95_3Plus.lowPct.toFixed(1)}%, {s.ci95_3Plus.highPct.toFixed(1)}%]
                  </span>
                </td>
                <td className="p-3 font-mono font-bold text-slate-900">
                  {s.ternos}T • {s.quadras}Q • {s.quinas}Qi • {s.senas}S
                  <span className="block text-[10px] font-sans text-slate-500">
                    Máx: {s.maxHitsObserved} acertos
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Distribuição de Acertos por Bilhete (0 a 6) */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">
          Distribuição de Acertos por Bilhete Individual (0 a 6 dezenas)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {strategies.map(s => (
            <div key={s.strategyId} className="bg-white border border-slate-200 rounded-xl p-3 space-y-1.5">
              <span className="text-xs font-black text-slate-900 block">{s.strategyName}</span>
              <div className="grid grid-cols-7 gap-1 text-center text-[10px]">
                {[0, 1, 2, 3, 4, 5, 6].map(h => (
                  <div key={h} className="bg-slate-50 rounded p-1 border border-slate-100">
                    <span className="block text-slate-500 font-bold">{h}ac</span>
                    <strong className="text-slate-900 font-mono">{s.hitDistribution[h] || 0}</strong>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Testes Pareados de McNemar e W/D/L */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {comparisons.map(cmp => (
          <div key={cmp.label} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
            <span className="font-black text-slate-900 block">{cmp.label}</span>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-600">McNemar (3+ ac.):</span>
              <strong className="font-mono text-slate-900">
                p = {cmp.mcnemar3Plus.pValue.toFixed(4)} {cmp.mcnemar3Plus.exactBinomialUsed ? '(Exato)' : '(χ²)'}
              </strong>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-600">Discordantes (A só / B só):</span>
              <strong className="font-mono text-slate-800">
                {cmp.mcnemar3Plus.aOnlyWin} / {cmp.mcnemar3Plus.bOnlyWin}
              </strong>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-600">Vitórias / Empates / Derrotas (3+):</span>
              <strong className="font-mono text-slate-900">
                {cmp.wdlPrizes3PlusCount.aWins}V / {cmp.wdlPrizes3PlusCount.ties}E / {cmp.wdlPrizes3PlusCount.bWins}D
              </strong>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-600">Δ Taxa 3+ (Teste Z):</span>
              <strong className="font-mono text-slate-900">
                {cmp.zTest3Plus.diffPctPoints >= 0 ? '+' : ''}
                {cmp.zTest3Plus.diffPctPoints.toFixed(1)} p.p.
              </strong>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
