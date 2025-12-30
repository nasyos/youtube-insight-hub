# VIDEO_ID未登録問題の原因と修正

## 🔍 問題の概要

VIDEO_IDがデータベースに登録されていないため、同じ動画の要約が重複して作成されていました。

---

## 📋 原因の分析

### 1. **主な原因: `api/summaries.ts`でVIDEO_IDが処理されていなかった**

**問題点**:
- `api/summaries.ts`（Vercel Serverless Function）でVIDEO_IDの抽出と保存が全く実装されていなかった
- 重複チェックも`video_url`のみで行っていた
- `video_id`カラムが全く使われていなかった

**影響**:
- APIエンドポイント経由で保存される場合、VIDEO_IDが保存されない
- 重複チェックが不正確になり、同じ動画が重複して保存される

### 2. **`services/apiService.ts`との不整合**

**状況**:
- `services/apiService.ts`では、`USE_DIRECT_SUPABASE`が`true`の場合はVIDEO_IDを正しく処理していた
- しかし、`USE_DIRECT_SUPABASE`が`false`の場合（APIエンドポイントを使用する場合）、VIDEO_IDが処理されなかった

**なぜこの問題が発生したか**:
- ローカル開発では`USE_DIRECT_SUPABASE`が`true`になる可能性が高い
- しかし、本番環境（Vercel）や特定の環境では`false`になる可能性がある
- または、`api/summaries.ts`が使用されている場合、VIDEO_IDが全く処理されない

### 3. **`checkVideoExists`関数の問題**

**問題点**:
- `api/summaries.ts`の`checkVideoExists`関数が`video_url`のみでチェックしていた
- VIDEO_IDベースのチェックが実装されていなかった

---

## ✅ 修正内容

### 1. **`api/summaries.ts`にVIDEO_IDの抽出と保存を追加**

```typescript
// VIDEO_IDを抽出
const videoId = extractVideoId(summary.url);

// 重複チェック（VIDEO_IDでチェック、なければvideo_urlでチェック）
let existingData = null;

if (videoId) {
  // まずvideo_idカラムでチェック
  const { data: dataById } = await supabase
    .from('summaries')
    .select('id')
    .eq('video_id', videoId)
    .maybeSingle();
  
  if (dataById) {
    existingData = dataById;
  }
}

// 新規作成時もVIDEO_IDを保存
if (videoId) {
  insertData.video_id = videoId;
}
```

### 2. **重複チェックをVIDEO_IDベースに変更**

```typescript
// 1. video_idカラムでチェック
// 2. video_urlでチェック（フォールバック）
// 3. 既存データからVIDEO_IDを抽出して比較
```

### 3. **`checkVideoExists`関数をVIDEO_IDベースに変更**

```typescript
export async function checkVideoExists(videoUrl: string): Promise<boolean> {
  const videoId = extractVideoId(videoUrl);
  
  if (videoId) {
    // VIDEO_IDで重複チェック
    const { data: dataById } = await supabase
      .from('summaries')
      .select('id')
      .eq('video_id', videoId)
      .maybeSingle();
    
    if (dataById) {
      return true;
    }
    
    // フォールバック: video_urlからVIDEO_IDを抽出して比較
    // ...
  }
  
  return false;
}
```

### 4. **GETメソッドでも`summary`と`keyPoints`を返すように修正**

```typescript
const summaries: VideoSummary[] = (data || []).map((row) => ({
  // ...
  summary: row.summary || undefined,
  keyPoints: row.key_points ? (Array.isArray(row.key_points) ? row.key_points : JSON.parse(row.key_points)) : undefined,
  // ...
}));
```

---

## 🔧 既存データの修正

### 既存データのVIDEO_IDを更新するSQLスクリプト

`既存データのVIDEO_ID更新.sql`を作成しました。SupabaseのSQL Editorで実行してください。

**実行手順**:
1. Supabaseダッシュボードにアクセス
2. 「SQL Editor」を開く
3. `既存データのVIDEO_ID更新.sql`の内容をコピー＆ペースト
4. 「Run」をクリックして実行

**確認**:
```sql
-- 更新結果を確認
SELECT 
  COUNT(*) as total_records,
  COUNT(video_id) as records_with_video_id,
  COUNT(*) - COUNT(video_id) as records_without_video_id
FROM summaries;
```

---

## 📊 修正後の動作

### 1. **新規保存時**
- VIDEO_IDが自動的に抽出される
- VIDEO_IDがデータベースに保存される
- VIDEO_IDで重複チェックが行われる

### 2. **重複チェック**
- まず`video_id`カラムでチェック
- 見つからない場合、`video_url`でチェック（フォールバック）
- それでも見つからない場合、既存データからVIDEO_IDを抽出して比較

### 3. **既存データの更新**
- 既存データが見つかった場合、VIDEO_IDも更新される
- これにより、VIDEO_IDがNULLの既存データも修正される

---

## 🎯 まとめ

**原因**:
- `api/summaries.ts`でVIDEO_IDが全く処理されていなかった
- 重複チェックが`video_url`のみで行われていた

**修正**:
- `api/summaries.ts`にVIDEO_IDの抽出と保存を追加
- 重複チェックをVIDEO_IDベースに変更
- `checkVideoExists`関数もVIDEO_IDベースに変更

**次のステップ**:
1. 既存データのVIDEO_IDを更新するSQLスクリプトを実行
2. アプリケーションを再起動
3. 新しい動画をスキャンして、VIDEO_IDが正しく保存されることを確認

---

## ⚠️ 注意事項

1. **既存データの修正**: 既存データのVIDEO_IDを更新するSQLスクリプトを実行してください
2. **重複データの確認**: 既に重複して保存されているデータがある場合、手動で削除する必要があるかもしれません
3. **テスト**: 修正後、新しい動画をスキャンして、VIDEO_IDが正しく保存され、重複が発生しないことを確認してください


