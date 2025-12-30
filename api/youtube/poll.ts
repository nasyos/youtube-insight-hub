/**
 * 手動ポーリングエンドポイント
 * 登録チャンネルの最新動画をチェック
 */

import { YouTubeService } from '../../services/youtubeService.js';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const youtubeService = new YouTubeService();

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
    const channelIds = body.channelIds || []; // オプション: 指定しない場合は全チャンネル
    const maxResults = body.maxResults || 3;

    // 有効なチャンネルを取得
    let query = supabase
      .from('channels')
      .select('id, channel_id, uploads_playlist_id, name')
      .eq('is_enabled', true);

    if (channelIds.length > 0) {
      query = query.in('channel_id', channelIds);
    }

    const { data: channels, error: channelsError } = await query;

    if (channelsError) {
      throw new Error(`Failed to fetch channels: ${channelsError.message}`);
    }

    if (!channels || channels.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No enabled channels found', processed: 0 }),
        { status: 200, headers }
      );
    }

    const results = {
      processed: 0,
      newVideos: 0,
      errors: [] as string[]
    };

    // 各チャンネルについて処理
    for (const channel of channels) {
      try {
        // uploads_playlist_idが無い場合、取得
        let uploadsPlaylistId = channel.uploads_playlist_id;
        
        if (!uploadsPlaylistId && channel.channel_id) {
          uploadsPlaylistId = await youtubeService.getChannelUploadsPlaylist(channel.channel_id);
          
          if (uploadsPlaylistId) {
            // データベースに保存
            await supabase
              .from('channels')
              .update({ uploads_playlist_id: uploadsPlaylistId })
              .eq('id', channel.id);
          }
        }

        if (!uploadsPlaylistId) {
          results.errors.push(`No uploads playlist for channel: ${channel.name}`);
          continue;
        }

        // プレイリストから最新動画を取得
        const videoIds = await youtubeService.getPlaylistVideos(uploadsPlaylistId, maxResults);

        if (videoIds.length === 0) {
          continue;
        }

        // 重複チェック
        const { data: existingVideos } = await supabase
          .from('videos')
          .select('video_id')
          .in('video_id', videoIds);

        const existingVideoIds = new Set(existingVideos?.map(v => v.video_id) || []);
        const newVideoIds = videoIds.filter(id => !existingVideoIds.has(id));

        if (newVideoIds.length === 0) {
          continue;
        }

        // 新規動画の詳細を取得
        const videoDetails = await youtubeService.getVideoDetails(newVideoIds);

        // データベースに保存
        for (const video of videoDetails) {
          const { error: videoError } = await supabase
            .from('videos')
            .upsert({
              video_id: video.id,
              channel_id: channel.id,
              published_at: video.publishedAt,
              title: video.title,
              description: video.description,
              thumbnail_url: video.thumbnailUrl,
              duration: video.duration,
              view_count: parseInt(video.viewCount) || 0,
              like_count: parseInt(video.likeCount) || 0,
              source: 'poll',
              event_type: 'new_or_update',
              raw_payload: video
            }, {
              onConflict: 'video_id'
            });

          if (videoError) {
            results.errors.push(`Failed to save video ${video.id}: ${videoError.message}`);
            continue;
          }

          // 要約ジョブを投入
          await createVideoJob(video.id);
          results.newVideos++;
        }

        results.processed++;
      } catch (error: any) {
        results.errors.push(`Channel ${channel.name}: ${error.message}`);
      }
    }

    return new Response(
      JSON.stringify(results),
      { status: 200, headers }
    );
  } catch (error: any) {
    console.error('Poll error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers }
    );
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

    if (error && error.code !== '23505') { // 23505 = unique_violation
      console.error('Create video job error:', error);
    }
  } catch (error) {
    console.error('createVideoJob error:', error);
  }
}


