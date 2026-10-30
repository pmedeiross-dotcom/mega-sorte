import React, { useState } from 'react';
import { 
  Trophy, 
  RefreshCw, 
  Calendar, 
  CheckCircle2, 
  Edit3, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  X, 
  Award,
  Calculator,
  Clover
} from 'lucide-react';
import { OfficialDrawResult, LotteryType } from '../types';

interface LatestOfficialDrawCardProps {
  latestDraw: OfficialDrawResult;
  lottery?: LotteryType;
  onRefresh: () => Promise<void>;
  onUpdateDraw: (updated: OfficialDrawResult) => void;
  onCheckMyBets?: () => void;
  onSimulateProbability?: () => void;
  isRefreshing?: boolean;
}

export const LatestOfficialDrawCard: React.FC<LatestOfficialDrawCardProps> = ({
  latestDraw,
  lottery = 'megasena',
  onRefresh,
  onUpdateDraw,
  onCheckMyBets,
  onSimulateProbability,
  isRefreshing = false
}) => {
  const isMaisMilionaria = lottery === 'maismilionaria';
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  // Campos do formulário de edição manual
  const [editContest, setEditContest] = useState(latestDraw.contestNumber.toString());
  const [editDate, setEditDate] = useState(latestDraw.date);
  const [editNumbersStr, setEditNumbersStr] = useState(latestDraw.numbers.join(', '));
  const [editTrevosStr, setEditTrevosStr] = useState((latestDraw.trevos || [1, 2]).join(', '));
  const [editAccumulated, setEditAccumulated] = useState(latestDraw.accumulated ?? true);
  const [editPrize, setEditPrize] = useState(
    latestDraw.estimatedNextPrize || (isMaisMilionaria ? "R$ 10.000.000,00" : "R$ 38.000.000,00")
  );
  const [editError, setEditError] = useState<string | null>(null);

  // Métricas do sorteio
  const sum = latestDraw.numbers.reduce((acc, curr) => acc + curr, 0);
  const evenCount = latestDraw.numbers.filter(n => n % 2 === 0).length;
  const oddCount = latestDraw.numbers.length - evenCount;
  const isGoldZone = isMaisMilionaria ? (sum >= 120 && sum <= 185) : (sum >= 160 && sum <= 240);

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);

    const contestNum = parseInt(editContest.trim(), 10);
    if (isNaN(contestNum) || contestNum <= 0) {
      setEditError("Número de concurso inválido.");
      return;
    }

    const maxLimit = isMaisMilionaria ? 50 : 60;
    const rawNums = editNumbersStr
      .split(/[\s,;-]+/)
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n));

    const uniqueNums: number[] = Array.from(new Set<number>(rawNums));
    if (uniqueNums.length !== 6) {
      setEditError(`Informe exatamente 6 dezenas distintas entre 01 e ${maxLimit}.`);
      return;
    }

    const outOfBounds = uniqueNums.some(n => n < 1 || n > maxLimit);
    if (outOfBounds) {
      setEditError(`Todas as dezenas devem estar no intervalo de 1 a ${maxLimit}.`);
      return;
    }

    let parsedTrevos: number[] | undefined = undefined;
    if (isMaisMilionaria) {
      const rawTrevos = editTrevosStr
        .split(/[\s,;-]+/)
        .map(s => parseInt(s.trim(), 10))
        .filter(n => !isNaN(n));
      const uniqueTrevos = Array.from(new Set<number>(rawTrevos));
      if (uniqueTrevos.length !== 2 || uniqueTrevos.some(t => t < 1 || t > 6)) {
        setEditError("Informe exatamente 2 trevos distintos entre 1 e 6.");
        return;
      }
      parsedTrevos = uniqueTrevos.sort((a, b) => a - b);
    }

    const updated: OfficialDrawResult = {
      ...latestDraw,
      contestNumber: contestNum,
      date: editDate.trim() || new Date().toLocaleDateString('pt-BR'),
      numbers: uniqueNums.sort((a, b) => a - b),
      trevos: parsedTrevos,
      accumulated: editAccumulated,
      estimatedNextPrize: editPrize.trim() || undefined,
      prizeSena: editAccumulated ? "Acumulado" : (isMaisMilionaria ? "Faixa Principal Premiada" : "Sena Premiada"),
      source: 'manual',
      lastUpdated: Date.now(),
      lottery
    };

    onUpdateDraw(updated);
    setIsEditing(false);
  };

  return (
    <div className={`text-white rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden transition-all duration-300 border-2 ${
      isMaisMilionaria 
        ? 'bg-gradient-to-br from-slate-900 via-amber-950 to-slate-900 border-amber-500/40' 
        : 'bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 border-emerald-500/30'
    }`}>
      {/* Luz ambiente de fundo */}
      <div className={`absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 rounded-full blur-3xl pointer-events-none ${
        isMaisMilionaria ? 'bg-amber-500/15' : 'bg-emerald-500/10'
      }`}></div>
      <div className={`absolute bottom-0 left-10 -mb-10 w-48 h-48 rounded-full blur-2xl pointer-events-none ${
        isMaisMilionaria ? 'bg-yellow-500/10' : 'bg-teal-500/10'
      }`}></div>

      <div className="relative z-10 space-y-4">
        {/* Barra superior com Identificação e Ações Rápidas */}
        <div className={`flex flex-wrap items-center justify-between gap-3 border-b pb-3 ${
          isMaisMilionaria ? 'border-amber-500/20' : 'border-emerald-500/20'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shadow-inner border ${
              isMaisMilionaria 
                ? 'bg-amber-500/20 border-amber-400/40 text-amber-400' 
                : 'bg-emerald-500/20 border-emerald-400/40 text-emerald-400'
            }`}>
              {isMaisMilionaria ? <Clover className="w-5 h-5" /> : <Trophy className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-black uppercase tracking-widest ${
                  isMaisMilionaria ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  Último Sorteio Oficial Caixa
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  isMaisMilionaria
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                    isMaisMilionaria ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}></span>
                  {isMaisMilionaria ? '+Milionária' : 'Mega-Sena'}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Concurso #{latestDraw.contestNumber}
                </h3>
                <span className="text-xs text-slate-300 flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-md">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  {latestDraw.date}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => onRefresh()}
              disabled={isRefreshing}
              title="Sincronizar concurso oficial da Caixa"
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-xs ${
                isMaisMilionaria 
                  ? 'bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border-amber-500/40' 
                  : 'bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border-emerald-500/40'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>

            <button
              onClick={() => {
                setEditContest(latestDraw.contestNumber.toString());
                setEditDate(latestDraw.date);
                setEditNumbersStr(latestDraw.numbers.join(', '));
                if (latestDraw.trevos) {
                  setEditTrevosStr(latestDraw.trevos.join(', '));
                }
                setEditAccumulated(latestDraw.accumulated ?? true);
                setEditPrize(latestDraw.estimatedNextPrize || (isMaisMilionaria ? "R$ 10.000.000,00" : "R$ 38.000.000,00"));
                setIsEditing(!isEditing);
              }}
              title="Ajustar o concurso manualmente"
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ajustar</span>
            </button>

            {onSimulateProbability && (
              <button
                onClick={onSimulateProbability}
                title="Simular a probabilidade real de acerto"
                className={`px-3 py-1.5 rounded-xl text-slate-950 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-[0.98] ${
                  isMaisMilionaria 
                    ? 'bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300' 
                    : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400'
                }`}
              >
                <Calculator className="w-3.5 h-3.5 text-slate-950" />
                <span className="hidden sm:inline">Simular Chances</span>
              </button>
            )}

            {onCheckMyBets && (
              <button
                onClick={onCheckMyBets}
                title="Conferir minhas apostas salvas contra este concurso"
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs ${
                  isMaisMilionaria 
                    ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-400/40' 
                    : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-400/40'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Conferir Apostas</span>
              </button>
            )}

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title={isExpanded ? "Recolher detalhes" : "Expandir detalhes"}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Modal/Formulário de Edição Manual do Sorteio */}
        {isEditing && (
          <form onSubmit={handleSaveEdit} className="bg-slate-900/95 border border-amber-500/40 rounded-2xl p-4 space-y-3.5 shadow-2xl backdrop-blur-md animate-fadeIn">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-amber-300 flex items-center gap-1.5">
                <Edit3 className="w-4 h-4" />
                Ajustar Resultado Oficial ({isMaisMilionaria ? '+Milionária' : 'Mega-Sena'})
              </h4>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs">
                {editError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Nº Concurso
                </label>
                <input
                  type="number"
                  value={editContest}
                  onChange={(e) => setEditContest(e.target.value)}
                  placeholder="ex: 401"
                  className="w-full bg-slate-800 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Data do Sorteio
                </label>
                <input
                  type="text"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  placeholder="DD/MM/AAAA"
                  className="w-full bg-slate-800 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Prêmio Estimado
                </label>
                <input
                  type="text"
                  value={editPrize}
                  onChange={(e) => setEditPrize(e.target.value)}
                  placeholder="ex: R$ 10.000.000,00"
                  className="w-full bg-slate-800 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                6 Dezenas Sorteadas (01 a {isMaisMilionaria ? '50' : '60'}, separadas por vírgula ou espaço)
              </label>
              <input
                type="text"
                value={editNumbersStr}
                onChange={(e) => setEditNumbersStr(e.target.value)}
                placeholder="ex: 12, 14, 20, 26, 30, 44"
                className="w-full bg-slate-800 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none"
                required
              />
            </div>

            {isMaisMilionaria && (
              <div>
                <label className="text-[11px] font-bold text-amber-300 block mb-1">
                  2 Trevos Sorteados (1 a 6, separados por vírgula ou espaço)
                </label>
                <input
                  type="text"
                  value={editTrevosStr}
                  onChange={(e) => setEditTrevosStr(e.target.value)}
                  placeholder="ex: 1, 2"
                  className="w-full bg-slate-800 border border-amber-600 focus:border-amber-400 rounded-xl px-3 py-2 text-sm text-amber-200 font-mono focus:outline-none"
                  required
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editAccumulated}
                  onChange={(e) => setEditAccumulated(e.target.checked)}
                  className="rounded border-slate-700 text-amber-500 focus:ring-amber-400 bg-slate-800"
                />
                Acumulado para o próximo concurso
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
                >
                  <Check className="w-3.5 h-3.5" />
                  Salvar e Atualizar
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Display das Dezenas Sorteadas */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 py-1">
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Dezenas Sorteadas (Ordem Crescente)
            </span>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {latestDraw.numbers.map((num) => (
                <div
                  key={num}
                  className="relative group transition-transform hover:scale-110 duration-200"
                >
                  <div className={`w-11 h-11 sm:w-13 sm:h-13 rounded-2xl text-white font-black text-base sm:text-lg flex items-center justify-center shadow-lg border-2 font-mono tracking-tight ${
                    isMaisMilionaria 
                      ? 'bg-gradient-to-br from-amber-500 via-amber-600 to-yellow-800 border-amber-300/40 shadow-amber-950/50' 
                      : 'bg-gradient-to-br from-emerald-400 via-emerald-600 to-teal-800 border-emerald-300/40 shadow-emerald-900/40'
                  }`}>
                    {num.toString().padStart(2, '0')}
                  </div>
                </div>
              ))}

              {/* Se for +Milionária, exibe os 2 Trevos em Destaque */}
              {isMaisMilionaria && latestDraw.trevos && latestDraw.trevos.length > 0 && (
                <div className="flex items-center gap-1.5 ml-2 pl-3 border-l border-amber-500/30">
                  <span className="text-[10px] font-black uppercase text-amber-400 mr-1 hidden sm:inline">
                    Trevos:
                  </span>
                  {latestDraw.trevos.map(trevo => (
                    <div 
                      key={trevo}
                      title={`Trevo Oficial Sorteado ${trevo}`}
                      className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-700 text-white font-black text-base sm:text-lg flex items-center justify-center shadow-lg border-2 border-emerald-300/60 font-mono tracking-tight"
                    >
                      <span className="text-xs mr-0.5">🍀</span>{trevo}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Destaque de Premiação / Acúmulo */}
          <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-3 sm:p-3.5 flex sm:flex-col justify-between items-center sm:items-end w-full lg:w-auto text-right">
            <div>
              <span className={`text-[10px] uppercase font-bold block ${
                isMaisMilionaria ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {latestDraw.accumulated ? "Situação do Prêmio" : (isMaisMilionaria ? "Faixa Principal" : "Prêmio da Sena")}
              </span>
              <span className="text-base sm:text-lg font-black text-white">
                {latestDraw.accumulated ? "Acumulou!" : (latestDraw.prizeSena || "Premiado")}
              </span>
            </div>
            {latestDraw.estimatedNextPrize && (
              <div className="sm:mt-1">
                <span className="text-[10px] text-slate-400 block sm:hidden">Estimativa Próximo</span>
                <span className="text-xs font-bold text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                  {latestDraw.estimatedNextPrize}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Métricas Rápidas Expandidas */}
        {isExpanded && (
          <div className="pt-3 border-t border-slate-700/60 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-xs">
            <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Soma Total</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-base font-black text-white">{sum}</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded-sm font-bold ${
                  isGoldZone ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {isGoldZone ? (isMaisMilionaria ? 'Faixa Ouro (120-185)' : 'Faixa Ouro (160-240)') : 'Fora da Média'}
                </span>
              </div>
            </div>

            <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Pares / Ímpares</span>
              <span className="text-base font-black text-white mt-0.5 block">
                {evenCount}P / {oddCount}I
              </span>
            </div>

            <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Próximo Concurso</span>
              <span className="text-base font-black text-white mt-0.5 block">
                #{latestDraw.contestNumber + 1}
              </span>
            </div>

            <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Data Prevista</span>
              <span className="text-sm font-black text-slate-200 mt-0.5 block">
                {latestDraw.nextContestDate || 'Em breve'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LatestOfficialDrawCard;
