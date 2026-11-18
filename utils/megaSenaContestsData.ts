/**
 * Banco de Dados Oficial Completo de Concursos da Mega-Sena
 * Consolidado a partir dos resultados oficiais por concurso e data (Concurso 1 a 3.087).
 */

import { MEGA_SENA_FULL_ARCHIVE_TUPLES } from './megaSenaFullArchive';

export interface MegaDraw {
  contest: number;
  date: string;
  numbers: number[]; // Dezenas ordenadas
  rawOrder?: number[]; // Ordem original do sorteio
}

// Conjunto completo oficial de todos os concursos da história da Mega-Sena (ordem decrescente)
export const RECENT_OFFICIAL_DRAWS: MegaDraw[] = MEGA_SENA_FULL_ARCHIVE_TUPLES.map(
  ([contest, date, d1, d2, d3, d4, d5, d6]) => ({
    contest,
    date,
    numbers: [d1, d2, d3, d4, d5, d6]
  })
);

// Total oficial consolidado
export const TOTAL_CONTESTS_COUNT = RECENT_OFFICIAL_DRAWS.length;
export const MEGA_SENA_OFFICIAL_DRAWS = RECENT_OFFICIAL_DRAWS;
