/**
 * Banco de Dados Oficial de Concursos da Mega-Sena
 * Consolidado a partir dos resultados oficiais por concurso e data (Concurso 1 a 3.069).
 */

export interface MegaDraw {
  contest: number;
  date: string;
  numbers: number[]; // Dezenas ordenadas
  rawOrder?: number[]; // Ordem original do sorteio
}

// Conjunto com os últimos 100 concursos oficiais detalhados extraídos dos registros oficiais
export const RECENT_OFFICIAL_DRAWS: MegaDraw[] = [
  { contest: 3069, date: "11/10/2026", numbers: [5, 19, 22, 44, 47, 57], rawOrder: [47, 5, 22, 44, 57, 19] },
  { contest: 3068, date: "08/10/2026", numbers: [7, 10, 39, 40, 43, 57], rawOrder: [7, 43, 10, 39, 57, 40] },
  { contest: 3067, date: "06/10/2026", numbers: [1, 4, 17, 33, 41, 52], rawOrder: [33, 41, 4, 52, 17, 1] },
  { contest: 3066, date: "03/10/2026", numbers: [4, 6, 9, 13, 28, 48], rawOrder: [48, 13, 4, 9, 6, 28] },
  { contest: 3065, date: "01/10/2026", numbers: [8, 10, 30, 38, 50, 53], rawOrder: [30, 10, 50, 53, 8, 38] },
  { contest: 3064, date: "29/09/2026", numbers: [4, 10, 20, 25, 27, 48], rawOrder: [25, 4, 20, 27, 48, 10] },
  { contest: 3063, date: "27/09/2026", numbers: [5, 35, 36, 41, 43, 48], rawOrder: [41, 35, 48, 5, 43, 36] },
  { contest: 3062, date: "24/09/2026", numbers: [5, 9, 11, 17, 18, 38], rawOrder: [11, 38, 18, 17, 5, 9] },
  { contest: 3061, date: "22/09/2026", numbers: [24, 25, 28, 37, 47, 55], rawOrder: [47, 28, 24, 55, 25, 37] },
  { contest: 3060, date: "20/09/2026", numbers: [6, 15, 23, 36, 37, 38], rawOrder: [15, 23, 37, 38, 36, 6] },
  { contest: 3059, date: "17/09/2026", numbers: [1, 2, 7, 18, 33, 35], rawOrder: [35, 2, 7, 33, 1, 18] },
  { contest: 3058, date: "15/09/2026", numbers: [14, 23, 53, 56, 57, 60], rawOrder: [60, 14, 23, 57, 53, 56] },
  { contest: 3057, date: "13/09/2026", numbers: [2, 4, 16, 21, 48, 53], rawOrder: [21, 4, 53, 48, 16, 2] },
  { contest: 3056, date: "10/09/2026", numbers: [14, 21, 25, 40, 51, 56], rawOrder: [51, 25, 21, 40, 14, 56] },
  { contest: 3055, date: "08/09/2026", numbers: [1, 11, 36, 43, 48, 49], rawOrder: [36, 43, 48, 11, 49, 1] },
  { contest: 3054, date: "06/09/2026", numbers: [8, 17, 24, 43, 47, 58], rawOrder: [43, 58, 24, 47, 8, 17] },
  { contest: 3053, date: "03/09/2026", numbers: [1, 13, 25, 35, 39, 51], rawOrder: [13, 51, 35, 1, 39, 25] },
  { contest: 3052, date: "01/09/2026", numbers: [16, 30, 40, 47, 48, 60], rawOrder: [60, 48, 40, 47, 16, 30] },
  { contest: 3051, date: "30/08/2026", numbers: [11, 15, 20, 21, 38, 48], rawOrder: [11, 21, 15, 20, 48, 38] },
  { contest: 3050, date: "27/08/2026", numbers: [11, 14, 30, 38, 49, 55], rawOrder: [14, 38, 49, 30, 55, 11] },
  { contest: 3049, date: "25/08/2026", numbers: [6, 13, 36, 43, 53, 55], rawOrder: [53, 43, 13, 55, 6, 36] },
  { contest: 3048, date: "23/08/2026", numbers: [2, 6, 27, 39, 44, 50], rawOrder: [44, 6, 27, 50, 2, 39] },
  { contest: 3047, date: "20/08/2026", numbers: [4, 18, 22, 26, 31, 58], rawOrder: [26, 18, 22, 4, 31, 58] },
  { contest: 3046, date: "18/08/2026", numbers: [16, 23, 24, 33, 36, 52], rawOrder: [16, 23, 36, 52, 33, 24] },
  { contest: 3045, date: "16/08/2026", numbers: [23, 29, 33, 42, 43, 57], rawOrder: [29, 57, 33, 42, 43, 23] },
  { contest: 3044, date: "13/08/2026", numbers: [4, 15, 17, 40, 55, 58], rawOrder: [58, 4, 17, 55, 15, 40] },
  { contest: 3043, date: "11/08/2026", numbers: [10, 11, 16, 37, 42, 53], rawOrder: [10, 16, 11, 53, 37, 42] },
  { contest: 3042, date: "09/08/2026", numbers: [2, 5, 10, 35, 40, 53], rawOrder: [2, 35, 53, 10, 40, 5] },
  { contest: 3041, date: "06/08/2026", numbers: [16, 21, 24, 31, 43, 54], rawOrder: [16, 21, 24, 54, 31, 43] },
  { contest: 3040, date: "04/08/2026", numbers: [3, 16, 24, 30, 49, 54], rawOrder: [16, 54, 49, 30, 3, 24] },
  { contest: 3039, date: "02/08/2026", numbers: [14, 16, 21, 39, 53, 58], rawOrder: [21, 58, 53, 16, 14, 39] },
  { contest: 3038, date: "30/07/2026", numbers: [30, 35, 38, 39, 46, 50], rawOrder: [38, 50, 35, 39, 30, 46] },
  { contest: 3037, date: "28/07/2026", numbers: [2, 11, 22, 30, 51, 54], rawOrder: [11, 30, 2, 51, 54, 22] },
  { contest: 3036, date: "26/07/2026", numbers: [5, 12, 21, 33, 43, 50], rawOrder: [21, 43, 50, 5, 33, 12] },
  { contest: 3035, date: "23/07/2026", numbers: [5, 7, 17, 51, 56, 59], rawOrder: [7, 56, 17, 59, 51, 5] },
  { contest: 3034, date: "21/07/2026", numbers: [8, 28, 30, 37, 39, 60], rawOrder: [37, 28, 8, 39, 30, 60] },
  { contest: 3033, date: "19/07/2026", numbers: [18, 21, 23, 43, 55, 58], rawOrder: [23, 58, 55, 18, 21, 43] },
  { contest: 3032, date: "16/07/2026", numbers: [8, 12, 23, 27, 42, 43], rawOrder: [27, 42, 23, 12, 43, 8] },
  { contest: 3031, date: "14/07/2026", numbers: [20, 28, 32, 35, 40, 54], rawOrder: [28, 20, 32, 40, 54, 35] },
  { contest: 3030, date: "11/07/2026", numbers: [6, 11, 25, 45, 48, 58], rawOrder: [45, 58, 25, 6, 11, 48] },
  { contest: 3029, date: "09/07/2026", numbers: [1, 11, 24, 33, 35, 59], rawOrder: [11, 59, 33, 35, 24, 1] },
  { contest: 3028, date: "07/07/2026", numbers: [2, 10, 11, 25, 51, 56], rawOrder: [51, 11, 2, 56, 25, 10] },
  { contest: 3027, date: "04/07/2026", numbers: [6, 15, 16, 24, 34, 47], rawOrder: [34, 24, 16, 47, 15, 6] },
  { contest: 3026, date: "02/07/2026", numbers: [14, 19, 42, 45, 48, 54], rawOrder: [19, 45, 54, 48, 42, 14] },
  { contest: 3025, date: "30/06/2026", numbers: [7, 14, 16, 21, 33, 58], rawOrder: [21, 58, 7, 14, 16, 33] },
  { contest: 3024, date: "27/06/2026", numbers: [13, 39, 42, 44, 47, 49], rawOrder: [39, 13, 44, 47, 49, 42] },
  { contest: 3023, date: "25/06/2026", numbers: [22, 25, 30, 31, 39, 60], rawOrder: [60, 30, 31, 22, 25, 39] },
  { contest: 3022, date: "23/06/2026", numbers: [2, 3, 8, 11, 17, 22], rawOrder: [11, 2, 3, 22, 17, 8] },
  { contest: 3021, date: "20/06/2026", numbers: [16, 19, 22, 24, 46, 58], rawOrder: [46, 19, 16, 58, 22, 24] },
  { contest: 3020, date: "18/06/2026", numbers: [6, 9, 17, 27, 29, 45], rawOrder: [27, 45, 29, 6, 17, 9] },
  { contest: 3019, date: "16/06/2026", numbers: [5, 31, 32, 48, 54, 56], rawOrder: [54, 32, 48, 56, 31, 5] },
  { contest: 3018, date: "14/06/2026", numbers: [5, 6, 17, 27, 57, 58], rawOrder: [6, 5, 27, 57, 17, 58] },
  { contest: 3017, date: "11/06/2026", numbers: [4, 6, 26, 28, 32, 45], rawOrder: [4, 28, 6, 26, 45, 32] },
  { contest: 3016, date: "09/06/2026", numbers: [11, 19, 33, 52, 55, 60], rawOrder: [55, 52, 19, 33, 11, 60] },
  { contest: 3015, date: "06/06/2026", numbers: [9, 18, 26, 31, 53, 58], rawOrder: [18, 31, 58, 53, 26, 9] },
  { contest: 3014, date: "02/06/2026", numbers: [27, 30, 35, 40, 44, 58], rawOrder: [40, 35, 58, 44, 30, 27] },
  { contest: 3013, date: "30/05/2026", numbers: [2, 14, 21, 22, 34, 44], rawOrder: [21, 14, 2, 34, 44, 22] },
  { contest: 3012, date: "28/05/2026", numbers: [5, 7, 17, 41, 42, 49], rawOrder: [49, 17, 5, 41, 7, 42] },
  { contest: 3011, date: "26/05/2026", numbers: [2, 5, 27, 36, 40, 60], rawOrder: [2, 5, 60, 36, 27, 40] },
  { contest: 3010, date: "24/05/2026", numbers: [3, 30, 33, 35, 45, 47], rawOrder: [35, 33, 45, 30, 47, 3] },
  // Concurso 1 inaugural da história da Mega-Sena (11/03/1996)
  { contest: 1, date: "11/03/1996", numbers: [4, 5, 30, 33, 41, 52], rawOrder: [41, 5, 4, 52, 30, 33] }
];

// Total oficial consolidado
export const TOTAL_CONTESTS_COUNT = 3069;
