import React, { useState, useMemo, useEffect } from 'react';
import { 
  GitCompare, 
  Layers, 
  Sparkles, 
  AlertTriangle, 
  ArrowRightLeft, 
  Info, 
  Percent, 
  ShieldCheck,
  SlidersHorizontal,
  History,
  Play,
  Target,
  Trophy,
  TrendingUp,
  CheckCircle2,
  BookmarkPlus,
  Wrench,
  Filter
} from 'lucide-react';
import { Bet, CalculationStrategy, GeneratorLogic, LotteryType, OfficialDrawResult } from '../types';
import {
  BacktestSummary,
  CalibrationResult,
  STRATEGY_LABELS,
  calibrateStrategyAgainstHistory,
  extractTernoStatsProfile,
  getHistoricalDrawsForBacktest,
  runBacktestRange
} from '../utils/backtestingEngine';

interface GameComparatorViewProps {
  savedBets: Bet[];
  lottery?: LotteryType;
  logicOptions?: GeneratorLogic;
  onUpdateLogicOptions?: (updated: GeneratorLogic) => void;
  latestDraw?: OfficialDrawResult;
  betCount?: number;
  onAddBet?: (
    numbers: number[],
    type: 'ai' | 'smart_rules' | 'manual',
    reasoning?: string,
    trevos?: number[]
  ) => void;
  onGoToGenerator?: () => void;
}

const DEFAULT_LOGIC: GeneratorLogic = {
  repeat1to2: true,
  balanceEvenOdd: true,
  sum160to240: true,
  spreadDistribution: true,
  concentrate20to50: true,
  max2Consecutive: true,
  max2IdenticalEndings: true,
  preferHistoricalHotNumbers: true,
  useAdvancedDuques: true,
  frameAndCenterBalance: true,
  balancePrimesAndFibonacci: true,
  paretoTopSelection: true,
  includeCycleDezenas: true,
  multiplesOfThreeBalance: true,
  rowAndColDispersion: true,
  calculationStrategy: 'balanced',
  strictPlausibilityFilter: true
};

