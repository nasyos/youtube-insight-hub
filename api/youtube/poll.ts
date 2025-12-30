/**
 * 手動ポーリングエンドポイント
 * 登録チャンネルの最新動画をチェック
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// YouTube API設定
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || process.env.VITE_YOUTUBE_API_KEY || '';
const YOUTUBE_BASE_URL = 'https://www.googleapis.com/youtube/v3';

// YouTubeVideoDetails型定義
interface YouTubeVideoDetails {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnailUrl: string;
  duration: string;
  viewCount: string;
  likeCount: string;
  channelId: string;
  channelTitle: string;
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
 * チャンネルのアップロードプレイリストIDを取得
 */
async function getChannelUploadsPlaylist(channelId: string): Promise<string | null> {
  if (!YOUTUBE_API_KEY) {
    throw new Error('YouTube APIキーが設定されていません。');
  }

  try {
    const url = new URL(`${YOUTUBE_BASE_URL}/channels`);
    url.searchParams.set('part', 'contentDetails');
    url.searchParams.set('id', channelId);
    url.searchParams.set('key', YOUTUBE_API_KEY);

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.items && data.items.length > 0) {
      return data.items[0].contentDetails?.relatedPlaylists?.uploads || null;
    }

    return null;
  } catch (error) {
    console.error('getChannelUploadsPlaylist error:', error);
    return null;
  }
}

/**
 * プレイリストの動画VIDEO_IDリストを取得
 */
async function getPlaylistVideos(playlistId: string, maxResults: number = 3): Promise<string[]> {
  if (!YOUTUBE_API_KEY) {
    throw new Error('YouTube APIキーが設定されていません。');
  }

  try {
    const url = new URL(`${YOUTUBE_BASE_URL}/playlistItems`);
    url.searchParams.set('part', 'contentDetails');
    url.searchParams.set('playlistId', playlistId);
    url.searchParams.set('maxResults', maxResults.toString());
    url.searchParams.set('key', YOUTUBE_API_KEY);

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.items) {
      return data.items
        .filter((item: any) => item.contentDetails?.videoId)
        .map((item: any) => item.contentDetails.videoId);
    }

    return [];
  } catch (error) {
    console.error('getPlaylistVideos error:', error);
    return [];
  }
}

/**
 * VIDEO_IDから動画の詳細情報を取得
 */
async function getVideoDetails(videoIds: string[]): Promise<YouTubeVideoDetails[]> {
  if (!YOUTUBE_API_KEY) {
    throw new Error('YouTube APIキーが設定されていません。');
  }

  if (videoIds.length === 0) {
    return [];
  }

  const batchSize = 50;
  const results: YouTubeVideoDetails[] = [];

  for (let i = 0; i < videoIds.length; i += batchSize) {
    const batch = videoIds.slice(i, i + batchSize);

    try {
      const url = new URL(`${YOUTUBE_BASE_URL}/videos`);
      url.searchParams.set('part', 'snippet,contentDetails,statistics');
      url.searchParams.set('id', batch.join(','));
      url.searchParams.set('key', YOUTUBE_API_KEY);

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.items) {
        for (const item of data.items) {
          results.push({
            id: item.id,
            title: item.snippet.title,
            description: item.snippet.description || '',
            publishedAt: item.snippet.publishedAt,
            thumbnailUrl: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url || '',
            duration: item.contentDetails?.duration || '',
            viewCount: item.statistics?.viewCount || '0',
            likeCount: item.statistics?.likeCount || '0',
            channelId: item.snippet.channelId,
            channelTitle: item.snippet.channelTitle
          });
        }
      }
    } catch (error) {
      console.error('getVideoDetails error:', error);
    }
  }

  return results;
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
    const body = req.body || {};
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
      return res.status(200).json({ message: 'No enabled channels found', processed: 0 });
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
          uploadsPlaylistId = await getChannelUploadsPlaylist(channel.channel_id);
          
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
        const videoIds = await getPlaylistVideos(uploadsPlaylistId, maxResults);

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
        const videoDetails = await getVideoDetails(newVideoIds);

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

    return res.status(200).json(results);
  } catch (error: any) {
    console.error('Poll error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
