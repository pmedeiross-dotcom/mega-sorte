import React, { useMemo, useState } from 'react';
import { 
  Trophy, 
  Medal, 
  Award, 
  Sparkles, 
  Flame, 
  Filter, 
  ArrowUpDown, 
  CheckCircle2, 
  Calendar, 
  Copy, 
  Check, 
  ChevronRight,
  Calculator,
  Search,
  Star
} from 'lucide-react';
import { Bet, LotteryType } from '../types';
import { MEGA_SENA_OFFICIAL_DRAWS } from '../utils/megaSenaContestsData';
import { MAIS_MILIONARIA_OFFICIAL_DRAWS } from '../utils/maisMilionariaContestsData';
import { RECENT_LOTOFACIL_DRAWS } from '../utils/lotofacilContestsData';
import NumberBall from './NumberBall';

interface GameRankingPanelProps {
  history: Bet[];
  currentLottery: LotteryType;
  onNavigateToPlay?: () => void;
  onSelectGame?: (bet: Bet) => void;
}

interface RankedGame {
  bet: Bet;
  senaCount: number;
  quinaCount: number;
  quadraCount: number;
  ternoCount: number;
  totalPrizes: number;
  historicalScore: number;
  latestWinContest?: number;
  latestWinDate?: string;
  bestTierReached: string;
}

