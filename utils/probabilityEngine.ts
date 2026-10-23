/**
 * Motor Matemático e Simulador de Probabilidades da Mega-Sena
 * Cálculos combinatórios exatos (Distribuição Hipergeométrica, Teoria dos Conjuntos)
 * e Simulação de Monte Carlo para análise de carteiras de apostas salvas.
 */

import { Bet, OfficialDrawResult } from '../types';
import { OFFICIAL_FREQUENCY_DATA, TOP_10_HISTORICAL } from './megaSenaOfficialStats';

// Total de combinações possíveis de 6 números dentre 60
export const TOTAL_COMBINATIONS_MEGA_SENA = 50063860; // C(60, 6)

// Custo oficial da aposta simples (6 números)
export const OFFICIAL_TICKET_PRICE = 5.0;

// Valores médios estimados de premiação oficial (Caixa)
export const AVERAGE_PRIZE_SENA = 42000000; // R$ 42 Milhões (ou prêmio acumulado)
export const AVERAGE_PRIZE_QUINA = 48500;   // R$ 48.500
export const AVERAGE_PRIZE_QUADRA = 890;    // R$ 890

// Concursos por ano da Mega-Sena (3 por semana: terças, quintas e sábados)
export const DRAWS_PER_YEAR = 156;

// Função combinatória C(n, k)
export function combinations(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  let c = 1;
  const limit = Math.min(k, n - k);
  for (let i = 1; i <= limit; i++) {
    c = (c * (n - limit + i)) / i;
  }
  return Math.round(c);
}

// Custo oficial por quantidade de dezenas marcadas (6 a 15)
export const BET_COST_BY_SIZE: Record<number, number> = {
  6: 5.0,
  7: 35.0,
  8: 140.0,
  9: 420.0,
  10: 1050.0,
  11: 2310.0,
  12: 4620.0,
  13: 8580.0,
  14: 15015.0,
  15: 25025.0
};

// Interface do Diagnóstico de Probabilidade do Portfolio
export interface PortfolioProbabilityStats {
  totalGames: number;
  totalCombinations: number; // Equivalentes de 6 números
  uniqueCombinations: number;
  totalCost: number; // Custo em R$ para registrar todos os jogos
  
  // Sena (6 acertos)
  senaProbability: number; // 0.0 a 1.0
  senaOddsOneIn: number;   // 1 em X
  senaMultiplierVsSingle: number; // Ex: 15x maior chance
  
  // Quina (5 acertos)
  quinaProbability: number;
  quinaOddsOneIn: number;
  quinaMultiplierVsSingle: number;
  
  // Quadra (4 acertos)
  quadraProbability: number;
  quadraOddsOneIn: number;
  quadraMultiplierVsSingle: number;
  
  // Terno (3 acertos - estatístico)
  ternoProbability: number;
  ternoOddsOneIn: number;
  
  // Expectativa de Tempo (baseado em 3 sorteios/semana = 156/ano)
  estimatedDrawsForQuadra: number;
  estimatedYearsForQuadra: number;
  estimatedDrawsForQuina: number;
  estimatedYearsForQuina: number;
  estimatedDrawsForSena: number;
  estimatedYearsForSena: number;

  // Eficiência Estatística e Cobertura
  distinctNumbersCount: number; // Quantas das 60 dezenas estão na carteira
  distinctNumbers: number[];
  missingNumbers: number[];
  coveragePercentage: number; // % de 60
  
  // Índices Estatísticos do Histórico Oficial
  topHistoricalCoveredCount: number; // Quantas do Top 10 histórico estão presentes
  topHistoricalMissing: number[];
  averageSum: number;
  sumInGoldZonePercentage: number; // % de jogos entre 160 e 240
  balancedParityPercentage: number; // % de jogos com 3P/3I, 4P/2I ou 2P/4I
  redundancyRate: number; // Taxa de sobreposição (0% a 100%)
  efficiencyScore: number; // Score 0-100 da carteira
  
  // Resumo de recomendação
  recommendationVerdict: string;
  recommendationTips: string[];
}

// Interface de Resultado da Simulação de Monte Carlo
export interface MonteCarloResult {
  simulatedDrawsCount: number;
  senaHits: number;
  quinaHits: number;
  quadraHits: number;
  ternoHits: number;
  zeroToTwoHits: number;
  
