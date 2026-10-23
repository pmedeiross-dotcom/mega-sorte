import React, { useMemo, useState, useDeferredValue } from 'react';
import { 
  Calculator, 
  Target, 
  TrendingUp, 
  Award, 
  Sparkles, 
  BarChart3, 
  CheckCircle2, 
  DollarSign, 
  Clock, 
  ShieldCheck, 
  PlusCircle,
  Info,
  RefreshCw
} from 'lucide-react';
import { Bet, OfficialDrawResult } from '../types';
import { 
  calculatePortfolioProbability, 
  generateComplementaryBet,
  PortfolioProbabilityStats, 
  AVERAGE_PRIZE_SENA,
  AVERAGE_PRIZE_QUINA,
  AVERAGE_PRIZE_QUADRA
} from '../utils/probabilityEngine';
import NumberBall from './NumberBall';

interface ProbabilitySimulatorViewProps {
  savedBets: Bet[];
  latestDraw: OfficialDrawResult;
  onAddBet?: (numbers: number[], type: 'ai' | 'smart_rules' | 'manual', reasoning?: string) => void;
  onGoToGenerator?: () => void;
}

export const ProbabilitySimulatorView: React.FC<ProbabilitySimulatorViewProps> = ({
  savedBets,
  latestDraw,
  onAddBet,
  onGoToGenerator
}) => {
  const [isGeneratingComplementary, setIsGeneratingComplementary] = useState(false);

  // Diferimento dos dados com useDeferredValue para garantir 60fps constantes na interface
  const deferredSavedBets = useDeferredValue(savedBets);
  const deferredLatestDraw = useDeferredValue(latestDraw);

  // Cálculo combinatório de probabilidades com prioridade diferida
  const stats: PortfolioProbabilityStats = useMemo(() => {
    try {
      return calculatePortfolioProbability(deferredSavedBets);
    } catch (e) {
      console.error("Erro ao calcular probabilidades da carteira:", e);
      return calculatePortfolioProbability([]);
    }
  }, [deferredSavedBets]);

  // Formata moeda brasileira
  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  };

  // Avaliação direta e segura contra o último sorteio oficial Caixa
  const lastDrawHitsAnalysis = useMemo(() => {
    if (!latestDraw?.numbers || !Array.isArray(latestDraw.numbers) || savedBets.length === 0) {
      return null;
    }
    const drawnSet = new Set(latestDraw.numbers);
    
    let maxHits = 0;
    let senaCount = 0;
    let quinaCount = 0;
    let quadraCount = 0;
    let ternoCount = 0;
    let bestBet: Bet | undefined;

    savedBets.forEach(b => {
      const hits = b.numbers.filter(n => drawnSet.has(n)).length;
      if (hits > maxHits) {
        maxHits = hits;
        bestBet = b;
      }
      if (hits === 6) senaCount++;
      else if (hits === 5) quinaCount++;
      else if (hits === 4) quadraCount++;
      else if (hits === 3) ternoCount++;
    });

    return {
      maxHits,
      senaCount,
      quinaCount,
      quadraCount,
      ternoCount,
      bestBet: bestBet || savedBets[0]
    };
  }, [latestDraw, savedBets]);

  // Gerar aposta complementar com setTimeout debounce para manter fluidez
  const handleGenerateComplementary = () => {
    if (!onAddBet || isGeneratingComplementary) return;
    setIsGeneratingComplementary(true);
    setTimeout(() => {
      try {
        const complementaryNumbers = generateComplementaryBet(savedBets);
        onAddBet(
          complementaryNumbers, 
          'smart_rules', 
          'Aposta Complementar Otimizada: Desenvolvida para cobrir dezenas ausentes com alto índice histórico e maximizar a probabilidade da carteira.'
        );
      } catch (err) {
        console.error("Erro ao gerar aposta complementar:", err);
      } finally {
        setIsGeneratingComplementary(false);
      }
    }, 25);
  };

  // Se a carteira estiver vazia
  if (savedBets.length === 0) {
    return (
      <div className="bg-white rounded-3xl shadow-sm border border-emerald-100 p-6 sm:p-10 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
          <Calculator size={32} />
        </div>
        <div className="max-w-lg mx-auto">
          <h2 className="text-xl sm:text-2xl font-black text-emerald-950">
            Simulador de Probabilidade Matemática
          </h2>
          <p className="text-sm text-slate-600 mt-2">
            Você ainda não tem apostas salvas. Monte seus bilhetes na cartela ou gere combinações com Inteligência Artificial para calcular sua chance real de acerto (Quadra, Quina e Sena) para o próximo concurso.
          </p>
        </div>

        {/* Tabela de Probabilidades Oficiais Caixa como Referência */}
        <div className="max-w-2xl mx-auto bg-slate-50 border border-slate-200/80 rounded-2xl p-5 text-left">
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
            <Info size={14} className="text-emerald-600" />
            <span>Probabilidade Base Oficial da Caixa (1 Aposta Simples de 6 Dezenas)</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-emerald-100 shadow-sm">
              <span className="text-[10px] font-black uppercase text-emerald-800">Sena (6 acertos)</span>
              <p className="text-base font-black text-emerald-950 mt-1">1 em 50.063.860</p>
              <p className="text-[11px] text-slate-500">0,000002% de chance</p>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-teal-100 shadow-sm">
              <span className="text-[10px] font-black uppercase text-teal-800">Quina (5 acertos)</span>
              <p className="text-base font-black text-teal-950 mt-1">1 em 154.518</p>
              <p className="text-[11px] text-slate-500">0,00065% de chance</p>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-blue-100 shadow-sm">
              <span className="text-[10px] font-black uppercase text-blue-800">Quadra (4 acertos)</span>
              <p className="text-base font-black text-blue-950 mt-1">1 em 2.332</p>
              <p className="text-[11px] text-slate-500">0,0429% de chance</p>
            </div>
          </div>
        </div>

        {onGoToGenerator && (
          <button
            type="button"
            onClick={onGoToGenerator}
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm px-6 py-3.5 rounded-2xl shadow-md transition-all active:scale-[0.98]"
          >
            <Sparkles size={18} />
            <span>Gerar Minhas Apostas Agora</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner Principal do Simulador */}
      <div className="bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 text-white rounded-3xl p-5 sm:p-7 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Simulador Matemático
              </span>
              <span className="text-xs text-emerald-200/80 font-medium">
                Próximo Concurso Oficial #{latestDraw.contestNumber + 1}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1 flex items-center space-x-2">
              <Calculator size={24} className="text-emerald-400" />
              <span>Chance Real de Acerto para o Próximo Sorteio</span>
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/80 mt-1 max-w-2xl">
              Cálculo exato baseado nas suas <strong>{stats.totalGames} apostas salvas</strong> ({stats.uniqueCombinations} combinações equivalentes) e nas médias de probabilidade combinatória oficial.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-emerald-300 block">Investimento Total</span>
              <span className="text-base sm:text-lg font-black text-white">{formatBRL(stats.totalCost)}</span>
            </div>
            <div className="h-7 w-px bg-white/20 mx-1" />
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-teal-300 block">Eficiência Geral</span>
              <span className="text-base sm:text-lg font-black text-teal-300">{stats.efficiencyScore}/100</span>
            </div>
          </div>
        </div>
      </div>

      {/* OS 3 CARDS MESTRES DE PROBABILIDADE (SENA, QUINA, QUADRA) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        
        {/* CARD SENA */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-emerald-500/40 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-100 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between">
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center space-x-1">
                <Sparkles size={11} className="text-emerald-700" />
                <span>SENA (6 ACERTOS)</span>
              </span>
              <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg">
                {stats.senaMultiplierVsSingle}x mais chance
              </span>
            </div>

            <div className="mt-4">
              <span className="text-[11px] font-bold text-slate-500 block">Probabilidade Real no Próximo Sorteio</span>
              <p className="text-2xl sm:text-3xl font-black text-emerald-950 tracking-tight mt-0.5">
                1 em {stats.senaOddsOneIn.toLocaleString('pt-BR')}
              </p>
              <p className="text-xs font-semibold text-emerald-700 mt-1">
                {(stats.senaProbability * 100).toFixed(6)}% de chance
              </p>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-600">
              <span className="flex items-center space-x-1">
                <DollarSign size={13} className="text-emerald-600" />
                <span>Prêmio Médio Estimado:</span>
              </span>
              <span className="font-black text-emerald-950">
                {latestDraw.estimatedNextPrize || formatBRL(AVERAGE_PRIZE_SENA)}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span className="flex items-center space-x-1">
                <Clock size={13} className="text-slate-400" />
                <span>Tempo estatístico médio:</span>
              </span>
              <span className="font-bold text-slate-800">
                {stats.estimatedYearsForSena > 1000 ? `~${Math.round(stats.estimatedYearsForSena / 1000)}k anos` : `~${stats.estimatedYearsForSena} anos`}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-500 text-[11px]">
              <span>Aposta simples (base):</span>
              <span>1 em 50.063.860</span>
            </div>
          </div>
        </div>

        {/* CARD QUINA */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-teal-500/40 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-teal-100 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between">
              <span className="bg-teal-100 text-teal-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center space-x-1">
                <Award size={11} className="text-teal-700" />
                <span>QUINA (5 ACERTOS)</span>
              </span>
              <span className="text-xs font-black text-teal-700 bg-teal-50 px-2 py-0.5 rounded-lg">
                {stats.quinaMultiplierVsSingle}x mais chance
              </span>
            </div>

            <div className="mt-4">
              <span className="text-[11px] font-bold text-slate-500 block">Probabilidade Real no Próximo Sorteio</span>
              <p className="text-2xl sm:text-3xl font-black text-teal-950 tracking-tight mt-0.5">
                1 em {stats.quinaOddsOneIn.toLocaleString('pt-BR')}
              </p>
              <p className="text-xs font-semibold text-teal-700 mt-1">
                {(stats.quinaProbability * 100).toFixed(5)}% de chance
              </p>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-600">
              <span className="flex items-center space-x-1">
                <DollarSign size={13} className="text-teal-600" />
                <span>Prêmio Médio Estimado:</span>
              </span>
              <span className="font-black text-teal-950">{formatBRL(AVERAGE_PRIZE_QUINA)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span className="flex items-center space-x-1">
                <Clock size={13} className="text-slate-400" />
                <span>Tempo estatístico médio:</span>
              </span>
              <span className="font-bold text-slate-800">
                ~{stats.estimatedYearsForQuina} anos ({stats.estimatedDrawsForQuina.toLocaleString('pt-BR')} concursos)
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-500 text-[11px]">
              <span>Aposta simples (base):</span>
              <span>1 em 154.518</span>
            </div>
          </div>
        </div>

        {/* CARD QUADRA */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-blue-500/40 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-100 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between">
              <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center space-x-1">
                <ShieldCheck size={11} className="text-blue-700" />
                <span>QUADRA (4 ACERTOS)</span>
              </span>
              <span className="text-xs font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg">
                {stats.quadraMultiplierVsSingle}x mais chance
              </span>
            </div>

            <div className="mt-4">
              <span className="text-[11px] font-bold text-slate-500 block">Probabilidade Real no Próximo Sorteio</span>
              <p className="text-2xl sm:text-3xl font-black text-blue-950 tracking-tight mt-0.5">
                1 em {stats.quadraOddsOneIn.toLocaleString('pt-BR')}
              </p>
              <p className="text-xs font-semibold text-blue-700 mt-1">
                {(stats.quadraProbability * 100).toFixed(3)}% de chance
              </p>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-600">
              <span className="flex items-center space-x-1">
                <DollarSign size={13} className="text-blue-600" />
                <span>Prêmio Médio Estimado:</span>
              </span>
              <span className="font-black text-blue-950">{formatBRL(AVERAGE_PRIZE_QUADRA)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span className="flex items-center space-x-1">
                <Clock size={13} className="text-slate-400" />
                <span>Tempo estatístico médio:</span>
              </span>
              <span className="font-bold text-slate-800">
                {stats.estimatedYearsForQuadra < 1 ? `~${Math.round(stats.estimatedYearsForQuadra * 12)} meses` : `~${stats.estimatedYearsForQuadra} anos`} ({stats.estimatedDrawsForQuadra} sorteios)
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-500 text-[11px]">
              <span>Aposta simples (base):</span>
              <span>1 em 2.332</span>
            </div>
          </div>
        </div>
      </div>

      {/* Comparativo Visual: Aposta Simples vs Sua Carteira */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-emerald-100 shadow-sm space-y-4">
        <h3 className="text-base font-black text-emerald-950 flex items-center space-x-2">
          <TrendingUp size={18} className="text-emerald-600" />
          <span>Multiplicador de Probabilidade da Sua Carteira Salva</span>
        </h3>
        <p className="text-xs text-slate-600">
          Veja como suas {stats.totalGames} apostas salvas aumentam a probabilidade de acerto em relação a jogar apenas 1 volante comum:
        </p>

        <div className="space-y-4 pt-2">
          {/* Barra Quadra */}
          <div>
            <div className="flex justify-between text-xs font-bold mb-1.5">
              <span className="text-blue-900">Quadra (4 acertos)</span>
              <span className="text-blue-700">
                1 em {stats.quadraOddsOneIn} vs 1 em 2.332 ({stats.quadraMultiplierVsSingle}x mais chance)
              </span>
            </div>
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-700" 
                style={{ width: `${Math.min(100, Math.max(5, (2332 / stats.quadraOddsOneIn) * 10))}%` }} 
              />
            </div>
          </div>

          {/* Barra Quina */}
          <div>
            <div className="flex justify-between text-xs font-bold mb-1.5">
              <span className="text-teal-900">Quina (5 acertos)</span>
              <span className="text-teal-700">
                1 em {stats.quinaOddsOneIn.toLocaleString('pt-BR')} vs 1 em 154.518 ({stats.quinaMultiplierVsSingle}x mais chance)
              </span>
            </div>
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
              <div 
                className="h-full bg-gradient-to-r from-teal-500 to-emerald-600 rounded-full transition-all duration-700" 
                style={{ width: `${Math.min(100, Math.max(5, (154518 / stats.quinaOddsOneIn) * 10))}%` }} 
              />
            </div>
          </div>

          {/* Barra Sena */}
          <div>
            <div className="flex justify-between text-xs font-bold mb-1.5">
              <span className="text-emerald-900">Sena (6 acertos)</span>
              <span className="text-emerald-700">
                1 em {stats.senaOddsOneIn.toLocaleString('pt-BR')} vs 1 em 50.063.860 ({stats.senaMultiplierVsSingle}x mais chance)
              </span>
            </div>
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-green-600 rounded-full transition-all duration-700" 
                style={{ width: `${Math.min(100, Math.max(5, stats.senaMultiplierVsSingle * 10))}%` }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* TESTE COM O ÚLTIMO SORTEIO OFICIAL INTEGRADO */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-emerald-100 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2">
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                Conferência Oficial
              </span>
              <span className="text-xs text-slate-400 font-medium">{latestDraw.date}</span>
            </div>
            <h3 className="text-lg font-black text-emerald-950 flex items-center space-x-2 mt-1">
              <Award size={22} className="text-emerald-600" />
              <span>Desempenho no Último Concurso Oficial #{latestDraw.contestNumber}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Veja como a sua carteira salva atual teria se comportado no sorteio oficial mais recente:
            </p>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {latestDraw.numbers.map(n => (
              <div
                key={n}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-mono font-black text-xs sm:text-sm flex items-center justify-center shadow-sm"
              >
                {n.toString().padStart(2, '0')}
              </div>
            ))}
          </div>
        </div>

        {lastDrawHitsAnalysis && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl">
                <span className="text-[10px] font-black uppercase text-emerald-800">Senas (6 acertos)</span>
                <p className="text-2xl font-black text-emerald-950 mt-1">{lastDrawHitsAnalysis.senaCount}</p>
                <span className="text-[11px] text-emerald-700 font-medium">
                  {lastDrawHitsAnalysis.senaCount > 0 ? 'Jackpot conquistado!' : 'Nenhum acerto máximo'}
                </span>
              </div>
              <div className="bg-teal-50 border border-teal-200 p-4 rounded-2xl">
                <span className="text-[10px] font-black uppercase text-teal-800">Quinas (5 acertos)</span>
                <p className="text-2xl font-black text-teal-950 mt-1">{lastDrawHitsAnalysis.quinaCount}</p>
                <span className="text-[11px] text-teal-700 font-medium">
                  {lastDrawHitsAnalysis.quinaCount > 0 ? 'Faixa premiada!' : '0 bilhetes'}
                </span>
              </div>
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl">
                <span className="text-[10px] font-black uppercase text-blue-800">Quadras (4 acertos)</span>
                <p className="text-2xl font-black text-blue-950 mt-1">{lastDrawHitsAnalysis.quadraCount}</p>
                <span className="text-[11px] text-blue-700 font-medium">
                  {lastDrawHitsAnalysis.quadraCount > 0 ? 'Faixa premiada!' : '0 bilhetes'}
                </span>
              </div>
              <div className="bg-purple-50 border border-purple-200 p-4 rounded-2xl">
                <span className="text-[10px] font-black uppercase text-purple-800">Ternos (3 acertos)</span>
                <p className="text-2xl font-black text-purple-950 mt-1">{lastDrawHitsAnalysis.ternoCount}</p>
                <span className="text-[11px] text-purple-700 font-medium">Sem prêmio Caixa</span>
              </div>
            </div>

            {lastDrawHitsAnalysis.bestBet && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-black text-slate-800 uppercase flex items-center space-x-1.5">
                    <Target size={16} className="text-emerald-600" />
                    <span>Seu Melhor Jogo Neste Concurso ({lastDrawHitsAnalysis.maxHits} acertos)</span>
                  </span>
                  <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                    lastDrawHitsAnalysis.maxHits >= 4 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {lastDrawHitsAnalysis.maxHits >= 6 ? 'Sena Premiada!' : lastDrawHitsAnalysis.maxHits === 5 ? 'Quina Premiada!' : lastDrawHitsAnalysis.maxHits === 4 ? 'Quadra Premiada!' : `${lastDrawHitsAnalysis.maxHits} Acertos`}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {lastDrawHitsAnalysis.bestBet.numbers.map(n => {
                    const isHit = latestDraw.numbers.includes(n);
                    return (
                      <div
                        key={n}
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center font-black text-xs sm:text-sm shadow-sm transition-all ${
                          isHit
                            ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white ring-2 ring-emerald-600 scale-105'
                            : 'bg-white text-slate-700 border border-slate-200'
                        }`}
                      >
                        {n.toString().padStart(2, '0')}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* COBERTURA DAS 60 DEZENAS E ESTATÍSTICAS HISTÓRICAS */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-emerald-100 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-lg font-black text-emerald-950 flex items-center space-x-2">
              <BarChart3 size={22} className="text-emerald-600" />
              <span>Mapa de Cobertura das 60 Dezenas</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Sua carteira cobre <strong>{stats.distinctNumbersCount} de 60 dezenas</strong> ({stats.coveragePercentage}% do volante oficial).
            </p>
          </div>

          <div className="flex items-center space-x-4 text-xs font-bold">
            <div className="flex items-center space-x-1.5">
              <div className="w-3.5 h-3.5 rounded-full bg-emerald-600" />
              <span className="text-slate-700">Cobertas ({stats.distinctNumbersCount})</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <div className="w-3.5 h-3.5 rounded-full bg-slate-200" />
              <span className="text-slate-500">Ausentes ({stats.missingNumbers.length})</span>
            </div>
          </div>
        </div>

        {/* Grid das 60 dezenas mostrando presença */}
        <div className="grid grid-cols-6 sm:grid-cols-10 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
          {Array.from({ length: 60 }, (_, i) => {
            const num = i + 1;
            const isCovered = stats.distinctNumbers.includes(num);
            const occurrences = savedBets.filter(b => b.numbers.includes(num)).length;

            return (
              <div
                key={num}
                className={`relative p-2 rounded-xl text-center transition-all ${
                  isCovered
                    ? 'bg-emerald-600 text-white font-black shadow-sm ring-1 ring-emerald-700'
                    : 'bg-white text-slate-400 font-medium border border-slate-200'
                }`}
              >
                <span className="text-xs sm:text-sm">{num.toString().padStart(2, '0')}</span>
                {occurrences > 1 && (
                  <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 text-[9px] font-black px-1 rounded-full shadow-xs">
                    {occurrences}x
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Métricas Estatísticas Complementares */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <span className="text-[10px] font-black uppercase text-slate-500">Zona de Ouro (Soma 160 a 240)</span>
            <p className="text-xl font-black text-emerald-900 mt-1">{stats.sumInGoldZonePercentage}% dos jogos</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Média histórica oficial: 78,4% dos sorteios</p>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <span className="text-[10px] font-black uppercase text-slate-500">Equilíbrio Par/Ímpar (3P/3I ou 4P/2I)</span>
            <p className="text-xl font-black text-teal-900 mt-1">{stats.balancedParityPercentage}% dos jogos</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Média histórica oficial: 79,5% dos sorteios</p>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <span className="text-[10px] font-black uppercase text-slate-500">Top 10 Histórico Coberto</span>
            <p className="text-xl font-black text-indigo-900 mt-1">{stats.topHistoricalCoveredCount} de 10 dezenas</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Dezenas mais frequentes em 3.071 concursos</p>
          </div>
        </div>
      </div>

      {/* Dicas e Diagnóstico Estatístico com Ação de Otimização */}
      <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-black text-emerald-950 flex items-center space-x-2">
            <ShieldCheck size={18} className="text-emerald-700" />
            <span>Diagnóstico Estatístico da Sua Carteira</span>
          </h4>
          <span className="bg-emerald-200/80 text-emerald-900 text-xs font-black px-2.5 py-1 rounded-xl">
            {stats.recommendationVerdict}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {stats.recommendationTips.map((tip, idx) => (
            <div key={idx} className="bg-white p-3.5 rounded-2xl border border-emerald-100 flex items-start space-x-2.5 text-xs text-slate-700">
              <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 flex-shrink-0" />
              <span>{tip}</span>
            </div>
          ))}
        </div>

        {/* Ação para Otimizar Cobertura */}
        {onAddBet && stats.missingNumbers.length > 0 && (
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-600">
              Faltam <strong>{stats.missingNumbers.length} dezenas</strong> para cobrir 100% da cartela da Mega-Sena.
            </p>
            <button
              type="button"
              onClick={handleGenerateComplementary}
              disabled={isGeneratingComplementary}
              className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center space-x-1.5"
            >
              {isGeneratingComplementary ? (
                <RefreshCw size={15} className="animate-spin" />
              ) : (
                <PlusCircle size={15} />
              )}
              <span>{isGeneratingComplementary ? 'Calculando Complementar...' : 'Gerar Aposta Complementar para Preencher Lacunas'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProbabilitySimulatorView;
