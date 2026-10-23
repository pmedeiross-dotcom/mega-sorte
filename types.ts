
export interface AnalysisResult {
  hasSena: boolean;
  hasQuina: boolean;
  hasQuadra: boolean;
  hasTerno: boolean;
  details: string;
  matchCounts: {
    sena: number;
    quina: number;
    quadra: number;
    terno: number;
  };
}

export type CalculationStrategy = 
  | 'balanced'       // Padrão Ouro Multi-Objetivo (Pareto + Poisson/Bernoulli + Moldura)
  | 'momentum'       // Decaimento Exponencial & Momentum Recente (últimos 50-100 concursos)
  | 'cycle_delay'    // Pressão Estatística (Z-Score de Atraso & Fechamento de Ciclo)
  | 'cooccurrence'   // Coocorrência & Duques de Alta Afinidade (Lift Positivo)
  | 'entropy_shannon'; // Máxima Entropia de Shannon & Dispersão Uniforme

export interface AdvancedBetMetrics {
  duquePair?: [number, number];
  duqueName?: string;
  primesCount: number;
  fibonacciCount: number;
  multiplesOfThreeCount: number;
  frameCount: number;
  centerCount: number;
  paretoCount: number;
  cycleMissingCount: number;
  maxInRow: number;
  maxInCol: number;
  historicalHotCount: number;
  advancedScore?: number;
  // Sugestões e Métricas Matemáticas Avançadas
  strategyUsed?: CalculationStrategy;
  shannonEntropy?: number;
  entropyLabel?: 'Baixa' | 'Ideal' | 'Alta';
  delayZScoreMax?: number;
  hasHighPressureDezena?: boolean;
  cooccurrenceLiftAvg?: number;
  chiSquareConformity?: number;
  smartSuggestions?: string[];
}

export interface Bet {
  id: string;
  numbers: number[];
  createdAt: number;
  type: 'manual' | 'random' | 'ai' | 'smart_rules';
  reasoning?: string;
  groundingUrls?: Array<{ uri: string; title: string }>;
  analysis?: AnalysisResult;
  sum: number;
  sumStatus: 'low' | 'ideal' | 'high';
  advancedMetrics?: AdvancedBetMetrics;
  userId?: string;
  isCloudSynced?: boolean;
}

export interface GeneratorLogic {
  repeat1to2: boolean;
  balanceEvenOdd: boolean;
  sum160to240: boolean;
  spreadDistribution: boolean;
  concentrate20to50: boolean;
  max2Consecutive: boolean;
  max2IdenticalEndings: boolean;
  preferHistoricalHotNumbers?: boolean;
  // Pilares da Análise Avançada
  useAdvancedDuques?: boolean;
  frameAndCenterBalance?: boolean;
  balancePrimesAndFibonacci?: boolean;
  paretoTopSelection?: boolean;
  includeCycleDezenas?: boolean;
  multiplesOfThreeBalance?: boolean;
  rowAndColDispersion?: boolean;
  // Estratégia de Cálculo Matemático
  calculationStrategy?: CalculationStrategy;
}

export interface ContestDraw {
  contestNumber: number;
  date: string;
  numbers: number[];
}

export interface AIRootResponse {
  numbers: number[];
  reasoning: string;
  groundingUrls?: Array<{ uri: string; title: string }>;
}

export interface AIBatchResponse {
  games: Array<{
    numbers: number[];
    reasoning: string;
  }>;
  groundingUrls?: Array<{ uri: string; title: string }>;
}
