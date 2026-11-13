import React, { useMemo, useState } from 'react';
import { BarChart3, Loader2, Play, RotateCcw } from 'lucide-react';
import { GeneratorLogic, LotteryType } from '../types';
import { generateGameWithRules } from '../utils/lotteryRules';
import { generateMaisMilionariaGameWithRules } from '../utils/maisMilionariaRules';
import { generateLotofacilWithRules } from '../utils/lotofacilRules';
import { RECENT_OFFICIAL_DRAWS, buildDrawsListWithLatest } from '../utils/megaSenaAdvancedAnalytics';
import { MAIS_MILIONARIA_OFFICIAL_DRAWS, buildMaisMilionariaDrawsListWithLatest } from '../utils/maisMilionariaAdvancedAnalytics';
import { buildLotofacilDrawsListWithLatest } from '../utils/lotofacilContestsData';

interface Draw { contest: number; date: string; numbers: number[]; trevos?: number[] }
interface BacktestResult extends Draw { bet: number[]; hits: number; trevosHits?: number }

interface Props { lottery: LotteryType }

const readCurrentRules = (): GeneratorLogic => {
  try {
    const stored = localStorage.getItem('mega_sorte_logic_v2');
    if (stored) return JSON.parse(stored) as GeneratorLogic;
  } catch { /* use safe defaults */ }
  return {
    repeat1to2: true, balanceEvenOdd: true, sum160to240: true,
    spreadDistribution: true, concentrate20to50: true, max2Consecutive: true,
    max2IdenticalEndings: true, preferHistoricalHotNumbers: true,
    useAdvancedDuques: true, frameAndCenterBalance: true,
    balancePrimesAndFibonacci: true, paretoTopSelection: true,
    includeCycleDezenas: true, multiplesOfThreeBalance: true,
    rowAndColDispersion: true, calculationStrategy: 'balanced', strictPlausibilityFilter: true
  };
};

const getArchivedDraws = (lottery: LotteryType): Draw[] => {
  if (lottery === 'lotofacil') return buildLotofacilDrawsListWithLatest().map(d => ({ contest: d.contest, date: d.date, numbers: d.numbers }));
  if (lottery === 'maismilionaria') return buildMaisMilionariaDrawsListWithLatest().map(d => ({ contest: d.contest, date: d.date, numbers: d.numbers, trevos: d.trevos }));
  return buildDrawsListWithLatest().map(d => ({ contest: d.contest, date: d.date, numbers: d.numbers }));
};

