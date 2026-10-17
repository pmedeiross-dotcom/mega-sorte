import { GeneratorLogic } from '../types';

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
  allActiveRulesPassed: boolean;
  passedRulesCount: number;
  activeRulesCount: number;
}

// Quadrantes tradicionais da cartela de 60 dezenas (6 linhas x 10 colunas):
// Linhas 1-3 (dezenas 1 a 30), Linhas 4-6 (dezenas 31 a 60)
// Colunas 1-5 (esquerda), Colunas 6-10 (direita)
export const getQuadrant = (num: number): number => {
  const row = Math.floor((num - 1) / 10); // 0 a 5
  const col = (num - 1) % 10; // 0 a 9
  if (row < 3 && col < 5) return 0; // Quadrante 1: Superior Esquerdo
  if (row < 3 && col >= 5) return 1; // Quadrante 2: Superior Direito
  if (row >= 3 && col < 5) return 2; // Quadrante 3: Inferior Esquerdo
  return 3; // Quadrante 4: Inferior Direito
};

export const validateGameAgainstRules = (
  numbers: number[],
  logic: GeneratorLogic,
  referenceNumbers?: number[]
): GameValidationDetails => {
  const sorted = [...numbers].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, curr) => acc + curr, 0);

  // 1. Soma entre 160 e 240
  const sumValid = !logic.sum160to240 || (sum >= 160 && sum <= 240);

  // 2. Equilíbrio Par/Ímpar (3/3 ou 4/2 ou 2/4)
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

  // 3. Distribuição Espalhada (pelo menos 3 quadrantes contemplados)
  const quadrants: [number, number, number, number] = [0, 0, 0, 0];
  sorted.forEach(n => {
    quadrants[getQuadrant(n)]++;
  });
  const populatedQuadrants = quadrants.filter(q => q > 0).length;
  const quadrantsValid = !logic.spreadDistribution || (populatedQuadrants >= 3 && Math.max(...quadrants) <= 3);

  // 4. Concentração no intervalo 20 a 50 (pelo menos metade das dezenas no intervalo)
  const count20to50 = sorted.filter(n => n >= 20 && n <= 50).length;
  const targetMin20to50 = Math.floor(sorted.length * 0.5); // ex: pelo menos 3 em 6
  const count20to50Valid = !logic.concentrate20to50 || (count20to50 >= targetMin20to50 && count20to50 <= sorted.length);

  // 5. No máximo 2 números em sequência consecutiva (ex: 12, 13 permitido; 12, 13, 14 proibido)
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

  // max 2 sequências consecutivas e nenhuma sequência com mais de 2 números
  const consecutiveValid = !logic.max2Consecutive || (maxConsecutive <= 2 && consecutiveSequences.length <= 2);

  // 6. No máximo 2 finais iguais (ex: finais 4 -> max 2 números terminando em 4)
  const endingsMap: Record<number, number> = {};
  sorted.forEach(n => {
    const end = n % 10;
    endingsMap[end] = (endingsMap[end] || 0) + 1;
  });
  const maxEndingCount = Math.max(...Object.values(endingsMap), 0);
  const endingsValid = !logic.max2IdenticalEndings || (maxEndingCount <= 2);

  // 7. Repetição de 1-2 dezenas do sorteio anterior
  let repeatedCount = 0;
  if (referenceNumbers && referenceNumbers.length > 0) {
    const refSet = new Set(referenceNumbers);
    repeatedCount = sorted.filter(n => refSet.has(n)).length;
  }
  const repeatValid = !logic.repeat1to2 || (repeatedCount >= 1 && repeatedCount <= 2);

  // Contabilização de regras ativas e aprovadas
  const activeChecks = [
    { active: logic.sum160to240, valid: sumValid },
    { active: logic.balanceEvenOdd, valid: evenOddValid },
    { active: logic.spreadDistribution, valid: quadrantsValid },
    { active: logic.concentrate20to50, valid: count20to50Valid },
    { active: logic.max2Consecutive, valid: consecutiveValid },
    { active: logic.max2IdenticalEndings, valid: endingsValid },
    { active: logic.repeat1to2, valid: repeatValid },
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
    allActiveRulesPassed,
    passedRulesCount,
    activeRulesCount
  };
};

