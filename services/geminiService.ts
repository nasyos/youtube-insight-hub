
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { VideoSummary, TrackedChannel } from "../types";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
  }

  /**
   * Searches for the latest videos of a channel and summarizes them.
   * Uses Google Search grounding to find real-time data.
   */
  async scanChannel(channel: TrackedChannel): Promise<VideoSummary[]> {
    const prompt = `
      YouTubeチャンネル「${channel.name}」または「${channel.handle}」の最新の動画3件を見つけてください。
      それぞれの動画について、以下の情報を日本語で取得し、要約してください。
      1. 動画のタイトル
      2. 公開日
      3. 動画のURL
      4. 内容の要約（200文字程度）
      5. 重要なポイント3つ

      回答は必ず有効なJSON配列形式で返してください。
    `;

    try {
      const response: GenerateContentResponse = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                publishedAt: { type: Type.STRING },
                url: { type: Type.STRING },
                summary: { type: Type.STRING },
                keyPoints: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: ["title", "publishedAt", "url", "summary", "keyPoints"]
            }
          }
        },
      });

      const data = JSON.parse(response.text || "[]");
      
      return data.map((item: any, index: number) => ({
        id: `${channel.id}-${Date.now()}-${index}`,
        title: item.title,
        publishedAt: item.publishedAt,
        thumbnailUrl: `https://picsum.photos/seed/${item.title}/400/225`,
        summary: item.summary,
        keyPoints: item.keyPoints,
        channelId: channel.id,
        channelTitle: channel.name,
        url: item.url
      }));
    } catch (error) {
      console.error("Gemini Scan Error:", error);
      throw new Error("動画の取得または要約中にエラーが発生しました。");
    }
  }

  /**
   * Fetches basic channel information using search.
   */
  async findChannel(query: string): Promise<TrackedChannel | null> {
    const prompt = `YouTubeチャンネル「${query}」の詳細情報を探してください。チャンネル名、ハンドル名(@から始まるID)、アイコン用のURLを見つけてください。`;
    
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              handle: { type: Type.STRING },
              thumbnailUrl: { type: Type.STRING }
            },
            required: ["name", "handle"]
          }
        }
      });

      const data = JSON.parse(response.text || "{}");
      if (!data.name) return null;

      return {
        id: Math.random().toString(36).substr(2, 9),
        name: data.name,
        handle: data.handle,
        lastChecked: new Date().toISOString(),
        thumbnailUrl: data.thumbnailUrl || `https://picsum.photos/seed/${data.name}/150/150`
      };
    } catch (error) {
      console.error("Find Channel Error:", error);
      return null;
    }
  }
}
