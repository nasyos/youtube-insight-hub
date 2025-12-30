/**
 * 要約ジョブ処理エンドポイント
 * 保留中のジョブを処理
 */

import { VideoJobService } from '../../../services/videoJobService';
import { GeminiService } from '../../../services/geminiService';
import { GoogleApiService } from '../../../services/googleApiService';
import { YouTubeService } from '../../../services/youtubeService';

const geminiService = new GeminiService();
const youtubeService = new YouTubeService();
// GoogleApiServiceは認証が必要なため、nullを許可
const googleApiService: GoogleApiService | null = null; // 実際の使用時は認証後に初期化

const jobService = new VideoJobService(
  geminiService,
  googleApiService,
  youtubeService
);

export default async function handler(req: Request): Promise<Response> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const limit = body.limit || 10; // 一度に処理するジョブ数

    // 保留中のジョブを取得
    const pendingJobs = await jobService.getPendingJobs(limit);

    if (pendingJobs.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending jobs', processed: 0 }),
        { status: 200, headers }
      );
    }

    const results = {
      processed: 0,
      success: 0,
      errors: [] as string[]
    };

    // 各ジョブを処理
    for (const job of pendingJobs) {
      try {
        await jobService.processJob(job.id);
        results.success++;
        results.processed++;
      } catch (error: any) {
        results.errors.push(`Job ${job.id}: ${error.message}`);
        results.processed++;
      }
    }

    return new Response(
      JSON.stringify(results),
      { status: 200, headers }
    );
  } catch (error: any) {
    console.error('Process jobs error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers }
    );
  }
}

