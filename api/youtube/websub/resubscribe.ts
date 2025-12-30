/**
 * WebSub再購読エンドポイント
 * 期限切れまたは期限間近の購読を再購読
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
 * WebSub topic URLを生成
 */
function generateTopicUrl(channelId: string): string {
  return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
}

/**
 * WebSub callback URLを生成
 */
function generateCallbackUrl(baseUrl: string): string {
  return `${baseUrl}/api/youtube/websub/callback`;
}

/**
 * WebSub Hubに購読リクエストを送信
 */
async function subscribeToWebSub(topicUrl: string, callbackUrl: string, leaseSeconds: number = 432000): Promise<boolean> {
  try {
    const hubUrl = 'https://pubsubhubbub.appspot.com/subscribe';
    
    const params = new URLSearchParams({
      'hub.mode': 'subscribe',
      'hub.topic': topicUrl,
      'hub.callback': callbackUrl,
      'hub.lease_seconds': leaseSeconds.toString()
    });

    const response = await fetch(hubUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    // 202 Accepted または 204 No Content が正常
    return response.status === 202 || response.status === 204;
  } catch (error) {
    console.error('subscribeToWebSub error:', error);
    return false;
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
    const body = req.body as { channelId?: string };
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
      return res.status(200).json({ message: 'No subscriptions to renew', processed: 0 });
    }

    const results = {
      processed: 0,
      success: 0,
      errors: [] as string[]
    };

    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['host'] || 'localhost';
    const baseUrl = `${protocol}://${host}`;

    // 各購読を再購読
    for (const sub of subscriptions) {
      try {
        const channel = (sub as any).channels;
        const channelId = channel.channel_id;

        // WebSub topic URLを生成
        const topicUrl = generateTopicUrl(channelId);

        // WebSub callback URLを生成
        const callbackUrl = generateCallbackUrl(baseUrl);

        // WebSub Hubに再購読リクエスト送信
        const leaseSeconds = 432000; // 5日間
        const success = await subscribeToWebSub(topicUrl, callbackUrl, leaseSeconds);

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

    return res.status(200).json(results);
  } catch (error: any) {
    console.error('Resubscribe error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
