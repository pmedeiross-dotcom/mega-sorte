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
  RefreshCw,
  Layers,
  AlertTriangle,
  HelpCircle
} from 'lucide-react';
import { Bet, OfficialDrawResult, LotteryType } from '../types';
import { 
  calculatePortfolioProbability, 
  generateComplementaryBet,
  PortfolioProbabilityStats
} from '../utils/probabilityEngine';
import { LOTOFACIL_FRAME, LOTOFACIL_CENTER } from '../utils/lotofacilRules';

interface ProbabilitySimulatorViewProps {
  savedBets: Bet[];
  latestDraw: OfficialDrawResult;
  lottery?: LotteryType;
  onAddBet?: (numbers: number[], type: 'ai' | 'smart_rules' | 'manual', reasoning?: string) => void;
  onGoToGenerator?: () => void;
}

export const ProbabilitySimulatorView: React.FC<ProbabilitySimulatorViewProps> = ({
  savedBets,
  latestDraw,
  lottery = 'megasena',
  onAddBet,
  onGoToGenerator
}) => {
  const [isGeneratingComplementary, setIsGeneratingComplementary] = useState(false);
  const [showPlausibilityTheory, setShowPlausibilityTheory] = useState(false);

  const activeLottery: LotteryType = (lottery as LotteryType) || 'megasena';

  // Diferimento dos dados com useDeferredValue para garantir 60fps constantes na interface
  const deferredSavedBets = useDeferredValue(savedBets);
  const deferredLatestDraw = useDeferredValue(latestDraw);

  const isLotofacil = activeLottery === 'lotofacil';
  const isMaisMilionaria = activeLottery === 'maismilionaria';

  // Cálculo combinatório de probabilidades com prioridade diferida
  const stats: PortfolioProbabilityStats = useMemo(() => {
    try {
      return calculatePortfolioProbability(deferredSavedBets, activeLottery);
    } catch (e) {
      console.error("Erro ao calcular probabilidades da carteira:", e);
      return calculatePortfolioProbability([], activeLottery);
    }
  }, [deferredSavedBets, activeLottery]);

  // Formata moeda brasileira
  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  };

  // Nome formatado da loteria
  const lotteryTitle = isLotofacil ? 'Lotofácil' : (isMaisMilionaria ? '+Milionária' : 'Mega-Sena');

  // Cores temáticas
  const theme = {
    badgeBg: isLotofacil ? 'bg-purple-100 text-purple-800 border-purple-300' : isMaisMilionaria ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-emerald-100 text-emerald-800 border-emerald-300',
    bannerGradient: isLotofacil 
      ? 'from-purple-900 via-indigo-950 to-slate-900' 
      : isMaisMilionaria 
        ? 'from-amber-950 via-yellow-900 to-slate-900' 
        : 'from-emerald-900 via-teal-900 to-slate-900',
    bannerGlow: isLotofacil ? 'bg-purple-500/10' : isMaisMilionaria ? 'bg-amber-500/10' : 'bg-emerald-500/10',
    primaryColor: isLotofacil ? 'text-purple-600' : isMaisMilionaria ? 'text-amber-600' : 'text-emerald-600',
    activeBallBg: isLotofacil ? 'bg-purple-600 ring-purple-700' : isMaisMilionaria ? 'bg-amber-600 ring-amber-700' : 'bg-emerald-600 ring-emerald-700'
  };

  // Avaliação direta e segura contra o último sorteio oficial Caixa
  const lastDrawHitsAnalysis = useMemo(() => {
    if (!latestDraw?.numbers || !Array.isArray(latestDraw.numbers) || savedBets.length === 0) {
      return null;
    }
    const drawnSet = new Set(latestDraw.numbers);
    
    let maxHits = 0;
    let tier1Count = 0;
    let tier2Count = 0;
    let tier3Count = 0;
    let tier4Count = 0;
    let tier5Count = 0;
    let bestBet: Bet | undefined;

    savedBets.forEach(b => {
      const hits = b.numbers.filter(n => drawnSet.has(n)).length;
      if (hits > maxHits) {
        maxHits = hits;
        bestBet = b;
      }
      if (isLotofacil) {
        if (hits === 15) tier1Count++;
        else if (hits === 14) tier2Count++;
        else if (hits === 13) tier3Count++;
        else if (hits === 12) tier4Count++;
        else if (hits === 11) tier5Count++;
      } else {
        if (hits === 6) tier1Count++;
        else if (hits === 5) tier2Count++;
        else if (hits === 4) tier3Count++;
        else if (hits === 3) tier4Count++;
      }
    });

    return {
      maxHits,
      tier1Count,
      tier2Count,
      tier3Count,
      tier4Count,
      tier5Count,
      bestBet: bestBet || savedBets[0]
    };
  }, [latestDraw, savedBets, isLotofacil]);

  // Gerar aposta complementar com setTimeout debounce para manter fluidez
  const handleGenerateComplementary = () => {
    if (!onAddBet || isGeneratingComplementary) return;
    setIsGeneratingComplementary(true);
    setTimeout(() => {
      try {
        const complementaryNumbers = generateComplementaryBet(savedBets, activeLottery);
        onAddBet(
          complementaryNumbers, 
          'smart_rules', 
          `Aposta Complementar Otimizada (${lotteryTitle}): Desenvolvida para cobrir dezenas ausentes com alto índice histórico e maximizar a probabilidade da carteira.`
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
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 sm:p-10 text-center space-y-6">
        <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto shadow-inner ${isLotofacil ? 'bg-purple-100 text-purple-700' : isMaisMilionaria ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
          <Calculator size={32} />
        </div>
        <div className="max-w-xl mx-auto">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-black uppercase mb-2 border">
            <span className={theme.badgeBg}>Modalidade: {lotteryTitle}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            Simulador de Probabilidade Matemática da {lotteryTitle}
          </h2>
          <p className="text-sm text-slate-600 mt-2">
            Você ainda não tem apostas salvas na {lotteryTitle}. Monte seus bilhetes na cartela ou gere combinações inteligentes para calcular sua chance real de acerto acumulada para o próximo concurso.
          </p>
        </div>

        {/* Tabela de Probabilidades Oficiais Caixa como Referência */}
        <div className="max-w-2xl mx-auto bg-slate-50 border border-slate-200/80 rounded-2xl p-5 text-left">
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
            <Info size={14} className={theme.primaryColor} />
            <span>Probabilidades Oficiais da Caixa (1 Aposta Simples de {isLotofacil ? '15 dezenas' : '6 dezenas'})</span>
          </h3>

          {isLotofacil ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-white p-3.5 rounded-xl border border-purple-100 shadow-sm">
                <span className="text-[10px] font-black uppercase text-purple-800">15 Acertos (Máximo)</span>
                <p className="text-base font-black text-slate-900 mt-1">1 em 3.268.760</p>
                <p className="text-[11px] text-slate-500">~R$ 1.800.000 (0,00003%)</p>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-indigo-100 shadow-sm">
                <span className="text-[10px] font-black uppercase text-indigo-800">14 Acertos</span>
                <p className="text-base font-black text-slate-900 mt-1">1 em 21.791</p>
                <p className="text-[11px] text-slate-500">~R$ 1.500 (0,0046%)</p>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-blue-100 shadow-sm">
                <span className="text-[10px] font-black uppercase text-blue-800">13 Acertos</span>
                <p className="text-base font-black text-slate-900 mt-1">1 em 691</p>
                <p className="text-[11px] text-slate-500">R$ 30,00 fixo</p>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-teal-100 shadow-sm">
                <span className="text-[10px] font-black uppercase text-teal-800">12 Acertos</span>
                <p className="text-base font-black text-slate-900 mt-1">1 em 59</p>
                <p className="text-[11px] text-slate-500">R$ 12,00 fixo</p>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-emerald-100 shadow-sm">
                <span className="text-[10px] font-black uppercase text-emerald-800">11 Acertos</span>
                <p className="text-base font-black text-slate-900 mt-1">1 em 11</p>
                <p className="text-[11px] text-slate-500">R$ 6,00 fixo</p>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-amber-100 shadow-sm">
                <span className="text-[10px] font-black uppercase text-amber-800">Qualquer Prêmio</span>
                <p className="text-base font-black text-amber-950 mt-1">1 em 3,2</p>
                <p className="text-[11px] text-slate-500">31% de chance por jogo</p>
              </div>
            </div>
          ) : isMaisMilionaria ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white p-3.5 rounded-xl border border-amber-100 shadow-sm">
                <span className="text-[10px] font-black uppercase text-amber-800">Faixa 1 (6 + 2 Trevos)</span>
                <p className="text-base font-black text-slate-900 mt-1">1 em 238.360.500</p>
                <p className="text-[11px] text-slate-500">Jackpot R$ 25M+</p>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-orange-100 shadow-sm">
                <span className="text-[10px] font-black uppercase text-orange-800">Faixa 2 (6 dezenas)</span>
                <p className="text-base font-black text-slate-900 mt-1">1 em 19.863.375</p>
                <p className="text-[11px] text-slate-500">~R$ 180.000</p>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-yellow-100 shadow-sm">
                <span className="text-[10px] font-black uppercase text-yellow-800">Faixa 3 (5 + 2 Trevos)</span>
                <p className="text-base font-black text-slate-900 mt-1">1 em 5.959.013</p>
                <p className="text-[11px] text-slate-500">~R$ 35.000</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white p-3.5 rounded-xl border border-emerald-100 shadow-sm">
                <span className="text-[10px] font-black uppercase text-emerald-800">Sena (6 acertos)</span>
                <p className="text-base font-black text-slate-900 mt-1">1 em 50.063.860</p>
                <p className="text-[11px] text-slate-500">0,000002% de chance</p>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-teal-100 shadow-sm">
                <span className="text-[10px] font-black uppercase text-teal-800">Quina (5 acertos)</span>
                <p className="text-base font-black text-slate-900 mt-1">1 em 154.518</p>
                <p className="text-[11px] text-slate-500">0,00065% de chance</p>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-blue-100 shadow-sm">
                <span className="text-[10px] font-black uppercase text-blue-800">Quadra (4 acertos)</span>
                <p className="text-base font-black text-slate-900 mt-1">1 em 2.332</p>
                <p className="text-[11px] text-slate-500">0,0429% de chance</p>
              </div>
            </div>
          )}
        </div>

        {onGoToGenerator && (
          <button
            type="button"
            onClick={onGoToGenerator}
            className={`inline-flex items-center space-x-2 text-white font-black text-sm px-6 py-3.5 rounded-2xl shadow-md transition-all active:scale-[0.98] ${
              isLotofacil 
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700' 
                : isMaisMilionaria 
                  ? 'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700'
            }`}
          >
            <Sparkles size={18} />
            <span>Gerar Apostas da {lotteryTitle} Agora</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner Principal do Simulador Adaptado à Loteria Ativa */}
      <div className={`bg-gradient-to-br ${theme.bannerGradient} text-white rounded-3xl p-5 sm:p-7 shadow-lg relative overflow-hidden`}>
        <div className={`absolute top-0 right-0 w-96 h-96 ${theme.bannerGlow} rounded-full blur-3xl pointer-events-none`} />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="bg-white/20 text-white border border-white/30 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Simulador Matemático: {lotteryTitle}
              </span>
              <span className="text-xs text-white/80 font-medium">
                Próximo Concurso Oficial #{latestDraw.contestNumber + 1}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1 flex items-center space-x-2">
              <Calculator size={24} className="text-white/90" />
              <span>Chance Real de Acerto para o Próximo Sorteio</span>
            </h2>
            <p className="text-xs sm:text-sm text-white/80 mt-1 max-w-2xl">
              Cálculo combinatório exato baseado nas suas <strong>{stats.totalGames} apostas salvas da {lotteryTitle}</strong> ({stats.uniqueCombinations} combinações equivalentes).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-white/70 block">Investimento Total</span>
              <span className="text-base sm:text-lg font-black text-white">{formatBRL(stats.totalCost)}</span>
            </div>
            <div className="h-7 w-px bg-white/20 mx-1" />
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-white/70 block">Eficiência Geral</span>
              <span className="text-base sm:text-lg font-black text-emerald-300">{stats.efficiencyScore}/100</span>
            </div>
          </div>
        </div>
      </div>

      {/* CARD DE TEORIA & FILTRO DE PLAUSIBILIDADE HISTÓRICA (Explicação 1,2,3,4,5,6) */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-slate-700 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Layers size={22} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full">
                  Filtro de Plausibilidade Histórica
                </span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  stats.plausibilityPercentage >= 80 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {stats.plausibilityPercentage}% no Cluster Central
                </span>
              </div>
              <h3 className="text-base font-black text-white mt-0.5">
                Plausibilidade de Conjunto: Por que sequências como 1, 2, 3, 4, 5, 6 são anômalas?
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowPlausibilityTheory(!showPlausibilityTheory)}
            className="text-xs text-indigo-300 hover:text-white flex items-center space-x-1 font-bold bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 transition-all"
          >
            <HelpCircle size={14} />
            <span>{showPlausibilityTheory ? 'Ocultar Explicação Matemática' : 'Como funciona a Plausibilidade?'}</span>
          </button>
        </div>

        {/* Resumo da Carteira Salva em Relação ao Cluster */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Jogos no Cluster Central (Top 80% Caixa)</span>
            <p className="text-lg font-black text-emerald-400 mt-0.5">{stats.plausibleGamesCount} de {stats.totalGames} apostas</p>
            <p className="text-[11px] text-slate-300">Conformes com a Curva de Gauss e Vizinhança</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Jogos com Padrões Anômalos</span>
            <p className="text-lg font-black text-amber-400 mt-0.5">{stats.anomalousGamesCount} apostas</p>
            <p className="text-[11px] text-slate-300">{stats.anomalousGamesCount === 0 ? 'Nenhum padrão extremo detectado' : 'Contêm sequências ou somas extremas'}</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Chance de Qualquer Prêmio</span>
            <p className="text-lg font-black text-cyan-300 mt-0.5">1 em {stats.anyPrizeOddsOneIn}</p>
            <p className="text-[11px] text-slate-300">
              {isLotofacil ? 'Probabilidade de pontuar (11 a 15 acertos)' : 'Probabilidade de atingir faixa premiada'}
            </p>
          </div>
        </div>

        {/* Explicação Expandida se solicitado */}
        {showPlausibilityTheory && (
          <div className="bg-white/5 border border-indigo-500/30 rounded-2xl p-4 sm:p-5 text-xs text-slate-200 space-y-2.5">
            <div className="flex items-center space-x-1.5 text-indigo-300 font-bold">
              <Info size={16} />
              <span>Diferença entre Micro-Probabilidade e Macro-Estados Estruturais:</span>
            </div>
            <p>
              No papel, uma combinação específica como <strong>01-02-03-04-05-06</strong> tem a mesma probabilidade unitária exata de qualquer outro bilhete simples no vácuo ({isLotofacil ? '1 em 3.268.760' : isMaisMilionaria ? '1 em 238.360.500' : '1 em 50.063.860'}).
            </p>
            <p>
              Porém, quando agrupamos as combinações em <strong>Classes de Equivalência (Clusters de Formato)</strong>, a realidade é dramaticamente assimétrica:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-300">
              <li>
                <strong>O Macro-Estado &quot;6 números consecutivos seguidos&quot;:</strong> Contém apenas <strong>55 combinações</strong> em mais de 50 milhões (0,000109%). A probabilidade de um sorteio cair nessa classe é praticamente nula.
              </li>
              <li>
                <strong>O Macro-Estado &quot;Cluster de Máxima Densidade&quot; (Soma entre {isLotofacil ? '180 e 220' : isMaisMilionaria ? '120 e 185' : '160 e 240'}, no máximo 1 dupla consecutiva, paridade equilibrada):</strong> Contém <strong>mais de 82%</strong> de todos os concursos reais sorteados na história da Caixa Econômica Federal.
              </li>
            </ul>
            <p className="text-indigo-200 font-medium">
              O Mega Sorte implementa um <strong>Filtro de Plausibilidade Ativo</strong> no gerador para centralizar suas apostas exclusivamente dentro desse Cluster Central, descartando automaticamente padrões de cauda extrema.
            </p>
          </div>
        )}
      </div>

      {/* CARDS MESTRES DINÂMICOS DE PROBABILIDADE */}
      <div className={`grid grid-cols-1 ${isLotofacil ? 'sm:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-3'} gap-4 sm:gap-6`}>
        
        {/* CARD TIER 1 (PRÊMIO MÁXIMO) */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-emerald-500/40 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-100 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between">
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center space-x-1">
                <Sparkles size={11} className="text-emerald-700" />
                <span>{stats.tier1Name}</span>
              </span>
              <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg">
                {stats.tier1MultiplierVsSingle}x mais chance
              </span>
            </div>

            <div className="mt-4">
              <span className="text-[11px] font-bold text-slate-500 block">Probabilidade Real no Próximo Sorteio</span>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-0.5">
                1 em {stats.tier1OddsOneIn.toLocaleString('pt-BR')}
              </p>
              <p className="text-xs font-semibold text-emerald-700 mt-1">
                {(stats.tier1Probability * 100).toFixed(6)}% de chance
              </p>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-600">
              <span className="flex items-center space-x-1">
                <DollarSign size={13} className="text-emerald-600" />
                <span>Prêmio Estimado:</span>
              </span>
              <span className="font-black text-slate-900">
                {latestDraw.estimatedNextPrize || stats.tier1EstimatedPrize}
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
          </div>
        </div>

        {/* CARD TIER 2 */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-teal-500/40 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-teal-100 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between">
              <span className="bg-teal-100 text-teal-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center space-x-1">
                <Award size={11} className="text-teal-700" />
                <span>{stats.tier2Name}</span>
              </span>
              <span className="text-xs font-black text-teal-700 bg-teal-50 px-2 py-0.5 rounded-lg">
                {stats.tier2MultiplierVsSingle}x mais chance
              </span>
            </div>

            <div className="mt-4">
              <span className="text-[11px] font-bold text-slate-500 block">Probabilidade Real no Próximo Sorteio</span>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-0.5">
                1 em {stats.tier2OddsOneIn.toLocaleString('pt-BR')}
              </p>
              <p className="text-xs font-semibold text-teal-700 mt-1">
                {(stats.tier2Probability * 100).toFixed(5)}% de chance
              </p>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-600">
              <span className="flex items-center space-x-1">
                <DollarSign size={13} className="text-teal-600" />
                <span>Prêmio Médio:</span>
              </span>
              <span className="font-black text-slate-900">{stats.tier2EstimatedPrize}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span className="flex items-center space-x-1">
                <Clock size={13} className="text-slate-400" />
                <span>Tempo estatístico médio:</span>
              </span>
              <span className="font-bold text-slate-800">
                {stats.estimatedYearsForQuina < 1 ? `~${Math.round(stats.estimatedYearsForQuina * 12)} meses` : `~${stats.estimatedYearsForQuina} anos`}
              </span>
            </div>
          </div>
        </div>

        {/* CARD TIER 3 */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-blue-500/40 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-100 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between">
              <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center space-x-1">
                <ShieldCheck size={11} className="text-blue-700" />
                <span>{stats.tier3Name}</span>
              </span>
              <span className="text-xs font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg">
                {stats.tier3MultiplierVsSingle}x mais chance
              </span>
            </div>

            <div className="mt-4">
              <span className="text-[11px] font-bold text-slate-500 block">Probabilidade Real no Próximo Sorteio</span>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-0.5">
                1 em {stats.tier3OddsOneIn.toLocaleString('pt-BR')}
              </p>
              <p className="text-xs font-semibold text-blue-700 mt-1">
                {(stats.tier3Probability * 100).toFixed(3)}% de chance
              </p>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-600">
              <span className="flex items-center space-x-1">
                <DollarSign size={13} className="text-blue-600" />
                <span>Prêmio Médio:</span>
              </span>
              <span className="font-black text-slate-900">{stats.tier3EstimatedPrize}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span className="flex items-center space-x-1">
                <Clock size={13} className="text-slate-400" />
                <span>Tempo estatístico médio:</span>
              </span>
              <span className="font-bold text-slate-800">
                {stats.estimatedYearsForQuadra < 1 ? `~${Math.round(stats.estimatedYearsForQuadra * 12)} meses` : `~${stats.estimatedYearsForQuadra} anos`}
              </span>
            </div>
          </div>
        </div>

        {/* CARDS EXTRAS SE LOTOFÁCIL (12 E 11 ACERTOS COM PRÊMIO FIXO) */}
        {isLotofacil && stats.tier4Name && (
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-purple-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div>
              <span className="bg-purple-100 text-purple-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                {stats.tier4Name}
              </span>
              <div className="mt-3">
                <span className="text-[11px] font-bold text-slate-500 block">Probabilidade</span>
                <p className="text-2xl font-black text-slate-900 mt-0.5">
                  1 em {stats.tier4OddsOneIn?.toLocaleString('pt-BR')}
                </p>
                <p className="text-xs font-semibold text-purple-700 mt-0.5">Prêmio fixo R$ 12,00 por cota</p>
              </div>
            </div>
          </div>
        )}

        {isLotofacil && stats.tier5Name && (
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-indigo-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div>
              <span className="bg-indigo-100 text-indigo-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                {stats.tier5Name}
              </span>
              <div className="mt-3">
                <span className="text-[11px] font-bold text-slate-500 block">Probabilidade</span>
                <p className="text-2xl font-black text-slate-900 mt-0.5">
                  1 em {stats.tier5OddsOneIn?.toLocaleString('pt-BR')}
                </p>
                <p className="text-xs font-semibold text-indigo-700 mt-0.5">Prêmio fixo R$ 6,00 (dobra a aposta)</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* TESTE COM O ÚLTIMO SORTEIO OFICIAL DA MODALIDADE */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2">
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${theme.badgeBg}`}>
                Conferência Oficial {lotteryTitle}
              </span>
              <span className="text-xs text-slate-400 font-medium">{latestDraw.date}</span>
            </div>
            <h3 className="text-lg font-black text-slate-900 flex items-center space-x-2 mt-1">
              <Award size={22} className={theme.primaryColor} />
              <span>Desempenho no Último Concurso Oficial #{latestDraw.contestNumber}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Veja como a sua carteira salva atual teria se comportado no sorteio oficial mais recente:
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {latestDraw.numbers.map(n => (
              <div
                key={n}
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl text-white font-mono font-black text-xs sm:text-sm flex items-center justify-center shadow-sm ${
                  isLotofacil 
                    ? 'bg-gradient-to-br from-purple-600 to-indigo-700' 
                    : isMaisMilionaria 
                      ? 'bg-gradient-to-br from-amber-600 to-yellow-700' 
                      : 'bg-gradient-to-br from-emerald-500 to-teal-700'
                }`}
              >
                {n.toString().padStart(2, '0')}
              </div>
            ))}
          </div>
        </div>

        {lastDrawHitsAnalysis && (
          <div className="space-y-4">
            <div className={`grid grid-cols-2 ${isLotofacil ? 'sm:grid-cols-5' : 'sm:grid-cols-4'} gap-3`}>
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl">
                <span className="text-[10px] font-black uppercase text-emerald-800">
                  {isLotofacil ? '15 Acertos' : '6 Acertos'}
                </span>
                <p className="text-2xl font-black text-emerald-950 mt-1">{lastDrawHitsAnalysis.tier1Count}</p>
                <span className="text-[11px] text-emerald-700 font-medium">
                  {lastDrawHitsAnalysis.tier1Count > 0 ? 'Prêmio Máximo!' : '0 bilhetes'}
                </span>
              </div>

              <div className="bg-teal-50 border border-teal-200 p-4 rounded-2xl">
                <span className="text-[10px] font-black uppercase text-teal-800">
                  {isLotofacil ? '14 Acertos' : '5 Acertos'}
                </span>
                <p className="text-2xl font-black text-teal-950 mt-1">{lastDrawHitsAnalysis.tier2Count}</p>
                <span className="text-[11px] text-teal-700 font-medium">
                  {lastDrawHitsAnalysis.tier2Count > 0 ? 'Faixa premiada!' : '0 bilhetes'}
                </span>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl">
                <span className="text-[10px] font-black uppercase text-blue-800">
                  {isLotofacil ? '13 Acertos' : '4 Acertos'}
                </span>
                <p className="text-2xl font-black text-blue-950 mt-1">{lastDrawHitsAnalysis.tier3Count}</p>
                <span className="text-[11px] text-blue-700 font-medium">
                  {lastDrawHitsAnalysis.tier3Count > 0 ? 'Faixa premiada!' : '0 bilhetes'}
                </span>
              </div>

              {isLotofacil ? (
                <>
                  <div className="bg-purple-50 border border-purple-200 p-4 rounded-2xl">
                    <span className="text-[10px] font-black uppercase text-purple-800">12 Acertos</span>
                    <p className="text-2xl font-black text-purple-950 mt-1">{lastDrawHitsAnalysis.tier4Count}</p>
                    <span className="text-[11px] text-purple-700 font-medium">
                      {lastDrawHitsAnalysis.tier4Count > 0 ? 'R$ 12 fixo' : '0 bilhetes'}
                    </span>
                  </div>
                  <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-2xl">
                    <span className="text-[10px] font-black uppercase text-indigo-800">11 Acertos</span>
                    <p className="text-2xl font-black text-indigo-950 mt-1">{lastDrawHitsAnalysis.tier5Count}</p>
                    <span className="text-[11px] text-indigo-700 font-medium">
                      {lastDrawHitsAnalysis.tier5Count > 0 ? 'R$ 6 fixo' : '0 bilhetes'}
                    </span>
                  </div>
                </>
              ) : (
                <div className="bg-purple-50 border border-purple-200 p-4 rounded-2xl">
                  <span className="text-[10px] font-black uppercase text-purple-800">3 Acertos</span>
                  <p className="text-2xl font-black text-purple-950 mt-1">{lastDrawHitsAnalysis.tier4Count}</p>
                  <span className="text-[11px] text-purple-700 font-medium">
                    {isMaisMilionaria ? 'Faixa premiada' : 'Sem prêmio oficial'}
                  </span>
                </div>
              )}
            </div>

            {lastDrawHitsAnalysis.bestBet && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-black text-slate-800 uppercase flex items-center space-x-1.5">
                    <Target size={16} className={theme.primaryColor} />
                    <span>Seu Melhor Jogo Neste Concurso ({lastDrawHitsAnalysis.maxHits} acertos)</span>
                  </span>
                  <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                    lastDrawHitsAnalysis.maxHits >= (isLotofacil ? 11 : 4) 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-slate-200 text-slate-700'
                  }`}>
                    {lastDrawHitsAnalysis.maxHits >= (isLotofacil ? 11 : 4) ? 'Aposta Premiada!' : `${lastDrawHitsAnalysis.maxHits} Acertos`}
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
                            ? `${theme.activeBallBg} text-white ring-2 scale-105`
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

      {/* MAPA DE COBERTURA DA CARTELA (25 na Lotofácil, 50 na +Milionária, 60 na Mega) */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center space-x-2">
              <BarChart3 size={22} className={theme.primaryColor} />
              <span>Mapa de Cobertura da Cartela ({stats.maxUniverse} Dezenas)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Sua carteira cobre <strong>{stats.distinctNumbersCount} de {stats.maxUniverse} dezenas</strong> ({stats.coveragePercentage}% do volante oficial da {lotteryTitle}).
            </p>
          </div>

          <div className="flex items-center space-x-4 text-xs font-bold">
            <div className="flex items-center space-x-1.5">
              <div className={`w-3.5 h-3.5 rounded-full ${isLotofacil ? 'bg-purple-600' : isMaisMilionaria ? 'bg-amber-600' : 'bg-emerald-600'}`} />
              <span className="text-slate-700">Cobertas ({stats.distinctNumbersCount})</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <div className="w-3.5 h-3.5 rounded-full bg-slate-200" />
              <span className="text-slate-500">Ausentes ({stats.missingNumbers.length})</span>
            </div>
          </div>
        </div>

        {/* Grid de Dezenas */}
        {isLotofacil ? (
          <div className="space-y-2">
            <div className="flex justify-between items-center text-[11px] font-bold text-slate-500 px-1">
              <span>Grade 5x5 Oficial da Lotofácil (16 Moldura / 9 Centro)</span>
              <span>Destaque pontilhado: Centro (07, 08, 09, 12, 13, 14, 17, 18, 19)</span>
            </div>
            <div className="grid grid-cols-5 gap-2.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 max-w-md mx-auto">
              {Array.from({ length: 25 }, (_, i) => {
                const num = i + 1;
                const isCovered = stats.distinctNumbers.includes(num);
                const isCenter = LOTOFACIL_CENTER.includes(num);
                const occurrences = savedBets.filter(b => b.numbers.includes(num)).length;

                return (
                  <div
                    key={num}
                    className={`relative p-3 rounded-2xl text-center transition-all ${
                      isCovered
                        ? 'bg-purple-600 text-white font-black shadow-sm ring-1 ring-purple-700'
                        : isCenter
                          ? 'bg-amber-50 text-slate-500 font-semibold border-2 border-dashed border-amber-300'
                          : 'bg-white text-slate-400 font-medium border border-slate-200'
                    }`}
                  >
                    <span className="text-sm font-mono">{num.toString().padStart(2, '0')}</span>
                    {occurrences > 1 && (
                      <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded-full shadow-xs">
                        {occurrences}x
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className={`grid ${stats.maxUniverse === 50 ? 'grid-cols-5 sm:grid-cols-10' : 'grid-cols-6 sm:grid-cols-10'} gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200/80`}>
            {Array.from({ length: stats.maxUniverse }, (_, i) => {
              const num = i + 1;
              const isCovered = stats.distinctNumbers.includes(num);
              const occurrences = savedBets.filter(b => b.numbers.includes(num)).length;

              return (
                <div
                  key={num}
                  className={`relative p-2 rounded-xl text-center transition-all ${
                    isCovered
                      ? `${theme.activeBallBg} text-white font-black shadow-sm ring-1`
                      : 'bg-white text-slate-400 font-medium border border-slate-200'
                  }`}
                >
                  <span className="text-xs sm:text-sm font-mono">{num.toString().padStart(2, '0')}</span>
                  {occurrences > 1 && (
                    <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 text-[9px] font-black px-1 rounded-full shadow-xs">
                      {occurrences}x
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Métricas Estatísticas Complementares */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <span className="text-[10px] font-black uppercase text-slate-500">
              Zona de Ouro (Soma {isLotofacil ? '180 a 220' : isMaisMilionaria ? '120 a 185' : '160 a 240'})
            </span>
            <p className="text-xl font-black text-slate-900 mt-1">{stats.sumInGoldZonePercentage}% dos jogos</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Faixa de maior concentração histórica da Caixa</p>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <span className="text-[10px] font-black uppercase text-slate-500">
              Equilíbrio Par/Ímpar ({isLotofacil ? '7P/8I ou 8P/7I' : '3P/3I ou 4P/2I'})
            </span>
            <p className="text-xl font-black text-slate-900 mt-1">{stats.balancedParityPercentage}% dos jogos</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Distribuição balanceada mais frequente</p>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <span className="text-[10px] font-black uppercase text-slate-500">Top 10 Histórico Coberto</span>
            <p className="text-xl font-black text-indigo-900 mt-1">{stats.topHistoricalCoveredCount} de 10 dezenas</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Dezenas mais frequentes da {lotteryTitle}</p>
          </div>
        </div>
      </div>

      {/* Dicas e Diagnóstico Estatístico com Ação de Otimização */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-black text-slate-900 flex items-center space-x-2">
            <ShieldCheck size={18} className={theme.primaryColor} />
            <span>Diagnóstico Estatístico da Sua Carteira de {lotteryTitle}</span>
          </h4>
          <span className={`text-xs font-black px-2.5 py-1 rounded-xl ${theme.badgeBg}`}>
            {stats.recommendationVerdict}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {stats.recommendationTips.map((tip, idx) => (
            <div key={idx} className="bg-white p-3.5 rounded-2xl border border-slate-200 flex items-start space-x-2.5 text-xs text-slate-700">
              <CheckCircle2 size={16} className={`${theme.primaryColor} mt-0.5 flex-shrink-0`} />
              <span>{tip}</span>
            </div>
          ))}
        </div>

        {/* Ação para Otimizar Cobertura */}
        {onAddBet && stats.missingNumbers.length > 0 && (
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-600">
              Faltam <strong>{stats.missingNumbers.length} dezenas</strong> para cobrir 100% da cartela da {lotteryTitle}.
            </p>
            <button
              type="button"
              onClick={handleGenerateComplementary}
              disabled={isGeneratingComplementary}
              className={`text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center space-x-1.5 disabled:opacity-60 ${
                isLotofacil 
                  ? 'bg-purple-700 hover:bg-purple-800' 
                  : isMaisMilionaria 
                    ? 'bg-amber-700 hover:bg-amber-800' 
                    : 'bg-emerald-700 hover:bg-emerald-800'
              }`}
            >
              {isGeneratingComplementary ? (
                <RefreshCw size={15} className="animate-spin" />
              ) : (
                <PlusCircle size={15} />
              )}
              <span>{isGeneratingComplementary ? 'Calculando Complementar...' : `Gerar Aposta Complementar (${lotteryTitle})`}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProbabilitySimulatorView;
