import React, { useMemo, useState } from 'react';
import { 
  ArrowRight, 
  Layers, 
  Flame, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  Info, 
  BarChart2, 
  Hash,
  ShieldAlert,
  ShieldCheck,
  Search,
  Check,
  X,
  Zap,
  Plus,
  RefreshCw,
  Trophy
} from 'lucide-react';
import { computeSequenceAnalytics, findConsecutiveGroups } from '../utils/sequenceAnalytics';
import { offlineCacheManager } from '../services/offlineCacheManager';
import { OfficialDrawResult, LotteryType } from '../types';

interface SequenceAnalyticsViewProps {
  latestDraw?: OfficialDrawResult;
  lottery?: LotteryType;
  onAddBet?: (numbers: number[], type: string, reasoning: string) => void;
}

interface ComplianceRuleCheck {
  id: string;
  title: string;
  targetDescription: string;
  status: 'passed' | 'warning' | 'violated';
  badgeLabel: string;
  observedText: string;
  foundNumbers: number[];
  foundNumbersLabel: string;
  historicalContext: string;
  recommendation?: string;
}

export const SequenceAnalyticsView: React.FC<SequenceAnalyticsViewProps> = ({
  latestDraw,
  lottery = 'megasena',
  onAddBet
}) => {
  const activeLottery: LotteryType = (lottery as LotteryType) || 'megasena';
  const isLotofacil = activeLottery === 'lotofacil';
  const isMaisMilionaria = activeLottery === 'maismilionaria';
  const maxNumber = isLotofacil ? 25 : (isMaisMilionaria ? 50 : 60);
  
  // Dados do último sorteio oficial de referência
  const officialRefNumbers = useMemo(() => {
    if (latestDraw?.numbers && latestDraw.numbers.length >= (isLotofacil ? 15 : 6)) {
      return [...latestDraw.numbers].sort((a, b) => a - b);
    }
    return isLotofacil
      ? [1, 2, 5, 6, 9, 10, 11, 13, 14, 17, 18, 20, 21, 23, 25]
      : isMaisMilionaria
      ? [1, 15, 23, 34, 45, 49]
      : [5, 14, 28, 33, 42, 59];
  }, [latestDraw, isLotofacil, isMaisMilionaria]);

  const officialContestNumber = latestDraw?.contestNumber || (isLotofacil ? 3350 : (isMaisMilionaria ? 401 : 3071));

  const analytics = useMemo(() => {
    return offlineCacheManager.getOrComputeSequenceAnalytics(activeLottery, latestDraw);
  }, [activeLottery, latestDraw]);

  // Números padrão iniciais com 1 repetida do último sorteio e 1 dupla consecutiva (Padrão Ouro)
  const defaultInitialGame = useMemo(() => {
    if (isLotofacil) {
      return officialRefNumbers.slice(0, 15);
    }
    const refFirst = officialRefNumbers[0] || 14;
    // Tenta montar [refFirst, refFirst+1, ...] sem ultrapassar maxNumber
    const pairSecond = refFirst < maxNumber ? refFirst + 1 : refFirst - 1;
    const candidates = [refFirst, pairSecond, 28, 33, 42, 51].filter(n => n >= 1 && n <= maxNumber);
    const set = Array.from(new Set(candidates)).sort((a, b) => a - b);
    while (set.length < 6) {
      for (let n = 1; n <= maxNumber; n++) {
        if (!set.includes(n)) {
          set.push(n);
          if (set.length === 6) break;
        }
      }
    }
    return set.sort((a, b) => a - b);
  }, [officialRefNumbers, maxNumber, isLotofacil]);

  // Estado interativo do testador rápido
  const [selectedTestBalls, setSelectedTestBalls] = useState<number[]>(defaultInitialGame);
  const [testInput, setTestInput] = useState<string>(defaultInitialGame.join(', '));

  // Captura imediata do input de números do usuário com parsing flexível
  const handleInputChange = (val: string) => {
    setTestInput(val);
    // Suporta delimitadores: vírgula, espaço, ponto e vírgula, traço, quebra de linha
    const tokens = val.split(/[\s,;\n\t\r\-]+/);
    const parsedNums: number[] = [];
    tokens.forEach(tok => {
      const clean = tok.trim();
      if (!clean) return;
      const parsed = parseInt(clean, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= maxNumber) {
        parsedNums.push(parsed);
      }
    });

    const uniqueSorted = Array.from(new Set<number>(parsedNums)).sort((a, b) => a - b);
    setSelectedTestBalls(uniqueSorted);
  };

  // Alterna dezena na mini cartela interativa
  const toggleTestBall = (num: number) => {
    let next: number[];
    if (selectedTestBalls.includes(num)) {
      next = selectedTestBalls.filter(n => n !== num);
    } else {
      if (selectedTestBalls.length >= 15) return;
      next = [...selectedTestBalls, num].sort((a, b) => a - b);
    }
    setSelectedTestBalls(next);
    setTestInput(next.join(', '));
  };

  // Carrega preset com sincronização imediata
  const loadPreset = (numbers: number[]) => {
    const valid = numbers.filter(n => n >= 1 && n <= maxNumber).sort((a, b) => a - b);
    setSelectedTestBalls(valid);
    setTestInput(valid.join(', '));
  };

  // Preset com 1 dezena do último sorteio e 1 dupla consecutiva (Padrão Ouro ideal)
  const loadGoldenPreset = () => {
    if (isLotofacil) {
      loadPreset([1, 2, 3, 5, 8, 10, 11, 13, 14, 17, 18, 20, 21, 23, 25]);
      return;
    }
    const refSample = officialRefNumbers[1] || 14;
    const neighbor = refSample < maxNumber ? refSample + 1 : refSample - 1;
    const base = [refSample, neighbor, 5, 23, 38, 45].filter(n => n >= 1 && n <= maxNumber);
    const unique = Array.from(new Set(base)).sort((a, b) => a - b);
    loadPreset(unique);
  };

  // Preset com regras violadas para teste de diagnóstico
  const loadViolatedPreset = () => {
    // Regras violadas para teste
    const violated = isLotofacil
      ? [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 1, 3, 5] // 12 pares (extremo), soma atípica
      : isMaisMilionaria 
      ? [2, 4, 6, 8, 10, 12] // 6 pares, soma 42 (abaixo de 120), 0 repetidas
      : [2, 4, 6, 8, 10, 12]; // 6 pares, soma 42 (muito abaixo de 160)
    loadPreset(violated);
  };

  // ANÁLISE ESTATÍSTICA DE CONFORMIDADE IMEDIATA CONTRA O ÚLTIMO SORTEIO E REGRAS OFICIAIS
  const complianceAnalysis = useMemo(() => {
    if (selectedTestBalls.length === 0) return null;

    const currentNumbers = [...selectedTestBalls].sort((a, b) => a - b);
    const count = currentNumbers.length;

    // 1. Confronto Direto com o Último Concurso Oficial
    const repeatedFromLatest = currentNumbers.filter(n => officialRefNumbers.includes(n));
    const repeatedCount = repeatedFromLatest.length;

    // 2. Análise de Sequências Consecutivas
    const consecutiveGroups = findConsecutiveGroups(currentNumbers);
    const maxConsecutiveLength = consecutiveGroups.length > 0 
      ? Math.max(...consecutiveGroups.map(g => g.length)) 
      : 1;
    const hasSinglePair = consecutiveGroups.length === 1 && maxConsecutiveLength === 2;
    const hasDoublePair = consecutiveGroups.length === 2 && maxConsecutiveLength === 2;
    const hasTripletOrMore = maxConsecutiveLength >= 3;

    // 3. Paridade (Pares e Ímpares)
    const evenNumbers = currentNumbers.filter(n => n % 2 === 0);
    const oddNumbers = currentNumbers.filter(n => n % 2 !== 0);
    const evenCount = evenNumbers.length;
    const oddCount = oddNumbers.length;
    const isEvenOddBalanced = (evenCount === 3 && oddCount === 3) || 
                             (evenCount === 4 && oddCount === 2) || 
                             (evenCount === 2 && oddCount === 4);
    const isEvenOddExtreme = (evenCount === 6 || oddCount === 6);

    // 4. Soma das Dezenas
    const sum = currentNumbers.reduce((a, b) => a + b, 0);
    const idealSumMin = isMaisMilionaria ? 120 : 160;
    const idealSumMax = isMaisMilionaria ? 185 : 240;
    const isSumValid = sum >= idealSumMin && sum <= idealSumMax;

    // 5. Dispersão por Quadrantes
    const q1Numbers: number[] = [];
    const q2Numbers: number[] = [];
    const q3Numbers: number[] = [];
    const q4Numbers: number[] = [];
    currentNumbers.forEach(n => {
      const row = Math.floor((n - 1) / 10);
      const col = (n - 1) % 10;
      if (row < 3 && col < 5) q1Numbers.push(n);
      else if (row < 3 && col >= 5) q2Numbers.push(n);
      else if (row >= 3 && col < 5) q3Numbers.push(n);
      else q4Numbers.push(n);
    });
    const quadrantsUsed = [q1Numbers, q2Numbers, q3Numbers, q4Numbers].filter(q => q.length > 0).length;
    const isQuadrantDispersed = quadrantsUsed >= 3;

    // 6. Números de Aniversário (1 a 31) vs Dezenas Altas (32+)
    const lowNumbers = currentNumbers.filter(n => n <= 31);
    const isAllLow = count >= 6 && lowNumbers.length === count;

    // CONSTRUÇÃO DO CHECKLIST DETALHADO DE REGRAS E CONFORMIDADE
    const rules: ComplianceRuleCheck[] = [];

    // REGRA 1: Conformidade contra o Último Sorteio Oficial (Repetição Histórica)
    let repStatus: 'passed' | 'warning' | 'violated' = 'passed';
    let repBadge = 'Aprovado (Padrão Ouro)';
    let repRecommendation: string | undefined;

    if (isLotofacil) {
      if (repeatedCount >= 8 && repeatedCount <= 10) {
        repStatus = 'passed';
        repBadge = '✅ Padrão Ouro Lotofácil (8 a 10 repetidas)';
      } else if (repeatedCount === 7 || repeatedCount === 11) {
        repStatus = 'warning';
        repBadge = '⚠️ Desvio Leve (7 ou 11 repetidas)';
        repRecommendation = `Seu jogo repete ${repeatedCount} dezenas do concurso anterior. A zona de ouro histórica é de 8 a 10 repetidas (79,5% dos concursos).`;
      } else {
        repStatus = 'violated';
        repBadge = '❌ Fora da Zona de Ouro (<7 ou >11 repetidas)';
        repRecommendation = `Você selecionou ${repeatedCount} dezenas repetidas. Na Lotofácil, 8 a 10 repetidas ocorrem em quase 80% dos concursos.`;
      }
    } else {
      if (repeatedCount === 1 || repeatedCount === 2) {
        repStatus = 'passed';
        repBadge = '✅ Padrão Ouro Caixa';
      } else if (repeatedCount === 0) {
        repStatus = 'warning';
        repBadge = '⚠️ Sem Repetição do Último Concurso';
        repRecommendation = `Considere incluir ao menos 1 dezena do último concurso (${officialRefNumbers.map(n => n.toString().padStart(2, '0')).join(', ')}). Em 60,5% dos sorteios há repetição.`;
      } else {
        repStatus = 'violated';
        repBadge = '❌ Regra Violada (Excesso)';
        repRecommendation = `Você selecionou ${repeatedCount} dezenas do concurso anterior. Apenas 3,5% dos sorteios da história tiveram 3 ou mais repetidas. Reduza para 1 ou 2.`;
      }
    }

    rules.push({
      id: 'rule_last_draw',
      title: `Repetidas do Último Concurso Oficial #${officialContestNumber}`,
      targetDescription: 'Ideal histórico: 1 ou 2 dezenas repetidas (60,5% dos concursos)',
      status: repStatus,
      badgeLabel: repBadge,
      observedText: repeatedCount === 0 
        ? 'Nenhuma dezena do concurso anterior foi encontrada neste jogo.'
        : `${repeatedCount} dezena(s) coincidente(s) com o concurso anterior.`,
      foundNumbers: repeatedFromLatest,
      foundNumbersLabel: repeatedCount > 0 
        ? `Dezenas coincidentes encontradas: [${repeatedFromLatest.map(n => n.toString().padStart(2, '0')).join(', ')}]`
        : 'Nenhuma dezena coincidente encontrada no jogo.',
      historicalContext: 'Em 60,5% de todos os concursos da história da Caixa Econômica Federal ocorre exatamente 1 ou 2 dezenas repetidas do concurso anterior. Apenas 35,6% têm 0 repetidas e menos de 3,9% têm 3 ou mais.',
      recommendation: repRecommendation
    });

    // REGRA 2: Sequências Consecutivas
    let seqStatus: 'passed' | 'warning' | 'violated' = 'passed';
    let seqBadge = '✅ Padrão Ouro';
    let seqRecommendation: string | undefined;

    if (isLotofacil) {
      if (maxConsecutiveLength >= 6) {
        seqStatus = 'violated';
        seqBadge = '❌ Sequência Excessiva (≥ 6)';
        seqRecommendation = 'Sequências de 6 ou mais números seguidos são raríssimas na Lotofácil. Tente intercalar com números espaçados.';
      } else if (maxConsecutiveLength === 5) {
        seqStatus = 'warning';
        seqBadge = '⚠️ Sequência Longa (5 seguidos)';
        seqRecommendation = 'Sequência de 5 dezenas consecutivas possui ocorrência moderada. O ideal são duplas e trincas intercaladas.';
      } else {
        seqStatus = 'passed';
        seqBadge = '✅ Padrão Equilibrado Lotofácil';
      }
    } else {
      if (hasTripletOrMore) {
        seqStatus = 'violated';
        seqBadge = '❌ Regra Violada (Trinca Rara)';
        seqRecommendation = `Detectada sequência de 3 ou mais dezenas consecutivas. Esse padrão ocorre em menos de 3,5% dos sorteios históricos da Caixa. Separe essas dezenas.`;
      } else if (hasDoublePair) {
        seqStatus = 'warning';
        seqBadge = '⚠️ 2 Duplas (Frequência Média)';
        seqRecommendation = 'Duas duplas consecutivas ocorrem em ~17,3% dos concursos. Um padrão com apenas 1 dupla simples (43,2%) possui maior densidade estatística.';
      } else if (hasSinglePair) {
        seqStatus = 'passed';
        seqBadge = '✅ Padrão Ouro (1 Dupla)';
      } else {
        seqStatus = 'passed';
        seqBadge = '✅ Dezenas Isoladas (35,6%)';
      }
    }

    const allConsecutiveNumbers = consecutiveGroups.flat();

    rules.push({
      id: 'rule_sequences',
      title: 'Sequências Numéricas Consecutivas (Vizinhança)',
      targetDescription: isLotofacil 
        ? 'Ideal histórico: Duplas e trincas intercaladas (máx 4 seguidas)'
        : 'Ideal histórico: Nenhuma sequência (35,6%) ou 1 Dupla consecutiva (43,2%)',
      status: seqStatus,
      badgeLabel: seqBadge,
      observedText: consecutiveGroups.length === 0 
        ? 'Todas as dezenas estão isoladas (sem vizinhos imediatos consecutivos).'
        : `Encontrado(s) ${consecutiveGroups.length} grupo(s) consecutivo(s): ${consecutiveGroups.map(g => `[${g.map(n => n.toString().padStart(2, '0')).join('-')}]`).join(', ')}.`,
      foundNumbers: allConsecutiveNumbers,
      foundNumbersLabel: consecutiveGroups.length > 0 
        ? `Grupos consecutivos encontrados: ${consecutiveGroups.map(g => `[${g.map(n => n.toString().padStart(2, '0')).join(' - ')}]`).join(' e ')}`
        : 'Nenhuma sequência consecutiva encontrada (todas dispersas).',
      historicalContext: isLotofacil
        ? 'Com 15 dezenas em 25, praticamente 100% dos concursos possuem duplas ou trincas seguidas. Sequências de 6 ou mais dezenas representam menos de 2% da história.'
        : 'Mais de 78,8% dos concursos oficiais contêm no máximo 1 dupla de dezenas seguidas. Trincas consecutivas (como 22-23-24) representam menos de 3,5% da história.',
      recommendation: seqRecommendation
    });

    // REGRA 3: Equilíbrio Par / Ímpar
    let evenOddStatus: 'passed' | 'warning' | 'violated' = 'passed';
    let evenOddBadge = '✅ Equilibrado';
    let evenOddRecommendation: string | undefined;

    if (isLotofacil) {
      if ((evenCount === 7 && oddCount === 8) || (evenCount === 8 && oddCount === 7)) {
        evenOddStatus = 'passed';
        evenOddBadge = '✅ Equilíbrio Ouro (7P/8I ou 8P/7I - 78%)';
      } else if ((evenCount === 6 && oddCount === 9) || (evenCount === 9 && oddCount === 6)) {
        evenOddStatus = 'warning';
        evenOddBadge = '⚠️ Leve Assimetria (6P/9I ou 9P/6I)';
        evenOddRecommendation = `Essa proporção ocorre em ~18% dos concursos. O ápice estatístico é 7P/8I ou 8P/7I (78% da história).`;
      } else {
        evenOddStatus = 'violated';
        evenOddBadge = '❌ Assimetria Extrema';
        evenOddRecommendation = `Proporções com menos de 6 ou mais de 9 pares representam menos de 4% de todos os resultados da Lotofácil.`;
      }
    } else {
      if (isEvenOddExtreme) {
        evenOddStatus = 'violated';
        evenOddBadge = '❌ Regra Violada (Extremo)';
        evenOddRecommendation = `Seu jogo contém ${evenCount} pares e ${oddCount} ímpares. Jogos 100% pares ou 100% ímpares ocorrem em menos de 1,5% de toda a história oficial da Caixa.`;
      } else if (!isEvenOddBalanced) {
        evenOddStatus = 'warning';
        evenOddBadge = '⚠️ Assimétrico (5P/1I ou 1P/5I)';
        evenOddRecommendation = `Essa configuração ocorre em apenas ~8,8% dos concursos. O equilíbrio ideal é 3P/3I, 4P/2I ou 2P/4I (79,5% dos resultados).`;
      } else {
        evenOddStatus = 'passed';
        evenOddBadge = '✅ Padrão Equilibrado (79,5%)';
      }
    }

    rules.push({
      id: 'rule_even_odd',
      title: 'Distribuição de Paridade (Pares e Ímpares)',
      targetDescription: isLotofacil 
        ? 'Ideal histórico: 7P/8I ou 8P/7I (78% dos concursos)'
        : 'Ideal histórico: 3P/3I, 4P/2I ou 2P/4I (79,5% dos sorteios)',
      status: evenOddStatus,
      badgeLabel: evenOddBadge,
      observedText: `${evenCount} Dezenas Pares e ${oddCount} Dezenas Ímpares.`,
      foundNumbers: currentNumbers,
      foundNumbersLabel: `Pares: [${evenNumbers.map(n => n.toString().padStart(2, '0')).join(', ') || 'Nenhum'}] | Ímpares: [${oddNumbers.map(n => n.toString().padStart(2, '0')).join(', ') || 'Nenhum'}]`,
      historicalContext: isLotofacil
        ? 'Em 78% dos concursos da Lotofácil ocorrem exatamente 7 pares e 8 ímpares ou 8 pares e 7 ímpares.'
        : 'Em quase 80% dos concursos a premiação divide-se equilibradamente entre 2, 3 ou 4 dezenas pares.',
      recommendation: evenOddRecommendation
    });

    // REGRA 4: Faixa de Soma das Dezenas
    let sumStatus: 'passed' | 'warning' | 'violated' = 'passed';
    let sumBadge = '✅ Na Zona de Ouro';
    let sumRecommendation: string | undefined;

    if (!isSumValid) {
      sumStatus = 'violated';
      sumBadge = sum < idealSumMin ? '❌ Soma Muito Baixa' : '❌ Soma Muito Alta';
      sumRecommendation = sum < idealSumMin
        ? `Soma atual de ${sum} está abaixo de ${idealSumMin}. Substitua números baixos por números da segunda metade do volante.`
        : `Soma atual de ${sum} está acima de ${idealSumMax}. Substitua números altos por dezenas menores.`;
    }

    rules.push({
      id: 'rule_sum',
      title: `Zona de Ouro da Soma (${idealSumMin} a ${idealSumMax})`,
      targetDescription: `Ideal histórico: Soma total entre ${idealSumMin} e ${idealSumMax} (${isLotofacil ? '75,8%' : '78,4%'} dos prêmios)`,
      status: sumStatus,
      badgeLabel: sumBadge,
      observedText: `Soma total calculada: ${sum} pontos.`,
      foundNumbers: currentNumbers,
      foundNumbersLabel: `Cálculo da soma: ${currentNumbers.map(n => n.toString().padStart(2, '0')).join(' + ')} = ${sum}`,
      historicalContext: `Mais de 75% das combinações sorteadas pela Caixa ficam na faixa central entre ${idealSumMin} e ${idealSumMax}, evitando os extremos.`,
      recommendation: sumRecommendation
    });

    // REGRA 5: Dispersão Espacial (Moldura/Centro na Lotofácil ou Quadrantes na Mega/Milionária)
    if (isLotofacil) {
      const LOTOFACIL_FRAME = [1, 2, 3, 4, 5, 6, 10, 11, 15, 16, 20, 21, 22, 23, 24, 25];
      const molduraNums = currentNumbers.filter(n => LOTOFACIL_FRAME.includes(n));
      const centroNums = currentNumbers.filter(n => !LOTOFACIL_FRAME.includes(n));
      const mCount = molduraNums.length;
      let frameStatus: 'passed' | 'warning' | 'violated' = 'passed';
      let frameBadge = '✅ Moldura Ouro (9 a 11)';
      let frameRec: string | undefined;

      if (mCount >= 9 && mCount <= 11) {
        frameStatus = 'passed';
        frameBadge = '✅ Moldura Ouro (9 a 11 - 81%)';
      } else if (mCount === 8 || mCount === 12) {
        frameStatus = 'warning';
        frameBadge = '⚠️ Desvio Leve (8 ou 12)';
        frameRec = `Seu jogo tem ${mCount} dezenas na moldura. A faixa mais premiada é de 9 a 11 (81% dos concursos).`;
      } else {
        frameStatus = 'violated';
        frameBadge = '❌ Fora da Proporção (<8 ou >12)';
        frameRec = `Jogos com menos de 8 ou mais de 12 dezenas na moldura são raros (<5%). Ajuste para 9 a 11.`;
      }

      rules.push({
        id: 'rule_frame',
        title: 'Distribuição Moldura (16 dezenas) vs Centro (9 dezenas)',
        targetDescription: 'Ideal histórico: 9 a 11 dezenas na moldura (81% dos concursos)',
        status: frameStatus,
        badgeLabel: frameBadge,
        observedText: `${mCount} na moldura e ${centroNums.length} no centro.`,
        foundNumbers: currentNumbers,
        foundNumbersLabel: `Moldura: [${molduraNums.map(n => n.toString().padStart(2, '0')).join(', ') || '-'}] | Centro: [${centroNums.map(n => n.toString().padStart(2, '0')).join(', ') || '-'}]`,
        historicalContext: 'A moldura externa possui 16 dezenas e o miolo interno possui 9. Em 81% dos concursos, entre 9 e 11 números sorteados estão na moldura.',
        recommendation: frameRec
      });
    } else {
      let quadStatus: 'passed' | 'warning' | 'violated' = 'passed';
      let quadBadge = '✅ Bem Disperso';
      let quadRecommendation: string | undefined;

      if (quadrantsUsed <= 2) {
        quadStatus = 'violated';
        quadBadge = '❌ Concentrado em ≤ 2 Quadrantes';
        quadRecommendation = `Suas dezenas estão concentradas em apenas ${quadrantsUsed} quadrantes do volante. Distribua seus números por pelo menos 3 quadrantes.`;
      }

      rules.push({
        id: 'rule_quadrants',
        title: 'Dispersão Espacial por Quadrantes do Volante',
        targetDescription: 'Ideal histórico: Dezenas distribuídas em 3 ou 4 quadrantes',
        status: quadStatus,
        badgeLabel: quadBadge,
        observedText: `Dezenas ocupam ${quadrantsUsed} de 4 quadrantes do volante oficial.`,
        foundNumbers: currentNumbers,
        foundNumbersLabel: `Q1: [${q1Numbers.map(n => n.toString().padStart(2, '0')).join(', ') || '-'}] | Q2: [${q2Numbers.map(n => n.toString().padStart(2, '0')).join(', ') || '-'}] | Q3: [${q3Numbers.map(n => n.toString().padStart(2, '0')).join(', ') || '-'}] | Q4: [${q4Numbers.map(n => n.toString().padStart(2, '0')).join(', ') || '-'}]`,
        historicalContext: 'Menos de 6% dos concursos têm todas as 6 dezenas concentradas em apenas 1 ou 2 quadrantes do cartão.',
        recommendation: quadRecommendation
      });
    }

    // Cálculos de Conformidade Geral
    const passedCount = rules.filter(r => r.status === 'passed').length;
    const warningCount = rules.filter(r => r.status === 'warning').length;
    const violatedCount = rules.filter(r => r.status === 'violated').length;

    let overallRating: 'gold' | 'warning' | 'danger' = 'gold';
    let score = Math.round(((passedCount * 1.0 + warningCount * 0.5) / rules.length) * 100);

    if (violatedCount >= 1) {
      overallRating = 'danger';
    } else if (warningCount >= 1) {
      overallRating = 'warning';
    } else {
      overallRating = 'gold';
    }

    return {
      numbers: currentNumbers,
      repeatedFromLatest,
      repeatedCount,
      consecutiveGroups,
      hasConsecutive: consecutiveGroups.length > 0,
      allConsecutiveNumbers,
      evenNumbers,
      oddNumbers,
      evenCount,
      oddCount,
      sum,
      idealSumMin,
      idealSumMax,
      quadrantsUsed,
      rules,
      passedCount,
      warningCount,
      violatedCount,
      score,
      overallRating,
      isCompleteGame: count >= (isLotofacil ? 15 : 6)
    };
  }, [selectedTestBalls, officialRefNumbers, officialContestNumber, isMaisMilionaria, isLotofacil]);

  return (
    <div className="space-y-6">
      {/* Banner Principal com Contexto Oficial */}
      <div className={`text-white rounded-3xl p-5 sm:p-7 shadow-lg relative overflow-hidden border ${
        isLotofacil
          ? 'bg-gradient-to-r from-purple-950 via-fuchsia-950 to-indigo-950 border-purple-800'
          : isMaisMilionaria 
          ? 'bg-gradient-to-r from-amber-950 via-yellow-950 to-slate-900 border-amber-800' 
          : 'bg-gradient-to-r from-slate-900 via-teal-950 to-emerald-950 border-emerald-800'
      }`}>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                isLotofacil
                  ? 'bg-purple-500/20 text-purple-300 border-purple-400/30'
                  : isMaisMilionaria 
                  ? 'bg-amber-500/20 text-amber-300 border-amber-400/30' 
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
              }`}>
                Padrões de Vizinhança &amp; Conformidade Caixa
              </span>
              <span className="text-xs text-slate-300">
                Base Histórica: {analytics.totalContests} Concursos Oficiais
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1 tracking-tight flex items-center gap-2">
              <ArrowRight size={24} className={isLotofacil ? 'text-purple-400' : (isMaisMilionaria ? 'text-amber-400' : 'text-emerald-400')} />
              <span>Painel Histórico de Sequências &amp; Testador de Conformidade</span>
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl mt-1 leading-relaxed">
              Analise instantaneamente seu jogo contra as regras de ouro dos sorteios oficiais: dezenas repetidas do concurso anterior, duplas consecutivas mais sorteadas e conformidade estatística em tempo real.
            </p>
          </div>

          {/* Destaque do Último Concurso Oficial de Referência */}
          <div className="bg-white/10 p-4 rounded-2xl border border-white/15 text-left md:text-right backdrop-blur-xs min-w-[260px]">
            <div className="flex items-center justify-between md:justify-end gap-2 text-[10px] uppercase font-bold text-slate-300">
              <span>Último Concurso #{officialContestNumber}</span>
              <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-mono">Oficial</span>
            </div>
            <div className="flex flex-wrap gap-1 justify-start md:justify-end mt-2">
              {officialRefNumbers.map(n => (
                <span key={n} className="w-6 h-6 rounded-full bg-white text-slate-900 font-mono font-black text-xs flex items-center justify-center shadow-xs">
                  {n.toString().padStart(2, '0')}
                </span>
              ))}
            </div>
            <div className="text-[11px] text-slate-300 mt-2 font-medium">
              {analytics.latestContestSequences.hasConsecutive ? (
                <span className="text-amber-300 flex items-center gap-1 justify-start md:justify-end">
                  <span>Sequência no concurso:</span>
                  <strong className="font-mono">
                    {analytics.latestContestSequences.groups.map(g => `[${g.map(n => n.toString().padStart(2, '0')).join('-')}]`).join(', ')}
                  </strong>
                </span>
              ) : (
                <span className="text-emerald-300">Concurso com Dezenas Isoladas</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Regra de Ouro Matemática */}
      <div className={`p-4 sm:p-5 rounded-3xl border flex items-start gap-3.5 ${
        isMaisMilionaria 
          ? 'bg-amber-50 border-amber-200 text-amber-950' 
          : 'bg-emerald-50 border-emerald-200 text-emerald-950'
      }`}>
        <div className="p-2 rounded-2xl bg-white shadow-xs">
          <ShieldAlert className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h4 className="text-sm font-black">Regra de Ouro Matemática das Sequências:</h4>
          <p className="text-xs mt-0.5 leading-relaxed opacity-90">{analytics.goldenRule}</p>
        </div>
      </div>

      {/* SECTION DO TESTADOR RÁPIDO DE CONFORMIDADE E SEQUÊNCIA */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-6">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-800">
                <Search size={20} />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <span>Testador Rápido de Sequência &amp; Conformidade</span>
                  <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Tempo Real
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Digite ou clique nas dezenas para confrontar imediatamente sua aposta com o último sorteio oficial e avaliar regras violadas.
                </p>
              </div>
            </div>

            <span className={`text-xs font-black px-3 py-1.5 rounded-xl border ${
              selectedTestBalls.length === 6 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}>
              {selectedTestBalls.length} de 6 dezenas recomendadas
            </span>
          </div>
        </div>

        {/* Atalhos Rápidos (Presets Funcionais) */}
        <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
          <span className="text-xs font-black text-slate-700 mr-1 flex items-center gap-1">
            <Zap size={14} className="text-amber-600" />
            <span>Presets Rápidos:</span>
          </span>

          <button
            type="button"
            onClick={() => loadPreset([...officialRefNumbers])}
            className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold border border-slate-300 transition cursor-pointer flex items-center gap-1 shadow-2xs"
            title="Carrega exatamente os 6 números do último sorteio oficial"
          >
            <span>🎲 Último Sorteio Caixa (#{officialContestNumber})</span>
          </button>

          <button
            type="button"
            onClick={loadGoldenPreset}
            className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-black border border-emerald-300 transition cursor-pointer flex items-center gap-1 shadow-2xs"
            title="Carrega jogo com 1 repetida do último sorteio, 1 dupla consecutiva e equilíbrio par/ímpar"
          >
            <Sparkles size={13} className="text-emerald-600" />
            <span>✨ Padrão Ouro (1 Dupla + 1 Repetida)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const isolated = [officialRefNumbers[0] || 5, 12, 23, 34, 45, 58].filter(n => n <= maxNumber);
              loadPreset(isolated);
            }}
            className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold border border-slate-300 transition cursor-pointer shadow-2xs"
          >
            <span>🟢 Dezenas Isoladas (Sem Sequência)</span>
          </button>

          <button
            type="button"
            onClick={loadViolatedPreset}
            className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-900 text-xs font-black border border-rose-300 transition cursor-pointer shadow-2xs"
            title="Carrega um jogo com regras violadas (excesso de pares, soma baixa, etc.) para testar o diagnóstico"
          >
            <span>⚠️ Testar Jogo com Regras Violadas</span>
          </button>

          <button
            type="button"
            onClick={() => { setSelectedTestBalls([]); setTestInput(''); }}
            className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-rose-50 hover:text-rose-700 text-slate-600 text-xs font-bold border border-slate-300 transition cursor-pointer ml-auto shadow-2xs"
          >
            Limpar
          </button>
        </div>

        {/* Campo de Entrada de Texto com Parsing Instantâneo */}
        <div className="space-y-1.5">
          <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center justify-between">
            <span>Digite os números do seu jogo:</span>
            <span className="text-[11px] font-normal text-slate-500">Aceita espaços, vírgulas, ponto e vírgula ou traços</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={testInput}
              onChange={e => handleInputChange(e.target.value)}
              placeholder="ex: 05, 14, 15, 28, 33, 42"
              className="w-full bg-slate-50 border-2 border-slate-300 focus:border-emerald-500 focus:bg-white rounded-2xl px-4 py-3 text-sm font-mono font-bold text-slate-900 focus:outline-none transition-all shadow-inner"
            />
            {testInput && (
              <button
                type="button"
                onClick={() => { setSelectedTestBalls([]); setTestInput(''); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                title="Limpar campo"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Mini Cartela Clicável Sincronizada */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between text-[11px] font-bold text-slate-600 gap-1">
            <span className="flex items-center gap-1.5">
              <span>Seletor Rápido na Cartela Oficial:</span>
              <span className="font-normal text-slate-500">(clique para adicionar/remover)</span>
            </span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-emerald-800">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span>
                <span>Selecionada</span>
              </span>
              <span className="flex items-center gap-1 text-amber-900">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                <span>Em Sequência</span>
              </span>
              <span className="flex items-center gap-1 text-teal-900">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-400 inline-block ring-1 ring-teal-600"></span>
                <span>Último Sorteio Caixa</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-10 gap-1 sm:gap-1.5">
            {Array.from({ length: maxNumber }, (_, i) => i + 1).map(n => {
              const isSelected = selectedTestBalls.includes(n);
              const isOfficial = officialRefNumbers.includes(n);
              const isConsecutive = complianceAnalysis?.allConsecutiveNumbers.includes(n);

              let buttonStyle = 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200';
              if (isSelected) {
                if (isConsecutive) {
                  buttonStyle = 'bg-amber-500 text-white ring-2 ring-amber-300 font-black scale-105 shadow-xs';
                } else {
                  buttonStyle = 'bg-emerald-600 text-white font-black shadow-xs';
                }
              } else if (isOfficial) {
                buttonStyle = 'bg-teal-50 text-teal-950 border-teal-300 font-bold hover:bg-teal-100';
              }

              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => toggleTestBall(n)}
                  className={`h-7 sm:h-8 rounded-lg font-mono text-xs transition flex items-center justify-center cursor-pointer relative ${buttonStyle}`}
                  title={
                    isOfficial && isSelected 
                      ? `Dezena ${n}: Selecionada e repetida do último concurso #${officialContestNumber}!`
                      : isOfficial 
                      ? `Dezena ${n}: Sorteada no último concurso #${officialContestNumber}` 
                      : `Dezena ${n}`
                  }
                >
                  {n.toString().padStart(2, '0')}
                  {isOfficial && !isSelected && (
                    <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* FEEDBACK VISUAL DE ACERTOS, CONFORMIDADE E REGRAS VIOLADAS */}
        {selectedTestBalls.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center text-slate-500 text-xs">
            <Info size={20} className="mx-auto mb-2 text-slate-400" />
            <p className="font-bold">Nenhum número selecionado</p>
            <p className="mt-1">Digite suas dezenas no campo acima ou clique na cartela para disparar imediatamente a análise estatística de conformidade contra o último sorteio.</p>
          </div>
        ) : selectedTestBalls.length < 2 ? (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
            <Info size={16} className="text-amber-600 shrink-0" />
            <span>Selecione pelo menos mais 1 dezena para avaliar sequências vizinhas e regras de conformidade.</span>
          </div>
        ) : complianceAnalysis ? (
          <div className="space-y-5">
            {/* Placar / Score Geral de Conformidade */}
            <div className={`p-5 rounded-3xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
              complianceAnalysis.overallRating === 'gold'
                ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-100/60 border-emerald-300 text-emerald-950'
                : complianceAnalysis.overallRating === 'warning'
                ? 'bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-100/60 border-amber-300 text-amber-950'
                : 'bg-gradient-to-r from-rose-50 via-red-50 to-rose-100/60 border-rose-300 text-rose-950'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`p-3 rounded-2xl shadow-xs mt-0.5 ${
                  complianceAnalysis.overallRating === 'gold' 
                    ? 'bg-emerald-600 text-white' 
                    : complianceAnalysis.overallRating === 'warning' 
                    ? 'bg-amber-600 text-white' 
                    : 'bg-rose-600 text-white'
                }`}>
                  {complianceAnalysis.overallRating === 'gold' ? (
                    <ShieldCheck size={26} />
                  ) : complianceAnalysis.overallRating === 'warning' ? (
                    <AlertCircle size={26} />
                  ) : (
                    <ShieldAlert size={26} />
                  )}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm sm:text-base font-black">
                      {complianceAnalysis.overallRating === 'gold' 
                        ? '🔥 Alta Conformidade Estatística (Padrão Ouro Caixa)' 
                        : complianceAnalysis.overallRating === 'warning' 
                        ? '⚠️ Conformidade Média (Ajustes Recomendados)' 
                        : '🚨 Regras Críticas Violadas (Alto Risco)'}
                    </span>
                    <span className="text-xs font-black px-2 py-0.5 rounded-md bg-white border border-current shadow-2xs">
                      {complianceAnalysis.score}% de Alinhamento
                    </span>
                  </div>

                  <p className="text-xs mt-1 opacity-90 leading-relaxed max-w-2xl">
                    {complianceAnalysis.overallRating === 'gold' 
                      ? 'Parabéns! Sua combinação respeita simultaneamente as regras de ouro: repetição do último concurso, ausência de sequências excessivas, equilíbrio par/ímpar e soma dentro da faixa histórica da Caixa.'
                      : complianceAnalysis.overallRating === 'warning'
                      ? 'Sua aposta atende à maioria dos critérios, porém contém pequenas assimetrias em relação aos padrões oficiais da Caixa.'
                      : 'Atenção! Esta aposta possui regras históricas violadas que raramente ocorrem nos concursos oficiais. Recomendamos ajustar as dezenas apontadas nos cartões abaixo.'}
                  </p>
                </div>
              </div>

              {/* Botão para Adicionar à Carteira se houver onAddBet */}
              {onAddBet && (
                <button
                  type="button"
                  onClick={() => onAddBet(
                    complianceAnalysis.numbers, 
                    'tested_game', 
                    `Jogo testado: ${complianceAnalysis.score}% conformidade, ${complianceAnalysis.repeatedCount} repetidas do concurso #${officialContestNumber}`
                  )}
                  className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition shrink-0 cursor-pointer"
                >
                  <Plus size={16} />
                  <span>Salvar na Minha Carteira</span>
                </button>
              )}
            </div>

            {/* Visualização Detalhada das Dezenas do Jogo com Badges de Diagnóstico */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Raio-X das Dezenas do Seu Jogo:</span>
                <span className="text-slate-500">Total: {complianceAnalysis.numbers.length} dezenas</span>
              </div>

              <div className="flex flex-wrap gap-2.5 items-center">
                {complianceAnalysis.numbers.map(n => {
                  const isRepeated = officialRefNumbers.includes(n);
                  const isConsecutive = complianceAnalysis.allConsecutiveNumbers.includes(n);

                  return (
                    <div 
                      key={n}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono text-xs font-black shadow-xs transition-all ${
                        isRepeated
                          ? 'bg-teal-50 border-teal-400 text-teal-950 ring-2 ring-teal-300/60'
                          : isConsecutive
                          ? 'bg-amber-50 border-amber-400 text-amber-950 ring-2 ring-amber-300/60'
                          : 'bg-white border-slate-300 text-slate-800'
                      }`}
                    >
                      <span className="text-sm font-black">{n.toString().padStart(2, '0')}</span>
                      
                      {isRepeated && (
                        <span className="text-[10px] bg-teal-600 text-white px-1.5 py-0.2 rounded font-sans uppercase tracking-wider font-extrabold flex items-center gap-0.5">
                          <Check size={10} />
                          <span>Repete #{officialContestNumber}</span>
                        </span>
                      )}

                      {isConsecutive && (
                        <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.2 rounded font-sans uppercase tracking-wider font-extrabold flex items-center gap-0.5">
                          <span>Vizinha</span>
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-4 text-[11px] pt-1 text-slate-600 border-t border-slate-200">
                <span>
                  <strong>Repetidas do Último Concurso:</strong>{' '}
                  <span className="font-extrabold text-teal-800">
                    {complianceAnalysis.repeatedCount} dezena(s)
                  </span>
                </span>
                <span>
                  <strong>Sequências:</strong>{' '}
                  <span className="font-extrabold text-amber-800">
                    {complianceAnalysis.consecutiveGroups.length === 0 
                      ? 'Nenhuma (Dispersas)' 
                      : complianceAnalysis.consecutiveGroups.map(g => `[${g.map(n => n.toString().padStart(2, '0')).join('-')}]`).join(', ')}
                  </span>
                </span>
                <span>
                  <strong>Paridade:</strong>{' '}
                  <span className="font-extrabold text-slate-800">
                    {complianceAnalysis.evenCount}P / {complianceAnalysis.oddCount}I
                  </span>
                </span>
                <span>
                  <strong>Soma:</strong>{' '}
                  <span className="font-extrabold text-slate-800">
                    {complianceAnalysis.sum}
                  </span>
                </span>
              </div>
            </div>

            {/* CHECKLIST ESTATÍSTICO COMPLETO COM NÚMEROS ENCONTRADOS ABAIXO DE CADA REGRA */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <BarChart2 size={16} className="text-emerald-600" />
                  <span>Checklist de Conformidade com as Regras Oficiais da Caixa</span>
                </h4>
                <div className="flex items-center gap-2 text-xs font-bold">
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    {complianceAnalysis.passedCount} Aprovadas
                  </span>
                  {complianceAnalysis.warningCount > 0 && (
                    <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      {complianceAnalysis.warningCount} Alertas
                    </span>
                  )}
                  {complianceAnalysis.violatedCount > 0 && (
                    <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                      {complianceAnalysis.violatedCount} Violadas
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {complianceAnalysis.rules.map(rule => (
                  <div 
                    key={rule.id}
                    className={`p-4 rounded-2xl border transition-all space-y-2.5 ${
                      rule.status === 'passed'
                        ? 'bg-white border-emerald-200 shadow-2xs'
                        : rule.status === 'warning'
                        ? 'bg-amber-50/70 border-amber-300'
                        : 'bg-rose-50/80 border-rose-300'
                    }`}
                  >
                    {/* Cabeçalho da Regra */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <div className={`p-1 rounded-lg mt-0.5 ${
                          rule.status === 'passed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : rule.status === 'warning'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {rule.status === 'passed' ? (
                            <CheckCircle2 size={15} />
                          ) : rule.status === 'warning' ? (
                            <AlertCircle size={15} />
                          ) : (
                            <ShieldAlert size={15} />
                          )}
                        </div>
                        <div>
                          <h5 className="text-xs font-black text-slate-900">{rule.title}</h5>
                          <span className="text-[10px] text-slate-500 block">{rule.targetDescription}</span>
                        </div>
                      </div>

                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border whitespace-nowrap ${
                        rule.status === 'passed'
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          : rule.status === 'warning'
                          ? 'bg-amber-200/70 text-amber-950 border-amber-300'
                          : 'bg-rose-200/80 text-rose-950 border-rose-300'
                      }`}>
                        {rule.badgeLabel}
                      </span>
                    </div>

                    {/* Diagnóstico Observado */}
                    <div className="text-xs text-slate-700 bg-white/70 p-2.5 rounded-xl border border-black/5 space-y-1">
                      <p className="font-semibold">{rule.observedText}</p>
                      
                      {/* GRUPO DE NÚMEROS ENCONTRADOS ABAIXO DA ESTATÍSTICA (Conforme Solicitado pelo Usuário) */}
                      <div className="pt-1 border-t border-slate-200/80 flex items-center gap-1.5 text-[11px] text-slate-800 font-mono">
                        <span className="font-sans font-bold text-slate-500 text-[10px] uppercase">Grupo Encontrado:</span>
                        <strong className="text-emerald-900">{rule.foundNumbersLabel}</strong>
                      </div>
                    </div>

                    {/* Contexto Histórico Oficial da Caixa */}
                    <p className="text-[10px] text-slate-500 leading-tight">
                      📚 <strong>Base Oficial:</strong> {rule.historicalContext}
                    </p>

                    {/* Recomendação de Correção se houver regra violada */}
                    {rule.recommendation && (
                      <div className={`p-2 rounded-xl text-[11px] flex items-start gap-1.5 font-bold ${
                        rule.status === 'violated' 
                          ? 'bg-rose-100 text-rose-950 border border-rose-300' 
                          : 'bg-amber-100 text-amber-950 border border-amber-300'
                      }`}>
                        <Sparkles size={14} className="shrink-0 mt-0.5 text-current" />
                        <span>{rule.recommendation}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Grid: Distribuição dos Padrões de Sequência e Top 15 Duplas Históricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <BarChart2 size={18} className={isMaisMilionaria ? 'text-amber-600' : 'text-emerald-600'} />
              <span>Frequência Histórica por Tipo de Sequência</span>
            </h3>
            <p className="text-xs text-slate-500">
              Proporção de concursos com zero, uma dupla, duas duplas ou trincas consecutivas em toda a história oficial
            </p>
          </div>

          <div className="space-y-3.5">
            {analytics.patterns.map(pat => (
              <div key={pat.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-black text-slate-800">{pat.name}</span>
                  <span className={`font-extrabold ${isMaisMilionaria ? 'text-amber-800' : 'text-emerald-800'}`}>
                    {pat.percentage}% ({pat.occurrences}x)
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      pat.percentage >= 40 
                        ? (isMaisMilionaria ? 'bg-amber-600' : 'bg-emerald-600') 
                        : pat.percentage >= 5 
                        ? 'bg-teal-500' 
                        : 'bg-slate-400'
                    }`}
                    style={{ width: `${Math.min(100, pat.percentage * 1.8)}%` }}
                  ></div>
                </div>
                <p className="text-[11px] text-slate-500">{pat.description}</p>

                {pat.matchedInLatest?.isMatch && (
                  <div className="mt-2 p-2 rounded-xl bg-amber-100/80 border border-amber-300 text-xs flex items-center gap-1.5 text-amber-950 font-semibold">
                    <CheckCircle2 size={14} className="text-amber-600 shrink-0" />
                    <span>🎯 Padrão ocorrido no último sorteio (#{officialContestNumber})</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Top 15 Duplas Consecutivas Mais Sorteadas na História */}
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Flame size={18} className="text-red-500" />
              <span>Top 15 Duplas Vizinhas mais Frequentes</span>
            </h3>
            <p className="text-xs text-slate-500">
              Pares consecutivos que mais saíram juntos nos {analytics.totalContests} concursos oficiais
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {analytics.topConsecutivePairs.map((pair, idx) => (
              <div 
                key={pair.name}
                className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs hover:border-emerald-300 transition"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 font-mono w-4">#{idx + 1}</span>
                  <span className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 font-mono font-black text-slate-900 shadow-2xs">
                    {pair.name}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-emerald-800 block">{pair.occurrences}x</span>
                  <span className="text-[9px] text-slate-400">Conc. #{pair.lastContestSeen}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SequenceAnalyticsView;
