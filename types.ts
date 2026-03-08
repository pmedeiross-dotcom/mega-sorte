
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

export interface Bet {
  id: string;
  numbers: number[];
  createdAt: number;
  type: 'manual' | 'random' | 'ai';
  reasoning?: string;
  groundingUrls?: Array<{ uri: string; title: string }>;
  analysis?: AnalysisResult;
  sum: number;
  sumStatus: 'low' | 'ideal' | 'high';
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
