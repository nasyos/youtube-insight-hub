-- YouTube Insight Hub - VIDEO_IDカラム追加
-- 既存のテーブルにvideo_idカラムを追加して、VIDEO_IDで重複チェックできるようにする

-- summaries テーブルに video_id カラムを追加
ALTER TABLE summaries 
  ADD COLUMN IF NOT EXISTS video_id VARCHAR;

-- UNIQUE制約を追加（VIDEO_IDで重複を防ぐ）
CREATE UNIQUE INDEX IF NOT EXISTS idx_summaries_video_id_unique ON summaries(video_id) 
WHERE video_id IS NOT NULL;

-- インデックスを追加（高速検索用）
CREATE INDEX IF NOT EXISTS idx_summaries_video_id ON summaries(video_id);

-- 既存データのvideo_idを更新（video_urlからVIDEO_IDを抽出）
-- 注意: このSQLはPostgreSQLの関数を使用します
-- SupabaseのSQL Editorで実行してください

-- 既存のvideo_urlからVIDEO_IDを抽出して更新
UPDATE summaries
SET video_id = CASE
  -- https://www.youtube.com/watch?v=VIDEO_ID 形式
  WHEN video_url ~ 'youtube\.com/watch\?v=([a-zA-Z0-9_-]{11})' THEN
    (regexp_match(video_url, 'youtube\.com/watch\?v=([a-zA-Z0-9_-]{11})'))[1]
  -- https://youtu.be/VIDEO_ID 形式
  WHEN video_url ~ 'youtu\.be/([a-zA-Z0-9_-]{11})' THEN
    (regexp_match(video_url, 'youtu\.be/([a-zA-Z0-9_-]{11})'))[1]
  -- https://www.youtube.com/embed/VIDEO_ID 形式
  WHEN video_url ~ 'youtube\.com/embed/([a-zA-Z0-9_-]{11})' THEN
    (regexp_match(video_url, 'youtube\.com/embed/([a-zA-Z0-9_-]{11})'))[1]
  -- その他の形式
  ELSE NULL
END
WHERE video_id IS NULL;

-- コメント追加
COMMENT ON COLUMN summaries.video_id IS 'YouTube VIDEO_ID（11文字、重複チェック用）';

