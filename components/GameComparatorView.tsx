import React, { useState, useMemo } from 'react';
import { 
  GitCompare, 
  Layers, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRightLeft, 
  Plus, 
  Trash2, 
  Info, 
  Percent, 
  ShieldCheck,
  TrendingUp,
  SlidersHorizontal
} from 'lucide-react';
import { Bet, LotteryType } from '../types';
import NumberBall from './NumberBall';

interface GameComparatorViewProps {
  savedBets: Bet[];
  lottery?: LotteryType;
  onAddBet?: (numbers: number[], type: 'ai' | 'smart_rules' | 'manual', reasoning?: string) => void;
  onGoToGenerator?: () => void;
}

export const GameComparatorView: React.FC<GameComparatorViewProps> = ({
  savedBets,
  lottery = 'megasena',
  onAddBet,
  onGoToGenerator
}) => {
  const isMaisMilionaria = lottery === 'maismilionaria';
  const maxLimit = isMaisMilionaria ? 50 : 60;

  // IDs dos jogos selecionados para comparar (máximo 4)
  const [selectedBetIds, setSelectedBetIds] = useState<string[]>(() => {
    return savedBets.slice(0, 2).map(b => b.id);
  });

  const selectedBets = useMemo(() => {
    return selectedBetIds
      .map(id => savedBets.find(b => b.id === id))
      .filter((b): b is Bet => !!b);
  }, [selectedBetIds, savedBets]);

  const toggleSelectBet = (id: string) => {
    if (selectedBetIds.includes(id)) {
      if (selectedBetIds.length > 2) {
        setSelectedBetIds(prev => prev.filter(item => item !== id));
      }
    } else {
      if (selectedBetIds.length < 4) {
        setSelectedBetIds(prev => [...prev, id]);
      } else {
        // Substitui o último
        setSelectedBetIds(prev => [...prev.slice(1), id]);
      }
    }
  };

  // 1. Dezenas em comum a TODOS os jogos selecionados
  const commonNumbers = useMemo(() => {
    if (selectedBets.length < 2) return [];
    let common = new Set<number>(selectedBets[0].numbers);
    for (let i = 1; i < selectedBets.length; i++) {
      const currentSet = new Set<number>(selectedBets[i].numbers);
      common = new Set<number>([...common].filter(n => currentSet.has(n)));
    }
    return (Array.from(common) as number[]).sort((a: number, b: number) => a - b);
  }, [selectedBets]);

  // 2. Cobertura Conjunta de Todas as Dezenas
  const unionNumbers = useMemo(() => {
    const union = new Set<number>();
    selectedBets.forEach(b => b.numbers.forEach(n => union.add(n)));
    return (Array.from(union) as number[]).sort((a: number, b: number) => a - b);
  }, [selectedBets]);

  // 3. Similaridade par a par (Índice de Jaccard e colisão)
  const pairwiseStats = useMemo(() => {
    if (selectedBets.length < 2) return [];
    const stats: Array<{
      gameAIndex: number;
      gameBIndex: number;
      gameAId: string;
      gameBId: string;
      common: number[];
      jaccardPercent: number;
      collisionLevel: 'baixa' | 'moderada' | 'alta';
    }> = [];

    for (let i = 0; i < selectedBets.length; i++) {
      for (let j = i + 1; j < selectedBets.length; j++) {
        const setA = new Set(selectedBets[i].numbers);
        const setB = new Set(selectedBets[j].numbers);
        const common = selectedBets[i].numbers.filter(n => setB.has(n));
        const unionSize = new Set([...selectedBets[i].numbers, ...selectedBets[j].numbers]).size;
        const jaccard = unionSize > 0 ? (common.length / unionSize) * 100 : 0;

        let collisionLevel: 'baixa' | 'moderada' | 'alta' = 'baixa';
        if (common.length >= 4) collisionLevel = 'alta';
        else if (common.length >= 2) collisionLevel = 'moderada';

        stats.push({
          gameAIndex: i + 1,
          gameBIndex: j + 1,
          gameAId: selectedBets[i].id,
          gameBId: selectedBets[j].id,
          common,
          jaccardPercent: +jaccard.toFixed(1),
          collisionLevel
        });
      }
    }
    return stats;
  }, [selectedBets]);

  // Veredito Geral
  const verdict = useMemo(() => {
    if (selectedBets.length < 2) return null;
    const maxShared = Math.max(...pairwiseStats.map(s => s.common.length), 0);
    const coverage = unionNumbers.length;

    if (maxShared >= 4) {
      return {
        level: 'warning',
        title: 'Alta Redundância Detectada',
        description: `Os jogos comparados compartilham até ${maxShared} dezenas em comum. Isso reduz a diversificação e aumenta o risco de pagar por combinações semelhantes.`
      };
    } else if (maxShared <= 1) {
      return {
        level: 'success',
        title: 'Excelente Complementaridade (Anti-Colisão)',
        description: `Ótima dispersão! Os jogos compartilham no máximo ${maxShared} dezena e juntos cobrem ${coverage} dezenas distintas da cartela sem desperdício de investimento.`
      };
    } else {
      return {
        level: 'info',
        title: 'Equilíbrio Estratégico Moderado',
        description: `Compartilham 2 ou 3 dezenas âncora, mantendo uma boa área de cobertura independente (${coverage} dezenas no total).`
      };
    }
  }, [selectedBets, pairwiseStats, unionNumbers]);

  // Gerar aposta divergente (que evita as dezenas dos jogos selecionados)
  const handleGenerateDivergentBet = () => {
    if (!onAddBet) return;
    const usedSet = new Set(unionNumbers);
    const available = Array.from({ length: maxLimit }, (_, i) => i + 1)
      .filter(n => !usedSet.has(n));

    // Escolhe 6 dezenas equilibradas das disponíveis
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    const chosen = shuffled.slice(0, 6).sort((a, b) => a - b);

    if (chosen.length === 6) {
      onAddBet(
        chosen,
        'smart_rules',
        `Aposta Divergente Anti-Colisão: 100% de dezenas independentes dos Jogos comparados, expandindo a cobertura da cartela.`
      );
    }
  };

  if (savedBets.length < 2) {
    return (
      <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-slate-200 shadow-sm space-y-4 max-w-xl mx-auto">
        <div className={`w-16 h-16 rounded-3xl mx-auto flex items-center justify-center ${
          isMaisMilionaria ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
        }`}>
          <GitCompare size={32} />
        </div>
        <h3 className="text-xl font-black text-slate-900">Comparador Direto de Jogos</h3>
        <p className="text-sm text-slate-600">
          Você precisa de pelo menos 2 apostas salvas na carteira para comparar a sobreposição, similaridade e complementaridade entre elas.
        </p>
        {onGoToGenerator && (
          <button
            onClick={onGoToGenerator}
            className={`px-5 py-2.5 rounded-2xl font-black text-xs text-white shadow-md cursor-pointer ${
              isMaisMilionaria ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            Ir ao Gerador de Apostas
          </button>
        )}
      </div>
    );
  }

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
                Análise de Colisão & Interseção
              </span>
              <span className="text-xs text-slate-300">
                Comparando {selectedBets.length} de {savedBets.length} jogos salvos
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1 tracking-tight flex items-center gap-2">
              <GitCompare size={24} className={isMaisMilionaria ? 'text-amber-400' : 'text-emerald-400'} />
              <span>Comparador Direto entre Jogos Gerados</span>
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl mt-1 leading-relaxed">
              Examine dezenas em comum, taxa de similaridade (Jaccard), cobertura conjunta e descubra se seus jogos estão se sobrepondo em excesso ou se complementando perfeitamente.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onAddBet && (
              <button
                onClick={handleGenerateDivergentBet}
                className="px-4 py-2.5 rounded-2xl bg-white text-slate-950 font-black text-xs hover:bg-slate-100 transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Sparkles size={14} className="text-amber-600" />
                <span>Gerar Jogo Divergente</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Seletor Rápido de Jogos para Comparar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <SlidersHorizontal size={14} />
            Selecione de 2 a 4 Jogos da sua Carteira:
          </span>
          <span className="text-[11px] text-slate-500">
            {selectedBetIds.length}/4 selecionados
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {savedBets.map((bet, idx) => {
            const isSelected = selectedBetIds.includes(bet.id);
            const selectionIndex = selectedBetIds.indexOf(bet.id);

            return (
              <button
                key={bet.id}
                onClick={() => toggleSelectBet(bet.id)}
                className={`p-3 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected 
                    ? isMaisMilionaria
                      ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-400/40'
                      : 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-400/40'
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-500">
                    Jogo #{savedBets.length - idx}
                  </span>
                  {isSelected ? (
                    <span className={`w-5 h-5 rounded-full text-white font-black text-[10px] flex items-center justify-center ${
                      isMaisMilionaria ? 'bg-amber-600' : 'bg-emerald-600'
                    }`}>
                      {selectionIndex + 1}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-semibold">+ Selecionar</span>
                  )}
                </div>

                <div className="flex flex-wrap gap-1 mt-2">
                  {bet.numbers.map(n => {
                    const isCommonAll = commonNumbers.includes(n);
                    return (
                      <span 
                        key={n}
                        className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-bold ${
                          isCommonAll 
                            ? 'bg-amber-400 text-slate-950 ring-1 ring-amber-600' 
                            : 'bg-white border border-slate-200 text-slate-800'
                        }`}
                      >
                        {n.toString().padStart(2, '0')}
                      </span>
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cartões Lado a Lado dos Jogos Selecionados */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {selectedBets.map((bet, idx) => {
          const sum = bet.numbers.reduce((a, b) => a + b, 0);
          const evens = bet.numbers.filter(n => n % 2 === 0).length;
          const odds = bet.numbers.length - evens;

          return (
            <div 
              key={bet.id}
              className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col justify-between space-y-3 relative overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase text-white ${
                  isMaisMilionaria ? 'bg-amber-600' : 'bg-emerald-700'
                }`}>
                  Jogo Comparado {idx + 1}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {new Date(bet.createdAt).toLocaleDateString('pt-BR')}
                </span>
              </div>

              {/* Bolas do Jogo com Realce das Comuns */}
              <div className="flex flex-wrap gap-2 py-1 justify-center sm:justify-start">
                {bet.numbers.map(n => {
                  const isCommon = commonNumbers.includes(n);
                  return (
                    <div key={n} className="relative">
                      <div className={`w-9 h-9 rounded-xl font-mono font-black text-xs flex items-center justify-center shadow-xs border ${
                        isCommon
                          ? 'bg-amber-400 text-slate-950 border-amber-600 ring-2 ring-amber-300'
                          : 'bg-slate-900 text-white border-slate-800'
                      }`}>
                        {n.toString().padStart(2, '0')}
                      </div>
                      {isCommon && (
                        <span className="absolute -top-1.5 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 border border-white" title="Dezena em comum com todos"></span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Métricas do Jogo */}
              <div className="pt-2 border-t border-slate-100 text-[11px] space-y-1 text-slate-600">
                <div className="flex justify-between">
                  <span>Soma:</span>
                  <strong className="text-slate-900">{sum}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Paridade:</span>
                  <strong className="text-slate-900">{evens}P / {odds}I</strong>
                </div>
                <div className="flex justify-between">
                  <span>Origem:</span>
                  <span className="capitalize font-semibold text-slate-700">{bet.type}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Veredito Geral e Diagnóstico da Comparação */}
      {verdict && (
        <div className={`p-4 sm:p-5 rounded-3xl border flex items-start gap-3.5 ${
          verdict.level === 'warning'
            ? 'bg-amber-50 border-amber-200 text-amber-950'
            : verdict.level === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
            : 'bg-blue-50 border-blue-200 text-blue-950'
        }`}>
          <div className="p-2 rounded-2xl bg-white shadow-xs">
            {verdict.level === 'warning' ? (
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            ) : verdict.level === 'success' ? (
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            ) : (
              <Info className="w-5 h-5 text-blue-600" />
            )}
          </div>
          <div className="space-y-0.5">
            <h4 className="text-sm font-black">{verdict.title}</h4>
            <p className="text-xs leading-relaxed opacity-90">{verdict.description}</p>
          </div>
        </div>
      )}

      {/* Painel Duplo: Dezenas em Comum x Cobertura Total */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Dezenas em Comum */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
              <Layers size={16} className="text-amber-600" />
              <span>Dezenas Compartilhadas por Todos ({commonNumbers.length})</span>
            </h4>
            <span className="text-[10px] uppercase font-bold text-slate-400">Interseção</span>
          </div>

          {commonNumbers.length > 0 ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2 pt-1">
                {commonNumbers.map(n => (
                  <span 
                    key={n}
                    className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 font-black font-mono text-sm flex items-center justify-center shadow-xs border border-amber-500"
                  >
                    {n.toString().padStart(2, '0')}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-slate-500">
                Estas dezenas estão presentes em 100% dos jogos selecionados. Se forem sorteadas, impulsionam todas as apostas; se não saírem, penalizam todas ao mesmo tempo.
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-50 text-center text-xs text-slate-500 font-medium">
              ✅ Nenhuma dezena é compartilhada simultaneamente por todos os jogos. Alta independência!
            </div>
          )}
        </div>

        {/* Cobertura Conjunta da Cartela */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
              <Percent size={16} className="text-emerald-600" />
              <span>Cobertura Total Conjunta ({unionNumbers.length} de {maxLimit})</span>
            </h4>
            <span className="text-[10px] font-bold text-emerald-700">
              {((unionNumbers.length / maxLimit) * 100).toFixed(1)}% da cartela
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {unionNumbers.map(n => {
              const isCommon = commonNumbers.includes(n);
              return (
                <span 
                  key={n}
                  className={`w-7 h-7 rounded-lg font-mono text-xs font-bold flex items-center justify-center ${
                    isCommon 
                      ? 'bg-amber-400 text-slate-950 font-black' 
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {n.toString().padStart(2, '0')}
                </span>
              );
            })}
          </div>

          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full ${isMaisMilionaria ? 'bg-amber-600' : 'bg-emerald-600'}`}
              style={{ width: `${(unionNumbers.length / maxLimit) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Matriz de Similaridade Par a Par */}
      {pairwiseStats.length > 0 && (
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
          <h4 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
            <ArrowRightLeft size={16} className="text-slate-600" />
            <span>Matriz de Colisão e Semelhança Par a Par (Índice de Jaccard)</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {pairwiseStats.map(stat => (
              <div 
                key={`${stat.gameAId}-${stat.gameBId}`}
                className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs"
              >
                <div className="flex justify-between items-center">
                  <span className="font-black text-slate-800">
                    Jogo {stat.gameAIndex} vs Jogo {stat.gameBIndex}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                    stat.collisionLevel === 'alta'
                      ? 'bg-red-100 text-red-800'
                      : stat.collisionLevel === 'moderada'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {stat.collisionLevel === 'alta' ? 'Alta Colisão' : stat.collisionLevel === 'moderada' ? 'Média' : 'Disperso'}
                  </span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>Dezenas em comum:</span>
                  <strong className="text-slate-900">{stat.common.length} {stat.common.length > 0 ? `(${stat.common.map(n => n.toString().padStart(2, '0')).join(', ')})` : ''}</strong>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>Similaridade Jaccard:</span>
                  <strong className="text-slate-900">{stat.jaccardPercent}%</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GameComparatorView;