export const GameRankingPanel: React.FC<GameRankingPanelProps> = ({
  history,
  currentLottery,
  onNavigateToPlay,
  onSelectGame
}) => {
  const isMaisMilionaria = currentLottery === 'maismilionaria';
  const isLotofacil = currentLottery === 'lotofacil';
  const lotteryTitle = isLotofacil ? 'Lotofácil' : isMaisMilionaria ? '+Milionária' : 'Mega-Sena';
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'score' | 'quadras' | 'quinas' | 'newest'>('score');
  const [searchFilter, setSearchFilter] = useState('');

  // Filtra histórico da modalidade
  const activeBets = useMemo(() => {
    return history.filter(b => (b.lottery || 'megasena') === currentLottery);
  }, [history, currentLottery]);

  // Simulação e Backtest Histórico Completo de Cada Jogo
  const { rankedGames, topAffinityNumbers, totalDrawsAnalyzed } = useMemo(() => {
    const draws = isLotofacil
      ? RECENT_LOTOFACIL_DRAWS
      : isMaisMilionaria
        ? MAIS_MILIONARIA_OFFICIAL_DRAWS
        : MEGA_SENA_OFFICIAL_DRAWS;
    const totalDraws = draws.length;

    // Mapa de afinidade por dezena (quantos acertos foram contabilizados por número)
    const numberHitsMap = new Map<number, number>();

    const results: RankedGame[] = activeBets.map(bet => {
      let senaCount = 0;
      let quinaCount = 0;
      let quadraCount = 0;
      let ternoCount = 0;
      let latestWinContest: number | undefined;
      let latestWinDate: string | undefined;

      const betSet = new Set(bet.numbers);

      for (let i = 0; i < draws.length; i++) {
        const draw = draws[i];
        let hits = 0;
        for (let j = 0; j < draw.numbers.length; j++) {
          if (betSet.has(draw.numbers[j])) {
            hits++;
          }
        }

        if (isLotofacil) {
          // Lotofácil: 15, 14, 13, 12, 11 acertos
          if (hits === 15) {
            senaCount++; // 15 acertos
            if (!latestWinContest) { latestWinContest = draw.contest; latestWinDate = draw.date; }
          } else if (hits === 14) {
            quinaCount++; // 14 acertos
            if (!latestWinContest) { latestWinContest = draw.contest; latestWinDate = draw.date; }
          } else if (hits === 13) {
            quadraCount++; // 13 acertos
            if (!latestWinContest) { latestWinContest = draw.contest; latestWinDate = draw.date; }
          } else if (hits >= 11) {
            ternoCount++; // 12 e 11 acertos
          }
        } else if (isMaisMilionaria && bet.trevos && (draw as any).trevos) {
          const drawTrevos = (draw as any).trevos as number[];
          const trevosHits = bet.trevos.filter(t => drawTrevos.includes(t)).length;

          if (hits === 6 && trevosHits === 2) {
            senaCount++; // Faixa 1
            if (!latestWinContest) { latestWinContest = draw.contest; latestWinDate = draw.date; }
          } else if (hits === 6 || (hits === 5 && trevosHits === 2)) {
            quinaCount++; // Faixa 2 ou 3
            if (!latestWinContest) { latestWinContest = draw.contest; latestWinDate = draw.date; }
          } else if (hits === 5 || (hits === 4 && trevosHits === 2)) {
            quadraCount++; // Faixa 4 ou 5
            if (!latestWinContest) { latestWinContest = draw.contest; latestWinDate = draw.date; }
          } else if (hits >= 4 || (hits === 3 && trevosHits >= 1) || (hits === 2 && trevosHits === 2)) {
            ternoCount++; // Faixas menores
            if (!latestWinContest) { latestWinContest = draw.contest; latestWinDate = draw.date; }
          }
        } else {
          // Mega-Sena clássica
          if (hits === 6) {
            senaCount++;
            if (!latestWinContest) { latestWinContest = draw.contest; latestWinDate = draw.date; }
          } else if (hits === 5) {
            quinaCount++;
            if (!latestWinContest) { latestWinContest = draw.contest; latestWinDate = draw.date; }
          } else if (hits === 4) {
            quadraCount++;
            if (!latestWinContest) { latestWinContest = draw.contest; latestWinDate = draw.date; }
          } else if (hits === 3) {
            ternoCount++;
          }
        }

        // Atualiza afinidade das dezenas que pontuaram
        const minHitForAffinity = isLotofacil ? 13 : 4;
        if (hits >= minHitForAffinity) {
          draw.numbers.forEach(n => {
            if (betSet.has(n)) {
              numberHitsMap.set(n, (numberHitsMap.get(n) || 0) + (hits >= 14 || hits === 6 ? 10 : hits >= 13 || hits === 5 ? 4 : 1));
            }
          });
        }
      }

      // Pontuação Ponderada de Afinidade Histórica
      const historicalScore = isLotofacil
        ? (senaCount * 50000) + (quinaCount * 2500) + (quadraCount * 100) + (ternoCount * 10)
        : (senaCount * 100000) + (quinaCount * 4500) + (quadraCount * 120) + (ternoCount * 8);

      let bestTierReached = 'Sem Premiação';
      if (senaCount > 0) bestTierReached = isLotofacil ? '15 Acertos (Máximo)' : isMaisMilionaria ? 'Faixa 1 (6+2)' : 'Sena (6 acertos)';
      else if (quinaCount > 0) bestTierReached = isLotofacil ? '14 Acertos' : isMaisMilionaria ? 'Faixa 2/3' : 'Quina (5 acertos)';
      else if (quadraCount > 0) bestTierReached = isLotofacil ? '13 Acertos' : isMaisMilionaria ? 'Faixa 4/5' : 'Quadra (4 acertos)';
      else if (ternoCount > 0) bestTierReached = isLotofacil ? '11/12 Acertos' : isMaisMilionaria ? 'Faixa 6-10' : 'Terno (3 acertos)';

      return {
        bet,
        senaCount,
        quinaCount,
        quadraCount,
        ternoCount,
        totalPrizes: senaCount + quinaCount + quadraCount + (isLotofacil ? ternoCount : 0),
        historicalScore,
        latestWinContest,
        latestWinDate,
        bestTierReached
      };
    });

    // Top números com maior afinidade histórica
    const topAffinity = Array.from(numberHitsMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([num, points]) => ({ num, points }));

    return {
      rankedGames: results,
      topAffinityNumbers: topAffinity,
      totalDrawsAnalyzed: totalDraws
    };
  }, [activeBets, isMaisMilionaria, isLotofacil]);

  // Ordenação dos jogos classificados
  const sortedGames = useMemo(() => {
    let list = [...rankedGames];

    if (searchFilter.trim()) {
      const num = parseInt(searchFilter.trim(), 10);
      if (!isNaN(num)) {
        list = list.filter(r => r.bet.numbers.includes(num));
      }
    }

    list.sort((a, b) => {
      if (sortBy === 'score') return b.historicalScore - a.historicalScore;
      if (sortBy === 'quadras') return b.quadraCount - a.quadraCount;
      if (sortBy === 'quinas') return b.quinaCount - a.quinaCount;
      if (sortBy === 'newest') return b.bet.createdAt - a.bet.createdAt;
      return 0;
    });

    return list;
  }, [rankedGames, sortBy, searchFilter]);

  const handleCopy = (bet: Bet) => {
    const text = bet.numbers.map(n => n.toString().padStart(2, '0')).join(' - ');
    navigator.clipboard.writeText(text);
    setCopiedId(bet.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (activeBets.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 text-white flex items-center justify-center mx-auto shadow-md">
          <Trophy size={32} />
        </div>
        <div className="max-w-md mx-auto space-y-1">
          <h3 className="text-xl font-black text-slate-900">Ranking Histórico de Jogos</h3>
          <p className="text-xs text-slate-500">
            Salve algumas apostas da {lotteryTitle} para que o simulador teste seus bilhetes contra todos os {totalDrawsAnalyzed} concursos oficiais e classifique as melhores combinações.
          </p>
        </div>
        {onNavigateToPlay && (
          <button
            type="button"
            onClick={onNavigateToPlay}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition cursor-pointer"
          >
            <Sparkles size={16} />
            <span>Criar Jogos para o Ranking ({lotteryTitle})</span>
          </button>
        )}
      </div>
    );
  }

  const top3 = sortedGames.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Top Banner de Ranking */}
      <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-yellow-950 text-white rounded-3xl p-5 sm:p-7 shadow-lg relative overflow-hidden border border-amber-800/80">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-300 border border-amber-400/30">
                Backtest Histórico Caixa • {totalDrawsAnalyzed} Concursos
              </span>
              <span className="text-xs text-slate-300">
                {lotteryTitle}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1.5 tracking-tight flex items-center gap-2">
              <Trophy size={26} className="text-amber-400" />
              <span>Ranking de Jogos & Afinidade Histórica ({lotteryTitle})</span>
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl mt-1 leading-relaxed">
              Cada jogo salvo no seu histórico foi cruzado contra todos os <strong>{totalDrawsAnalyzed} concursos oficiais da Caixa</strong>. Descubra quais bilhetes teriam pontuado mais vezes e quais dezenas da sua carteira têm a maior afinidade vitoriosa.
            </p>
          </div>

          <div className="bg-white/10 p-3.5 rounded-2xl border border-white/10 backdrop-blur-xs text-right shrink-0">
            <span className="text-[10px] uppercase font-bold text-amber-300 block">Carteira Analisada</span>
            <div className="text-lg font-black text-white">{activeBets.length} apostas</div>
            <span className="text-[10px] text-slate-300">Classificação Ponderada</span>
          </div>
        </div>
      </div>

      {/* Destaque das Dezenas com Maior Afinidade Histórica ("Super Dezenas") */}
      {topAffinityNumbers.length > 0 && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star size={18} className="text-amber-500 fill-amber-500" />
              <h3 className="text-sm font-black text-slate-900">
                Super Dezenas de Maior Afinidade da sua Carteira
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              Dezenas que mais geraram acertos em combinações
            </span>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {topAffinityNumbers.map(({ num, points }, idx) => (
              <div 
                key={num}
                className="flex items-center gap-2 bg-gradient-to-b from-amber-50/60 to-white border border-amber-200 px-3.5 py-2 rounded-2xl shadow-2xs"
              >
                <span className="text-[10px] font-black text-amber-700 bg-amber-100 rounded-md px-1.5 py-0.5">
                  #{idx + 1}
                </span>
                <span className="font-mono font-black text-sm text-slate-900">
                  {num.toString().padStart(2, '0')}
                </span>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200/60">
                  {points} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pódio dos Top 3 Jogos Campeões */}
      {top3.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Medal size={18} className="text-amber-600" />
            <span>Pódio dos Melhores Jogos Históricos</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {top3.map((ranked, index) => {
              const medalColors = [
                { badge: 'bg-yellow-500 text-white', border: 'border-yellow-400 ring-2 ring-yellow-300/40', title: '🥇 1º Lugar - Campeão Histórico' },
                { badge: 'bg-slate-400 text-white', border: 'border-slate-300', title: '🥈 2º Lugar' },
                { badge: 'bg-amber-700 text-white', border: 'border-amber-600/40', title: '🥉 3º Lugar' }
              ][index];

              return (
                <div 
                  key={ranked.bet.id} 
                  className={`bg-white rounded-3xl p-5 border shadow-sm flex flex-col justify-between ${medalColors.border}`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`px-2.5 py-1 rounded-xl text-xs font-black ${medalColors.badge}`}>
                        {medalColors.title}
                      </span>
                      <span className="text-xs font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                        {ranked.historicalScore} pts
                      </span>
                    </div>

                    {/* Dezenas */}
                    <div className="flex flex-wrap gap-1.5 py-1">
                      {ranked.bet.numbers.map(n => (
                        <NumberBall key={n} num={n} size="sm" isSelected />
                      ))}
                      {ranked.bet.trevos && ranked.bet.trevos.length > 0 && (
                        <div className="flex items-center gap-1 pl-1">
                          {ranked.bet.trevos.map(t => (
                            <span 
                              key={t}
                              className="w-6 h-6 rounded-md bg-amber-400 text-amber-950 font-black text-[10px] flex items-center justify-center font-mono border border-amber-500 shadow-2xs"
                            >
                              🍀{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Estatísticas de Premiações */}
                    <div className="grid grid-cols-3 gap-1.5 text-center pt-1">
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-150">
                        <span className="text-[10px] text-slate-500 block font-bold">{isLotofacil ? '13 Acertos' : isMaisMilionaria ? 'Faixa 4/5' : 'Quadras'}</span>
                        <span className="text-sm font-black text-slate-900">{ranked.quadraCount}x</span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-150">
                        <span className="text-[10px] text-slate-500 block font-bold">{isLotofacil ? '14 Acertos' : isMaisMilionaria ? 'Faixa 2/3' : 'Quinas'}</span>
                        <span className="text-sm font-black text-indigo-700">{ranked.quinaCount}x</span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-150">
                        <span className="text-[10px] text-slate-500 block font-bold">{isLotofacil ? '15 Acertos' : isMaisMilionaria ? 'Faixa 1' : 'Senas'}</span>
                        <span className="text-sm font-black text-amber-600">{ranked.senaCount}x</span>
                      </div>
                    </div>

                    {ranked.latestWinContest && (
                      <p className="text-[11px] text-slate-500 pt-1">
                        Último prêmio teórico: <strong>Concurso #{ranked.latestWinContest}</strong> ({ranked.latestWinDate})
                      </p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleCopy(ranked.bet)}
                      className="text-xs font-bold text-slate-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedId === ranked.bet.id ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      <span>{copiedId === ranked.bet.id ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                    {onSelectGame && (
                      <button
                        type="button"
                        onClick={() => onSelectGame(ranked.bet)}
                        className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>Ver detalhes</span>
                        <ChevronRight size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lista e Tabela de Todos os Jogos Classificados */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900">
              Todos os {sortedGames.length} Jogos da Carteira Classificados
            </h3>
            <p className="text-xs text-slate-500">
              Ordenados pelo resultado cumulativo em todos os concursos passados
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Campo de Busca por Dezena */}
            <div className="relative flex-1 sm:w-44">
              <Search size={14} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="number"
                placeholder="Filtrar por dezena..."
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Ordenação */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="score">Maior Pontuação</option>
              <option value="quadras">Mais Quadras</option>
              <option value="quinas">Mais Quinas</option>
              <option value="newest">Mais Recentes</option>
            </select>
          </div>
        </div>

        {/* Tabela Responsiva */}
        <div className="divide-y divide-slate-100">
          {sortedGames.map((ranked, idx) => (
            <div 
              key={ranked.bet.id}
              className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 px-2 rounded-2xl transition"
            >
              <div className="flex items-center gap-3">
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                  idx === 0 ? 'bg-yellow-500 text-white shadow-xs' : idx === 1 ? 'bg-slate-400 text-white' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                  #{idx + 1}
                </span>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {ranked.bet.numbers.map(n => (
                      <span 
                        key={n} 
                        className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-900 font-mono font-bold text-xs"
                      >
                        {n.toString().padStart(2, '0')}
                      </span>
                    ))}
                    {ranked.bet.trevos && ranked.bet.trevos.length > 0 && (
                      <span className="text-[11px] font-bold text-amber-800 ml-1">
                        🍀 [{ranked.bet.trevos.join(', ')}]
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span>Criado em {new Date(ranked.bet.createdAt).toLocaleDateString('pt-BR')}</span>
                    <span>•</span>
                    <span>Soma: {ranked.bet.sum}</span>
                    {ranked.latestWinContest && (
                      <>
                        <span>•</span>
                        <span className="text-emerald-700 font-medium">Último prêmio: Concurso #{ranked.latestWinContest}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-bold text-slate-700">
                    {ranked.quadraCount} {isLotofacil ? '13p' : 'Quadras'}
                  </span>
                  {ranked.quinaCount > 0 && (
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                      {ranked.quinaCount} {isLotofacil ? '14p' : 'Quinas'}
                    </span>
                  )}
                  {ranked.senaCount > 0 && (
                    <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 font-black border border-amber-300">
                      {ranked.senaCount} {isLotofacil ? '15 Acertos!' : 'Senas!'}
                    </span>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-xs font-black text-amber-700 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                    {ranked.historicalScore} pts
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GameRankingPanel;
