-- 既存データのVIDEO_IDを更新するSQLスクリプト
-- SupabaseのSQL Editorで実行してください

-- 既存のvideo_urlからVIDEO_IDを抽出して更新
-- 各URL形式に対して個別にUPDATE文を実行（より確実な方法）

-- 1. https://www.youtube.com/watch?v=VIDEO_ID または &v=VIDEO_ID 形式
UPDATE summaries
SET video_id = (regexp_match(video_url, '[?&]v=([a-zA-Z0-9_-]{11})'))[1]
WHERE video_id IS NULL 
  AND video_url ~ '[?&]v=[a-zA-Z0-9_-]{11}';

-- 2. https://youtu.be/VIDEO_ID 形式
UPDATE summaries
SET video_id = (regexp_match(video_url, 'youtu\.be/([a-zA-Z0-9_-]{11})'))[1]
WHERE video_id IS NULL 
  AND video_url ~ 'youtu\.be/[a-zA-Z0-9_-]{11}';

-- 3. https://www.youtube.com/embed/VIDEO_ID 形式
UPDATE summaries
SET video_id = (regexp_match(video_url, 'youtube\.com/embed/([a-zA-Z0-9_-]{11})'))[1]
WHERE video_id IS NULL 
  AND video_url ~ 'youtube\.com/embed/[a-zA-Z0-9_-]{11}';

-- 4. https://www.youtube.com/v/VIDEO_ID 形式
UPDATE summaries
SET video_id = (regexp_match(video_url, 'youtube\.com/v/([a-zA-Z0-9_-]{11})'))[1]
WHERE video_id IS NULL 
  AND video_url ~ 'youtube\.com/v/[a-zA-Z0-9_-]{11}';

-- 5. https://m.youtube.com/watch?v=VIDEO_ID 形式
UPDATE summaries
SET video_id = (regexp_match(video_url, 'm\.youtube\.com/watch\?.*[&?]v=([a-zA-Z0-9_-]{11})'))[1]
WHERE video_id IS NULL 
  AND video_url ~ 'm\.youtube\.com/watch\?.*[&?]v=[a-zA-Z0-9_-]{11}';

-- 更新結果を確認
SELECT 
  COUNT(*) as total_records,
  COUNT(video_id) as records_with_video_id,
  COUNT(*) - COUNT(video_id) as records_without_video_id
FROM summaries;

-- video_idがNULLのレコードを確認（問題があるURL）
SELECT id, video_url, video_id
FROM summaries
WHERE video_id IS NULL
ORDER BY created_at DESC
LIMIT 20;

