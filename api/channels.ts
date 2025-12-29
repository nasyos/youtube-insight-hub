import { createClient } from '@supabase/supabase-js';
import type { TrackedChannel } from '../types';

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
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  try {
    if (req.method === 'GET') {
      // チャンネル一覧取得
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const channels: TrackedChannel[] = (data || []).map((row) => ({
        id: row.id,
        name: row.name,
        handle: row.handle,
        lastChecked: row.last_checked || new Date().toISOString(),
        thumbnailUrl: row.thumbnail_url || '',
      }));

      return new Response(JSON.stringify(channels), { status: 200, headers });
    }

    if (req.method === 'POST') {
      // チャンネル追加
      const channel: TrackedChannel = await req.json();

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
        // 重複エラーの場合
        if (error.code === '23505') {
          return new Response(
            JSON.stringify({ error: 'このチャンネルは既に登録されています。' }),
            { status: 409, headers }
          );
        }
        throw error;
      }

      return new Response(JSON.stringify(data), { status: 201, headers });
    }

    if (req.method === 'DELETE') {
      // チャンネル削除
      const { id } = await req.json();

      const { error } = await supabase
        .from('channels')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), { status: 200, headers });
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

