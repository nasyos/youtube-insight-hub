/**
 * WebSub購読エンドポイント
 * チャンネルをWebSub Hubに購読
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
    const channelId = body.channelId; // YouTubeチャンネルID（UCxxxxx）

    if (!channelId) {
      return res.status(400).json({ error: 'channelId is required' });
    }

    // チャンネル情報を取得
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('id, channel_id, name')
      .eq('channel_id', channelId)
      .maybeSingle();

    if (channelError || !channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    // WebSub topic URLを生成
    const topicUrl = generateTopicUrl(channelId);

    // WebSub callback URLを生成
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['host'] || 'localhost';
    const baseUrl = `${protocol}://${host}`;
    const callbackUrl = generateCallbackUrl(baseUrl);

    // WebSub Hubに購読リクエスト送信
    const leaseSeconds = 432000; // 5日間
    const success = await subscribeToWebSub(topicUrl, callbackUrl, leaseSeconds);

    if (!success) {
      return res.status(500).json({ error: 'Failed to subscribe to WebSub' });
    }

    // 購読情報を保存
    const leaseExpiresAt = new Date(Date.now() + leaseSeconds * 1000);

    const { error: subError } = await supabase
      .from('subscriptions')
      .upsert({
        id: `sub_${channelId}_${Date.now()}`,
        channel_id: channel.id,
        topic_url: topicUrl,
        callback_url: callbackUrl,
        status: 'subscribed',
        lease_expires_at: leaseExpiresAt.toISOString(),
        last_subscribed_at: new Date().toISOString()
      }, {
        onConflict: 'channel_id'
      });

    if (subError) {
      console.error('Save subscription error:', subError);
      return res.status(500).json({ error: 'Failed to save subscription' });
    }

    return res.status(200).json({
      success: true,
      channelId,
      topicUrl,
      callbackUrl,
      leaseExpiresAt: leaseExpiresAt.toISOString()
    });
  } catch (error: any) {
    console.error('Subscribe error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
