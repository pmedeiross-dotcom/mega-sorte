
import { GoogleGenAI, Type } from "@google/genai";
import { AIRootResponse, AnalysisResult, AIBatchResponse, GeneratorLogic, OfficialDrawResult, LotteryType } from "../types";
import { generateGameWithRules } from "../utils/lotteryRules";
import { generateMaisMilionariaGameWithRules } from "../utils/maisMilionariaRules";
import { generateLotofacilWithRules } from "../utils/lotofacilRules";

const getAIClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
};

const buildDrawContext = (latestDraw?: OfficialDrawResult, logic?: GeneratorLogic, lottery: LotteryType = 'megasena'): string => {
  if (!latestDraw) return "";
  const drawNumsStr = latestDraw.numbers.join(', ');
  
  if (lottery === 'lotofacil') {
    return `
ÚLTIMO SORTEIO OFICIAL DA LOTOFÁCIL (Concurso #${latestDraw.contestNumber} de ${latestDraw.date}):
Dezenas Oficiais Sorteadas (15 dezenas entre 1 e 25): [${drawNumsStr}]
DIRETRIZ DE INTEGRAÇÃO OBRIGATÓRIA DA LOTOFÁCIL:
1. Repetidas do Concurso Anterior: Cerca de 80% dos concursos repetem entre 8 e 10 dezenas do sorteio anterior.
2. Moldura x Centro: A moldura (16 dezenas: 1-5, 6, 10, 11, 15, 16, 20, 21-25) costuma ter entre 9 e 11 dezenas sorteadas.
3. Soma Dourada: A soma das 15 dezenas fica predominantemente entre 180 e 220.
4. Par/Ímpar: Padrão mais frequente é 8 ímpares / 7 pares ou 7 ímpares / 8 pares.
`;
  }

  if (lottery === 'maismilionaria') {
    return `
ÚLTIMO SORTEIO OFICIAL DA +MILIONÁRIA (Concurso #${latestDraw.contestNumber} de ${latestDraw.date}):
Dezenas Oficiais Sorteadas (6 dezenas 1-50): [${drawNumsStr}]
Trevos Oficiais: [${latestDraw.trevos?.join(', ') || '1, 2'}]
`;
  }

  return `
ÚLTIMO SORTEIO OFICIAL DA MEGA-SENA (Concurso #${latestDraw.contestNumber} de ${latestDraw.date}):
Dezenas Oficiais Sorteadas: [${drawNumsStr}]
DIRETRIZ DE INTEGRAÇÃO OBRIGATÓRIA DO ÚLTIMO SORTEIO OFICIAL:
1. Repetição Histórica: Na história da Mega-Sena, cerca de 57% dos concursos repetem 1 ou 2 dezenas do concurso anterior. ${logic?.repeat1to2 ? `A REGRA DE REPETIÇÃO ESTÁ ATIVA: selecione obrigatoriamente 1 ou 2 dezenas sorteadas no Concurso #${latestDraw.contestNumber} ([${drawNumsStr}]).` : `Avalie se a repetição de 1 dezena dentre [${drawNumsStr}] fortalece a combinação.`}
2. Dezenas Vizinhas e Adjacência: Analise a tendência de atração das dezenas vizinhas imediatas (números n-1 ou n+1 das sorteadas [${drawNumsStr}]).
3. Atraso e Ciclo: As dezenas [${drawNumsStr}] estão no atraso 0 (recém-sorteadas), alterando os ciclos em aberto da cartela.
`;
};

const buildLogicContext = (logic?: GeneratorLogic): string => {
  if (!logic) return "";
  const rules = [];
  if (logic.repeat1to2) rules.push("- Repetição de 1 ou 2 dezenas do sorteio anterior");
  if (logic.balanceEvenOdd) rules.push("- Equilíbrio entre números pares e ímpares (ex: 3 pares e 3 ímpares ou 4/2)");
  if (logic.sum160to240) rules.push("- Soma total das dezenas sorteadas deve ficar entre 160 e 240 (Zona de Ouro)");
  if (logic.spreadDistribution) rules.push("- Distribuição espalhada pelos quadrantes da cartela (evitar aglomeração)");
  if (logic.concentrate20to50) rules.push("- Concentração maior de escolhas no intervalo entre 20 e 50");
  if (logic.max2Consecutive) rules.push("- No máximo 2 números em sequência consecutiva (ex: 12, 13)");
  if (logic.max2IdenticalEndings) rules.push("- No máximo 2 finais iguais (ex: no máximo duas dezenas terminadas em 4)");
  if (logic.preferHistoricalHotNumbers) rules.push("- Priorizar dezenas de alta frequência histórica acumulada em todos os concursos (ex: 10, 53, 05, 37, 27, 33, 38, 17, 30, 42)");
  if (logic.useAdvancedDuques) rules.push("- Priorizar Duques históricos consagrados (duplas mais sorteadas juntas, como 10-53, 33-42, 05-37, 27-53, 23-38)");
  if (logic.frameAndCenterBalance) rules.push("- Equilíbrio de Moldura x Centro: manter entre 2 e 4 dezenas na moldura e entre 2 e 4 no centro da cartela");
  if (logic.balancePrimesAndFibonacci) rules.push("- Equilíbrio numérico: manter entre 1 e 3 números primos e até 2 de Fibonacci");
  if (logic.paretoTopSelection) rules.push("- Princípio de Pareto 80/20: incluir de 1 a 3 dezenas do Top 12 histórico mais frequente");
  if (logic.includeCycleDezenas) rules.push("- Ciclo das Dezenas: favorecer dezenas faltantes para fechamento do ciclo atual");
  if (logic.multiplesOfThreeBalance) rules.push("- Múltiplos de Três: manter de 1 a 3 dezenas múltiplas de 3");
  if (logic.rowAndColDispersion) rules.push("- Dispersão uniforme: no máximo 2 dezenas na mesma linha ou coluna");
  
  if (rules.length === 0) return "";
  
  return `\nREGRAS OBRIGATÓRIAS (Aplicar as seguintes lógicas selecionadas):\n${rules.join('\n')}\n`;
};

export const generateLuckyNumbersWithAI = async (
  quantity: number = 6, 
  logic?: GeneratorLogic,
  latestDraw?: OfficialDrawResult,
  lottery: LotteryType = 'megasena'
): Promise<AIRootResponse> => {
  const ai = getAIClient();
  const logicContext = buildLogicContext(logic);
  const drawContext = buildDrawContext(latestDraw, logic, lottery);
  
  const isLoto = lottery === 'lotofacil';
  const isMais = lottery === 'maismilionaria';
  const maxNumber = isLoto ? 25 : (isMais ? 50 : 60);
  const targetQuantity = isLoto ? (quantity || 15) : quantity;

  const lottoPrompt = isLoto
    ? `Acesse e analise o histórico oficial da Lotofácil (Caixa Econômica Federal). O jogo é composto por 25 números (01 a 25), e cada aposta mínima tem 15 números.
    ${drawContext}
    ${logicContext}
    Tarefa especial para LOTOFÁCIL:
    1. Considere a distribuição histórica de todos os concursos da Lotofácil: Moldura (9 a 11 números), Pares e Ímpares (7P/8I ou 8P/7I), Soma entre 180 e 220, e Repetição de 8 a 10 dezenas do concurso anterior.
    2. Integre sempre o último resultado oficial nas análises para gerar esta combinação futura (análise de atraso e dezenas repetidas do Concurso #${latestDraw?.contestNumber || 3350}).
    3. Gere exatamente ${targetQuantity} números únicos (no intervalo estrito de 1 a 25).
    4. No campo 'reasoning', explique detalhadamente a estratégia estatística citando a moldura, paridade, soma e repetidas do concurso anterior.`
    : `Acesse e analise a totalidade de todos os resultados da ${isMais ? '+Milionária' : 'Mega Sena'} realizados até hoje pela Caixa Econômica Federal.
    ${drawContext}
    ${logicContext}
    Tarefa especial:
    1. Considere a distribuição histórica acumulada: as dezenas mais sorteadas, a média de soma e a Zona de Ouro.
    2. Integre sempre o último resultado oficial nas análises para gerar esta combinação futura.
    3. Gere ${targetQuantity} números únicos (1-${maxNumber}) respeitando as regras selecionadas.
    4. No campo 'reasoning', explique detalhadamente a estratégia estatística.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: lottoPrompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          numbers: {
            type: Type.ARRAY,
            items: { type: Type.INTEGER },
            description: `Array de ${targetQuantity} números sugeridos (1-${maxNumber}).`
          },
          reasoning: {
            type: Type.STRING,
            description: "Análise técnica detalhada citando a soma, paridade e influência do último concurso oficial."
          }
        },
        required: ["numbers", "reasoning"]
      }
    }
  });

  try {
    const data = JSON.parse(response.text || '{}');
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const groundingUrls = groundingChunks?.map((chunk: any) => {
      if (chunk.web) return { uri: chunk.web.uri, title: chunk.web.title };
      return null;
    }).filter(Boolean) || [];

    const rawNums: number[] = Array.isArray(data.numbers) 
      ? (data.numbers as any[]).map(Number).filter((n: number) => !isNaN(n) && n >= 1 && n <= maxNumber) 
      : [];
    const validNums: number[] = Array.from(new Set(rawNums)).slice(0, targetQuantity);

    if (validNums.length === targetQuantity) {
      return {
        numbers: validNums.sort((a: number, b: number) => a - b),
        reasoning: data.reasoning,
        groundingUrls
      };
    }
    throw new Error("Contagem de números do modelo não confere");
  } catch (error) {
    console.error("Erro no Gemini, aplicando motor de regras estatísticas local", error);
    if (isLoto) {
      const generated = generateLotofacilWithRules(targetQuantity, logic, latestDraw?.numbers);
      return {
        numbers: generated.numbers,
        reasoning: `${generated.reasoning} (Gerado pelo motor Lotofácil com 15 números integrando o Concurso #${latestDraw?.contestNumber || 3350}).`,
        groundingUrls: []
      };
    }

    if (isMais) {
      const generated = generateMaisMilionariaGameWithRules(targetQuantity, logic, latestDraw?.numbers);
      return {
        numbers: generated.numbers,
        reasoning: `${generated.reasoning} (Gerado pelo motor +Milionária integrando o Concurso #${latestDraw?.contestNumber || 401}).`,
        groundingUrls: []
      };
    }

    const generated = generateGameWithRules(
      targetQuantity, 
      logic || {
        repeat1to2: false,
        balanceEvenOdd: false,
        sum160to240: false,
        spreadDistribution: false,
        concentrate20to50: false,
        max2Consecutive: false,
        max2IdenticalEndings: false
      },
      latestDraw?.numbers
    );

    return {
      numbers: generated.numbers,
      reasoning: `${generated.reasoning} (Gerado com precisão matemática pelo motor estatístico integrando o Concurso #${latestDraw?.contestNumber || 3069}).`,
      groundingUrls: []
    };
  }
};

