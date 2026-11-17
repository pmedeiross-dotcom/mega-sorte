/**
 * Estratégia Híbrida de Cobertura Combinatória.
 *
 * Combina cobertura de pares/trincas, equilíbrio da frequência das dezenas
 * e critérios estruturais suaves. Os critérios históricos nunca são tratados
 * como previsão: apenas orientam a diversidade da carteira.
 */

import { analyzePortfolioCoverage, PortfolioCoverageMetrics } from './portfolioOptimizer';

export interface HybridCoverageOptions {
  betSize?: number;
  seed?: number;
  candidatesPerTicket?: number;
  sumMin?: number;
  sumMax?: number;
  refinementPasses?: number;
}

export interface HybridCoverageResult {
  games: number[][];
  coverage: PortfolioCoverageMetrics;
  seed: number;
  objective: {
    uniquePairs: number;
    uniqueTriples: number;
    structuralScore: number;
    frequencyImbalance: number;
  };
}

function createRng(seed: number): () => number {
  let state = seed >>> 0 || 0x9e3779b9;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

function sampleTicket(rng: () => number, betSize: number): number[] {
  const pool = Array.from({ length: 60 }, (_, i) => i + 1);
  for (let i = 0; i < betSize; i++) {
    const j = i + Math.floor(rng() * (60 - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, betSize).sort((a, b) => a - b);
}

function structuralScore(
  ticket: number[],
  sumMin: number,
  sumMax: number
): number {
  const sum = ticket.reduce((a, b) => a + b, 0);
  const evens = ticket.filter(n => n % 2 === 0).length;
  const decades = new Map<number, number>();
  const quadrants = new Set<number>();
  let consecutivePairs = 0;

  ticket.forEach((n, i) => {
    const decade = Math.floor((n - 1) / 10);
    decades.set(decade, (decades.get(decade) || 0) + 1);
    quadrants.add((Math.floor((n - 1) / 10) < 3 ? 0 : 2) + ((n - 1) % 10 < 5 ? 0 : 1));
    if (i > 0 && n === ticket[i - 1] + 1) consecutivePairs++;
  });

  let score = 0;
  // Soma é um critério suave: jogos fora da faixa continuam elegíveis.
  if (sum >= sumMin && sum <= sumMax) score += 12;
  else {
    const distance = sum < sumMin ? sumMin - sum : sum - sumMax;
    score += Math.max(-8, 8 - distance * 0.25);
  }

  if ([2, 3, 4].includes(evens)) score += 8;
  if (quadrants.size >= 3) score += 7;
  else score -= (3 - quadrants.size) * 3;
  if (Math.max(...decades.values()) <= 3) score += 5;
  else score -= (Math.max(...decades.values()) - 3) * 4;
  if (consecutivePairs <= 2) score += 3;
  else score -= (consecutivePairs - 2) * 3;

  return score;
}

function pairKey(a: number, b: number): number {
  return a * 61 + b;
}

function tripleKey(a: number, b: number, c: number): number {
  return (a * 61 + b) * 61 + c;
}

/**
 * Gera uma carteira reproduzível. O mesmo seed e as mesmas opções produzem
 * exatamente os mesmos jogos.
 */
export function generateHybridCoveragePortfolio(
  portfolioSize: number,
  options: HybridCoverageOptions = {}
): HybridCoverageResult {
  const size = Math.max(1, Math.min(500, Math.floor(portfolioSize)));
  const betSize = Math.max(6, Math.min(15, Math.floor(options.betSize ?? 6)));
  const seed = Math.floor(options.seed ?? 20261117) >>> 0;
  const candidatesPerTicket = Math.max(40, Math.min(1200, options.candidatesPerTicket ?? 320));
  const sumMin = options.sumMin ?? 160;
  const sumMax = options.sumMax ?? 240;
  const rng = createRng(seed);

  const pairCounts = new Map<number, number>();
  const tripleCounts = new Map<number, number>();
  const numberCounts = new Uint16Array(61);
  const used = new Set<string>();
  const games: number[][] = [];
  const targetFrequency = (size * betSize) / 60;

  for (let index = 0; index < size; index++) {
    let best: number[] | null = null;
    let bestScore = -Infinity;

    for (let attempt = 0; attempt < candidatesPerTicket; attempt++) {
      const candidate = sampleTicket(rng, betSize);
      const key = candidate.join('-');
      if (used.has(key)) continue;

      let newPairs = 0;
      let pairCollision = 0;
      let newTriples = 0;
      let tripleCollision = 0;
      let frequencyPenalty = 0;

      for (let i = 0; i < betSize; i++) {
        const nextFrequency = numberCounts[candidate[i]] + 1;
        frequencyPenalty += (nextFrequency - targetFrequency) ** 2;
        for (let j = i + 1; j < betSize; j++) {
          const count = pairCounts.get(pairKey(candidate[i], candidate[j])) || 0;
          if (count === 0) newPairs++;
          else pairCollision += count * count;
          for (let k = j + 1; k < betSize; k++) {
            const triple = tripleCounts.get(tripleKey(candidate[i], candidate[j], candidate[k])) || 0;
            if (triple === 0) newTriples++;
            else tripleCollision += triple * triple;
          }
        }
      }

      const structure = structuralScore(candidate, sumMin, sumMax);
      const score =
        newPairs * 25 +
        newTriples * 10 -
        pairCollision * 6 -
        tripleCollision * 14 -
        frequencyPenalty * 3.5 +
        structure * 2.5 +
        rng() * 0.001;

      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }

    if (!best) {
      let fallback: number[];
      do {
        fallback = sampleTicket(rng, betSize);
      } while (used.has(fallback.join('-')));
      best = fallback;
    }

    used.add(best.join('-'));
    games.push(best);
    for (let i = 0; i < betSize; i++) {
      numberCounts[best[i]]++;
      for (let j = i + 1; j < betSize; j++) {
        const pk = pairKey(best[i], best[j]);
        pairCounts.set(pk, (pairCounts.get(pk) || 0) + 1);
        for (let k = j + 1; k < betSize; k++) {
          const tk = tripleKey(best[i], best[j], best[k]);
          tripleCounts.set(tk, (tripleCounts.get(tk) || 0) + 1);
        }
      }
    }
  }

  const coverage = analyzePortfolioCoverage(games, 60);
  const structuralTotal = games.reduce(
    (sum, game) => sum + structuralScore(game, sumMin, sumMax),
    0
  );
  const frequencyImbalance = Array.from({ length: 60 }, (_, i) =>
    (numberCounts[i + 1] - targetFrequency) ** 2
  ).reduce((a, b) => a + b, 0);

  return {
    games,
    coverage,
    seed,
    objective: {
      uniquePairs: coverage.uniquePairs,
      uniqueTriples: coverage.uniqueTriples,
      structuralScore: structuralTotal,
      frequencyImbalance
    }
  };
}
