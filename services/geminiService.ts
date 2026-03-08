
import { GoogleGenAI, Type } from "@google/genai";
import { AIRootResponse, AnalysisResult, AIBatchResponse } from "../types";

const getAIClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
};

export const generateLuckyNumbersWithAI = async (quantity: number = 6): Promise<AIRootResponse> => {
  const ai = getAIClient();
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Acesse e analise as estatísticas mais recentes da Mega Sena no site https://www.numeromania.com.br/sena.html e use seus conhecimentos sobre o histórico de sorteios.
    
    Tarefa especial:
    1. Dentro da faixa de soma histórica (150 a 210), identifique qual sub-intervalo específico (ex: 175-185) possui o MAIOR PERCENTUAL de frequência de sorteios premiados (a "Zona de Ouro").
    2. Gere ${quantity} números únicos (1-60) cuja soma total caia exatamente dentro desse sub-intervalo de maior probabilidade.
    3. No campo 'reasoning', explique qual é esse sub-intervalo de maior percentual encontrado e por que os números gerados são estatisticamente superiores.`,
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
    console.error("Erro no Gemini", error);
    const fallbacks: number[] = [];
    while (fallbacks.length < quantity) {
      const r = Math.floor(Math.random() * 60) + 1;
      if (!fallbacks.includes(r)) fallbacks.push(r);
    }
    return {
      numbers: fallbacks.sort((a, b) => a - b),
      reasoning: "A sorte é um mistério! Tivemos um problema técnico, mas estes números seguem uma distribuição aleatória dentro das médias esperadas.",
      groundingUrls: []
    };
  }
};

export const generateBatchLuckyNumbersWithAI = async (): Promise<AIBatchResponse> => {
  const ai = getAIClient();
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Acesse estatísticas da Mega Sena em https://www.numeromania.com.br/sena.html.
    
    Instruções de Probabilidade:
    1. Analise a distribuição de somas dos sorteios. Identifique a sub-faixa de maior densidade dentro do intervalo 150-210.
    2. Gere 5 jogos distintos de 6 dezenas.
    3. Garanta que cada jogo tenha uma soma total que pertença ao sub-intervalo de maior percentual histórico.
    4. Cada jogo deve ter um reasoning curto justificando sua inclusão na zona de alta probabilidade.`,
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
    console.error("Erro no Gemini Batch", error);
    throw error;
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
