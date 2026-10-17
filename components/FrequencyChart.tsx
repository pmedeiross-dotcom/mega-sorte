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
import { BarChart3, TrendingUp, Sparkles, AlertCircle, Hash, Award } from 'lucide-react';
import { Bet } from '../types';

interface FrequencyChartProps {
  history: Bet[];
  referenceDraw?: number[];
}

export const FrequencyChart: React.FC<FrequencyChartProps> = ({ history, referenceDraw = [] }) => {
  const [viewMode, setViewMode] = useState<'top10' | 'top20' | 'all'>('top10');

  // Calcular frequência de todas as 60 dezenas
  const frequencyData = useMemo(() => {
    const counts: Record<number, number> = {};
    for (let i = 1; i <= 60; i++) {
      counts[i] = 0;
    }

    let totalNumbersCounted = 0;
    history.forEach(bet => {
      bet.numbers.forEach(num => {
        if (counts[num] !== undefined) {
          counts[num] = (counts[num] || 0) + 1;
          totalNumbersCounted++;
        }
      });
    });

    const allItems = Object.entries(counts).map(([numStr, count]) => {
      const num = parseInt(numStr, 10);
      const percentage = history.length > 0 
        ? Math.round((count / history.length) * 100) 
        : 0;
      const isDrawn = referenceDraw.includes(num);

      return {
        number: num,
        name: num.toString().padStart(2, '0'),
        count,
        percentage,
        isDrawn
      };
    });

    // Ordenados por frequência decrescente
    const sortedByCount = [...allItems].sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.number - b.number;
    });

    return {
      allItems,
      sortedByCount,
      totalNumbersCounted,
      maxCount: Math.max(...allItems.map(i => i.count), 0)
    };
  }, [history, referenceDraw]);

  // Dados filtrados de acordo com o modo de visualização
  const chartData = useMemo(() => {
    if (viewMode === 'top10') {
      return frequencyData.sortedByCount.slice(0, 10);
    }
    if (viewMode === 'top20') {
      return frequencyData.sortedByCount.slice(0, 20);
    }
    // 'all' ordenado pelo número da dezena (1 a 60)
    return frequencyData.allItems;
  }, [frequencyData, viewMode]);

  // Se não houver apostas no histórico
  if (history.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-6 sm:p-8 text-center space-y-3">
        <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto">
          <BarChart3 size={24} />
        </div>
        <h4 className="text-sm font-black text-slate-800">Gráfico de Frequência das Dezenas</h4>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Você ainda não tem apostas registradas no histórico. Gere ou salve bilhetes para acompanhar as dezenas mais frequentes e suas taxas de aparição.
        </p>
      </div>
    );
  }

  const topNumber = frequencyData.sortedByCount[0];
  const uniqueNumbersUsed = frequencyData.allItems.filter(i => i.count > 0).length;

  return (
    <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm p-4 sm:p-6 space-y-5">
      {/* Cabeçalho do Card */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-xl">
              <BarChart3 size={18} />
            </div>
            <h3 className="text-base sm:text-lg font-black text-emerald-950">
              Frequência das Dezenas no Histórico
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Distribuição de repetições nas suas {history.length} {history.length === 1 ? 'aposta salva' : 'apostas salvas'}
          </p>
        </div>

        {/* Seletor de visualização */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
          <button
            type="button"
            onClick={() => setViewMode('top10')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              viewMode === 'top10' 
                ? 'bg-emerald-600 text-white shadow-xs' 
                : 'hover:text-slate-900'
            }`}
          >
            Top 10
          </button>
          <button
            type="button"
            onClick={() => setViewMode('top20')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              viewMode === 'top20' 
                ? 'bg-emerald-600 text-white shadow-xs' 
                : 'hover:text-slate-900'
            }`}
          >
            Top 20
          </button>
          <button
            type="button"
            onClick={() => setViewMode('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              viewMode === 'all' 
                ? 'bg-emerald-600 text-white shadow-xs' 
                : 'hover:text-slate-900'
            }`}
          >
            Todas (1–60)
          </button>
        </div>
      </div>

      {/* Mini Métricas Rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-emerald-50/70 border border-emerald-200/80 p-3 rounded-2xl flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-black flex items-center justify-center text-sm shadow-xs">
            {topNumber ? topNumber.name : '--'}
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Dezena Líder</span>
            <p className="text-xs font-black text-emerald-950">
              {topNumber?.count || 0}x ({topNumber?.percentage || 0}% dos jogos)
            </p>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 font-black flex items-center justify-center text-sm">
            <Hash size={18} />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Dezenas Únicas</span>
            <p className="text-xs font-black text-slate-800">
              {uniqueNumbersUsed} de 60 utilizadas
            </p>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-amber-50/70 border border-amber-200 p-3 rounded-2xl flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-400 text-amber-950 font-black flex items-center justify-center text-sm">
            <Award size={18} />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">No Sorteio Atual</span>
            <p className="text-xs font-black text-amber-950">
              {referenceDraw.length} dezenas no gabarito
            </p>
          </div>
        </div>
      </div>

      {/* Área do Gráfico Recharts */}
      <div className="h-64 sm:h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={chartData} 
            margin={{ top: 12, right: 10, left: -20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis 
              dataKey="name" 
              tick={{ fill: '#475569', fontSize: viewMode === 'all' ? 9 : 11, fontWeight: 700 }}
              interval={viewMode === 'all' ? 2 : 0}
              tickLine={false}
              axisLine={{ stroke: '#CBD5E1' }}
            />
            <YAxis 
              allowDecimals={false}
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
                    <div className="bg-slate-900 text-white px-3.5 py-2.5 rounded-2xl shadow-xl text-xs space-y-1 border border-slate-700">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-bold text-emerald-400 text-sm">
                          Dezena {data.name}
                        </span>
                        {data.isDrawn && (
                          <span className="bg-amber-400 text-amber-950 font-black text-[9px] px-1.5 py-0.5 rounded-full uppercase">
                            No Sorteio
                          </span>
                        )}
                      </div>
                      <div className="text-slate-300">
                        Aparece em: <strong className="text-white">{data.count}</strong> {data.count === 1 ? 'aposta' : 'apostas'}
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        Presença em {data.percentage}% do seu histórico
                      </div>
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
                // Se a dezena faz parte do sorteio de referência, destaca em dourado/âmbar
                if (entry.isDrawn) {
                  return <Cell key={`cell-${entry.number}`} fill="#F59E0B" />;
                }
                // Senão, graduação em esmeralda
                return <Cell key={`cell-${entry.number}`} fill="#059669" />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legenda do Gráfico */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 gap-2">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-emerald-600 inline-block"></span>
            <span>Dezena em apostas salvas</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-amber-500 inline-block"></span>
            <span className="font-medium text-slate-700">Coincide com o Concurso de Referência</span>
          </div>
        </div>

        <span className="text-[11px] text-slate-400">
          Atualizado em tempo real com cada aposta
        </span>
      </div>
    </div>
  );
};

export default FrequencyChart;
