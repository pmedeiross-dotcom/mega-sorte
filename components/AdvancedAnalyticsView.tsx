import React, { useState, useMemo, useDeferredValue } from 'react';
import { 
  Table, 
  Flame, 
  Activity, 
  Layers, 
  Repeat, 
  Calculator, 
  Grid, 
  PieChart, 
  Search, 
  ArrowUpDown, 
  AlertCircle,
  Shapes,
  BarChart3,
  History
} from 'lucide-react';
import { 
  buildDrawsListWithLatest,
  PRIME_NUMBERS,
  FIBONACCI_NUMBERS,
  MULTIPLES_OF_THREE
} from '../utils/megaSenaAdvancedAnalytics';
import { 
  buildMaisMilionariaDrawsListWithLatest,
  MAIS_MILIONARIA_PRIME_NUMBERS,
  MAIS_MILIONARIA_FIBONACCI_NUMBERS,
  MAIS_MILIONARIA_MULTIPLES_OF_THREE
} from '../utils/maisMilionariaAdvancedAnalytics';
import {
  LOTOFACIL_PRIMES,
  LOTOFACIL_FIBONACCI,
  LOTOFACIL_MULTIPLES_OF_THREE,
  LOTOFACIL_FRAME
} from '../utils/lotofacilOfficialStats';
import { buildLotofacilDrawsListWithLatest, TOTAL_LOTOFACIL_CONTESTS_COUNT } from '../utils/lotofacilContestsData';
import { TOTAL_CONTESTS_COUNT } from '../utils/megaSenaContestsData';
import { TOTAL_MAIS_MILIONARIA_CONTESTS_COUNT } from '../utils/maisMilionariaContestsData';
import { FRAME_NUMBERS } from '../utils/megaSenaAdvancedAnalytics';
import { MAIS_MILIONARIA_FRAME } from '../utils/maisMilionariaAdvancedAnalytics';
import { Bet, OfficialDrawResult, LotteryType } from '../types';
import { offlineCacheManager } from '../services/offlineCacheManager';
import FrequencyChart from './FrequencyChart';

interface AdvancedAnalyticsViewProps {
  latestDraw?: OfficialDrawResult;
  lottery?: LotteryType;
  history?: Bet[];
}

