import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import type { VideoSummary } from '../types';

// Vercel Serverless Functionsでは process.env を使用
// VITE_ プレフィックスはクライアント側でのみ使用可能
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * YouTube URLからVIDEO_IDを抽出
 * @param url YouTube URL
 * @returns VIDEO_ID（11文字）、抽出できない場合はnull
 */
function extractVideoId(url: string): string | null {
  if (!url) return null;

  // YouTube URLのパターン
  const patterns = [
    // https://www.youtube.com/watch?v=VIDEO_ID または &v=VIDEO_ID
    /(?:youtube\.com\/watch\?.*[&?]v=)([a-zA-Z0-9_-]{11})/,
    // https://youtu.be/VIDEO_ID
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    // https://www.youtube.com/embed/VIDEO_ID
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    // https://www.youtube.com/v/VIDEO_ID
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    // https://m.youtube.com/watch?v=VIDEO_ID
    /(?:m\.youtube\.com\/watch\?.*[&?]v=)([a-zA-Z0-9_-]{11})/,
    // https://youtube.com/watch?v=VIDEO_ID (wwwなし)
    /(?:youtube\.com\/watch\?.*[&?]v=)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  // パターンに一致しない場合、URL全体がVIDEO_IDの可能性（11文字）
  if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) {
    return url.trim();
  }

  return null;
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
    if (req.method === 'GET') {
      // 要約一覧取得
      const channelId = req.query.channelId as string | undefined;
      const limit = parseInt((req.query.limit as string) || '50');
      const offset = parseInt((req.query.offset as string) || '0');

      let query = supabase
        .from('summaries')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (channelId) {
        query = query.eq('channel_id', channelId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const summaries: VideoSummary[] = (data || []).map((row) => ({
        id: row.id,
        title: row.title,
        publishedAt: row.published_at || '',
        thumbnailUrl: row.thumbnail_url || '',
        channelId: row.channel_id || '',
        channelTitle: row.channel_title,
        url: row.video_url,
        docUrl: row.doc_url,
        docId: row.doc_id,
        summary: row.summary || undefined,
        keyPoints: row.key_points ? (Array.isArray(row.key_points) ? row.key_points : JSON.parse(row.key_points)) : undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      return res.status(200).json(summaries);
    }

    if (req.method === 'POST') {
      // 要約メタデータ保存
      const summary = req.body as VideoSummary;

      // バリデーション
      if (!summary.docUrl) {
        return res.status(400).json({ error: 'docUrl is required' });
      }

      // VIDEO_IDを抽出
      const videoId = extractVideoId(summary.url);
      console.log('🔍 API saveSummary: URL =', summary.url, ', 抽出されたVIDEO_ID =', videoId);

      // 重複チェック（VIDEO_IDでチェック、なければvideo_urlでチェック）
      let existingData = null;
      
      if (videoId) {
        // まずvideo_idカラムでチェック
        const { data: dataById, error: errorById } = await supabase
          .from('summaries')
          .select('id')
          .eq('video_id', videoId)
          .maybeSingle();
        
        if (errorById && errorById.code !== 'PGRST116') {
          console.warn('VIDEO_ID重複チェックエラー:', errorById);
        } else if (dataById) {
          existingData = dataById;
        }
      }
      
      // video_idで見つからない場合、video_urlでチェック（フォールバック）
      if (!existingData) {
        const { data: dataByUrl, error: checkError } = await supabase
          .from('summaries')
          .select('id')
          .eq('video_url', summary.url)
          .maybeSingle();
        
        if (checkError && checkError.code !== 'PGRST116') {
          console.warn('重複チェックエラー（無視して続行）:', checkError);
        } else if (dataByUrl) {
          existingData = dataByUrl;
        }
      }
      
      // video_idでもvideo_urlでも見つからない場合、既存データからVIDEO_IDを抽出して比較
      if (!existingData && videoId) {
        const { data: allSummaries, error: errorAll } = await supabase
          .from('summaries')
          .select('id, video_url');
        
        if (!errorAll && allSummaries) {
          for (const s of allSummaries) {
            const existingVideoId = extractVideoId(s.video_url);
            if (existingVideoId === videoId) {
              existingData = { id: s.id };
              break;
            }
          }
        }
      }
      
      // VIDEO_IDでも見つからない場合、published_atとtitleの最初の10文字の組み合わせでチェック（フォールバック）
      // 同じチャンネル内で、同じ公開日時とタイトルの最初の10文字の動画は重複とみなす
      if (!existingData && summary.publishedAt && summary.title && summary.channelId) {
        // published_atを日付部分のみに正規化（時刻の精度の問題を回避）
        const publishedDate = summary.publishedAt.split('T')[0]; // YYYY-MM-DD形式に変換
        // タイトルの最初の10文字を取得
        const titlePrefix = summary.title.substring(0, 10);
        
        const { data: dataByTitleAndDate, error: errorByTitleAndDate } = await supabase
          .from('summaries')
          .select('id')
          .eq('channel_id', summary.channelId)
          .like('published_at', `${publishedDate}%`) // 日付部分で一致
          .like('title', `${titlePrefix}%`) // タイトルの最初の10文字で一致
          .maybeSingle();
        
        if (errorByTitleAndDate && errorByTitleAndDate.code !== 'PGRST116') {
          console.warn('published_at+title重複チェックエラー:', errorByTitleAndDate);
        } else if (dataByTitleAndDate) {
          console.log('🔍 API: published_at+title(最初の10文字)で重複を検出:', {
            titlePrefix: titlePrefix,
            publishedAt: summary.publishedAt,
            existingId: dataByTitleAndDate.id
          });
          existingData = dataByTitleAndDate;
        }
      }

      if (existingData) {
        // 既に存在する場合は更新
        const updateData: any = {
          title: summary.title,
          channel_id: summary.channelId,
          channel_title: summary.channelTitle,
          published_at: summary.publishedAt || null,
          thumbnail_url: summary.thumbnailUrl || null,
          doc_url: summary.docUrl,
          doc_id: summary.docId || null,
          summary: summary.summary || null,
          key_points: summary.keyPoints ? JSON.stringify(summary.keyPoints) : null,
        };
        
        // video_idカラムが存在する場合のみ更新
        if (videoId) {
          updateData.video_id = videoId;
        }
        
        const { data, error } = await supabase
          .from('summaries')
          .update(updateData)
          .eq('id', existingData.id)
          .select()
          .single();

        if (error) throw error;

        const updatedSummary: VideoSummary = {
          id: data.id,
          title: data.title,
          publishedAt: data.published_at || '',
          thumbnailUrl: data.thumbnail_url || '',
          channelId: data.channel_id || '',
          channelTitle: data.channel_title,
          url: data.video_url,
          docUrl: data.doc_url,
          docId: data.doc_id,
          summary: data.summary || undefined,
          keyPoints: data.key_points ? (Array.isArray(data.key_points) ? data.key_points : JSON.parse(data.key_points)) : undefined,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };

        return res.status(200).json(updatedSummary);
      }

      // 新規作成
      const insertData: any = {
        id: summary.id,
        video_url: summary.url,
        title: summary.title,
        channel_id: summary.channelId || null,
        channel_title: summary.channelTitle,
        published_at: summary.publishedAt || null,
        thumbnail_url: summary.thumbnailUrl || null,
        doc_url: summary.docUrl,
        doc_id: summary.docId || null,
        summary: summary.summary || null,
        key_points: summary.keyPoints ? JSON.stringify(summary.keyPoints) : null,
      };
      
      // video_idカラムが存在する場合のみ追加
      if (videoId) {
        insertData.video_id = videoId;
      }
      
      const { data, error } = await supabase
        .from('summaries')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      const newSummary: VideoSummary = {
        id: data.id,
        title: data.title,
        publishedAt: data.published_at || '',
        thumbnailUrl: data.thumbnail_url || '',
        channelId: data.channel_id || '',
        channelTitle: data.channel_title,
        url: data.video_url,
        docUrl: data.doc_url,
        docId: data.doc_id,
        summary: data.summary || undefined,
        keyPoints: data.key_points ? (Array.isArray(data.key_points) ? data.key_points : JSON.parse(data.key_points)) : undefined,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      return res.status(201).json(newSummary);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

// 重複チェック用のヘルパー関数
export async function checkVideoExists(videoUrl: string, options?: { publishedAt?: string; title?: string; channelId?: string }): Promise<boolean> {
  // URLからVIDEO_IDを抽出
  const videoId = extractVideoId(videoUrl);
  
  if (!videoId) {
    // VIDEO_IDが抽出できない場合は、従来の方法でチェック
    const { data, error } = await supabase
      .from('summaries')
      .select('id')
      .eq('video_url', videoUrl)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.warn('重複チェックエラー:', error);
      return false;
    }

    if (data) {
      return true;
    }
    
    // published_atとtitleの最初の10文字でチェック（フォールバック）
    if (options?.publishedAt && options?.title && options?.channelId) {
      const publishedDate = options.publishedAt.split('T')[0];
      const titlePrefix = options.title.substring(0, 10);
      const { data: dataByTitleAndDate, error: errorByTitleAndDate } = await supabase
        .from('summaries')
        .select('id')
        .eq('channel_id', options.channelId)
        .like('published_at', `${publishedDate}%`)
        .like('title', `${titlePrefix}%`) // タイトルの最初の10文字で一致
        .maybeSingle();
      
      if (errorByTitleAndDate && errorByTitleAndDate.code !== 'PGRST116') {
        console.warn('published_at+title重複チェックエラー:', errorByTitleAndDate);
      } else if (dataByTitleAndDate) {
        console.log('🔍 API checkVideoExists: published_at+title(最初の10文字)で重複を検出:', {
          titlePrefix: titlePrefix,
          publishedAt: options.publishedAt
        });
        return true;
      }
    }
    
    return false;
  }

  // VIDEO_IDで重複チェック（より確実）
  // まずvideo_idカラムでチェック、なければvideo_urlからVIDEO_IDを抽出して比較
  const { data: dataById, error: errorById } = await supabase
    .from('summaries')
    .select('id')
    .eq('video_id', videoId)
    .maybeSingle();
  
  if (errorById && errorById.code !== 'PGRST116') {
    console.warn('VIDEO_ID重複チェックエラー:', errorById);
  }
  
  if (dataById) {
    return true; // VIDEO_IDで重複が見つかった
  }
  
  // video_idカラムがない場合のフォールバック: video_urlからVIDEO_IDを抽出して比較
  const { data: allSummaries, error: errorAll } = await supabase
    .from('summaries')
    .select('video_url');
  
  if (errorAll) {
    console.warn('全要約取得エラー:', errorAll);
  } else if (allSummaries) {
    // 既存のvideo_urlからVIDEO_IDを抽出して比較
    for (const summary of allSummaries) {
      const existingVideoId = extractVideoId(summary.video_url);
      if (existingVideoId === videoId) {
        return true; // 重複が見つかった
      }
    }
  }
  
  // VIDEO_IDでも見つからない場合、published_atとtitleの最初の10文字でチェック（フォールバック）
  if (options?.publishedAt && options?.title && options?.channelId) {
    const publishedDate = options.publishedAt.split('T')[0];
    const titlePrefix = options.title.substring(0, 10);
    const { data: dataByTitleAndDate, error: errorByTitleAndDate } = await supabase
      .from('summaries')
      .select('id')
      .eq('channel_id', options.channelId)
      .like('published_at', `${publishedDate}%`)
      .like('title', `${titlePrefix}%`) // タイトルの最初の10文字で一致
      .maybeSingle();
    
    if (errorByTitleAndDate && errorByTitleAndDate.code !== 'PGRST116') {
      console.warn('published_at+title重複チェックエラー:', errorByTitleAndDate);
    } else if (dataByTitleAndDate) {
      console.log('🔍 API checkVideoExists: published_at+title(最初の10文字)で重複を検出:', {
        titlePrefix: titlePrefix,
        publishedAt: options.publishedAt,
        videoId: videoId
      });
      return true;
    }
  }
  
  return false; // 重複なし
}

