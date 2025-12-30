import type { TrackedChannel, VideoSummary } from '../types';
import { supabase } from '../lib/supabase';
import { extractVideoId } from '../utils/youtubeUtils';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '/api';
// ローカル開発時は直接Supabaseに接続（環境変数が設定されている場合）
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';
const USE_DIRECT_SUPABASE = supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://placeholder.supabase.co';

export class ApiService {
  // チャンネル関連
  async getChannels(): Promise<TrackedChannel[]> {
    if (USE_DIRECT_SUPABASE) {
      try {
        // 直接Supabaseに接続（ローカル開発用）
        const { data, error } = await supabase
          .from('channels')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.warn('Supabaseエラー:', error);
          return []; // エラー時は空配列を返す
        }
        
        return (data || []).map((row) => ({
          id: row.id,
          name: row.name,
          handle: row.handle,
          lastChecked: row.last_checked || new Date().toISOString(),
          thumbnailUrl: row.thumbnail_url || '',
        }));
      } catch (error) {
        console.warn('Supabase接続エラー:', error);
        return []; // エラー時は空配列を返す
      }
    }
    
    // APIエンドポイントを使用（Vercelデプロイ時など）
    try {
      const response = await fetch(`${API_BASE_URL}/channels`, {
        method: 'GET',
      });
      if (!response.ok) {
        throw new Error('チャンネル一覧の取得に失敗しました');
      }
      return response.json();
    } catch (error) {
      console.warn('API接続エラー:', error);
      return []; // エラー時は空配列を返す
    }
  }

  async addChannel(channel: TrackedChannel): Promise<TrackedChannel> {
    if (USE_DIRECT_SUPABASE) {
      // 直接Supabaseに接続（ローカル開発用）
      const { data, error } = await supabase
        .from('channels')
        .insert({
          id: channel.id,
          name: channel.name,
          handle: channel.handle,
          thumbnail_url: channel.thumbnailUrl,
          last_checked: channel.lastChecked || new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) {
        if (error.code === '23505') {
          throw new Error('このチャンネルは既に登録されています。');
        }
        throw new Error('チャンネルの追加に失敗しました');
      }
      
      return {
        id: data.id,
        name: data.name,
        handle: data.handle,
        lastChecked: data.last_checked || new Date().toISOString(),
        thumbnailUrl: data.thumbnail_url || '',
      };
    }
    
    const response = await fetch(`${API_BASE_URL}/channels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(channel),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'チャンネルの追加に失敗しました');
    }
    return response.json();
  }

  async deleteChannel(id: string): Promise<void> {
    if (USE_DIRECT_SUPABASE) {
      // 直接Supabaseに接続（ローカル開発用）
      const { error } = await supabase
        .from('channels')
        .delete()
        .eq('id', id);
      
      if (error) throw new Error('チャンネルの削除に失敗しました');
      return;
    }
    
    const response = await fetch(`${API_BASE_URL}/channels`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (!response.ok) {
      throw new Error('チャンネルの削除に失敗しました');
    }
  }

  // 要約関連
  async getSummaries(channelId?: string, limit = 50, offset = 0): Promise<VideoSummary[]> {
    if (USE_DIRECT_SUPABASE) {
      try {
        // 直接Supabaseに接続（ローカル開発用）
        let query = supabase
          .from('summaries')
          .select('*')
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);
        
        if (channelId) {
          query = query.eq('channel_id', channelId);
        }
        
        const { data, error } = await query;
        if (error) {
          console.warn('Supabaseエラー:', error);
          return []; // エラー時は空配列を返す
        }
        
        return (data || []).map((row) => ({
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
          // video_idは型定義に含まれていないが、内部的に使用可能
        }));
      } catch (error) {
        console.warn('Supabase接続エラー:', error);
        return []; // エラー時は空配列を返す
      }
    }
    
    // APIエンドポイントを使用（Vercelデプロイ時など）
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });
      if (channelId) {
        params.append('channelId', channelId);
      }

      const response = await fetch(`${API_BASE_URL}/summaries?${params}`, {
        method: 'GET',
      });
      if (!response.ok) {
        throw new Error('要約一覧の取得に失敗しました');
      }
      return response.json();
    } catch (error) {
      console.warn('API接続エラー:', error);
      return []; // エラー時は空配列を返す
    }
  }

  async saveSummary(summary: VideoSummary): Promise<VideoSummary> {
    if (USE_DIRECT_SUPABASE) {
      // 直接Supabaseに接続（ローカル開発用）
      // VIDEO_IDを抽出
      console.log('🔍 saveSummary: URL =', summary.url);
      const videoId = extractVideoId(summary.url);
      console.log('🔍 saveSummary: 抽出されたVIDEO_ID =', videoId);
      
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
      if (!existingData && summary.publishedAt && summary.title) {
        // published_atを日付部分のみに正規化（時刻の精度の問題を回避）
        const publishedDate = summary.publishedAt.split('T')[0]; // YYYY-MM-DD形式に変換
        // タイトルの最初の10文字を取得
        const titlePrefix = summary.title.substring(0, 10);
        
        const { data: dataByTitleAndDate, error: errorByTitleAndDate } = await supabase
          .from('summaries')
          .select('id')
          .eq('channel_id', summary.channelId || '')
          .like('published_at', `${publishedDate}%`) // 日付部分で一致
          .like('title', `${titlePrefix}%`) // タイトルの最初の10文字で一致
          .maybeSingle();
        
        if (errorByTitleAndDate && errorByTitleAndDate.code !== 'PGRST116') {
          console.warn('published_at+title重複チェックエラー:', errorByTitleAndDate);
        } else if (dataByTitleAndDate) {
          console.log('🔍 published_at+title(最初の10文字)で重複を検出:', {
            titlePrefix: titlePrefix,
            publishedAt: summary.publishedAt,
            existingId: dataByTitleAndDate.id
          });
          existingData = dataByTitleAndDate;
        }
      }
      
      const existing = existingData;
      
      if (existing) {
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
          .eq('id', existing.id)
          .select()
          .single();
        
        if (error) throw new Error('要約の保存に失敗しました');
        
        return {
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
      
      if (error) throw new Error('要約の保存に失敗しました');
      
      return {
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
    }
    
    const response = await fetch(`${API_BASE_URL}/summaries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(summary),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '要約の保存に失敗しました');
    }
    return response.json();
  }

  async checkVideoExists(videoUrl: string, options?: { publishedAt?: string; title?: string; channelId?: string }): Promise<boolean> {
    // URLからVIDEO_IDを抽出
    console.log('🔍 checkVideoExists: URL =', videoUrl);
    const videoId = extractVideoId(videoUrl);
    console.log('🔍 checkVideoExists: 抽出されたVIDEO_ID =', videoId);
    
    if (!videoId) {
      // VIDEO_IDが抽出できない場合は、従来の方法でチェック
      console.warn('⚠️ checkVideoExists: VIDEO_IDを抽出できませんでした。URL =', videoUrl);
      if (USE_DIRECT_SUPABASE) {
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
            console.log('🔍 published_at+title(最初の10文字)で重複を検出:', {
              titlePrefix: titlePrefix,
              publishedAt: options.publishedAt
            });
            return true;
          }
        }
        
        return false;
      }
      
      const summaries = await this.getSummaries();
      return summaries.some(s => s.url === videoUrl);
    }

    if (USE_DIRECT_SUPABASE) {
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
          console.log('🔍 published_at+title(最初の10文字)で重複を検出:', {
            titlePrefix: titlePrefix,
            publishedAt: options.publishedAt,
            videoId: videoId
          });
          return true;
        }
      }
      
      return false; // 重複なし
    }
    
    // APIエンドポイントを使用する場合（フォールバック）
    const summaries = await this.getSummaries();
    return summaries.some(s => {
      const existingVideoId = extractVideoId(s.url);
      return existingVideoId === videoId;
    });
  }
}

