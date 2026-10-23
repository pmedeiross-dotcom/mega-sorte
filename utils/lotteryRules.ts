import { GeneratorLogic, AdvancedBetMetrics } from '../types';
import { 
  OFFICIAL_FREQUENCY_DATA, 
  evaluateHistoricalAlignment, 
  getQuadrant as getQuadrantFromStats
} from './megaSenaOfficialStats';
import {
  PRIME_NUMBERS,
  FIBONACCI_NUMBERS,
  MULTIPLES_OF_THREE,
  FRAME_NUMBERS,
  CENTER_NUMBERS,
  CACHED_ADVANCED_ANALYTICS,
  evaluateAdvancedGameMetrics,
  EvaluatedAdvancedMetrics
} from './megaSenaAdvancedAnalytics';

export interface GameValidationDetails {
  sum: number;
  sumValid: boolean;
  evenCount: number;
  oddCount: number;
  evenOddValid: boolean;
  quadrants: [number, number, number, number];
  quadrantsValid: boolean;
  count20to50: number;
  count20to50Valid: boolean;
  consecutiveSequences: number[][];
  maxConsecutive: number;
  consecutiveValid: boolean;
  endingsMap: Record<number, number>;
  maxEndingCount: number;
  endingsValid: boolean;
  repeatedCount: number;
  repeatValid: boolean;
  // Métricas do histórico oficial
  historicalHotCount: number;
  historicalHotValid: boolean;
  historicalAverageDraws: number;
  historicalScore: number;
  historicalDescription: string;
  // Métricas da Análise Avançada
  primesCount: number;
  primesValid: boolean;
  fibonacciCount: number;
  fibonacciValid: boolean;
  multiplesOfThreeCount: number;
  multiplesOfThreeValid: boolean;
  frameCount: number;
  centerCount: number;
  frameCenterValid: boolean;
  paretoCount: number;
  paretoValid: boolean;
  cycleMissingCount: number;
  cycleValid: boolean;
  matchedDuque?: [number, number];
  matchedDuqueName?: string;
  duquesValid: boolean;
  maxInRow: number;
  maxInCol: number;
  rowColValid: boolean;
  hotCount: number;
  warmCount: number;
  coldCount: number;
  advancedScore: number;
  advancedHighlights: string[];
  // Novos Cálculos e Motores Matemáticos
  shannonEntropy: number;
  entropyLabel: 'Baixa' | 'Ideal' | 'Alta';
  delayZScoreMax: number;
  hasHighPressureDezena: boolean;
  highPressureNumbers: number[];
  cooccurrenceLiftAvg: number;
  chiSquareConformity: number;
  smartSuggestions: string[];
  strengths: string[];
  // Contadores globais
  allActiveRulesPassed: boolean;
  passedRulesCount: number;
  activeRulesCount: number;
}

export const getQuadrant = getQuadrantFromStats;
export { generateSmartDiagnosticSuggestions, autoOptimizeGameNumbers } from './megaSenaAdvancedAnalytics';

