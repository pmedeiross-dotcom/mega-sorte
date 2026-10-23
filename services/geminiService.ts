
import { GoogleGenAI, Type } from "@google/genai";
import { AIRootResponse, AnalysisResult, AIBatchResponse, GeneratorLogic } from "../types";
import { generateGameWithRules } from "../utils/lotteryRules";

const getAIClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
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

export const generateLuckyNumbersWithAI = async (quantity: number = 6, logic?: GeneratorLogic): Promise<AIRootResponse> => {
  const ai = getAIClient();
  const logicContext = buildLogicContext(logic);
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Acesse e analise a totalidade de todos os resultados da Mega Sena realizados até hoje (mais de 3.070 concursos oficiais da Caixa Econômica Federal desde março de 1996) e consulte as estatísticas em https://www.numeromania.com.br/sena.html.
    ${logicContext}
    Tarefa especial:
    1. Considere a distribuição histórica acumulada de todos os concursos: as dezenas mais sorteadas de todos os tempos (10, 53, 05, 37, 27, 33, 38, 17, 30, 42), as menos sorteadas (26, 55, 21, 22), a média histórica de soma (183) e a Zona de Ouro (160 a 240 onde ocorrem 78% dos sorteios).
    2. Gere ${quantity} números únicos (1-60) respeitando TODAS as REGRAS OBRIGATÓRIAS listadas acima, se existirem.
    3. Garantir que a soma caia na faixa estatisticamente mais provável ou na regra especificada.
    4. No campo 'reasoning', explique brevemente as regras aplicadas e a lógica estatística com base nos concursos históricos.`,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          numbers: {
            type: Type.ARRAY,
            items: { type: Type.INTEGER },
            description: "Array de números sugeridos (1-60)."
          },
          reasoning: {
            type: Type.STRING,
            description: "Análise técnica citando o maior percentual dentro da faixa de soma 150-210."
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

    return {
      numbers: data.numbers.sort((a: number, b: number) => a - b),
      reasoning: data.reasoning,
      groundingUrls
    };
  } catch (error) {
    console.error("Erro no Gemini, aplicando motor de regras estatísticas local", error);
    const generated = generateGameWithRules(quantity, logic || {
      repeat1to2: false,
      balanceEvenOdd: false,
      sum160to240: false,
      spreadDistribution: false,
      concentrate20to50: false,
      max2Consecutive: false,
      max2IdenticalEndings: false
    });

    return {
      numbers: generated.numbers,
      reasoning: `${generated.reasoning} (Gerado com precisão matemática pelo motor estatístico).`,
      groundingUrls: []
    };
  }
};

export const generateBatchLuckyNumbersWithAI = async (logic?: GeneratorLogic): Promise<AIBatchResponse> => {
  const ai = getAIClient();
  const logicContext = buildLogicContext(logic);
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Acesse e analise o histórico oficial completo de todos os mais de 3.070 resultados da Mega Sena realizados até hoje na história das loterias da Caixa.
    ${logicContext}
    Instruções de Probabilidade e Estatística:
    1. Baseie-se na distribuição de todos os concursos da história: priorize a Zona de Ouro (somas entre 160 e 240, onde concentram-se 78% dos sorteios) e a frequência histórica das dezenas líderes.
    2. Gere 5 jogos distintos de 6 dezenas aplicando estritamente as REGRAS OBRIGATÓRIAS selecionadas.
    3. Diversifique as combinações mantendo alta densidade probabilística histórica.
    4. Cada jogo deve ter um reasoning curto justificando sua inclusão baseada nas regras selecionadas e no histórico de concursos.`,
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

    return {
      games: data.games.map((g: any) => ({
        numbers: g.numbers.sort((a: number, b: number) => a - b),
        reasoning: g.reasoning
      })),
      groundingUrls
    };
  } catch (error) {
    console.error("Erro no Gemini Batch, gerando via motor local de regras", error);
    const games = Array.from({ length: 5 }, () => {
      const generated = generateGameWithRules(6, logic || {
        repeat1to2: false,
        balanceEvenOdd: false,
        sum160to240: false,
        spreadDistribution: false,
        concentrate20to50: false,
        max2Consecutive: false,
        max2IdenticalEndings: false
      });
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
