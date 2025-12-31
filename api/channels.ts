import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import type { TrackedChannel } from '../types';

// Vercel Serverless Functionsでは process.env を使用
// VITE_ プレフィックスはクライアント側でのみ使用可能
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
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
        channelId: row.channel_id || undefined,
        uploadsPlaylistId: row.uploads_playlist_id || undefined,
      }));

      return res.status(200).json(channels);
    }

    if (req.method === 'POST') {
      // チャンネル追加
      const channel = req.body as TrackedChannel;

      const { data, error } = await supabase
        .from('channels')
        .insert({
          id: channel.id,
          name: channel.name,
          handle: channel.handle,
          thumbnail_url: channel.thumbnailUrl,
          last_checked: channel.lastChecked || new Date().toISOString(),
          channel_id: channel.channelId || null,
          uploads_playlist_id: channel.uploadsPlaylistId || null,
        })
        .select()
        .single();

      if (error) {
        // 重複エラーの場合
        if (error.code === '23505') {
          return res.status(409).json({ error: 'このチャンネルは既に登録されています。' });
        }
        throw error;
      }

      const savedChannel: TrackedChannel = {
        id: data.id,
        name: data.name,
        handle: data.handle,
        lastChecked: data.last_checked || new Date().toISOString(),
        thumbnailUrl: data.thumbnail_url || '',
        channelId: data.channel_id || undefined,
        uploadsPlaylistId: data.uploads_playlist_id || undefined,
      };

      return res.status(201).json(savedChannel);
    }

    if (req.method === 'DELETE') {
      // チャンネル削除
      const body = req.body as { id: string };
      const { id } = body;

      const { error } = await supabase
        .from('channels')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

