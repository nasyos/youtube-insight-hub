-- published_atとtitleの複合インデックスを追加
-- 重複チェックのパフォーマンス向上のため

-- 複合インデックスを追加（同じチャンネル内で、同じ公開日時とタイトルの動画を高速検索）
CREATE INDEX IF NOT EXISTS idx_summaries_channel_title_published 
ON summaries(channel_id, title, published_at);

-- コメント追加
COMMENT ON INDEX idx_summaries_channel_title_published IS 'チャンネルID、タイトル、公開日時の複合インデックス（重複チェック用）';

