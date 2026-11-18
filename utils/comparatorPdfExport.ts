import { jsPDF } from 'jspdf';
import { Bet, LotteryType, TernoBoostProfile } from '../types';
import {
  BacktestDrawResult,
  BacktestSummary,
  CalibrationResult
} from './backtestingEngine';
import { getStrategyMeta } from './strategyCatalog';
import { ProspectiveAuditEntry } from './portfolioOptimizer';

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_X = 14;
const CONTENT_W = PAGE_W - MARGIN_X * 2;
const FOOTER_LIMIT_Y = 278;

interface ThemePalette {
  name: string;
  primary: [number, number, number];
  dark: [number, number, number];
  lightBg: [number, number, number];
  border: [number, number, number];
}

function getTheme(lottery: LotteryType): ThemePalette {
  if (lottery === 'lotofacil') {
    return {
      name: 'Lotofácil',
      primary: [126, 34, 206],
      dark: [59, 7, 100],
      lightBg: [250, 245, 255],
      border: [216, 180, 254]
    };
  }
  if (lottery === 'maismilionaria') {
    return {
      name: '+Milionária',
      primary: [180, 83, 9],
      dark: [69, 26, 3],
      lightBg: [255, 251, 235],
      border: [252, 211, 77]
    };
  }
  return {
    name: 'Mega-Sena',
    primary: [4, 120, 87],
    dark: [6, 78, 59],
    lightBg: [236, 253, 245],
    border: [167, 243, 208]
  };
}

/**
 * Converte caracteres Unicode não suportados pela codificação WinAnsi padrão do jsPDF
 * para equivalentes limpos em ASCII/Latin-1, preservando acentuação em português.
 */
function safePdfText(input: string | number | null | undefined): string {
  if (input === null || input === undefined) return '';
  return String(input)
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/Δ/g, 'Dif.')
    .replace(/→/g, '->')
    .replace(/•/g, '|')
    .replace(/·/g, '|')
    .replace(/—|–/g, '-')
    .replace(/…/g, '...')
    .replace(/🍀/g, 'T:')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '');
}

function formatNum(n: number): string {
  return String(n).padStart(2, '0');
}

function formatDateSlug(): string {
  return new Date().toISOString().slice(0, 10);
}

function drawBannerHeader(
  doc: jsPDF,
  theme: ThemePalette,
  title: string,
  subtitleLines: string[]
): number {
  doc.setFillColor(...theme.dark);
  doc.roundedRect(MARGIN_X, 12, CONTENT_W, 28, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(safePdfText(title), MARGIN_X + 5, 21);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(226, 232, 240);
  let y = 27.5;
  subtitleLines.slice(0, 2).forEach(line => {
    doc.text(safePdfText(line), MARGIN_X + 5, y);
    y += 4.8;
  });

  return 46;
}

function applyFooters(doc: jsPDF, reportLabel: string) {
  const pageCount = doc.getNumberOfPages();
  const generatedAt = new Date().toLocaleString('pt-BR');
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(MARGIN_X, 285, PAGE_W - MARGIN_X, 285);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      safePdfText(`${reportLabel} | Gerado em ${generatedAt}`),
      MARGIN_X,
      290
    );
    doc.text(
      safePdfText(`Página ${i} de ${pageCount}`),
      PAGE_W - MARGIN_X,
      290,
      { align: 'right' }
    );
  }
}

function ensureSpace(doc: jsPDF, currentY: number, neededHeight: number): number {
  if (currentY + neededHeight > FOOTER_LIMIT_Y) {
    doc.addPage();
    return 18;
  }
  return currentY;
}

