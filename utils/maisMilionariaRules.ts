/**
 * Regras Estatísticas e Gerador Inteligente da +Milionária (Caixa)
 * Cartela: 50 dezenas (01 a 50) + 6 trevos (01 a 06)
 * Aposta simples: 6 dezenas + 2 trevos
 */

import { GeneratorLogic, CalculationStrategy } from '../types';
import { 
  MAIS_MILIONARIA_FREQUENCY_DATA, 
  TOP_10_MAIS_MILIONARIA, 
  MAIS_MILIONARIA_HISTORICAL_METRICS 
} from './maisMilionariaOfficialStats';
import { 
  MAIS_MILIONARIA_PRIMES, 
  MAIS_MILIONARIA_FIBONACCI, 
  MAIS_MILIONARIA_MULTIPLES_OF_THREE, 
  MAIS_MILIONARIA_FRAME, 
  MAIS_MILIONARIA_CENTER, 
  getMaisMilionariaQuadrant 
} from './maisMilionariaAdvancedAnalytics';

export interface MaisMilionariaValidation {
  numbers: number[];
  trevos: number[];
  sum: number;
  sumValid: boolean;
  evenCount: number;
  oddCount: number;
  evenOddValid: boolean;
  repeatedCount: number;
  repeatValid: boolean;
  primesCount: number;
  fibonacciCount: number;
  multiplesOfThreeCount: number;
  frameCount: number;
  centerCount: number;
  historicalHotCount: number;
  advancedScore: number;
  passedAllRules: boolean;
  smartSuggestions: string[];
}

// Validação de aposta da +Milionária
export function validateMaisMilionariaBet(
  numbers: number[],
  trevos: number[] = [1, 2],
  referenceDrawNumbers: number[] = []
): MaisMilionariaValidation {
  const k = Math.max(1, numbers.length);
  const goldMin = k === 6 ? 120 : Math.round((120 * k) / 6);
  const goldMax = k === 6 ? 185 : Math.round((185 * k) / 6);
  const sum = numbers.reduce((a, b) => a + b, 0);
  const sumValid = sum >= goldMin && sum <= goldMax;

  const evenCount = numbers.filter(n => n % 2 === 0).length;
  const oddCount = numbers.length - evenCount;
  const maxParityDiff = k % 2 === 0 ? 2 : 3;
  const evenOddValid = k >= 4
    ? Math.abs(evenCount - oddCount) <= maxParityDiff
    : Math.abs(evenCount - oddCount) <= 1;

  const prevSet = new Set(referenceDrawNumbers);
  const repeatedCount = numbers.filter(n => prevSet.has(n)).length;
  const repeatValid = repeatedCount <= 2;

  const primesCount = numbers.filter(n => MAIS_MILIONARIA_PRIMES.includes(n)).length;
  const fibonacciCount = numbers.filter(n => MAIS_MILIONARIA_FIBONACCI.includes(n)).length;
  const multiplesOfThreeCount = numbers.filter(n => MAIS_MILIONARIA_MULTIPLES_OF_THREE.includes(n)).length;
  const frameCount = numbers.filter(n => MAIS_MILIONARIA_FRAME.includes(n)).length;
  const centerCount = numbers.length - frameCount;

  const top10Nums = TOP_10_MAIS_MILIONARIA.map(t => t.number);
  const historicalHotCount = numbers.filter(n => top10Nums.includes(n)).length;

  let score = 0;
  if (sumValid) score += 25;
  if (evenOddValid) score += 25;
  if (repeatValid) score += 15;
  if (primesCount >= 1 && primesCount <= (k >= 7 ? 4 : 3)) score += 15;
  if (frameCount >= 2 && frameCount <= (k >= 7 ? 5 : 4)) score += 10;
  if (historicalHotCount >= 1) score += 10;

  const passedAllRules = sumValid && evenOddValid && repeatValid;

  const smartSuggestions: string[] = [];
  if (!sumValid) {
    smartSuggestions.push(
      sum < goldMin
        ? `Soma (${sum}) baixa. O padrão áureo da +Milionária para ${k} dezenas é de ${goldMin} a ${goldMax}.`
        : `Soma (${sum}) alta. O padrão áureo para ${k} dezenas é de ${goldMin} a ${goldMax}.`
    );
  }
  if (!evenOddValid) {
    smartSuggestions.push(`Equilíbrio par/ímpar (${evenCount}P/${oddCount}I) fora das faixas mais equilibradas.`);
  }
  if (repeatedCount > 2) {
    smartSuggestions.push(`Você incluiu ${repeatedCount} dezenas do último concurso. Na história da +Milionária, em 87,3% dos sorteios repetem 0 ou 1.`);
  }

  return {
    numbers,
    trevos,
    sum,
    sumValid,
    evenCount,
    oddCount,
    evenOddValid,
    repeatedCount,
    repeatValid,
    primesCount,
    fibonacciCount,
    multiplesOfThreeCount,
    frameCount,
    centerCount,
    historicalHotCount,
    advancedScore: Math.min(100, score),
    passedAllRules,
    smartSuggestions
  };
}