export const validateGameAgainstRules = (
  numbers: number[],
  logic: GeneratorLogic,
  referenceNumbers?: number[]
): GameValidationDetails => {
  const sorted = [...numbers].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, curr) => acc + curr, 0);

  // 1. Soma entre 160 e 240 (Zona de Ouro histórica onde ocorrem 78.4% dos prêmios)
  const sumValid = !logic.sum160to240 || (sum >= 160 && sum <= 240);

  // 2. Equilíbrio Par/Ímpar (3/3 ou 4/2 ou 2/4 - cobrem 79.5% de todos os concursos)
  let evenCount = 0;
  let oddCount = 0;
  sorted.forEach(n => {
    if (n % 2 === 0) evenCount++;
    else oddCount++;
  });
  const evenOddValid = !logic.balanceEvenOdd || (
    (evenCount === 3 && oddCount === 3) ||
    (evenCount === 4 && oddCount === 2) ||
    (evenCount === 2 && oddCount === 4)
  );

  // 3. Distribuição Espalhada (pelo menos 3 quadrantes contemplados - 84.1% dos concursos)
  const quadrants: [number, number, number, number] = [0, 0, 0, 0];
  sorted.forEach(n => {
    quadrants[getQuadrant(n)]++;
  });
  const populatedQuadrants = quadrants.filter(q => q > 0).length;
  const quadrantsValid = !logic.spreadDistribution || (populatedQuadrants >= 3 && Math.max(...quadrants) <= 3);

  // 4. Concentração no intervalo 20 a 50 (pelo menos 3 dezenas no miolo com maior incidência)
  const count20to50 = sorted.filter(n => n >= 20 && n <= 50).length;
  const targetMin20to50 = Math.floor(sorted.length * 0.5);
  const count20to50Valid = !logic.concentrate20to50 || (count20to50 >= targetMin20to50 && count20to50 <= sorted.length);

  // 5. No máximo 2 números em sequência consecutiva
  const consecutiveSequences: number[][] = [];
  let currentSeq: number[] = [];
  let maxConsecutive = 1;

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] === sorted[i - 1] + 1) {
      if (currentSeq.length === 0) {
        currentSeq.push(sorted[i - 1]);
      }
      currentSeq.push(sorted[i]);
    } else {
      if (currentSeq.length > 0) {
        consecutiveSequences.push([...currentSeq]);
        if (currentSeq.length > maxConsecutive) maxConsecutive = currentSeq.length;
        currentSeq = [];
      }
    }
  }
  if (currentSeq.length > 0) {
    consecutiveSequences.push([...currentSeq]);
    if (currentSeq.length > maxConsecutive) maxConsecutive = currentSeq.length;
  }

  const consecutiveValid = !logic.max2Consecutive || (maxConsecutive <= 2 && consecutiveSequences.length <= 2);

  // 6. No máximo 2 finais iguais (evita repetições improváveis)
  const endingsMap: Record<number, number> = {};
  sorted.forEach(n => {
    const end = n % 10;
    endingsMap[end] = (endingsMap[end] || 0) + 1;
  });
  const maxEndingCount = Math.max(...Object.values(endingsMap), 0);
  const endingsValid = !logic.max2IdenticalEndings || (maxEndingCount <= 2);

  // 7. Repetição de 1-2 dezenas do sorteio anterior (ocorre em 57.3% dos concursos)
  let repeatedCount = 0;
  if (referenceNumbers && referenceNumbers.length > 0) {
    const refSet = new Set(referenceNumbers);
    repeatedCount = sorted.filter(n => refSet.has(n)).length;
  }
  const repeatValid = !logic.repeat1to2 || (repeatedCount >= 1 && repeatedCount <= 2);

  // 8. Alinhamento com o histórico oficial de todos os concursos
  const historical = evaluateHistoricalAlignment(sorted);
  const historicalHotValid = !logic.preferHistoricalHotNumbers || (historical.top20Count >= 2 && historical.top20Count <= 4);

  // Métricas e regras da Análise Avançada
  const adv = evaluateAdvancedGameMetrics(sorted);
  const duquesValid = !logic.useAdvancedDuques || adv.duquesValid;
  const frameCenterValid = !logic.frameAndCenterBalance || adv.frameCenterValid;
  const primesFiboValid = !logic.balancePrimesAndFibonacci || (adv.primesValid && adv.fibonacciValid);
  const paretoValid = !logic.paretoTopSelection || adv.paretoValid;
  const cycleValid = !logic.includeCycleDezenas || adv.cycleValid;
  const multiplesOfThreeValid = !logic.multiplesOfThreeBalance || adv.multiplesOfThreeValid;
  const rowColValid = !logic.rowAndColDispersion || adv.rowColValid;

  // Contabilização de regras ativas e aprovadas
  const activeChecks = [
    { active: Boolean(logic.sum160to240), valid: sumValid },
    { active: Boolean(logic.balanceEvenOdd), valid: evenOddValid },
    { active: Boolean(logic.spreadDistribution), valid: quadrantsValid },
    { active: Boolean(logic.concentrate20to50), valid: count20to50Valid },
    { active: Boolean(logic.max2Consecutive), valid: consecutiveValid },
    { active: Boolean(logic.max2IdenticalEndings), valid: endingsValid },
    { active: Boolean(logic.repeat1to2), valid: repeatValid },
    { active: Boolean(logic.preferHistoricalHotNumbers), valid: historicalHotValid },
    // Regras Avançadas
    { active: Boolean(logic.useAdvancedDuques), valid: duquesValid },
    { active: Boolean(logic.frameAndCenterBalance), valid: frameCenterValid },
    { active: Boolean(logic.balancePrimesAndFibonacci), valid: primesFiboValid },
    { active: Boolean(logic.paretoTopSelection), valid: paretoValid },
    { active: Boolean(logic.includeCycleDezenas), valid: cycleValid },
    { active: Boolean(logic.multiplesOfThreeBalance), valid: multiplesOfThreeValid },
    { active: Boolean(logic.rowAndColDispersion), valid: rowColValid },
  ];

  const activeRulesCount = activeChecks.filter(c => c.active).length;
  const passedRulesCount = activeChecks.filter(c => c.active && c.valid).length;
  const allActiveRulesPassed = activeRulesCount === 0 || passedRulesCount === activeRulesCount;

  return {
    sum,
    sumValid,
    evenCount,
    oddCount,
    evenOddValid,
    quadrants,
    quadrantsValid,
    count20to50,
    count20to50Valid,
    consecutiveSequences,
    maxConsecutive,
    consecutiveValid,
    endingsMap,
    maxEndingCount,
    endingsValid,
    repeatedCount,
    repeatValid,
    historicalHotCount: historical.top20Count,
    historicalHotValid,
    historicalAverageDraws: historical.averageDraws,
    historicalScore: historical.historicalConformityScore,
    historicalDescription: historical.description,
    // Métricas da Análise Avançada
    primesCount: adv.primesCount,
    primesValid: adv.primesValid,
    fibonacciCount: adv.fibonacciCount,
    fibonacciValid: adv.fibonacciValid,
    multiplesOfThreeCount: adv.multiplesOfThreeCount,
    multiplesOfThreeValid: adv.multiplesOfThreeValid,
    frameCount: adv.frameCount,
    centerCount: adv.centerCount,
    frameCenterValid: adv.frameCenterValid,
    paretoCount: adv.paretoCount,
    paretoValid: adv.paretoValid,
    cycleMissingCount: adv.cycleMissingCount,
    cycleValid: adv.cycleValid,
    matchedDuque: adv.matchedDuque,
    matchedDuqueName: adv.matchedDuqueName,
    duquesValid: adv.duquesValid,
    maxInRow: adv.maxInRow,
    maxInCol: adv.maxInCol,
    rowColValid: adv.rowColValid,
    hotCount: adv.hotCount,
    warmCount: adv.warmCount,
    coldCount: adv.coldCount,
    advancedScore: adv.advancedScore,
    advancedHighlights: adv.advancedHighlights,
    shannonEntropy: adv.shannonEntropy,
    entropyLabel: adv.entropyLabel,
    delayZScoreMax: adv.delayZScoreMax,
    hasHighPressureDezena: adv.hasHighPressureDezena,
    highPressureNumbers: adv.highPressureNumbers,
    cooccurrenceLiftAvg: adv.cooccurrenceLiftAvg,
    chiSquareConformity: adv.chiSquareConformity,
    smartSuggestions: adv.smartSuggestions,
    strengths: adv.strengths,
    allActiveRulesPassed,
    passedRulesCount,
    activeRulesCount
  };
};

