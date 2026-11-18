import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_HYBRID_WEIGHTS,
  SeededRng,
  evaluateHybridCandidateScore,
  generateHybridCoveragePortfolio,
  generateHybridSingleGame,
  inspectTicketStructure
} from '../utils/hybridCoverageStrategy';
import {
  analyzePortfolioCoverage,
  computeCommitmentHash,
  evaluatePortfolioAgainstDraw,
  generateRandomDistinctPortfolio,
  verifyCommitmentHash
} from '../utils/portfolioOptimizer';
import {
  mcnemarTest,
  runChronologicalPortfolioBacktest,
  runThreeWayPairedBenchmark,
  wilsonConfidenceInterval
} from '../utils/hybridBenchmarkEngine';
import { generatePortfolioWithRules } from '../utils/lotteryRules';
import { STRATEGY_CATALOG } from '../utils/strategyCatalog';
import { getQuadrant } from '../utils/megaSenaOfficialStats';
import { CalculationStrategy, GeneratorLogic } from '../types';

const BASE_LOGIC: GeneratorLogic = {
  repeat1to2: true,
  balanceEvenOdd: true,
  sum160to240: true,
  spreadDistribution: true,
  concentrate20to50: true,
  max2Consecutive: true,
  max2IdenticalEndings: true,
  preferHistoricalHotNumbers: true,
  useAdvancedDuques: true,
  frameAndCenterBalance: true,
  balancePrimesAndFibonacci: true,
  paretoTopSelection: true,
  includeCycleDezenas: true,
  multiplesOfThreeBalance: true,
  rowAndColDispersion: true,
  calculationStrategy: 'hybrid_combinatorial',
  strictPlausibilityFilter: true,
  portfolioSubPoolSize: 60
};

