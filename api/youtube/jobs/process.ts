/**
 * 要約ジョブ処理エンドポイント
 * 保留中のジョブを処理
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Gemini API設定
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';

// VideoJob型定義
interface VideoJob {
  id: string;
  video_id: string;
  status: 'pending' | 'processing' | 'done' | 'failed';
  started_at?: string;
  finished_at?: string;
  error?: string;
  summary_text?: string;
  key_points?: string[];
  doc_url?: string;
  doc_id?: string;
  notified_at?: string;
}

/**
 * APIキー認証を検証
 * Vercel Cronジョブからの呼び出しも許可
 */
function verifyApiKey(req: VercelRequest): boolean {
  // Vercel Cronジョブからの呼び出しを許可
  const isCronRequest = req.headers['x-vercel-cron'] === '1';
  if (isCronRequest) {
    return true;
  }
  
  const apiKey = req.headers['x-api-key'] as string | undefined;
  const validApiKey = process.env.API_KEY;
  
  // 環境変数が設定されていない場合は認証をスキップ（開発環境用）
  if (!validApiKey) {
    console.warn('⚠️ API_KEY環境変数が設定されていません。認証をスキップします。');
    return true;
  }
  
  return apiKey === validApiKey;
}

/**
 * 保留中のジョブを取得
 */
async function getPendingJobs(limit: number = 10): Promise<VideoJob[]> {
  try {
    const { data, error } = await supabase
      .from('video_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      throw error;
    }

    return (data || []) as VideoJob[];
  } catch (error) {
    console.error('getPendingJobs error:', error);
    return [];
  }
}

/**
 * VIDEO_IDまたはURLを指定して要約を生成
 */
async function summarizeVideo(videoUrl: string, title: string): Promise<{
  summary: string;
  keyPoints: string[];
}> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini APIキーが設定されていません。');
  }

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  
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
    const response: GenerateContentResponse = await ai.models.generateContent({
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
        },
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

/**
 * ジョブを処理（要約生成 → Google Docs作成 → 通知）
 */
async function processJob(jobId: string): Promise<void> {
  try {
    // ジョブを取得
    const { data: job, error: jobError } = await supabase
      .from('video_jobs')
      .select('*')
      .eq('id', jobId)
      .maybeSingle();

    if (jobError || !job) {
      throw new Error('Job not found');
    }

    // ステータスをprocessingに更新
    await supabase
      .from('video_jobs')
      .update({
        status: 'processing',
        started_at: new Date().toISOString()
      })
      .eq('id', jobId);

    // 動画情報を取得
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('*, channels!inner(name, channel_title)')
      .eq('video_id', job.video_id)
      .maybeSingle();

    if (videoError || !video) {
      throw new Error('Video not found');
    }

    const videoUrl = `https://www.youtube.com/watch?v=${job.video_id}`;

    // Gemini APIで要約生成
    const { summary, keyPoints } = await summarizeVideo(
      videoUrl,
      video.title
    );

    // Google Docs作成（現在はスキップ - 認証が必要なため）
    let docUrl = '';
    let docId = '';

    // ジョブを完了に更新
    await supabase
      .from('video_jobs')
      .update({
        status: 'done',
        finished_at: new Date().toISOString(),
        summary_text: summary,
        key_points: keyPoints,
        doc_url: docUrl,
        doc_id: docId
      })
      .eq('id', jobId);

    // 通知送信（実装は後で追加）
    // await sendNotification(job, video, summary, docUrl);

  } catch (error: any) {
    console.error('processJob error:', error);

    // ジョブを失敗に更新
    await supabase
      .from('video_jobs')
      .update({
        status: 'failed',
        finished_at: new Date().toISOString(),
        error: error.message || 'Unknown error'
      })
      .eq('id', jobId);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // APIキー認証
  if (!verifyApiKey(req)) {
    return res.status(401).json({ error: 'Unauthorized. Invalid or missing API key.' });
  }

  try {
    const body = req.body as { limit?: number };
    const limit = body.limit || 10; // 一度に処理するジョブ数

    // 保留中のジョブを取得
    const pendingJobs = await getPendingJobs(limit);

    if (pendingJobs.length === 0) {
      return res.status(200).json({ message: 'No pending jobs', processed: 0 });
    }

    const results = {
      processed: 0,
      success: 0,
      errors: [] as string[]
    };

    // 各ジョブを処理
    for (const job of pendingJobs) {
      try {
        await processJob(job.id);
        results.success++;
        results.processed++;
      } catch (error: any) {
        results.errors.push(`Job ${job.id}: ${error.message}`);
        results.processed++;
      }
    }

    return res.status(200).json(results);
  } catch (error: any) {
    console.error('Process jobs error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
