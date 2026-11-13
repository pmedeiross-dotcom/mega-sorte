import React, { useMemo, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  CartesianGrid
} from 'recharts';
import { 
  BarChart3, 
  TrendingUp, 
  Award, 
  Flame, 
  Snowflake, 
  Database, 
  Info
} from 'lucide-react';
import { Bet, LotteryType } from '../types';
import { 
  TOTAL_OFFICIAL_CONCURSOS, 
  ALL_OFFICIAL_STATS
} from '../utils/megaSenaOfficialStats';
import {
  TOTAL_MAIS_MILIONARIA_CONCURSOS,
  ALL_MAIS_MILIONARIA_STATS,
  MAIS_MILIONARIA_HISTORICAL_METRICS
} from '../utils/maisMilionariaOfficialStats';
import {
  TOTAL_LOTOFACIL_CONCURSOS,
  LOTOFACIL_FREQUENCY_DATA,
  LOTOFACIL_HISTORICAL_METRICS
} from '../utils/lotofacilOfficialStats';

interface FrequencyChartProps {
  history: Bet[];
  referenceDraw?: number[];
  lottery?: LotteryType;
}

export const FrequencyChart: React.FC<FrequencyChartProps> = ({ 
  history, 
  referenceDraw = [],
  lottery = 'megasena'
}) => {
  const isLotofacil = lottery === 'lotofacil';
  const isMaisMilionaria = lottery === 'maismilionaria';
  const maxNum = isLotofacil ? 25 : (isMaisMilionaria ? 50 : 60);
  const totalOfficialContests = isLotofacil
    ? TOTAL_LOTOFACIL_CONCURSOS
    : (isMaisMilionaria ? TOTAL_MAIS_MILIONARIA_CONCURSOS : TOTAL_OFFICIAL_CONCURSOS);

  const lotteryTitle = isLotofacil
    ? 'Lotofácil'
    : (isMaisMilionaria ? '+Milionária' : 'Mega-Sena');

  const sinceLabel = isLotofacil
    ? 'Desde Setembro/2003 até o mais recente'
    : (isMaisMilionaria ? 'Desde Maio/2022 até o mais recente' : 'Desde o 1º sorteio em 1996 até o mais recente');

  // Alternar entre Análise Oficial e Minhas Apostas
  const [dataSource, setDataSource] = useState<'official' | 'bets'>('official');
  // Filtro de exibição
  const [viewFilter, setViewFilter] = useState<'top10' | 'top20' | 'bottom10' | 'all'>('top10');

  // Dados calculados para as apostas do usuário
  const userBetsData = useMemo(() => {
    const counts: Record<number, number> = {};
    for (let i = 1; i <= maxNum; i++) counts[i] = 0;

    history.forEach(bet => {
      bet.numbers.forEach(n => {
        if (counts[n] !== undefined) counts[n]++;
      });
    });

    return Object.entries(counts).map(([numStr, count]) => {
      const num = parseInt(numStr, 10);
      return {
        number: num,
        name: num.toString().padStart(2, '0'),
        count,
        percentage: history.length > 0 ? Math.round((count / history.length) * 100) : 0,
        isDrawn: referenceDraw.includes(num),
        ranking: 0
      };
    });
  }, [history, referenceDraw, maxNum]);

  // Dados oficiais completos para a modalidade selecionada
  const officialData = useMemo(() => {
    if (isLotofacil) {
      const base = Object.entries(LOTOFACIL_FREQUENCY_DATA).map(([numStr, count]) => {
        const number = Number(numStr);
        return {
          number,
          name: number.toString().padStart(2, '0'),
          count,
          percentage: parseFloat(((count / TOTAL_LOTOFACIL_CONCURSOS) * 100).toFixed(1)),
          ranking: 0,
          isDrawn: referenceDraw.includes(number)
        };
      });
      const ranked = [...base].sort((a, b) => b.count - a.count);
      ranked.forEach((item, idx) => {
        const orig = base.find(b => b.number === item.number);
        if (orig) orig.ranking = idx + 1;
      });
      return base;
    }

    if (isMaisMilionaria) {
      return ALL_MAIS_MILIONARIA_STATS.map(stat => ({
        number: stat.number,
        name: stat.name,
        count: stat.drawCount,
        percentage: stat.frequencyPercentage,
        ranking: stat.ranking,
        isDrawn: referenceDraw.includes(stat.number)
      }));
    }

    return ALL_OFFICIAL_STATS.map(stat => ({
      number: stat.number,
      name: stat.name,
      count: stat.drawCount,
      percentage: stat.frequencyPercentage,
      ranking: stat.ranking,
      isDrawn: referenceDraw.includes(stat.number)
    }));
  }, [referenceDraw, isLotofacil, isMaisMilionaria]);

  // Resumo dos 4 cards oficiais
  const officialSummary = useMemo(() => {
    const sorted = [...officialData].sort((a, b) => b.count - a.count);
    const highest = sorted[0];
    const lowest = sorted[sorted.length - 1];
    const avgCount = Math.round(sorted.reduce((acc, s) => acc + s.count, 0) / (sorted.length || 1));

    if (isLotofacil) {
      return {
        topTitle: `${highest?.name || '20'}`,
        topSub: `${highest?.count.toLocaleString('pt-BR')} vezes (${highest?.percentage}% dos sorteios)`,
        lowTitle: `${lowest?.name || '06'}`,
        lowSub: `${lowest?.count.toLocaleString('pt-BR')} vezes (${lowest?.percentage}% dos sorteios)`,
        avgTitle: `${avgCount.toLocaleString('pt-BR')}x`,
        goldShare: '75,8%',
        goldRange: `Somas entre ${LOTOFACIL_HISTORICAL_METRICS.sumIdealMin} e ${LOTOFACIL_HISTORICAL_METRICS.sumIdealMax}`
      };
    }

    if (isMaisMilionaria) {
      return {
        topTitle: `${MAIS_MILIONARIA_HISTORICAL_METRICS.highestDrawn.number.toString().padStart(2, '0')}`,
        topSub: `${MAIS_MILIONARIA_HISTORICAL_METRICS.highestDrawn.count} vezes (${MAIS_MILIONARIA_HISTORICAL_METRICS.highestDrawn.percentage}% dos sorteios)`,
        lowTitle: `${MAIS_MILIONARIA_HISTORICAL_METRICS.lowestDrawn.number.toString().padStart(2, '0')}`,
        lowSub: `${MAIS_MILIONARIA_HISTORICAL_METRICS.lowestDrawn.count} vezes (${MAIS_MILIONARIA_HISTORICAL_METRICS.lowestDrawn.percentage}% dos sorteios)`,
        avgTitle: `${MAIS_MILIONARIA_HISTORICAL_METRICS.averageDrawsPerNumber}x`,
        goldShare: `${MAIS_MILIONARIA_HISTORICAL_METRICS.goldZoneSum.percentageOfAllDraws}%`,
        goldRange: `Somas entre ${MAIS_MILIONARIA_HISTORICAL_METRICS.goldZoneSum.min} e ${MAIS_MILIONARIA_HISTORICAL_METRICS.goldZoneSum.max}`
      };
    }

    return {
      topTitle: '10 e 53',
      topSub: '359 vezes cada (11,7% dos sorteios)',
      lowTitle: '26',
      lowSub: '258 vezes (8,4% dos sorteios)',
      avgTitle: '307x',
      goldShare: '78,4%',
      goldRange: 'Somas entre 160 e 240'
    };
  }, [officialData, isLotofacil, isMaisMilionaria]);

  // Seleciona o dataset ativo e aplica os filtros
  const chartData = useMemo(() => {
    if (dataSource === 'official') {
      const sortedByRank = [...officialData].sort((a, b) => a.ranking - b.ranking);
      if (viewFilter === 'top10') return sortedByRank.slice(0, 10);
      if (viewFilter === 'top20') return sortedByRank.slice(0, 20);
      if (viewFilter === 'bottom10') {
        return [...sortedByRank].slice(-10).reverse();
      }
      return [...officialData].sort((a, b) => a.number - b.number);
    } else {
      const sortedByCount = [...userBetsData].sort((a, b) => b.count - a.count);
      if (viewFilter === 'top10') return sortedByCount.slice(0, 10);
      if (viewFilter === 'top20') return sortedByCount.slice(0, 20);
      if (viewFilter === 'bottom10') {
        return [...sortedByCount].filter(i => i.count > 0).slice(-10);
      }
      return [...userBetsData].sort((a, b) => a.number - b.number);
    }
  }, [dataSource, viewFilter, officialData, userBetsData]);

  // Domínio dinâmico do eixo Y
  const yDomain: [number, number | 'auto'] = useMemo(() => {
    if (dataSource !== 'official' || chartData.length === 0) return [0, 'auto'];
    const minVal = Math.min(...chartData.map(d => d.count));
    const maxVal = Math.max(...chartData.map(d => d.count));
    if (viewFilter === 'all') {
      return [Math.max(0, Math.floor(minVal * 0.8)), Math.ceil(maxVal * 1.05)];
    }
    return [Math.max(0, Math.floor(minVal * 0.85)), Math.ceil(maxVal * 1.04)];
  }, [dataSource, viewFilter, chartData]);

  const primaryBadgeClass = isLotofacil
    ? 'bg-purple-100 text-purple-800'
    : (isMaisMilionaria ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800');
  const activeSwitchClass = isLotofacil
    ? 'bg-purple-700 text-white shadow-xs'
    : (isMaisMilionaria ? 'bg-amber-600 text-white shadow-xs' : 'bg-emerald-700 text-white shadow-xs');
  const activeFilterClass = isLotofacil
    ? 'bg-purple-600 text-white shadow-xs'
    : (isMaisMilionaria ? 'bg-amber-600 text-white shadow-xs' : 'bg-emerald-600 text-white shadow-xs');
  const barTop10Fill = isLotofacil ? '#7E22CE' : (isMaisMilionaria ? '#B45309' : '#047857');
  const barNormalFill = isLotofacil ? '#A855F7' : (isMaisMilionaria ? '#D97706' : '#10B981');

  return (
    <div className={`bg-white rounded-3xl border shadow-sm p-4 sm:p-6 md:p-7 space-y-6 ${
      isLotofacil ? 'border-purple-100' : (isMaisMilionaria ? 'border-amber-100' : 'border-emerald-100')
    }`}>
      {/* Topo do Card de Análise */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center space-x-2">
            <div className={`p-2 text-white rounded-2xl shadow-sm bg-gradient-to-br ${
              isLotofacil
                ? 'from-purple-600 to-fuchsia-700'
                : isMaisMilionaria
                ? 'from-amber-600 to-yellow-700'
                : 'from-emerald-600 to-teal-700'
            }`}>
              <Database size={20} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-black text-slate-950">
                  Frequência Individual de Dezenas • {lotteryTitle}
                </h3>
                <span className={`${primaryBadgeClass} text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase`}>
                  {totalOfficialContests.toLocaleString('pt-BR')} Concursos
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {dataSource === 'official' 
                  ? `Frequência de todas as ${maxNum} dezenas — ${sinceLabel}`
                  : `Frequência nas suas ${history.length} apostas registradas na ${lotteryTitle}`}
              </p>
            </div>
          </div>
        </div>

        {/* Chave seletora de Fonte de Dados */}
        <div className="flex flex-wrap items-center gap-2">
          <div className={`p-1 rounded-2xl flex items-center text-xs font-bold shadow-xs border ${
            isLotofacil
              ? 'bg-purple-50/80 border-purple-200/80'
              : isMaisMilionaria
              ? 'bg-amber-50/80 border-amber-200/80'
              : 'bg-emerald-50/80 border-emerald-200/80'
          }`}>
            <button
              type="button"
              onClick={() => setDataSource('official')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer ${
                dataSource === 'official' 
                  ? activeSwitchClass 
                  : 'text-slate-700 hover:bg-white/60'
              }`}
            >
              <Database size={14} />
              <span>TODOS OS RESULTADOS ({totalOfficialContests})</span>
            </button>

            <button
              type="button"
              onClick={() => setDataSource('bets')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer ${
                dataSource === 'bets' 
                  ? activeSwitchClass 
                  : 'text-slate-700 hover:bg-white/60'
              }`}
            >
              <BarChart3 size={14} />
              <span>MINHAS APOSTAS ({history.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Painel Informativo de Estatísticas Históricas Oficiais */}
      {dataSource === 'official' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Card 1: Mais sorteadas */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/60 border border-emerald-200">
            <div className="flex items-center justify-between text-emerald-800 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider">Mais Sorteada(s)</span>
              <Flame size={15} className="text-amber-500" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-emerald-950">{officialSummary.topTitle}</p>
            <p className="text-[11px] text-emerald-800 font-semibold mt-0.5">
              {officialSummary.topSub}
            </p>
          </div>

          {/* Card 2: Menos sorteada */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/40 border border-slate-200">
            <div className="flex items-center justify-between text-slate-700 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider">Menos Sorteada</span>
              <Snowflake size={15} className="text-blue-500" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900">{officialSummary.lowTitle}</p>
            <p className="text-[11px] text-slate-600 font-semibold mt-0.5">
              {officialSummary.lowSub}
            </p>
          </div>

          {/* Card 3: Média por dezena */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-50/80 to-yellow-50/50 border border-amber-200">
            <div className="flex items-center justify-between text-amber-800 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider">Média Histórica</span>
              <Award size={15} className="text-amber-600" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-amber-950">{officialSummary.avgTitle}</p>
            <p className="text-[11px] text-amber-800 font-semibold mt-0.5">
              Aparições médias por dezena
            </p>
          </div>

          {/* Card 4: Zona de Ouro */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-50/70 to-indigo-50/50 border border-purple-200">
            <div className="flex items-center justify-between text-purple-800 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider">Zona de Ouro</span>
              <TrendingUp size={15} className="text-purple-600" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-purple-950">{officialSummary.goldShare}</p>
            <p className="text-[11px] text-purple-800 font-semibold mt-0.5">
              {officialSummary.goldRange}
            </p>
          </div>
        </div>
      )}

      {/* Barra de Filtros de Visualização */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-1 text-xs font-bold text-slate-600 bg-slate-100 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setViewFilter('top10')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1 cursor-pointer ${
              viewFilter === 'top10' 
                ? activeFilterClass 
                : 'hover:text-slate-900'
            }`}
          >
            <Flame size={13} className={viewFilter === 'top10' ? 'text-amber-300' : 'text-amber-500'} />
            <span>Top 10 {dataSource === 'official' ? 'Mais Sorteadas' : 'Mais Jogadas'}</span>
          </button>

          <button
            type="button"
            onClick={() => setViewFilter('top20')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              viewFilter === 'top20' 
                ? activeFilterClass 
                : 'hover:text-slate-900'
            }`}
          >
            Top 20
          </button>

          <button
            type="button"
            onClick={() => setViewFilter('bottom10')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1 cursor-pointer ${
              viewFilter === 'bottom10' 
                ? activeFilterClass 
                : 'hover:text-slate-900'
            }`}
          >
            <Snowflake size={13} className={viewFilter === 'bottom10' ? 'text-blue-200' : 'text-blue-500'} />
            <span>10 Menos Sorteadas</span>
          </button>

          <button
            type="button"
            onClick={() => setViewFilter('all')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              viewFilter === 'all' 
                ? activeFilterClass 
                : 'hover:text-slate-900'
            }`}
          >
            Todas as {maxNum} Dezenas
          </button>
        </div>

        <div className="text-[11px] font-bold text-slate-500 flex items-center space-x-1.5">
          <Info size={14} className={isLotofacil ? 'text-purple-600' : (isMaisMilionaria ? 'text-amber-600' : 'text-emerald-600')} />
          <span>
            {dataSource === 'official' 
              ? `Dados consolidados da Caixa (${lotteryTitle})` 
              : `${history.length} apostas salvas nesta modalidade`}
          </span>
        </div>
      </div>

      {/* Gráfico de Barras Recharts */}
      <div className="h-72 sm:h-80 w-full pt-2 min-w-0 relative">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={280}>
          <BarChart 
            data={chartData} 
            margin={{ top: 15, right: 10, left: -10, bottom: 25 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis 
              dataKey="name" 
              tick={{ fill: '#334155', fontSize: viewFilter === 'all' && maxNum > 25 ? 9 : 12, fontWeight: 700 }}
              interval={viewFilter === 'all' && maxNum > 25 ? 2 : 0}
              tickLine={false}
              axisLine={{ stroke: '#CBD5E1' }}
            />
            <YAxis 
              allowDecimals={false}
              domain={yDomain}
              tick={{ fill: '#64748B', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip 
              cursor={{ fill: 'rgba(16, 185, 129, 0.08)' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl text-xs space-y-1.5 border border-slate-700 min-w-[210px]">
                      <div className="flex items-center justify-between gap-3 border-b border-slate-700/80 pb-1.5">
                        <span className="font-black text-emerald-400 text-sm">
                          Dezena {data.name}
                        </span>
                        {data.ranking > 0 && (
                          <span className="bg-emerald-800 text-emerald-200 font-extrabold text-[10px] px-2 py-0.5 rounded-full">
                            #{data.ranking}º Geral
                          </span>
                        )}
                      </div>

                      <div className="text-slate-200">
                        {dataSource === 'official' ? (
                          <>
                            Sorteada em: <strong className="text-white font-bold">{data.count.toLocaleString('pt-BR')} concursos</strong>
                            <div className="text-slate-400 text-[11px] mt-0.5">
                              Presente em <strong>{data.percentage}%</strong> de todos os {totalOfficialContests.toLocaleString('pt-BR')} sorteios
                            </div>
                          </>
                        ) : (
                          <>
                            Presente em: <strong className="text-white font-bold">{data.count} bilhetes</strong>
                            <div className="text-slate-400 text-[11px] mt-0.5">
                              {data.percentage}% das suas apostas salvas
                            </div>
                          </>
                        )}
                      </div>

                      {data.isDrawn && (
                        <div className="pt-1 flex items-center space-x-1.5 text-amber-300 font-bold text-[11px]">
                          <Award size={13} />
                          <span>Presente no Sorteio de Referência!</span>
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar 
              dataKey="count" 
              radius={[6, 6, 0, 0]}
              animationDuration={600}
            >
              {chartData.map((entry) => {
                if (entry.isDrawn) {
                  return <Cell key={`cell-${entry.number}`} fill="#F59E0B" />;
                }
                if (entry.ranking && entry.ranking <= 10) {
                  return <Cell key={`cell-${entry.number}`} fill={barTop10Fill} />;
                }
                if (entry.ranking && entry.ranking > maxNum - 10) {
                  return <Cell key={`cell-${entry.number}`} fill="#64748B" />;
                }
                return <Cell key={`cell-${entry.number}`} fill={barNormalFill} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legenda Explicativa */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 pt-3 border-t border-slate-100 gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-1.5">
            <span className="w-3.5 h-3.5 rounded-sm bg-amber-500 inline-block"></span>
            <span className="font-semibold text-slate-800">No Sorteio de Referência</span>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="w-3.5 h-3.5 rounded-sm inline-block" style={{ backgroundColor: barTop10Fill }}></span>
            <span>Top 10 Histórico Oficial</span>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="w-3.5 h-3.5 rounded-sm inline-block" style={{ backgroundColor: barNormalFill }}></span>
            <span>Frequência Média</span>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="w-3.5 h-3.5 rounded-sm bg-slate-500 inline-block"></span>
            <span>Menos Sorteadas / Frias</span>
          </div>
        </div>

        <span className="text-[11px] text-slate-400 font-medium">
          Fonte: Banco Oficial da Caixa ({lotteryTitle} • 1 a {totalOfficialContests.toLocaleString('pt-BR')})
        </span>
      </div>
    </div>
  );
};

export default FrequencyChart;
