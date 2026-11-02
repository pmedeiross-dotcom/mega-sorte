import React, { useMemo } from 'react';
import { 
  Sparkles, 
  BrainCircuit, 
  ShieldCheck, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Flame, 
  Scale, 
  HelpCircle, 
  ArrowRight, 
  Compass, 
  Target,
  Layers,
  Clover,
  Lightbulb,
  Award,
  Zap
} from 'lucide-react';
import { Bet, LotteryType, OfficialDrawResult } from '../types';
import { OFFICIAL_FREQUENCY_DATA } from '../utils/megaSenaOfficialStats';
import { MAIS_MILIONARIA_FREQUENCY_DATA } from '../utils/maisMilionariaOfficialStats';

interface AICoachingPanelProps {
  history: Bet[];
  currentLottery: LotteryType;
  latestDraw?: OfficialDrawResult;
  onApplyCoachingToGenerator?: (suggestedStrategy: string) => void;
  onNavigateToPlay?: () => void;
}

interface TacticalAdvice {
  id: string;
  type: 'critical' | 'improvement' | 'positive';
  title: string;
  description: string;
  actionLabel?: string;
  suggestedDezenas?: number[];
  category: 'conservative' | 'even_odd' | 'quadrant' | 'sum' | 'trevos' | 'diversity';
}