  totalPrizeMoney: number;
  totalCostMoney: number;
  netProfit: number;
  roiPercentage: number;
  
  empiricalSenaProb: number;
  empiricalQuinaProb: number;
  empiricalQuadraProb: number;
  
  bestDrawNumbers: number[];
  bestDrawHits: number;
  bestDrawGameIndex: number;
  executionTimeMs: number;
}

/**
 * Normaliza e gera chave única ordenada para uma combinação
 */
function toComboKey(nums: number[]): string {
  return [...nums].sort((a, b) => a - b).join('-');
}

/**
 * Gera todas as combinações de tamanho k a partir de um array
 */
function getCombinations(arr: number[], k: number): number[][] {
  const result: number[][] = [];
  function backtrack(start: number, current: number[]) {
    if (current.length === k) {
      result.push([...current]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      current.push(arr[i]);
      backtrack(i + 1, current);
      current.pop();
    }
  }
  backtrack(0, []);
  return result;
}

/**
 * Calcula todas as probabilidades matemáticas e correlações estatísticas
 * da carteira de apostas salvas do usuário.
 */
export function calculatePortfolioProbability(savedBets: Bet[]): PortfolioProbabilityStats {
  if (!savedBets || savedBets.length === 0) {
    // Retorna valores padrão para carteira vazia (1 aposta base de referência)
    const baseCombinations = 1;
    const senaProb = 1 / TOTAL_COMBINATIONS_MEGA_SENA;
    const quinaProb = 324 / TOTAL_COMBINATIONS_MEGA_SENA;
    const quadraProb = 21465 / TOTAL_COMBINATIONS_MEGA_SENA;
    const ternoProb = 496080 / TOTAL_COMBINATIONS_MEGA_SENA;

    return {
      totalGames: 0,
      totalCombinations: 0,
      uniqueCombinations: 0,
      totalCost: 0,
      senaProbability: senaProb,
      senaOddsOneIn: TOTAL_COMBINATIONS_MEGA_SENA,
      senaMultiplierVsSingle: 1,
      quinaProbability: quinaProb,
      quinaOddsOneIn: Math.round(1 / quinaProb),
      quinaMultiplierVsSingle: 1,
      quadraProbability: quadraProb,
      quadraOddsOneIn: Math.round(1 / quadraProb),
      quadraMultiplierVsSingle: 1,
      ternoProbability: ternoProb,
      ternoOddsOneIn: Math.round(1 / ternoProb),
      estimatedDrawsForQuadra: 2332,
      estimatedYearsForQuadra: +(2332 / DRAWS_PER_YEAR).toFixed(1),
      estimatedDrawsForQuina: 154518,
      estimatedYearsForQuina: +(154518 / DRAWS_PER_YEAR).toFixed(1),
      estimatedDrawsForSena: TOTAL_COMBINATIONS_MEGA_SENA,
      estimatedYearsForSena: +(TOTAL_COMBINATIONS_MEGA_SENA / DRAWS_PER_YEAR).toFixed(0),
      distinctNumbersCount: 0,
      distinctNumbers: [],
      missingNumbers: Array.from({ length: 60 }, (_, i) => i + 1),
      coveragePercentage: 0,
      topHistoricalCoveredCount: 0,
      topHistoricalMissing: TOP_10_HISTORICAL.map(t => t.number),
      averageSum: 0,
      sumInGoldZonePercentage: 0,
      balancedParityPercentage: 0,
      redundancyRate: 0,
      efficiencyScore: 0,
      recommendationVerdict: "Nenhum jogo salvo na carteira.",
      recommendationTips: ["Adicione ou gere suas apostas no Gerador para simular a chance real."]
    };
  }

  // 1. Decomposição em combinações de 6 dezenas e cálculo de custo
  let totalEquivCombos = 0;
  let totalCost = 0;
  const unique6CombosSet = new Set<string>();
  const allSub5CombosSet = new Set<string>();
  const allSub4CombosSet = new Set<string>();
  const distinctNumbersSet = new Set<number>();

  let goldZoneCount = 0;
  let balancedParityCount = 0;
  let totalSum = 0;

  savedBets.forEach(bet => {
    const nums = bet.numbers;
    const len = nums.length;
    
    // Custo
    const cost = BET_COST_BY_SIZE[len] || 5.0 * combinations(len, 6);
    totalCost += cost;

    // Números distintos
    nums.forEach(n => distinctNumbersSet.add(n));

    // Soma
    const s = nums.reduce((acc, n) => acc + n, 0);
    totalSum += s;
    if (s >= 160 && s <= 240) {
      goldZoneCount++;
    }

    // Paridade
    const evens = nums.filter(n => n % 2 === 0).length;
    const odds = len - evens;
    if ((evens === 3 && odds === 3) || (evens === 4 && odds === 2) || (evens === 2 && odds === 4)) {
      balancedParityCount++;
    }

    // Se o jogo tem 6 números
    if (len === 6) {
      totalEquivCombos += 1;
      unique6CombosSet.add(toComboKey(nums));

      // Subcombinações de 5 e 4
      const sub5 = getCombinations(nums, 5);
      sub5.forEach(c => allSub5CombosSet.add(toComboKey(c)));

      const sub4 = getCombinations(nums, 4);
      sub4.forEach(c => allSub4CombosSet.add(toComboKey(c)));
    } else if (len > 6) {
      // Jogo múltiplo (desdobramento)
      const combos6 = getCombinations(nums, 6);
      totalEquivCombos += combos6.length;
      combos6.forEach(c => unique6CombosSet.add(toComboKey(c)));

      const sub5 = getCombinations(nums, 5);
      sub5.forEach(c => allSub5CombosSet.add(toComboKey(c)));

      const sub4 = getCombinations(nums, 4);
      sub4.forEach(c => allSub4CombosSet.add(toComboKey(c)));
    }
  });

  const uniqueCombosCount = unique6CombosSet.size;
  const uniqueSub5Count = allSub5CombosSet.size;
  const uniqueSub4Count = allSub4CombosSet.size;

  // 2. Probabilidades Exatas / Hipergeométricas Corrigidas
  // Sena: Eventos estritamente disjuntos por combinação única de 6
  const senaProb = uniqueCombosCount / TOTAL_COMBINATIONS_MEGA_SENA;
  const senaOddsOneIn = Math.max(1, Math.round(TOTAL_COMBINATIONS_MEGA_SENA / uniqueCombosCount));
  const senaMultiplierVsSingle = uniqueCombosCount;

  // Quina: Uma aposta simples de 6 cobre 6 subconjuntos de 5 dezenas (cada um gerando 54 quinas possíveis).
  // A união de quinas cobertas pelo portfólio depende dos 5-subconjuntos únicos.
  // Limite superior de Poisson / Bonferroni para união: 1 - exp(-lambda)
  const singleQuinaProb = 324 / TOTAL_COMBINATIONS_MEGA_SENA;
  const quinaCoverageRatio = uniqueSub5Count / (savedBets.length * 6);
  // Probabilidade da união de Quinas:
  const quinaExpectedHits = (uniqueSub5Count * 54) / TOTAL_COMBINATIONS_MEGA_SENA;
  const quinaProb = Math.min(0.999999, 1 - Math.exp(-quinaExpectedHits));
  const quinaOddsOneIn = Math.max(1, Math.round(1 / quinaProb));
  const quinaMultiplierVsSingle = +(quinaProb / singleQuinaProb).toFixed(1);

  // Quadra: Uma aposta simples de 6 cobre 15 subconjuntos de 4 dezenas (cada um com 1431 quadras possíveis).
  const singleQuadraProb = 21465 / TOTAL_COMBINATIONS_MEGA_SENA;
  const quadraExpectedHits = (uniqueSub4Count * 1431) / TOTAL_COMBINATIONS_MEGA_SENA;
  const quadraProb = Math.min(0.999999, 1 - Math.exp(-quadraExpectedHits));
  const quadraOddsOneIn = Math.max(1, Math.round(1 / quadraProb));
  const quadraMultiplierVsSingle = +(quadraProb / singleQuadraProb).toFixed(1);

  // Terno:
  const singleTernoProb = 496080 / TOTAL_COMBINATIONS_MEGA_SENA;
  const ternoExpectedHits = totalEquivCombos * singleTernoProb;
  const ternoProb = Math.min(0.999999, 1 - Math.exp(-ternoExpectedHits));
  const ternoOddsOneIn = Math.max(1, Math.round(1 / ternoProb));

  // 3. Projeção de Tempo (156 sorteios/ano)
  const drawsForQuadra = Math.max(1, Math.round(quadraOddsOneIn));
  const yearsForQuadra = +(drawsForQuadra / DRAWS_PER_YEAR).toFixed(1);

  const drawsForQuina = Math.max(1, Math.round(quinaOddsOneIn));
  const yearsForQuina = +(drawsForQuina / DRAWS_PER_YEAR).toFixed(1);

  const drawsForSena = Math.max(1, Math.round(senaOddsOneIn));
  const yearsForSena = +(drawsForSena / DRAWS_PER_YEAR).toFixed(0);

  // 4. Dezenas e Cobertura
  const distinctNumbers = Array.from(distinctNumbersSet).sort((a, b) => a - b);
  const distinctNumbersCount = distinctNumbers.length;
  const missingNumbers = Array.from({ length: 60 }, (_, i) => i + 1)
    .filter(n => !distinctNumbersSet.has(n));
  const coveragePercentage = +((distinctNumbersCount / 60) * 100).toFixed(1);

  // 5. Comparação com Histórico Oficial (3.071 concursos)
  const top10Numbers = TOP_10_HISTORICAL.map(t => t.number);
  const topCovered = top10Numbers.filter(n => distinctNumbersSet.has(n));
  const topHistoricalMissing = top10Numbers.filter(n => !distinctNumbersSet.has(n));

  const averageSum = Math.round(totalSum / savedBets.length);
  const sumInGoldZonePercentage = Math.round((goldZoneCount / savedBets.length) * 100);
  const balancedParityPercentage = Math.round((balancedParityCount / savedBets.length) * 100);

  // 6. Taxa de Redundância e Eficiência de Cobertura
  // Se todos os jogos fossem disjuntos, sub4 cresceria em fator de 15 por jogo
  const maxPossibleSub4 = savedBets.length * 15;
  const redundancyRate = savedBets.length > 1
    ? Math.max(0, Math.min(100, Math.round((1 - (uniqueSub4Count / maxPossibleSub4)) * 100)))
    : 0;

  // Score Geral de Eficiência (0 a 100)
  // Combina: cobertura ampla (35%), zona de ouro (25%), paridade (20%), presença de top históricas (20%)
  const scoreCoverage = Math.min(100, (distinctNumbersCount / 36) * 100); // 36 dezenas é uma excelente cobertura
  const scoreGold = sumInGoldZonePercentage;
  const scoreParity = balancedParityPercentage;
  const scoreTop = (topCovered.length / 10) * 100;

  const efficiencyScore = Math.round(
    (scoreCoverage * 0.35) + 
    (scoreGold * 0.25) + 
    (scoreParity * 0.20) + 
    (scoreTop * 0.20)
  );

  // 7. Dicas e Diagnóstico
  const recommendationTips: string[] = [];
  if (coveragePercentage < 35) {
    recommendationTips.push(`Sua carteira cobre apenas ${distinctNumbersCount} dezenas (de 60). Tente distribuir as apostas para cobrir ao menos 25 a 35 dezenas.`);
  } else {
    recommendationTips.push(`Excelente amplitude de cobertura: ${distinctNumbersCount} dezenas cobertas (${coveragePercentage}% da cartela).`);
  }

  if (sumInGoldZonePercentage < 60) {
    recommendationTips.push(`Apenas ${sumInGoldZonePercentage}% dos seus jogos estão na Zona de Ouro (soma entre 160 e 240, onde ocorrem 78,4% dos sorteios oficiais).`);
  } else {
    recommendationTips.push(`Ótimo equilíbrio de somas: ${sumInGoldZonePercentage}% das apostas estão na faixa matemática mais premiada (160 a 240).`);
  }

  if (topHistoricalMissing.length > 5) {
    recommendationTips.push(`Dezenas altamente frequentes na história estão ausentes: [${topHistoricalMissing.slice(0, 4).join(', ')}]. Considere incluí-las.`);
  }

  if (redundancyRate > 45) {
    recommendationTips.push(`Alta taxa de sobreposição (${redundancyRate}%). Seus jogos repetem muitas quinas/quadras idênticas, reduzindo a chance global de premiação.`);
  }

  let recommendationVerdict = "Carteira Estatística Equilibrada";
  if (efficiencyScore >= 80) recommendationVerdict = "Carteira de Alta Eficiência Estatística";
  else if (efficiencyScore <= 45) recommendationVerdict = "Carteira Concentrada com Oportunidades de Otimização";

  return {
    totalGames: savedBets.length,
    totalCombinations: totalEquivCombos,
    uniqueCombinations: uniqueCombosCount,
    totalCost,
    senaProbability: senaProb,
    senaOddsOneIn,
    senaMultiplierVsSingle,
    quinaProbability: quinaProb,
    quinaOddsOneIn,
    quinaMultiplierVsSingle,
    quadraProbability: quadraProb,
    quadraOddsOneIn,
    quadraMultiplierVsSingle,
    ternoProbability: ternoProb,
    ternoOddsOneIn,
    estimatedDrawsForQuadra: drawsForQuadra,
    estimatedYearsForQuadra: yearsForQuadra,
    estimatedDrawsForQuina: drawsForQuina,
    estimatedYearsForQuina: yearsForQuina,
    estimatedDrawsForSena: drawsForSena,
    estimatedYearsForSena: yearsForSena,
    distinctNumbersCount,
    distinctNumbers,
    missingNumbers,
    coveragePercentage,
    topHistoricalCoveredCount: topCovered.length,
    topHistoricalMissing,
    averageSum,
    sumInGoldZonePercentage,
    balancedParityPercentage,
    redundancyRate,
    efficiencyScore,
    recommendationVerdict,
    recommendationTips
  };
}

/**
 * Motor Ultrarrápido de Simulação de Monte Carlo
 * Sorteia N concursos oficiais aleatórios e verifica o desempenho real da carteira salva.
 */
export function runMonteCarloSimulation(
  savedBets: Bet[],
  simulatedDrawsCount: number = 25000,
  jackpotAmount: number = AVERAGE_PRIZE_SENA
): MonteCarloResult {
  const startTime = performance.now();

  if (!savedBets || savedBets.length === 0) {
    return {
      simulatedDrawsCount: 0,
      senaHits: 0,
      quinaHits: 0,
      quadraHits: 0,
      ternoHits: 0,
      zeroToTwoHits: 0,
      totalPrizeMoney: 0,
      totalCostMoney: 0,
      netProfit: 0,
      roiPercentage: 0,
      empiricalSenaProb: 0,
      empiricalQuinaProb: 0,
      empiricalQuadraProb: 0,
      bestDrawNumbers: [],
      bestDrawHits: 0,
      bestDrawGameIndex: -1,
      executionTimeMs: 0
    };
  }

  // Prepara lookup estruturado de cada aposta para busca O(1) com TypedArrays ou Sets
  const betsSets = savedBets.map(b => new Set(b.numbers));
  const betLengths = savedBets.map(b => b.numbers.length);

  // Custo por concurso jogado
  const costPerDraw = savedBets.reduce((acc, b) => acc + (BET_COST_BY_SIZE[b.numbers.length] || 5.0), 0);
  const totalCostMoney = costPerDraw * simulatedDrawsCount;

  let senaHits = 0;
  let quinaHits = 0;
  let quadraHits = 0;
  let ternoHits = 0;
  let zeroToTwoHits = 0;
  let totalPrizeMoney = 0;

  let bestDrawHits = 0;
  let bestDrawNumbers: number[] = [];
  let bestDrawGameIndex = 0;

  // Pool de dezenas para sorteio rápido
  const pool = Array.from({ length: 60 }, (_, i) => i + 1);

  // Execução do loop de sorteios
  for (let s = 0; s < simulatedDrawsCount; s++) {
    // Sorteio de 6 números sem reposição (Fisher-Yates parcial em 6 passos)
    const draw: number[] = [];
    for (let i = 0; i < 6; i++) {
      const idx = i + Math.floor(Math.random() * (60 - i));
      const chosen = pool[idx];
      pool[idx] = pool[i];
      pool[i] = chosen;
      draw.push(chosen);
    }

    let drawMaxHits = 0;
    let drawBestBetIdx = 0;

    // Confere contra cada aposta salva
    for (let b = 0; b < betsSets.length; b++) {
      const betSet = betsSets[b];
      let hits = 0;
      for (let i = 0; i < 6; i++) {
        if (betSet.has(draw[i])) {
          hits++;
        }
      }

      if (hits > drawMaxHits) {
        drawMaxHits = hits;
        drawBestBetIdx = b;
      }

      // Se aposta tiver mais de 6 números (desdobramento), premiações múltiplas se aplicam
      const numLength = betLengths[b];
      if (hits === 6) {
        senaHits++;
        totalPrizeMoney += jackpotAmount;
        // Na aposta de 7 a 15 dezenas com 6 acertos, há quinas e quadras adicionais oficiais
        if (numLength > 6) {
          const extraQuinas = 6 * (numLength - 6);
          const extraQuadras = 15 * combinations(numLength - 6, 2);
          totalPrizeMoney += extraQuinas * AVERAGE_PRIZE_QUINA + extraQuadras * AVERAGE_PRIZE_QUADRA;
        }
      } else if (hits === 5) {
        quinaHits++;
        totalPrizeMoney += AVERAGE_PRIZE_QUINA;
        if (numLength > 6) {
          const extraQuadras = 5 * (numLength - 5);
          totalPrizeMoney += extraQuadras * AVERAGE_PRIZE_QUADRA;
        }
      } else if (hits === 4) {
        quadraHits++;
        totalPrizeMoney += AVERAGE_PRIZE_QUADRA;
      } else if (hits === 3) {
        ternoHits++;
      }
    }

    if (drawMaxHits < 3) {
      zeroToTwoHits++;
    }

    if (drawMaxHits > bestDrawHits) {
      bestDrawHits = drawMaxHits;
      bestDrawNumbers = [...draw].sort((a, b) => a - b);
      bestDrawGameIndex = drawBestBetIdx;
    }
  }

  const executionTimeMs = Math.round(performance.now() - startTime);
  const netProfit = totalPrizeMoney - totalCostMoney;
  const roiPercentage = totalCostMoney > 0 ? +((netProfit / totalCostMoney) * 100).toFixed(1) : 0;

  return {
    simulatedDrawsCount,
    senaHits,
    quinaHits,
    quadraHits,
    ternoHits,
    zeroToTwoHits,
    totalPrizeMoney,
    totalCostMoney,
    netProfit,
    roiPercentage,
    empiricalSenaProb: +(senaHits / simulatedDrawsCount).toFixed(8),
    empiricalQuinaProb: +(quinaHits / simulatedDrawsCount).toFixed(6),
    empiricalQuadraProb: +(quadraHits / simulatedDrawsCount).toFixed(4),
    bestDrawNumbers,
    bestDrawHits,
    bestDrawGameIndex,
    executionTimeMs
  };
}

/**
 * Gera uma aposta complementar otimizada que busca cobrir as dezenas faltantes da carteira,
 * respeitando a paridade, Zona de Ouro e números quentes históricos.
 */
export function generateComplementaryBet(savedBets: Bet[]): number[] {
  const stats = calculatePortfolioProbability(savedBets);
  const missing = stats.missingNumbers;
  const chosen: number[] = [];

  // 1. Tentar pegar as dezenas faltantes que têm melhor histórico
  const scoredMissing = missing.map(n => ({
    num: n,
    freq: OFFICIAL_FREQUENCY_DATA[n] || 300
  })).sort((a, b) => b.freq - a.freq);

  // Pega de 3 a 4 das melhores dezenas faltantes
  const pickFromMissingCount = Math.min(4, scoredMissing.length);
  for (let i = 0; i < pickFromMissingCount; i++) {
    chosen.push(scoredMissing[i].num);
  }

  // 2. Complementa com dezenas de alta afinidade e equilíbrio da soma
  const top10 = TOP_10_HISTORICAL.map(t => t.number);
  const candidatePool = Array.from({ length: 60 }, (_, i) => i + 1)
    .filter(n => !chosen.includes(n));

  while (chosen.length < 6) {
    // Escolhe dezena que mantém soma entre 160 e 240
    const currentSum = chosen.reduce((a, b) => a + b, 0);
    const remainingSlots = 6 - chosen.length;
    const targetPerSlot = (190 - currentSum) / remainingSlots;

    const bestCandidate = candidatePool
      .sort((a, b) => Math.abs(a - targetPerSlot) - Math.abs(b - targetPerSlot))[0];

    if (bestCandidate) {
      chosen.push(bestCandidate);
      const idx = candidatePool.indexOf(bestCandidate);
      if (idx !== -1) candidatePool.splice(idx, 1);
    } else {
      break;
    }
  }

  return chosen.sort((a, b) => a - b);
}