function drawSectionHeading(
  doc: jsPDF,
  theme: ThemePalette,
  y: number,
  title: string
): number {
  const nextY = ensureSpace(doc, y, 12);
  doc.setFillColor(...theme.primary);
  doc.rect(MARGIN_X, nextY - 3.6, 2.2, 5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(safePdfText(title), MARGIN_X + 4.5, nextY);
  return nextY + 5.5;
}

// ============================================================================
// 1. EXPORTAÇÃO: COMPARAÇÃO DIRETA DE APOSTAS
// ============================================================================

export interface DirectComparisonPdfParams {
  lottery: LotteryType;
  maxLimit: number;
  selectedBets: Bet[];
  commonNumbers: number[];
  unionNumbers: number[];
  pairwiseStats: Array<{
    gameAIndex: number;
    gameBIndex: number;
    common: number[];
    jaccardPercent: number;
    collisionLevel: 'baixa' | 'moderada' | 'alta';
  }>;
  verdict: {
    level: string;
    title: string;
    description: string;
  } | null;
}

export function buildDirectComparisonPdfDoc(params: DirectComparisonPdfParams): jsPDF {
  const {
    lottery,
    maxLimit,
    selectedBets,
    commonNumbers,
    unionNumbers,
    pairwiseStats,
    verdict
  } = params;

  const theme = getTheme(lottery);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const nowStr = new Date().toLocaleString('pt-BR');

  let y = drawBannerHeader(
    doc,
    theme,
    `Comparador Direto de Apostas - ${theme.name}`,
    [
      `Análise de Colisão, Interseção e Cobertura Conjunta | ${selectedBets.length} jogos comparados`,
      `Emitido em: ${nowStr} | Universo da cartela: 01 a ${formatNum(maxLimit)}`
    ]
  );

  // Veredito Estratégico
  if (verdict) {
    const descLines = doc.splitTextToSize(safePdfText(verdict.description), CONTENT_W - 10);
    const boxH = 11 + descLines.length * 4.3;
    y = ensureSpace(doc, y, boxH + 4);

    if (verdict.level === 'warning') {
      doc.setFillColor(255, 251, 235);
      doc.setDrawColor(245, 158, 11);
    } else if (verdict.level === 'success') {
      doc.setFillColor(236, 253, 245);
      doc.setDrawColor(16, 185, 129);
    } else {
      doc.setFillColor(239, 246, 255);
      doc.setDrawColor(59, 130, 246);
    }

    doc.roundedRect(MARGIN_X, y, CONTENT_W, boxH, 2.5, 2.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(safePdfText(`Veredito: ${verdict.title}`), MARGIN_X + 4, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(descLines, MARGIN_X + 4, y + 11.2);
    y += boxH + 7;
  }

  // Resumo de Interseção e Cobertura Total
  const commonText =
    commonNumbers.length > 0
      ? commonNumbers.map(formatNum).join(' - ')
      : 'Nenhuma dezena compartilhada simultaneamente por todos os jogos (alta independência).';
  const unionText = unionNumbers.map(formatNum).join(' - ');
  const commonLines = doc.splitTextToSize(safePdfText(commonText), CONTENT_W - 10);
  const unionLines = doc.splitTextToSize(safePdfText(unionText), CONTENT_W - 10);

  y = drawSectionHeading(doc, theme, y, 'Interseção e Cobertura Conjunta');

  const summaryBoxH = 15 + commonLines.length * 4.2 + unionLines.length * 4.2;
  y = ensureSpace(doc, y, summaryBoxH + 4);
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(MARGIN_X, y, CONTENT_W, summaryBoxH, 2, 2, 'FD');

  let innerY = y + 5.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(safePdfText(`Dezenas em Comum (${commonNumbers.length}):`), MARGIN_X + 4, innerY);
  innerY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(commonLines, MARGIN_X + 4, innerY);
  innerY += commonLines.length * 4.2 + 2.5;

  const unionPct = ((unionNumbers.length / maxLimit) * 100).toFixed(1);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(
    safePdfText(`Cobertura Total Conjunta (${unionNumbers.length} de ${maxLimit} = ${unionPct}%):`),
    MARGIN_X + 4,
    innerY
  );
  innerY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(unionLines, MARGIN_X + 4, innerY);

  y += summaryBoxH + 8;

  // Apostas Selecionadas
  y = drawSectionHeading(doc, theme, y, `Jogos Comparados (${selectedBets.length})`);

  selectedBets.forEach((bet, idx) => {
    const sum = bet.numbers.reduce((a, b) => a + b, 0);
    const evens = bet.numbers.filter(n => n % 2 === 0).length;
    const odds = bet.numbers.length - evens;
    const trevosStr =
      bet.trevos && bet.trevos.length > 0 ? ` | Trevos: ${bet.trevos.join(', ')}` : '';
    const numbersFormatted = bet.numbers.map(formatNum).join(' - ') + trevosStr;
    const numLines = doc.splitTextToSize(safePdfText(numbersFormatted), CONTENT_W - 10);
    const cardH = 12 + numLines.length * 4.5;

    y = ensureSpace(doc, y, cardH + 3);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...theme.border);
    doc.roundedRect(MARGIN_X, y, CONTENT_W, cardH, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...theme.dark);
    doc.text(
      safePdfText(`Jogo Comparado ${idx + 1} (${bet.type.toUpperCase()})`),
      MARGIN_X + 4,
      y + 5.5
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(
      safePdfText(
        `Soma: ${sum} | Paridade: ${evens}P/${odds}I | Data: ${new Date(bet.createdAt).toLocaleDateString('pt-BR')}`
      ),
      PAGE_W - MARGIN_X - 4,
      y + 5.5,
      { align: 'right' }
    );

    doc.setFont('courier', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(numLines, MARGIN_X + 4, y + 11.2);

    y += cardH + 3.5;
  });

  // Matriz de Colisão Par a Par
  if (pairwiseStats.length > 0) {
    y += 3;
    y = drawSectionHeading(doc, theme, y, 'Matriz de Colisão e Semelhança Par a Par (Índice de Jaccard)');

    // Cabeçalho da tabela
    y = ensureSpace(doc, y, 16);
    doc.setFillColor(241, 245, 249);
    doc.rect(MARGIN_X, y, CONTENT_W, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text('Par Comparado', MARGIN_X + 3, y + 4.8);
    doc.text('Dezenas em Comum', MARGIN_X + 45, y + 4.8);
    doc.text('Jaccard', MARGIN_X + 132, y + 4.8);
    doc.text('Classificação', MARGIN_X + 155, y + 4.8);
    y += 7;

    pairwiseStats.forEach((stat, rowIdx) => {
      const commonList =
        stat.common.length > 0
          ? `${stat.common.length} (${stat.common.map(formatNum).join(', ')})`
          : '0';
      const commonWrapped = doc.splitTextToSize(safePdfText(commonList), 82);
      const rowH = Math.max(7, commonWrapped.length * 4 + 3);
      y = ensureSpace(doc, y, rowH);

      if (rowIdx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(MARGIN_X, y, CONTENT_W, rowH, 'F');
      }
      doc.setDrawColor(226, 232, 240);
      doc.line(MARGIN_X, y + rowH, PAGE_W - MARGIN_X, y + rowH);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.2);
      doc.setTextColor(15, 23, 42);
      doc.text(safePdfText(`Jogo ${stat.gameAIndex} vs Jogo ${stat.gameBIndex}`), MARGIN_X + 3, y + 4.8);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(commonWrapped, MARGIN_X + 45, y + 4.8);

      doc.setFont('helvetica', 'bold');
      doc.text(safePdfText(`${stat.jaccardPercent}%`), MARGIN_X + 132, y + 4.8);

      const levelLabel =
        stat.collisionLevel === 'alta'
          ? 'Alta Colisão'
          : stat.collisionLevel === 'moderada'
          ? 'Moderada'
          : 'Disperso';
      if (stat.collisionLevel === 'alta') doc.setTextColor(185, 28, 28);
      else if (stat.collisionLevel === 'moderada') doc.setTextColor(180, 83, 9);
      else doc.setTextColor(4, 120, 87);
      doc.text(safePdfText(levelLabel), MARGIN_X + 155, y + 4.8);

      y += rowH;
    });
  }

  applyFooters(doc, `Comparador Direto - ${theme.name}`);
  return doc;
}

export function exportDirectComparisonPdf(params: DirectComparisonPdfParams): string {
  const doc = buildDirectComparisonPdfDoc(params);
  const filename = `comparador-direto-${params.lottery}-${formatDateSlug()}.pdf`;
  doc.save(filename);
  return filename;
}

// ============================================================================
// 2. EXPORTAÇÃO: MODO BACKTESTING HISTÓRICO
// ============================================================================

export interface BacktestingPdfParams {
  lottery: LotteryType;
  summary: BacktestSummary;
  calibrationResult: CalibrationResult | null;
  filteredRows: BacktestDrawResult[];
  activeFilterLabel: string;
  sortLabel: string;
  distributionTiers: Array<{ label: string; count: number; highlight: boolean }>;
  ternoProfile: TernoBoostProfile | null;
  activeRulesCount: number;
  usePlausibilityTest: boolean;
}

export function buildBacktestingPdfDoc(params: BacktestingPdfParams): jsPDF {
  const {
    lottery,
    summary,
    calibrationResult,
    filteredRows,
    activeFilterLabel,
    sortLabel,
    distributionTiers,
    ternoProfile,
    activeRulesCount,
    usePlausibilityTest
  } = params;

  const theme = getTheme(lottery);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const strategyMeta = getStrategyMeta(summary.strategyUsed);
  const strategyLabel = strategyMeta.name;

  let y = drawBannerHeader(
    doc,
    theme,
    `Relatório de Backtesting Histórico - ${theme.name}`,
    [
      `Intervalo: Concursos #${summary.startContest} a #${summary.endContest} (${summary.totalContests} sorteios) | Modelo: ${strategyLabel}`,
      `Regras ativas: ${activeRulesCount} | Plausibilidade estrita: ${usePlausibilityTest ? 'Ativada' : 'Desativada'}`
    ]
  );

  // KPI Cards (4 caixas)
  const cardW = (CONTENT_W - 9) / 4;
  const cardH = 18;
  const prizeRate =
    summary.totalContests > 0
      ? ((summary.totalPrizes / summary.totalContests) * 100).toFixed(1)
      : '0.0';

  const kpis = [
    {
      title: 'CONCURSOS',
      value: `${summary.totalContests}`,
      sub: `#${summary.startContest}..#${summary.endContest}`
    },
    {
      title: 'MELHOR ACERTO',
      value: `${summary.maxHits} dez.`,
      sub: summary.bestContestNumber ? `Concurso #${summary.bestContestNumber}` : '-'
    },
    {
      title: 'MÉDIA / SORTEIO',
      value: `${summary.averageHits}`,
      sub: strategyMeta.shortName
    },
    {
      title: 'PREMIADOS',
      value: `${summary.totalPrizes}`,
      sub: `${prizeRate}% de taxa`
    }
  ];

  kpis.forEach((kpi, i) => {
    const x = MARGIN_X + i * (cardW + 3);
    doc.setFillColor(...(i === 3 ? theme.lightBg : ([248, 250, 252] as [number, number, number])));
    doc.setDrawColor(...(i === 3 ? theme.border : ([203, 213, 225] as [number, number, number])));
    doc.roundedRect(x, y, cardW, cardH, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(safePdfText(kpi.title), x + 3, y + 5);

    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(safePdfText(kpi.value), x + 3, y + 11.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(71, 85, 105);
    doc.text(safePdfText(kpi.sub), x + 3, y + 15.8);
  });

  y += cardH + 8;

  // Distribuição de Acertos
  if (distributionTiers.length > 0) {
    y = drawSectionHeading(doc, theme, y, 'Distribuição de Acertos no Intervalo');
    const cols = distributionTiers.length;
    const gap = 2;
    const tierW = (CONTENT_W - gap * (cols - 1)) / cols;
    const tierH = 13;
    y = ensureSpace(doc, y, tierH + 4);

    distributionTiers.forEach((tier, i) => {
      const x = MARGIN_X + i * (tierW + gap);
      const isHitBg = tier.highlight && tier.count > 0;
      doc.setFillColor(...(isHitBg ? theme.lightBg : ([248, 250, 252] as [number, number, number])));
      doc.setDrawColor(...(isHitBg ? theme.border : ([226, 232, 240] as [number, number, number])));
      doc.roundedRect(x, y, tierW, tierH, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(71, 85, 105);
      doc.text(safePdfText(tier.label), x + tierW / 2, y + 4.5, { align: 'center' });

      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text(String(tier.count), x + tierW / 2, y + 10.5, { align: 'center' });
    });

    y += tierH + 7;
  }

  // Calibração Automática (se executada)
  if (calibrationResult) {
    y = drawSectionHeading(
      doc,
      theme,
      y,
      `Calibração Automática (${calibrationResult.roundsExecuted} rodadas | Melhor: ${calibrationResult.bestLabel})`
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    doc.setTextColor(51, 65, 85);
    y = ensureSpace(doc, y, 7);
    doc.text(
      safePdfText(
        `Linha de base: máx. ${calibrationResult.baselineMaxHits} (média ${calibrationResult.baselineAvgHits}) -> Melhor encontrado: máx. ${calibrationResult.bestMaxHits} (média ${calibrationResult.bestAvgHits}) | Meta: ${calibrationResult.targetHits} acertos (${calibrationResult.achievedTarget ? 'ATINGIDA' : 'NÃO ATINGIDA'})`
      ),
      MARGIN_X,
      y
    );
    y += 5;

    y = ensureSpace(doc, y, 13);
    doc.setFillColor(241, 245, 249);
    doc.rect(MARGIN_X, y, CONTENT_W, 6.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text('Rodada', MARGIN_X + 2, y + 4.5);
    doc.text('Configuração Testada', MARGIN_X + 18, y + 4.5);
    doc.text('Máx.', MARGIN_X + 124, y + 4.5);
    doc.text('Média', MARGIN_X + 140, y + 4.5);
    doc.text('Prem.', MARGIN_X + 157, y + 4.5);
    doc.text('Status', MARGIN_X + 172, y + 4.5);
    y += 6.5;

    calibrationResult.roundLogs.forEach((log, idx) => {
      y = ensureSpace(doc, y, 6);
      if (log.hitTarget) {
        doc.setFillColor(236, 253, 245);
        doc.rect(MARGIN_X, y, CONTENT_W, 5.8, 'F');
      } else if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(MARGIN_X, y, CONTENT_W, 5.8, 'F');
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`#${log.round}`, MARGIN_X + 2, y + 4.1);
      doc.text(safePdfText(log.label.slice(0, 56)), MARGIN_X + 18, y + 4.1);
      doc.text(String(log.maxHits), MARGIN_X + 125, y + 4.1);
      doc.text(String(log.avgHits), MARGIN_X + 140, y + 4.1);
      doc.text(String(log.prizesCount), MARGIN_X + 159, y + 4.1);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...(log.hitTarget ? theme.primary : ([100, 116, 139] as [number, number, number])));
      doc.text(log.hitTarget ? 'META' : 'Testado', MARGIN_X + 172, y + 4.1);
      y += 5.8;
    });
    y += 6;
  }

  // Perfil Estatístico Terno+ (se disponível)
  if (ternoProfile) {
    y = drawSectionHeading(
      doc,
      theme,
      y,
      `Perfil Extraído das Simulações com ${ternoProfile.minHitsThreshold}+ Acertos (${ternoProfile.ternoSimulationsCount}/${ternoProfile.sourceSimulationsCount})`
    );
    const hotStr = ternoProfile.matchedHotNumbers.map(formatNum).join(' - ') || '-';
    const topStr = ternoProfile.topNumbers.map(formatNum).join(' - ') || '-';
    const pairsStr =
      ternoProfile.topPairs
        .slice(0, 5)
        .map(([a, b]) => `${formatNum(a)}-${formatNum(b)}`)
        .join(' | ') || '-';

    const infoLines = doc.splitTextToSize(
      safePdfText(
        `Soma média: ${ternoProfile.avgSum} (faixa ${ternoProfile.targetSumMin}-${ternoProfile.targetSumMax}) | Moldura média: ${ternoProfile.avgFrameCount} | Primos médios: ${ternoProfile.avgPrimesCount}\nDezenas acertadas: ${hotStr}\nTop dezenas: ${topStr} | Duques: ${pairsStr}`
      ),
      CONTENT_W - 8
    );
    const boxH = 5 + infoLines.length * 4.2;
    y = ensureSpace(doc, y, boxH + 4);
    doc.setFillColor(...theme.lightBg);
    doc.setDrawColor(...theme.border);
    doc.roundedRect(MARGIN_X, y, CONTENT_W, boxH, 2, 2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(infoLines, MARGIN_X + 4, y + 4.8);
    y += boxH + 7;
  }

  // Resultados Concurso a Concurso
  y = drawSectionHeading(
    doc,
    theme,
    y,
    `Resultados Concurso a Concurso (${filteredRows.length} exibidos de ${summary.results.length})`
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(100, 116, 139);
  y = ensureSpace(doc, y, 6);
  doc.text(safePdfText(`Filtro aplicado: ${activeFilterLabel} | Ordenação: ${sortLabel}`), MARGIN_X, y);
  y += 4.5;

  if (filteredRows.length === 0) {
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Nenhum concurso corresponde ao filtro atual.', MARGIN_X, y + 4);
  } else {
    const drawTableHeader = (currY: number) => {
      doc.setFillColor(15, 23, 42);
      doc.rect(MARGIN_X, currY, CONTENT_W, 6.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.4);
      doc.setTextColor(255, 255, 255);
      doc.text('Conc.', MARGIN_X + 2, currY + 4.5);
      doc.text('Data', MARGIN_X + 18, currY + 4.5);
      doc.text('Acertos', MARGIN_X + 38, currY + 4.5);
      doc.text('Aposta Gerada', MARGIN_X + 58, currY + 4.5);
      doc.text('Resultado Oficial', MARGIN_X + 116, currY + 4.5);
      doc.text('Coincidências', MARGIN_X + 162, currY + 4.5);
      return currY + 6.5;
    };

    y = ensureSpace(doc, y, 14);
    y = drawTableHeader(y);

    filteredRows.forEach((row, idx) => {
      const genStr =
        row.generatedNumbers.map(formatNum).join(' ') +
        (row.generatedTrevos && row.generatedTrevos.length > 0
          ? ` (T:${row.generatedTrevos.join(',')})`
          : '');
      const offStr =
        row.drawnNumbers.map(formatNum).join(' ') +
        (row.drawnTrevos && row.drawnTrevos.length > 0
          ? ` (T:${row.drawnTrevos.join(',')})`
          : '');
      const matchedStr =
        row.matchedNumbers.length > 0 ? row.matchedNumbers.map(formatNum).join(' ') : '-';

      const genLines = doc.splitTextToSize(safePdfText(genStr), 55);
      const offLines = doc.splitTextToSize(safePdfText(offStr), 43);
      const hitLines = doc.splitTextToSize(safePdfText(matchedStr), 18);
      const maxLines = Math.max(genLines.length, offLines.length, hitLines.length, 1);
      const rowH = Math.max(6.8, maxLines * 3.7 + 2.8);

      if (y + rowH > FOOTER_LIMIT_Y) {
        doc.addPage();
        y = 18;
        y = drawTableHeader(y);
      }

      if (row.isPrize) {
        doc.setFillColor(236, 253, 245);
        doc.rect(MARGIN_X, y, CONTENT_W, rowH, 'F');
      } else if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(MARGIN_X, y, CONTENT_W, rowH, 'F');
      }

      doc.setDrawColor(226, 232, 240);
      doc.line(MARGIN_X, y + rowH, PAGE_W - MARGIN_X, y + rowH);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`#${row.contest}`, MARGIN_X + 2, y + 4.3);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(safePdfText(row.date), MARGIN_X + 18, y + 4.3);

      doc.setFont('helvetica', 'bold');
      if (row.isPrize) doc.setTextColor(...theme.primary);
      else if (row.hits >= 3) doc.setTextColor(180, 83, 9);
      else doc.setTextColor(71, 85, 105);
      const hitsLabel = row.prizeLabel ? `${row.hits} (${row.prizeLabel.split(' ')[0]})` : `${row.hits} ac`;
      doc.text(safePdfText(hitsLabel), MARGIN_X + 38, y + 4.3);

      doc.setFont('courier', 'normal');
      doc.setFontSize(7.1);
      doc.setTextColor(15, 23, 42);
      doc.text(genLines, MARGIN_X + 58, y + 4.2);
      doc.text(offLines, MARGIN_X + 116, y + 4.2);

      doc.setFont('courier', 'bold');
      doc.setTextColor(...(row.matchedNumbers.length > 0 ? theme.primary : ([148, 163, 184] as [number, number, number])));
      doc.text(hitLines, MARGIN_X + 162, y + 4.2);

      y += rowH;
    });
  }

  applyFooters(doc, `Backtesting Comparador - ${theme.name}`);
  return doc;
}

export function exportBacktestingPdf(params: BacktestingPdfParams): string {
  const doc = buildBacktestingPdfDoc(params);
  const filename = `comparador-backtesting-${params.lottery}-${params.summary.startContest}-${params.summary.endContest}-${formatDateSlug()}.pdf`;
  doc.save(filename);
  return filename;
}

// ============================================================================
// 3. EXPORTAÇÃO: AUDITORIA PROSPECTIVA (SHA-256)
// ============================================================================

export interface ProspectiveAuditPdfParams {
  entries: ProspectiveAuditEntry[];
  viewFilterLabel: string;
  aggregate: {
    count: number;
    totalBets: number;
    optTernos: number;
    optQuadras: number;
    optQuinas: number;
    optSenas: number;
    optContestsWith3Plus: number;
    optRate3Plus: number;
    randTernos: number;
    randQuadras: number;
    randQuinas: number;
    randSenas: number;
    randContestsWith3Plus: number;
    randRate3Plus: number;
    avgOptPairCov: number;
    avgRandPairCov: number;
    zTest3Plus: { zScore: number; pValue: number; diffPctPoints: number };
  };
}

export function buildProspectiveAuditPdfDoc(params: ProspectiveAuditPdfParams): jsPDF {
  const { entries, viewFilterLabel, aggregate } = params;
  const theme = getTheme('megasena');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  let y = drawBannerHeader(
    doc,
    theme,
    'Auditoria Prospectiva - Cobertura Otimizada vs Aleatória',
    [
      `Protocolo Commit-Before-Draw (SHA-256) | Filtro: ${viewFilterLabel}`,
      `Carteiras registradas: ${entries.length} | Concursos encerrados avaliados: ${aggregate.count}`
    ]
  );

  if (aggregate.count > 0) {
    y = drawSectionHeading(doc, theme, y, 'Desempenho Acumulado Pareado (Mesmo Orçamento)');
    const cardW = (CONTENT_W - 9) / 4;
    const cardH = 19;
    y = ensureSpace(doc, y, cardH + 6);

    const kpis = [
      {
        title: 'CONC. C/ 3+ ACERTOS',
        value: `${aggregate.optRate3Plus.toFixed(1)}%`,
        sub: `vs ${aggregate.randRate3Plus.toFixed(1)}% aleat.`
      },
      {
        title: 'TERNOS / QUADRAS',
        value: `${aggregate.optTernos}T / ${aggregate.optQuadras}Q`,
        sub: `vs ${aggregate.randTernos}T / ${aggregate.randQuadras}Q aleat.`
      },
      {
        title: 'COB. MÉDIA PARES',
        value: `${aggregate.avgOptPairCov.toFixed(1)}%`,
        sub: `vs ${aggregate.avgRandPairCov.toFixed(1)}% aleat.`
      },
      {
        title: 'TESTE Z (3+ ACERTOS)',
        value: `z = ${aggregate.zTest3Plus.zScore.toFixed(2)}`,
        sub: `p = ${aggregate.zTest3Plus.pValue.toFixed(4)} (${aggregate.totalBets} ap.)`
      }
    ];

    kpis.forEach((kpi, i) => {
      const x = MARGIN_X + i * (cardW + 3);
      doc.setFillColor(...(i === 0 ? theme.lightBg : ([248, 250, 252] as [number, number, number])));
      doc.setDrawColor(...(i === 0 ? theme.border : ([203, 213, 225] as [number, number, number])));
      doc.roundedRect(x, y, cardW, cardH, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(100, 116, 139);
      doc.text(safePdfText(kpi.title), x + 3, y + 5);

      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(safePdfText(kpi.value), x + 3, y + 11.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(71, 85, 105);
      doc.text(safePdfText(kpi.sub), x + 3, y + 16.5);
    });

    y += cardH + 8;
  }

  y = drawSectionHeading(doc, theme, y, `Registro Imutável de Carteiras (${entries.length})`);

  const drawLedgerHeader = (currY: number) => {
    doc.setFillColor(15, 23, 42);
    doc.rect(MARGIN_X, currY, CONTENT_W, 6.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.3);
    doc.setTextColor(255, 255, 255);
    doc.text('Conc.', MARGIN_X + 2, currY + 4.5);
    doc.text('Estratégia / Hash SHA-256', MARGIN_X + 18, currY + 4.5);
    doc.text('Cob. Pares', MARGIN_X + 92, currY + 4.5);
    doc.text('Sorteio Oficial', MARGIN_X + 114, currY + 4.5);
    doc.text('Otimizada vs Aleatória', MARGIN_X + 148, currY + 4.5);
    return currY + 6.5;
  };

  y = ensureSpace(doc, y, 14);
  y = drawLedgerHeader(y);

  entries.forEach((entry, idx) => {
    const rowH = 10.5;
    if (y + rowH > FOOTER_LIMIT_Y) {
      doc.addPage();
      y = 18;
      y = drawLedgerHeader(y);
    }

    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(MARGIN_X, y, CONTENT_W, rowH, 'F');
    }
    doc.setDrawColor(226, 232, 240);
    doc.line(MARGIN_X, y + rowH, PAGE_W - MARGIN_X, y + rowH);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.6);
    doc.setTextColor(15, 23, 42);
    doc.text(`#${entry.targetContest}`, MARGIN_X + 2, y + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text(`${entry.ticketCount} jg`, MARGIN_X + 2, y + 8.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.3);
    doc.setTextColor(15, 23, 42);
    doc.text(safePdfText(entry.strategyLabel.slice(0, 42)), MARGIN_X + 18, y + 4.4);
    doc.setFont('courier', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(71, 85, 105);
    const seedSuffix = entry.seed !== undefined ? ` | Seed ${entry.seed}` : '';
    doc.text(safePdfText(`SHA: ${entry.commitmentHash.slice(0, 14)}...${seedSuffix}`), MARGIN_X + 18, y + 8.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(
      `${entry.optimizedCoverage.pairCoveragePct.toFixed(1)}% P`,
      MARGIN_X + 92,
      y + 4.5
    );
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `${entry.optimizedCoverage.uniqueTriples}T | G ${entry.optimizedCoverage.giniCoefficient.toFixed(2)}`,
      MARGIN_X + 92,
      y + 8.5
    );

    if (entry.officialDraw && entry.optimizedEval && entry.randomEval) {
      doc.setFont('courier', 'bold');
      doc.setFontSize(7.1);
      doc.setTextColor(15, 23, 42);
      doc.text(entry.officialDraw.numbers.map(formatNum).join(' '), MARGIN_X + 114, y + 4.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(100, 116, 139);
      doc.text(safePdfText(entry.officialDraw.date), MARGIN_X + 114, y + 8.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.4);
      doc.setTextColor(...theme.primary);
      doc.text(
        safePdfText(
          `Ot: ${entry.optimizedEval.ternos}T ${entry.optimizedEval.quadras}Q ${entry.optimizedEval.quinas}Qi`
        ),
        MARGIN_X + 148,
        y + 4.5
      );
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(
        safePdfText(
          `Al: ${entry.randomEval.ternos}T ${entry.randomEval.quadras}Q ${entry.randomEval.quinas}Qi`
        ),
        MARGIN_X + 148,
        y + 8.5
      );
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(148, 163, 184);
      doc.text('Aguardando sorteio', MARGIN_X + 114, y + 5.8);
      doc.text('Pendente', MARGIN_X + 148, y + 5.8);
    }

    y += rowH;
  });

  applyFooters(doc, 'Auditoria Prospectiva - Mega-Sena');
  return doc;
}

export function exportProspectiveAuditPdf(params: ProspectiveAuditPdfParams): string {
  const doc = buildProspectiveAuditPdfDoc(params);
  const filename = `comparador-auditoria-prospectiva-megasena-${formatDateSlug()}.pdf`;
  doc.save(filename);
  return filename;
}
