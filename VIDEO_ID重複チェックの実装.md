# VIDEO_ID重複チェックの実装

## 📋 実装内容

URLの形式が異なる場合でも、VIDEO_IDで重複チェックができるように改善しました。

### 問題点

- YouTubeのURLには複数の形式がある（`youtube.com/watch?v=`, `youtu.be/`, など）
- 同じ動画でもURLの形式が異なると、重複と判定されない
- タイトルで一意にすることはできない（同じタイトルの動画が複数存在する可能性がある）

### 解決策

**VIDEO_IDで重複チェック**:
- YouTubeのVIDEO_IDは11文字の一意な識別子
- URLの形式に関係なく、VIDEO_IDで確実に重複を検出できる

---

## 🔧 実装した変更

### 1. YouTube URLユーティリティ関数の追加

**`utils/youtubeUtils.ts`**（新規作成）:

```typescript
export function extractVideoId(url: string): string | null {
  // YouTube URLからVIDEO_IDを抽出
  // 複数のURL形式に対応
}
```

**対応するURL形式**:
- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/embed/VIDEO_ID`
- `https://www.youtube.com/v/VIDEO_ID`
- `https://m.youtube.com/watch?v=VIDEO_ID`

### 2. 重複チェックの改善

**`services/apiService.ts`の`checkVideoExists`メソッド**:

```typescript
async checkVideoExists(videoUrl: string): Promise<boolean> {
  // 1. URLからVIDEO_IDを抽出
  const videoId = extractVideoId(videoUrl);
  
  // 2. VIDEO_IDでデータベースを検索
  // 3. 見つからない場合、既存データのvideo_urlからVIDEO_IDを抽出して比較
}
```

**チェックの優先順位**:
1. `video_id`カラムで直接検索（最速）
2. `video_url`カラムで検索（フォールバック）
3. 既存データの`video_url`からVIDEO_IDを抽出して比較（最終手段）

### 3. データベーススキーマの更新

**`supabase-schema.sql`**:

```sql
CREATE TABLE IF NOT EXISTS summaries (
  ...
  video_url VARCHAR NOT NULL,  -- UNIQUE制約を削除
  video_id VARCHAR UNIQUE,  -- VIDEO_ID（11文字、重複チェック用）
  ...
);

CREATE INDEX IF NOT EXISTS idx_summaries_video_id ON summaries(video_id);
```

**変更点**:
- `video_id`カラムを追加（UNIQUE制約付き）
- `video_url`のUNIQUE制約を削除（VIDEO_IDで重複チェックするため）
- `video_id`にインデックスを追加（高速検索用）

### 4. 保存処理の改善

**`services/apiService.ts`の`saveSummary`メソッド**:

```typescript
async saveSummary(summary: VideoSummary): Promise<VideoSummary> {
  // 1. VIDEO_IDを抽出
  const videoId = extractVideoId(summary.url);
  
  // 2. VIDEO_IDで重複チェック
  // 3. 既存データがあれば更新、なければ新規作成
  // 4. video_idカラムも保存
}
```

---

## 📊 データベースの更新手順

### 1. 既存テーブルに`video_id`カラムを追加

SupabaseのSQL Editorで以下を実行:

```sql
-- video_idカラムを追加
ALTER TABLE summaries 
  ADD COLUMN IF NOT EXISTS video_id VARCHAR;

-- UNIQUE制約を追加
CREATE UNIQUE INDEX IF NOT EXISTS idx_summaries_video_id_unique 
ON summaries(video_id) 
WHERE video_id IS NOT NULL;

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_summaries_video_id ON summaries(video_id);
```

### 2. 既存データの`video_id`を更新

既存の`video_url`からVIDEO_IDを抽出して更新:

```sql
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
  ELSE NULL
END
WHERE video_id IS NULL;
```

**または、`supabase-schema-update-video-id.sql`ファイルの内容を実行してください。**

---

## ✅ 動作確認

### 1. 重複チェックの確認

1. 開発サーバーを再起動
2. チャンネルを追加して「最新をチェック」を実行
3. コンソールで以下を確認:
   ```
   ⏭️ スキップ: 既に取得済みの動画 "タイトル"
   ```
4. 同じ動画が重複して保存されないことを確認

### 2. データベースの確認

Supabaseのダッシュボードで以下を確認:

```sql
-- video_idが正しく設定されているか確認
SELECT video_id, video_url, title 
FROM summaries 
WHERE video_id IS NOT NULL
LIMIT 10;

-- 重複がないか確認
SELECT video_id, COUNT(*) 
FROM summaries 
WHERE video_id IS NOT NULL
GROUP BY video_id 
HAVING COUNT(*) > 1;
```

---

## 🎯 メリット

1. **確実な重複検出**: URLの形式が異なっても、VIDEO_IDで確実に重複を検出
2. **高速検索**: `video_id`カラムにインデックスがあるため、高速に検索可能
3. **データ整合性**: UNIQUE制約により、データベースレベルでも重複を防止
4. **後方互換性**: 既存の`video_url`での検索もフォールバックとして機能

---

## ⚠️ 注意事項

### 1. データベースの更新が必要

- 既存のテーブルに`video_id`カラムを追加する必要があります
- 既存データの`video_id`を更新する必要があります

### 2. 既存データの移行

- 既存の`video_url`からVIDEO_IDを抽出して`video_id`を設定します
- 一部のURL形式ではVIDEO_IDを抽出できない場合があります（その場合は`video_url`でフォールバック）

### 3. パフォーマンス

- `video_id`カラムにインデックスがあるため、検索は高速です
- 既存データが多い場合、初回のVIDEO_ID抽出には時間がかかる場合があります

---

## 📝 まとめ

- ✅ VIDEO_IDで重複チェックを実装
- ✅ 複数のURL形式に対応
- ✅ データベーススキーマを更新
- ✅ 既存データの移行スクリプトを提供

これにより、URLの形式が異なっても、確実に重複を検出できるようになりました。


