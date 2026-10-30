import React, { useMemo, useState } from 'react';
import { 
  ArrowRight, 
  Layers, 
  Flame, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  BarChart2, 
  Hash,
  ShieldAlert,
  Search
} from 'lucide-react';
import { computeSequenceAnalytics, findConsecutiveGroups } from '../utils/sequenceAnalytics';
import { offlineCacheManager } from '../services/offlineCacheManager';
import { OfficialDrawResult, LotteryType } from '../types';

interface SequenceAnalyticsViewProps {
  latestDraw?: OfficialDrawResult;
  lottery?: LotteryType;
}

export const SequenceAnalyticsView: React.FC<SequenceAnalyticsViewProps> = ({
  latestDraw,
  lottery = 'megasena'
}) => {
  const activeLottery: LotteryType = (lottery as LotteryType) || 'megasena';
  const isMaisMilionaria = activeLottery === 'maismilionaria';
  const analytics = useMemo(() => {
    return offlineCacheManager.getOrComputeSequenceAnalytics(activeLottery, latestDraw);
  }, [activeLottery, latestDraw]);

  // Simulador/Testador interativo de sequência
  const [testInput, setTestInput] = useState('');
  const testResult = useMemo(() => {
    if (!testInput.trim()) return null;
    const nums: number[] = testInput
      .split(/[\s,;-]+/)
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n) && n >= 1 && n <= (isMaisMilionaria ? 50 : 60));
    
    const unique: number[] = (Array.from(new Set<number>(nums)) as number[]).sort((a: number, b: number) => a - b);
    if (unique.length < 2) return null;

    const groups = findConsecutiveGroups(unique);
    return {
      numbers: unique,
      groups,
      hasConsecutive: groups.length > 0,
      isExtreme: groups.some(g => g.length >= 3) || groups.length >= 2
    };
  }, [testInput, isMaisMilionaria]);

  return (
    <div className="space-y-6">
      {/* Banner Principal */}
      <div className={`text-white rounded-3xl p-5 sm:p-7 shadow-lg relative overflow-hidden border ${
        isMaisMilionaria 
          ? 'bg-gradient-to-r from-amber-950 via-yellow-950 to-slate-900 border-amber-800' 
          : 'bg-gradient-to-r from-slate-900 via-teal-950 to-emerald-950 border-emerald-800'
      }`}>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                isMaisMilionaria 
                  ? 'bg-amber-500/20 text-amber-300 border-amber-400/30' 
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
              }`}>
                Padrões de Vizinhança Numérica
              </span>
              <span className="text-xs text-slate-300">
                Base Histórica: {analytics.totalContests} Concursos Oficiais
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1 tracking-tight flex items-center gap-2">
              <ArrowRight size={24} className={isMaisMilionaria ? 'text-amber-400' : 'text-emerald-400'} />
              <span>Painel Histórico de Sequências Numéricas Consecutivas</span>
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl mt-1 leading-relaxed">
              Descubra a frequência exata de dezenas seguidas (como 14-15 ou 22-23-24) em toda a história oficial da Caixa, o ranking das duplas vizinhas mais premiadas e a regra de ouro das sequências.
            </p>
          </div>

          {/* Destaque do Último Concurso */}
          <div className="bg-white/10 p-3.5 rounded-2xl border border-white/10 text-right backdrop-blur-xs">
            <span className="text-[10px] uppercase font-bold text-slate-300 block">
              Último Concurso #{analytics.latestContestSequences.contestNumber}
            </span>
            <div className="text-xs font-black text-white mt-1">
              {analytics.latestContestSequences.hasConsecutive ? (
                <span className="text-amber-300 flex items-center gap-1 justify-end">
                  <span>Sequência:</span>
                  {analytics.latestContestSequences.groups.map(g => `[${g.map(n => n.toString().padStart(2, '0')).join('-')}]`).join(', ')}
                </span>
              ) : (
                <span className="text-emerald-300">Sem Sequências (Dezenas Isoladas)</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Regra de Ouro */}
      <div className={`p-4 sm:p-5 rounded-3xl border flex items-start gap-3.5 ${
        isMaisMilionaria 
          ? 'bg-amber-50 border-amber-200 text-amber-950' 
          : 'bg-emerald-50 border-emerald-200 text-emerald-950'
      }`}>
        <div className="p-2 rounded-2xl bg-white shadow-xs">
          <ShieldAlert className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h4 className="text-sm font-black">Regra de Ouro Matemática das Sequências:</h4>
          <p className="text-xs mt-0.5 leading-relaxed opacity-90">{analytics.goldenRule}</p>
        </div>
      </div>

      {/* Grid: Distribuição dos Padrões de Sequência */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <BarChart2 size={18} className={isMaisMilionaria ? 'text-amber-600' : 'text-emerald-600'} />
              <span>Frequência Histórica por Tipo de Sequência</span>
            </h3>
            <p className="text-xs text-slate-500">
              Proporção de concursos com zero, uma dupla, duas duplas ou trincas consecutivas
            </p>
          </div>

          <div className="space-y-3.5">
            {analytics.patterns.map(pat => (
              <div key={pat.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-black text-slate-800">{pat.name}</span>
                  <span className={`font-extrabold ${isMaisMilionaria ? 'text-amber-800' : 'text-emerald-800'}`}>
                    {pat.percentage}% ({pat.occurrences}x)
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      pat.percentage >= 40 
                        ? (isMaisMilionaria ? 'bg-amber-600' : 'bg-emerald-600') 
                        : pat.percentage >= 5 
                        ? 'bg-teal-500' 
                        : 'bg-slate-400'
                    }`}
                    style={{ width: `${Math.min(100, pat.percentage * 1.8)}%` }}
                  ></div>
                </div>
                <p className="text-[11px] text-slate-500">{pat.description}</p>

                {pat.matchedInLatest?.isMatch && (
                  <div className="mt-2 p-2 rounded-xl bg-amber-100/80 border border-amber-300 text-xs flex items-center gap-1.5 text-amber-950 font-semibold">
                    <CheckCircle2 size={14} className="text-amber-600 shrink-0" />
                    <span>🎯 Padrão ocorrido no último sorteio (#{analytics.latestContestSequences.contestNumber})</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Top 15 Duplas Consecutivas Mais Sorteadas na História */}
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Flame size={18} className="text-red-500" />
              <span>Top 15 Duplas Vizinhas mais Frequentes</span>
            </h3>
            <p className="text-xs text-slate-500">
              Pares consecutivos que mais saíram juntos nos {analytics.totalContests} concursos oficiais
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {analytics.topConsecutivePairs.map((pair, idx) => (
              <div 
                key={pair.name}
                className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 font-mono w-4">#{idx + 1}</span>
                  <span className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 font-mono font-black text-slate-900 shadow-2xs">
                    {pair.name}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-emerald-800 block">{pair.occurrences}x</span>
                  <span className="text-[9px] text-slate-400">Conc. #{pair.lastContestSeen}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Verificador Interativo de Sequências */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Search size={18} className="text-slate-600" />
            <span>Testador Rápido de Sequência do Seu Jogo</span>
          </h3>
          <p className="text-xs text-slate-500">
            Digite dezenas separadas por vírgula ou espaço para verificar instantaneamente a presença e a intensidade de números consecutivos.
          </p>
        </div>

        <div className="max-w-xl">
          <input
            type="text"
            value={testInput}
            onChange={e => setTestInput(e.target.value)}
            placeholder={`ex: 12, 13, 25, 34, 35, 48`}
            className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-500 rounded-2xl px-4 py-2.5 text-sm font-mono focus:outline-none"
          />
        </div>

        {testResult && (
          <div className={`p-4 rounded-2xl border text-xs space-y-2 ${
            testResult.isExtreme 
              ? 'bg-rose-50 border-rose-200 text-rose-950' 
              : testResult.hasConsecutive 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950' 
              : 'bg-slate-50 border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center gap-2 font-black text-sm">
              {testResult.isExtreme ? (
                <>
                  <AlertCircle size={16} className="text-rose-600" />
                  <span>Sequência Extrema / Rara Detectada</span>
                </>
              ) : testResult.hasConsecutive ? (
                <>
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>Padrão Consecutivo Balanceado (1 Dupla)</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} className="text-slate-700" />
                  <span>Dezenas Isoladas (Sem Sequência) - Padrão Ideal</span>
                </>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 items-center">
              <span>Dezenas analisadas:</span>
              {testResult.numbers.map(n => (
                <span key={n} className="px-2 py-0.5 rounded-md bg-white border border-slate-300 font-mono font-bold">
                  {n.toString().padStart(2, '0')}
                </span>
              ))}
            </div>

            {testResult.hasConsecutive && (
              <div className="pt-1 text-[11px]">
                <strong>Grupos consecutivos encontrados:</strong>{' '}
                {testResult.groups.map(g => `[${g.map(n => n.toString().padStart(2, '0')).join('-')}]`).join(', ')}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SequenceAnalyticsView;
