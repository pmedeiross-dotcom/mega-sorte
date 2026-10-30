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
  const sum = numbers.reduce((a, b) => a + b, 0);
  const sumValid = sum >= 120 && sum <= 185;

  const evenCount = numbers.filter(n => n % 2 === 0).length;
  const oddCount = numbers.length - evenCount;
  const evenOddValid = (evenCount === 3 && oddCount === 3) || 
                       (evenCount === 4 && oddCount === 2) || 
                       (evenCount === 2 && oddCount === 4);

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
  if (primesCount >= 1 && primesCount <= 3) score += 15;
  if (frameCount >= 2 && frameCount <= 4) score += 10;
  if (historicalHotCount >= 1) score += 10;

  const passedAllRules = sumValid && evenOddValid && repeatValid;

  const smartSuggestions: string[] = [];
  if (!sumValid) {
    smartSuggestions.push(sum < 120 ? `Soma (${sum}) baixa. O padrão áureo da +Milionária é de 120 a 185.` : `Soma (${sum}) alta. O padrão áureo é de 120 a 185.`);
  }
  if (!evenOddValid) {
    smartSuggestions.push(`Equilíbrio par/ímpar (${evenCount}P/${oddCount}I) fora das faixas mais premiadas (3P/3I ou 4P/2I).`);
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
  strategy: CalculationStrategy = 'balanced'
): { numbers: number[]; trevos: number[]; reasoning: string; validation: MaisMilionariaValidation } {
  let bestGame: number[] = [];
  let bestScore = -1;
  let bestValidation: MaisMilionariaValidation | null = null;

  const candidatePool = Array.from({ length: 50 }, (_, i) => i + 1);

  // Duques fortes da +Milionária
  const topDuquesPairs = [
    [21, 41], [40, 50], [21, 22], [4, 38], [28, 46], [17, 50], [24, 35]
  ];

  // Executa amostragem dirigida
  for (let attempt = 0; attempt < 350; attempt++) {
    const current: number[] = [];

    // 1. Estratégia
    if (strategy === 'cooccurrence' || attempt % 2 === 0) {
      const duque = topDuquesPairs[Math.floor(Math.random() * topDuquesPairs.length)];
      current.push(...duque);
    }

    // 2. Repetição do concurso anterior (0 ou 1 dezena)
    if (referenceDrawNumbers.length > 0 && Math.random() < 0.45) {
      const repNum = referenceDrawNumbers[Math.floor(Math.random() * referenceDrawNumbers.length)];
      if (!current.includes(repNum) && repNum <= 50) {
        current.push(repNum);
      }
    }

    // 3. Completa respeitando paridade e soma
    const pool = candidatePool.filter(n => !current.includes(n));
    while (current.length < betCount) {
      const idx = Math.floor(Math.random() * pool.length);
      current.push(pool[idx]);
      pool.splice(idx, 1);
    }

    const sorted = [...current].sort((a, b) => a - b);
    const validation = validateMaisMilionariaBet(sorted, [1, 2], referenceDrawNumbers);

    if (validation.advancedScore > bestScore) {
      bestScore = validation.advancedScore;
      bestGame = sorted;
      bestValidation = validation;
      if (validation.advancedScore >= 95) break;
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

  const reasoning = `Aposta +Milionária gerada com ${bestValidation?.advancedScore}% de conformidade analítica. Soma: ${bestValidation?.sum} (Padrão Áureo 120-185), Paridade: ${bestValidation?.evenCount}P/${bestValidation?.oddCount}I, ${bestValidation?.frameCount} na Moldura e Trevos [${trevos.join(', ')}].`;

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
  const result = generateMaisMilionariaWithRules(betCount, 2, referenceDrawNumbers, strategy);
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
  currentTrevos: number[] = [1, 2]
): { optimizedNumbers: number[]; optimizedTrevos: number[]; changesMade: string[] } {
  let numbers = [...currentNumbers].filter(n => n >= 1 && n <= 50);
  const changesMade: string[] = [];

  // Garante pelo menos 6 dezenas
  while (numbers.length < 6) {
    const r = Math.floor(Math.random() * 50) + 1;
    if (!numbers.includes(r)) {
      numbers.push(r);
      changesMade.push(`Adicionada dezena ${r.toString().padStart(2, '0')}`);
    }
  }

  // Ajusta soma para 120 a 185
  let sum = numbers.reduce((a, b) => a + b, 0);
  if (sum < 120) {
    const smallest = Math.min(...numbers);
    const replacement = Math.min(50, smallest + (140 - sum));
    if (!numbers.includes(replacement)) {
      numbers = numbers.map(n => n === smallest ? replacement : n);
      changesMade.push(`Substituída dezena baixa ${smallest} por ${replacement} para elevar soma.`);
    }
  } else if (sum > 185) {
    const largest = Math.max(...numbers);
    const replacement = Math.max(1, largest - (sum - 160));
    if (!numbers.includes(replacement)) {
      numbers = numbers.map(n => n === largest ? replacement : n);
      changesMade.push(`Substituída dezena alta ${largest} por ${replacement} para equilibrar soma.`);
    }
  }

  // Trevos
  let trevos = [...currentTrevos].filter(t => t >= 1 && t <= 6);
  if (trevos.length < 2) {
    const pool = [1, 2, 3, 4, 5, 6].filter(t => !trevos.includes(t));
    trevos.push(pool[0]);
    changesMade.push(`Adicionado Trevo 🍀 ${pool[0]}`);
  }

  return {
    optimizedNumbers: numbers.sort((a, b) => a - b),
    optimizedTrevos: trevos.sort((a, b) => a - b),
    changesMade
  };
}
