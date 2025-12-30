-- YouTube Insight Hub - データベーススキーマ更新
-- 既存のテーブルに要約内容カラムを追加

-- summaries テーブルに summary と key_points カラムを追加
ALTER TABLE summaries 
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS key_points JSONB;

-- コメント追加
COMMENT ON COLUMN summaries.summary IS '要約内容（オプショナル）';
COMMENT ON COLUMN summaries.key_points IS '重要なポイント（JSON配列、オプショナル）';


