import { createClient } from '@supabase/supabase-js';

// 環境変数の読み込み（Viteでは import.meta.env を使用）
const env = (import.meta as any).env || {};

// デバッグ: 実際に読み込まれている環境変数を確認
if (env.DEV) {
  console.log('🔍 [デバッグ] import.meta.env の内容:', {
    DEV: env.DEV,
    MODE: env.MODE,
    VITE_SUPABASE_URL: env.VITE_SUPABASE_URL ? `${env.VITE_SUPABASE_URL.substring(0, 30)}...` : '未設定',
    VITE_SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY ? `${env.VITE_SUPABASE_ANON_KEY.substring(0, 20)}...` : '未設定',
    allKeys: Object.keys(env).filter(key => key.startsWith('VITE_'))
  });
}

const supabaseUrl = env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || '';

// デバッグ用ログ（開発環境のみ）
if (env.DEV) {
  console.log('🔍 環境変数チェック:');
  console.log('  VITE_SUPABASE_URL:', supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : '未設定');
  console.log('  VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : '未設定');
}

// 環境変数が設定されていない場合はダミーのクライアントを作成（エラーを防ぐため）
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      },
    })
  : createClient('https://placeholder.supabase.co', 'placeholder-key');

if (!supabaseUrl || !supabaseAnonKey) {
  const isVercel = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');
  console.warn('⚠️ Supabase環境変数が設定されていません。データベース機能は使用できません。');
  if (isVercel) {
    console.warn('   Vercelダッシュボードの「Settings」→「Environment Variables」で以下を設定してください:');
    console.warn('   VITE_SUPABASE_URL=your_supabase_url');
    console.warn('   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key');
    console.warn('   設定後、再デプロイしてください。');
  } else {
    console.warn('   .env.local ファイルに以下を設定してください:');
    console.warn('   VITE_SUPABASE_URL=your_supabase_url');
    console.warn('   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key');
    console.warn('   設定後、開発サーバーを再起動してください（Ctrl+C で停止 → npm run dev で再起動）');
  }
} else {
  console.log('✅ Supabase接続設定が確認されました');
}

// データベース型定義
export interface Database {
  public: {
    Tables: {
      channels: {
        Row: {
          id: string;
          name: string;
          handle: string;
          thumbnail_url: string | null;
          last_checked: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          handle: string;
          thumbnail_url?: string | null;
          last_checked?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          handle?: string;
          thumbnail_url?: string | null;
          last_checked?: string | null;
          created_at?: string;
        };
      };
      summaries: {
        Row: {
          id: string;
          video_url: string;
          title: string;
          channel_id: string | null;
          channel_title: string;
          published_at: string | null;
          thumbnail_url: string | null;
          doc_url: string;
          doc_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          video_url: string;
          title: string;
          channel_id?: string | null;
          channel_title: string;
          published_at?: string | null;
          thumbnail_url?: string | null;
          doc_url: string;
          doc_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          video_url?: string;
          title?: string;
          channel_id?: string | null;
          channel_title?: string;
          published_at?: string | null;
          thumbnail_url?: string | null;
          doc_url?: string;
          doc_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

