/**
 * WebSub Callback エンドポイント
 * GET: 購読検証
 * POST: 通知受信
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { DOMParser } from '@xmldom/xmldom';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// WebSubNotification型定義
interface WebSubNotification {
  videoId: string;
  channelId: string;
  eventType: 'new_or_update' | 'deleted';
  rawPayload: any;
}

/**
 * WebSub購読検証（GETリクエスト）
 * hub.challengeを返して購読を検証
 */
function verifySubscription(mode: string, topic: string, challenge: string): string | null {
  // modeがsubscribeまたはunsubscribeの場合のみ処理
  if (mode !== 'subscribe' && mode !== 'unsubscribe') {
    console.warn('Invalid hub.mode:', mode);
    return null;
  }

  // challengeをそのまま返す（検証成功）
  return challenge;
}

/**
 * Atom XMLフィードをパースしてvideoIdとchannelIdを抽出
 */
async function parseAtomFeed(xml: string): Promise<WebSubNotification[]> {
  try {
    // XMLパース（DOMParserを使用）
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');

    // パースエラーチェック
    const parseError = doc.getElementsByTagName('parsererror');
    if (parseError && parseError.length > 0) {
      throw new Error('XML parse error: ' + parseError[0].textContent);
    }

    const notifications: WebSubNotification[] = [];
    const entries = doc.getElementsByTagName('entry');

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      
      // yt:videoIdを取得
      const videoIdElements = entry.getElementsByTagNameNS('http://www.youtube.com/xml/schemas/2015', 'videoId');
      const videoId = videoIdElements.length > 0 ? videoIdElements[0].textContent?.trim() : null;

      // yt:channelIdを取得
      const channelIdElements = entry.getElementsByTagNameNS('http://www.youtube.com/xml/schemas/2015', 'channelId');
      const channelId = channelIdElements.length > 0 ? channelIdElements[0].textContent?.trim() : null;

      if (videoId && channelId) {
        // 削除イベントかどうかを判定（yt:deleted要素の存在で判定）
        const deletedElements = entry.getElementsByTagNameNS('http://www.youtube.com/xml/schemas/2015', 'deleted');
        const eventType = deletedElements.length > 0 ? 'deleted' : 'new_or_update';

        const titleElement = entry.getElementsByTagName('title')[0];
        const publishedElement = entry.getElementsByTagName('published')[0];
        const updatedElement = entry.getElementsByTagName('updated')[0];
        const linkElement = entry.getElementsByTagName('link')[0];
        const authorElement = entry.getElementsByTagName('author')[0];
        const authorNameElement = authorElement ? authorElement.getElementsByTagName('name')[0] : null;

        notifications.push({
          videoId,
          channelId,
          eventType: eventType as 'new_or_update' | 'deleted',
          rawPayload: {
            title: titleElement?.textContent?.trim(),
            published: publishedElement?.textContent?.trim(),
            updated: updatedElement?.textContent?.trim(),
            link: linkElement?.getAttribute('href'),
            author: authorNameElement?.textContent?.trim()
          }
        });
      }
    }

    return notifications;
  } catch (error) {
    console.error('parseAtomFeed error:', error);
    throw new Error(`Atom XML parse error: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    // GET: 購読検証
    if (req.method === 'GET') {
      const mode = req.query['hub.mode'] as string | undefined;
      const topic = req.query['hub.topic'] as string | undefined;
      const challenge = req.query['hub.challenge'] as string | undefined;
      const leaseSeconds = req.query['hub.lease_seconds'] as string | undefined;

      if (!mode || !topic || !challenge) {
        return res.status(400).send('Missing required parameters');
      }

      // 購読検証
      const challengeResponse = verifySubscription(mode, topic, challenge);
      
      if (!challengeResponse) {
        return res.status(400).send('Invalid subscription mode');
      }

      // 購読情報を保存または更新
      if (mode === 'subscribe' && leaseSeconds) {
        const channelId = extractChannelIdFromTopic(topic);
        if (channelId) {
          // callback URLを構築
          const protocol = req.headers['x-forwarded-proto'] || 'https';
          const host = req.headers['host'] || 'localhost';
          const callbackUrl = `${protocol}://${host}/api/youtube/websub/callback`;
          
          await saveSubscription(channelId, topic, callbackUrl, parseInt(leaseSeconds));
        }
      }

      // challengeを返す
      return res.status(200).send(challengeResponse);
    }

    // POST: 通知受信
    if (req.method === 'POST') {
      // ペイロードサイズ制限（1MB）
      const contentLength = req.headers['content-length'];
      if (contentLength && parseInt(contentLength as string) > 1024 * 1024) {
        return res.status(413).send('Payload too large');
      }

      const xml = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

      // Atom XMLをパース
      const notifications = await parseAtomFeed(xml);

      // 各通知を処理
      for (const notification of notifications) {
        await processNotification(notification);
      }

      return res.status(200).send('OK');
    }

    return res.status(405).send('Method not allowed');
  } catch (error: any) {
    console.error('WebSub callback error:', error);
    return res.status(500).send(`Error: ${error.message || 'Internal server error'}`);
  }
}
