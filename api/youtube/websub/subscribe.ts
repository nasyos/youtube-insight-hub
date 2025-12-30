/**
 * WebSub購読エンドポイント
 * チャンネルをWebSub Hubに購読
 */

import { YouTubeService } from '../../../services/youtubeService';
import { WebSubService } from '../../../services/websubService';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const youtubeService = new YouTubeService();
const websubService = new WebSubService();

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
    const body = await req.json();
    const channelId = body.channelId; // YouTubeチャンネルID（UCxxxxx）

    if (!channelId) {
      return new Response(
        JSON.stringify({ error: 'channelId is required' }),
        { status: 400, headers }
      );
    }

    // チャンネル情報を取得
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('id, channel_id, name')
      .eq('channel_id', channelId)
      .maybeSingle();

    if (channelError || !channel) {
      return new Response(
        JSON.stringify({ error: 'Channel not found' }),
        { status: 404, headers }
      );
    }

    // WebSub topic URLを生成
    const topicUrl = websubService.generateTopicUrl(channelId);

    // WebSub callback URLを生成
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : process.env.CALLBACK_BASE_URL || 'http://localhost:5173';
    const callbackUrl = websubService.generateCallbackUrl(baseUrl);

    // WebSub Hubに購読リクエスト送信
    const leaseSeconds = 432000; // 5日間
    const success = await youtubeService.subscribeToWebSub(topicUrl, callbackUrl, leaseSeconds);

    if (!success) {
      return new Response(
        JSON.stringify({ error: 'Failed to subscribe to WebSub' }),
        { status: 500, headers }
      );
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
      return new Response(
        JSON.stringify({ error: 'Failed to save subscription' }),
        { status: 500, headers }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        channelId,
        topicUrl,
        callbackUrl,
        leaseExpiresAt: leaseExpiresAt.toISOString()
      }),
      { status: 200, headers }
    );
  } catch (error: any) {
    console.error('Subscribe error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers }
    );
  }
}

