/**
 * Motor Matemático e Simulador de Probabilidades Multi-Loterias da Caixa
 * Suporte completo a Mega-Sena, +Milionária e Lotofácil.
 * Cálculos combinatórios exatos (Distribuição Hipergeométrica, Teoria dos Conjuntos),
 * Filtro de Plausibilidade e Simulação de Desempenho.
 */

import { Bet, OfficialDrawResult, LotteryType } from '../types';
import { OFFICIAL_FREQUENCY_DATA, TOP_10_HISTORICAL } from './megaSenaOfficialStats';
import { MAIS_MILIONARIA_FREQUENCY_DATA, TOP_10_MAIS_MILIONARIA } from './maisMilionariaOfficialStats';
import { LOTOFACIL_FREQUENCY_DATA, TOP_10_LOTOFACIL, LOTOFACIL_FRAME } from './lotofacilRules';
import { isGamePlausible, analyzeGamePlausibility } from './plausibilityFilter';

// Totais combinatórios exatos do universo de cada loteria
export const TOTAL_COMBINATIONS_MEGA_SENA = 50063860; // C(60, 6)
export const TOTAL_COMBINATIONS_MAIS_MILIONARIA = 15890700; // C(50, 6)
export const TOTAL_COMBINATIONS_MAIS_MILIONARIA_JACKPOT = 238360500; // C(50, 6) * C(6, 2)
export const TOTAL_COMBINATIONS_LOTOFACIL = 3268760; // C(25, 15)

// Custos oficiais das apostas simples (Caixa Econômica Federal)
export const OFFICIAL_TICKET_PRICE_MEGA_SENA = 5.0;
export const OFFICIAL_TICKET_PRICE_MAIS_MILIONARIA = 6.0;
export const OFFICIAL_TICKET_PRICE_LOTOFACIL = 3.0;

// Valores médios estimados de premiação oficial (Caixa)
export const AVERAGE_PRIZE_SENA = 42000000; // R$ 42 Milhões
export const AVERAGE_PRIZE_QUINA = 48500;   // R$ 48.500
export const AVERAGE_PRIZE_QUADRA = 890;    // R$ 890

export const AVERAGE_PRIZE_MAIS_MILIONARIA_JACKPOT = 25000000; // R$ 25 Milhões
export const AVERAGE_PRIZE_MAIS_MILIONARIA_FAIXA2 = 180000;   // 6 acertos + 1 ou 0 trevo
export const AVERAGE_PRIZE_MAIS_MILIONARIA_FAIXA3 = 35000;    // 5 acertos + 2 trevos

export const AVERAGE_PRIZE_LOTOFACIL_15 = 1800000; // ~R$ 1.8 Milhão
export const AVERAGE_PRIZE_LOTOFACIL_14 = 1500;    // ~R$ 1.500
export const FIXED_PRIZE_LOTOFACIL_13 = 30;        // Fixo R$ 30,00
export const FIXED_PRIZE_LOTOFACIL_12 = 12;        // Fixo R$ 12,00
export const FIXED_PRIZE_LOTOFACIL_11 = 6;         // Fixo R$ 6,00

// Concursos por ano de cada modalidade
export const DRAWS_PER_YEAR_MEGA_SENA = 156;       // 3 por semana (ter, qui, sab)
export const DRAWS_PER_YEAR_MAIS_MILIONARIA = 104; // 2 por semana (qua, sab)
export const DRAWS_PER_YEAR_LOTOFACIL = 312;       // 6 por semana (seg a sab)

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

