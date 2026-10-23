import React, { useState, useMemo, useDeferredValue } from 'react';
import { 
  Table, 
  Flame, 
  Snowflake, 
  Activity, 
  Layers, 
  Repeat, 
  Hash, 
  Calculator, 
  Grid, 
  Columns, 
  PieChart, 
  TrendingUp, 
  Search, 
  ArrowUpDown, 
  CheckCircle2, 
  AlertCircle,
  Binary,
  Shapes,
  Sparkles,
  Info,
  Calendar,
  Award
} from 'lucide-react';
import { 
  computeAllMegaSenaAnalytics, 
  buildDrawsListWithLatest,
  NumberDetailedAnalysis,
  PRIME_NUMBERS,
  FIBONACCI_NUMBERS,
  MULTIPLES_OF_THREE
} from '../utils/megaSenaAdvancedAnalytics';
import { TOTAL_CONTESTS_COUNT } from '../utils/megaSenaContestsData';
import { OfficialDrawResult } from '../types';

interface AdvancedAnalyticsViewProps {
  latestDraw?: OfficialDrawResult;
}

export const AdvancedAnalyticsView: React.FC<AdvancedAnalyticsViewProps> = ({ latestDraw }) => {
  const deferredLatestDraw = useDeferredValue(latestDraw);

  const dynamicDraws = useMemo(() => {
    return buildDrawsListWithLatest(deferredLatestDraw);
  }, [deferredLatestDraw]);

  const analytics = useMemo(() => {
    return computeAllMegaSenaAnalytics(dynamicDraws);
  }, [dynamicDraws]);
  
  // Sub-abas de navegação temática
  const [subTab, setSubTab] = useState<
    'table' | 'behavior_cycle' | 'par_impar_repeat' | 'primes_fibo_mult3' | 'board_geometry' | 'duques_pareto' | 'positions_binary'
  >('table');

  // Filtros da Tabela Geral com useDeferredValue
  const [tableSearch, setTableSearch] = useState('');
  const deferredTableSearch = useDeferredValue(tableSearch);
  const [tableSort, setTableSort] = useState<'ranking' | 'delay' | 'number' | 'draws'>('ranking');
  const [statusFilter, setStatusFilter] = useState<'all' | 'quente' | 'morna' | 'fria'>('all');

  // Dados filtrados da Tabela dos 60 Números
  const filteredNumbers = useMemo(() => {
    let list = [...analytics.numbersAnalysis];

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
  }, [analytics.numbersAnalysis, statusFilter, tableSearch, tableSort]);

  return (
    <div className="space-y-6">
      {/* Top Banner Informativo da Base de Dados */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-3xl p-5 sm:p-7 shadow-md relative overflow-hidden border border-emerald-800">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-widest border border-emerald-400/30">
                Oficial CEF • Base Concursos 1 a {latestDraw?.contestNumber || TOTAL_CONTESTS_COUNT}
              </span>
              {latestDraw && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-bold border border-amber-300/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                  Último Sorteio Integrado: {latestDraw.numbers.map(n => n.toString().padStart(2, '0')).join(' - ')}
                </span>
              )}
              <span className="text-xs text-emerald-200">Desde Março/1996</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1.5 tracking-tight">
              Central Estatística Avançada da Mega-Sena
            </h2>
            <p className="text-xs text-emerald-100/80 max-w-2xl mt-1 leading-relaxed">
              Análise completa dos 20 pilares matemáticos: Comportamento, Ciclo, Primos, Fibonacci, Múltiplos de 3, Moldura, Quadrantes, Duques, Atrasos e Padrões Históricos.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white/10 p-2 rounded-2xl backdrop-blur-xs text-center">
            <div className="px-3 py-1">
              <span className="text-[10px] uppercase text-emerald-300 font-bold block">Concursos</span>
              <span className="text-lg font-black text-white">{TOTAL_CONTESTS_COUNT}</span>
            </div>
            <div className="w-px h-8 bg-white/20"></div>
            <div className="px-3 py-1">
              <span className="text-[10px] uppercase text-emerald-300 font-bold block">Dezenas Sorteadas</span>
              <span className="text-lg font-black text-white">{(TOTAL_CONTESTS_COUNT * 6).toLocaleString('pt-BR')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Menu de Navegação entre os Módulos Analíticos */}
      <div className="bg-white rounded-2xl p-1.5 border border-emerald-100 shadow-xs flex flex-wrap gap-1">
        {[
          { id: 'table', label: 'Tabela dos 60 Números', icon: Table },
          { id: 'behavior_cycle', label: 'Comportamento & Ciclo', icon: Activity },
          { id: 'par_impar_repeat', label: 'Pares, Ímpares & Repetidas', icon: Repeat },
          { id: 'primes_fibo_mult3', label: 'Primos, Fibonacci & Múlt. 3', icon: Hash },
          { id: 'board_geometry', label: 'Moldura, Quadrantes & Linhas', icon: Grid },
          { id: 'duques_pareto', label: 'Duques & Princípio de Pareto', icon: TrendingUp },
          { id: 'positions_binary', label: 'Posições & Matriz Binária', icon: Binary }
        ].map(item => {
          const Icon = item.icon;
          const isActive = subTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSubTab(item.id as any)}
              className={`flex-1 min-w-[170px] sm:min-w-0 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-1.5 ${
                isActive 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'text-slate-600 hover:text-emerald-950 hover:bg-emerald-50/50'
              }`}
            >
              <Icon size={15} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. MÓDULO: TABELA DE ANÁLISE DOS NÚMEROS (01 A 60) */}
      {subTab === 'table' && (
        <div className="bg-white rounded-3xl p-4 sm:p-6 border border-emerald-100 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-emerald-950 flex items-center space-x-2">
                <Table size={18} className="text-emerald-600" />
                <span>Tabela Completa de Análise dos 60 Números</span>
              </h3>
              <p className="text-xs text-slate-500">
                Frequência acumulada, atraso atual, maior atraso histórico e classificações de cada dezena
              </p>
            </div>

            {/* Controles de Busca e Filtro */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="relative flex items-center">
                <Search size={14} className="absolute left-2.5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Dezena..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs w-24 sm:w-28 focus:border-emerald-500 outline-none"
                />
              </div>

              {/* Status */}
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="py-1.5 px-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white"
              >
                <option value="all">Todos os Status</option>
                <option value="quente">🔥 Quentes</option>
                <option value="morna">⚡ Mornas</option>
                <option value="fria">❄️ Frias / Atrasadas</option>
              </select>

              {/* Ordenação */}
              <select 
                value={tableSort}
                onChange={(e) => setTableSort(e.target.value as any)}
                className="py-1.5 px-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white"
              >
                <option value="ranking">Ranking Histórico</option>
                <option value="draws">Mais Sorteadas</option>
                <option value="delay">Maior Atraso Atual</option>
                <option value="number">Ordem 01 a 60</option>
              </select>
            </div>
          </div>

          {/* Tabela Responsiva */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[10px] border-b border-slate-200">
                  <th className="py-2.5 px-3">Dezena</th>
                  <th className="py-2.5 px-3">Ranking</th>
                  <th className="py-2.5 px-3">Total Sorteios</th>
                  <th className="py-2.5 px-3">Frequência %</th>
                  <th className="py-2.5 px-3">Atraso Atual</th>
                  <th className="py-2.5 px-3">Maior Atraso</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Classificações</th>
                  <th className="py-2.5 px-3">Posição na Cartela</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredNumbers.map(n => (
                  <tr key={n.number} className="hover:bg-emerald-50/40 transition-colors">
                    <td className="py-2.5 px-3 font-black text-sm text-emerald-950">
                      <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-900 inline-flex items-center justify-center font-black">
                        {n.name}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-700">
                      #{n.ranking}º
                    </td>
                    <td className="py-2.5 px-3 font-black text-slate-900">
                      {n.totalDraws} vezes
                    </td>
                    <td className="py-2.5 px-3 font-bold text-emerald-700">
                      {n.frequencyPercentage}%
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                        n.currentDelay === 0 ? 'bg-amber-100 text-amber-900 font-black' :
                        n.currentDelay <= 4 ? 'bg-emerald-100 text-emerald-800' :
                        n.currentDelay >= 15 ? 'bg-blue-100 text-blue-900' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {n.currentDelay === 0 ? 'Saiu no último!' : `${n.currentDelay} sorteios`}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-500">
                      {n.maxDelayHistorical} concursos
                    </td>
                    <td className="py-2.5 px-3">
                      {n.status === 'quente' && (
                        <span className="inline-flex items-center text-[10px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          🔥 Quente
                        </span>
                      )}
                      {n.status === 'morna' && (
                        <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          ⚡ Morna
                        </span>
                      )}
                      {n.status === 'fria' && (
                        <span className="inline-flex items-center text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                          ❄️ Fria
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex flex-wrap gap-1 text-[9px] font-extrabold uppercase">
                        <span className={`px-1.5 py-0.5 rounded ${n.isEven ? 'bg-purple-100 text-purple-800' : 'bg-indigo-100 text-indigo-800'}`}>
                          {n.isEven ? 'Par' : 'Ímpar'}
                        </span>
                        {n.isPrime && <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">Primo</span>}
                        {n.isFibonacci && <span className="px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-800">Fibo</span>}
                        {n.isMultipleOfThree && <span className="px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800">Múlt.3</span>}
                        <span className={`px-1.5 py-0.5 rounded ${n.isFrame ? 'bg-orange-100 text-orange-800' : 'bg-teal-100 text-teal-800'}`}>
                          {n.isFrame ? 'Moldura' : 'Centro'}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-slate-500">
                      Linha {n.row} • Coluna {n.col} • Q{n.quadrant + 1}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. MÓDULO: COMPORTAMENTO DAS DEZENAS & CICLO */}
      {subTab === 'behavior_cycle' && (
        <div className="space-y-6">
          {/* Card: Ciclo das Dezenas */}
          <div className="bg-white rounded-3xl p-5 sm:p-7 border border-emerald-100 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-emerald-950 flex items-center space-x-2">
                  <Repeat size={18} className="text-emerald-600" />
                  <span>Ciclo das Dezenas Atual</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Um ciclo se fecha quando todas as 60 dezenas da Mega-Sena são sorteadas pelo menos uma vez
                </p>
              </div>

              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 font-black text-xs">
                {analytics.cycleAnalysis.percentCompleted}% Completo ({analytics.cycleAnalysis.drawnCount}/60)
              </span>
            </div>

            {/* Barra de Progresso do Ciclo */}
            <div className="space-y-1.5">
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-emerald-600 to-teal-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${analytics.cycleAnalysis.percentCompleted}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>{analytics.cycleAnalysis.drawnCount} dezenas já sorteadas no ciclo</span>
                <span>Faltam {analytics.cycleAnalysis.missingCount} dezenas para fechar o ciclo</span>
              </div>
            </div>

            {/* Dezenas que Faltam Sair no Ciclo */}
            <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center">
                  <AlertCircle size={15} className="mr-1.5 text-amber-600" />
                  Dezenas que Faltam Sair ({analytics.cycleAnalysis.missingCount}):
                </span>
                <span className="text-[10px] text-amber-800 font-semibold">Tendem a fechar em média a cada 28 sorteios</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {analytics.cycleAnalysis.missingNumbers.map(num => (
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
          <div className="bg-white rounded-3xl p-5 sm:p-7 border border-emerald-100 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-black text-emerald-950 flex items-center space-x-2">
                <Activity size={18} className="text-emerald-600" />
                <span>Comportamento & Tendências das Dezenas</span>
              </h3>
              <p className="text-xs text-slate-500">
                Comparativo da frequência nos últimos 10, 25 e 50 concursos contra a média esperada
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Em Alta */}
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between text-emerald-900">
                  <span className="text-xs font-black uppercase">🔥 Dezenas em Alta</span>
                  <span className="text-[10px] font-bold text-emerald-700">&ge; 2x nos últimos 10</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {analytics.behaviors.filter(b => b.trend === 'alta').map(b => (
                    <span key={b.number} className="px-2 py-1 rounded-lg bg-emerald-600 text-white font-black text-xs shadow-xs">
                      {b.name} ({b.last10}x)
                    </span>
                  ))}
                </div>
              </div>

              {/* Estáveis */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-slate-800">
                  <span className="text-xs font-black uppercase">⚡ Dezenas Estáveis</span>
                  <span className="text-[10px] font-bold text-slate-500">1x nos últimos 10</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {analytics.behaviors.filter(b => b.trend === 'estavel').slice(0, 18).map(b => (
                    <span key={b.number} className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold text-xs">
                      {b.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Em Baixa / Atrasadas */}
              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-2">
                <div className="flex items-center justify-between text-blue-900">
                  <span className="text-xs font-black uppercase">❄️ Dezenas em Baixa</span>
                  <span className="text-[10px] font-bold text-blue-700">0x nos últimos 10</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {analytics.behaviors.filter(b => b.trend === 'baixa').map(b => (
                    <span key={b.number} className="px-2 py-1 rounded-lg bg-blue-100 text-blue-900 font-black text-xs border border-blue-200">
                      {b.name}
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
          <div className="bg-white rounded-3xl p-5 sm:p-7 border border-emerald-100 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-black text-emerald-950 flex items-center space-x-2">
                <Calculator size={18} className="text-emerald-600" />
                <span>Distribuição de Pares e Ímpares</span>
              </h3>
              <p className="text-xs text-slate-500">
                Proporção de dezenas pares e ímpares em todos os {TOTAL_CONTESTS_COUNT} concursos
              </p>
            </div>

            <div className="space-y-3">
              {analytics.evenOddStats.map(item => (
                <div key={item.pattern} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-black text-slate-800">{item.pattern}</span>
                    <span className="font-extrabold text-emerald-800">{item.percentage}% ({item.occurrences}x)</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        item.percentage >= 20 ? 'bg-emerald-600' : 'bg-slate-400'
                      }`}
                      style={{ width: `${item.percentage * 2.8}%` }}
                    ></div>
                  </div>
                  <p className="text-[10px] text-slate-500">{item.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Card: Repetidas do Concurso Anterior */}
          <div className="bg-white rounded-3xl p-5 sm:p-7 border border-emerald-100 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-black text-emerald-950 flex items-center space-x-2">
                <Repeat size={18} className="text-emerald-600" />
                <span>Repetidas do Concurso Anterior</span>
              </h3>
              <p className="text-xs text-slate-500">
                Frequência de repetição de dezenas entre concursos consecutivos
              </p>
            </div>

            <div className="space-y-3">
              {analytics.repeatPreviousStats.map(item => (
                <div key={item.repeatCount} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-black text-slate-800">
                      {item.repeatCount === 0 ? 'Nenhuma Dezena Repetida' : `${item.repeatCount} Dezena(s) Repetida(s)`}
                    </span>
                    <span className="font-extrabold text-emerald-800">{item.percentage}% ({item.occurrences}x)</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        item.percentage >= 30 ? 'bg-emerald-600' : item.percentage >= 15 ? 'bg-teal-500' : 'bg-slate-400'
                      }`}
                      style={{ width: `${item.percentage * 2}%` }}
                    ></div>
                  </div>
                  <p className="text-[10px] text-slate-500">{item.description}</p>
                </div>
              ))}
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 font-medium">
              💡 <strong>Regra de Ouro:</strong> Em <strong>60,5%</strong> dos sorteios ocorrem 1 ou 2 dezenas repetidas do concurso anterior. Sempre inclua pelo menos 1 número do último concurso!
            </div>
          </div>
        </div>
      )}

      {/* 4. MÓDULO: PRIMOS, FIBONACCI & MÚLTIPLOS DE TRÊS */}
      {subTab === 'primes_fibo_mult3' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Primos */}
          <div className="bg-white rounded-3xl p-5 border border-emerald-100 shadow-sm space-y-3">
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500 inline-block"></span>
                <h4 className="text-sm font-black text-slate-900">Números Primos</h4>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">17 dezenas da cartela</p>
            </div>

            <div className="bg-rose-50/60 p-2.5 rounded-xl border border-rose-200 flex flex-wrap gap-1 text-[10px] font-black text-rose-900">
              {PRIME_NUMBERS.map(n => n.toString().padStart(2, '0')).join(' • ')}
            </div>

            <div className="space-y-2 pt-2">
              {analytics.primeDistribution.map(p => (
                <div key={p.countInDraw} className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-50">
                  <span className="font-bold">{p.countInDraw} Primos no Bilhete</span>
                  <span className="font-black text-rose-700">{p.percentage}% ({p.occurrences}x)</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-400">Padrão Ideal: 1 a 3 primos (86,4% dos sorteios)</p>
          </div>

          {/* Fibonacci */}
          <div className="bg-white rounded-3xl p-5 border border-emerald-100 shadow-sm space-y-3">
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-full bg-cyan-500 inline-block"></span>
                <h4 className="text-sm font-black text-slate-900">Números de Fibonacci</h4>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">9 dezenas da cartela</p>
            </div>

            <div className="bg-cyan-50/60 p-2.5 rounded-xl border border-cyan-200 flex flex-wrap gap-1 text-[10px] font-black text-cyan-900">
              {FIBONACCI_NUMBERS.map(n => n.toString().padStart(2, '0')).join(' • ')}
            </div>

            <div className="space-y-2 pt-2">
              {analytics.fibonacciDistribution.map(f => (
                <div key={f.countInDraw} className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-50">
                  <span className="font-bold">{f.countInDraw} Fibonacci</span>
                  <span className="font-black text-cyan-700">{f.percentage}% ({f.occurrences}x)</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-400">Padrão Ideal: 0 a 2 números de Fibonacci (95,0%)</p>
          </div>

          {/* Múltiplos de 3 */}
          <div className="bg-white rounded-3xl p-5 border border-emerald-100 shadow-sm space-y-3">
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
                <h4 className="text-sm font-black text-slate-900">Múltiplos de 3</h4>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">20 dezenas da cartela</p>
            </div>

            <div className="bg-amber-50/60 p-2.5 rounded-xl border border-amber-200 flex flex-wrap gap-1 text-[10px] font-black text-amber-900">
              {MULTIPLES_OF_THREE.map(n => n.toString().padStart(2, '0')).join(' • ')}
            </div>

            <div className="space-y-2 pt-2">
              {analytics.multiplesOfThreeDistribution.map(m => (
                <div key={m.countInDraw} className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-50">
                  <span className="font-bold">{m.countInDraw} Múltiplos de 3</span>
                  <span className="font-black text-amber-700">{m.percentage}% ({m.occurrences}x)</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-400">Padrão Ideal: 1 a 3 múltiplos de 3 (83,4%)</p>
          </div>
        </div>
      )}

      {/* 5. MÓDULO: GEOMETRIA DA CARTELA (MOLDURA, QUADRANTES, LINHAS E COLUNAS) */}
      {subTab === 'board_geometry' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Moldura vs Centro */}
            <div className="bg-white rounded-3xl p-5 sm:p-7 border border-emerald-100 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-black text-emerald-950 flex items-center space-x-2">
                  <Grid size={18} className="text-emerald-600" />
                  <span>Dezenas na Moldura vs Centro</span>
                </h3>
                <p className="text-xs text-slate-500">
                  A Moldura compõe as 28 dezenas periféricas; o Centro/Miolo compõe as 32 dezenas internas
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-4 rounded-2xl bg-orange-50/60 border border-orange-200">
                  <span className="text-[10px] uppercase font-black text-orange-800">Moldura (28 dezenas)</span>
                  <p className="text-2xl font-black text-orange-950 mt-1">{analytics.frameVsCenterStats.framePercentage}%</p>
                  <span className="text-[10px] text-orange-700">{analytics.frameVsCenterStats.frameTotalDraws} dezenas sorteadas</span>
                </div>

                <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200">
                  <span className="text-[10px] uppercase font-black text-teal-800">Centro (32 dezenas)</span>
                  <p className="text-2xl font-black text-teal-950 mt-1">{analytics.frameVsCenterStats.centerPercentage}%</p>
                  <span className="text-[10px] text-teal-700">{analytics.frameVsCenterStats.centerTotalDraws} dezenas sorteadas</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600">
                <strong>Equilíbrio Clássico:</strong> {analytics.frameVsCenterStats.idealRatio}
              </div>
            </div>

            {/* Quadrantes da Cartela */}
            <div className="bg-white rounded-3xl p-5 sm:p-7 border border-emerald-100 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-black text-emerald-950 flex items-center space-x-2">
                  <Shapes size={18} className="text-emerald-600" />
                  <span>Tabela dos 4 Quadrantes</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Distribuição acumulada de saídas pelos 4 quadrantes da cartela oficial
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {analytics.quadrantsStats.map(q => (
                  <div key={q.quad} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] font-black uppercase text-slate-500 block">Q{q.quad}</span>
                    <span className="text-xs font-bold text-slate-800">{q.name.split('-')[1]}</span>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-lg font-black text-emerald-950">{q.percentage}%</span>
                      <span className="text-[10px] text-slate-500">{q.count}x</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Linhas e Colunas */}
          <div className="bg-white rounded-3xl p-5 sm:p-7 border border-emerald-100 shadow-sm space-y-4">
            <h3 className="text-base font-black text-emerald-950 flex items-center space-x-2">
              <Columns size={18} className="text-emerald-600" />
              <span>Dezenas por Linhas e Colunas</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Linhas */}
              <div className="space-y-2">
                <span className="text-xs font-black text-slate-700 uppercase">Linhas (1 a 6):</span>
                <div className="space-y-1.5">
                  {analytics.rowsStats.map(r => (
                    <div key={r.row} className="flex justify-between items-center p-2 rounded-xl bg-slate-50 text-xs">
                      <span className="font-bold text-slate-800">{r.name}</span>
                      <span className="font-black text-emerald-800">{r.percentage}% ({r.totalDraws}x)</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Colunas */}
              <div className="space-y-2">
                <span className="text-xs font-black text-slate-700 uppercase">Colunas (Finais 0 a 9):</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {analytics.columnsStats.map(c => (
                    <div key={c.col} className="p-2 rounded-xl bg-slate-50 text-xs flex justify-between items-center">
                      <span className="font-bold text-slate-700">Col {c.col} (Final {c.digitEnd})</span>
                      <span className="font-black text-emerald-800">{c.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. MÓDULO: DUQUES DA MEGASENA & PRINCÍPIO DE PARETO */}
      {subTab === 'duques_pareto' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Duques Mais Sorteados */}
          <div className="bg-white rounded-3xl p-5 sm:p-7 border border-emerald-100 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-black text-emerald-950 flex items-center space-x-2">
                <Award size={18} className="text-emerald-600" />
                <span>Duques da Mega-Sena (Duplas de Números)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Os 10 pares de dezenas que mais saíram juntos em toda a história dos sorteios
              </p>
            </div>

            <div className="space-y-2.5">
              {analytics.topDuques.map((duque, idx) => (
                <div key={duque.name} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80 hover:bg-emerald-50/50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-900 font-black text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div className="flex space-x-1.5">
                      <span className="px-2.5 py-1 rounded-xl bg-emerald-600 text-white font-black text-xs">
                        {duque.pair[0].toString().padStart(2, '0')}
                      </span>
                      <span className="px-2.5 py-1 rounded-xl bg-emerald-600 text-white font-black text-xs">
                        {duque.pair[1].toString().padStart(2, '0')}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-black text-xs text-slate-900 block">{duque.count} vezes juntos</span>
                    <span className="text-[10px] text-emerald-700 font-bold">{duque.percentage}% dos concursos</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Princípio de Pareto (80/20) & Bernoulli */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-5 sm:p-7 border border-emerald-100 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-black text-emerald-950 flex items-center space-x-2">
                  <TrendingUp size={18} className="text-emerald-600" />
                  <span>Princípio de Pareto (Regra 80/20)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  As 12 dezenas (20% da cartela) que mais concentram aparições na história da Mega-Sena
                </p>
              </div>

              <div className="bg-emerald-50/80 border border-emerald-200 p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-900">Concentração de Saídas</span>
                  <p className="text-xl font-black text-emerald-950">{analytics.paretoShare}% de todos os números sorteados</p>
                </div>
                <span className="text-xs font-black bg-emerald-600 text-white px-3 py-1 rounded-xl shadow-xs">Top 20%</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {analytics.paretoTopNumbers.map(n => (
                  <div key={n.number} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center flex-1 min-w-[70px]">
                    <span className="font-black text-sm text-emerald-900 block">{n.name}</span>
                    <span className="text-[10px] text-slate-500 font-bold">{n.totalDraws}x</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Somas & Modelo de Bernoulli */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-emerald-100 shadow-sm space-y-3">
              <h4 className="text-sm font-black text-slate-900 flex items-center space-x-1.5">
                <Calculator size={16} className="text-emerald-600" />
                <span>Faixas de Soma (Distribuição de Bernoulli)</span>
              </h4>
              <div className="space-y-1.5">
                {analytics.sumRanges.map(s => (
                  <div key={s.range} className="flex justify-between items-center text-xs p-2 rounded-xl bg-slate-50">
                    <span className="font-bold text-slate-800">{s.range}</span>
                    <span className="text-[11px] text-slate-500 font-medium">{s.status}</span>
                    <span className={`font-black ${s.percentage >= 25 ? 'text-emerald-700' : 'text-slate-700'}`}>
                      {s.percentage}% ({s.count}x)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. MÓDULO: POSIÇÕES ORDENADAS & MATRIZ BINÁRIA */}
      {subTab === 'positions_binary' && (
        <div className="space-y-6">
          {/* Posições Detalhadas (1ª à 6ª dezena) */}
          <div className="bg-white rounded-3xl p-5 sm:p-7 border border-emerald-100 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-black text-emerald-950 flex items-center space-x-2">
                <ArrowUpDown size={18} className="text-emerald-600" />
                <span>Ordem de Sorteio e Posição Detalhada</span>
              </h3>
              <p className="text-xs text-slate-500">
                Comportamento estatístico de cada uma das 6 posições quando as dezenas são ordenadas
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {analytics.positionStats.map(pos => (
                <div key={pos.position} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-emerald-950">{pos.name}</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">Posição {pos.position}</span>
                  </div>
                  <div className="text-xs text-slate-600 space-y-0.5">
                    <div>Média histórica: <strong className="text-slate-900">{pos.average}</strong></div>
                    <div>Variação observada: <strong>{pos.minObserved} a {pos.maxObserved}</strong></div>
                  </div>
                  <div className="pt-1">
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">Dezenas mais frequentes nesta posição:</span>
                    <div className="flex gap-1">
                      {pos.mostFrequentNumbers.map(n => (
                        <span key={n} className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold text-[10px]">
                          {n.toString().padStart(2, '0')}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Matriz Binária dos Concursos Recentes */}
          <div className="bg-white rounded-3xl p-5 sm:p-7 border border-emerald-100 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-black text-emerald-950 flex items-center space-x-2">
                <Binary size={18} className="text-emerald-600" />
                <span>Tabela Binária dos Últimos Concursos</span>
              </h3>
              <p className="text-xs text-slate-500">
                Visualização matricial das dezenas sorteadas (1 = sorteada, 0 = ausente) nos concursos mais recentes
              </p>
            </div>

            <div className="space-y-2">
              {analytics.binaryTableRecent.slice(0, 8).map(draw => (
                <div key={draw.contest} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-black text-emerald-950">Concurso {draw.contest}</span>
                    <span className="text-[10px] text-slate-400 font-medium">({draw.date})</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {draw.numbers.map(n => (
                      <span key={n} className="px-2 py-0.5 rounded-lg bg-emerald-700 text-white font-bold text-xs">
                        {n.toString().padStart(2, '0')}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tabela de Padrões Clássicos */}
          <div className="bg-white rounded-3xl p-5 sm:p-7 border border-emerald-100 shadow-sm space-y-4">
            <h3 className="text-base font-black text-emerald-950 flex items-center space-x-2">
              <CheckCircle2 size={18} className="text-emerald-600" />
              <span>Tabela Unificada de Padrões da Mega-Sena</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {analytics.classicPatterns.map(pat => (
                <div key={pat.title} className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-1">
                  <span className="text-[10px] font-black uppercase text-emerald-700">{pat.badge}</span>
                  <h4 className="text-xs font-black text-slate-900">{pat.title}</h4>
                  <p className="text-xs text-slate-600">{pat.range}</p>
                  <span className="text-sm font-black text-emerald-800 block pt-1">{pat.share} dos jogos</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedAnalyticsView;
