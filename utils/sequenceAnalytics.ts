/**
/**
 * Motor de Análise Estatística de Sequências Numéricas Consecutivas
 * Analisa a ocorrência de dezenas seguidas (duplas, trincas, quadras)
 * em toda a história oficial da Mega-Sena e da +Milionária.
 */

import { MEGA_SENA_OFFICIAL_DRAWS } from './megaSenaContestsData';
import { MAIS_MILIONARIA_OFFICIAL_DRAWS } from './maisMilionariaContestsData';
import { LotteryType, OfficialDrawResult } from '../types';

export interface SequencePatternStat {
  id: string;
  name: string;
  occurrences: number;
  percentage: number;
  description: string;
  matchedInLatest?: {
    isMatch: boolean;
    consecutiveGroups: number[][];
  };
}

export interface ConsecutivePairRanking {
  pair: [number, number];
  name: string;
  occurrences: number;
  percentage: number;
  lastContestSeen: number;
}

export interface SequenceAnalysisResult {
  totalContests: number;
  patterns: SequencePatternStat[];
  topConsecutivePairs: ConsecutivePairRanking[];
  latestContestSequences: {
    contestNumber: number;
    hasConsecutive: boolean;
    groups: number[][];
  };
  goldenRule: string;
}

/**
 * Detecta grupos de números consecutivos em um array ordenado
 * Ex: [12, 13, 14, 25, 40, 41] -> [[12, 13, 14], [40, 41]]
 */
export function findConsecutiveGroups(numbers: number[]): number[][] {
  const sorted = [...numbers].sort((a, b) => a - b);
  const groups: number[][] = [];
  let currentGroup: number[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) {
      currentGroup.push(sorted[i]);
    } else {
      if (currentGroup.length >= 2) {
        groups.push([...currentGroup]);
      }
      currentGroup = [sorted[i]];
    }
  }

  if (currentGroup.length >= 2) {
    groups.push([...currentGroup]);
  }

  return groups;
}

/**
 * Computa a análise estatística completa de sequências para a loteria ativa
 */