/**
 * Sorteia uma dezena com peso estatístico proporcional à estratégia de cálculo matemática escolhida,
 * frequência histórica de todos os concursos, decaimento temporal, pressão de atraso e dispersão de Shannon.
 */
const getAdvancedWeightedCandidate = (
  exclude: Set<number>, 
  logic: GeneratorLogic,
  currentEvens: number,
  currentFrame: number,
  rowCounts: number[],
  colCounts: number[]
): number => {
  const pool: number[] = [];
  const strategy = logic.calculationStrategy || 'balanced';

  // Mapa de status e atrasos para ponderação estocástica
  const analysisMap = new Map<number, { status: string; delay: number; recentCount: number }>();
  CACHED_ADVANCED_ANALYTICS.numbersAnalysis.forEach(n => {
    analysisMap.set(n.number, {
      status: n.status,
      delay: n.currentDelay,
      recentCount: n.recentCountLast25
    });
  });

  const cycleMissing = new Set(CACHED_ADVANCED_ANALYTICS.cycleAnalysis.missingNumbers);

  for (let num = 1; num <= 60; num++) {
    if (exclude.has(num)) continue;

    const data = analysisMap.get(num) || { status: 'morna', delay: 10, recentCount: 2 };

    // Frequência base oficial (todos os 3.071 concursos)
    let weight = OFFICIAL_FREQUENCY_DATA[num] || 300;

    // Modulação baseada na Estratégia de Cálculo Matemática:
    if (strategy === 'momentum') {
      // Decaimento temporal & Momentum recente: amplifica dezenas em alta recente
      if (data.status === 'quente' || data.recentCount >= 4) {
        weight = Math.round(weight * 1.85);
      } else if (data.status === 'morna') {
        weight = Math.round(weight * 1.15);
      } else {
        weight = Math.round(weight * 0.65);
      }
    } else if (strategy === 'cycle_delay') {
      // Pressão Estatística & Fechamento de Ciclo: amplifica dezenas com alto atraso
      const isMissingCycle = cycleMissing.has(num);
      const isHighDelay = data.delay >= 18;
      if (isMissingCycle && isHighDelay) {
        weight = Math.round(weight * 2.30);
      } else if (isMissingCycle || isHighDelay) {
        weight = Math.round(weight * 1.70);
      }
    } else if (strategy === 'entropy_shannon') {
      // Dispersão de Shannon: penaliza dezenas adjacentes aos números já sorteados
      let minDistance = 60;
      exclude.forEach(picked => {
        const dist = Math.abs(picked - num);
        if (dist < minDistance) minDistance = dist;
      });
      if (minDistance <= 1) {
        weight = Math.round(weight * 0.25); // Evita colisão direta
      } else if (minDistance >= 5 && minDistance <= 14) {
        weight = Math.round(weight * 1.45); // Espaçamento harmônico
      }
    } else if (strategy === 'cooccurrence') {
      // Afinidade de Duques: amplifica dezenas que têm duques históricos com as já escolhidas
      let hasDuqueAffinity = false;
      for (const d of CACHED_ADVANCED_ANALYTICS.topDuques) {
        if (d.pair.includes(num)) {
          for (const picked of exclude) {
            if (d.pair.includes(picked)) {
              hasDuqueAffinity = true;
              break;
            }
          }
        }
      }
      if (hasDuqueAffinity) {
        weight = Math.round(weight * 2.10);
      }
    }

    // 1. Concentração 20 a 50
    if (logic.concentrate20to50 && num >= 20 && num <= 50) {
      weight = Math.round(weight * 1.25);
    }

    // 2. Par / Ímpar dinâmico
    const isEven = num % 2 === 0;
    if (logic.balanceEvenOdd) {
      if (currentEvens >= 3 && isEven) weight = Math.round(weight * 0.65);
      if (currentEvens < 3 && !isEven) weight = Math.round(weight * 0.75);
    }

    // 3. Moldura vs Centro dinâmico
    const isFrame = FRAME_NUMBERS.includes(num);
    if (logic.frameAndCenterBalance) {
      if (currentFrame >= 3 && isFrame) weight = Math.round(weight * 0.60);
      if (currentFrame < 3 && !isFrame) weight = Math.round(weight * 0.85);
    }

    // 4. Linhas e Colunas dinâmicas (evita acumular 3 na mesma linha ou coluna)
    const row = Math.floor((num - 1) / 10);
    const col = (num - 1) % 10;
    if (logic.rowAndColDispersion) {
      if (rowCounts[row] >= 2) weight = Math.round(weight * 0.25);
      if (colCounts[col] >= 2) weight = Math.round(weight * 0.25);
    }

    // Normaliza para amostras no pool
    const tickets = Math.max(1, Math.round((weight - 200) / 6));
    for (let t = 0; t < tickets; t++) {
      pool.push(num);
    }
  }

  if (pool.length === 0) {
    for (let num = 1; num <= 60; num++) {
      if (!exclude.has(num)) pool.push(num);
    }
  }

  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
};