describe('Estratégia Híbrida de Cobertura Combinatória', () => {
  it('1-5. Gera exatamente N jogos de 6 dezenas válidas (01..60), sem repetições internas e sem jogos duplicados', () => {
    for (const size of [10, 30, 78]) {
      const res = generateHybridCoveragePortfolio({
        portfolioSize: size,
        betSize: 6,
        maxNum: 60,
        seed: 42078 + size
      });

      assert.equal(res.games.length, size, `Esperava ${size} jogos`);
      assert.equal(res.ticketCount, size);
      assert.equal(res.coverage.distinctGames, size);
      assert.equal(res.coverage.repeatedTickets, 0);

      const seenTickets = new Set<string>();
      for (const game of res.games) {
        assert.equal(game.length, 6);
        const numSet = new Set(game);
        assert.equal(numSet.size, 6, 'Dezenas repetidas dentro do mesmo jogo');
        for (let i = 0; i < game.length; i++) {
          assert.ok(Number.isInteger(game[i]) && game[i] >= 1 && game[i] <= 60, 'Dezena fora de 01..60');
          if (i > 0) assert.ok(game[i] > game[i - 1], 'Jogo deve estar ordenado');
        }
        const key = game.join('-');
        assert.ok(!seenTickets.has(key), `Jogo duplicado encontrado: ${key}`);
        seenTickets.add(key);
      }
    }
  });

  it('6-7. Reprodutibilidade determinística por seed e variação entre seeds distintas', () => {
    const a1 = generateHybridCoveragePortfolio({ portfolioSize: 78, seed: 987654, candidatesPerTicket: 180 });
    const a2 = generateHybridCoveragePortfolio({ portfolioSize: 78, seed: 987654, candidatesPerTicket: 180 });
    const b1 = generateHybridCoveragePortfolio({ portfolioSize: 78, seed: 123456, candidatesPerTicket: 180 });

    assert.equal(a1.seed, 987654);
    assert.deepEqual(a1.games, a2.games, 'Mesma seed e parâmetros devem gerar exatamente a mesma carteira');
    assert.notDeepEqual(a1.games, b1.games, 'Seeds diferentes devem gerar carteiras diferentes');
  });

  it('8-9. Cobertura de pares/trincas superior à carteira aleatória e equilíbrio suave de frequência', () => {
    const hybrid = generateHybridCoveragePortfolio({ portfolioSize: 78, seed: 777001, candidatesPerTicket: 320 });
    const rng = new SeededRng(777001);
    const randomGames = generateRandomDistinctPortfolio(78, 6, 60, () => rng.next());
    const randCov = analyzePortfolioCoverage(randomGames, 60);

    assert.ok(
      hybrid.coverage.uniquePairs > randCov.uniquePairs,
      `Pares híbridos (${hybrid.coverage.uniquePairs}) devem superar aleatório (${randCov.uniquePairs})`
    );
    assert.ok(
      hybrid.coverage.uniqueTriples > randCov.uniqueTriples,
      `Trincas híbridas (${hybrid.coverage.uniqueTriples}) devem superar aleatório (${randCov.uniqueTriples})`
    );
    assert.ok(
      hybrid.coverage.giniCoefficient < randCov.giniCoefficient,
      `Gini híbrido (${hybrid.coverage.giniCoefficient}) deve ser mais equilibrado que aleatório (${randCov.giniCoefficient})`
    );
    assert.equal(hybrid.coverage.distinctNumbers, 60, 'Deve cobrir todas as 60 dezenas em 78 jogos');
  });

  it('10. Soma 160-240 atua como preferência suave e NÃO elimina jogos fora da faixa quando há vantagem combinatória', () => {
    const stride = 61;
    const emptyPairs = new Uint16Array(stride * stride);
    const emptyTriples = new Uint16Array(stride * stride * stride);
    const emptyFreq = new Uint16Array(stride);

    // Jogo com soma dentro de 160..240 vs fora, com mesma cobertura (carteira vazia)
    const inBand = [12, 23, 34, 41, 48, 55]; // soma = 213, 3P/3I
    const outBand = [1, 4, 9, 15, 22, 29];   // soma = 80, 2P/4I

    const scoreIn = evaluateHybridCandidateScore({
      candidate: inBand,
      maxNum: 60,
      pairCounts: emptyPairs,
      tripleCounts: emptyTriples,
      numFreq: emptyFreq,
      expectedFreqPerNumber: 1,
      existingMasks: [],
      weights: DEFAULT_HYBRID_WEIGHTS
    });
    const scoreOut = evaluateHybridCandidateScore({
      candidate: outBand,
      maxNum: 60,
      pairCounts: emptyPairs,
      tripleCounts: emptyTriples,
      numFreq: emptyFreq,
      expectedFreqPerNumber: 1,
      existingMasks: [],
      weights: DEFAULT_HYBRID_WEIGHTS
    });

    assert.ok(scoreIn.sumScore > scoreOut.sumScore, 'Soma 160-240 deve pontuar melhor que soma extrema');

    // Agora simula vantagem combinatória: todos os pares de inBand já cobertos, enquanto outBand traz 15 pares inéditos
    const saturatedPairs = new Uint16Array(stride * stride);
    for (let i = 0; i < inBand.length; i++) {
      for (let j = i + 1; j < inBand.length; j++) {
        saturatedPairs[inBand[i] * stride + inBand[j]] = 2;
      }
    }
    const scoreInSaturated = evaluateHybridCandidateScore({
      candidate: inBand,
      maxNum: 60,
      pairCounts: saturatedPairs,
      tripleCounts: emptyTriples,
      numFreq: emptyFreq,
      expectedFreqPerNumber: 1,
      existingMasks: [],
      weights: DEFAULT_HYBRID_WEIGHTS
    });
    const scoreOutFresh = evaluateHybridCandidateScore({
      candidate: outBand,
      maxNum: 60,
      pairCounts: saturatedPairs,
      tripleCounts: emptyTriples,
      numFreq: emptyFreq,
      expectedFreqPerNumber: 1,
      existingMasks: [],
      weights: DEFAULT_HYBRID_WEIGHTS
    });

    assert.ok(
      scoreOutFresh.totalScore > scoreInSaturated.totalScore,
      'Jogo fora de 160-240 deve vencer quando tiver vantagem combinatória relevante (não eliminatório)'
    );
  });

  it('11-13. Paridade equilibrada, penalidade progressiva de consecutivas e quadrantes compatíveis com 6x10', () => {
    const stride = 61;
    const pairs = new Uint16Array(stride * stride);
    const triples = new Uint16Array(stride * stride * stride);
    const freq = new Uint16Array(stride);

    // Verifica mapeamento real 6x10 dos quadrantes
    assert.equal(getQuadrant(1), 0);
    assert.equal(getQuadrant(10), 1);
    assert.equal(getQuadrant(31), 2);
    assert.equal(getQuadrant(60), 3);

    const balanced33 = evaluateHybridCandidateScore({
      candidate: [5, 16, 24, 37, 42, 59], // 3P/3I, 4 quadrantes, sem consecutivas
      maxNum: 60,
      pairCounts: pairs,
      tripleCounts: triples,
      numFreq: freq,
      expectedFreqPerNumber: 1,
      existingMasks: [],
      weights: DEFAULT_HYBRID_WEIGHTS
    });
    const extreme60 = evaluateHybridCandidateScore({
      candidate: [2, 14, 24, 36, 48, 58], // 6P/0I
      maxNum: 60,
      pairCounts: pairs,
      tripleCounts: triples,
      numFreq: freq,
      expectedFreqPerNumber: 1,
      existingMasks: [],
      weights: DEFAULT_HYBRID_WEIGHTS
    });
    assert.ok(balanced33.parityScore > extreme60.parityScore, '3P/3I deve superar 6P/0I');

    // Consecutivas: 2 < 3 < 4
    const seq2 = evaluateHybridCandidateScore({
      candidate: [12, 13, 25, 34, 48, 57],
      maxNum: 60,
      pairCounts: pairs,
      tripleCounts: triples,
      numFreq: freq,
      expectedFreqPerNumber: 1,
      existingMasks: [],
      weights: DEFAULT_HYBRID_WEIGHTS
    });
    const seq3 = evaluateHybridCandidateScore({
      candidate: [12, 13, 14, 25, 39, 57],
      maxNum: 60,
      pairCounts: pairs,
      tripleCounts: triples,
      numFreq: freq,
      expectedFreqPerNumber: 1,
      existingMasks: [],
      weights: DEFAULT_HYBRID_WEIGHTS
    });
    const seq4 = evaluateHybridCandidateScore({
      candidate: [12, 13, 14, 15, 39, 57],
      maxNum: 60,
      pairCounts: pairs,
      tripleCounts: triples,
      numFreq: freq,
      expectedFreqPerNumber: 1,
      existingMasks: [],
      weights: DEFAULT_HYBRID_WEIGHTS
    });
    assert.ok(seq2.consecutivePenalty < seq3.consecutivePenalty);
    assert.ok(seq3.consecutivePenalty < seq4.consecutivePenalty);
    assert.equal(inspectTicketStructure([12, 13, 14, 15, 39, 57]).maxConsecutiveRun, 4);
  });

  it('14. Integridade do hash de compromisso SHA-256 e detecção de adulteração', async () => {
    const hybrid = generateHybridCoveragePortfolio({ portfolioSize: 15, seed: 551199, candidatesPerTicket: 120 });
    const rand = generateRandomDistinctPortfolio(15, 6, 60);
    const createdAt = 1700000000000;
    const hash = await computeCommitmentHash({
      targetContest: 3075,
      createdAt,
      optimizedGames: hybrid.games,
      randomBaselineGames: rand,
      strategyKey: 'hybrid_combinatorial',
      seed: hybrid.seed,
      randomSeed: 999
    });

    const entry = {
      id: 'test-1',
      targetContest: 3075,
      createdAt,
      strategyLabel: 'Estratégia Híbrida',
      strategyKey: 'hybrid_combinatorial' as const,
      seed: hybrid.seed,
      randomSeed: 999,
      hashVersion: 2 as const,
      ticketCount: 15,
      betSize: 6,
      ticketPrice: 5,
      totalCost: 75,
      optimizedGames: hybrid.games,
      randomBaselineGames: rand,
      commitmentHash: hash,
      locked: true as const,
      optimizedCoverage: hybrid.coverage,
      randomCoverage: analyzePortfolioCoverage(rand, 60)
    };

    assert.equal(await verifyCommitmentHash(entry), true, 'Hash original deve validar');

    // Simula adulteração de 1 dezena em um jogo
    const tamperedGames = hybrid.games.map(g => [...g]);
    tamperedGames[0][0] = tamperedGames[0][0] === 1 ? 2 : 1;
    assert.equal(
      await verifyCommitmentHash({ ...entry, optimizedGames: tamperedGames }),
      false,
      'Adulteração nos jogos deve invalidar o hash'
    );
  });

  it('15a. Benchmark pareado >= 50 simulações e testes estatísticos (McNemar + Wilson CI)', async () => {
    const mc = mcnemarTest(10, 12, 3, 25);
    assert.equal(mc.discordantTotal, 15);
    assert.equal(mc.exactBinomialUsed, true);
    assert.ok(mc.pValue > 0 && mc.pValue < 0.05);

    const ci = wilsonConfidenceInterval(30, 50);
    assert.ok(ci.lowPct < 60 && ci.highPct > 60);

    const report = await runThreeWayPairedBenchmark({
      simulationsCount: 50,
      ticketCount: 30,
      betSize: 6,
      baseSeed: 202650,
      candidatesPerTicket: 80
    });

    assert.equal(report.simulationsCount, 50);
    assert.equal(report.hybrid.ticketCount, 30);
    assert.equal(report.pureCombinatorial.ticketCount, 30);
    assert.equal(report.randomBaseline.ticketCount, 30);
    assert.ok(report.hybrid.avgPairCoveragePct > report.randomBaseline.avgPairCoveragePct);
    assert.ok(report.hybrid.avgTripleCoveragePct > report.randomBaseline.avgTripleCoveragePct);
  });

  it('15b. Backtest cronológico walk-forward preserva causalidade e transparência sobre prêmios históricos', async () => {
    const wf = await runChronologicalPortfolioBacktest({
      ticketCount: 20,
      betSize: 6,
      baseSeed: 404040,
      maxContests: 12,
      candidatesPerTicket: 80
    });

    assert.equal(wf.contestsEvaluated, 12);
    assert.equal(wf.historicalPrizesAvailable, false);
    assert.ok(wf.startContest < wf.endContest);
    for (let i = 1; i < wf.perContestTimeline.length; i++) {
      assert.ok(
        wf.perContestTimeline[i].contest > wf.perContestTimeline[i - 1].contest,
        'Linha do tempo deve estar estritamente crescente'
      );
    }
    assert.equal(wf.hybrid.totalCost, 12 * 20 * 5);
  });

  it('16. Regressão: catálogo e todas as estratégias existentes continuam operacionais', () => {
    const allStrategies: CalculationStrategy[] = [
      'combinatorial_cover',
      'hybrid_combinatorial',
      'balanced',
      'momentum',
      'cycle_delay',
      'cooccurrence',
      'entropy_shannon'
    ];

    for (const s of allStrategies) {
      assert.ok(STRATEGY_CATALOG[s], `Catálogo deve conter ${s}`);
      const res = generatePortfolioWithRules(8, 6, {
        ...BASE_LOGIC,
        calculationStrategy: s,
        portfolioSeed: 112233
      });
      assert.equal(res.games.length, 8, `Estratégia ${s} deve gerar 8 jogos`);
      assert.equal(res.coverage.distinctGames, 8, `Estratégia ${s} não deve gerar duplicatas`);
    }

    const single = generateHybridSingleGame({ seed: 998877 });
    assert.equal(single.numbers.length, 6);
    assert.equal(single.seed, 998877);
  });

  it('17. Avaliação contra sorteio contabiliza ternos/quadras/quinas/senas corretamente', () => {
    const res = evaluatePortfolioAgainstDraw(
      [
        [1, 2, 3, 10, 20, 30], // 3 acertos (terno)
        [1, 2, 3, 4, 25, 35],  // 4 acertos (quadra)
        [1, 2, 3, 4, 5, 6]     // 6 acertos (sena)
      ],
      [1, 2, 3, 4, 5, 6]
    );
    assert.equal(res.ternos, 1);
    assert.equal(res.quadras, 1);
    assert.equal(res.quinas, 0);
    assert.equal(res.senas, 1);
    assert.equal(res.hasAny3Plus, true);
    assert.equal(res.hasAny4Plus, true);
    assert.equal(res.maxHitsInPortfolio, 6);
  });
});
