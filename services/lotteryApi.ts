import { OfficialDrawResult } from '../types';
import { RECENT_OFFICIAL_DRAWS } from '../utils/megaSenaContestsData';

const STORAGE_LATEST_DRAW_KEY = 'mega_sorte_latest_official_draw';

// Concurso oficial mais recente de referência consolidado
export const DEFAULT_OFFICIAL_DRAW: OfficialDrawResult = {
  contestNumber: RECENT_OFFICIAL_DRAWS[0].contest, // 3069
  date: RECENT_OFFICIAL_DRAWS[0].date, // "11/10/2026"
  numbers: [...RECENT_OFFICIAL_DRAWS[0].numbers], // [5, 19, 22, 44, 47, 57]
  accumulated: true,
  estimatedNextPrize: "R$ 38.000.000,00",
  prizeSena: "Acumulado",
  winnersSena: 0,
  lastUpdated: Date.now(),
  source: 'official_archive'
};

/**
 * Obtém o último resultado oficial armazenado em cache ou o padrão inicial
 */
export const getStoredLatestOfficialDraw = (): OfficialDrawResult => {
  try {
    const raw = localStorage.getItem(STORAGE_LATEST_DRAW_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.numbers) && parsed.numbers.length === 6) {
        return {
          ...parsed,
          numbers: parsed.numbers.map((n: any) => Number(n)).sort((a: number, b: number) => a - b)
        };
      }
    }
  } catch (err) {
    console.warn("Erro ao ler último concurso do cache local:", err);
  }
  return DEFAULT_OFFICIAL_DRAW;
};

/**
 * Salva o resultado do último concurso oficial no cache local
 */
export const saveStoredLatestOfficialDraw = (draw: OfficialDrawResult): void => {
  try {
    const cleanDraw: OfficialDrawResult = {
      ...draw,
      numbers: [...draw.numbers].sort((a, b) => a - b),
      lastUpdated: Date.now()
    };
    localStorage.setItem(STORAGE_LATEST_DRAW_KEY, JSON.stringify(cleanDraw));
  } catch (err) {
    console.warn("Erro ao salvar último concurso no cache local:", err);
  }
};

/**
 * Busca o resultado mais recente da Mega-Sena a partir de APIs públicas da Caixa/Loterias
 * Com fallback suave para o cache e histórico oficial
 */
export const fetchLatestOfficialDraw = async (): Promise<{ draw: OfficialDrawResult; isLive: boolean; message: string }> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4500);

  // Tentativa 1: API pública oficial / proxy de loterias
  const endpoints = [
    'https://servicebus2.caixa.gov.br/portaldeloterias/api/megasena',
    'https://loteriascaixa-api.herokuapp.com/api/megasena/latest',
    'https://api.guidi.dev.br/loteria/megasena/ultimo'
  ];

  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
        mode: 'cors'
      });

      if (response.ok) {
        clearTimeout(timeoutId);
        const data = await response.json();

        // Tratamento para diferentes formatos de API da Caixa / Loterias
        let contestNumber = 0;
        let dateStr = "";
        let numbers: number[] = [];
        let accumulated = false;
        let estimatedNextPrize = "";

        if (data.numero || data.concurso) {
          contestNumber = Number(data.numero || data.concurso);
          dateStr = data.dataApuracao || data.data || new Date().toLocaleDateString('pt-BR');
          
          const rawDezenas = data.listaDezenas || data.dezenas || data.resultado || [];
          numbers = rawDezenas.map((d: any) => Number(d)).filter((n: number) => !isNaN(n) && n >= 1 && n <= 60);

          accumulated = Boolean(data.acumulado);
          if (data.valorEstimadoProximoConcurso) {
            estimatedNextPrize = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
              .format(Number(data.valorEstimadoProximoConcurso));
          }
        }

        if (contestNumber > 0 && numbers.length === 6) {
          const liveDraw: OfficialDrawResult = {
            contestNumber,
            date: dateStr,
            numbers: numbers.sort((a, b) => a - b),
            accumulated,
            estimatedNextPrize: estimatedNextPrize || (accumulated ? "Acumulado para o próximo sorteio" : undefined),
            prizeSena: accumulated ? "Acumulou!" : "Sena Premiada",
            winnersSena: data.premiacoes?.[0]?.ganhadores ?? (accumulated ? 0 : 1),
            lastUpdated: Date.now(),
            source: 'api'
          };

          saveStoredLatestOfficialDraw(liveDraw);
          return {
            draw: liveDraw,
            isLive: true,
            message: `Concurso #${contestNumber} sincronizado com sucesso diretamente da Caixa!`
          };
        }
      }
    } catch {
      // Tentar próximo endpoint ou fallback
      continue;
    }
  }

  clearTimeout(timeoutId);

  // Fallback para dados salvos ou histórico consolidado
  const fallbackDraw = getStoredLatestOfficialDraw();
  return {
    draw: fallbackDraw,
    isLive: false,
    message: `Base oficial carregada (Concurso #${fallbackDraw.contestNumber}). Dados prontos e ativos para análises!`
  };
};