// Gerador Inteligente por Regras para +Milionária
export function generateMaisMilionariaWithRules(
  betCount: number = 6,
  trevosCount: number = 2,
  referenceDrawNumbers: number[] = [],
  strategy: CalculationStrategy = 'balanced',
  logicOptions?: GeneratorLogic
): { numbers: number[]; trevos: number[]; reasoning: string; validation: MaisMilionariaValidation } {
  let bestGame: number[] = [];
  let bestScore = -1;
  let bestValidation: MaisMilionariaValidation | null = null;

  const candidatePool = Array.from({ length: 50 }, (_, i) => i + 1);
  const ternoProfile = (logicOptions?.useTernoStatsBoost && logicOptions.ternoBoostProfile?.lottery === 'maismilionaria')
    ? logicOptions.ternoBoostProfile
    : undefined;
  const ternoFocusSet = ternoProfile
    ? new Set([...ternoProfile.matchedHotNumbers, ...ternoProfile.topNumbers])
    : null;

  // Duques fortes da +Milionária
  const topDuquesPairs = [
    [21, 41], [40, 50], [21, 22], [4, 38], [28, 46], [17, 50], [24, 35]
  ];

  // Executa amostragem dirigida
  for (let attempt = 0; attempt < 350; attempt++) {
    const current: number[] = [];

    // 1. Semente por Reforço Terno+ ou Duque Histórico
    if (ternoProfile && attempt % 2 === 0) {
      if (ternoProfile.topPairs.length > 0 && Math.random() < 0.6) {
        const pair = ternoProfile.topPairs[Math.floor(Math.random() * Math.min(4, ternoProfile.topPairs.length))];
        pair.forEach(n => { if (n >= 1 && n <= 50 && !current.includes(n)) current.push(n); });
      } else if (ternoProfile.matchedHotNumbers.length > 0) {
        const hot = ternoProfile.matchedHotNumbers[Math.floor(Math.random() * ternoProfile.matchedHotNumbers.length)];
        if (hot >= 1 && hot <= 50) current.push(hot);
      }
    } else if (strategy === 'cooccurrence' || attempt % 2 === 0) {
      const duque = topDuquesPairs[Math.floor(Math.random() * topDuquesPairs.length)];
      current.push(...duque);
    }

    // 2. Repetição do concurso anterior (0 ou 1 dezena)
    if (referenceDrawNumbers.length > 0 && Math.random() < 0.45) {
      const repNum = referenceDrawNumbers[Math.floor(Math.random() * referenceDrawNumbers.length)];
      if (!current.includes(repNum) && repNum <= 50 && current.length < betCount) {
        current.push(repNum);
      }
    }

    // 3. Completa respeitando ponderação do Terno+ quando ativo
    const pool = candidatePool.filter(n => !current.includes(n));
    while (current.length < betCount && pool.length > 0) {
      if (ternoProfile) {
        const weightedPool: number[] = [];
        for (const n of pool) {
          const mult = ternoProfile.numberWeights[n] || 1;
          const tickets = Math.max(1, Math.round(mult * 4));
          for (let t = 0; t < tickets; t++) weightedPool.push(n);
        }
        const chosen = weightedPool[Math.floor(Math.random() * weightedPool.length)];
        current.push(chosen);
        const removeIdx = pool.indexOf(chosen);
        if (removeIdx >= 0) pool.splice(removeIdx, 1);
      } else {
        const idx = Math.floor(Math.random() * pool.length);
        current.push(pool[idx]);
        pool.splice(idx, 1);
      }
    }

    const sorted = [...current].sort((a, b) => a - b);
    const validation = validateMaisMilionariaBet(sorted, [1, 2], referenceDrawNumbers);
    const ternoHits = ternoFocusSet ? sorted.filter(n => ternoFocusSet.has(n)).length : 0;
    const ternoBonus = ternoProfile
      ? ternoHits * 8 + (validation.sum >= ternoProfile.targetSumMin && validation.sum <= ternoProfile.targetSumMax ? 8 : 0)
      : 0;
    const effectiveScore = validation.advancedScore + ternoBonus;

    if (effectiveScore > bestScore) {
      bestScore = effectiveScore;
      bestGame = sorted;
      bestValidation = validation;
      if (!ternoProfile && validation.advancedScore >= 95) break;
    }
  }

  // Sorteia 2 trevos (1 a 6)
  const trevosPool = [1, 2, 3, 4, 5, 6];
  const trevos: number[] = [];
  while (trevos.length < trevosCount) {
    const idx = Math.floor(Math.random() * trevosPool.length);
    trevos.push(trevosPool[idx]);
    trevosPool.splice(idx, 1);
  }
  trevos.sort((a, b) => a - b);

  const ternoNote = ternoProfile
    ? ` • Reforço Terno+ (${ternoProfile.ternoSimulationsCount}/${ternoProfile.sourceSimulationsCount} sim.)`
    : '';
  const reasoning = `Aposta +Milionária gerada com ${bestValidation?.advancedScore}% de conformidade analítica. Soma: ${bestValidation?.sum} (Padrão Áureo 120-185), Paridade: ${bestValidation?.evenCount}P/${bestValidation?.oddCount}I, ${bestValidation?.frameCount} na Moldura e Trevos [${trevos.join(', ')}]${ternoNote}.`;

  return {
    numbers: bestGame,
    trevos,
    reasoning,
    validation: bestValidation || validateMaisMilionariaBet(bestGame, trevos, referenceDrawNumbers)
  };
}

