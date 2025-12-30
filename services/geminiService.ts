
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { VideoSummaryWithContent, TrackedChannel } from "../types";

export class GeminiService {
  private ai: GoogleGenAI | null = null;

  constructor() {
    let apiKey = '';
    
    // Vercel Serverless Functionsでは process.env を使用
    // クライアント側では import.meta.env を使用
    if (typeof process !== 'undefined' && process.env) {
      // Serverless Functions環境
      apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
    } else if (typeof import.meta !== 'undefined') {
      // クライアント側環境
      const env = (import.meta as any).env || {};
      if (env.DEV) {
        console.log('🔍 [デバッグ] import.meta.env の内容:', {
          DEV: env.DEV,
          MODE: env.MODE,
          VITE_GEMINI_API_KEY: env.VITE_GEMINI_API_KEY ? `${env.VITE_GEMINI_API_KEY.substring(0, 20)}...` : '未設定',
          GEMINI_API_KEY: env.GEMINI_API_KEY ? `${env.GEMINI_API_KEY.substring(0, 20)}...` : '未設定',
          allKeys: Object.keys(env).filter(key => key.startsWith('VITE_'))
        });
      }
      apiKey = env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || '';
      
      // デバッグ用ログ（開発環境のみ）
      if (env.DEV) {
        console.log('🔍 Gemini APIキーチェック:', apiKey ? `${apiKey.substring(0, 20)}...` : '未設定');
      }
    }
    
    if (apiKey && apiKey !== 'your_gemini_api_key_here' && apiKey.length > 10) {
      try {
        this.ai = new GoogleGenAI({ apiKey });
        if (typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV) {
          console.log('✅ Gemini APIキーが正常に設定されました');
        }
      } catch (error) {
        console.warn('Gemini APIキーの初期化に失敗しました:', error);
      }
    } else {
      console.warn('⚠️ Gemini APIキーが設定されていません。スキャン機能は使用できません。');
      console.warn('   .env.local ファイルに以下を設定してください:');
      console.warn('   VITE_GEMINI_API_KEY=your_gemini_api_key');
      console.warn('   設定後、開発サーバーを再起動してください（Ctrl+C で停止 → npm run dev で再起動）');
    }
  }

  private ensureApiKey(): void {
    if (!this.ai) {
      throw new Error('Gemini APIキーが設定されていません。.env.local ファイルに VITE_GEMINI_API_KEY を設定してください。');
    }
  }