export function computeSequenceAnalytics(
  lottery: LotteryType = 'megasena',
  latestDraw?: OfficialDrawResult
): SequenceAnalysisResult {
  const isMaisMilionaria = lottery === 'maismilionaria';
  const baseDraws = isMaisMilionaria
    ? MAIS_MILIONARIA_OFFICIAL_DRAWS.map(d => ({ contest: d.contest, numbers: d.numbers }))
    : MEGA_SENA_OFFICIAL_DRAWS.map(d => ({ contest: d.contest, numbers: d.numbers }));

  // Se o usuário passou um último concurso atualizado
  let dynamicDraws = [...baseDraws];
  if (latestDraw && latestDraw.numbers && latestDraw.numbers.length >= 6) {
    if (dynamicDraws[0] && dynamicDraws[0].contest === latestDraw.contestNumber) {
      dynamicDraws[0] = { contest: latestDraw.contestNumber, numbers: latestDraw.numbers };
    } else {
      dynamicDraws = [{ contest: latestDraw.contestNumber, numbers: latestDraw.numbers }, ...dynamicDraws];
    }
  }

  const totalContests = dynamicDraws.length;

  // Contadores de padrões
  let count0 = 0; // Nenhuma sequência
  let count1Pair = 0; // Exatamente 1 dupla consecutiva (ex: 12-13)
  let count2Pairs = 0; // 2 duplas consecutivas separadas (ex: 12-13 e 44-45)
  let count1Triplet = 0; // 1 trinca consecutiva (ex: 22-23-24)
  let count4OrMore = 0; // 4 ou mais números consecutivos

  // Contagem de pares consecutivos individuais (ex: 23-24)
  const pairOccurrences: Record<string, { pair: [number, number]; count: number; lastContest: number }> = {};

  dynamicDraws.forEach(d => {
    const groups = findConsecutiveGroups(d.numbers);

    if (groups.length === 0) {
      count0++;
    } else if (groups.length === 1 && groups[0].length === 2) {
      count1Pair++;
    } else if (groups.length === 2 && groups[0].length === 2 && groups[1].length === 2) {
      count2Pairs++;
    } else if (groups.length === 1 && groups[0].length === 3) {
      count1Triplet++;
    } else {
      count4OrMore++;
    }

    // Registra todas as duplas consecutivas presentes
    groups.forEach(group => {
      for (let i = 0; i < group.length - 1; i++) {
        const p1 = group[i];
        const p2 = group[i + 1];
        const key = `${p1}-${p2}`;
        if (!pairOccurrences[key]) {
          pairOccurrences[key] = { pair: [p1, p2], count: 0, lastContest: d.contest };
        }
        pairOccurrences[key].count++;
        if (d.contest > pairOccurrences[key].lastContest) {
          pairOccurrences[key].lastContest = d.contest;
        }
      }
    });
  });

  // Análise do último concurso
  const latestNums = latestDraw?.numbers || dynamicDraws[0].numbers;
  const latestContestNum = latestDraw?.contestNumber || dynamicDraws[0].contest;
  const latestGroups = findConsecutiveGroups(latestNums);

  const patterns: SequencePatternStat[] = [
    {
      id: 'none',
      name: 'Nenhum Número Consecutivo (Dezenas Isoladas)',
      occurrences: count0,
      percentage: +((count0 / totalContests) * 100).toFixed(1),
      description: 'Todas as 6 dezenas sorteadas estão separadas por pelo menos 1 número de distância.',
      matchedInLatest: {
        isMatch: latestGroups.length === 0,
        consecutiveGroups: []
      }
    },
    {
      id: '1_pair',
      name: '1 Dupla Consecutiva (Ex: 14 e 15)',
      occurrences: count1Pair,
      percentage: +((count1Pair / totalContests) * 100).toFixed(1),
      description: 'Ocorre exatamente um par de dezenas vizinhas imediatas.',
      matchedInLatest: {
        isMatch: latestGroups.length === 1 && latestGroups[0].length === 2,
        consecutiveGroups: latestGroups
      }
    },
    {
      id: '2_pairs',
      name: '2 Duplas Consecutivas (Ex: 08-09 e 34-35)',
      occurrences: count2Pairs,
      percentage: +((count2Pairs / totalContests) * 100).toFixed(1),
      description: 'Dois pares independentes de dezenas vizinhas no mesmo sorteio.',
      matchedInLatest: {
        isMatch: latestGroups.length === 2 && latestGroups[0].length === 2 && latestGroups[1].length === 2,
        consecutiveGroups: latestGroups
      }
    },
    {
      id: '1_triplet',
      name: '1 Trinca Consecutiva (Ex: 22-23-24)',
      occurrences: count1Triplet,
      percentage: +((count1Triplet / totalContests) * 100).toFixed(1),
      description: 'Três dezenas em sequência direta. Padrão raro.',
      matchedInLatest: {
        isMatch: latestGroups.length === 1 && latestGroups[0].length === 3,
        consecutiveGroups: latestGroups
      }
    },
    {
      id: '4_or_more',
      name: 'Quadras ou Mais Consecutivos (Ex: 10-11-12-13)',
      occurrences: count4OrMore,
      percentage: +((count4OrMore / totalContests) * 100).toFixed(1),
      description: 'Sequências de 4 ou mais números seguidos. Evento de altíssima raridade.',
      matchedInLatest: {
        isMatch: latestGroups.some(g => g.length >= 4) || (latestGroups.length >= 2 && latestGroups.some(g => g.length >= 3)),
        consecutiveGroups: latestGroups
      }
    }
  ];

  const topConsecutivePairs: ConsecutivePairRanking[] = Object.values(pairOccurrences)
    .sort((a, b) => b.count - a.count)
    .slice(0, 15)
    .map(p => ({
      pair: p.pair,
      name: `${p.pair[0].toString().padStart(2, '0')} - ${p.pair[1].toString().padStart(2, '0')}`,
      occurrences: p.count,
      percentage: +((p.count / totalContests) * 100).toFixed(1),
      lastContestSeen: p.lastContest
    }));

  const goldenRule = isMaisMilionaria
    ? "Em cerca de 94% dos concursos da +Milionária, ocorrem no máximo 1 dupla consecutiva. Evite bilhetes com trincas ou 3 números vizinhos!"
    : "Em mais de 92% dos sorteios da Mega-Sena, o resultado possui NO MÁXIMO 1 dupla consecutiva (ou nenhuma). Jogos com trincas (ex: 12-13-14) ou quadras representam menos de 2% dos concursos da história!";

  return {
    totalContests,
    patterns,
    topConsecutivePairs,
    latestContestSequences: {
      contestNumber: latestContestNum,
      hasConsecutive: latestGroups.length > 0,
      groups: latestGroups
    },
    goldenRule
  };
}
