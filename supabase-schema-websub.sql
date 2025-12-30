-- YouTube WebSub + ポーリング対応 - データベーススキーマ拡張
-- 既存のテーブルを拡張し、新しいテーブルを追加

-- ============================================
-- 1. channels テーブルの拡張
-- ============================================

ALTER TABLE channels 
  ADD COLUMN IF NOT EXISTS channel_id VARCHAR UNIQUE,  -- YouTubeチャンネルID（UCxxxxx）
  ADD COLUMN IF NOT EXISTS uploads_playlist_id VARCHAR,  -- アップロードプレイリストID
  ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT true;  -- 有効/無効フラグ

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_channels_channel_id ON channels(channel_id);
CREATE INDEX IF NOT EXISTS idx_channels_is_enabled ON channels(is_enabled);
CREATE INDEX IF NOT EXISTS idx_channels_uploads_playlist_id ON channels(uploads_playlist_id);

-- ============================================
-- 2. subscriptions テーブル（新規）
-- ============================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id VARCHAR PRIMARY KEY,
  channel_id VARCHAR NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  topic_url VARCHAR NOT NULL,  -- WebSub topic URL
  callback_url VARCHAR NOT NULL,  -- WebSub callback URL
  status VARCHAR NOT NULL DEFAULT 'pending',  -- pending/subscribed/expired/failed
  lease_expires_at TIMESTAMP,  -- 購読期限
  last_subscribed_at TIMESTAMP,  -- 最後に購読した日時
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_channel_id ON subscriptions(channel_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_lease_expires_at ON subscriptions(lease_expires_at);

-- updated_at を自動更新するトリガー
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. videos テーブル（新規）
-- ============================================

CREATE TABLE IF NOT EXISTS videos (
  video_id VARCHAR PRIMARY KEY,  -- YouTube VIDEO_ID（11文字）
  channel_id VARCHAR NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  published_at TIMESTAMP NOT NULL,
  title VARCHAR NOT NULL,
  description TEXT,
  thumbnail_url VARCHAR,
  duration VARCHAR,  -- ISO 8601形式（PT4M13S等）
  view_count BIGINT,
  like_count BIGINT,
  fetched_at TIMESTAMP DEFAULT NOW(),  -- 取得日時
  source VARCHAR NOT NULL,  -- websub | poll
  event_type VARCHAR NOT NULL DEFAULT 'new_or_update',  -- new_or_update | deleted
  raw_payload JSONB,  -- 生のAPIレスポンスやAtom XML
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_videos_channel_id ON videos(channel_id);
CREATE INDEX IF NOT EXISTS idx_videos_published_at ON videos(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_fetched_at ON videos(fetched_at);
CREATE INDEX IF NOT EXISTS idx_videos_source ON videos(source);
CREATE INDEX IF NOT EXISTS idx_videos_event_type ON videos(event_type);

-- updated_at を自動更新するトリガー
CREATE TRIGGER update_videos_updated_at
  BEFORE UPDATE ON videos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. video_jobs テーブル（新規）
-- ============================================

CREATE TABLE IF NOT EXISTS video_jobs (
  id VARCHAR PRIMARY KEY,
  video_id VARCHAR NOT NULL UNIQUE REFERENCES videos(video_id) ON DELETE CASCADE,
  status VARCHAR NOT NULL DEFAULT 'pending',  -- pending | processing | done | failed
  started_at TIMESTAMP,
  finished_at TIMESTAMP,
  error TEXT,
  summary_text TEXT,  -- 要約テキスト（一時保存用）
  key_points JSONB,  -- 重要なポイント（JSON配列）
  doc_url VARCHAR,  -- Google Docs URL
  doc_id VARCHAR,  -- Google Docs ID
  notified_at TIMESTAMP,  -- 通知送信日時
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_jobs_status ON video_jobs(status);
CREATE INDEX IF NOT EXISTS idx_video_jobs_video_id ON video_jobs(video_id);
CREATE INDEX IF NOT EXISTS idx_video_jobs_created_at ON video_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_video_jobs_status_created_at ON video_jobs(status, created_at);

-- updated_at を自動更新するトリガー
CREATE TRIGGER update_video_jobs_updated_at
  BEFORE UPDATE ON video_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. summaries テーブルとの統合（オプション）
-- ============================================

-- 既存のsummariesテーブルとvideo_jobsテーブルを連携させる場合
-- video_jobs.done → summaries に移行する処理を実装

-- コメント追加
COMMENT ON TABLE subscriptions IS 'WebSub購読情報';
COMMENT ON TABLE videos IS 'YouTube動画メタデータ（WebSub/ポーリングで取得）';
COMMENT ON TABLE video_jobs IS '要約ジョブ（非同期処理用）';

COMMENT ON COLUMN videos.source IS '取得元: websub | poll';
COMMENT ON COLUMN videos.event_type IS 'イベントタイプ: new_or_update | deleted';
COMMENT ON COLUMN video_jobs.status IS 'ジョブステータス: pending | processing | done | failed';