/**
 * Gerador de dezenas inteligente com respeito estrito às regras estatísticas selecionadas.
 */
export const generateGameWithRules = (
  quantity: number = 6,
  logic: GeneratorLogic,
  referenceNumbers: number[] = [5, 12, 26, 33, 44, 58] // Sorteio base padrão caso não informado
): { numbers: number[]; reasoning: string; passedAllRules: boolean } => {
  const maxAttempts = 1500;
  let bestAttempt: number[] = [];
  let bestScore = -1;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidates: Set<number> = new Set();

    // Se a regra de repetição estiver ativa, seleciona 1 ou 2 dezenas do sorteio anterior primeiro
    if (logic.repeat1to2 && referenceNumbers && referenceNumbers.length >= 2) {
      const repeatCount = Math.random() > 0.5 ? 2 : 1;
      const shuffledRef = [...referenceNumbers].sort(() => 0.5 - Math.random());
      for (let i = 0; i < Math.min(repeatCount, shuffledRef.length); i++) {
        candidates.add(shuffledRef[i]);
      }
    }

    // Se regra de concentração 20-50 estiver ativa, garante viés probabilístico
    while (candidates.size < quantity) {
      let candidate: number;
      if (logic.concentrate20to50 && candidates.size < Math.floor(quantity * 0.7) && Math.random() < 0.75) {
        candidate = Math.floor(Math.random() * 31) + 20; // 20 a 50
      } else {
        candidate = Math.floor(Math.random() * 60) + 1; // 1 a 60
      }
      candidates.add(candidate);
    }

    const testNumbers = Array.from(candidates).sort((a, b) => a - b);
    const validation = validateGameAgainstRules(testNumbers, logic, referenceNumbers);

    if (validation.allActiveRulesPassed) {
      const activeDescriptions: string[] = [];
      if (logic.sum160to240) activeDescriptions.push(`soma ${validation.sum} (160–240)`);
      if (logic.balanceEvenOdd) activeDescriptions.push(`${validation.evenCount}P/${validation.oddCount}I`);
      if (logic.concentrate20to50) activeDescriptions.push(`${validation.count20to50} dezenas na faixa 20-50`);
      if (logic.spreadDistribution) activeDescriptions.push(`distribuído em ${validation.quadrants.filter(q => q > 0).length} quadrantes`);
      if (logic.max2Consecutive) activeDescriptions.push('max 2 consecutivas');
      if (logic.max2IdenticalEndings) activeDescriptions.push('max 2 finais iguais');
      if (logic.repeat1to2) activeDescriptions.push(`${validation.repeatedCount} repetida(s)`);

      const reason = activeDescriptions.length > 0
        ? `Jogo gerado atendendo 100% às regras estatísticas selecionadas: ${activeDescriptions.join(', ')}.`
        : `Jogo gerado com balanceamento probabilístico ideal (soma ${validation.sum}, ${validation.evenCount} pares e ${validation.oddCount} ímpares).`;

      return {
        numbers: testNumbers,
        reasoning: reason,
        passedAllRules: true
      };
    }

    if (validation.passedRulesCount > bestScore) {
      bestScore = validation.passedRulesCount;
      bestAttempt = testNumbers;
    }
  }

  // Retorna a melhor combinação encontrada
  const fallbackValidation = validateGameAgainstRules(bestAttempt, logic, referenceNumbers);
  return {
    numbers: bestAttempt.length === quantity ? bestAttempt : generateBasicBalancedNumbers(quantity),
    reasoning: `Jogo otimizado com a melhor pontuação estatística (${fallbackValidation.passedRulesCount}/${fallbackValidation.activeRulesCount} regras cumpridas).`,
    passedAllRules: false
  };
};

const generateBasicBalancedNumbers = (quantity: number): number[] => {
  const nums = new Set<number>();
  while (nums.size < quantity) {
    nums.add(Math.floor(Math.random() * 60) + 1);
  }
  return Array.from(nums).sort((a, b) => a - b);
};