  /**
   * Searches for the latest videos of a channel and summarizes them.
   * Uses Google Search grounding to find real-time data.
   * Returns VideoSummaryWithContent which includes summary and keyPoints.
   */
  async scanChannel(channel: TrackedChannel): Promise<VideoSummaryWithContent[]> {
    this.ensureApiKey();
    if (!this.ai) throw new Error('Gemini APIが初期化されていません');
    
    const prompt = `
      YouTubeチャンネル「${channel.name}」または「${channel.handle}」の最新の動画3件を見つけてください。
      それぞれの動画について、以下の情報を日本語で取得し、非常に詳細な要約を作成してください。

      【重要】この要約は、動画を見なくても内容を完全に理解できるレベルの詳細さが必要です。

      1. 動画のタイトル
         - YouTubeに表示されているタイトルをそのまま、一字一句正確に取得してください
         - タイトルを加工したり、要約したり、省略したりしないでください
         - タイトルは完全一致で取得してください（例: 「【銘柄勉強会】PER8倍の成長企業!? 今後の成長戦略についてCFOに直接聞いてみた! (イー・ギャランティ)」をそのまま取得）
      2. 公開日（現在は2025年です。正確な日付を取得してください）
      3. 動画のURL（必ず https://www.youtube.com/watch?v=VIDEO_ID の形式で返してください。VIDEO_IDは11文字の英数字です）
      4. 詳細な要約（2000-3000文字程度）
         - 動画の全体像と目的を説明
         - 動画内で言及されているすべての具体的な情報を含める
         - 株式動画の場合: 紹介されている全銘柄、銘柄コード、価格、推奨理由、リスクなどをすべて記載
         - 技術動画の場合: コード例、手順、設定方法などをすべて記載
         - レビュー動画の場合: 製品名、特徴、価格、メリット・デメリットなどをすべて記載
         - 解説動画の場合: 登場人物、場所、時系列、詳細な説明などをすべて記載
         - 数値、データ、統計情報などは正確に記載
         - 動画内で言及された重要な引用や発言も含める
      5. 重要なポイント5-10個（各ポイントは具体的で詳細に記述）
         - 動画の核心となる内容を箇条書きで整理
         - 各ポイントは50-100文字程度で詳しく説明

      【要約の品質基準】
      - YouTubeを見なくても内容を完全に理解できるレベル
      - 動画内で言及されたすべての重要な情報を含める
      - 具体的な数値、名前、日付などを正確に記載
      - 株式動画の場合は全銘柄を漏れなく記載
      - 技術動画の場合は手順やコードを完全に記載

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
    this.ensureApiKey();
    if (!this.ai) throw new Error('Gemini APIが初期化されていません');
    
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
    } catch (error: any) {
      console.error("Find Channel Error:", error);
      
      // 429エラー（クォータ超過）の場合の詳細なエラーメッセージ
      if (error?.error?.code === 429 || error?.status === 429) {
        throw new Error(
          'Gemini APIのクォータを超過しました。しばらく待ってから再度お試しください。\n' +
          '詳細: https://ai.google.dev/gemini-api/docs/rate-limits'
        );
      }
      
      // 400エラー（APIキー無効）の場合
      if (error?.error?.code === 400 || error?.status === 400) {
        throw new Error('Gemini APIキーが無効です。APIキーを確認してください。');
      }
      
      return null;
    }
  }

  /**
   * VIDEO_IDまたはURLを指定して要約を生成
   * YouTube Data API v3で取得した正確なタイトルを使用
   */
  async summarizeVideo(videoUrl: string, title: string): Promise<{
    summary: string;
    keyPoints: string[];
  }> {
    this.ensureApiKey();
    if (!this.ai) throw new Error('Gemini APIが初期化されていません');
    
    const prompt = `
      以下のYouTube動画について、非常に詳細な要約を作成してください。

      【動画情報】
      - タイトル: ${title}
      - URL: ${videoUrl}

      【重要】この要約は、動画を見なくても内容を完全に理解できるレベルの詳細さが必要です。

      1. 詳細な要約（2000-3000文字程度）
         - 動画の全体像と目的を説明
         - 動画内で言及されているすべての具体的な情報を含める
         - 株式動画の場合: 紹介されている全銘柄、銘柄コード、価格、推奨理由、リスクなどをすべて記載
         - 技術動画の場合: コード例、手順、設定方法などをすべて記載
         - レビュー動画の場合: 製品名、特徴、価格、メリット・デメリットなどをすべて記載
         - 解説動画の場合: 登場人物、場所、時系列、詳細な説明などをすべて記載
         - 数値、データ、統計情報などは正確に記載
         - 動画内で言及された重要な引用や発言も含める
      2. 重要なポイント5-10個（各ポイントは具体的で詳細に記述）
         - 動画の核心となる内容を箇条書きで整理
         - 各ポイントは50-100文字程度で詳しく説明

      【要約の品質基準】
      - YouTubeを見なくても内容を完全に理解できるレベル
      - 動画内で言及されたすべての重要な情報を含める
      - 具体的な数値、名前、日付などを正確に記載
      - 株式動画の場合は全銘柄を漏れなく記載
      - 技術動画の場合は手順やコードを完全に記載

      回答は必ず有効なJSON形式で返してください。
    `;

    try {
      const response: GenerateContentResponse = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              keyPoints: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["summary", "keyPoints"]
          }
        },
      });

      const data = JSON.parse(response.text || "{}");
      
      return {
        summary: data.summary || '',
        keyPoints: data.keyPoints || []
      };
    } catch (error) {
      console.error("Gemini Summarize Error:", error);
      throw new Error("動画の要約中にエラーが発生しました。");
    }
  }
}