// Custo oficial da Mega-Sena por quantidade de dezenas marcadas (6 a 15)
export const BET_COST_BY_SIZE_MEGA: Record<number, number> = {
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

// Custo oficial da Lotofácil por quantidade de dezenas (15 a 20)
export const BET_COST_BY_SIZE_LOTOFACIL: Record<number, number> = {
  15: 3.0,
  16: 48.0,
  17: 408.0,
  18: 2448.0,
  19: 11628.0,
  20: 46512.0
};

// Interface do Diagnóstico de Probabilidade do Portfolio
export interface PortfolioProbabilityStats {
  lottery: LotteryType;
  totalGames: number;
  totalCombinations: number; // Equivalentes de aposta simples
  uniqueCombinations: number;
  totalCost: number; // Custo em R$ para registrar todos os jogos

  // Nomes e Odds Dinâmicos da Loteria Ativa
  tier1Name: string;
  tier1OddsOneIn: number;
  tier1Probability: number;
  tier1MultiplierVsSingle: number;
  tier1EstimatedPrize: string;

  tier2Name: string;
  tier2OddsOneIn: number;
  tier2Probability: number;
  tier2MultiplierVsSingle: number;
  tier2EstimatedPrize: string;

  tier3Name: string;
  tier3OddsOneIn: number;
  tier3Probability: number;
  tier3MultiplierVsSingle: number;
  tier3EstimatedPrize: string;

  tier4Name?: string;
  tier4OddsOneIn?: number;
  tier4Probability?: number;
  tier4EstimatedPrize?: string;

  tier5Name?: string;
  tier5OddsOneIn?: number;
  tier5Probability?: number;
  tier5EstimatedPrize?: string;

  anyPrizeOddsOneIn: number;
  anyPrizeProbability: number;

  // Campos legados para compatibilidade reversa
  senaProbability: number;
  senaOddsOneIn: number;
  senaMultiplierVsSingle: number;
  quinaProbability: number;
  quinaOddsOneIn: number;
  quinaMultiplierVsSingle: number;
  quadraProbability: number;
  quadraOddsOneIn: number;
  quadraMultiplierVsSingle: number;
  ternoProbability: number;
  ternoOddsOneIn: number;

  // Expectativa de Tempo
  estimatedDrawsForQuadra: number;
  estimatedYearsForQuadra: number;
  estimatedDrawsForQuina: number;
  estimatedYearsForQuina: number;
  estimatedDrawsForSena: number;
  estimatedYearsForSena: number;

  // Eficiência Estatística e Cobertura
  distinctNumbersCount: number;
  distinctNumbers: number[];
  missingNumbers: number[];
  coveragePercentage: number;
  maxUniverse: number;

  // Índices Estatísticos do Histórico Oficial
  topHistoricalCoveredCount: number;
  topHistoricalMissing: number[];
  averageSum: number;
  sumInGoldZonePercentage: number;
  balancedParityPercentage: number;
  redundancyRate: number;
  efficiencyScore: number;

  // Diagnóstico de Plausibilidade da Carteira
  plausibleGamesCount: number;
  anomalousGamesCount: number;
  plausibilityPercentage: number;

  // Resumo de recomendação
  recommendationVerdict: string;
  recommendationTips: string[];
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
 * da carteira de apostas salvas para Mega-Sena, +Milionária ou Lotofácil.
 */
export function calculatePortfolioProbability(
  savedBets: Bet[], 
  lottery: LotteryType = 'megasena'
): PortfolioProbabilityStats {
  const isLotofacil = lottery === 'lotofacil';
  const isMaisMilionaria = lottery === 'maismilionaria';

  // Parâmetros do Universo por Loteria
  let maxUniverse = 60;
  let simpleBetSize = 6;
  let singleTicketPrice = OFFICIAL_TICKET_PRICE_MEGA_SENA;
  let drawsPerYear = DRAWS_PER_YEAR_MEGA_SENA;
  let totalCombosUniverse = TOTAL_COMBINATIONS_MEGA_SENA;
  let goldMin = 160;
  let goldMax = 240;
  let top10List = TOP_10_HISTORICAL.map(t => t.number);

  if (isLotofacil) {
    maxUniverse = 25;
    simpleBetSize = 15;
    singleTicketPrice = OFFICIAL_TICKET_PRICE_LOTOFACIL;
    drawsPerYear = DRAWS_PER_YEAR_LOTOFACIL;
    totalCombosUniverse = TOTAL_COMBINATIONS_LOTOFACIL; // 3.268.760
    goldMin = 180;
    goldMax = 220;
    top10List = TOP_10_LOTOFACIL.map(t => t.number);
  } else if (isMaisMilionaria) {
    maxUniverse = 50;
    simpleBetSize = 6;
    singleTicketPrice = OFFICIAL_TICKET_PRICE_MAIS_MILIONARIA;
    drawsPerYear = DRAWS_PER_YEAR_MAIS_MILIONARIA;
    totalCombosUniverse = TOTAL_COMBINATIONS_MAIS_MILIONARIA_JACKPOT; // 238.360.500
    goldMin = 120;
    goldMax = 185;
    top10List = TOP_10_MAIS_MILIONARIA.map(t => t.number);
  }

  // Odds oficiais de 1 aposta simples
  const singleOddsTier1 = isLotofacil ? 3268760 : (isMaisMilionaria ? 238360500 : 50063860);
  const singleOddsTier2 = isLotofacil ? 21791 : (isMaisMilionaria ? 19863375 : 154518);
  const singleOddsTier3 = isLotofacil ? 691 : (isMaisMilionaria ? 5959013 : 2332);
  const singleOddsTier4 = isLotofacil ? 59 : (isMaisMilionaria ? 502870 : 0);
  const singleOddsTier5 = isLotofacil ? 11 : (isMaisMilionaria ? 32742 : 0);
  const singleAnyPrizeOdds = isLotofacil ? 3.26 : (isMaisMilionaria ? 17.0 : 2298.0);

  // Formata moeda
  const formatBRL = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

  // Nomes de faixas
  const tier1Name = isLotofacil ? '15 Acertos (Prêmio Máximo)' : (isMaisMilionaria ? 'Faixa 1 (6 Dezenas + 2 Trevos)' : 'Sena (6 acertos)');
  const tier2Name = isLotofacil ? '14 Acertos' : (isMaisMilionaria ? 'Faixa 2 (6 Dezenas + 1/0 Trevo)' : 'Quina (5 acertos)');
  const tier3Name = isLotofacil ? '13 Acertos (R$ 30 fixo)' : (isMaisMilionaria ? 'Faixa 3 (5 Dezenas + 2 Trevos)' : 'Quadra (4 acertos)');
  const tier4Name = isLotofacil ? '12 Acertos (R$ 12 fixo)' : (isMaisMilionaria ? 'Faixa 4 (5 Dezenas + 1/0 Trevo)' : undefined);
  const tier5Name = isLotofacil ? '11 Acertos (R$ 6 fixo)' : (isMaisMilionaria ? 'Faixa 5 (4 Dezenas + 2 Trevos)' : undefined);

  const tier1Prize = isLotofacil ? formatBRL(AVERAGE_PRIZE_LOTOFACIL_15) : (isMaisMilionaria ? formatBRL(AVERAGE_PRIZE_MAIS_MILIONARIA_JACKPOT) : formatBRL(AVERAGE_PRIZE_SENA));
  const tier2Prize = isLotofacil ? formatBRL(AVERAGE_PRIZE_LOTOFACIL_14) : (isMaisMilionaria ? formatBRL(AVERAGE_PRIZE_MAIS_MILIONARIA_FAIXA2) : formatBRL(AVERAGE_PRIZE_QUINA));
  const tier3Prize = isLotofacil ? formatBRL(FIXED_PRIZE_LOTOFACIL_13) : (isMaisMilionaria ? formatBRL(AVERAGE_PRIZE_MAIS_MILIONARIA_FAIXA3) : formatBRL(AVERAGE_PRIZE_QUADRA));

  if (!savedBets || savedBets.length === 0) {
    const senaProb = 1 / singleOddsTier1;
    const quinaProb = 1 / singleOddsTier2;
    const quadraProb = 1 / singleOddsTier3;
    const ternoProb = isLotofacil ? (1 / 59) : (isMaisMilionaria ? (1 / 32742) : (20 * combinations(maxUniverse - 6, 3)) / TOTAL_COMBINATIONS_MEGA_SENA);

    return {
      lottery,
      totalGames: 0,
      totalCombinations: 0,
      uniqueCombinations: 0,
      totalCost: 0,
      tier1Name,
      tier1OddsOneIn: singleOddsTier1,
      tier1Probability: senaProb,
      tier1MultiplierVsSingle: 1,
      tier1EstimatedPrize: tier1Prize,
      tier2Name,
      tier2OddsOneIn: singleOddsTier2,
      tier2Probability: quinaProb,
      tier2MultiplierVsSingle: 1,
      tier2EstimatedPrize: tier2Prize,
      tier3Name,
      tier3OddsOneIn: singleOddsTier3,
      tier3Probability: quadraProb,
      tier3MultiplierVsSingle: 1,
      tier3EstimatedPrize: tier3Prize,
      tier4Name,
      tier4OddsOneIn: singleOddsTier4,
      tier4Probability: singleOddsTier4 ? (1 / singleOddsTier4) : 0,
      tier4EstimatedPrize: isLotofacil ? 'R$ 12,00' : 'R$ 1.800',
      tier5Name,
      tier5OddsOneIn: singleOddsTier5,
      tier5Probability: singleOddsTier5 ? (1 / singleOddsTier5) : 0,
      tier5EstimatedPrize: isLotofacil ? 'R$ 6,00' : 'R$ 250',
      anyPrizeOddsOneIn: Math.round(singleAnyPrizeOdds),
      anyPrizeProbability: 1 / singleAnyPrizeOdds,
      senaProbability: senaProb,
      senaOddsOneIn: singleOddsTier1,
      senaMultiplierVsSingle: 1,
      quinaProbability: quinaProb,
      quinaOddsOneIn: singleOddsTier2,
      quinaMultiplierVsSingle: 1,
      quadraProbability: quadraProb,
      quadraOddsOneIn: singleOddsTier3,
      quadraMultiplierVsSingle: 1,
      ternoProbability: ternoProb,
      ternoOddsOneIn: Math.round(1 / ternoProb),
      estimatedDrawsForQuadra: singleOddsTier3,
      estimatedYearsForQuadra: +(singleOddsTier3 / drawsPerYear).toFixed(1),
      estimatedDrawsForQuina: singleOddsTier2,
      estimatedYearsForQuina: +(singleOddsTier2 / drawsPerYear).toFixed(1),
      estimatedDrawsForSena: singleOddsTier1,
      estimatedYearsForSena: +(singleOddsTier1 / drawsPerYear).toFixed(0),
      distinctNumbersCount: 0,
      distinctNumbers: [],
      missingNumbers: Array.from({ length: maxUniverse }, (_, i) => i + 1),
      coveragePercentage: 0,
      maxUniverse,
      topHistoricalCoveredCount: 0,
      topHistoricalMissing: top10List,
      averageSum: 0,
      sumInGoldZonePercentage: 0,
      balancedParityPercentage: 0,
      redundancyRate: 0,
      efficiencyScore: 0,
      plausibleGamesCount: 0,
      anomalousGamesCount: 0,
      plausibilityPercentage: 100,
      recommendationVerdict: `Nenhum jogo salvo na carteira de ${isLotofacil ? 'Lotofácil' : (isMaisMilionaria ? '+Milionária' : 'Mega-Sena')}.`,
      recommendationTips: ["Adicione ou gere suas apostas no Gerador para simular a chance real."]
    };
  }

  // 1. Processa cada aposta salva
  let totalEquivCombos = 0;
  let totalCost = 0;
  const uniqueCombosSet = new Set<string>();
  const distinctNumbersSet = new Set<number>();

  let goldZoneCount = 0;
  let balancedParityCount = 0;
  let totalSum = 0;
  let plausibleCount = 0;

  savedBets.forEach(bet => {
    const nums = bet.numbers;
    const len = nums.length;

    // Plausibilidade
    if (isGamePlausible(nums, lottery)) {
      plausibleCount++;
    }

    // Custo e equivalências combinatórias
    if (isLotofacil) {
      const equiv = combinations(len, 15);
      totalEquivCombos += equiv;
      const cost = BET_COST_BY_SIZE_LOTOFACIL[len] || (equiv * OFFICIAL_TICKET_PRICE_LOTOFACIL);
      totalCost += cost;

      if (len === 15) {
        uniqueCombosSet.add(toComboKey(nums));
      } else if (len > 15) {
        const sub15 = getCombinations(nums, 15);
        sub15.forEach(c => uniqueCombosSet.add(toComboKey(c)));
      }
    } else if (isMaisMilionaria) {
      const equiv = combinations(len, 6);
      totalEquivCombos += equiv;
      const cost = equiv * OFFICIAL_TICKET_PRICE_MAIS_MILIONARIA;
      totalCost += cost;

      if (len === 6) {
        uniqueCombosSet.add(toComboKey(nums));
      } else if (len > 6) {
        const sub6 = getCombinations(nums, 6);
        sub6.forEach(c => uniqueCombosSet.add(toComboKey(c)));
      }
    } else {
      // Mega-Sena
      const equiv = combinations(len, 6);
      totalEquivCombos += equiv;
      const cost = BET_COST_BY_SIZE_MEGA[len] || (equiv * OFFICIAL_TICKET_PRICE_MEGA_SENA);
      totalCost += cost;

      if (len === 6) {
        uniqueCombosSet.add(toComboKey(nums));
      } else if (len > 6) {
        const sub6 = getCombinations(nums, 6);
        sub6.forEach(c => uniqueCombosSet.add(toComboKey(c)));
      }
    }

    // Dezenas distintas
    nums.forEach(n => distinctNumbersSet.add(n));

    // Soma
    const s = nums.reduce((acc, n) => acc + n, 0);
    totalSum += s;
    if (s >= goldMin && s <= goldMax) {
      goldZoneCount++;
    }

    // Paridade
    const evens = nums.filter(n => n % 2 === 0).length;
    const odds = len - evens;
    if (isLotofacil) {
      if ((evens === 7 && odds === 8) || (evens === 8 && odds === 7)) {
        balancedParityCount++;
      }
    } else {
      if ((evens === 3 && odds === 3) || (evens === 4 && odds === 2) || (evens === 2 && odds === 4)) {
        balancedParityCount++;
      }
    }
  });

  const uniqueCombosCount = Math.max(1, uniqueCombosSet.size);

  // 2. Probabilidades Exatas Multi-Tier
  const tier1Multiplier = uniqueCombosCount;
  const tier1Prob = Math.min(0.999999, uniqueCombosCount / singleOddsTier1);
  const tier1OddsOneIn = Math.max(1, Math.round(singleOddsTier1 / uniqueCombosCount));

  // Tier 2
  const tier2ProbSingle = 1 / singleOddsTier2;
  const tier2ExpectedHits = uniqueCombosCount * tier2ProbSingle;
  const tier2Prob = Math.min(0.999999, 1 - Math.exp(-tier2ExpectedHits));
  const tier2OddsOneIn = Math.max(1, Math.round(1 / tier2Prob));
  const tier2Multiplier = +(tier2Prob / tier2ProbSingle).toFixed(1);

  // Tier 3
  const tier3ProbSingle = 1 / singleOddsTier3;
  const tier3ExpectedHits = uniqueCombosCount * tier3ProbSingle;
  const tier3Prob = Math.min(0.999999, 1 - Math.exp(-tier3ExpectedHits));
  const tier3OddsOneIn = Math.max(1, Math.round(1 / tier3Prob));
  const tier3Multiplier = +(tier3Prob / tier3ProbSingle).toFixed(1);

  // Tier 4 & 5 (Lotofácil / +Milionária)
  const tier4ProbSingle = singleOddsTier4 ? (1 / singleOddsTier4) : 0;
  const tier4ExpectedHits = uniqueCombosCount * tier4ProbSingle;
  const tier4Prob = tier4ProbSingle ? Math.min(0.999999, 1 - Math.exp(-tier4ExpectedHits)) : 0;
  const tier4OddsOneIn = tier4Prob ? Math.max(1, Math.round(1 / tier4Prob)) : 0;

  const tier5ProbSingle = singleOddsTier5 ? (1 / singleOddsTier5) : 0;
  const tier5ExpectedHits = uniqueCombosCount * tier5ProbSingle;
  const tier5Prob = tier5ProbSingle ? Math.min(0.999999, 1 - Math.exp(-tier5ExpectedHits)) : 0;
  const tier5OddsOneIn = tier5Prob ? Math.max(1, Math.round(1 / tier5Prob)) : 0;

  // Chance de qualquer prêmio
  const anyPrizeSingleProb = 1 / singleAnyPrizeOdds;
  const anyPrizeExpectedHits = uniqueCombosCount * anyPrizeSingleProb;
  const anyPrizeProb = Math.min(0.999999, 1 - Math.exp(-anyPrizeExpectedHits));
  const anyPrizeOddsOneIn = Math.max(1, +(1 / anyPrizeProb).toFixed(1));

  // 3. Projeção de Tempo em Anos
  const drawsForTier3 = Math.max(1, Math.round(tier3OddsOneIn));
  const yearsForTier3 = +(drawsForTier3 / drawsPerYear).toFixed(1);

  const drawsForTier2 = Math.max(1, Math.round(tier2OddsOneIn));
  const yearsForTier2 = +(drawsForTier2 / drawsPerYear).toFixed(1);

  const drawsForTier1 = Math.max(1, Math.round(tier1OddsOneIn));
  const yearsForTier1 = +(drawsForTier1 / drawsPerYear).toFixed(0);

  // 4. Cobertura da Cartela
  const distinctNumbers = Array.from(distinctNumbersSet).sort((a, b) => a - b);
  const distinctNumbersCount = distinctNumbers.length;
  const missingNumbers = Array.from({ length: maxUniverse }, (_, i) => i + 1)
    .filter(n => !distinctNumbersSet.has(n));
  const coveragePercentage = +((distinctNumbersCount / maxUniverse) * 100).toFixed(1);

  // 5. Comparação com Top 10 Histórico
  const topCovered = top10List.filter(n => distinctNumbersSet.has(n));
  const topHistoricalMissing = top10List.filter(n => !distinctNumbersSet.has(n));

  const averageSum = Math.round(totalSum / savedBets.length);
  const sumInGoldZonePercentage = Math.round((goldZoneCount / savedBets.length) * 100);
  const balancedParityPercentage = Math.round((balancedParityCount / savedBets.length) * 100);

  // 6. Taxa de Redundância e Eficiência
  const redundancyRate = savedBets.length > 1
    ? Math.max(0, Math.min(100, Math.round((1 - (uniqueCombosCount / totalEquivCombos)) * 100)))
    : 0;

  const targetCoverage = isLotofacil ? 25 : (maxUniverse * 0.6);
  const scoreCoverage = Math.min(100, (distinctNumbersCount / targetCoverage) * 100);
  const scoreGold = sumInGoldZonePercentage;
  const scoreParity = balancedParityPercentage;
  const scoreTop = (topCovered.length / 10) * 100;
  const plausibilityPercentage = Math.round((plausibleCount / savedBets.length) * 100);

  const efficiencyScore = Math.round(
    (scoreCoverage * 0.30) + 
    (scoreGold * 0.25) + 
    (scoreParity * 0.20) + 
    (scoreTop * 0.15) +
    (plausibilityPercentage * 0.10)
  );

  // 7. Recomendações personalizadas por loteria
  const recommendationTips: string[] = [];
  if (isLotofacil) {
    if (distinctNumbersCount < 22) {
      recommendationTips.push(`Sua carteira cobre ${distinctNumbersCount} de 25 dezenas. Tente espalhar apostas para cobrir pelo menos 23 a 25 dezenas da Lotofácil.`);
    } else {
      recommendationTips.push(`Excelente cobertura de cartela: ${distinctNumbersCount}/25 dezenas contempladas (${coveragePercentage}% da Lotofácil).`);
    }

    if (sumInGoldZonePercentage >= 70) {
      recommendationTips.push(`Ótimo padrão de somas: ${sumInGoldZonePercentage}% das apostas estão entre 180 e 220 (faixa de 80% dos concursos).`);
    } else {
      recommendationTips.push(`Apenas ${sumInGoldZonePercentage}% dos jogos estão na soma ideal (180 a 220). Calibre as dezenas para otimizar.`);
    }

    if (plausibilityPercentage < 100) {
      recommendationTips.push(`${savedBets.length - plausibleCount} aposta(s) com anomalias de sequência ou moldura. Ajuste para o cluster de alta densidade.`);
    } else {
      recommendationTips.push(`100% dos seus jogos pertencem ao Cluster Central de Máxima Plausibilidade da Lotofácil.`);
    }
  } else {
    // Mega ou +Milionária
    if (coveragePercentage < 35) {
      recommendationTips.push(`Sua carteira cobre apenas ${distinctNumbersCount} dezenas (de ${maxUniverse}). Tente distribuir as apostas para cobrir ao menos ${isMaisMilionaria ? '20 a 30' : '25 a 35'} dezenas.`);
    } else {
      recommendationTips.push(`Excelente amplitude de cobertura: ${distinctNumbersCount} dezenas cobertas (${coveragePercentage}% do volante).`);
    }

    if (sumInGoldZonePercentage < 60) {
      recommendationTips.push(`Apenas ${sumInGoldZonePercentage}% dos seus jogos estão na Zona de Ouro (soma entre ${goldMin} e ${goldMax}).`);
    } else {
      recommendationTips.push(`Ótimo equilíbrio de somas: ${sumInGoldZonePercentage}% das apostas estão na faixa mais premiada (${goldMin} a ${goldMax}).`);
    }

    if (plausibilityPercentage < 100) {
      recommendationTips.push(`Atenção: ${savedBets.length - plausibleCount} aposta(s) apresentam sequências anômalas (ex: 4+ seguidos ou extremos).`);
    } else {
      recommendationTips.push(`100% dos seus jogos estão centralizados no Cluster de Alta Plausibilidade Histórica.`);
    }
  }

  let recommendationVerdict = "Carteira Estatística Equilibrada";
  if (efficiencyScore >= 80) recommendationVerdict = "Carteira de Alta Eficiência Estatística";
  else if (efficiencyScore <= 45) recommendationVerdict = "Carteira com Oportunidades de Otimização";

  return {
    lottery,
    totalGames: savedBets.length,
    totalCombinations: totalEquivCombos,
    uniqueCombinations: uniqueCombosCount,
    totalCost,
    tier1Name,
    tier1OddsOneIn,
    tier1Probability: tier1Prob,
    tier1MultiplierVsSingle: tier1Multiplier,
    tier1EstimatedPrize: tier1Prize,
    tier2Name,
    tier2OddsOneIn,
    tier2Probability: tier2Prob,
    tier2MultiplierVsSingle: tier2Multiplier,
    tier2EstimatedPrize: tier2Prize,
    tier3Name,
    tier3OddsOneIn,
    tier3Probability: tier3Prob,
    tier3MultiplierVsSingle: tier3Multiplier,
    tier3EstimatedPrize: tier3Prize,
    tier4Name,
    tier4OddsOneIn,
    tier4Probability: tier4Prob,
    tier4EstimatedPrize: isLotofacil ? 'R$ 12,00 (Fixo)' : 'R$ 1.800',
    tier5Name,
    tier5OddsOneIn,
    tier5Probability: tier5Prob,
    tier5EstimatedPrize: isLotofacil ? 'R$ 6,00 (Fixo)' : 'R$ 250',
    anyPrizeOddsOneIn: typeof anyPrizeOddsOneIn === 'number' ? anyPrizeOddsOneIn : 1,
    anyPrizeProbability: anyPrizeProb,
    senaProbability: tier1Prob,
    senaOddsOneIn: tier1OddsOneIn,
    senaMultiplierVsSingle: tier1Multiplier,
    quinaProbability: tier2Prob,
    quinaOddsOneIn: tier2OddsOneIn,
    quinaMultiplierVsSingle: tier2Multiplier,
    quadraProbability: tier3Prob,
    quadraOddsOneIn: tier3OddsOneIn,
    quadraMultiplierVsSingle: tier3Multiplier,
    ternoProbability: tier4Prob || (1 / 59),
    ternoOddsOneIn: tier4OddsOneIn || 59,
    estimatedDrawsForQuadra: drawsForTier3,
    estimatedYearsForQuadra: yearsForTier3,
    estimatedDrawsForQuina: drawsForTier2,
    estimatedYearsForQuina: yearsForTier2,
    estimatedDrawsForSena: drawsForTier1,
    estimatedYearsForSena: yearsForTier1,
    distinctNumbersCount,
    distinctNumbers,
    missingNumbers,
    coveragePercentage,
    maxUniverse,
    topHistoricalCoveredCount: topCovered.length,
    topHistoricalMissing,
    averageSum,
    sumInGoldZonePercentage,
    balancedParityPercentage,
    redundancyRate,
    efficiencyScore,
    plausibleGamesCount: plausibleCount,
    anomalousGamesCount: savedBets.length - plausibleCount,
    plausibilityPercentage,
    recommendationVerdict,
    recommendationTips
  };
}

/**
 * Gera uma aposta complementar otimizada para cobrir lacunas da carteira
 * com suporte nativo a Lotofácil (15 n°), +Milionária (6 n°) e Mega-Sena (6 n°).
 */
export function generateComplementaryBet(
  savedBets: Bet[], 
  lottery: LotteryType = 'megasena'
): number[] {
  const stats = calculatePortfolioProbability(savedBets, lottery);
  const missing = stats.missingNumbers;
  const isLotofacil = lottery === 'lotofacil';
  const isMaisMilionaria = lottery === 'maismilionaria';
  const targetSize = isLotofacil ? 15 : 6;
  const maxNumber = isLotofacil ? 25 : (isMaisMilionaria ? 50 : 60);

  const chosen: number[] = [];

  // Frequência de referência
  const getFreq = (n: number) => {
    if (isLotofacil) return LOTOFACIL_FREQUENCY_DATA[n] || 1500;
    if (isMaisMilionaria) return MAIS_MILIONARIA_FREQUENCY_DATA[n] || 25;
    return OFFICIAL_FREQUENCY_DATA[n] || 300;
  };

  // 1. Prioriza dezenas ausentes com maior frequência histórica
  const scoredMissing = missing.map(n => ({
    num: n,
    freq: getFreq(n)
  })).sort((a, b) => b.freq - a.freq);

  const pickMissingCount = isLotofacil 
    ? Math.min(missing.length, Math.min(8, targetSize - 2))
    : Math.min(missing.length, 3);

  for (let i = 0; i < pickMissingCount; i++) {
    chosen.push(scoredMissing[i].num);
  }

  // 2. Preenche com dezenas do pool candidatas mantendo plausibilidade
  const pool = Array.from({ length: maxNumber }, (_, i) => i + 1)
    .filter(n => !chosen.includes(n));

  const idealAvg = isLotofacil ? (200 / 15) : (isMaisMilionaria ? (150 / 6) : (190 / 6));

  while (chosen.length < targetSize && pool.length > 0) {
    const currentSum = chosen.reduce((a, b) => a + b, 0);
    const slotsLeft = targetSize - chosen.length;
    const targetPerSlot = ((idealAvg * targetSize) - currentSum) / slotsLeft;

    pool.sort((a, b) => Math.abs(a - targetPerSlot) - Math.abs(b - targetPerSlot));
    const nextPick = pool.shift();
    if (nextPick) chosen.push(nextPick);
  }

  return chosen.sort((a, b) => a - b);
}
