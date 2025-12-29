-- YouTube Insight Hub - データベーススキーマ
-- Googleドキュメント主ストレージ設計（メタデータのみ保存）

-- channels テーブル
CREATE TABLE IF NOT EXISTS channels (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  handle VARCHAR NOT NULL,
  thumbnail_url VARCHAR,
  last_checked TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- summaries テーブル（メタデータと要約内容）
CREATE TABLE IF NOT EXISTS summaries (
  id VARCHAR PRIMARY KEY,
  video_url VARCHAR NOT NULL,  -- 動画URL（UNIQUE制約を削除、video_idで重複チェック）
  video_id VARCHAR UNIQUE,  -- VIDEO_ID（11文字、重複チェック用）
  title VARCHAR NOT NULL,
  channel_id VARCHAR REFERENCES channels(id) ON DELETE CASCADE,
  channel_title VARCHAR NOT NULL,
  published_at TIMESTAMP,
  thumbnail_url VARCHAR,
  doc_url VARCHAR NOT NULL,  -- GoogleドキュメントURL（必須）
  doc_id VARCHAR,  -- GoogleドキュメントID（オプション）
  summary TEXT,  -- 要約内容（オプショナル）
  key_points JSONB,  -- 重要なポイント（JSON配列、オプショナル）
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_summaries_video_id ON summaries(video_id);  -- VIDEO_IDで高速検索
CREATE INDEX IF NOT EXISTS idx_summaries_video_url ON summaries(video_url);
CREATE INDEX IF NOT EXISTS idx_summaries_channel_id ON summaries(channel_id);
CREATE INDEX IF NOT EXISTS idx_summaries_published_at ON summaries(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_summaries_created_at ON summaries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_channels_handle ON channels(handle);

-- updated_at を自動更新する関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- summaries テーブルの updated_at を自動更新するトリガー
CREATE TRIGGER update_summaries_updated_at
  BEFORE UPDATE ON summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