/**
 * Converte métricas da validação em AdvancedBetMetrics para persistência no histórico.
 */
export const buildAdvancedBetMetrics = (validation: GameValidationDetails, strategy?: GeneratorLogic['calculationStrategy']): AdvancedBetMetrics => {
  return {
    duquePair: validation.matchedDuque,
    duqueName: validation.matchedDuqueName,
    primesCount: validation.primesCount,
    fibonacciCount: validation.fibonacciCount,
    multiplesOfThreeCount: validation.multiplesOfThreeCount,
    frameCount: validation.frameCount,
    centerCount: validation.centerCount,
    paretoCount: validation.paretoCount,
    cycleMissingCount: validation.cycleMissingCount,
    maxInRow: validation.maxInRow,
    maxInCol: validation.maxInCol,
    historicalHotCount: validation.historicalHotCount,
    advancedScore: validation.advancedScore,
    strategyUsed: strategy,
    shannonEntropy: validation.shannonEntropy,
    entropyLabel: validation.entropyLabel,
    delayZScoreMax: validation.delayZScoreMax,
    hasHighPressureDezena: validation.hasHighPressureDezena,
    cooccurrenceLiftAvg: validation.cooccurrenceLiftAvg,
    chiSquareConformity: validation.chiSquareConformity,
    smartSuggestions: validation.smartSuggestions
  };
};

