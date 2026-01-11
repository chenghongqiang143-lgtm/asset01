
import { GoogleGenAI, Type } from "@google/genai";
import { Asset, AIInsight } from "../types";

export const getAIInsights = async (assets: Asset[]): Promise<AIInsight> => {
  // Fixed: Always use exactly the standard initialization pattern with process.env.API_KEY
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const assetSummary = assets.map(a => `${a.name}(${a.category}): ¥${a.value}`).join(', ');
  
  const prompt = `作为一个专业的理财分析师，请根据以下资产配置情况提供简短的中文分析和建议。
  资产清单：${assetSummary}
  
  请返回 JSON 格式数据。`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: '资产配置概括' },
            suggestions: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: '具体的理财建议列表' 
            },
            riskLevel: { type: Type.STRING, description: '整体风险等级：低、中、高' }
          },
          required: ['summary', 'suggestions', 'riskLevel']
        }
      }
    });

    // Fixed: Accessed .text property directly (not as a method)
    return JSON.parse(response.text || '{}') as AIInsight;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      summary: "暂时无法获取AI分析，请检查网络或API配置。",
      suggestions: ["保持理性的投资心态", "定期回顾资产状况"],
      riskLevel: '中'
    };
  }
};
