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
  FileDown
} from 'lucide-react';
import { GeneratorLogic, OfficialDrawResult } from '../types';
import { generatePortfolioWithRules } from '../utils/lotteryRules';
import { generateHybridCoveragePortfolio } from '../utils/hybridCoverageStrategy';
import { exportProspectiveAuditPdf } from '../utils/comparatorPdfExport';
import {
  ProspectiveAuditEntry,
  analyzePortfolioCoverage,
  computeCommitmentHash,
  drawRandomTicket,
  evaluatePortfolioAgainstDraw,
  generateCombinatorialPortfolio,
  generateRandomDistinctPortfolio,
  twoProportionZTest
} from '../utils/portfolioOptimizer';

interface ProspectiveAuditPanelProps {
  logicOptions: GeneratorLogic;
  latestOfficialDraw: OfficialDrawResult;
  onSaveGamesToHistory?: (games: number[][], label: string) => void;
}

const STORAGE_KEY = 'mega_sorte_prospective_ledger_v1';
const MEGA_TICKET_PRICE = 5.0;

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

  const [targetContest, setTargetContest] = useState<number>(() => (latestOfficialDraw?.contestNumber || 3069) + 1);
  const [ticketCount, setTicketCount] = useState<number>(78);
  const [strategyChoice, setStrategyChoice] = useState<'hybrid_combinatorial' | 'combinatorial_cover' | 'combinatorial_plausible' | 'classic_dedup'>('hybrid_combinatorial');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSimulating50, setIsSimulating50] = useState(false);
  const [viewFilter, setViewFilter] = useState<'real' | 'synthetic' | 'all'>('real');
  const [drawInputs, setDrawInputs] = useState<Record<string, string>>({});
  const [drawErrors, setDrawErrors] = useState<Record<string, string>>({});
  const [inspectedEntryId, setInspectedEntryId] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // ignore storage quota errors
    }
  }, [entries]);

  const handleCommitPortfolio = async () => {
    setIsGenerating(true);
    try {
      const safeSize = Math.max(5, Math.min(200, Number(ticketCount) || 78));
      let optimizedGames: number[][];
      let strategyLabel: string;

      if (strategyChoice === 'hybrid_combinatorial') {\n        optimizedGames = generateHybridCoveragePortfolio(safeSize, { betSize: 6, seed: Date.now(), candidatesPerTicket: 320 }).games;\n        strategyLabel = 'Estratégia Híbrida de Cobertura Combinatória';\n      } else if (strategyChoice === 'combinatorial_cover') {
        optimizedGames = generateCombinatorialPortfolio(safeSize, {
          betSize: 6,
          maxNum: 60,
          useStructuralPlausibility: false
        });
        strategyLabel = 'Cobertura Combinatória Pura (Anti-Colisão)';
      } else if (strategyChoice === 'combinatorial_plausible') {
        optimizedGames = generateCombinatorialPortfolio(safeSize, {
          betSize: 6,
          maxNum: 60,
          useStructuralPlausibility: true
        });
        strategyLabel = 'Cobertura Combinatória + Plausibilidade Estrutural';
      } else {
        const res = generatePortfolioWithRules(safeSize, 6, {
          ...logicOptions,
          calculationStrategy: logicOptions.calculationStrategy === 'combinatorial_cover' ? 'balanced' : logicOptions.calculationStrategy
        }, latestOfficialDraw.numbers);
        optimizedGames = res.games.map(g => g.numbers);
        strategyLabel = 'Algoritmo Clássico Deduplicado';
      }

      const randomBaselineGames = generateRandomDistinctPortfolio(safeSize, 6, 60);
      const createdAt = Date.now();
      const commitmentHash = await computeCommitmentHash({
        targetContest,
        createdAt,
        optimizedGames,
        randomBaselineGames
      });

      const newEntry: ProspectiveAuditEntry = {
        id: `prosp_${targetContest}_${createdAt}`,
        targetContest,
        createdAt,
        strategyLabel,
        strategyKey: strategyChoice,
        ticketCount: safeSize,
        betSize: 6,
        ticketPrice: MEGA_TICKET_PRICE,
        totalCost: safeSize * MEGA_TICKET_PRICE,
        optimizedGames,
        randomBaselineGames,
        commitmentHash,
        locked: true,
        isSyntheticTest: false,
        optimizedCoverage: analyzePortfolioCoverage(optimizedGames, 60),
        randomCoverage: analyzePortfolioCoverage(randomBaselineGames, 60)
      };

      setEntries(prev => [newEntry, ...prev]);
      setTargetContest(c => c + 1);
    } finally {
      setIsGenerating(false);
    }
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

      // Gera em pequenas fatias assíncronas para manter a UI responsiva
      for (let i = 0; i < 50; i++) {
        const usePlausibility = strategyChoice === 'combinatorial_plausible';
        const optimizedGames =
          strategyChoice === 'classic_dedup'
            ? generatePortfolioWithRules(safeSize, 6, { ...logicOptions, calculationStrategy: 'balanced' }, latestOfficialDraw.numbers).games.map(g => g.numbers)
            : generateCombinatorialPortfolio(safeSize, {
                betSize: 6,
                maxNum: 60,
                useStructuralPlausibility: usePlausibility,
                candidatesPerTicket: 160
              });
        const randomBaselineGames = generateRandomDistinctPortfolio(safeSize, 6, 60);
        const createdAt = Date.now() + i;
        const cNum = baseContest + i;
        const commitmentHash = await computeCommitmentHash({
          targetContest: cNum,
          createdAt,
          optimizedGames,
          randomBaselineGames
        });

        // Sorteio gerado estritamente APÓS o travamento da carteira
        const simulatedDraw = drawRandomTicket(6, 60);
        const optimizedEval = evaluatePortfolioAgainstDraw(optimizedGames, simulatedDraw);
        const randomEval = evaluatePortfolioAgainstDraw(randomBaselineGames, simulatedDraw);

        batch.push({
          id: `synth_${cNum}_${createdAt}`,
          targetContest: cNum,
          createdAt,
          strategyLabel:
            strategyChoice === 'classic_dedup'
              ? 'Clássico Deduplicado (Benchmark 50)'
              : usePlausibility
              ? 'Cobertura + Plausibilidade (Benchmark 50)'
              : 'Cobertura Combinatória Pura (Benchmark 50)',
          strategyKey: strategyChoice,
          ticketCount: safeSize,
          betSize: 6,
          ticketPrice: MEGA_TICKET_PRICE,
          totalCost: safeSize * MEGA_TICKET_PRICE,
          optimizedGames,
          randomBaselineGames,
          commitmentHash,
          locked: true,
          isSyntheticTest: true,
          optimizedCoverage: analyzePortfolioCoverage(optimizedGames, 60),
          randomCoverage: analyzePortfolioCoverage(randomBaselineGames, 60),
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
    let totalBets = 0;

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
      totalBets += e.ticketCount;
    }

    const zTest3Plus = twoProportionZTest(optContestsWith3Plus, n, randContestsWith3Plus, n);
    const zTest4Plus = twoProportionZTest(optContestsWith4Plus, n, randContestsWith4Plus, n);

    return {
      count: n,
      totalBets,
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
                Meta de Validação: {realCount} / 50 concursos reais acumulados
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
              <Scale size={22} className="text-emerald-400" />
              <span>Auditoria Prospectiva: Cobertura Otimizada vs Aleatória</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Gera e <strong>trava com assinatura criptográfica SHA-256</strong> uma carteira otimizada antes do sorteio, junto a uma <strong>carteira aleatória pareada de mesmo orçamento</strong>. O resultado oficial é incorporado apenas após o concurso, acumulando desempenho real sem viés retrospectivo.
            </p>
          </div>

          <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-3.5 min-w-[210px] space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
              <span>Progresso (50 concursos)</span>
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
      </div>

      {/* Painel de Registro Pré-Sorteio */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Lock size={18} className="text-emerald-600" />
              <span>1. Gerar &amp; Travar Carteira Antes do Sorteio</span>
            </h3>
            <p className="text-xs text-slate-500">
              Cada registro trava simultaneamente os seus jogos e uma carteira aleatória controle com exatamente a mesma quantidade de apostas.
            </p>
          </div>
          <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl">
            Orçamento: R$ {(ticketCount * MEGA_TICKET_PRICE).toFixed(2).replace('.', ',')} ({ticketCount} jogos)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          {/* Quantidade de Jogos */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-700 block">Tamanho da Carteira (Jogos de 6 dez.)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={5}
                max={200}
                value={ticketCount}
                onChange={e => setTicketCount(Math.max(5, Math.min(200, Number(e.target.value) || 78)))}
                className="w-24 px-3 py-2.5 rounded-xl border border-slate-200 font-black text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <div className="flex flex-wrap gap-1">
                {[10, 30, 55, 78].map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTicketCount(preset)}
                    className={`px-2.5 py-2 rounded-lg text-xs font-black border cursor-pointer transition-colors ${
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
          </div>

          {/* Estratégia */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-700 block">Motor Matemático da Carteira</label>
            <select
              value={strategyChoice}
              onChange={e => setStrategyChoice(e.target.value as typeof strategyChoice)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-800 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="hybrid_combinatorial">Estratégia Híbrida de Cobertura Combinatória</option>\n              <option value="combinatorial_cover">Cobertura Combinatória Pura (Anti-Colisão)</option>
              <option value="combinatorial_plausible">Cobertura + Plausibilidade Estrutural</option>
              <option value="classic_dedup">Algoritmo Clássico Deduplicado (Comparação)</option>
            </select>
            <span className="text-[11px] text-slate-500 block">
              Sem viés de dezenas quentes/atrasadas nos modos combinatórios.
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
              <span>{isSimulating50 ? 'Executando 50 Concursos...' : 'Executar Benchmark Prospectivo (50 Sorteios)'}</span>
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

      {/* Filtro Real vs Simulação + Painel Estatístico Acumulado */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <BarChart3 size={18} className="text-emerald-600" />
              <span>2. Desempenho Acumulado (Otimizada vs Aleatória Pareada)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Comparação pareada em concursos encerrados: mesma quantidade de jogos e mesmo sorteio oficial.
            </p>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-black">
            {[
              { id: 'real', label: `Reais (${entries.filter(e => !e.isSyntheticTest).length})` },
              { id: 'synthetic', label: `Benchmark 50 (${entries.filter(e => e.isSyntheticTest).length})` },
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
              Trave uma carteira acima para o próximo concurso e incorpore o resultado oficial após o sorteio, ou clique em <strong>Executar Benchmark Prospectivo (50 Sorteios)</strong> para validar o comportamento estatístico em 50 concursos inéditos.
            </p>
          </div>
        ) : (
          <>
            {/* Cards KPI Comparativos */}
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
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">Cobertura Média de Pares</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-slate-900">{aggregate.avgOptPairCov.toFixed(1)}%</span>
                  <span className="text-xs font-bold text-slate-500">vs {aggregate.avgRandPairCov.toFixed(1)}% aleat.</span>
                </div>
                <span className="text-[11px] text-slate-600 font-semibold block">
                  Sobre C(60,2) = 1.770 duplas únicas
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">Teste Z (Otimizada vs Aleatória)</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-slate-900">z = {aggregate.zTest3Plus.zScore.toFixed(2)}</span>
                  <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                    aggregate.zTest3Plus.pValue < 0.05 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                  }`}>
                    p = {aggregate.zTest3Plus.pValue.toFixed(4)}
                  </span>
                </div>
                <span className="text-[11px] text-slate-600 font-semibold block">
                  {aggregate.count} concursos ({aggregate.totalBets.toLocaleString('pt-BR')} apostas/grupo)
                </span>
              </div>
            </div>

            {/* Gráfico SVG Acumulado Concurso a Concurso */}
            {cumulativeSeries.length >= 2 && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-black text-slate-800">
                    Taxa Acumulada de Concursos com &ge; 1 Prêmio (3+ dezenas) ao Longo do Tempo
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
                    {/* Linhas de grade 0%, 50%, 100% */}
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

                    {/* Curva Aleatória */}
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

                    {/* Curva Otimizada */}
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

        {/* Aviso metodológico transparente */}
        <div className="flex items-start gap-2.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 text-xs text-amber-950">
          <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Rigor científico:</strong> A cobertura combinatória maximiza a probabilidade de <em>ao menos um prêmio por concurso</em> (P(&ge;1 Terno) e P(&ge;1 Quadra)) ao eliminar colisões e duplicatas — ela <strong>não</strong> prevê dezenas individuais e não altera o valor esperado matemático por bilhete em sorteios equiprováveis.
          </p>
        </div>
      </div>

      {/* Ledger de Concursos Registrados (Travados Imutáveis) */}
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
                      {entry.isSyntheticTest && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800">
                          Simulação
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                        <Lock size={10} /> SHA-256: {entry.commitmentHash.slice(0, 12)}…
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
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

                  {/* Métricas de cobertura travadas no momento da geração */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
                    <div className="bg-white rounded-xl p-2 border border-slate-200">
                      <span className="text-slate-500 block">Distintos</span>
                      <strong className="text-slate-900">
                        {entry.optimizedCoverage.distinctGames}/{entry.ticketCount}
                      </strong>
                    </div>
                    <div className="bg-white rounded-xl p-2 border border-slate-200">
                      <span className="text-slate-500 block">Dezenas Cobertas</span>
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
                      <strong className="text-slate-900">{entry.optimizedCoverage.uniqueTriples}</strong>
                    </div>
                    <div className="bg-white rounded-xl p-2 border border-slate-200">
                      <span className="text-slate-500 block">Freq. Min–Máx</span>
                      <strong className="text-slate-900">
                        {entry.optimizedCoverage.minFreq}–{entry.optimizedCoverage.maxFreq} (Gini {entry.optimizedCoverage.giniCoefficient.toFixed(2)})
                      </strong>
                    </div>
                  </div>

                  {/* Entrada de resultado pós-sorteio ou placar final */}
                  {isEvaluated ? (
                    <div className="bg-white rounded-2xl p-3.5 border border-emerald-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
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

                  {/* Visualizador opcional dos jogos travados */}
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
    </div>
  );
};