export const GameComparatorView: React.FC<GameComparatorViewProps> = ({
  savedBets,
  lottery: lotteryProp,
  logicOptions,
  onUpdateLogicOptions,
  latestDraw,
  betCount,
  onAddBet,
  onGoToGenerator
}) => {
  const lottery: LotteryType = lotteryProp ?? 'megasena';
  const isLotofacil = lottery === 'lotofacil';
  const isMaisMilionaria = lottery === 'maismilionaria';
  const maxLimit = isLotofacil ? 25 : (isMaisMilionaria ? 50 : 60);
  const ticketSize = betCount || (isLotofacil ? 15 : 6);

  // Modo ativo dentro do Comparador
  const [subMode, setSubMode] = useState<'direct' | 'backtesting'>('direct');

  // ==================== COMPARAÇÃO DIRETA ====================
  const [selectedBetIds, setSelectedBetIds] = useState<string[]>(() => {
    return savedBets.slice(0, 2).map(b => b.id);
  });

  useEffect(() => {
    const validIds = selectedBetIds.filter(id => savedBets.some(b => b.id === id));
    if (validIds.length < 2) {
      setSelectedBetIds(savedBets.slice(0, 2).map(b => b.id));
    } else if (validIds.length !== selectedBetIds.length) {
      setSelectedBetIds(validIds);
    }
  }, [lottery, savedBets]);

  const selectedBets = useMemo(() => {
    return selectedBetIds
      .map(id => savedBets.find(b => b.id === id))
      .filter((b): b is Bet => !!b);
  }, [selectedBetIds, savedBets]);

  const toggleSelectBet = (id: string) => {
    if (selectedBetIds.includes(id)) {
      if (selectedBetIds.length > 2) {
        setSelectedBetIds(prev => prev.filter(item => item !== id));
      }
    } else {
      if (selectedBetIds.length < 4) {
        setSelectedBetIds(prev => [...prev, id]);
      } else {
        setSelectedBetIds(prev => [...prev.slice(1), id]);
      }
    }
  };

  const commonNumbers = useMemo(() => {
    if (selectedBets.length < 2) return [];
    let common = new Set<number>(selectedBets[0].numbers);
    for (let i = 1; i < selectedBets.length; i++) {
      const currentSet = new Set<number>(selectedBets[i].numbers);
      common = new Set<number>([...common].filter(n => currentSet.has(n)));
    }
    return (Array.from(common) as number[]).sort((a: number, b: number) => a - b);
  }, [selectedBets]);

  const unionNumbers = useMemo(() => {
    const union = new Set<number>();
    selectedBets.forEach(b => b.numbers.forEach(n => union.add(n)));
    return (Array.from(union) as number[]).sort((a: number, b: number) => a - b);
  }, [selectedBets]);

  const pairwiseStats = useMemo(() => {
    if (selectedBets.length < 2) return [];
    const stats: Array<{
      gameAIndex: number;
      gameBIndex: number;
      gameAId: string;
      gameBId: string;
      common: number[];
      jaccardPercent: number;
      collisionLevel: 'baixa' | 'moderada' | 'alta';
    }> = [];

    for (let i = 0; i < selectedBets.length; i++) {
      for (let j = i + 1; j < selectedBets.length; j++) {
        const setB = new Set(selectedBets[j].numbers);
        const common = selectedBets[i].numbers.filter(n => setB.has(n));
        const unionSize = new Set([...selectedBets[i].numbers, ...selectedBets[j].numbers]).size;
        const jaccard = unionSize > 0 ? (common.length / unionSize) * 100 : 0;

        let collisionLevel: 'baixa' | 'moderada' | 'alta' = 'baixa';
        if (isLotofacil) {
          if (common.length >= 12) collisionLevel = 'alta';
          else if (common.length >= 10) collisionLevel = 'moderada';
        } else {
          if (common.length >= 4) collisionLevel = 'alta';
          else if (common.length >= 2) collisionLevel = 'moderada';
        }

        stats.push({
          gameAIndex: i + 1,
          gameBIndex: j + 1,
          gameAId: selectedBets[i].id,
          gameBId: selectedBets[j].id,
          common,
          jaccardPercent: +jaccard.toFixed(1),
          collisionLevel
        });
      }
    }
    return stats;
  }, [selectedBets, isLotofacil]);

  const verdict = useMemo(() => {
    if (selectedBets.length < 2) return null;
    const maxShared = Math.max(...pairwiseStats.map(s => s.common.length), 0);
    const coverage = unionNumbers.length;
    const highThreshold = isLotofacil ? 12 : 4;
    const lowThreshold = isLotofacil ? 9 : 1;

    if (maxShared >= highThreshold) {
      return {
        level: 'warning',
        title: 'Alta Redundância Detectada',
        description: `Os jogos comparados compartilham até ${maxShared} dezenas em comum. Isso reduz a diversificação e aumenta o risco de pagar por combinações semelhantes.`
      };
    } else if (maxShared <= lowThreshold) {
      return {
        level: 'success',
        title: 'Excelente Complementaridade (Anti-Colisão)',
        description: `Ótima dispersão! Os jogos compartilham no máximo ${maxShared} dezena(s) e juntos cobrem ${coverage} de ${maxLimit} dezenas da cartela sem desperdício.`
      };
    } else {
      return {
        level: 'info',
        title: 'Equilíbrio Estratégico Moderado',
        description: `Compartilham ${maxShared} dezenas âncora, mantendo uma boa área de cobertura independente (${coverage} dezenas no total).`
      };
    }
  }, [selectedBets, pairwiseStats, unionNumbers, isLotofacil, maxLimit]);

  const handleGenerateDivergentBet = () => {
    if (!onAddBet) return;
    const freqInSelected: Record<number, number> = {};
    for (let i = 1; i <= maxLimit; i++) freqInSelected[i] = 0;
    selectedBets.forEach(b => b.numbers.forEach(n => {
      if (freqInSelected[n] !== undefined) freqInSelected[n]++;
    }));

    const candidates = Array.from({ length: maxLimit }, (_, i) => i + 1)
      .sort((a, b) => {
        const diff = freqInSelected[a] - freqInSelected[b];
        return diff !== 0 ? diff : Math.random() - 0.5;
      });

    const chosen = candidates.slice(0, ticketSize).sort((a, b) => a - b);

    if (chosen.length === ticketSize) {
      onAddBet(
        chosen,
        'smart_rules',
        isLotofacil
          ? `Aposta Complementar Anti-Colisão (Lotofácil): prioriza dezenas ausentes e de menor sobreposição nos jogos comparados.`
          : `Aposta Divergente Anti-Colisão: 100% focada em reduzir colisões com os jogos comparados, expandindo a cobertura da cartela.`
      );
    }
  };

  // ==================== MODO BACKTESTING HISTÓRICO ====================
  const availableDraws = useMemo(() => {
    return getHistoricalDrawsForBacktest(lottery, latestDraw);
  }, [lottery, latestDraw]);

  const [startContest, setStartContest] = useState<number>(() => {
    if (availableDraws.length === 0) return 1;
    const idx = Math.min(14, availableDraws.length - 1);
    return availableDraws[idx].contest;
  });

  const [endContest, setEndContest] = useState<number>(() => {
    return availableDraws[0]?.contest || 1;
  });

  const [testStrategy, setTestStrategy] = useState<CalculationStrategy>(
    logicOptions?.calculationStrategy || 'balanced'
  );
  const [usePlausibilityTest, setUsePlausibilityTest] = useState<boolean>(
    logicOptions?.strictPlausibilityFilter !== false
  );
  const [targetHitsGoal, setTargetHitsGoal] = useState<number>(isLotofacil ? 12 : 4);

  const [backtestSummary, setBacktestSummary] = useState<BacktestSummary | null>(null);
  const [calibrationResult, setCalibrationResult] = useState<CalibrationResult | null>(null);
  const [isRunningBacktest, setIsRunningBacktest] = useState<boolean>(false);
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);
  const [backtestResultFilter, setBacktestResultFilter] = useState<'all' | 'exact_terno' | 'min_target' | 'prizes'>('all');
  const [backtestSortBy, setBacktestSortBy] = useState<'contest_desc' | 'hits_desc'>('contest_desc');
  const [ternoFilterThreshold, setTernoFilterThreshold] = useState<number>(isLotofacil ? 11 : 3);
  const [savedContestIds, setSavedContestIds] = useState<Set<number>>(new Set());
  const [appliedLogicToast, setAppliedLogicToast] = useState<string | null>(null);

  // Sincroniza limites e metas ao trocar de loteria
  useEffect(() => {
    if (availableDraws.length > 0) {
      const latestC = availableDraws[0].contest;
      const defaultStartIdx = Math.min(isMaisMilionaria ? 24 : 14, availableDraws.length - 1);
      setEndContest(latestC);
      setStartContest(availableDraws[defaultStartIdx].contest);
    }
    setTargetHitsGoal(isLotofacil ? 12 : 4);
    setTernoFilterThreshold(isLotofacil ? 11 : 3);
    setBacktestResultFilter('all');
    setBacktestSummary(null);
    setCalibrationResult(null);
    setSavedContestIds(new Set());
    setAppliedLogicToast(null);
  }, [lottery, availableDraws.length]);

  useEffect(() => {
    if (logicOptions?.calculationStrategy) {
      setTestStrategy(logicOptions.calculationStrategy);
    }
    if (logicOptions?.strictPlausibilityFilter !== undefined) {
      setUsePlausibilityTest(logicOptions.strictPlausibilityFilter !== false);
    }
  }, [logicOptions?.calculationStrategy, logicOptions?.strictPlausibilityFilter]);

  const effectiveLogic: GeneratorLogic = useMemo(() => ({
    ...(logicOptions || DEFAULT_LOGIC),
    calculationStrategy: testStrategy,
    strictPlausibilityFilter: usePlausibilityTest
  }), [logicOptions, testStrategy, usePlausibilityTest]);

  const activeRulesCount = useMemo(() => {
    const base = logicOptions || DEFAULT_LOGIC;
    return [
      base.repeat1to2,
      base.balanceEvenOdd,
      base.sum160to240,
      base.spreadDistribution,
      base.concentrate20to50,
      base.max2Consecutive,
      base.max2IdenticalEndings,
      base.preferHistoricalHotNumbers,
      base.useAdvancedDuques,
      base.frameAndCenterBalance,
      base.balancePrimesAndFibonacci,
      base.paretoTopSelection,
      base.includeCycleDezenas,
      base.multiplesOfThreeBalance,
      base.rowAndColDispersion
    ].filter(Boolean).length;
  }, [logicOptions]);

  const selectedIntervalCount = useMemo(() => {
    const minC = Math.min(startContest, endContest);
    const maxC = Math.max(startContest, endContest);
    return availableDraws.filter(d => d.contest >= minC && d.contest <= maxC).length;
  }, [availableDraws, startContest, endContest]);

  const applyPresetRange = (lastN: number) => {
    if (availableDraws.length === 0) return;
    const newest = availableDraws[0].contest;
    const targetIdx = Math.min(lastN - 1, availableDraws.length - 1);
    setEndContest(newest);
    setStartContest(availableDraws[targetIdx].contest);
  };

  const handleRunBacktest = () => {
    setIsRunningBacktest(true);
    setCalibrationResult(null);
    setAppliedLogicToast(null);
    setTimeout(() => {
      try {
        const summary = runBacktestRange({
          lottery,
          startContest,
          endContest,
          logic: effectiveLogic,
          betCount: ticketSize,
          latestDraw
        });
        setBacktestSummary(summary);
      } finally {
        setIsRunningBacktest(false);
      }
    }, 20);
  };

  const handleRunCalibration = () => {
    setIsCalibrating(true);
    setAppliedLogicToast(null);
    setTimeout(() => {
      try {
        const result = calibrateStrategyAgainstHistory({
          lottery,
          startContest,
          endContest,
          baseLogic: effectiveLogic,
          betCount: ticketSize,
          targetHits: targetHitsGoal,
          maxRounds: 14,
          latestDraw
        });
        setCalibrationResult(result);
        setBacktestSummary(result.bestSummary);
      } finally {
        setIsCalibrating(false);
      }
    }, 25);
  };

  const handleApplyLogicToGenerator = (newLogic: GeneratorLogic, label: string) => {
    if (onUpdateLogicOptions) {
      onUpdateLogicOptions(newLogic);
    }
    if (newLogic.calculationStrategy) {
      setTestStrategy(newLogic.calculationStrategy);
    }
    setUsePlausibilityTest(newLogic.strictPlausibilityFilter !== false);
    setAppliedLogicToast(`Estratégia "${label}" aplicada ao seu Gerador Inteligente!`);
    setTimeout(() => setAppliedLogicToast(null), 4000);
  };

  const filteredBacktestRows = useMemo(() => {
    if (!backtestSummary) return [];
    let rows = [...backtestSummary.results];

    if (backtestResultFilter === 'prizes') {
      rows = rows.filter(r => r.isPrize);
    } else if (backtestResultFilter === 'exact_terno') {
      const exactHit = isLotofacil ? 11 : 3;
      rows = rows.filter(r => r.hits === exactHit);
    } else if (backtestResultFilter === 'min_target') {
      const minThreshold = isLotofacil ? 11 : 3;
      rows = rows.filter(r => r.hits >= minThreshold);
    }

    rows.sort((a, b) => {
      if (backtestSortBy === 'hits_desc') {
        if (b.hits !== a.hits) return b.hits - a.hits;
      }
      return b.contest - a.contest;
    });

    return rows;
  }, [backtestSummary, backtestResultFilter, backtestSortBy, isLotofacil]);

  const ternoExtractedProfile = useMemo(() => {
    if (!backtestSummary) return null;
    return extractTernoStatsProfile(backtestSummary, ternoFilterThreshold);
  }, [backtestSummary, ternoFilterThreshold]);

  const isTernoBoostCurrentlyActive = Boolean(
    logicOptions?.useTernoStatsBoost &&
    logicOptions.ternoBoostProfile?.lottery === lottery
  );

  const handleApplyTernoStatsToAnalyticsAndGenerator = () => {
    if (!ternoExtractedProfile || !onUpdateLogicOptions) return;
    const updated: GeneratorLogic = {
      ...(logicOptions || DEFAULT_LOGIC),
      calculationStrategy: testStrategy,
      strictPlausibilityFilter: usePlausibilityTest,
      useTernoStatsBoost: true,
      ternoBoostProfile: ternoExtractedProfile
    };
    onUpdateLogicOptions(updated);
    setAppliedLogicToast(
      `Estatísticas de ${ternoExtractedProfile.ternoSimulationsCount} simulações (${ternoExtractedProfile.minHitsThreshold}+ acertos) aplicadas na Análise Avançada e no Gerador!`
    );
    setTimeout(() => setAppliedLogicToast(null), 5000);
  };

  const handleToggleTernoBoostOff = () => {
    if (!onUpdateLogicOptions || !logicOptions) return;
    onUpdateLogicOptions({
      ...logicOptions,
      useTernoStatsBoost: false
    });
    setAppliedLogicToast('Reforço por simulações de Terno desativado.');
    setTimeout(() => setAppliedLogicToast(null), 3500);
  };

  const distributionTiers = useMemo(() => {
    if (!backtestSummary) return [];
    if (isLotofacil) {
      return [15, 14, 13, 12, 11, 10, 9].map(tier => ({
        label: tier === 9 ? '≤ 9' : `${tier} Acertos`,
        count:
          tier === 9
            ? Object.entries(backtestSummary.hitsDistribution)
                .filter(([h]) => Number(h) <= 9)
                .reduce((acc, [, c]) => acc + Number(c), 0)
            : backtestSummary.hitsDistribution[tier] || 0,
        highlight: tier >= 11
      }));
    }
    return [6, 5, 4, 3, 2, 1, 0].map(tier => ({
      label: tier === 6 ? '6 (Sena)' : tier === 5 ? '5 (Quina)' : tier === 4 ? '4 (Quadra)' : tier === 3 ? '3 (Terno)' : `${tier}`,
      count: backtestSummary.hitsDistribution[tier] || 0,
      highlight: tier >= 3
    }));
  }, [backtestSummary, isLotofacil]);

  const themeAccentButton = isLotofacil
    ? 'bg-purple-600 hover:bg-purple-700'
    : isMaisMilionaria
    ? 'bg-amber-600 hover:bg-amber-700'
    : 'bg-emerald-600 hover:bg-emerald-700';

  return (
    <div className="space-y-6">
      {/* Seletor de Sub-Modo do Comparador (sempre visível independente da carteira) */}
      <div className="bg-white rounded-3xl p-2 border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={() => setSubMode('direct')}
          className={`flex-1 py-3 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            subMode === 'direct'
              ? isLotofacil
                ? 'bg-purple-600 text-white shadow-md'
                : isMaisMilionaria
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-emerald-700 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <GitCompare size={17} />
          <span>Comparação Direta de Apostas</span>
        </button>

        <button
          type="button"
          onClick={() => setSubMode('backtesting')}
          className={`flex-1 py-3 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            subMode === 'backtesting'
              ? isLotofacil
                ? 'bg-purple-600 text-white shadow-md'
                : isMaisMilionaria
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-emerald-700 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <History size={17} />
          <span>Modo Backtesting Histórico</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
            subMode === 'backtesting' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
          }`}>
            Concursos Reais
          </span>
        </button>
      </div>

      {/* ==================== CONTEÚDO: MODO BACKTESTING ==================== */}
      {subMode === 'backtesting' && (
        <div className="space-y-6">
          {/* Banner Explicativo do Backtesting */}
          <div className={`text-white rounded-3xl p-5 sm:p-7 shadow-lg relative overflow-hidden border ${
            isLotofacil
              ? 'bg-gradient-to-r from-purple-950 via-fuchsia-950 to-slate-900 border-purple-800'
              : isMaisMilionaria
              ? 'bg-gradient-to-r from-amber-950 via-yellow-950 to-slate-900 border-amber-800'
              : 'bg-gradient-to-r from-slate-900 via-teal-950 to-emerald-950 border-emerald-800'
          }`}>
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                    isLotofacil
                      ? 'bg-purple-500/20 text-purple-300 border-purple-400/30'
                      : isMaisMilionaria
                      ? 'bg-amber-500/20 text-amber-300 border-amber-400/30'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                  }`}>
                    Simulação Out-of-Sample • {availableDraws.length} Concursos Disponíveis
                  </span>
                  <span className="text-xs text-slate-300">
                    {activeRulesCount} regras estatísticas ativas • {ticketSize} dezenas/jogo
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white mt-1 tracking-tight flex items-center gap-2">
                  <History size={24} className={isLotofacil ? 'text-purple-400' : isMaisMilionaria ? 'text-amber-400' : 'text-emerald-400'} />
                  <span>Backtesting & Calibração Histórica da Estratégia</span>
                </h2>
                <p className="text-xs text-slate-300 max-w-2xl mt-1 leading-relaxed">
                  Selecione um intervalo de concursos passados: para cada sorteio, o sistema usa apenas o concurso anterior como referência, gera uma aposta com suas regras atuais e mostra quantos acertos você teria obtido. Use a calibração automática para testar modelos até alcançar sua meta de acertos.
                </p>
              </div>
            </div>
          </div>

          {appliedLogicToast && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-black flex items-center gap-2 shadow-sm">
              <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
              <span>{appliedLogicToast}</span>
            </div>
          )}

          {/* Painel de Configuração do Intervalo e Estratégia */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Coluna 1: Intervalo de Concursos */}
              <div className="lg:col-span-6 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <SlidersHorizontal size={14} />
                    <span>1. Intervalo de Concursos Passados ({selectedIntervalCount} selecionados)</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[10, 25, 50].filter(n => n <= availableDraws.length).map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => applyPresetRange(n)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black transition-colors cursor-pointer"
                      >
                        Últimos {n}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => applyPresetRange(availableDraws.length)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black transition-colors cursor-pointer"
                    >
                      Todos ({availableDraws.length})
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 block mb-1">Concurso Inicial:</span>
                    <select
                      value={startContest}
                      onChange={(e) => setStartContest(Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {[...availableDraws].reverse().map(d => (
                        <option key={`start-${d.contest}`} value={d.contest}>
                          Concurso #{d.contest} ({d.date})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-slate-500 block mb-1">Concurso Final:</span>
                    <select
                      value={endContest}
                      onChange={(e) => setEndContest(Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {availableDraws.map(d => (
                        <option key={`end-${d.contest}`} value={d.contest}>
                          Concurso #{d.contest} ({d.date})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Coluna 2: Estratégia & Filtro de Plausibilidade */}
              <div className="lg:col-span-6 space-y-3">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Wrench size={14} />
                  <span>2. Cálculo / Estratégia a Testar</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 block mb-1">Modelo Estatístico:</span>
                    <select
                      value={testStrategy}
                      onChange={(e) => setTestStrategy(e.target.value as CalculationStrategy)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {Object.entries(STRATEGY_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-slate-500 block mb-1">Meta de Calibração Automática:</span>
                    <select
                      value={targetHitsGoal}
                      onChange={(e) => setTargetHitsGoal(Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {isLotofacil ? (
                        <>
                          <option value={11}>11 Acertos (Prêmio Fixo)</option>
                          <option value={12}>12 Acertos (Recomendado)</option>
                          <option value={13}>13 Acertos</option>
                          <option value={14}>14 Acertos</option>
                          <option value={15}>15 Acertos</option>
                        </>
                      ) : (
                        <>
                          <option value={3}>3 Acertos (Terno)</option>
                          <option value={4}>4 Acertos (Quadra - Recomendado)</option>
                          <option value={5}>5 Acertos (Quina)</option>
                          <option value={6}>6 Acertos (Sena)</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={usePlausibilityTest}
                      onChange={(e) => setUsePlausibilityTest(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <span>Usar Filtro de Plausibilidade Histórica Estrita</span>
                  </label>

                  {onUpdateLogicOptions && (
                    testStrategy !== (logicOptions?.calculationStrategy || 'balanced') ||
                    usePlausibilityTest !== (logicOptions?.strictPlausibilityFilter !== false)
                  ) && (
                    <button
                      type="button"
                      onClick={() => handleApplyLogicToGenerator(effectiveLogic, STRATEGY_LABELS[testStrategy])}
                      className="text-[11px] font-black text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                    >
                      Aplicar no Gerador Principal
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Ações de Execução */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleRunBacktest}
                disabled={isRunningBacktest || isCalibrating || selectedIntervalCount === 0}
                className={`flex-1 py-3 px-5 rounded-2xl text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50 ${themeAccentButton}`}
              >
                <Play size={16} />
                <span>
                  {isRunningBacktest
                    ? 'Simulando Concursos...'
                    : `Executar Backtesting (${selectedIntervalCount} concursos)`}
                </span>
              </button>

              <button
                type="button"
                onClick={handleRunCalibration}
                disabled={isRunningBacktest || isCalibrating || selectedIntervalCount === 0}
                className="flex-1 py-3 px-5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                <Target size={16} className="text-amber-400" />
                <span>
                  {isCalibrating
                    ? 'Calibrando Estratégias...'
                    : `Testar & Calibrar Cálculo até ${targetHitsGoal} Acertos`}
                </span>
              </button>
            </div>
          </div>

          {/* Resultado da Calibração Iterativa */}
          {calibrationResult && (
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      calibrationResult.achievedTarget
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {calibrationResult.achievedTarget
                        ? `Meta de ${calibrationResult.targetHits} Acertos Atingida na Rodada #${calibrationResult.roundsExecuted}`
                        : `Melhor Configuração em ${calibrationResult.roundsExecuted} Rodadas`}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 mt-1">
                    Evolução da Calibração: {calibrationResult.bestLabel}
                  </h3>
                  <p className="text-xs text-slate-600">
                    Linha de base: máx. <strong>{calibrationResult.baselineMaxHits}</strong> acertos (média {calibrationResult.baselineAvgHits}) → Melhor cálculo encontrado: máx. <strong>{calibrationResult.bestMaxHits}</strong> acertos (média {calibrationResult.bestAvgHits}).
                  </p>
                </div>

                {onUpdateLogicOptions && (
                  <button
                    type="button"
                    onClick={() => handleApplyLogicToGenerator(calibrationResult.bestLogic, calibrationResult.bestLabel)}
                    className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm cursor-pointer flex-shrink-0"
                  >
                    <CheckCircle2 size={15} />
                    <span>Aplicar Melhor Cálculo no Gerador</span>
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                      <th className="py-2 pr-3">Rodada</th>
                      <th className="py-2 pr-3">Configuração Testada</th>
                      <th className="py-2 pr-3 text-center">Máx. Acertos</th>
                      <th className="py-2 pr-3 text-center">Média Acertos</th>
                      <th className="py-2 pr-3 text-center">Premiados</th>
                      <th className="py-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {calibrationResult.roundLogs.map(log => (
                      <tr key={log.round} className={log.hitTarget ? 'bg-emerald-50/60' : ''}>
                        <td className="py-2 pr-3 font-mono font-bold text-slate-500">#{log.round}</td>
                        <td className="py-2 pr-3 font-bold text-slate-800">{log.label}</td>
                        <td className="py-2 pr-3 text-center font-black text-slate-900">{log.maxHits}</td>
                        <td className="py-2 pr-3 text-center font-mono text-slate-600">{log.avgHits}</td>
                        <td className="py-2 pr-3 text-center font-bold text-emerald-700">{log.prizesCount}</td>
                        <td className="py-2 text-right">
                          {log.hitTarget ? (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-black">
                              META ATINGIDA
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-slate-400">Testado</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Resumo KPIs & Resultados do Backtesting */}
          {backtestSummary && (
            <div className="space-y-5">
              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Concursos Simulados</span>
                  <p className="text-2xl font-black text-slate-900 mt-1">{backtestSummary.totalContests}</p>
                  <span className="text-[11px] text-slate-500">
                    #{backtestSummary.startContest} até #{backtestSummary.endContest}
                  </span>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-amber-200 shadow-sm bg-gradient-to-b from-amber-50/40 to-white">
                  <span className="text-[10px] font-black uppercase text-amber-700 tracking-wider flex items-center gap-1">
                    <Trophy size={12} /> Melhor Acerto
                  </span>
                  <p className="text-2xl font-black text-amber-900 mt-1">{backtestSummary.maxHits} dezenas</p>
                  <span className="text-[11px] text-amber-700 font-semibold">
                    {backtestSummary.bestContestNumber ? `No Concurso #${backtestSummary.bestContestNumber}` : '-'}
                  </span>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                    <TrendingUp size={12} /> Média por Sorteio
                  </span>
                  <p className="text-2xl font-black text-slate-900 mt-1">{backtestSummary.averageHits}</p>
                  <span className="text-[11px] text-slate-500">
                    Modelo: {STRATEGY_LABELS[backtestSummary.strategyUsed].split(' ')[0]}
                  </span>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-emerald-200 shadow-sm bg-gradient-to-b from-emerald-50/40 to-white">
                  <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">Apostas Premiadas</span>
                  <p className="text-2xl font-black text-emerald-900 mt-1">{backtestSummary.totalPrizes}</p>
                  <span className="text-[11px] text-emerald-700 font-semibold">
                    {backtestSummary.totalContests > 0
                      ? `${((backtestSummary.totalPrizes / backtestSummary.totalContests) * 100).toFixed(1)}% de taxa premiada`
                      : '0%'}
                  </span>
                </div>
              </div>

              {/* Distribuição de Acertos */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Distribuição de Acertos no Intervalo
                </h4>
                <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
                  {distributionTiers.map(item => (
                    <div
                      key={item.label}
                      className={`p-3 rounded-2xl border text-center ${
                        item.highlight && item.count > 0
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <span className="text-[10px] font-black uppercase block">{item.label}</span>
                      <span className="text-xl font-black block mt-0.5 tabular-nums">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Filtro de Aprendizado Estatístico: Simulações que acertaram Terno (3+ dezenas) */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-emerald-200 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-bold text-emerald-800">Filtro de Reforço Estatístico</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {ternoExtractedProfile
                          ? `${ternoExtractedProfile.ternoSimulationsCount} de ${ternoExtractedProfile.sourceSimulationsCount} simulações (${((ternoExtractedProfile.ternoSimulationsCount / Math.max(1, ternoExtractedProfile.sourceSimulationsCount)) * 100).toFixed(1)}%)`
                          : `0 de ${backtestSummary.totalContests} simulações atingiram ${ternoFilterThreshold}+ acertos`}
                      </span>
                    </div>
                    <h4 className="text-base font-black text-slate-900 mt-0.5">
                      Estatísticas das Simulações com {isLotofacil ? `${ternoFilterThreshold}+ Acertos` : (ternoFilterThreshold === 3 ? 'Terno (3+ Dezenas)' : `${ternoFilterThreshold}+ Dezenas`)}
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Isola somente as simulações que acertaram o mínimo escolhido e extrai suas dezenas, soma, paridade e duques para reforçar a Análise Avançada e o Gerador Inteligente.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={ternoFilterThreshold}
                      onChange={(e) => setTernoFilterThreshold(Number(e.target.value))}
                      className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 outline-none"
                      aria-label="Mínimo de acertos para o filtro"
                    >
                      {isLotofacil ? (
                        <>
                          <option value={11}>Base: 11+ Acertos</option>
                          <option value={12}>Base: 12+ Acertos</option>
                          <option value={13}>Base: 13+ Acertos</option>
                        </>
                      ) : (
                        <>
                          <option value={3}>Base: Terno (3+ Dezenas)</option>
                          <option value={4}>Base: Quadra (4+ Dezenas)</option>
                        </>
                      )}
                    </select>

                    {ternoExtractedProfile && (
                      <button
                        type="button"
                        onClick={() => setBacktestResultFilter(ternoFilterThreshold === 3 || ternoFilterThreshold === 11 ? 'exact_terno' : 'min_target')}
                        className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer whitespace-nowrap"
                      >
                        Ver só essas {ternoExtractedProfile.ternoSimulationsCount} na tabela
                      </button>
                    )}
                  </div>
                </div>

                {ternoExtractedProfile ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50">
                        <span className="text-[11px] font-semibold text-slate-500 block">Soma Média (Faixa)</span>
                        <p className="text-base font-black text-slate-900 mt-0.5 tabular-nums">
                          {ternoExtractedProfile.avgSum}{' '}
                          <span className="text-xs font-semibold text-slate-500">
                            ({ternoExtractedProfile.targetSumMin}–{ternoExtractedProfile.targetSumMax})
                          </span>
                        </p>
                      </div>

                      <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50">
                        <span className="text-[11px] font-semibold text-slate-500 block">Pares Dominantes</span>
                        <p className="text-base font-black text-slate-900 mt-0.5 tabular-nums">
                          {ternoExtractedProfile.preferredEvenCounts.map(e => `${e}P/${ticketSize - e}I`).join(' · ')}
                        </p>
                      </div>

                      <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50">
                        <span className="text-[11px] font-semibold text-slate-500 block">Média Moldura</span>
                        <p className="text-base font-black text-slate-900 mt-0.5 tabular-nums">
                          {ternoExtractedProfile.avgFrameCount} dezenas
                        </p>
                      </div>

                      <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50">
                        <span className="text-[11px] font-semibold text-slate-500 block">Média Primos</span>
                        <p className="text-base font-black text-slate-900 mt-0.5 tabular-nums">
                          {ternoExtractedProfile.avgPrimesCount} dezenas
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs font-bold text-slate-700 block mb-2">
                          Dezenas que mais geraram acertos nos {isLotofacil ? `${ternoFilterThreshold}+` : 'Ternos'}:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {ternoExtractedProfile.matchedHotNumbers.map(n => (
                            <span
                              key={`matched-hot-${n}`}
                              className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-mono text-xs font-black flex items-center justify-center tabular-nums"
                              title={`Peso reforçado: ${ternoExtractedProfile.numberWeights[n]}x`}
                            >
                              {n.toString().padStart(2, '0')}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-xs font-bold text-slate-700 block mb-2">
                          Dezenas & Duques mais presentes nas combinações:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {ternoExtractedProfile.topNumbers.map(n => (
                            <span
                              key={`top-terno-${n}`}
                              className="w-8 h-8 rounded-lg bg-slate-900 text-white font-mono text-xs font-bold flex items-center justify-center tabular-nums"
                            >
                              {n.toString().padStart(2, '0')}
                            </span>
                          ))}
                        </div>
                        {ternoExtractedProfile.topPairs.length > 0 && (
                          <p className="text-[11px] text-slate-500 mt-2 font-mono tabular-nums">
                            Duques frequentes:{' '}
                            {ternoExtractedProfile.topPairs
                              .slice(0, 5)
                              .map(([a, b]) => `${a.toString().padStart(2, '0')}-${b.toString().padStart(2, '0')}`)
                              .join(' · ')}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                      <div className="text-xs text-slate-600">
                        {isTernoBoostCurrentlyActive ? (
                          <span className="font-bold text-emerald-700">
                            Reforço ativo na Análise Avançada e no Gerador ({logicOptions?.ternoBoostProfile?.ternoSimulationsCount} simulações base).
                          </span>
                        ) : (
                          <span>
                            Clique ao lado para alimentar a Análise Avançada e aumentar o peso dessas dezenas no Gerador.
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {isTernoBoostCurrentlyActive && (
                          <button
                            type="button"
                            onClick={handleToggleTernoBoostOff}
                            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
                          >
                            Desativar Reforço
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleApplyTernoStatsToAnalyticsAndGenerator}
                          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-2 shadow-sm cursor-pointer whitespace-nowrap"
                        >
                          <CheckCircle2 size={15} />
                          <span>
                            {isTernoBoostCurrentlyActive
                              ? 'Atualizar Análise Avançada com Estas Simulações'
                              : 'Usar Estatísticas do Terno na Análise Avançada & Gerador'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    Nenhuma simulação neste intervalo atingiu {ternoFilterThreshold}+ acertos. Amplie o intervalo de concursos ou execute a calibração automática para capturar combinações com Terno+.
                  </p>
                )}
              </div>

              {/* Filtros e Lista Concurso a Concurso */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black text-slate-700 flex items-center gap-1">
                      <Filter size={14} /> Filtrar:
                    </span>
                    {[
                      { id: 'all', label: `Todos (${backtestSummary.results.length})` },
                      {
                        id: 'exact_terno',
                        label: isLotofacil
                          ? `11 Acertos (${backtestSummary.hitsDistribution[11] || 0})`
                          : `3 Acertos - Terno (${backtestSummary.hitsDistribution[3] || 0})`
                      },
                      { id: 'min_target', label: isLotofacil ? '11+ Acertos' : '3+ Acertos' },
                      { id: 'prizes', label: `Premiados (${backtestSummary.totalPrizes})` }
                    ].map(f => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setBacktestResultFilter(f.id as 'all' | 'exact_terno' | 'min_target' | 'prizes')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                          backtestResultFilter === f.id
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-500">Ordenar:</span>
                    <select
                      value={backtestSortBy}
                      onChange={(e) => setBacktestSortBy(e.target.value as 'contest_desc' | 'hits_desc')}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 outline-none"
                    >
                      <option value="contest_desc">Concurso Mais Recente</option>
                      <option value="hits_desc">Maior Quantidade de Acertos</option>
                    </select>
                  </div>
                </div>

                {filteredBacktestRows.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    Nenhum concurso neste filtro atingiu os critérios selecionados. Tente outro filtro ou execute uma nova calibração.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredBacktestRows.map(row => {
                      const matchedSet = new Set(row.matchedNumbers);
                      const isSaved = savedContestIds.has(row.contest);

                      return (
                        <div
                          key={row.contest}
                          className={`p-4 rounded-2xl border transition-all ${
                            row.isPrize
                              ? 'bg-emerald-50/50 border-emerald-300 shadow-xs'
                              : row.hits >= (isLotofacil ? 10 : 3)
                              ? 'bg-amber-50/40 border-amber-200'
                              : 'bg-slate-50/60 border-slate-200'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 rounded-xl bg-slate-900 text-white font-mono text-xs font-black">
                                #{row.contest}
                              </span>
                              <span className="text-xs font-bold text-slate-500">{row.date}</span>
                              {row.prizeLabel && (
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  row.isPrize
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-amber-200 text-amber-950'
                                }`}>
                                  {row.prizeLabel}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <span className={`px-3 py-1 rounded-xl text-xs font-black ${
                                row.isPrize
                                  ? 'bg-emerald-600 text-white'
                                  : row.hits >= (isLotofacil ? 10 : 3)
                                  ? 'bg-amber-400 text-slate-950'
                                  : 'bg-slate-200 text-slate-700'
                              }`}>
                                {row.hits} {row.hits === 1 ? 'Acerto' : 'Acertos'}
                                {isMaisMilionaria && row.generatedTrevos ? ` • 🍀${row.trevosHits}` : ''}
                              </span>

                              {onAddBet && (
                                <button
                                  type="button"
                                  disabled={isSaved}
                                  onClick={() => {
                                    onAddBet(
                                      row.generatedNumbers,
                                      'smart_rules',
                                      `Gerado via Backtesting (#${row.contest}, ${row.hits} acertos, estratégia ${STRATEGY_LABELS[backtestSummary.strategyUsed]}).`,
                                      row.generatedTrevos
                                    );
                                    setSavedContestIds(prev => new Set(prev).add(row.contest));
                                  }}
                                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                                    isSaved
                                      ? 'bg-emerald-100 text-emerald-800 cursor-default'
                                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                                  }`}
                                >
                                  <BookmarkPlus size={13} />
                                  <span>{isSaved ? 'Salvo' : 'Salvar Jogo'}</span>
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">
                                Aposta Gerada pela Estratégia:
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {row.generatedNumbers.map(n => {
                                  const isHit = matchedSet.has(n);
                                  return (
                                    <span
                                      key={`gen-${row.contest}-${n}`}
                                      className={`w-8 h-8 rounded-lg font-mono text-xs font-black flex items-center justify-center ${
                                        isHit
                                          ? 'bg-emerald-600 text-white ring-2 ring-emerald-300 shadow-xs'
                                          : 'bg-white border border-slate-200 text-slate-700'
                                      }`}
                                    >
                                      {n.toString().padStart(2, '0')}
                                    </span>
                                  );
                                })}
                                {isMaisMilionaria && row.generatedTrevos && row.generatedTrevos.map(t => {
                                  const tHit = row.matchedTrevos?.includes(t);
                                  return (
                                    <span
                                      key={`gent-${row.contest}-${t}`}
                                      className={`px-2 h-8 rounded-lg font-mono text-xs font-black flex items-center justify-center ${
                                        tHit
                                          ? 'bg-emerald-600 text-white ring-2 ring-emerald-300'
                                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                                      }`}
                                    >
                                      🍀{t}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>

                            <div>
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">
                                Resultado Oficial #{row.contest}:
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {row.drawnNumbers.map(n => {
                                  const isHit = matchedSet.has(n);
                                  return (
                                    <span
                                      key={`off-${row.contest}-${n}`}
                                      className={`w-8 h-8 rounded-lg font-mono text-xs font-black flex items-center justify-center ${
                                        isHit
                                          ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-500'
                                          : 'bg-slate-900 text-white'
                                      }`}
                                    >
                                      {n.toString().padStart(2, '0')}
                                    </span>
                                  );
                                })}
                                {isMaisMilionaria && row.drawnTrevos && row.drawnTrevos.map(t => (
                                  <span
                                    key={`offt-${row.contest}-${t}`}
                                    className="px-2 h-8 rounded-lg font-mono text-xs font-black bg-emerald-800 text-white flex items-center justify-center"
                                  >
                                    🍀{t}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== CONTEÚDO: COMPARAÇÃO DIRETA ==================== */}
      {subMode === 'direct' && (
        savedBets.length < 2 ? (
          <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-slate-200 shadow-sm space-y-4 max-w-xl mx-auto">
            <div className={`w-16 h-16 rounded-3xl mx-auto flex items-center justify-center ${
              isLotofacil ? 'bg-purple-100 text-purple-800' : (isMaisMilionaria ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800')
            }`}>
              <GitCompare size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-900">Comparador Direto de Jogos</h3>
            <p className="text-sm text-slate-600">
              Você precisa de pelo menos 2 apostas salvas na carteira desta modalidade para comparar a sobreposição, similaridade e complementaridade entre elas — ou alterne acima para o <strong>Modo Backtesting Histórico</strong>.
            </p>
            {onGoToGenerator && (
              <button
                onClick={onGoToGenerator}
                className={`px-5 py-2.5 rounded-2xl font-black text-xs text-white shadow-md cursor-pointer ${
                  isLotofacil ? 'bg-purple-600 hover:bg-purple-700' : (isMaisMilionaria ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700')
                }`}
              >
                Ir ao Gerador de Apostas
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Banner Principal */}
            <div className={`text-white rounded-3xl p-5 sm:p-7 shadow-lg relative overflow-hidden border ${
              isLotofacil
                ? 'bg-gradient-to-r from-purple-950 via-fuchsia-950 to-slate-900 border-purple-800'
                : isMaisMilionaria 
                ? 'bg-gradient-to-r from-amber-950 via-yellow-950 to-slate-900 border-amber-800' 
                : 'bg-gradient-to-r from-slate-900 via-teal-950 to-emerald-950 border-emerald-800'
            }`}>
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                      isLotofacil
                        ? 'bg-purple-500/20 text-purple-300 border-purple-400/30'
                        : isMaisMilionaria 
                        ? 'bg-amber-500/20 text-amber-300 border-amber-400/30' 
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                    }`}>
                      Análise de Colisão & Interseção
                    </span>
                    <span className="text-xs text-slate-300">
                      Comparando {selectedBets.length} de {savedBets.length} jogos salvos
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white mt-1 tracking-tight flex items-center gap-2">
                    <GitCompare size={24} className={isMaisMilionaria ? 'text-amber-400' : 'text-emerald-400'} />
                    <span>Comparador Direto entre Jogos Gerados</span>
                  </h2>
                  <p className="text-xs text-slate-300 max-w-2xl mt-1 leading-relaxed">
                    Examine dezenas em comum, taxa de similaridade (Jaccard), cobertura conjunta e descubra se seus jogos estão se sobrepondo em excesso ou se complementando perfeitamente.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {onAddBet && (
                    <button
                      onClick={handleGenerateDivergentBet}
                      className="px-4 py-2.5 rounded-2xl bg-white text-slate-950 font-black text-xs hover:bg-slate-100 transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
                    >
                      <Sparkles size={14} className="text-amber-600" />
                      <span>Gerar Jogo Divergente</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Seletor Rápido de Jogos para Comparar */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <SlidersHorizontal size={14} />
                  Selecione de 2 a 4 Jogos da sua Carteira:
                </span>
                <span className="text-[11px] text-slate-500">
                  {selectedBetIds.length}/4 selecionados
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {savedBets.map((bet, idx) => {
                  const isSelected = selectedBetIds.includes(bet.id);
                  const selectionIndex = selectedBetIds.indexOf(bet.id);

                  return (
                    <button
                      key={bet.id}
                      onClick={() => toggleSelectBet(bet.id)}
                      className={`p-3 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected 
                          ? isMaisMilionaria
                            ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-400/40'
                            : 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-400/40'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-slate-500">
                          Jogo #{savedBets.length - idx}
                        </span>
                        {isSelected ? (
                          <span className={`w-5 h-5 rounded-full text-white font-black text-[10px] flex items-center justify-center ${
                            isMaisMilionaria ? 'bg-amber-600' : 'bg-emerald-600'
                          }`}>
                            {selectionIndex + 1}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-semibold">+ Selecionar</span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1 mt-2">
                        {bet.numbers.map(n => {
                          const isCommonAll = commonNumbers.includes(n);
                          return (
                            <span 
                              key={n}
                              className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-bold ${
                                isCommonAll 
                                  ? 'bg-amber-400 text-slate-950 ring-1 ring-amber-600' 
                                  : 'bg-white border border-slate-200 text-slate-800'
                              }`}
                            >
                              {n.toString().padStart(2, '0')}
                            </span>
                          );
                        })}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cartões Lado a Lado dos Jogos Selecionados */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {selectedBets.map((bet, idx) => {
                const sum = bet.numbers.reduce((a, b) => a + b, 0);
                const evens = bet.numbers.filter(n => n % 2 === 0).length;
                const odds = bet.numbers.length - evens;

                return (
                  <div 
                    key={bet.id}
                    className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col justify-between space-y-3 relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase text-white ${
                        isMaisMilionaria ? 'bg-amber-600' : 'bg-emerald-700'
                      }`}>
                        Jogo Comparado {idx + 1}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(bet.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 py-1 justify-center sm:justify-start">
                      {bet.numbers.map(n => {
                        const isCommon = commonNumbers.includes(n);
                        return (
                          <div key={n} className="relative">
                            <div className={`w-9 h-9 rounded-xl font-mono font-black text-xs flex items-center justify-center shadow-xs border ${
                              isCommon
                                ? 'bg-amber-400 text-slate-950 border-amber-600 ring-2 ring-amber-300'
                                : 'bg-slate-900 text-white border-slate-800'
                            }`}>
                              {n.toString().padStart(2, '0')}
                            </div>
                            {isCommon && (
                              <span className="absolute -top-1.5 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 border border-white" title="Dezena em comum com todos"></span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-2 border-t border-slate-100 text-[11px] space-y-1 text-slate-600">
                      <div className="flex justify-between">
                        <span>Soma:</span>
                        <strong className="text-slate-900">{sum}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Paridade:</span>
                        <strong className="text-slate-900">{evens}P / {odds}I</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Origem:</span>
                        <span className="capitalize font-semibold text-slate-700">{bet.type}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {verdict && (
              <div className={`p-4 sm:p-5 rounded-3xl border flex items-start gap-3.5 ${
                verdict.level === 'warning'
                  ? 'bg-amber-50 border-amber-200 text-amber-950'
                  : verdict.level === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : 'bg-blue-50 border-blue-200 text-blue-950'
              }`}>
                <div className="p-2 rounded-2xl bg-white shadow-xs">
                  {verdict.level === 'warning' ? (
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  ) : verdict.level === 'success' ? (
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <Info className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-sm font-black">{verdict.title}</h4>
                  <p className="text-xs leading-relaxed opacity-90">{verdict.description}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                    <Layers size={16} className="text-amber-600" />
                    <span>Dezenas Compartilhadas por Todos ({commonNumbers.length})</span>
                  </h4>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Interseção</span>
                </div>

                {commonNumbers.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2 pt-1">
                      {commonNumbers.map(n => (
                        <span 
                          key={n}
                          className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 font-black font-mono text-sm flex items-center justify-center shadow-xs border border-amber-500"
                        >
                          {n.toString().padStart(2, '0')}
                        </span>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Estas dezenas estão presentes em 100% dos jogos selecionados. Se forem sorteadas, impulsionam todas as apostas; se não saírem, penalizam todas ao mesmo tempo.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-50 text-center text-xs text-slate-500 font-medium">
                    ✅ Nenhuma dezena é compartilhada simultaneamente por todos os jogos. Alta independência!
                  </div>
                )}
              </div>

              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                    <Percent size={16} className="text-emerald-600" />
                    <span>Cobertura Total Conjunta ({unionNumbers.length} de {maxLimit})</span>
                  </h4>
                  <span className="text-[10px] font-bold text-emerald-700">
                    {((unionNumbers.length / maxLimit) * 100).toFixed(1)}% da cartela
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {unionNumbers.map(n => {
                    const isCommon = commonNumbers.includes(n);
                    return (
                      <span 
                        key={n}
                        className={`w-7 h-7 rounded-lg font-mono text-xs font-bold flex items-center justify-center ${
                          isCommon 
                            ? 'bg-amber-400 text-slate-950 font-black' 
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {n.toString().padStart(2, '0')}
                      </span>
                    );
                  })}
                </div>

                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${isMaisMilionaria ? 'bg-amber-600' : 'bg-emerald-600'}`}
                    style={{ width: `${(unionNumbers.length / maxLimit) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {pairwiseStats.length > 0 && (
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <ArrowRightLeft size={16} className="text-slate-600" />
                  <span>Matriz de Colisão e Semelhança Par a Par (Índice de Jaccard)</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {pairwiseStats.map(stat => (
                    <div 
                      key={`${stat.gameAId}-${stat.gameBId}`}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-black text-slate-800">
                          Jogo {stat.gameAIndex} vs Jogo {stat.gameBIndex}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                          stat.collisionLevel === 'alta'
                            ? 'bg-red-100 text-red-800'
                            : stat.collisionLevel === 'moderada'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {stat.collisionLevel === 'alta' ? 'Alta Colisão' : stat.collisionLevel === 'moderada' ? 'Média' : 'Disperso'}
                        </span>
                      </div>

                      <div className="flex justify-between text-slate-600">
                        <span>Dezenas em comum:</span>
                        <strong className="text-slate-900">{stat.common.length} {stat.common.length > 0 ? `(${stat.common.map(n => n.toString().padStart(2, '0')).join(', ')})` : ''}</strong>
                      </div>

                      <div className="flex justify-between text-slate-600">
                        <span>Similaridade Jaccard:</span>
                        <strong className="text-slate-900">{stat.jaccardPercent}%</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
};

export default GameComparatorView;
