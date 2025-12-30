/**
 * WebSub Callback エンドポイント
 * GET: 購読検証
 * POST: 通知受信
 */

import { WebSubService, type WebSubNotification } from '../../../services/websubService.js';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const websubService = new WebSubService();

export default async function handler(req: Request): Promise<Response> {
  const headers = {
    'Content-Type': 'text/plain',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  try {
    // GET: 購読検証
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const mode = url.searchParams.get('hub.mode');
      const topic = url.searchParams.get('hub.topic');
      const challenge = url.searchParams.get('hub.challenge');
      const leaseSeconds = url.searchParams.get('hub.lease_seconds');

      if (!mode || !topic || !challenge) {
        return new Response('Missing required parameters', { status: 400, headers });
      }

      // 購読検証
      const challengeResponse = websubService.verifySubscription(mode, topic, challenge);
      
      if (!challengeResponse) {
        return new Response('Invalid subscription mode', { status: 400, headers });
      }

      // 購読情報を保存または更新
      if (mode === 'subscribe' && leaseSeconds) {
        const channelId = extractChannelIdFromTopic(topic);
        if (channelId) {
          await saveSubscription(channelId, topic, req.url.split('?')[0], parseInt(leaseSeconds));
        }
      }

      // challengeを返す
      return new Response(challengeResponse, { status: 200, headers });
    }

    // POST: 通知受信
    if (req.method === 'POST') {
      // ペイロードサイズ制限（1MB）
      const contentLength = req.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > 1024 * 1024) {
        return new Response('Payload too large', { status: 413, headers });
      }

      const xml = await req.text();

      // Atom XMLをパース
      const notifications = await websubService.parseAtomFeed(xml);

      // 各通知を処理
      for (const notification of notifications) {
        await processNotification(notification);
      }

      return new Response('OK', { status: 200, headers });
    }

    return new Response('Method not allowed', { status: 405, headers });
  } catch (error: any) {
    console.error('WebSub callback error:', error);
    return new Response(
      `Error: ${error.message || 'Internal server error'}`,
      { status: 500, headers }
    );
  }
}

/**
 * topic URLからチャンネルIDを抽出
 */
function extractChannelIdFromTopic(topic: string): string | null {
  const match = topic.match(/channel_id=([^&]+)/);
  return match ? match[1] : null;
}

/**
 * 購読情報を保存
 */
async function saveSubscription(
  channelId: string,
  topicUrl: string,
  callbackUrl: string,
  leaseSeconds: number
): Promise<void> {
  try {
    // channelsテーブルからchannel_idで検索
    const { data: channel } = await supabase
      .from('channels')
      .select('id')
      .eq('channel_id', channelId)
      .maybeSingle();

    if (!channel) {
      console.warn('Channel not found:', channelId);
      return;
    }

    const leaseExpiresAt = new Date(Date.now() + leaseSeconds * 1000);

    // subscriptionsテーブルに保存または更新
    const { error } = await supabase
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

    if (error) {
      console.error('Save subscription error:', error);
    }
  } catch (error) {
    console.error('saveSubscription error:', error);
  }
}

/**
 * WebSub通知を処理
 */
async function processNotification(notification: WebSubNotification): Promise<void> {
  try {
    // channelsテーブルからchannel_idで検索
    const { data: channel } = await supabase
      .from('channels')
      .select('id')
      .eq('channel_id', notification.channelId)
      .maybeSingle();

    if (!channel) {
      console.warn('Channel not found:', notification.channelId);
      return;
    }

    // 重複チェック（video_idで）
    const { data: existingVideo } = await supabase
      .from('videos')
      .select('video_id')
      .eq('video_id', notification.videoId)
      .maybeSingle();

    // 新規動画の場合のみ処理
    if (!existingVideo) {
      // videosテーブルに保存（upsert）
      const { error: videoError } = await supabase
        .from('videos')
        .upsert({
          video_id: notification.videoId,
          channel_id: channel.id,
          published_at: notification.rawPayload.published || new Date().toISOString(),
          title: notification.rawPayload.title || 'Untitled',
          description: notification.rawPayload.description || '',
          source: 'websub',
          event_type: notification.eventType,
          raw_payload: notification.rawPayload
        }, {
          onConflict: 'video_id'
        });

      if (videoError) {
        console.error('Save video error:', videoError);
        return;
      }

      // 要約ジョブを投入（新規動画のみ）
      if (notification.eventType === 'new_or_update') {
        await createVideoJob(notification.videoId);
      }
    } else {
      // 既存動画の更新
      const { error: updateError } = await supabase
        .from('videos')
        .update({
          event_type: notification.eventType,
          raw_payload: notification.rawPayload,
          updated_at: new Date().toISOString()
        })
        .eq('video_id', notification.videoId);

      if (updateError) {
        console.error('Update video error:', updateError);
      }
    }
  } catch (error) {
    console.error('processNotification error:', error);
  }
}

/**
 * 要約ジョブを作成
 */
async function createVideoJob(videoId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('video_jobs')
      .insert({
        id: `job_${videoId}_${Date.now()}`,
        video_id: videoId,
        status: 'pending'
      });

    if (error) {
      console.error('Create video job error:', error);
    }
  } catch (error) {
    console.error('createVideoJob error:', error);
  }
}


