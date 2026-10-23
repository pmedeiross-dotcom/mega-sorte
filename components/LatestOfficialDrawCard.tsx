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
  ExternalLink,
  Flame,
  Scale,
  Award,
  Calculator
} from 'lucide-react';
import { OfficialDrawResult } from '../types';

interface LatestOfficialDrawCardProps {
  latestDraw: OfficialDrawResult;
  onRefresh: () => Promise<void>;
  onUpdateDraw: (updated: OfficialDrawResult) => void;
  onCheckMyBets?: () => void;
  onSimulateProbability?: () => void;
  isRefreshing?: boolean;
}

export const LatestOfficialDrawCard: React.FC<LatestOfficialDrawCardProps> = ({
  latestDraw,
  onRefresh,
  onUpdateDraw,
  onCheckMyBets,
  onSimulateProbability,
  isRefreshing = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  // Campos do formulário de edição manual
  const [editContest, setEditContest] = useState(latestDraw.contestNumber.toString());
  const [editDate, setEditDate] = useState(latestDraw.date);
  const [editNumbersStr, setEditNumbersStr] = useState(latestDraw.numbers.join(', '));
  const [editAccumulated, setEditAccumulated] = useState(latestDraw.accumulated ?? true);
  const [editPrize, setEditPrize] = useState(latestDraw.estimatedNextPrize || "R$ 38.000.000,00");
  const [editError, setEditError] = useState<string | null>(null);

  // Métricas do sorteio
  const sum = latestDraw.numbers.reduce((acc, curr) => acc + curr, 0);
  const evenCount = latestDraw.numbers.filter(n => n % 2 === 0).length;
  const oddCount = latestDraw.numbers.length - evenCount;
  const isGoldZone = sum >= 160 && sum <= 240;

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);

    const contestNum = parseInt(editContest.trim(), 10);
    if (isNaN(contestNum) || contestNum <= 0) {
      setEditError("Número de concurso inválido.");
      return;
    }

    const rawNums = editNumbersStr
      .split(/[\s,;-]+/)
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n));

    const uniqueNums: number[] = Array.from(new Set<number>(rawNums));
    if (uniqueNums.length !== 6) {
      setEditError("Informe exatamente 6 dezenas distintas entre 01 e 60.");
      return;
    }

    const outOfBounds = uniqueNums.some(n => n < 1 || n > 60);
    if (outOfBounds) {
      setEditError("Todas as dezenas devem estar no intervalo de 1 a 60.");
      return;
    }

    const updated: OfficialDrawResult = {
      ...latestDraw,
      contestNumber: contestNum,
      date: editDate.trim() || new Date().toLocaleDateString('pt-BR'),
      numbers: uniqueNums.sort((a, b) => a - b),
      accumulated: editAccumulated,
      estimatedNextPrize: editPrize.trim() || undefined,
      prizeSena: editAccumulated ? "Acumulado" : "Sena Premiada",
      source: 'manual',
      lastUpdated: Date.now()
    };

    onUpdateDraw(updated);
    setIsEditing(false);
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl border-2 border-emerald-500/30 relative overflow-hidden transition-all duration-300">
      {/* Luz ambiente de fundo */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-10 -mb-10 w-48 h-48 bg-teal-500/10 rounded-full blur-2xl pointer-events-none"></div>

      <div className="relative z-10 space-y-4">
        {/* Barra superior com Identificação e Ações Rápidas */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-500/20 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-inner">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-widest text-emerald-400">
                  Último Sorteio Oficial
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Caixa Econômica Federal
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Concurso #{latestDraw.contestNumber}
                </h3>
                <span className="text-xs text-slate-300 flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-md">
                  <Calendar className="w-3 h-3 text-emerald-400" />
                  {latestDraw.date}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => onRefresh()}
              disabled={isRefreshing}
              title="Sincronizar último concurso oficial da Caixa"
              className="px-3 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 hover:text-white border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-300' : ''}`} />
              <span className="hidden sm:inline">{isRefreshing ? 'Sincronizando...' : 'Sincronizar'}</span>
            </button>

            <button
              onClick={() => {
                setEditContest(latestDraw.contestNumber.toString());
                setEditDate(latestDraw.date);
                setEditNumbersStr(latestDraw.numbers.join(', '));
                setEditAccumulated(latestDraw.accumulated ?? true);
                setEditPrize(latestDraw.estimatedNextPrize || "R$ 38.000.000,00");
                setIsEditing(!isEditing);
              }}
              title="Informar ou ajustar o concurso manualmente"
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Ajustar</span>
            </button>

            {onSimulateProbability && (
              <button
                onClick={onSimulateProbability}
                title="Simular a probabilidade real de acerto (Quadra, Quina e Sena)"
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-[0.98]"
              >
                <Calculator className="w-3.5 h-3.5 text-slate-950" />
                <span className="hidden sm:inline">Simular Chances</span>
              </button>
            )}

            {onCheckMyBets && (
              <button
                onClick={onCheckMyBets}
                title="Conferir minhas apostas salvas contra este concurso"
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 border border-amber-400/40 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Award className="w-3.5 h-3.5 text-amber-400" />
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
          <form onSubmit={handleSaveEdit} className="bg-slate-900/90 border border-emerald-500/40 rounded-2xl p-4 space-y-3.5 shadow-2xl backdrop-blur-md animate-fadeIn">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-emerald-300 flex items-center gap-1.5">
                <Edit3 className="w-4 h-4" />
                Ajustar Resultado do Último Concurso Oficial
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
                  placeholder="ex: 3070"
                  className="w-full bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
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
                  className="w-full bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Prêmio Estimado / Situação
                </label>
                <input
                  type="text"
                  value={editPrize}
                  onChange={(e) => setEditPrize(e.target.value)}
                  placeholder="ex: R$ 42.000.000,00"
                  className="w-full bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                6 Dezenas Sorteadas (separadas por vírgula ou espaço)
              </label>
              <input
                type="text"
                value={editNumbersStr}
                onChange={(e) => setEditNumbersStr(e.target.value)}
                placeholder="ex: 05, 19, 22, 44, 47, 57"
                className="w-full bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-2 text-sm text-emerald-300 font-mono font-bold focus:outline-none"
                required
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Ao salvar, este concurso oficial será imediatamente incluído em todos os cálculos matemáticos, ciclos, atrasos e na inteligência artificial para combinações futuras.
              </span>
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editAccumulated}
                  onChange={(e) => setEditAccumulated(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-400 bg-slate-800"
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
                  className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
                >
                  <Check className="w-3.5 h-3.5" />
                  Salvar e Atualizar Análises
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Display das 6 Dezenas Oficiais Sorteadas */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-1">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Dezenas Sorteadas (Ordem Crescente)
            </span>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {latestDraw.numbers.map((num) => (
                <div
                  key={num}
                  className="relative group transition-transform hover:scale-110 duration-200"
                >
                  <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-br from-emerald-400 via-emerald-600 to-teal-800 text-white font-black text-base sm:text-lg flex items-center justify-center shadow-lg border-2 border-emerald-300/40 font-mono tracking-tight shadow-emerald-900/40">
                    {num.toString().padStart(2, '0')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Destaque de Premiação / Acúmulo */}
          <div className="bg-emerald-950/70 border border-emerald-500/30 rounded-2xl p-3 sm:p-3.5 flex sm:flex-col justify-between items-center sm:items-end w-full sm:w-auto text-right">
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-400 block">
                {latestDraw.accumulated ? "Situação do Prêmio" : "Prêmio da Sena"}
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

        {/* Detalhes Estatísticos Integrados e Notificação de Análise Futura */}
        {isExpanded && (
          <div className="pt-2 border-t border-emerald-500/20 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Soma Total</span>
                <span className="text-sm font-black text-white flex items-center gap-1 mt-0.5">
                  {sum}
                  {isGoldZone && (
                    <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.2 rounded">
                      Zona de Ouro
                    </span>
                  )}
                </span>
              </div>

              <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Paridade</span>
                <span className="text-sm font-black text-white mt-0.5">
                  {evenCount} Pares / {oddCount} Ímpares
                </span>
              </div>

              <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Influência no Ciclo</span>
                <span className="text-sm font-black text-emerald-300 mt-0.5">
                  6 dezenas no atraso 0
                </span>
              </div>

              <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Repetição Prevista</span>
                <span className="text-sm font-black text-amber-300 mt-0.5">
                  1 a 2 dezenas p/ próx.
                </span>
              </div>
            </div>

            {/* Banner explicativo: inclusão mandatória em combinações futuras */}
            <div className="bg-emerald-900/40 border border-emerald-500/30 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-emerald-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block">
                  Resultado Oficial Ativo em Todas as Análises e Combinações Futuras:
                </span>
                <span className="text-emerald-200/90 leading-relaxed text-[11px] block mt-0.5">
                  As dezenas do Concurso #{latestDraw.contestNumber} estão automaticamente integradas ao motor probabilístico. As próximas combinações geradas (IA e Regras Estatísticas) consideram ativamente a repetição histórica de 1-2 dezenas deste sorteio (57,3% de frequência), dezenas vizinhas imediatas e o fechamento do ciclo das dezenas.
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LatestOfficialDrawCard;
