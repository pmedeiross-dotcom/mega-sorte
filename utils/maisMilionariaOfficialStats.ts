/**
 * Base de Dados Estatísticos Oficiais da +Milionária (Caixa Econômica Federal)
 * Consolidado com base em todos os 401 concursos oficiais realizados (01 a 50).
 */

export const TOTAL_MAIS_MILIONARIA_CONCURSOS = 401;

export interface MaisMilionariaNumberStat {
  number: number;
  name: string;
  drawCount: number;
  frequencyPercentage: number;
  ranking: number;
  isEven: boolean;
  quadrant: number; // 0: Sup-Esq (1-25), 1: Sup-Dir (26-50), etc.
}

// Frequência oficial consolidada de todos os 401 concursos
export const MAIS_MILIONARIA_FREQUENCY_DATA: Record<number, number> = {
  "1": 54,
  "2": 49,
  "3": 44,
  "4": 55,
  "5": 48,
  "6": 47,
  "7": 41,
  "8": 38,
  "9": 43,
  "10": 56,
  "11": 50,
  "12": 55,
  "13": 40,
  "14": 50,
  "15": 59,
  "16": 53,
  "17": 39,
  "18": 49,
  "19": 41,
  "20": 46,
  "21": 61,
  "22": 55,
  "23": 45,
  "24": 45,
  "25": 55,
  "26": 41,
  "27": 42,
  "28": 44,
  "29": 51,
  "30": 51,
  "31": 47,
  "32": 44,
  "33": 46,
  "34": 36,
  "35": 51,
  "36": 49,
  "37": 43,
  "38": 55,
  "39": 46,
  "40": 63,
  "41": 64,
  "42": 52,
  "43": 31,
  "44": 51,
  "45": 43,
  "46": 51,
  "47": 45,
  "48": 42,
  "49": 38,
  "50": 62
};

export const ALL_MAIS_MILIONARIA_STATS: MaisMilionariaNumberStat[] = Array.from({ length: 50 }, (_, i) => {
  const num = i + 1;
  const count = MAIS_MILIONARIA_FREQUENCY_DATA[num] || 0;
  const row = Math.floor((num - 1) / 10);
  const col = (num - 1) % 10;
  const quadrant = (row < 3 && col < 5) ? 0 : (row < 3) ? 1 : (col < 5) ? 2 : 3;
  return {
    number: num,
    name: num.toString().padStart(2, '0'),
    drawCount: count,
    frequencyPercentage: parseFloat(((count / TOTAL_MAIS_MILIONARIA_CONCURSOS) * 100).toFixed(1)),
    ranking: {"1":12,"2":22,"3":34,"4":7,"5":25,"6":26,"7":42,"8":47,"9":37,"10":6,"11":20,"12":8,"13":45,"14":21,"15":5,"16":13,"17":46,"18":23,"19":43,"20":28,"21":4,"22":9,"23":31,"24":32,"25":10,"26":44,"27":40,"28":35,"29":15,"30":16,"31":27,"32":36,"33":29,"34":49,"35":17,"36":24,"37":38,"38":11,"39":30,"40":2,"41":1,"42":14,"43":50,"44":18,"45":39,"46":19,"47":33,"48":41,"49":48,"50":3}[num] || 25,
    isEven: num % 2 === 0,
    quadrant
  };
});

export const MAIS_MILIONARIA_RANKING_ORDER = [...ALL_MAIS_MILIONARIA_STATS].sort((a, b) => a.ranking - b.ranking);

export const TOP_10_MAIS_MILIONARIA = MAIS_MILIONARIA_RANKING_ORDER.slice(0, 10);
export const BOTTOM_10_MAIS_MILIONARIA = MAIS_MILIONARIA_RANKING_ORDER.slice(-10).reverse();

export const MAIS_MILIONARIA_HISTORICAL_METRICS = {
  totalContests: TOTAL_MAIS_MILIONARIA_CONCURSOS,
  averageDrawsPerNumber: 48.1,
  highestDrawn: {
    number: 41,
    count: 64,
    percentage: 16.0
  },
  lowestDrawn: {
    number: 43,
    count: 31,
    percentage: 7.7
  },
  goldZoneSum: {
    min: 120,
    max: 185,
    average: 152.9,
    percentageOfAllDraws: 62.8
  }
};
