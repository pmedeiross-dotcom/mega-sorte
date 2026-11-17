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
  TrendingUp,
  Database,
  BarChart3,
  Award,
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  Info,
  Layers
} from 'lucide-react';
import { Bet, LotteryType, OfficialDrawResult } from '../types';
import { OFFICIAL_HISTORICAL_METRICS, TOTAL_OFFICIAL_CONCURSOS } from '../utils/megaSenaOfficialStats';
import { MAIS_MILIONARIA_HISTORICAL_METRICS, TOTAL_MAIS_MILIONARIA_CONCURSOS } from '../utils/maisMilionariaOfficialStats';
import { LOTOFACIL_HISTORICAL_METRICS, TOTAL_LOTOFACIL_CONCURSOS } from '../utils/lotofacilOfficialStats';

interface SumDistributionChartProps {
  draws: Array<{ contest: number; date: string; numbers: number[] }>;
  history: Bet[];
  latestDraw?: OfficialDrawResult;
  lottery?: LotteryType;
}

interface SumBarDatum {
  key: string;
  label: string;
  sumValue: number;
  count: number;
  percentage: number;
  inGoldZone: boolean;
  isLatestDraw: boolean;
  contests: Array<{ contest: number; date: string }>;
}

const MEGA_CONSOLIDATED_BANDS = [
  { key: '< 120', label: '< 120', min: 0, max: 119, count: 184, percentage: 6.0, inGoldZone: false },
  { key: '120-159', label: '120–159', min: 120, max: 159, count: 479, percentage: 15.6, inGoldZone: false },
  { key: '160-200', label: '160–200', min: 160, max: 200, count: 1234, percentage: 40.2, inGoldZone: true },
  { key: '201-240', label: '201–240', min: 201, max: 240, count: 865, percentage: 28.2, inGoldZone: true },
  { key: '241-280', label: '241–280', min: 241, max: 280, count: 261, percentage: 8.5, inGoldZone: false },
  { key: '> 280', label: '> 280', min: 281, max: 999, count: 48, percentage: 1.5, inGoldZone: false }
];