export const generateBatchLuckyNumbersWithAI = async (
  logic?: GeneratorLogic,
  latestDraw?: OfficialDrawResult,
  lottery: LotteryType = 'megasena'
): Promise<AIBatchResponse> => {
  const isLoto = lottery === 'lotofacil';
  const isMais = lottery === 'maismilionaria';
  const maxNumber = isLoto ? 25 : (isMais ? 50 : 60);
  const targetQuantity = isLoto ? 15 : 6;

  const ai = getAIClient();
  const logicContext = buildLogicContext(logic);
  const drawContext = buildDrawContext(latestDraw, logic, lottery);
  
  const batchPrompt = isLoto
    ? `Acesse e analise o histórico oficial completo da Lotofácil (Caixa Econômica Federal). O jogo é de 25 dezenas (1-25) com apostas de 15 dezenas.
    ${drawContext}
    ${logicContext}
    Instruções de Probabilidade e Estatística para a Lotofácil:
    1. Baseie-se no histórico oficial de mais de 3.350 concursos: Moldura (9 a 11), Pares/Ímpares (7/8 ou 8/7), Soma entre 180 e 220 e Repetidas (8 a 10).
    2. Gere 5 jogos distintos de exatamente 15 dezenas únicas cada entre 1 e 25.
    3. Cada jogo deve ter um reasoning curto justificando sua inclusão baseada nas regras selecionadas e na influência do último concurso oficial.`
    : `Acesse e analise o histórico oficial completo de todos os resultados da ${isMais ? '+Milionária' : 'Mega Sena'} realizados pela Caixa.
    ${drawContext}
    ${logicContext}
    Instruções de Probabilidade e Estatística:
    1. Baseie-se na distribuição histórica de todos os concursos.
    2. Gere 5 jogos distintos de 6 dezenas aplicando as regras obrigatórias.
    3. Cada jogo deve ter um reasoning curto justificando sua inclusão.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: batchPrompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          games: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                numbers: { type: Type.ARRAY, items: { type: Type.INTEGER } },
                reasoning: { type: Type.STRING }
              },
              required: ["numbers", "reasoning"]
            }
          }
        },
        required: ["games"]
      }
    }
  });

  try {
    const data = JSON.parse(response.text || '{}');
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const groundingUrls = groundingChunks?.map((chunk: any) => {
      if (chunk.web) return { uri: chunk.web.uri, title: chunk.web.title };
      return null;
    }).filter(Boolean) || [];

    const games = data.games.map((g: any) => {
      const rawNums = Array.isArray(g.numbers) ? g.numbers.filter((n: number) => n >= 1 && n <= maxNumber) : [];
      const valid = Array.from(new Set(rawNums)).slice(0, targetQuantity);
      return {
        numbers: valid.sort((a: number, b: number) => a - b),
        reasoning: g.reasoning
      };
    }).filter((g: any) => g.numbers.length === targetQuantity);

    if (games.length >= 3) {
      return {
        games,
        groundingUrls
      };
    }
    throw new Error("Poucos jogos válidos gerados pelo modelo");
  } catch (error) {
    console.error("Erro no Gemini Batch, gerando via motor local de regras", error);
    const games = Array.from({ length: 5 }, () => {
      if (isLoto) {
        const generated = generateLotofacilWithRules(15, logic, latestDraw?.numbers);
        return {
          numbers: generated.numbers,
          reasoning: generated.reasoning
        };
      }
      if (isMais) {
        const generated = generateMaisMilionariaGameWithRules(6, logic, latestDraw?.numbers);
        return {
          numbers: generated.numbers,
          reasoning: generated.reasoning
        };
      }
      const generated = generateGameWithRules(
        6, 
        logic || {
          repeat1to2: false,
          balanceEvenOdd: false,
          sum160to240: false,
          spreadDistribution: false,
          concentrate20to50: false,
          max2Consecutive: false,
          max2IdenticalEndings: false
        },
        latestDraw?.numbers
      );
      return {
        numbers: generated.numbers,
        reasoning: generated.reasoning
      };
    });

    return {
      games,
      groundingUrls: []
    };
  }
};

export const analyzeBetHistory = async (numbers: number[]): Promise<AnalysisResult> => {
  const ai = getAIClient();
  const numbersStr = numbers.join(', ');

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Verifique se a combinação [${numbersStr}] já premiou na Mega Sena usando https://asloterias.com.br/todos-resultados-mega-sena. 
    Calcule a soma (${numbers.reduce((a, b) => a + b, 0)}) e informe se ela está no sub-intervalo de maior percentual de vitórias (Zona de Ouro) da história da loteria.`,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          hasSena: { type: Type.BOOLEAN },
          hasQuina: { type: Type.BOOLEAN },
          hasQuadra: { type: Type.BOOLEAN },
          hasTerno: { type: Type.BOOLEAN },
          matchCounts: {
            type: Type.OBJECT,
            properties: {
              sena: { type: Type.INTEGER },
              quina: { type: Type.INTEGER },
              quadra: { type: Type.INTEGER },
              terno: { type: Type.INTEGER }
            },
            required: ["sena", "quina", "quadra", "terno"]
          },
          details: { type: Type.STRING }
        },
        required: ["hasSena", "hasQuina", "hasQuadra", "hasTerno", "matchCounts", "details"]
      }
    }
  });

  try {
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Erro na análise", error);
    throw error;
  }
};
