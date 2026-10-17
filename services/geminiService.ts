
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
  if (logic.sum160to240) rules.push("- Soma total das dezenas sorteadas deve ficar entre 160 e 240");
  if (logic.spreadDistribution) rules.push("- Distribuição espalhada pelos quadrantes da cartela (evitar aglomeração)");
  if (logic.concentrate20to50) rules.push("- Concentração maior de escolhas no intervalo entre 20 e 50");
  if (logic.max2Consecutive) rules.push("- No máximo 2 números em sequência consecutiva (ex: 12, 13)");
  if (logic.max2IdenticalEndings) rules.push("- No máximo 2 finais iguais (ex: no máximo duas dezenas terminadas em 4)");
  
  if (rules.length === 0) return "";
  
  return `\nREGRAS OBRIGATÓRIAS (Aplicar as seguintes lógicas selecionadas):\n${rules.join('\n')}\n`;
};

export const generateLuckyNumbersWithAI = async (quantity: number = 6, logic?: GeneratorLogic): Promise<AIRootResponse> => {
  const ai = getAIClient();
  const logicContext = buildLogicContext(logic);
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Acesse e analise as estatísticas mais recentes da Mega Sena no site https://www.numeromania.com.br/sena.html e use seus conhecimentos sobre o histórico de sorteios.
    ${logicContext}
    Tarefa especial:
    1. Dentro da faixa de soma histórica (150 a 210, ou 160 a 240 se exigido pelas regras), identifique qual sub-intervalo específico possui o MAIOR PERCENTUAL de frequência de sorteios premiados.
    2. Gere ${quantity} números únicos (1-60) respeitando TODAS as REGRAS OBRIGATÓRIAS listadas acima, se existirem.
    3. Garantir que a soma caia na faixa estatisticamente mais provável ou na regra especificada.
    4. No campo 'reasoning', explique brevemente as regras aplicadas e a lógica estatística.`,
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
    contents: `Acesse estatísticas da Mega Sena em https://www.numeromania.com.br/sena.html.
    ${logicContext}
    Instruções de Probabilidade:
    1. Analise a distribuição de somas dos sorteios. Identifique a sub-faixa de maior densidade (150-240, ajustado se houver regra de 160-240).
    2. Gere 5 jogos distintos de 6 dezenas aplicando as REGRAS OBRIGATÓRIAS.
    3. Garanta que cada jogo siga a matriz de configurações do usuário.
    4. Cada jogo deve ter um reasoning curto justificando sua inclusão baseada nas regras selecionadas.`,
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
