import { createClient } from '@supabase/supabase-js';
import type { VideoSummary } from '../types';

// Vercel Serverless Functionsでは process.env を使用
// VITE_ プレフィックスはクライアント側でのみ使用可能
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function handler(req: Request): Promise<Response> {
  // CORS設定
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  try {
    if (req.method === 'GET') {
      // 要約一覧取得
      const url = new URL(req.url);
      const channelId = url.searchParams.get('channelId');
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const offset = parseInt(url.searchParams.get('offset') || '0');

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
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      return new Response(JSON.stringify(summaries), { status: 200, headers });
    }

    if (req.method === 'POST') {
      // 要約メタデータ保存
      const summary: VideoSummary = await req.json();

      // バリデーション
      if (!summary.docUrl) {
        return new Response(
          JSON.stringify({ error: 'docUrl is required' }),
          { status: 400, headers }
        );
      }

      // 重複チェック
      const { data: existing } = await supabase
        .from('summaries')
        .select('id')
        .eq('video_url', summary.url)
        .single();

      if (existing) {
        // 既に存在する場合は更新
        const { data, error } = await supabase
          .from('summaries')
          .update({
            title: summary.title,
            channel_id: summary.channelId,
            channel_title: summary.channelTitle,
            published_at: summary.publishedAt || null,
            thumbnail_url: summary.thumbnailUrl || null,
            doc_url: summary.docUrl,
            doc_id: summary.docId || null,
          })
          .eq('id', existing.id)
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
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };

        return new Response(JSON.stringify(updatedSummary), { status: 200, headers });
      }

      // 新規作成
      const { data, error } = await supabase
        .from('summaries')
        .insert({
          id: summary.id,
          video_url: summary.url,
          title: summary.title,
          channel_id: summary.channelId || null,
          channel_title: summary.channelTitle,
          published_at: summary.publishedAt || null,
          thumbnail_url: summary.thumbnailUrl || null,
          doc_url: summary.docUrl,
          doc_id: summary.docId || null,
        })
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
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      return new Response(JSON.stringify(newSummary), { status: 201, headers });
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers }
    );
  } catch (error: any) {
    console.error('API Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers }
    );
  }
}

// 重複チェック用のヘルパー関数
export async function checkVideoExists(videoUrl: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('summaries')
    .select('id')
    .eq('video_url', videoUrl)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116は「データが見つからない」エラー（正常）
    throw error;
  }

  return !!data;
}

