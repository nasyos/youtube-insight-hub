/**
 * WebSub再購読エンドポイント
 * 期限切れまたは期限間近の購読を再購読
 */

import { YouTubeService } from '../../../services/youtubeService.js';
import { WebSubService } from '../../../services/websubService.js';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const youtubeService = new YouTubeService();
const websubService = new WebSubService();

/**
 * APIキー認証を検証
 * Vercel Cronジョブからの呼び出しも許可
 */
function verifyApiKey(req: Request): boolean {
  // Vercel Cronジョブからの呼び出しを許可
  const isCronRequest = req.headers.get('X-Vercel-Cron') === '1';
  if (isCronRequest) {
    return true;
  }
  
  const apiKey = req.headers.get('X-API-Key');
  const validApiKey = process.env.API_KEY;
  
  // 環境変数が設定されていない場合は認証をスキップ（開発環境用）
  if (!validApiKey) {
    console.warn('⚠️ API_KEY環境変数が設定されていません。認証をスキップします。');
    return true;
  }
  
  return apiKey === validApiKey;
}

export default async function handler(req: Request): Promise<Response> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
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

  // APIキー認証
  if (!verifyApiKey(req)) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized. Invalid or missing API key.' }),
      { status: 401, headers }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const channelId = body.channelId; // オプション: 指定しない場合は全チャンネル

    // 期限切れまたは期限間近（24時間以内）の購読を取得
    const now = new Date();
    const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    let query = supabase
      .from('subscriptions')
      .select('*, channels!inner(channel_id, name)')
      .eq('status', 'subscribed')
      .lte('lease_expires_at', oneDayLater.toISOString());

    if (channelId) {
      query = query.eq('channels.channel_id', channelId);
    }

    const { data: subscriptions, error: subsError } = await query;

    if (subsError) {
      throw new Error(`Failed to fetch subscriptions: ${subsError.message}`);
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No subscriptions to renew', processed: 0 }),
        { status: 200, headers }
      );
    }

    const results = {
      processed: 0,
      success: 0,
      errors: [] as string[]
    };

    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : process.env.CALLBACK_BASE_URL || 'http://localhost:5173';

    // 各購読を再購読
    for (const sub of subscriptions) {
      try {
        const channel = (sub as any).channels;
        const channelId = channel.channel_id;

        // WebSub topic URLを生成
        const topicUrl = websubService.generateTopicUrl(channelId);

        // WebSub callback URLを生成
        const callbackUrl = websubService.generateCallbackUrl(baseUrl);

        // WebSub Hubに再購読リクエスト送信
        const leaseSeconds = 432000; // 5日間
        const success = await youtubeService.subscribeToWebSub(topicUrl, callbackUrl, leaseSeconds);

        if (!success) {
          results.errors.push(`Failed to resubscribe: ${channel.name}`);
          continue;
        }

        // 購読情報を更新
        const leaseExpiresAt = new Date(Date.now() + leaseSeconds * 1000);

        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            status: 'subscribed',
            lease_expires_at: leaseExpiresAt.toISOString(),
            last_subscribed_at: new Date().toISOString()
          })
          .eq('id', sub.id);

        if (updateError) {
          results.errors.push(`Failed to update subscription: ${channel.name}`);
          continue;
        }

        results.success++;
        results.processed++;
      } catch (error: any) {
        results.errors.push(`Error processing subscription: ${error.message}`);
      }
    }

    return new Response(
      JSON.stringify(results),
      { status: 200, headers }
    );
  } catch (error: any) {
    console.error('Resubscribe error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers }
    );
  }
}