const BacktestingPanel: React.FC<Props> = ({ lottery }) => {
  const [fromContest, setFromContest] = useState<number | null>(null);
  const [toContest, setToContest] = useState<number | null>(null);
  const [results, setResults] = useState<BacktestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState('');

  const allDraws = useMemo(() => getArchivedDraws(lottery), [lottery]);
  // O sorteio-alvo não é usado como referência: só há aposta para ele quando
  // o concurso imediatamente anterior (número + 1) existe no arquivo.
  const eligibleDraws = useMemo(() => allDraws.filter(draw => allDraws.some(previous => previous.contest === draw.contest + 1)), [allDraws]);
  const maxContest = eligibleDraws[0]?.contest ?? 0;
  const minContest = eligibleDraws[eligibleDraws.length - 1]?.contest ?? 0;
  const resolvedFrom = fromContest ?? Math.max(minContest, maxContest - 9);
  const resolvedTo = toContest ?? maxContest;
  const accent = lottery === 'lotofacil' ? 'purple' : lottery === 'maismilionaria' ? 'amber' : 'emerald';
  const label = lottery === 'lotofacil' ? 'Lotofácil' : lottery === 'maismilionaria' ? '+Milionária' : 'Mega-Sena';

  const runBacktest = async () => {
    setError('');
    setResults([]);
    if (!eligibleDraws.length) {
      setError('Não há concursos consecutivos disponíveis no arquivo histórico desta modalidade.');
      return;
    }
    if (!Number.isInteger(resolvedFrom) || !Number.isInteger(resolvedTo) || resolvedFrom > resolvedTo) {
      setError('Informe um intervalo válido: o concurso inicial deve ser menor ou igual ao final.');
      return;
    }
    const selected = eligibleDraws
      .filter(draw => draw.contest >= resolvedFrom && draw.contest <= resolvedTo)
      .sort((a, b) => a.contest - b.contest)
      .slice(-50);
    if (!selected.length) {
      setError('Nenhum concurso do intervalo escolhido possui o sorteio anterior necessário no arquivo.');
      return;
    }

    setIsRunning(true);
    const rules = readCurrentRules();
    const quantity = lottery === 'lotofacil' ? 15 : 6;
    const completed: BacktestResult[] = [];
    try {
      for (const draw of selected) {
        const reference = allDraws.find(candidate => candidate.contest === draw.contest + 1)!;
        let bet: number[];
        let trevos: number[] | undefined;
        if (lottery === 'lotofacil') {
          bet = generateLotofacilWithRules(quantity, rules, reference.numbers).numbers;
        } else if (lottery === 'maismilionaria') {
          const generated = generateMaisMilionariaGameWithRules(quantity, rules, reference.numbers);
          bet = generated.numbers;
          trevos = generated.trevos;
        } else {
          bet = generateGameWithRules(quantity, rules, reference.numbers).numbers;
        }
        const drawnSet = new Set(draw.numbers);
        completed.push({
          ...draw,
          bet,
          hits: bet.filter(number => drawnSet.has(number)).length,
          ...(draw.trevos && trevos ? { trevosHits: trevos.filter(t => draw.trevos!.includes(t)).length } : {})
        });
        // Deixa o navegador atualizar o indicador de progresso entre concursos.
        await new Promise<void>(resolve => setTimeout(resolve, 0));
      }
      setResults(completed);
    } catch (e) {
      setError('Não foi possível concluir a simulação. Tente reduzir o intervalo.');
    } finally {
      setIsRunning(false);
    }
  };

  const averageHits = results.length ? results.reduce((sum, item) => sum + item.hits, 0) / results.length : 0;
  const prizes = results.filter(result => result.hits >= (lottery === 'lotofacil' ? 11 : 4)).length;

  return (
    <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className={`rounded-2xl bg-${accent}-100 p-2.5 text-${accent}-700`}><BarChart3 size={20} /></div>
        <div>
          <h3 className="text-lg font-black text-slate-900">Modo Backtesting • {label}</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">Gera um jogo para cada concurso, usando as regras salvas atualmente e somente o resultado do concurso imediatamente anterior como referência. A geração é aleatória; execuções diferentes podem produzir resultados diferentes.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
        <label className="space-y-1 text-xs font-bold text-slate-700">Concurso inicial
          <input type="number" min={minContest} max={maxContest} value={resolvedFrom} onChange={e => setFromContest(Number(e.target.value))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" />
        </label>
        <label className="space-y-1 text-xs font-bold text-slate-700">Concurso final
          <input type="number" min={minContest} max={maxContest} value={resolvedTo} onChange={e => setToContest(Number(e.target.value))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" />
        </label>
        <button type="button" onClick={runBacktest} disabled={isRunning || !eligibleDraws.length} className={`flex items-center justify-center gap-2 rounded-xl bg-${accent}-600 px-4 py-2.5 text-xs font-black text-white hover:bg-${accent}-700 disabled:cursor-not-allowed disabled:opacity-50`}>
          {isRunning ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}{isRunning ? 'Simulando...' : 'Executar'}
        </button>
        <button type="button" onClick={() => { setResults([]); setError(''); setFromContest(null); setToContest(null); }} disabled={isRunning} className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"><RotateCcw size={14} />Limpar</button>
      </div>
      <p className="text-[11px] text-slate-500">Arquivo disponível: concursos #{minContest} a #{maxContest}. Máximo de 50 concursos por execução. O resultado alvo nunca é usado para gerar a própria aposta.</p>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}

      {results.length > 0 && <>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center"><span className="text-[10px] font-bold uppercase text-slate-500">Concursos simulados</span><p className="text-2xl font-black text-slate-900">{results.length}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center"><span className="text-[10px] font-bold uppercase text-slate-500">Média de acertos</span><p className={`text-2xl font-black text-${accent}-700`}>{averageHits.toFixed(2)}</p></div>
          <div className="col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center sm:col-span-1"><span className="text-[10px] font-bold uppercase text-slate-500">Faixa premiada*</span><p className="text-2xl font-black text-emerald-700">{prizes}</p></div>
        </div>
        <div className="max-h-[34rem] overflow-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="sticky top-0 bg-slate-100 text-[10px] uppercase text-slate-600"><tr><th className="px-3 py-2.5">Concurso / Data</th><th className="px-3 py-2.5">Aposta gerada</th><th className="px-3 py-2.5">Resultado oficial</th><th className="px-3 py-2.5 text-center">Acertos</th></tr></thead>
            <tbody>{results.map(result => <tr key={result.contest} className="border-t border-slate-100">
              <td className="px-3 py-2 font-bold text-slate-700">#{result.contest}<span className="ml-1.5 font-normal text-slate-500">{result.date}</span></td>
              <td className="px-3 py-2 font-mono text-slate-700">{result.bet.map(n => n.toString().padStart(2, '0')).join(' · ')}</td>
              <td className="px-3 py-2 font-mono text-slate-500">{result.numbers.map(n => <span key={n} className={result.bet.includes(n) ? 'font-black text-emerald-700' : ''}>{n.toString().padStart(2, '0')} </span>)}{result.trevosHits !== undefined && <span className="block text-[10px]">Trevos: {result.trevosHits} acerto(s)</span>}</td>
              <td className="px-3 py-2 text-center"><span className={`inline-flex min-w-8 justify-center rounded-lg px-2 py-1 font-black ${result.hits >= (lottery === 'lotofacil' ? 11 : 4) ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>{result.hits}</span></td>
            </tr>)}</tbody>
          </table>
        </div>
        <p className="text-[10px] text-slate-500">* Considera 11+ acertos na Lotofácil e 4+ nas demais modalidades. A base histórica disponível pode não cobrir todos os concursos intermediários.</p>
      </>}
    </section>
  );
};

export default BacktestingPanel;