export const AICoachingPanel: React.FC<AICoachingPanelProps> = ({
  history,
  currentLottery,
  latestDraw,
  onApplyCoachingToGenerator,
  onNavigateToPlay
}) => {
  const isMaisMilionaria = currentLottery === 'maismilionaria';
  const maxNumber = isMaisMilionaria ? 50 : 60;
  const officialFrequency = isMaisMilionaria ? MAIS_MILIONARIA_FREQUENCY_DATA : OFFICIAL_FREQUENCY_DATA;

  // Filtra apostas correspondentes à loteria atual
  const activeBets = useMemo(() => {
    return history.filter(b => (b.lottery || 'megasena') === currentLottery);
  }, [history, currentLottery]);

  // Análise Estatística e Diagnóstico da Carteira
  const portfolioAnalysis = useMemo(() => {
    if (activeBets.length === 0) return null;

    const allNumbers: number[] = activeBets.flatMap(b => b.numbers);
    const uniqueNumbers: number[] = Array.from(new Set(allNumbers)).sort((a: number, b: number) => a - b);
    const coveragePercent = Math.round((uniqueNumbers.length / maxNumber) * 100);

    // Frequência de cada número nas apostas do usuário
    const countsMap = new Map<number, number>();
    allNumbers.forEach(n => countsMap.set(n, (countsMap.get(n) || 0) + 1));

    // Números mais jogados pelo usuário
    const topUserNumbers = Array.from(countsMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([num, count]) => ({ num, count }));

    // Par / Ímpar médio
    const totalEvens = activeBets.reduce((acc, b) => acc + b.numbers.filter(n => n % 2 === 0).length, 0);
    const totalOdds = allNumbers.length - totalEvens;
    const avgEvenPerBet = (totalEvens / activeBets.length).toFixed(1);
    const avgOddPerBet = (totalOdds / activeBets.length).toFixed(1);

    // Média de soma
    const avgSum = Math.round(activeBets.reduce((acc, b) => acc + b.sum, 0) / activeBets.length);
    const idealSumMin = isMaisMilionaria ? 120 : 160;
    const idealSumMax = isMaisMilionaria ? 185 : 240;
    const isSumInIdealRange = avgSum >= idealSumMin && avgSum <= idealSumMax;

    // Números baixos (1 a 31 - datas de aniversário) vs altos (32+)
    const lowCount = allNumbers.filter(n => n <= 31).length;
    const lowPercent = Math.round((lowCount / allNumbers.length) * 100);

    // Quadrantes (Q1: 1-15, Q2: 16-30, Q3: 31-45, Q4: 46-60)
    let q1 = 0, q2 = 0, q3 = 0, q4 = 0;
    allNumbers.forEach(n => {
      const row = Math.floor((n - 1) / 10);
      const col = (n - 1) % 10;
      if (row < 3 && col < 5) q1++;
      else if (row < 3 && col >= 5) q2++;
      else if (row >= 3 && col < 5) q3++;
      else q4++;
    });

    // Top 20 números mais sorteados na história oficial
    const top20Official = Object.entries(officialFrequency)
      .map(([numStr, count]) => ({ number: Number(numStr), draws: Number(count) }))
      .sort((a, b) => b.draws - a.draws)
      .slice(0, 20)
      .map(item => item.number);

    // Top números oficiais que o usuário NUNCA jogou
    const missingTopNumbers = top20Official
      .filter(n => !uniqueNumbers.includes(n))
      .slice(0, 5);

    // Trevos na +Milionária
    let trevosUsed = new Set<number>();
    let repeatedTrevosCount = 0;
    if (isMaisMilionaria) {
      activeBets.forEach(b => {
        if (b.trevos) {
          b.trevos.forEach(t => trevosUsed.add(t));
          if (b.trevos[0] === 1 && b.trevos[1] === 2) repeatedTrevosCount++;
        }
      });
    }

    // Identificação do Perfil do Jogador
    let playerProfile = "Equilibrado";
    let profileDescription = "Suas apostas apresentam boa distribuição e diversidade matemática.";
    let profileColor = "text-emerald-700 bg-emerald-50 border-emerald-200";

    if (lowPercent >= 68) {
      playerProfile = "Conservador de Datas (Números 01 a 31)";
      profileDescription = `${lowPercent}% das suas dezenas estão concentradas em datas comemorativas (01 a 31). Tende a dividir prêmios caso premiado.`;
      profileColor = "text-amber-800 bg-amber-50 border-amber-200";
    } else if (Math.abs(Number(avgEvenPerBet) - Number(avgOddPerBet)) >= 2.2) {
      playerProfile = "Assimétrico Par/Ímpar";
      profileDescription = `Forte desbalanço entre números pares e ímpares (${avgEvenPerBet}P vs ${avgOddPerBet}I). Padrões extremos têm menos de 10% de incidência histórica.`;
      profileColor = "text-purple-800 bg-purple-50 border-purple-200";
    } else if (coveragePercent <= 25 && activeBets.length >= 4) {
      playerProfile = "Teimoso Concentrado";
      profileDescription = "Alta repetição das mesmas dezenas entre múltiplos bilhetes. Boa insistência, porém menor amplitude de acerto.";
      profileColor = "text-blue-800 bg-blue-50 border-blue-200";
    } else if (uniqueNumbers.length >= 35) {
      playerProfile = "Estrategista de Ampla Cobertura";
      profileDescription = `Excelente diversificação: cobre ${coveragePercent}% de todo o volante da loteria.`;
      profileColor = "text-emerald-800 bg-emerald-50 border-emerald-200";
    }

    // Cálculo do Score de Saúde da Carteira (0 a 100)
    let score = 50;
    // Bônus/Penalidade de Cobertura
    if (coveragePercent >= 45) score += 15;
    else if (coveragePercent >= 30) score += 10;
    else score -= 5;

    // Bônus de Par/Ímpar (ideal é 3x3 ou 4x2)
    const evenDiff = Math.abs(Number(avgEvenPerBet) - 3.0);
    if (evenDiff <= 0.6) score += 15;
    else if (evenDiff <= 1.2) score += 8;
    else score -= 8;

    // Bônus de Soma
    if (isSumInIdealRange) score += 12;
    else score -= 6;

    // Bônus de Quadrantes
    const minQ = Math.min(q1, q2, q3, q4);
    if (minQ > 0) score += 8;

    score = Math.max(10, Math.min(98, score));

    // Geração de Dicas Táticas do IA Coach
    const advices: TacticalAdvice[] = [];

    // 1. Dica Conservadora / Datas (se aplicável)
    if (lowPercent >= 60) {
      advices.push({
        id: 'conservative_rule',
        type: 'critical',
        category: 'conservative',
        title: 'Você joga muito conservador, tente variar 1 dezena no Top 20',
        description: `Cerca de ${lowPercent}% dos seus números escolhidos estão abaixo de 31 (faixa comum de datas de aniversário). Nos sorteios oficiais, mais de 48% das dezenas saem entre 32 e ${maxNumber}. Recomendamos trocar 1 ou 2 dezenas baixas por uma dezena quente do Top 20 histórico.`,
        suggestedDezenas: missingTopNumbers.length > 0 ? missingTopNumbers : [10, 53, 5, 23, 34]
      });
    }

    // 2. Dica Par/Ímpar
    if (Math.abs(Number(avgEvenPerBet) - 3.0) >= 1.0) {
      advices.push({
        id: 'even_odd_rule',
        type: 'improvement',
        category: 'even_odd',
        title: `Ajuste na Proporção Par/Ímpar (Média atual: ${avgEvenPerBet}P / ${avgOddPerBet}I)`,
        description: `O padrão mais premiado de toda a história oficial da Caixa é 3 Pares e 3 Ímpares (31.4% das vezes), seguido por 4 Pares / 2 Ímpares (24.3%). Ajuste seus bilhetes para evitar desequilíbrios como 5P/1I ou 6P/0I.`
      });
    }

    // 3. Dica de Dezenas de Ouro Ignoradas
    if (missingTopNumbers.length > 0) {
      advices.push({
        id: 'missing_top',
        type: 'improvement',
        category: 'diversity',
        title: 'Dezenas Históricas mais Frequentes ausentes da sua Carteira',
        description: `As dezenas [${missingTopNumbers.map(n => n.toString().padStart(2, '0')).join(', ')}] estão entre as maiores campeãs de sorteios da Caixa, mas não aparecem em nenhuma aposta sua. Considere incluir ao menos uma delas nas suas próximas combinações.`,
        suggestedDezenas: missingTopNumbers
      });
    }

    // 4. Dica de Soma
    if (!isSumInIdealRange) {
      advices.push({
        id: 'sum_rule',
        type: 'improvement',
        category: 'sum',
        title: `Média de Soma das Apostas (${avgSum}) fora do Padrão Gaussiano`,
        description: `A soma combinada das dezenas na ${isMaisMilionaria ? '+Milionária' : 'Mega-Sena'} concentra 78% dos sorteios entre ${idealSumMin} e ${idealSumMax}. Sua média atual está em ${avgSum}. Elevar ou calibrar as dezenas aproxima seu jogo da zona de maior probabilidade matemática.`
      });
    }

    // 5. Dica de Trevos (+Milionária)
    if (isMaisMilionaria && repeatedTrevosCount >= 2 && activeBets.length >= 3) {
      advices.push({
        id: 'trevos_diversity',
        type: 'improvement',
        category: 'trevos',
        title: 'Diversifique as Duplas de Trevos da +Milionária',
        description: `Você repetiu os mesmos trevos [1, 2] em múltiplas apostas. Como a +Milionária premia em 10 faixas distintas (várias exigindo 2 ou 1 trevo), variar para duplas como [3, 4], [1, 5] ou [2, 6] aumenta substancialmente sua chance de pontuar nas faixas secundárias.`
      });
    }

    // Se a carteira estiver excelente
    if (advices.length === 0) {
      advices.push({
        id: 'perfect_balance',
        type: 'positive',
        category: 'diversity',
        title: 'Carteira de Alta Eficiência Estatística!',
        description: 'Parabéns! Suas apostas seguem com precisão os principais fundamentos probabilísticos: distribuição equilibrada de pares/ímpares, dispersão de quadrantes e soma na faixa ideal da Caixa.'
      });
    }

    return {
      activeBetsCount: activeBets.length,
      uniqueNumbersCount: uniqueNumbers.length,
      coveragePercent,
      avgEvenPerBet,
      avgOddPerBet,
      avgSum,
      idealSumMin,
      idealSumMax,
      lowPercent,
      playerProfile,
      profileDescription,
      profileColor,
      score,
      advices,
      topUserNumbers,
      missingTopNumbers
    };
  }, [activeBets, isMaisMilionaria, maxNumber, officialFrequency]);

  // Se o usuário ainda não tiver jogos salvos
  if (!portfolioAnalysis || activeBets.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-md">
          <BrainCircuit size={32} />
        </div>
        <div className="max-w-md mx-auto space-y-1">
          <h3 className="text-xl font-black text-slate-900">IA Coaching: Otimize sua Estratégia</h3>
          <p className="text-xs text-slate-500">
            Você ainda não possui apostas salvas na {isMaisMilionaria ? '+Milionária' : 'Mega-Sena'}. Crie ou gere seus primeiros jogos na cartela para que o Coach analise seu perfil e aponte correções táticas.
          </p>
        </div>
        {onNavigateToPlay && (
          <button
            type="button"
            onClick={onNavigateToPlay}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm transition cursor-pointer"
          >
            <Sparkles size={16} />
            <span>Gerar Primeiras Apostas para Análise</span>
          </button>
        )}
      </div>
    );
  }

  const {
    activeBetsCount,
    uniqueNumbersCount,
    coveragePercent,
    avgEvenPerBet,
    avgOddPerBet,
    avgSum,
    lowPercent,
    playerProfile,
    profileDescription,
    profileColor,
    score,
    advices,
    topUserNumbers,
    missingTopNumbers
  } = portfolioAnalysis;

  return (
    <div className="space-y-6">
      {/* Top Banner do Coach */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-5 sm:p-7 shadow-lg relative overflow-hidden border border-purple-800/80">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-purple-500/20 text-purple-300 border border-purple-400/30">
                Mentor Algorítmico de Apostas
              </span>
              <span className="text-xs text-slate-300">
                Modalidade: {isMaisMilionaria ? '+Milionária (01 a 50 + Trevos)' : 'Mega-Sena (01 a 60)'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1.5 tracking-tight flex items-center gap-2">
              <BrainCircuit size={26} className="text-purple-400" />
              <span>IA Coaching de Apostas & Perfil Estratégico</span>
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl mt-1 leading-relaxed">
              O motor de IA avalia todos os seus {activeBetsCount} jogos salvos, identifica vícios de aposta (como datas e assimetrias) e sugere ajustes precisos para maximizar sua probabilidade matemática.
            </p>
          </div>

          {/* Medidor de Score da Carteira */}
          <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-xs flex items-center gap-3.5 shrink-0">
            <div className="relative w-14 h-14 flex items-center justify-center">
              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-white/20"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={`${score >= 75 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-rose-400'}`}
                  strokeDasharray={`${score}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-sm font-black text-white">{score}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-300 block">Eficiência da Carteira</span>
              <div className="text-xs font-black text-white">
                {score >= 80 ? '🟢 Padrão Ouro' : score >= 60 ? '🟡 Bom Equilíbrio' : '🟠 Ajustes Necessários'}
              </div>
              <span className="text-[10px] text-purple-200">{activeBetsCount} jogos avaliados</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cartão de Perfil do Jogador */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Diagnóstico de Comportamento</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`px-3 py-1 rounded-xl text-xs font-black border ${profileColor}`}>
                {playerProfile}
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-600 max-w-xl leading-relaxed">
            {profileDescription}
          </p>
        </div>

        {/* Grade de Indicadores da Carteira */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Cobertura do Volante</span>
            <span className="text-lg font-black text-slate-900 mt-0.5 block">{coveragePercent}%</span>
            <span className="text-[10px] text-slate-500">{uniqueNumbersCount} de {maxNumber} dezenas</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Proporção Par / Ímpar</span>
            <span className="text-lg font-black text-slate-900 mt-0.5 block">{avgEvenPerBet}P / {avgOddPerBet}I</span>
            <span className="text-[10px] text-emerald-600 font-medium">Meta ideal: 3P / 3I</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Média de Soma</span>
            <span className="text-lg font-black text-slate-900 mt-0.5 block">{avgSum}</span>
            <span className="text-[10px] text-slate-500">Faixa ideal: {portfolioAnalysis.idealSumMin}-{portfolioAnalysis.idealSumMax}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Dezenas &le; 31 (Datas)</span>
            <span className={`text-lg font-black mt-0.5 block ${lowPercent >= 60 ? 'text-amber-600' : 'text-slate-900'}`}>
              {lowPercent}%
            </span>
            <span className="text-[10px] text-slate-500">Média Caixa: ~51%</span>
          </div>
        </div>
      </div>

      {/* Feed de Recomendações e Dicas Táticas do Coach */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Lightbulb size={20} className="text-amber-500" />
            <span>Recomendações Táticas do IA Coach ({advices.length})</span>
          </h3>
          <span className="text-xs text-slate-500">
            Atualizado em tempo real com seu histórico
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {advices.map(advice => (
            <div 
              key={advice.id}
              className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                advice.type === 'critical'
                  ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                  : advice.type === 'positive'
                  ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                  : 'bg-purple-50/70 border-purple-200 text-purple-950'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                  advice.type === 'critical'
                    ? 'bg-amber-500 text-white'
                    : advice.type === 'positive'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-purple-600 text-white'
                }`}>
                  {advice.type === 'critical' ? (
                    <AlertTriangle size={18} />
                  ) : advice.type === 'positive' ? (
                    <CheckCircle2 size={18} />
                  ) : (
                    <Target size={18} />
                  )}
                </div>

                <div className="flex-1 space-y-1.5">
                  <h4 className="text-sm font-black tracking-tight">{advice.title}</h4>
                  <p className="text-xs leading-relaxed opacity-90">{advice.description}</p>

                  {/* Sugestão de Dezenas Recomendadas */}
                  {advice.suggestedDezenas && advice.suggestedDezenas.length > 0 && (
                    <div className="pt-2 flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold">Dezenas sugeridas pelo Coach:</span>
                      <div className="flex flex-wrap gap-1">
                        {advice.suggestedDezenas.map(d => (
                          <span 
                            key={d} 
                            className="w-7 h-7 rounded-lg bg-white border border-slate-300 text-slate-900 font-black text-xs font-mono flex items-center justify-center shadow-2xs"
                          >
                            {d.toString().padStart(2, '0')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Destaque das Dezenas Mais e Menos Jogadas pelo Usuário */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Mais Jogadas pelo Usuário */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Flame size={15} className="text-rose-500" />
              <span>Suas Dezenas Favoritas</span>
            </h4>
            <span className="text-[11px] text-slate-400">Mais repetidas na carteira</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {topUserNumbers.map(({ num, count }) => (
              <div 
                key={num} 
                className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl"
              >
                <span className="font-mono font-black text-xs text-slate-900">
                  {num.toString().padStart(2, '0')}
                </span>
                <span className="text-[10px] text-purple-700 font-bold bg-purple-100 px-1.5 py-0.2 rounded-md">
                  {count}x
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Dezenas Ouro Ignoradas */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Award size={15} className="text-amber-500" />
              <span>Dezenas Campeãs da Caixa Ignoradas</span>
            </h4>
            <span className="text-[11px] text-slate-400">Nunca escolhidas por você</span>
          </div>

          {missingTopNumbers.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {missingTopNumbers.map(num => (
                <div 
                  key={num} 
                  className="flex items-center gap-1.5 bg-amber-50/70 border border-amber-200 px-3 py-1.5 rounded-xl"
                >
                  <span className="font-mono font-black text-xs text-amber-950">
                    {num.toString().padStart(2, '0')}
                  </span>
                  <span className="text-[10px] text-amber-800 font-semibold">
                    Top Frequência
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-emerald-700 font-medium">
              Excelente! Você já contemplou as principais dezenas históricas nas suas apostas.
            </p>
          )}
        </div>
      </div>

      {/* Botão de Ação para o Gerador com sugestões aplicadas */}
      {onNavigateToPlay && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Zap className="text-purple-600 shrink-0" size={20} />
            <div>
              <h4 className="text-xs font-bold text-purple-950">Pronto para recalibrar seus bilhetes?</h4>
              <p className="text-[11px] text-purple-800/80">
                Gere novas combinações equilibradas aplicando as regras recomendadas pelo IA Coach.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (onApplyCoachingToGenerator) {
                onApplyCoachingToGenerator('balanced');
              }
              onNavigateToPlay();
            }}
            className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <span>Aplicar e Abrir Gerador</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export default AICoachingPanel;
