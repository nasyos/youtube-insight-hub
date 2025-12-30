# 重複チェック改善 - published_at + title での重複チェック追加

## 🔍 問題の概要

同じ動画でも、Gemini APIが異なるURL形式を返す可能性があり、VIDEO_IDの抽出が失敗すると重複チェックが機能しませんでした。

**例**:
- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/watch?v=VIDEO_ID&feature=share`

これらのURLは同じ動画を指していますが、URLが異なるため、VIDEO_IDの抽出が失敗する可能性があります。

---

## ✅ 解決策

VIDEO_IDでの重複チェックに加えて、**`published_at`と`title`の組み合わせ**でも重複チェックを行うようにしました。

### 重複チェックの優先順位

1. **VIDEO_ID**（最も確実）
   - `video_id`カラムでチェック
   - 見つからない場合、既存データの`video_url`からVIDEO_IDを抽出して比較

2. **published_at + title + channel_id**（フォールバック）
   - 同じチャンネル内で、同じ公開日時とタイトルの動画は重複とみなす
   - 日付は`YYYY-MM-DD`形式に正規化（時刻の精度の問題を回避）

3. **video_url**（最後のフォールバック）
   - URLの完全一致でチェック

---

## 🔧 実装内容

### 1. `services/apiService.ts`

#### `saveSummary`メソッド
- `published_at`と`title`での重複チェックを追加
- 同じチャンネル内で、同じ公開日時とタイトルの動画を検出

#### `checkVideoExists`メソッド
- オプショナルパラメータ`options`を追加（`publishedAt`, `title`, `channelId`）
- VIDEO_IDで見つからない場合、`published_at`と`title`でチェック

### 2. `api/summaries.ts`

#### `handler`関数（POSTメソッド）
- `published_at`と`title`での重複チェックを追加
- 既存データの更新時にVIDEO_IDも更新

#### `checkVideoExists`関数
- オプショナルパラメータ`options`を追加
- VIDEO_IDで見つからない場合、`published_at`と`title`でチェック

### 3. `App.tsx`

#### `scanAllChannels`関数
- `checkVideoExists`呼び出し時に、`publishedAt`, `title`, `channelId`を渡すように変更

---

## 📊 データベースの改善

### 複合インデックスの追加

`published_at_title複合インデックス追加.sql`を作成しました。SupabaseのSQL Editorで実行してください。

```sql
-- 複合インデックスを追加（同じチャンネル内で、同じ公開日時とタイトルの動画を高速検索）
CREATE INDEX IF NOT EXISTS idx_summaries_channel_title_published 
ON summaries(channel_id, title, published_at);
```

**メリット**:
- 重複チェックのパフォーマンスが向上
- 同じチャンネル内での検索が高速化

---

## 🎯 動作の流れ

### 新規動画の保存時

1. **VIDEO_IDでチェック**
   - `video_id`カラムで検索
   - 見つからない場合、既存データの`video_url`からVIDEO_IDを抽出して比較

2. **published_at + title + channel_idでチェック**（フォールバック）
   - 同じチャンネル内で、同じ公開日時とタイトルの動画を検索
   - 見つかった場合、重複として既存データを更新

3. **video_urlでチェック**（最後のフォールバック）
   - URLの完全一致でチェック

4. **新規作成**
   - すべてのチェックで見つからない場合、新規作成

---

## ⚠️ 注意事項

### 1. タイトルの完全一致

- タイトルは完全一致でチェックします
- タイトルが少しでも異なる場合（例：空白の有無、大文字小文字）、重複と判定されません

### 2. 公開日時の正規化

- `published_at`は`YYYY-MM-DD`形式に正規化して比較します
- 時刻の精度の問題を回避するため、日付部分のみで比較します

### 3. チャンネルIDの必須

- `published_at`と`title`での重複チェックには、`channel_id`も必要です
- 異なるチャンネルで同じタイトルと公開日時の動画がある場合を考慮しています

---

## 📝 まとめ

- ✅ **VIDEO_IDでの重複チェック**（最優先）
- ✅ **published_at + title + channel_idでの重複チェック**（フォールバック）
- ✅ **video_urlでの重複チェック**（最後のフォールバック）
- ✅ **複合インデックスの追加**（パフォーマンス向上）

これにより、Gemini APIが異なるURL形式を返しても、同じ動画が重複して保存されることを防げます。

---

## 🚀 次のステップ

1. **データベースにインデックスを追加**
   - `published_at_title複合インデックス追加.sql`を実行

2. **アプリケーションを再起動**
   ```bash
   npm run dev
   ```

3. **テスト**
   - 新しい動画をスキャンして、重複が発生しないことを確認
   - 同じ動画でも、異なるURL形式が返されても重複チェックが機能することを確認

