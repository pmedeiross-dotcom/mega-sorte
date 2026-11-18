import React, { useMemo, useState } from 'react';
import { Link2, Search, X, Copy, Check, AlertCircle } from 'lucide-react';
import { LotteryType, OfficialDrawResult } from '../types';

interface CompanionNumbersPanelProps {
  draws: Array<{ contest: number; date: string; numbers: number[] }>;
  lottery: LotteryType;
  maxNum: number;
  latestDraw?: OfficialDrawResult;
  numbersAnalysis?: Array<{ number: number; totalDraws: number; ranking?: number; status?: string }>;
  value: string;
  onChange: (value: string) => void;
}

interface CompanionResult {
  number: number;
  coCount: number;
  pctWithTarget: number;
  totalGlobalDraws: number;
  contests: number[];
}

export const CompanionNumbersPanel: React.FC<CompanionNumbersPanelProps> = ({
  draws,
  lottery,
  maxNum,
  latestDraw,
  numbersAnalysis = [],
  value,
  onChange,
}) => {
  const [copiedTop, setCopiedTop] = useState(false);

  const isLotofacil = lottery === 'lotofacil';
  const isMaisMilionaria = lottery === 'maismilionaria';

  const accentBadge = isLotofacil
    ? 'bg-purple-600 text-white'
    : isMaisMilionaria
    ? 'bg-amber-600 text-white'
    : 'bg-emerald-700 text-white';

  const accentBar = isLotofacil
    ? 'bg-purple-500'
    : isMaisMilionaria
    ? 'bg-amber-500'
    : 'bg-emerald-600';

  const accentBorder = isLotofacil
    ? 'border-purple-200 focus:ring-purple-500'
    : isMaisMilionaria
    ? 'border-amber-200 focus:ring-amber-500'
    : 'border-emerald-200 focus:ring-emerald-500';

  const parsedTarget = useMemo(() => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const n = parseInt(trimmed, 10);
    if (isNaN(n)) return null;
    return n;
  }, [value]);

  const isOutOfRange = parsedTarget !== null && (parsedTarget < 1 || parsedTarget > maxNum);
  const validTarget = parsedTarget !== null && !isOutOfRange ? parsedTarget : null;

  const globalDrawsMap = useMemo(() => {
    const map = new Map<number, number>();
    numbersAnalysis.forEach((item) => {
      map.set(item.number, item.totalDraws);
    });
    return map;
  }, [numbersAnalysis]);

  const uniqueDraws = useMemo(() => {
    const seen = new Set<number>();
    const list: Array<{ contest: number; date: string; numbers: number[] }> = [];
    draws.forEach((d) => {
      if (!d || typeof d.contest !== 'number' || seen.has(d.contest)) return;
      if (!Array.isArray(d.numbers) || d.numbers.length === 0) return;
      seen.add(d.contest);
      list.push(d);
    });
    return list;
  }, [draws]);

  const analysisResult = useMemo(() => {
    if (validTarget === null) return null;

    const matchingDraws = uniqueDraws.filter((d) => d.numbers.includes(validTarget));
    const targetAppearances = matchingDraws.length;

    const companionMap = new Map<number, { coCount: number; contests: number[] }>();
    matchingDraws.forEach((d) => {
      d.numbers.forEach((n) => {
        if (n === validTarget || n < 1 || n > maxNum) return;
        const entry = companionMap.get(n);
        if (entry) {
          entry.coCount += 1;
          entry.contests.push(d.contest);
        } else {
          companionMap.set(n, { coCount: 1, contests: [d.contest] });
        }
      });
    });

    const ranked: CompanionResult[] = Array.from(companionMap.entries())
      .map(([num, data]) => ({
        number: num,
        coCount: data.coCount,
        pctWithTarget:
          targetAppearances > 0
            ? parseFloat(((data.coCount / targetAppearances) * 100).toFixed(1))
            : 0,
        totalGlobalDraws: globalDrawsMap.get(num) || 0,
        contests: data.contests.sort((a, b) => b - a),
      }))
      .sort((a, b) => {
        if (b.coCount !== a.coCount) return b.coCount - a.coCount;
        if (b.totalGlobalDraws !== a.totalGlobalDraws) return b.totalGlobalDraws - a.totalGlobalDraws;
        return a.number - b.number;
      })
      .slice(0, 20);

    return {
      target: validTarget,
      targetAppearances,
      totalAnalyzedDraws: uniqueDraws.length,
      top20: ranked,
      maxCoCount: ranked[0]?.coCount || 1,
    };
  }, [validTarget, uniqueDraws, maxNum, globalDrawsMap]);

  const handleInputChange = (raw: string) => {
    const digitsOnly = raw.replace(/\D/g, '').slice(0, 2);
    onChange(digitsOnly);
  };

  const handleCopyTop20 = () => {
    if (!analysisResult || analysisResult.top20.length === 0) return;
    const text = analysisResult.top20
      .map((item) => item.number.toString().padStart(2, '0'))
      .join(' - ');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedTop(true);
    setTimeout(() => setCopiedTop(false), 2000);
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
      {/* Cabeçalho com Campo Inline de Busca */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shadow-xs ${accentBadge}`}>
              <Link2 size={18} />
            </div>
            <div>
              <label
                htmlFor="companion-number-input"
                className="text-sm sm:text-base font-black text-slate-950 block leading-tight"
              >
                Top 20 Dezenas que acompanham o número
              </label>
              <span className="text-[11px] text-slate-500">
                Digite uma dezena de 01 a {maxNum.toString().padStart(2, '0')} para ver os 20 números que mais saem juntos
              </span>
            </div>
          </div>

          {/* Caixa ao lado para digitar o número */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                id="companion-number-input"
                type="text"
                inputMode="numeric"
                value={value}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder={`01-${maxNum}`}
                aria-label="Número para consultar Top 20 dezenas acompanhantes"
                className={`w-28 pl-8 pr-7 py-2 bg-slate-50 border-2 rounded-xl text-sm font-black font-mono text-slate-900 text-center focus:outline-none focus:ring-2 transition-all ${accentBorder}`}
              />
              {value && (
                <button
                  type="button"
                  onClick={() => onChange('')}
                  title="Limpar número"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {analysisResult && analysisResult.top20.length > 0 && (
              <button
                type="button"
                onClick={handleCopyTop20}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedTop ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                <span>{copiedTop ? 'Copiado!' : 'Copiar Top 20'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Atalhos rápidos com dezenas do último sorteio */}
        {latestDraw && latestDraw.numbers.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-0.5">
              Último sorteio:
            </span>
            {latestDraw.numbers.slice(0, 6).map((num) => {
              const isSelected = validTarget === num;
              return (
                <button
                  key={`quick-comp-${num}`}
                  type="button"
                  onClick={() => onChange(num.toString().padStart(2, '0'))}
                  className={`px-2 py-1 rounded-lg text-xs font-black font-mono border transition-all cursor-pointer ${
                    isSelected
                      ? `${accentBadge} border-transparent shadow-xs`
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {num.toString().padStart(2, '0')}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Validação fora do intervalo */}
      {isOutOfRange && (
        <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-2">
          <AlertCircle size={15} className="text-amber-600 shrink-0" />
          <span>
            Informe um número válido entre <strong>01</strong> e <strong>{maxNum}</strong> para esta modalidade.
          </span>
        </div>
      )}

      {/* Lista com os Resultados Top 20 */}
      {analysisResult && (
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2.5 py-1 rounded-xl font-black font-mono text-xs ${accentBadge}`}>
                Dezena {analysisResult.target.toString().padStart(2, '0')}
              </span>
              <span className="text-slate-600 font-medium">
                Presente em <strong className="text-slate-900">{analysisResult.targetAppearances}</strong> de{' '}
                <strong className="text-slate-900">{analysisResult.totalAnalyzedDraws}</strong> concursos detalhados analisados
              </span>
            </div>

            {analysisResult.top20.length > 0 && (
              <span className="text-[11px] text-slate-500 font-semibold">
                Exibindo Top {analysisResult.top20.length} acompanhantes
              </span>
            )}
          </div>

          {analysisResult.targetAppearances === 0 || analysisResult.top20.length === 0 ? (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
              A dezena <strong>{analysisResult.target.toString().padStart(2, '0')}</strong> não apareceu nos{' '}
              {analysisResult.totalAnalyzedDraws} concursos detalhados carregados para esta loteria. Tente outro número ou clique em uma das dezenas do último sorteio acima.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {analysisResult.top20.map((item, idx) => {
                const barWidth = Math.max(10, Math.round((item.coCount / analysisResult.maxCoCount) * 100));
                const recentContestsPreview = item.contests
                  .slice(0, 3)
                  .map((c) => `#${c}`)
                  .join(', ');

                return (
                  <button
                    key={item.number}
                    type="button"
                    onClick={() => onChange(item.number.toString().padStart(2, '0'))}
                    title={`Clique para consultar as dezenas que acompanham o ${item.number.toString().padStart(2, '0')}`}
                    className="text-left p-3 rounded-2xl bg-slate-50/80 hover:bg-slate-100/80 border border-slate-200/90 transition-all space-y-2 cursor-pointer group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-black text-slate-400 w-6">
                          #{idx + 1}
                        </span>
                        <span className="w-8 h-8 rounded-xl bg-slate-900 group-hover:scale-105 transition-transform text-white font-black text-xs font-mono flex items-center justify-center shadow-2xs">
                          {item.number.toString().padStart(2, '0')}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black text-slate-900 block tabular-nums">
                          {item.coCount}x juntos
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700 tabular-nums">
                          {item.pctWithTarget}% das vezes
                        </span>
                      </div>
                    </div>

                    <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${accentBar} transition-all duration-300`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span className="truncate" title={`Concursos em comum: ${item.contests.map((c) => `#${c}`).join(', ')}`}>
                        Conc.: <strong className="text-slate-700">{recentContestsPreview}</strong>
                        {item.contests.length > 3 ? ` +${item.contests.length - 3}` : ''}
                      </span>
                      {item.totalGlobalDraws > 0 && (
                        <span className="shrink-0 ml-1 tabular-nums">
                          Geral: {item.totalGlobalDraws}x
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CompanionNumbersPanel;