export const SumDistributionChart: React.FC<SumDistributionChartProps> = ({
  draws,
  history,
  latestDraw,
  lottery = 'megasena'
}) => {
  const isLotofacil = lottery === 'lotofacil';
  const isMaisMilionaria = lottery === 'maismilionaria';

  const [sourceMode, setSourceMode] = useState<'exact_draws' | 'bands' | 'bets'>('exact_draws');

  const lotteryTitle = isLotofacil
    ? 'Lotofácil'
    : isMaisMilionaria
    ? '+Milionária'
    : 'Mega-Sena';

  const numbersPerDraw = isLotofacil ? 15 : 6;

  const goldRange = useMemo(() => {
    if (isLotofacil) {
      return {
        min: LOTOFACIL_HISTORICAL_METRICS.sumIdealMin,
        max: LOTOFACIL_HISTORICAL_METRICS.sumIdealMax,
        share: '75,8%'
      };
    }
    if (isMaisMilionaria) {
      return {
        min: MAIS_MILIONARIA_HISTORICAL_METRICS.goldZoneSum.min,
        max: MAIS_MILIONARIA_HISTORICAL_METRICS.goldZoneSum.max,
        share: `${MAIS_MILIONARIA_HISTORICAL_METRICS.goldZoneSum.percentageOfAllDraws}%`
      };
    }
    return {
      min: OFFICIAL_HISTORICAL_METRICS.goldZoneSum.min,
      max: OFFICIAL_HISTORICAL_METRICS.goldZoneSum.max,
      share: `${OFFICIAL_HISTORICAL_METRICS.goldZoneSum.percentageOfAllDraws}%`
    };
  }, [isLotofacil, isMaisMilionaria]);

  const totalOfficialContests = isLotofacil
    ? TOTAL_LOTOFACIL_CONCURSOS
    : isMaisMilionaria
    ? TOTAL_MAIS_MILIONARIA_CONCURSOS
    : TOTAL_OFFICIAL_CONCURSOS;

  const latestSum = useMemo(() => {
    if (!latestDraw?.numbers || latestDraw.numbers.length === 0) return null;
    return latestDraw.numbers.reduce((acc, n) => acc + n, 0);
  }, [latestDraw]);

  // Deduplica concursos e calcula a soma de cada sorteio histórico detalhado
  const detailedDrawsStats = useMemo(() => {
    const seen = new Set<number>();
    const entries: Array<{ contest: number; date: string; sum: number }> = [];

    draws.forEach((d) => {
      if (!d || typeof d.contest !== 'number' || seen.has(d.contest)) return;
      if (!Array.isArray(d.numbers) || d.numbers.length === 0) return;
      seen.add(d.contest);
      const sum = d.numbers.reduce((acc, n) => acc + Number(n), 0);
      entries.push({ contest: d.contest, date: d.date, sum });
    });

    const map = new Map<number, { sum: number; count: number; contests: Array<{ contest: number; date: string }> }>();
    entries.forEach((e) => {
      const current = map.get(e.sum);
      if (current) {
        current.count++;
        current.contests.push({ contest: e.contest, date: e.date });
      } else {
        map.set(e.sum, {
          sum: e.sum,
          count: 1,
          contests: [{ contest: e.contest, date: e.date }]
        });
      }
    });

    const total = Math.max(1, entries.length);
    const exactSeries: SumBarDatum[] = Array.from(map.values())
      .sort((a, b) => a.sum - b.sum) // Sempre da menor para a maior soma
      .map((item) => ({
        key: `sum-${item.sum}`,
        label: String(item.sum),
        sumValue: item.sum,
        count: item.count,
        percentage: parseFloat(((item.count / total) * 100).toFixed(1)),
        inGoldZone: item.sum >= goldRange.min && item.sum <= goldRange.max,
        isLatestDraw: latestSum !== null && item.sum === latestSum,
        contests: item.contests.sort((a, b) => b.contest - a.contest)
      }));

    const sortedSums = entries.map((e) => e.sum).sort((a, b) => a - b);
    const minEntry = entries.reduce(
      (best, cur) => (!best || cur.sum < best.sum ? cur : best),
      null as { contest: number; date: string; sum: number } | null
    );
    const maxEntry = entries.reduce(
      (best, cur) => (!best || cur.sum > best.sum ? cur : best),
      null as { contest: number; date: string; sum: number } | null
    );
    const avg =
      entries.length > 0
        ? parseFloat((entries.reduce((acc, e) => acc + e.sum, 0) / entries.length).toFixed(1))
        : 0;
    const median =
      sortedSums.length > 0
        ? sortedSums[Math.floor(sortedSums.length / 2)]
        : 0;

    return {
      totalDraws: entries.length,
      exactSeries,
      minEntry,
      maxEntry,
      avg,
      median,
      distinctSumsCount: exactSeries.length
    };
  }, [draws, goldRange.min, goldRange.max, latestSum]);

  // Faixas agrupadas (Mega-Sena usa o consolidado oficial dos 3.071 concursos; demais agrupam de 10 em 10)
  const bandsSeries: SumBarDatum[] = useMemo(() => {
    if (!isLotofacil && !isMaisMilionaria) {
      return MEGA_CONSOLIDATED_BANDS.map((band) => ({
        key: band.key,
        label: band.label,
        sumValue: band.min,
        count: band.count,
        percentage: band.percentage,
        inGoldZone: band.inGoldZone,
        isLatestDraw: latestSum !== null && latestSum >= band.min && latestSum <= band.max,
        contests: []
      }));
    }

    const step = 10;
    const bucketMap = new Map<number, { start: number; count: number; contests: Array<{ contest: number; date: string }> }>();
    draws.forEach((d) => {
      if (!Array.isArray(d.numbers) || d.numbers.length === 0) return;
      const sum = d.numbers.reduce((acc, n) => acc + Number(n), 0);
      const bucketStart = Math.floor(sum / step) * step;
      const cur = bucketMap.get(bucketStart);
      if (cur) {
        cur.count++;
        cur.contests.push({ contest: d.contest, date: d.date });
      } else {
        bucketMap.set(bucketStart, { start: bucketStart, count: 1, contests: [{ contest: d.contest, date: d.date }] });
      }
    });

    const total = Math.max(1, draws.length);
    return Array.from(bucketMap.values())
      .sort((a, b) => a.start - b.start)
      .map((b) => {
        const end = b.start + step - 1;
        return {
          key: `band-${b.start}`,
          label: `${b.start}–${end}`,
          sumValue: b.start,
          count: b.count,
          percentage: parseFloat(((b.count / total) * 100).toFixed(1)),
          inGoldZone: end >= goldRange.min && b.start <= goldRange.max,
          isLatestDraw: latestSum !== null && latestSum >= b.start && latestSum <= end,
          contests: b.contests.sort((a, b2) => b2.contest - a.contest)
        };
      });
  }, [draws, isLotofacil, isMaisMilionaria, goldRange.min, goldRange.max, latestSum]);

  // Somas exatas das apostas salvas do usuário (da menor para a maior)
  const userBetsSeries: SumBarDatum[] = useMemo(() => {
    const map = new Map<number, number>();
    history.forEach((b) => {
      const s = typeof b.sum === 'number' && !isNaN(b.sum)
        ? b.sum
        : b.numbers.reduce((acc, n) => acc + n, 0);
      map.set(s, (map.get(s) || 0) + 1);
    });

    const total = Math.max(1, history.length);
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([sumVal, count]) => ({
        key: `bet-sum-${sumVal}`,
        label: String(sumVal),
        sumValue: sumVal,
        count,
        percentage: parseFloat(((count / total) * 100).toFixed(1)),
        inGoldZone: sumVal >= goldRange.min && sumVal <= goldRange.max,
        isLatestDraw: latestSum !== null && sumVal === latestSum,
        contests: []
      }));
  }, [history, goldRange.min, goldRange.max, latestSum]);

  const activeData =
    sourceMode === 'bands'
      ? bandsSeries
      : sourceMode === 'bets'
      ? userBetsSeries
      : detailedDrawsStats.exactSeries;

  const primaryBadgeClass = isLotofacil
    ? 'bg-purple-100 text-purple-800'
    : isMaisMilionaria
    ? 'bg-amber-100 text-amber-800'
    : 'bg-emerald-100 text-emerald-800';
  const activeSwitchClass = isLotofacil
    ? 'bg-purple-700 text-white shadow-xs'
    : isMaisMilionaria
    ? 'bg-amber-600 text-white shadow-xs'
    : 'bg-emerald-700 text-white shadow-xs';
  const barGoldFill = isLotofacil ? '#7E22CE' : isMaisMilionaria ? '#B45309' : '#047857';
  const barNormalFill = isLotofacil ? '#A855F7' : isMaisMilionaria ? '#D97706' : '#10B981';

  // Largura mínima para manter as barras largas e legíveis quando há muitas somas distintas
  const minChartWidthPx = activeData.length > 26 ? activeData.length * 32 : 0;

  return (
    <div
      className={`bg-white rounded-3xl border shadow-sm p-4 sm:p-6 md:p-7 space-y-6 ${
        isLotofacil ? 'border-purple-100' : isMaisMilionaria ? 'border-amber-100' : 'border-emerald-100'
      }`}
    >
      {/* Cabeçalho do Gráfico */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center space-x-3">
          <div
            className={`p-2 text-white rounded-2xl shadow-sm bg-gradient-to-br ${
              isLotofacil
                ? 'from-purple-600 to-fuchsia-700'
                : isMaisMilionaria
                ? 'from-amber-600 to-yellow-700'
                : 'from-emerald-600 to-teal-700'
            }`}
          >
            <TrendingUp size={20} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-slate-950">
                Soma das {numbersPerDraw} Dezenas (Menor → Maior) • {lotteryTitle}
              </h3>
              <span className={`${primaryBadgeClass} text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase`}>
                {sourceMode === 'bands' && !isLotofacil && !isMaisMilionaria
                  ? `${totalOfficialContests.toLocaleString('pt-BR')} Concursos`
                  : sourceMode === 'bets'
                  ? `${history.length} Apostas`
                  : `${detailedDrawsStats.totalDraws} Sorteios Detalhados`}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {sourceMode === 'exact_draws'
                ? `Cada soma exata encontrada ordenada da menor (${detailedDrawsStats.minEntry?.sum ?? '-'}) para a maior (${detailedDrawsStats.maxEntry?.sum ?? '-'})`
                : sourceMode === 'bands' && !isLotofacil && !isMaisMilionaria
                ? `Distribuição consolidada oficial de todos os ${totalOfficialContests.toLocaleString('pt-BR')} concursos da Caixa por faixa de soma`
                : sourceMode === 'bands'
                ? `Somas agrupadas em faixas de 10 pontos da menor para a maior (${detailedDrawsStats.totalDraws} concursos)`
                : `Somas exatas das suas ${history.length} apostas salvas em ${lotteryTitle}`}
            </p>
          </div>
        </div>

        {/* Seletor de Visualização */}
        <div
          className={`p-1 rounded-2xl flex flex-wrap items-center gap-1 text-xs font-bold shadow-xs border ${
            isLotofacil
              ? 'bg-purple-50/80 border-purple-200/80'
              : isMaisMilionaria
              ? 'bg-amber-50/80 border-amber-200/80'
              : 'bg-emerald-50/80 border-emerald-200/80'
          }`}
        >
          <button
            type="button"
            onClick={() => setSourceMode('exact_draws')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer ${
              sourceMode === 'exact_draws' ? activeSwitchClass : 'text-slate-700 hover:bg-white/60'
            }`}
          >
            <Database size={14} />
            <span>SOMAS EXATAS ({detailedDrawsStats.totalDraws})</span>
          </button>

          <button
            type="button"
            onClick={() => setSourceMode('bands')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer ${
              sourceMode === 'bands' ? activeSwitchClass : 'text-slate-700 hover:bg-white/60'
            }`}
          >
            <Layers size={14} />
            <span>
              {!isLotofacil && !isMaisMilionaria
                ? `FAIXAS (${totalOfficialContests.toLocaleString('pt-BR')})`
                : 'FAIXAS (10 EM 10)'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSourceMode('bets')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer ${
              sourceMode === 'bets' ? activeSwitchClass : 'text-slate-700 hover:bg-white/60'
            }`}
          >
            <BarChart3 size={14} />
            <span>MINHAS APOSTAS ({history.length})</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/40 border border-slate-200">
          <div className="flex items-center justify-between text-slate-700 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Menor Soma</span>
            <ArrowDownWideNarrow size={15} className="text-blue-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900">
            {detailedDrawsStats.minEntry ? detailedDrawsStats.minEntry.sum : '-'}
          </p>
          <p className="text-[11px] text-slate-600 font-semibold mt-0.5">
            {detailedDrawsStats.minEntry
              ? `Concurso #${detailedDrawsStats.minEntry.contest} (${detailedDrawsStats.minEntry.date})`
              : 'Sem dados'}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/60 border border-emerald-200">
          <div className="flex items-center justify-between text-emerald-800 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Maior Soma</span>
            <ArrowUpWideNarrow size={15} className="text-emerald-600" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-950">
            {detailedDrawsStats.maxEntry ? detailedDrawsStats.maxEntry.sum : '-'}
          </p>
          <p className="text-[11px] text-emerald-800 font-semibold mt-0.5">
            {detailedDrawsStats.maxEntry
              ? `Concurso #${detailedDrawsStats.maxEntry.contest} (${detailedDrawsStats.maxEntry.date})`
              : 'Sem dados'}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-50/80 to-yellow-50/50 border border-amber-200">
          <div className="flex items-center justify-between text-amber-800 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Média / Mediana</span>
            <Award size={15} className="text-amber-600" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-950">
            {detailedDrawsStats.avg} / {detailedDrawsStats.median}
          </p>
          <p className="text-[11px] text-amber-800 font-semibold mt-0.5">
            {!isLotofacil && !isMaisMilionaria
              ? `Média oficial 3.071 conc.: ${OFFICIAL_HISTORICAL_METRICS.goldZoneSum.average}`
              : `${detailedDrawsStats.distinctSumsCount} somas distintas`}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-50/70 to-indigo-50/50 border border-purple-200">
          <div className="flex items-center justify-between text-purple-800 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Zona de Ouro</span>
            <TrendingUp size={15} className="text-purple-600" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-purple-950">{goldRange.share}</p>
          <p className="text-[11px] text-purple-800 font-semibold mt-0.5">
            Somas entre {goldRange.min} e {goldRange.max}
          </p>
        </div>
      </div>

      {/* Nota informativa transparente sobre a base exibida na Mega-Sena */}
      {!isLotofacil && !isMaisMilionaria && sourceMode === 'exact_draws' && (
        <div className="flex items-start gap-2 rounded-2xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-[11px] text-slate-600">
          <Info size={14} className="text-emerald-600 shrink-0 mt-0.5" />
          <span>
            Exibindo as somas exatas dos <strong>{detailedDrawsStats.totalDraws} concursos detalhados</strong> arquivados no aplicativo (ordenados da menor para a maior soma). Para ver a distribuição dos <strong>{totalOfficialContests.toLocaleString('pt-BR')} concursos históricos</strong> consolidados, clique em <strong>FAIXAS ({totalOfficialContests.toLocaleString('pt-BR')})</strong> acima.
          </span>
        </div>
      )}

      {/* Gráfico Recharts com scroll horizontal suave quando houver muitas somas */}
      {activeData.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-500 p-6 text-center">
          Nenhuma aposta registrada nesta modalidade para calcular a distribuição de somas.
        </div>
      ) : (
        <div className="w-full overflow-x-auto pb-1">
          <div
            className="h-72 sm:h-80 pt-2 min-w-0 relative"
            style={minChartWidthPx > 0 ? { minWidth: `${minChartWidthPx}px` } : undefined}
          >
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={280}>
              <BarChart
                data={activeData}
                margin={{ top: 15, right: 12, left: -12, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#334155', fontSize: 11, fontWeight: 700 }}
                  interval={0}
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
                      const data = payload[0].payload as SumBarDatum;
                      return (
                        <div className="bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl text-xs space-y-1.5 border border-slate-700 min-w-[220px]">
                          <div className="flex items-center justify-between gap-3 border-b border-slate-700/80 pb-1.5">
                            <span className="font-black text-emerald-400 text-sm">
                              {sourceMode === 'bands' ? `Faixa ${data.label}` : `Soma ${data.label}`}
                            </span>
                            {data.inGoldZone && (
                              <span className="bg-emerald-800 text-emerald-200 font-extrabold text-[10px] px-2 py-0.5 rounded-full">
                                Zona de Ouro
                              </span>
                            )}
                          </div>

                          <div className="text-slate-200">
                            Ocorrências: <strong className="text-white font-bold">{data.count.toLocaleString('pt-BR')}x</strong>
                            <span className="text-slate-400 ml-1.5">({data.percentage}%)</span>
                          </div>

                          {data.contests.length > 0 && (
                            <div className="text-[11px] text-slate-300 pt-0.5">
                              <span className="text-slate-400">Concursos: </span>
                              {data.contests
                                .slice(0, 6)
                                .map((c) => `#${c.contest}`)
                                .join(', ')}
                              {data.contests.length > 6 ? ` (+${data.contests.length - 6})` : ''}
                            </div>
                          )}

                          {data.isLatestDraw && (
                            <div className="pt-1 flex items-center space-x-1.5 text-amber-300 font-bold text-[11px]">
                              <Award size={13} />
                              <span>Soma do Último Sorteio de Referência ({latestSum})!</span>
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
                  {activeData.map((entry) => {
                    if (entry.isLatestDraw) {
                      return <Cell key={entry.key} fill="#F59E0B" />;
                    }
                    if (entry.inGoldZone) {
                      return <Cell key={entry.key} fill={barGoldFill} />;
                    }
                    return <Cell key={entry.key} fill={barNormalFill} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Legenda */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 pt-3 border-t border-slate-100 gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-1.5">
            <span className="w-3.5 h-3.5 rounded-sm bg-amber-500 inline-block"></span>
            <span className="font-semibold text-slate-800">
              Soma do Último Sorteio{latestSum !== null ? ` (${latestSum})` : ''}
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="w-3.5 h-3.5 rounded-sm inline-block" style={{ backgroundColor: barGoldFill }}></span>
            <span>Zona de Ouro ({goldRange.min} a {goldRange.max})</span>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="w-3.5 h-3.5 rounded-sm inline-block" style={{ backgroundColor: barNormalFill }}></span>
            <span>Demais Somas Históricas</span>
          </div>
        </div>

        <span className="text-[11px] text-slate-400 font-medium">
          Ordenação: Menor para Maior Soma ({lotteryTitle})
        </span>
      </div>
    </div>
  );
};

export default SumDistributionChart;
