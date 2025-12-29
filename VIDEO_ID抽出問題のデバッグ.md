# VIDEO_ID抽出問題のデバッグ

## 🔍 問題の確認

データベースの`video_id`カラムに、正しいVIDEO_ID（11文字の英数字）ではなく、以下のような値が入っています：

- `example1_20`
- `1up_outlook`
- `1up_columbi`
- `mcp_analysi`
- `vibe_coding`
- `scraping_ai`

これらは明らかにYouTubeのVIDEO_IDではありません。

## 🐛 考えられる原因

### 1. Gemini APIが返すURLが正しくない

Gemini APIが返すURLが、YouTubeの標準形式ではない可能性があります。

**例**:
- 正しい形式: `https://www.youtube.com/watch?v=AJfcZpTtqwM`
- 間違った形式: `example1_20` や `1up_outlook`

### 2. `extractVideoId`関数が正しく動作していない

URLが正しくても、`extractVideoId`関数がVIDEO_IDを抽出できていない可能性があります。

### 3. データベースに保存される前に値が変更されている

保存処理のどこかで、VIDEO_IDが別の値に置き換えられている可能性があります。

---

## 🔧 実装した改善

### 1. デバッグログの追加

以下の箇所にログを追加しました：

**`utils/youtubeUtils.ts`**:
- URLをログ出力
- VIDEO_ID抽出の成功/失敗をログ出力

**`services/apiService.ts`**:
- `saveSummary`: URLとVIDEO_IDをログ出力
- `checkVideoExists`: URLとVIDEO_IDをログ出力

**`App.tsx`**:
- Gemini APIが返したURLをログ出力

### 2. Gemini APIのプロンプトを改善

**`services/geminiService.ts`**:
- URLの形式を明示的に指定（`https://www.youtube.com/watch?v=VIDEO_ID`）
- VIDEO_IDが11文字の英数字であることを明記

### 3. `extractVideoId`関数の改善

**`utils/youtubeUtils.ts`**:
- より柔軟なパターンマッチング
- クエリパラメータが複数ある場合にも対応

---

## 📊 デバッグ手順

### 1. 開発サーバーを再起動

```bash
npm run dev
```

### 2. ブラウザの開発者ツールを開く

F12キーを押して、コンソールタブを開きます。

### 3. チャンネルをスキャン

「最新をチェック」ボタンをクリックして、スキャンを実行します。

### 4. コンソールログを確認

以下のログが表示されるはずです：

```
📹 Gemini APIが返した動画: { title: "...", url: "..." }
🔍 extractVideoId: URL = ...
✅ extractVideoId: VIDEO_IDを抽出 = ...
🔍 checkVideoExists: URL = ...
🔍 checkVideoExists: 抽出されたVIDEO_ID = ...
🔍 saveSummary: URL = ...
🔍 saveSummary: 抽出されたVIDEO_ID = ...
```

### 5. 問題の特定

#### ケース1: Gemini APIが返すURLが正しくない

**ログ例**:
```
📹 Gemini APIが返した動画: { title: "...", url: "example1_20" }
⚠️ extractVideoId: VIDEO_IDを抽出できませんでした。URL = example1_20
```

**対処法**:
- Gemini APIのプロンプトを改善（既に実装済み）
- Gemini APIが返すURLを検証して、正しい形式に変換

#### ケース2: `extractVideoId`関数が正しく動作していない

**ログ例**:
```
📹 Gemini APIが返した動画: { title: "...", url: "https://www.youtube.com/watch?v=AJfcZpTtqwM" }
⚠️ extractVideoId: VIDEO_IDを抽出できませんでした。URL = https://www.youtube.com/watch?v=AJfcZpTtqwM
```

**対処法**:
- `extractVideoId`関数のパターンを確認
- 正規表現を修正

#### ケース3: データベースに保存される前に値が変更されている

**ログ例**:
```
✅ extractVideoId: VIDEO_IDを抽出 = AJfcZpTtqwM
🔍 saveSummary: 抽出されたVIDEO_ID = example1_20
```

**対処法**:
- `saveSummary`メソッドの処理を確認
- 保存前にVIDEO_IDが変更されていないか確認

---

## 🎯 次のステップ

1. **デバッグログを確認**
   - コンソールで実際のURLとVIDEO_IDを確認
   - 問題の箇所を特定

2. **問題に応じた修正**
   - Gemini APIが返すURLが正しくない場合: プロンプトを改善
   - `extractVideoId`関数が正しく動作していない場合: 正規表現を修正
   - 保存処理に問題がある場合: `saveSummary`メソッドを修正

3. **既存データの修正**
   - 既存の`video_id`が正しくない場合、`video_url`からVIDEO_IDを抽出して更新

---

## 📝 既存データの修正方法

既存の`video_id`が正しくない場合、以下のSQLで修正できます：

```sql
-- video_urlからVIDEO_IDを抽出して更新
UPDATE summaries
SET video_id = CASE
  WHEN video_url ~ 'youtube\.com/watch\?.*[&?]v=([a-zA-Z0-9_-]{11})' THEN
    (regexp_match(video_url, 'youtube\.com/watch\?.*[&?]v=([a-zA-Z0-9_-]{11})'))[1]
  WHEN video_url ~ 'youtu\.be/([a-zA-Z0-9_-]{11})' THEN
    (regexp_match(video_url, 'youtu\.be/([a-zA-Z0-9_-]{11})'))[1]
  WHEN video_url ~ 'youtube\.com/embed/([a-zA-Z0-9_-]{11})' THEN
    (regexp_match(video_url, 'youtube\.com/embed/([a-zA-Z0-9_-]{11})'))[1]
  ELSE NULL
END
WHERE video_id IS NULL OR video_id !~ '^[a-zA-Z0-9_-]{11}$';
```

このSQLは、`video_id`がNULLまたは11文字のVIDEO_ID形式でない場合に、`video_url`からVIDEO_IDを抽出して更新します。

---

## ✅ 確認事項

- [ ] デバッグログが正しく表示されているか
- [ ] Gemini APIが返すURLが正しい形式か
- [ ] `extractVideoId`関数が正しくVIDEO_IDを抽出できているか
- [ ] データベースに正しいVIDEO_IDが保存されているか
- [ ] 既存データの`video_id`が正しく更新されているか