export function generateMaisMilionariaGameWithRules(
  betCount: number = 6,
  logicOptions?: GeneratorLogic,
  referenceDrawNumbers: number[] = []
) {
  const strategy = logicOptions?.calculationStrategy || 'balanced';
  const result = generateMaisMilionariaWithRules(betCount, 2, referenceDrawNumbers, strategy, logicOptions);
  return {
    numbers: result.numbers,
    trevos: result.trevos,
    reasoning: result.reasoning,
    validation: result.validation,
    advancedMetrics: {
      primesCount: result.validation.primesCount,
      fibonacciCount: result.validation.fibonacciCount,
      multiplesOfThreeCount: result.validation.multiplesOfThreeCount,
      frameCount: result.validation.frameCount,
      centerCount: result.validation.centerCount,
      paretoCount: 0,
      cycleMissingCount: 0,
      maxInRow: 0,
      maxInCol: 0,
      historicalHotCount: result.validation.historicalHotCount,
      advancedScore: result.validation.advancedScore,
      smartSuggestions: result.validation.smartSuggestions
    }
  };
}

// Auto-otimização para +Milionária
export function autoOptimizeMaisMilionariaNumbers(
  currentNumbers: number[],
  currentTrevos: number[] = [1, 2],
  targetSize?: number
): { optimizedNumbers: number[]; optimizedTrevos: number[]; changesMade: string[] } {
  const safeTarget = Math.max(
    6,
    Math.min(12, Math.trunc(targetSize ?? (currentNumbers?.length >= 6 ? currentNumbers.length : 6)))
  );
  let numbers = Array.from(new Set(currentNumbers.filter(n => n >= 1 && n <= 50)));
  const changesMade: string[] = [];

  // Garante safeTarget dezenas
  while (numbers.length < safeTarget) {
    const r = Math.floor(Math.random() * 50) + 1;
    if (!numbers.includes(r)) {
      numbers.push(r);
      changesMade.push(`Adicionada dezena ${r.toString().padStart(2, '0')}`);
    }
  }
  if (numbers.length > safeTarget) {
    numbers = numbers.slice(0, safeTarget);
    changesMade.push(`Limitado às ${safeTarget} dezenas configuradas`);
  }

  // Ajusta soma para padrão proporcional (120–185 para 6 dezenas)
  const goldMin = safeTarget === 6 ? 120 : Math.round((120 * safeTarget) / 6);
  const goldMax = safeTarget === 6 ? 185 : Math.round((185 * safeTarget) / 6);
  const sum = numbers.reduce((a, b) => a + b, 0);
  if (sum < goldMin) {
    const smallest = Math.min(...numbers);
    const replacement = Math.min(50, smallest + (Math.round((goldMin + goldMax) / 2) - sum));
    if (!numbers.includes(replacement) && replacement >= 1 && replacement <= 50) {
      numbers = numbers.map(n => n === smallest ? replacement : n);
      changesMade.push(`Substituída dezena baixa ${smallest} por ${replacement} para elevar soma.`);
    }
  } else if (sum > goldMax) {
    const largest = Math.max(...numbers);
    const replacement = Math.max(1, largest - (sum - Math.round((goldMin + goldMax) / 2)));
    if (!numbers.includes(replacement) && replacement >= 1 && replacement <= 50) {
      numbers = numbers.map(n => n === largest ? replacement : n);
      changesMade.push(`Substituída dezena alta ${largest} por ${replacement} para equilibrar soma.`);
    }
  }

  // Trevos
  const trevos = [...currentTrevos].filter(t => t >= 1 && t <= 6);
  if (trevos.length < 2) {
    const pool = [1, 2, 3, 4, 5, 6].filter(t => !trevos.includes(t));
    if (pool.length > 0) {
      trevos.push(pool[0]);
      changesMade.push(`Adicionado Trevo 🍀 ${pool[0]}`);
    }
  }

  return {
    optimizedNumbers: numbers.sort((a, b) => a - b),
    optimizedTrevos: trevos.sort((a, b) => a - b),
    changesMade
  };
}
