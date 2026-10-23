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
  Sparkles, 
  Hash, 
  Award, 
  Flame, 
  Snowflake, 
  Database, 
  Calendar,
  CheckCircle2,
  Info
} from 'lucide-react';
import { Bet } from '../types';
import { 
  TOTAL_OFFICIAL_CONCURSOS, 
  OFFICIAL_FREQUENCY_DATA, 
  ALL_OFFICIAL_STATS,
  TOP_10_HISTORICAL,
  BOTTOM_10_HISTORICAL,
  OFFICIAL_HISTORICAL_METRICS,
  getOfficialDrawCount
} from '../utils/megaSenaOfficialStats';

interface FrequencyChartProps {
  history: Bet[];
  referenceDraw?: number[];
}

export const FrequencyChart: React.FC<FrequencyChartProps> = ({ history, referenceDraw = [] }) => {
  // Alternar entre Análise Oficial da Mega-Sena (Padrão) e Minhas Apostas
  const [dataSource, setDataSource] = useState<'official' | 'bets'>('official');
  // Filtro de exibição
  const [viewFilter, setViewFilter] = useState<'top10' | 'top20' | 'bottom10' | 'all'>('top10');

  // Dados calculados para as apostas do usuário
  const userBetsData = useMemo(() => {
    const counts: Record<number, number> = {};
    for (let i = 1; i <= 60; i++) counts[i] = 0;

    history.forEach(bet => {
      bet.numbers.forEach(n => {
        if (counts[n] !== undefined) counts[n]++;
      });
    });

    const items = Object.entries(counts).map(([numStr, count]) => {
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

    return items;
  }, [history, referenceDraw]);

  // Dados oficiais completos
  const officialData = useMemo(() => {
    return ALL_OFFICIAL_STATS.map(stat => ({
      number: stat.number,
      name: stat.name,
      count: stat.drawCount,
      percentage: stat.frequencyPercentage,
      ranking: stat.ranking,
      isDrawn: referenceDraw.includes(stat.number),
      isTop10: stat.ranking <= 10,
      isBottom10: stat.ranking >= 51
    }));
  }, [referenceDraw]);

  // Seleciona o dataset ativo e aplica os filtros
  const chartData = useMemo(() => {
    if (dataSource === 'official') {
      const sortedByRank = [...officialData].sort((a, b) => a.ranking - b.ranking);
      if (viewFilter === 'top10') return sortedByRank.slice(0, 10);
      if (viewFilter === 'top20') return sortedByRank.slice(0, 20);
      if (viewFilter === 'bottom10') {
        return [...sortedByRank].slice(-10).reverse();
      }
      // 'all' ordenado de 01 a 60
      return [...officialData].sort((a, b) => a.number - b.number);
    } else {
      // Minhas apostas
      const sortedByCount = [...userBetsData].sort((a, b) => b.count - a.count);
      if (viewFilter === 'top10') return sortedByCount.slice(0, 10);
      if (viewFilter === 'top20') return sortedByCount.slice(0, 20);
      if (viewFilter === 'bottom10') {
        return [...sortedByCount].filter(i => i.count > 0).slice(-10);
      }
      return [...userBetsData].sort((a, b) => a.number - b.number);
    }
  }, [dataSource, viewFilter, officialData, userBetsData]);

  return (
    <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm p-4 sm:p-6 md:p-7 space-y-6">
      {/* Topo do Card de Análise */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl shadow-sm">
              <Database size={20} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-black text-emerald-950">
                  Análise Estatística da Mega-Sena
                </h3>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                  3.071 Concursos
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {dataSource === 'official' 
                  ? 'Frequência de todas as dezenas desde o 1º sorteio em 1996 até o mais recente'
                  : `Frequência de repetições nas suas ${history.length} apostas registradas`}
              </p>
            </div>
          </div>
        </div>

        {/* Chave seletora de Fonte de Dados */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-emerald-50/80 border border-emerald-200/80 p-1 rounded-2xl flex items-center text-xs font-bold shadow-xs">
            <button
              type="button"
              onClick={() => setDataSource('official')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1.5 ${
                dataSource === 'official' 
                  ? 'bg-emerald-700 text-white shadow-xs' 
                  : 'text-emerald-900 hover:bg-emerald-100/50'
              }`}
            >
              <Database size={14} />
              <span>TODOS OS RESULTADOS ({TOTAL_OFFICIAL_CONCURSOS})</span>
            </button>

            <button
              type="button"
              onClick={() => setDataSource('bets')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1.5 ${
                dataSource === 'bets' 
                  ? 'bg-emerald-700 text-white shadow-xs' 
                  : 'text-emerald-900 hover:bg-emerald-100/50'
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
              <span className="text-[10px] font-black uppercase tracking-wider">Mais Sorteadas</span>
              <Flame size={15} className="text-amber-500" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-emerald-950">10 e 53</p>
            <p className="text-[11px] text-emerald-800 font-semibold mt-0.5">
              359 vezes cada (11,7% dos sorteios)
            </p>
          </div>

          {/* Card 2: Menos sorteada */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/40 border border-slate-200">
            <div className="flex items-center justify-between text-slate-700 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider">Menos Sorteada</span>
              <Snowflake size={15} className="text-blue-500" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900">26</p>
            <p className="text-[11px] text-slate-600 font-semibold mt-0.5">
              258 vezes (8,4% dos sorteios)
            </p>
          </div>

          {/* Card 3: Média por dezena */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-50/80 to-yellow-50/50 border border-amber-200">
            <div className="flex items-center justify-between text-amber-800 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider">Média Histórica</span>
              <Award size={15} className="text-amber-600" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-amber-950">307x</p>
            <p className="text-[11px] text-amber-800 font-semibold mt-0.5">
              Aparições médias por dezena
            </p>
          </div>

          {/* Card 4: Zona de Ouro (Soma 160-240) */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-50/70 to-indigo-50/50 border border-purple-200">
            <div className="flex items-center justify-between text-purple-800 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider">Zona de Ouro</span>
              <TrendingUp size={15} className="text-purple-600" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-purple-950">78,4%</p>
            <p className="text-[11px] text-purple-800 font-semibold mt-0.5">
              Somas entre 160 e 240
            </p>
          </div>
        </div>
      )}

      {/* Barra de Filtros de Visualização */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-600 bg-slate-100 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setViewFilter('top10')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1 ${
              viewFilter === 'top10' 
                ? 'bg-emerald-600 text-white shadow-xs' 
                : 'hover:text-slate-900'
            }`}
          >
            <Flame size={13} className={viewFilter === 'top10' ? 'text-amber-300' : 'text-amber-500'} />
            <span>Top 10 {dataSource === 'official' ? 'Mais Sorteadas' : 'Mais Jogadas'}</span>
          </button>

          <button
            type="button"
            onClick={() => setViewFilter('top20')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              viewFilter === 'top20' 
                ? 'bg-emerald-600 text-white shadow-xs' 
                : 'hover:text-slate-900'
            }`}
          >
            Top 20
          </button>

          <button
            type="button"
            onClick={() => setViewFilter('bottom10')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1 ${
              viewFilter === 'bottom10' 
                ? 'bg-emerald-600 text-white shadow-xs' 
                : 'hover:text-slate-900'
            }`}
          >
            <Snowflake size={13} className={viewFilter === 'bottom10' ? 'text-blue-200' : 'text-blue-500'} />
            <span>10 Menos Sorteadas</span>
          </button>

          <button
            type="button"
            onClick={() => setViewFilter('all')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              viewFilter === 'all' 
                ? 'bg-emerald-600 text-white shadow-xs' 
                : 'hover:text-slate-900'
            }`}
          >
            Todas as 60 Dezenas
          </button>
        </div>

        <div className="text-[11px] font-bold text-slate-500 flex items-center space-x-1.5">
          <Info size={14} className="text-emerald-600" />
          <span>
            {dataSource === 'official' 
              ? 'Dados consolidados da história completa da Caixa' 
              : `${history.length} apostas salvas`}
          </span>
        </div>
      </div>

      {/* Gráfico de Barras Recharts */}
      <div className="h-72 sm:h-80 w-full pt-2 min-w-0 relative">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={280}>
          <BarChart 
            data={chartData} 
            margin={{ top: 15, right: 10, left: -15, bottom: 25 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis 
              dataKey="name" 
              tick={{ fill: '#334155', fontSize: viewFilter === 'all' ? 9 : 12, fontWeight: 700 }}
              interval={viewFilter === 'all' ? 2 : 0}
              tickLine={false}
              axisLine={{ stroke: '#CBD5E1' }}
            />
            <YAxis 
              allowDecimals={false}
              domain={dataSource === 'official' && viewFilter !== 'all' ? [200, 380] : [0, 'auto']}
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
                            Sorteada em: <strong className="text-white font-bold">{data.count} concursos</strong>
                            <div className="text-slate-400 text-[11px] mt-0.5">
                              Presente em <strong>{data.percentage}%</strong> de todos os 3.071 sorteios
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
              animationDuration={800}
            >
              {chartData.map((entry) => {
                // Se a dezena faz parte do sorteio de conferência atual
                if (entry.isDrawn) {
                  return <Cell key={`cell-${entry.number}`} fill="#F59E0B" />;
                }
                // Se estiver no top 10 histórico da Mega-Sena
                if (entry.ranking && entry.ranking <= 10) {
                  return <Cell key={`cell-${entry.number}`} fill="#047857" />;
                }
                // Se estiver entre as menos sorteadas da história
                if (entry.ranking && entry.ranking >= 51) {
                  return <Cell key={`cell-${entry.number}`} fill="#64748B" />;
                }
                return <Cell key={`cell-${entry.number}`} fill="#10B981" />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legenda Explicativa com Detalhamento das Cores */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 pt-3 border-t border-slate-100 gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-1.5">
            <span className="w-3.5 h-3.5 rounded-sm bg-amber-500 inline-block"></span>
            <span className="font-semibold text-slate-800">No Sorteio de Referência</span>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="w-3.5 h-3.5 rounded-sm bg-emerald-700 inline-block"></span>
            <span>Top 10 Histórico Oficial</span>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="w-3.5 h-3.5 rounded-sm bg-emerald-500 inline-block"></span>
            <span>Frequência Média</span>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="w-3.5 h-3.5 rounded-sm bg-slate-500 inline-block"></span>
            <span>Menos Sorteadas / Frias</span>
          </div>
        </div>

        <span className="text-[11px] text-slate-400 font-medium">
          Fonte: Banco Oficial de Sorteios da Caixa (Concursos 1 a 3.071)
        </span>
      </div>
    </div>
  );
};

export default FrequencyChart;