export const AdvancedAnalyticsView: React.FC<AdvancedAnalyticsViewProps> = ({ 
  latestDraw,
  lottery = 'megasena',
  history = []
}) => {
  const isLotofacil = lottery === 'lotofacil';
  const isMaisMilionaria = lottery === 'maismilionaria';
  const maxNum = isLotofacil ? 25 : (isMaisMilionaria ? 50 : 60);
  const deferredLatestDraw = useDeferredValue(latestDraw);

  const dynamicDraws = useMemo(() => {
    if (isLotofacil) {
      return buildLotofacilDrawsListWithLatest(deferredLatestDraw);
    }
    if (isMaisMilionaria) {
      return buildMaisMilionariaDrawsListWithLatest(deferredLatestDraw);
    }
    return buildDrawsListWithLatest(deferredLatestDraw);
  }, [deferredLatestDraw, isLotofacil, isMaisMilionaria]);

  const analytics = useMemo(() => {
    if (isLotofacil) {
      return offlineCacheManager.getOrComputeLotofacilAnalytics(dynamicDraws as any);
    }
    if (isMaisMilionaria) {
      return offlineCacheManager.getOrComputeMaisMilionariaAnalytics(dynamicDraws as any);
    }
    return offlineCacheManager.getOrComputeMegaAnalytics(dynamicDraws as any);
  }, [dynamicDraws, isLotofacil, isMaisMilionaria]);

  const totalContests = isLotofacil
    ? (latestDraw?.contestNumber || TOTAL_LOTOFACIL_CONTESTS_COUNT)
    : isMaisMilionaria 
    ? (latestDraw?.contestNumber || TOTAL_MAIS_MILIONARIA_CONTESTS_COUNT)
    : (latestDraw?.contestNumber || TOTAL_CONTESTS_COUNT);

  const primesList = isLotofacil ? LOTOFACIL_PRIMES : (isMaisMilionaria ? MAIS_MILIONARIA_PRIME_NUMBERS : PRIME_NUMBERS);
  const fiboList = isLotofacil ? LOTOFACIL_FIBONACCI : (isMaisMilionaria ? MAIS_MILIONARIA_FIBONACCI_NUMBERS : FIBONACCI_NUMBERS);
  const mult3List = isLotofacil ? LOTOFACIL_MULTIPLES_OF_THREE : (isMaisMilionaria ? MAIS_MILIONARIA_MULTIPLES_OF_THREE : MULTIPLES_OF_THREE);
  const frameSet = useMemo(() => {
    return new Set(isLotofacil ? LOTOFACIL_FRAME : (isMaisMilionaria ? MAIS_MILIONARIA_FRAME : FRAME_NUMBERS));
  }, [isLotofacil, isMaisMilionaria]);

  // Sub-abas de navegação temática
  const [subTab, setSubTab] = useState<
    'table' | 'frequency_chart' | 'recent_contests' | 'behavior_cycle' | 'par_impar_repeat' | 'primes_fibo_mult3' | 'board_geometry' | 'duques_pareto' | 'positions_binary'
  >('table');

  // Filtros da Tabela Geral com useDeferredValue
  const [tableSearch, setTableSearch] = useState('');
  const deferredTableSearch = useDeferredValue(tableSearch);
  const [tableSort, setTableSort] = useState<'ranking' | 'delay' | 'number' | 'draws'>('ranking');
  const [statusFilter, setStatusFilter] = useState<'all' | 'quente' | 'morna' | 'fria'>('all');

  // Dados filtrados da Tabela de Números
  const filteredNumbers = useMemo(() => {
    let list = [...(analytics?.numbersAnalysis || [])];

    if (statusFilter !== 'all') {
      list = list.filter(n => n.status === statusFilter);
    }

    if (deferredTableSearch.trim()) {
      const searchNum = parseInt(deferredTableSearch.trim(), 10);
      if (!isNaN(searchNum)) {
        list = list.filter(n => n.number === searchNum);
      }
    }

    list.sort((a, b) => {
      if (tableSort === 'ranking') return a.ranking - b.ranking;
      if (tableSort === 'draws') return b.totalDraws - a.totalDraws;
      if (tableSort === 'delay') return b.currentDelay - a.currentDelay;
      if (tableSort === 'number') return a.number - b.number;
      return 0;
    });

    return list;
  }, [analytics?.numbersAnalysis, statusFilter, deferredTableSearch, tableSort]);

  // Pareto 80/20
  const paretoGroupA: number[] = useMemo(() => {
    if ((analytics as any)?.paretoAnalysis?.groupA) {
      return (analytics as any).paretoAnalysis.groupA;
    }
    if (analytics?.paretoTopNumbers && analytics.paretoTopNumbers.length > 0) {
      return analytics.paretoTopNumbers.map((item: any) => typeof item === 'number' ? item : item.number);
    }
    return [...(analytics?.numbersAnalysis || [])]
      .sort((a, b) => b.totalDraws - a.totalDraws)
      .slice(0, isLotofacil ? 8 : (isMaisMilionaria ? 10 : 12))
      .map(n => n.number);
  }, [analytics, isLotofacil, isMaisMilionaria]);

  const spanStats = useMemo(() => {
    if ((analytics as any)?.spanStats) return (analytics as any).spanStats;
    return isLotofacil
      ? { averageSpan: 22.8, idealSpanMin: 20, idealSpanMax: 24 }
      : isMaisMilionaria
      ? { averageSpan: 39.8, idealSpanMin: 32, idealSpanMax: 47 }
      : { averageSpan: 45.8, idealSpanMin: 38, idealSpanMax: 54 };
  }, [analytics, isLotofacil, isMaisMilionaria]);

  // Histórico detalhado dos concursos recentes para o sub-painel Histórico dos Concursos
  const recentContestsAnalyzed = useMemo(() => {
    const sumMin = isLotofacil ? 180 : (isMaisMilionaria ? 120 : 160);
    const sumMax = isLotofacil ? 220 : (isMaisMilionaria ? 185 : 240);

    return dynamicDraws.slice(0, 15).map((draw: any, idx: number) => {
      const nums: number[] = draw.numbers || [];
      const sum = nums.reduce((a, b) => a + b, 0);
      const evens = nums.filter(n => n % 2 === 0).length;
      const odds = nums.length - evens;
      const frames = nums.filter(n => frameSet.has(n)).length;
      const prevDraw: any = dynamicDraws[idx + 1];
      const repeated = prevDraw ? nums.filter(n => prevDraw.numbers.includes(n)).length : null;
      const inGoldSum = sum >= sumMin && sum <= sumMax;

      return {
        contest: draw.contest,
        date: draw.date,
        numbers: nums,
        trevos: draw.trevos as number[] | undefined,
        sum,
        inGoldSum,
        evens,
        odds,
        frames,
        repeated
      };
    });
  }, [dynamicDraws, frameSet, isLotofacil, isMaisMilionaria]);

  const accentTextClass = isLotofacil ? 'text-purple-600' : (isMaisMilionaria ? 'text-amber-600' : 'text-emerald-600');
  const accentBgActive = isLotofacil
    ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-400/40'
    : isMaisMilionaria
    ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-400/40'
    : 'bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-500/40';

  return (
    <div className="space-y-6">
      {/* Top Banner Informativo da Base de Dados */}
      <div className={`text-white rounded-3xl p-5 sm:p-7 shadow-md relative overflow-hidden border ${
        isLotofacil
          ? 'bg-gradient-to-r from-purple-950 via-fuchsia-950 to-slate-900 border-purple-800'
          : isMaisMilionaria 
          ? 'bg-gradient-to-r from-amber-950 via-yellow-950 to-slate-900 border-amber-800' 
          : 'bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 border-emerald-800'
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
                Oficial CEF • Base Concursos 1 a {totalContests.toLocaleString('pt-BR')}
              </span>
              {latestDraw && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-bold border border-amber-300/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                  Último Sorteio Integrado: #{latestDraw.contestNumber} ({latestDraw.numbers.map(n => n.toString().padStart(2, '0')).join(' - ')})
                  {latestDraw.trevos && latestDraw.trevos.length > 0 && ` + Trevos 🍀 [${latestDraw.trevos.join(', ')}]`}
                </span>
              )}
              <span className="text-xs text-slate-300">
                {isLotofacil ? 'Desde Setembro/2003' : (isMaisMilionaria ? 'Desde Maio/2022' : 'Desde Março/1996')}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1.5 tracking-tight flex items-center gap-2">
              <span>
                Central Estatística Avançada:{' '}
                {isLotofacil ? 'Lotofácil (01 a 25)' : (isMaisMilionaria ? '+Milionária (01 a 50 + Trevos)' : 'Mega-Sena (01 a 60)')}
              </span>
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl mt-1 leading-relaxed">
              {isLotofacil
                ? `Análise matemática dos ${totalContests.toLocaleString('pt-BR')} concursos oficiais: frequência das 25 dezenas, moldura/centro (16x9), repetição (8-10 por sorteio), paridade (7P/8I) e histórico recente.`
                : isMaisMilionaria
                ? `Análise matemática dos ${totalContests} concursos oficiais: dezenas 01 a 50, 6 trevos, padrões de repetição, duques de ouro e distribuição por quadrantes.`
                : 'Análise completa dos pilares matemáticos: Comportamento, Ciclo, Primos, Fibonacci, Múltiplos de 3, Moldura, Quadrantes, Duques, Atrasos e Histórico de Concursos.'}
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white/10 p-2 rounded-2xl backdrop-blur-xs text-center">
            <div className="px-3 py-1">
              <span className="text-[10px] uppercase text-amber-300 font-bold block">Concursos</span>
              <span className="text-lg font-black text-white">{totalContests.toLocaleString('pt-BR')}</span>
            </div>
            <div className="w-px h-8 bg-white/20"></div>
            <div className="px-3 py-1">
              <span className="text-[10px] uppercase text-emerald-300 font-bold block">Universo</span>
              <span className="text-lg font-black text-white">{isLotofacil ? '25 (15/j)' : (isMaisMilionaria ? '50 + 6' : '60')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-abas de Navegação Temática */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          { id: 'table', label: `Tabela Geral (${maxNum} Números)`, icon: Table },
          { id: 'frequency_chart', label: 'Gráfico de Frequência', icon: BarChart3 },
          { id: 'recent_contests', label: 'Histórico dos Concursos', icon: History },
          { id: 'behavior_cycle', label: 'Ciclo & Tendências', icon: Flame },
          { id: 'par_impar_repeat', label: 'Pares, Ímpares & Repetidas', icon: Repeat },
          { id: 'primes_fibo_mult3', label: 'Primos, Fibo & Mult3', icon: Calculator },
          { id: 'board_geometry', label: 'Moldura & Quadrantes', icon: Grid },
          { id: 'duques_pareto', label: 'Duques Frequentes & Pareto 80/20', icon: Layers },
          { id: 'positions_binary', label: 'Posições & Amplitude', icon: ArrowUpDown },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = subTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                isActive
                  ? accentBgActive
                  : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. MÓDULO: TABELA GERAL */}
      {subTab === 'table' && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-5">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-base font-black text-slate-950 flex items-center space-x-2">
                <Table size={18} className={accentTextClass} />
                <span>Raio-X Estatístico das {maxNum} Dezenas Oficiais</span>
              </h3>
              <p className="text-xs text-slate-500">
                Histórico consolidado com ranking de saídas, atraso atual e classificação térmica
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-44">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar dezena..."
                  value={tableSearch}
                  onChange={e => setTableSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                aria-label="Filtrar por temperatura"
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="all">Todas as Temperaturas</option>
                <option value="quente">🔥 Quentes</option>
                <option value="morna">⚡ Mornas</option>
                <option value="fria">❄️ Frias</option>
              </select>

              <select
                value={tableSort}
                onChange={e => setTableSort(e.target.value as any)}
                aria-label="Ordenar tabela estatística"
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="ranking">🏆 Mais Sorteadas (Top Ranking)</option>
                <option value="draws">Total de Saídas</option>
                <option value="delay">⏳ Mais Atrasadas</option>
                <option value="number">Ordem Numérica (01-{maxNum})</option>
              </select>
            </div>
          </div>

          {/* Grid de Cards de Números */}
          <div className={`grid gap-3 ${isLotofacil ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'}`}>
            {filteredNumbers.map(item => {
              const isHot = item.status === 'quente';
              const isCold = item.status === 'fria';
              const isDrawnInLatest = latestDraw?.numbers.includes(item.number);
              const freqPct = item.frequencyPercentage ?? (item as any).frequencyPercent ?? 0;
              const expectedDelay = Math.max(1, Math.round(totalContests / (item.totalDraws || 1)));

              return (
                <div 
                  key={item.number}
                  className={`p-3.5 rounded-2xl border transition-all duration-200 relative ${
                    isDrawnInLatest
                      ? isLotofacil
                        ? 'bg-purple-50/80 border-purple-400 ring-2 ring-purple-400/50'
                        : isMaisMilionaria 
                        ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-400/50'
                        : 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-400/50'
                      : isHot 
                      ? 'bg-red-50/40 border-red-200' 
                      : isCold 
                      ? 'bg-blue-50/40 border-blue-200' 
                      : 'bg-slate-50/60 border-slate-200'
                  }`}
                >
                  {isDrawnInLatest && (
                    <span className="absolute -top-2 -right-1 px-1.5 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black text-[9px] uppercase tracking-wider shadow-xs">
                      Último Sorteio
                    </span>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="w-8 h-8 rounded-xl bg-slate-900 text-white font-black text-sm flex items-center justify-center font-mono">
                      {item.number.toString().padStart(2, '0')}
                    </span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                      isHot ? 'bg-red-100 text-red-800' : isCold ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {item.status}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1 text-xs">
                    <div className="flex justify-between items-center text-slate-600">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Ranking:</span>
                      <span className="font-extrabold text-slate-900">#{item.ranking}º lugar</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Saídas:</span>
                      <span className="font-extrabold text-emerald-800">{item.totalDraws}x ({freqPct}%)</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Atraso Atual:</span>
                      <span className={`font-black ${item.currentDelay > expectedDelay * 1.5 ? 'text-red-600' : 'text-slate-700'}`}>
                        {item.currentDelay} conc.
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-500 text-[10px]">
                      <span>Média atraso:</span>
                      <span>{expectedDelay} conc.</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 1B. MÓDULO: GRÁFICO DE FREQUÊNCIA INDIVIDUAL */}
      {subTab === 'frequency_chart' && (
        <FrequencyChart 
          history={history} 
          referenceDraw={latestDraw?.numbers || []} 
          lottery={lottery} 
        />
      )}

      {/* 1C. MÓDULO: ANÁLISE HISTÓRICA DOS CONCURSOS */}
      {subTab === 'recent_contests' && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-5">
          <div>
            <h3 className="text-base font-black text-slate-950 flex items-center space-x-2">
              <History size={18} className={accentTextClass} />
              <span>Análise Histórica dos Últimos {recentContestsAnalyzed.length} Concursos Oficiais</span>
            </h3>
            <p className="text-xs text-slate-500">
              Auditoria concurso a concurso com soma das dezenas, paridade (P/I), presença na moldura e repetição do sorteio imediatamente anterior.
            </p>
          </div>

          <div className="space-y-3">
            {recentContestsAnalyzed.map((draw, idx) => (
              <div key={draw.contest} className={`p-4 rounded-2xl border transition-all ${
                idx === 0
                  ? isLotofacil
                    ? 'bg-purple-50/70 border-purple-300'
                    : isMaisMilionaria
                    ? 'bg-amber-50/70 border-amber-300'
                    : 'bg-emerald-50/70 border-emerald-300'
                  : 'bg-slate-50/70 border-slate-200'
              }`}>
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200/70">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-slate-900 text-white font-black text-xs font-mono">
                      Concurso #{draw.contest}
                    </span>
                    <span className="text-xs font-bold text-slate-600">{draw.date}</span>
                    {idx === 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] uppercase">
                        Mais Recente
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className={`px-2 py-0.5 rounded-md font-bold border ${
                      draw.inGoldSum
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      Soma: {draw.sum}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-bold text-slate-800">
                      {draw.evens}P / {draw.odds}I
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-bold text-slate-800">
                      Moldura: {draw.frames}
                    </span>
                    {draw.repeated !== null && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200 font-bold">
                        Repetidas: {draw.repeated}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-2.5">
                  {draw.numbers.map(n => (
                    <span
                      key={n}
                      className={`w-8 h-8 rounded-lg font-mono font-black text-xs flex items-center justify-center shadow-2xs border ${
                        isLotofacil
                          ? 'bg-purple-600 text-white border-purple-700'
                          : isMaisMilionaria
                          ? 'bg-amber-500 text-slate-950 border-amber-600'
                          : 'bg-emerald-600 text-white border-emerald-700'
                      }`}
                    >
                      {n.toString().padStart(2, '0')}
                    </span>
                  ))}
                  {draw.trevos && draw.trevos.length > 0 && (
                    <div className="flex items-center gap-1 ml-2 pl-2 border-l border-amber-300">
                      {draw.trevos.map(t => (
                        <span key={t} className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-mono font-black text-xs flex items-center justify-center border border-emerald-700">
                          🍀{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. MÓDULO: CICLO & TENDÊNCIAS */}
      {subTab === 'behavior_cycle' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h3 className="text-base font-black text-slate-950 flex items-center space-x-2">
                  <Activity size={18} className={accentTextClass} />
                  <span>Análise do Ciclo Atual de Dezenas</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Um ciclo é o intervalo de concursos necessários para que todas as {maxNum} dezenas sejam sorteadas pelo menos uma vez.
                </p>
              </div>
              <span className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-black text-xs">
                Ciclo Atual: {analytics?.cycleAnalysis?.percentCompleted || 0}% completo
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-emerald-600 to-teal-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${analytics?.cycleAnalysis?.percentCompleted || 0}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>{analytics?.cycleAnalysis?.drawnCount || 0} dezenas já sorteadas no ciclo atual</span>
                <span>Faltam {analytics?.cycleAnalysis?.missingCount || 0} dezenas para fechar o ciclo</span>
              </div>
            </div>

            <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center">
                  <AlertCircle size={15} className="mr-1.5 text-amber-600" />
                  Dezenas que Faltam Sair ({analytics?.cycleAnalysis?.missingCount || 0}):
                </span>
                <span className="text-[10px] text-amber-800 font-semibold">
                  Tendem a fechar em média a cada {isLotofacil ? '4,3' : (isMaisMilionaria ? '23' : '28')} sorteios
                </span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {(analytics?.cycleAnalysis?.missingNumbers || []).map((num: number) => (
                  <span 
                    key={num}
                    className="w-9 h-9 rounded-xl bg-amber-400 text-amber-950 font-black flex items-center justify-center text-xs shadow-xs border border-yellow-300"
                  >
                    {num.toString().padStart(2, '0')}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Card: Comportamento de Tendências */}
          <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-black text-slate-950 flex items-center space-x-2">
                <Activity size={18} className={accentTextClass} />
                <span>Comportamento &amp; Tendências das Dezenas</span>
              </h3>
              <p className="text-xs text-slate-500">
                Comparativo da frequência nos últimos 10 concursos contra a média esperada desta loteria
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between text-emerald-900">
                  <span className="text-xs font-black uppercase">🔥 Dezenas em Alta</span>
                  <span className="text-[10px] font-bold text-emerald-700">{isLotofacil ? '≥ 7x últimos 10' : '≥ 2x últimos 10'}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(analytics?.behaviors || []).filter((b: any) => b.trend === 'alta').map((b: any) => (
                    <span key={b.number} className="px-2 py-1 rounded-lg bg-emerald-600 text-white font-black text-xs shadow-xs">
                      {b.name || b.number.toString().padStart(2, '0')} ({b.last10}x)
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-slate-800">
                  <span className="text-xs font-black uppercase">⚡ Dezenas Estáveis</span>
                  <span className="text-[10px] font-bold text-slate-500">Dentro da média</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(analytics?.behaviors || []).filter((b: any) => b.trend === 'estavel').slice(0, 18).map((b: any) => (
                    <span key={b.number} className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold text-xs">
                      {b.name || b.number.toString().padStart(2, '0')}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-2">
                <div className="flex items-center justify-between text-blue-900">
                  <span className="text-xs font-black uppercase">❄️ Dezenas em Baixa</span>
                  <span className="text-[10px] font-bold text-blue-700">Abaixo da média</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(analytics?.behaviors || []).filter((b: any) => b.trend === 'baixa').map((b: any) => (
                    <span key={b.number} className="px-2 py-1 rounded-lg bg-blue-100 text-blue-900 font-black text-xs border border-blue-200">
                      {b.name || b.number.toString().padStart(2, '0')}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. MÓDULO: PARES, ÍMPARES & REPETIDAS */}
      {subTab === 'par_impar_repeat' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card: Pares e Ímpares */}
          <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-black text-slate-950 flex items-center space-x-2">
                <Calculator size={18} className={accentTextClass} />
                <span>Distribuição de Pares e Ímpares</span>
              </h3>
              <p className="text-xs text-slate-500">
                Proporção histórica de dezenas pares e ímpares nos {totalContests.toLocaleString('pt-BR')} concursos oficiais
              </p>
            </div>

            <div className="space-y-3.5">
              {(analytics?.evenOddStats || []).map((item: any) => {
                const evensFound = item.matchedInLatest?.evenNumbers || item.matchedInLatest?.evensList || [];
                const oddsFound = item.matchedInLatest?.oddNumbers || item.matchedInLatest?.oddsList || [];
                const topEvens = item.mostFrequentNumbers?.evens || item.mostFrequentEvens || [];
                const topOdds = item.mostFrequentNumbers?.odds || item.mostFrequentOdds || [];

                return (
                  <div key={item.pattern} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-black text-slate-800">{item.pattern}</span>
                      <span className={`font-extrabold ${accentTextClass}`}>
                        {item.percentage}% ({item.occurrences}x)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          item.percentage >= 20 ? (isLotofacil ? 'bg-purple-600' : (isMaisMilionaria ? 'bg-amber-600' : 'bg-emerald-600')) : 'bg-slate-400'
                        }`}
                        style={{ width: `${Math.min(100, item.percentage * 2.8)}%` }}
                      ></div>
                    </div>
                    <p className="text-[11px] text-slate-500">{item.description}</p>

                    {item.matchedInLatest?.isMatch && (
                      <div className="p-2.5 rounded-xl bg-emerald-100/80 border border-emerald-300 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-black text-emerald-950">
                          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                          <span>🎯 Ocorrido no Último Concurso #{latestDraw?.contestNumber}:</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px]">
                          {evensFound.length > 0 && (
                            <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                              <span className="font-bold text-emerald-950">Pares ({evensFound.length}):</span>
                              <span className="font-mono font-black text-emerald-700">
                                [{evensFound.map((n: number) => n.toString().padStart(2, '0')).join(', ')}]
                              </span>
                            </div>
                          )}
                          {oddsFound.length > 0 && (
                            <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                              <span className="font-bold text-emerald-950">Ímpares ({oddsFound.length}):</span>
                              <span className="font-mono font-black text-teal-700">
                                [{oddsFound.map((n: number) => n.toString().padStart(2, '0')).join(', ')}]
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="pt-1.5 border-t border-slate-200/80 flex flex-col gap-1.5">
                      <span className="text-[10px] uppercase font-black tracking-wider text-slate-500">
                        Dezenas mais Frequentes nesta Modalidade:
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="text-[10px] font-bold text-slate-600">Pares:</span>
                        {topEvens.slice(0, 5).map((n: number) => (
                          <span key={n} className="px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-slate-800 font-mono font-bold text-[10px]">
                            {n.toString().padStart(2, '0')}
                          </span>
                        ))}
                        <span className="text-[10px] font-bold text-slate-600 ml-2">Ímpares:</span>
                        {topOdds.slice(0, 5).map((n: number) => (
                          <span key={n} className="px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-slate-800 font-mono font-bold text-[10px]">
                            {n.toString().padStart(2, '0')}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card: Repetidas do Concurso Anterior */}
          <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-black text-slate-950 flex items-center space-x-2">
                <Repeat size={18} className={accentTextClass} />
                <span>Repetidas do Concurso Anterior</span>
              </h3>
              <p className="text-xs text-slate-500">
                Frequência de repetição de dezenas entre concursos consecutivos
              </p>
            </div>

            <div className="space-y-3.5">
              {(analytics?.repeatPreviousStats || []).map((item: any) => {
                const prevContest = item.matchedInLatest?.previousContestNumber || item.matchedInLatest?.previousContest || (totalContests - 1);
                const repeatedList = item.matchedInLatest?.repeatedNumbers || [];

                return (
                  <div key={item.repeatCount} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-black text-slate-800">
                        {item.repeatCount === 0 ? 'Nenhuma Dezena Repetida' : `${item.repeatCount} Dezena(s) Repetida(s)`}
                      </span>
                      <span className={`font-extrabold ${accentTextClass}`}>
                        {item.percentage}% ({item.occurrences}x)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          item.percentage >= 30 ? (isLotofacil ? 'bg-purple-600' : (isMaisMilionaria ? 'bg-amber-600' : 'bg-emerald-600')) : item.percentage >= 15 ? 'bg-teal-500' : 'bg-slate-400'
                        }`}
                        style={{ width: `${Math.min(100, item.percentage * 2)}%` }}
                      ></div>
                    </div>
                    <p className="text-[11px] text-slate-500">{item.description}</p>

                    {item.matchedInLatest?.isMatch && (
                      <div className="p-2.5 rounded-xl bg-amber-100/90 border border-amber-300 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-black text-amber-950">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                          <span>🎯 Encontrado no Concurso Atual (#{latestDraw?.contestNumber}):</span>
                        </div>
                        {item.repeatCount === 0 ? (
                          <p className="text-[11px] text-amber-900 font-semibold">
                            Zero dezenas repetidas em relação ao concurso #{prevContest}.
                          </p>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            <span className="text-[11px] text-amber-950 font-bold">Dezena(s) repetida(s):</span>
                            {repeatedList.map((n: number) => (
                              <span key={n} className="px-2 py-0.5 rounded-lg bg-amber-500 text-slate-950 font-mono font-black text-xs shadow-xs border border-amber-600">
                                {n.toString().padStart(2, '0')}
                              </span>
                            ))}
                            <span className="text-[10px] text-amber-800 ml-1">
                              (vs #{prevContest})
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {item.historicalTopRepeatedNumbers && item.historicalTopRepeatedNumbers.length > 0 && (
                      <div className="pt-1.5 border-t border-slate-200/80 flex flex-col gap-1">
                        <span className="text-[10px] uppercase font-black tracking-wider text-slate-500">
                          Dezenas que mais se repetem historicamente:
                        </span>
                        <div className="flex flex-wrap gap-1 items-center">
                          {item.historicalTopRepeatedNumbers.slice(0, 8).map((entry: any, idx: number) => {
                            const num = typeof entry === 'number' ? entry : entry.number;
                            const count = typeof entry === 'object' && entry.count ? entry.count : null;
                            return (
                              <span key={num || idx} className="px-2 py-0.5 rounded-md bg-white border border-emerald-300 text-emerald-950 font-mono font-bold text-xs shadow-2xs">
                                {num.toString().padStart(2, '0')}
                                {count && <span className="text-[9px] text-emerald-700 ml-1">({count}x)</span>}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className={`p-3.5 rounded-2xl border text-xs font-medium ${
              isLotofacil
                ? 'bg-purple-50 border-purple-200 text-purple-950'
                : isMaisMilionaria 
                ? 'bg-amber-50 border-amber-200 text-amber-950'
                : 'bg-emerald-50 border-emerald-200 text-emerald-950'
            }`}>
              💡 <strong>Regra de Ouro:</strong>{' '}
              {isLotofacil
                ? 'Na Lotofácil, em 79,5% dos concursos ocorrem entre 8, 9 ou 10 dezenas repetidas do concurso anterior!'
                : isMaisMilionaria
                ? 'Em mais de 53,5% dos sorteios ocorrem 1 ou 2 dezenas repetidas do concurso anterior.'
                : 'Em mais de 60,5% dos sorteios oficiais ocorrem 1 ou 2 dezenas repetidas do concurso anterior.'}
            </div>
          </div>
        </div>
      )}

      {/* 4. MÓDULO: PRIMOS, FIBONACCI & MÚLTIPLOS DE TRÊS */}
      {subTab === 'primes_fibo_mult3' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500 inline-block"></span>
                <h4 className="text-sm font-black text-slate-900">Números Primos</h4>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">{primesList.length} dezenas da cartela</p>
            </div>
            <div className="bg-rose-50/60 p-2.5 rounded-xl border border-rose-200 flex flex-wrap gap-1 text-[10px] font-black text-rose-900 font-mono">
              {primesList.map(n => n.toString().padStart(2, '0')).join(' • ')}
            </div>
            <div className="space-y-2 pt-2">
              {(analytics?.primeDistribution || []).map((p: any) => (
                <div key={p.countInDraw} className="space-y-1 p-2 rounded-xl bg-slate-50 border border-slate-200/60 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold">{p.countInDraw} Primos no Bilhete</span>
                    <span className="font-black text-rose-700">{p.percentage}% ({p.occurrences}x)</span>
                  </div>
                  {p.matchedInLatest?.isMatch && (
                    <div className="p-1.5 rounded-lg bg-rose-100/80 border border-rose-300 text-[10px] flex flex-wrap items-center gap-1 text-rose-950">
                      <span className="font-bold">🎯 No Último Concurso:</span>
                      <span className="font-mono font-black text-rose-800">
                        [{(p.matchedInLatest.numbersFound || []).map((n: number) => n.toString().padStart(2, '0')).join(', ')}]
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-full bg-cyan-500 inline-block"></span>
                <h4 className="text-sm font-black text-slate-900">Números de Fibonacci</h4>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">{fiboList.length} dezenas da cartela</p>
            </div>
            <div className="bg-cyan-50/60 p-2.5 rounded-xl border border-cyan-200 flex flex-wrap gap-1 text-[10px] font-black text-cyan-900 font-mono">
              {fiboList.map(n => n.toString().padStart(2, '0')).join(' • ')}
            </div>
            <div className="space-y-2 pt-2">
              {(analytics?.fibonacciDistribution || []).map((f: any) => (
                <div key={f.countInDraw} className="space-y-1 p-2 rounded-xl bg-slate-50 border border-slate-200/60 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold">{f.countInDraw} Fibonacci no Bilhete</span>
                    <span className="font-black text-cyan-700">{f.percentage}% ({f.occurrences}x)</span>
                  </div>
                  {f.matchedInLatest?.isMatch && (
                    <div className="p-1.5 rounded-lg bg-cyan-100/80 border border-cyan-300 text-[10px] flex flex-wrap items-center gap-1 text-cyan-950">
                      <span className="font-bold">🎯 No Último Concurso:</span>
                      <span className="font-mono font-black text-cyan-800">
                        [{(f.matchedInLatest.numbersFound || []).map((n: number) => n.toString().padStart(2, '0')).join(', ')}]
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
                <h4 className="text-sm font-black text-slate-900">Múltiplos de 3</h4>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">{mult3List.length} dezenas da cartela</p>
            </div>
            <div className="bg-amber-50/60 p-2.5 rounded-xl border border-amber-200 flex flex-wrap gap-1 text-[10px] font-black text-amber-900 font-mono">
              {mult3List.map(n => n.toString().padStart(2, '0')).join(' • ')}
            </div>
            <div className="space-y-2 pt-2">
              {(analytics?.multiplesOfThreeDistribution || []).map((m: any) => (
                <div key={m.countInDraw} className="space-y-1 p-2 rounded-xl bg-slate-50 border border-slate-200/60 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold">{m.countInDraw} Múltiplos de 3</span>
                    <span className="font-black text-amber-700">{m.percentage}% ({m.occurrences}x)</span>
                  </div>
                  {m.matchedInLatest?.isMatch && (
                    <div className="p-1.5 rounded-lg bg-amber-100/80 border border-amber-300 text-[10px] flex flex-wrap items-center gap-1 text-amber-950">
                      <span className="font-bold">🎯 No Último Concurso:</span>
                      <span className="font-mono font-black text-amber-800">
                        [{(m.matchedInLatest.numbersFound || []).map((n: number) => n.toString().padStart(2, '0')).join(', ')}]
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. MÓDULO: GEOMETRIA DA CARTELA */}
      {subTab === 'board_geometry' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-black text-slate-950 flex items-center space-x-2">
                <Grid size={18} className={accentTextClass} />
                <span>Dezenas na Moldura vs Centro</span>
              </h3>
              <p className="text-xs text-slate-500">
                {isLotofacil
                  ? 'Na Lotofácil (5x5): Moldura com 16 dezenas e Centro (miolo) com 9 dezenas'
                  : isMaisMilionaria
                  ? 'Na +Milionária (5x10): Moldura com 26 dezenas e Centro com 24 dezenas'
                  : 'Na Mega-Sena (6x10): Moldura com 28 dezenas e Centro com 32 dezenas'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-4 rounded-2xl bg-orange-50/60 border border-orange-200">
                <span className="text-[10px] uppercase font-black text-orange-800">Moldura</span>
                <p className="text-2xl font-black text-orange-950 mt-1">{analytics?.frameVsCenterStats?.framePercentage || 0}%</p>
                <span className="text-[10px] text-orange-700">{analytics?.frameVsCenterStats?.frameTotalDraws || 0} aparições</span>
              </div>

              <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200">
                <span className="text-[10px] uppercase font-black text-teal-800">Centro</span>
                <p className="text-2xl font-black text-teal-950 mt-1">{analytics?.frameVsCenterStats?.centerPercentage || 0}%</p>
                <span className="text-[10px] text-teal-700">{analytics?.frameVsCenterStats?.centerTotalDraws || 0} aparições</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600">
              <strong>Equilíbrio Clássico:</strong> {analytics?.frameVsCenterStats?.idealRatio || 'Equilíbrio Moldura/Centro'}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-black text-slate-950 flex items-center space-x-2">
                <Shapes size={18} className={accentTextClass} />
                <span>Tabela dos 4 Quadrantes</span>
              </h3>
              <p className="text-xs text-slate-500">
                Distribuição acumulada de saídas pelos 4 quadrantes da cartela oficial
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(analytics?.quadrantsStats || []).map((q: any) => {
                const displayName = q.name && q.name.includes('-') ? q.name.split('-')[1].trim() : (q.name || `Quadrante ${q.quad}`);
                return (
                  <div key={q.quad} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] font-black uppercase text-slate-500 block">Q{q.quad}</span>
                    <span className="text-xs font-bold text-slate-800">{displayName}</span>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-lg font-black text-emerald-950">{q.percentage}%</span>
                      <span className="text-[10px] text-slate-500">{q.count}x</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 6. MÓDULO: DUQUES & PARETO */}
      {subTab === 'duques_pareto' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-black text-slate-950 flex items-center space-x-2">
                <Layers size={18} className={accentTextClass} />
                <span>Top 15 Duques que Mais Saíram Juntos</span>
              </h3>
              <p className="text-xs text-slate-500">
                Pares de dezenas com a maior taxa de coocorrência na história
              </p>
            </div>

            <div className="space-y-2">
              {(analytics?.topDuques || []).slice(0, 15).map((d: any, idx: number) => (
                <div key={d.name || idx} className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-slate-400 w-5">#{idx + 1}</span>
                    <span className="font-mono font-black text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      {d.pair ? `${d.pair[0].toString().padStart(2, '0')} - ${d.pair[1].toString().padStart(2, '0')}` : d.name}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-black text-emerald-800">{d.count}x juntos</span>
                    <span className="text-[10px] text-slate-400">({d.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-black text-slate-950 flex items-center space-x-2">
                <PieChart size={18} className={accentTextClass} />
                <span>Princípio de Pareto (Curva ABC)</span>
              </h3>
              <p className="text-xs text-slate-500">
                As dezenas mais produtivas responsáveis pela maior fatia das aparições históricas
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-2">
              <span className="text-xs font-black text-emerald-950 uppercase">Grupo A (Dezenas Líderes do Ranking):</span>
              <p className="text-xs text-slate-600">
                Representam as dezenas de maior tração histórica nesta loteria.
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {paretoGroupA.map(n => (
                  <span key={n} className="px-2 py-1 rounded-lg bg-emerald-700 text-white font-mono font-black text-xs shadow-xs">
                    {n.toString().padStart(2, '0')}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600">
              <strong>Participação do Grupo A:</strong> Este seleto grupo de {paretoGroupA.length} dezenas responde por <strong>{analytics?.paretoShare || 38.5}%</strong> das ocorrências apuradas.
            </div>
          </div>
        </div>
      )}

      {/* 7. MÓDULO: POSIÇÕES & AMPLITUDE */}
      {subTab === 'positions_binary' && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-5">
          <div>
            <h3 className="text-base font-black text-slate-950 flex items-center space-x-2">
              <ArrowUpDown size={18} className={accentTextClass} />
              <span>Amplitude e Faixa Típica por Posição Sorteada</span>
            </h3>
            <p className="text-xs text-slate-500">
              Faixa de dezenas mais frequente quando os números são organizados em ordem crescente
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {(analytics?.positionStats || []).map((pos: any) => {
              const typicalRange = pos.typicalRange || `${pos.minObserved?.toString().padStart(2, '0') || '01'} a ${pos.maxObserved?.toString().padStart(2, '0') || maxNum}`;
              const averageValue = pos.averageValue || pos.average || 0;
              const mostFreqStr = pos.mostFrequent 
                ? pos.mostFrequent.toString().padStart(2, '0') 
                : (pos.mostFrequentNumbers?.[0] ? pos.mostFrequentNumbers[0].toString().padStart(2, '0') : '-');

              return (
                <div key={pos.position} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-slate-500 block">
                    {pos.position}ª Dezena Sorteada
                  </span>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Faixa Típica:</span>
                      <strong className="text-slate-900">{typicalRange}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Média Histórica:</span>
                      <span className="font-bold text-emerald-700">{averageValue}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Mais Sorteada:</span>
                      <span className="font-mono font-black text-slate-900">{mostFreqStr}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-4 rounded-2xl bg-slate-100/70 border border-slate-200 space-y-1 text-xs text-slate-700">
            <strong>Amplitude Média dos Sorteios:</strong> {spanStats.averageSpan} dezenas entre o menor e o maior número sorteado (Faixa ideal: {spanStats.idealSpanMin} a {spanStats.idealSpanMax}).
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedAnalyticsView;