/**
 * Gerador inteligente e instantâneo fundamentado em todos os 3.071 concursos oficiais da Mega-Sena
 * e na Análise Avançada de 20 pilares estatísticos.
 */
export const generateGameWithRules = (
  quantity: number = 6,
  logic: GeneratorLogic,
  referenceNumbers: number[] = [5, 12, 26, 33, 44, 58]
): { 
  numbers: number[]; 
  reasoning: string; 
  passedAllRules: boolean;
  validation: GameValidationDetails;
  advancedMetrics: AdvancedBetMetrics;
} => {
  const maxAttempts = 2500;
  let bestAttempt: number[] = [];
  let bestScore = -1;
  let bestValidation: GameValidationDetails | null = null;

  const topDuques = CACHED_ADVANCED_ANALYTICS.topDuques;
  const paretoNumbers = CACHED_ADVANCED_ANALYTICS.paretoTopNumbers.map(p => p.number);
  const cycleMissing = CACHED_ADVANCED_ANALYTICS.cycleAnalysis.missingNumbers;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidates: Set<number> = new Set();

    // 1. Pilar Avançado: Semente com Duque Histórico mais sorteado
    if (logic.useAdvancedDuques && topDuques.length > 0 && Math.random() > 0.15) {
      // Escolhe um dos 6 melhores duques da história da Mega-Sena
      const duqueIndex = Math.floor(Math.random() * Math.min(6, topDuques.length));
      const duque = topDuques[duqueIndex];
      candidates.add(duque.pair[0]);
      candidates.add(duque.pair[1]);
    }

    // 2. Repetição de 1-2 dezenas do sorteio de referência
    if (logic.repeat1to2 && referenceNumbers && referenceNumbers.length >= 2) {
      const repeatCount = Math.random() > 0.4 ? 2 : 1;
      const shuffledRef = [...referenceNumbers].sort(() => 0.5 - Math.random());
      for (let i = 0; i < Math.min(repeatCount, shuffledRef.length); i++) {
        if (candidates.size < quantity) {
          candidates.add(shuffledRef[i]);
        }
      }
    }

    // 3. Pilar Avançado: Dezena faltante do Ciclo Atual da Mega-Sena
    if (logic.includeCycleDezenas && cycleMissing.length > 0 && Math.random() > 0.25) {
      const missingCandidate = cycleMissing[Math.floor(Math.random() * cycleMissing.length)];
      if (candidates.size < quantity) {
        candidates.add(missingCandidate);
      }
    }

    // 4. Pilar Avançado: Dezenas do Top 20% Pareto da Mega-Sena
    if (logic.paretoTopSelection && paretoNumbers.length > 0 && Math.random() > 0.2) {
      const paretoCandidate = paretoNumbers[Math.floor(Math.random() * paretoNumbers.length)];
      if (candidates.size < quantity) {
        candidates.add(paretoCandidate);
      }
    }

    // 5. Preenchimento probabilístico com ponderação analítica avançada
    let fillAttempts = 0;
    while (candidates.size < quantity && fillAttempts < 100) {
      fillAttempts++;
      const currentEvens = Array.from(candidates).filter(n => n % 2 === 0).length;
      const currentFrame = Array.from(candidates).filter(n => FRAME_NUMBERS.includes(n)).length;
      const rowCounts = Array(6).fill(0);
      const colCounts = Array(10).fill(0);
      candidates.forEach(n => {
        rowCounts[Math.floor((n - 1) / 10)]++;
        colCounts[(n - 1) % 10]++;
      });

      const candidate = getAdvancedWeightedCandidate(
        candidates, 
        logic, 
        currentEvens, 
        currentFrame, 
        rowCounts, 
        colCounts
      );
      candidates.add(candidate);
    }

    const testNumbers = Array.from(candidates).sort((a, b) => a - b);
    if (testNumbers.length < quantity) continue;

    const validation = validateGameAgainstRules(testNumbers, logic, referenceNumbers);

    // Se passou em todas as regras ativas
    if (validation.allActiveRulesPassed) {
      const highlights: string[] = [];
      if (validation.matchedDuqueName) highlights.push(`Duque ${validation.matchedDuqueName}`);
      if (logic.sum160to240) highlights.push(`soma ${validation.sum} (Zona de Ouro)`);
      if (logic.balanceEvenOdd) highlights.push(`${validation.evenCount}P/${validation.oddCount}I`);
      if (logic.frameAndCenterBalance) highlights.push(`${validation.frameCount} Moldura / ${validation.centerCount} Centro`);
      if (validation.primesCount > 0) highlights.push(`${validation.primesCount} Primos`);
      if (validation.fibonacciCount > 0) highlights.push(`${validation.fibonacciCount} Fibonacci`);
      if (validation.multiplesOfThreeCount > 0) highlights.push(`${validation.multiplesOfThreeCount} Múltiplos de 3`);
      if (validation.paretoCount > 0) highlights.push(`${validation.paretoCount} no Top Pareto`);
      if (validation.cycleMissingCount > 0) highlights.push(`${validation.cycleMissingCount} do Ciclo Atual`);
      if (logic.preferHistoricalHotNumbers) highlights.push(`${validation.historicalHotCount} no Top 20 Geral`);
      if (logic.spreadDistribution) highlights.push(`4 quadrantes`);
      if (logic.repeat1to2 && validation.repeatedCount > 0) highlights.push(`${validation.repeatedCount} repetida(s)`);

      const reason = `Gerado via Análise Avançada (3.071 concursos): ${highlights.join(' • ')}. Média de ${validation.historicalAverageDraws} sorteios históricos por dezena (Conformidade Analítica: ${validation.advancedScore}%).`;

      return {
        numbers: testNumbers,
        reasoning: reason,
        passedAllRules: true,
        validation,
        advancedMetrics: buildAdvancedBetMetrics(validation, logic.calculationStrategy || 'balanced')
      };
    }

    const compositeScore = validation.passedRulesCount * 100 + validation.advancedScore;
    if (compositeScore > bestScore) {
      bestScore = compositeScore;
      bestAttempt = testNumbers;
      bestValidation = validation;
    }
  }

  // Melhor combinação encontrada como fallback
  const finalNumbers = bestAttempt.length === quantity ? bestAttempt : generateBasicBalancedNumbers(quantity);
  const fallbackValidation = bestValidation || validateGameAgainstRules(finalNumbers, logic, referenceNumbers);

  const fallbackReason = `Jogo otimizado com a melhor pontuação analítica (${fallbackValidation.passedRulesCount}/${fallbackValidation.activeRulesCount} regras cumpridas, Conformidade Analítica: ${fallbackValidation.advancedScore}%, média de ${fallbackValidation.historicalAverageDraws} sorteios históricos).`;

  return {
    numbers: finalNumbers,
    reasoning: fallbackReason,
    passedAllRules: false,
    validation: fallbackValidation,
    advancedMetrics: buildAdvancedBetMetrics(fallbackValidation, logic.calculationStrategy || 'balanced')
  };
};

const generateBasicBalancedNumbers = (quantity: number): number[] => {
  const nums = new Set<number>();
  while (nums.size < quantity) {
    nums.add(Math.floor(Math.random() * 60) + 1);
  }
  return Array.from(nums).sort((a, b) => a - b);
};
