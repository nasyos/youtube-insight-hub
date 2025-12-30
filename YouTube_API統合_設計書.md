# YouTube Data API v3 統合設計書

## 📊 現在の実装フロー

```
┌─────────────────────────────────────────────────────────────┐
│                    現在の実装フロー                          │
└─────────────────────────────────────────────────────────────┘

[App.tsx: scanAllChannels]
    │
    ├─→ [GeminiService.scanChannel]
    │      │
    │      ├─→ Gemini API + Google Search
    │      │      │
    │      │      ├─→ チャンネル検索
    │      │      ├─→ 最新動画3件を検索
    │      │      ├─→ タイトル取得（検索結果から、不正確な可能性）
    │      │      ├─→ URL取得（VIDEO_ID含む）
    │      │      ├─→ 公開日時取得
    │      │      └─→ 要約生成（Gemini AI）
    │      │
    │      └─→ VideoSummaryWithContent[] を返す
    │             - title（不正確な可能性）
    │             - url
    │             - publishedAt
    │             - summary
    │             - keyPoints
    │
    ├─→ 各動画について
    │      │
    │      ├─→ [ApiService.checkVideoExists]
    │      │      └─→ VIDEO_IDで重複チェック
    │      │
    │      ├─→ [GoogleApiService.createSummaryDoc]
    │      │      └─→ Google Docs作成
    │      │
    │      └─→ [ApiService.saveSummary]
    │             └─→ Supabaseに保存
    │
    └─→ 完了

【問題点】
- タイトルが検索結果から取得されるため、不正確
- URLの形式が異なる可能性がある
- 公開日時が不正確な可能性がある
```

---

## 🎯 YouTube Data API v3 統合後のフロー

```
┌─────────────────────────────────────────────────────────────┐
│              YouTube Data API v3 統合後のフロー              │
└─────────────────────────────────────────────────────────────┘

[App.tsx: scanAllChannels]
    │
    ├─→ [YouTubeService.getChannelVideos]
    │      │
    │      ├─→ YouTube Data API v3: channels.list
    │      │      │
    │      │      └─→ チャンネルIDを取得
    │      │             - channel.handle (@example) → channelId
    │      │
    │      ├─→ YouTube Data API v3: search.list
    │      │      │
    │      │      └─→ 最新動画のVIDEO_IDリストを取得
    │      │             - channelId指定
    │      │             - order=date（最新順）
    │      │             - maxResults=3
    │      │             - type=video
    │      │
    │      └─→ VIDEO_ID[] を返す
    │
    ├─→ 各VIDEO_IDについて
    │      │
    │      ├─→ [YouTubeService.getVideoDetails]
    │      │      │
    │      │      └─→ YouTube Data API v3: videos.list
    │      │             │
    │      │             └─→ 正確なメタデータを取得
    │      │                    - title（100%正確）
    │      │                    - publishedAt（正確な日時）
    │      │                    - thumbnailUrl（高解像度）
    │      │                    - description
    │      │                    - duration
    │      │                    - viewCount
    │      │
    │      ├─→ [ApiService.checkVideoExists]
    │      │      │
    │      │      └─→ VIDEO_IDで重複チェック（確実）
    │      │
    │      ├─→ [GeminiService.summarizeVideo]
    │      │      │
    │      │      └─→ Gemini APIで要約生成
    │      │             - VIDEO_IDまたはURLを指定
    │      │             - タイトルは既に正確に取得済み
    │      │             - 要約のみを生成
    │      │
    │      ├─→ [GoogleApiService.createSummaryDoc]
    │      │      └─→ Google Docs作成
    │      │
    │      └─→ [ApiService.saveSummary]
    │             └─→ Supabaseに保存
    │                    - title（正確）
    │                    - video_id（正確）
    │                    - published_at（正確）
    │
    └─→ 完了

【メリット】
✅ タイトルが100%正確
✅ VIDEO_IDが確実に取得できる
✅ 公開日時が正確
✅ サムネイルURLが高解像度
✅ 重複チェックが確実
```

---

## 🔧 YouTube Data API v3 でできること

### 1. チャンネル情報の取得

**API**: `channels.list`

**取得できる情報**:
- チャンネルID（`channelId`）
- チャンネル名（`title`）
- 説明文（`description`）
- サブスクライバー数（`subscriberCount`）
- サムネイルURL（`thumbnailUrl`）
- カスタムURL（`customUrl`、@example形式）

**使用例**:
```typescript
// @example → channelId に変換
GET https://www.googleapis.com/youtube/v3/channels
  ?part=snippet,contentDetails
  &forUsername=example
  &key=YOUR_API_KEY
```

### 2. チャンネルの最新動画リスト取得

**API**: `search.list`

**取得できる情報**:
- VIDEO_IDリスト
- タイトル（`title`）
- 説明文（`description`）
- 公開日時（`publishedAt`）
- サムネイルURL（`thumbnailUrl`）
- チャンネル情報

**使用例**:
```typescript
// チャンネルの最新動画3件を取得
GET https://www.googleapis.com/youtube/v3/search
  ?part=snippet
  &channelId=UCxxxxx
  &order=date
  &maxResults=3
  &type=video
  &key=YOUR_API_KEY
```

### 3. 動画の詳細情報取得

**API**: `videos.list`

**取得できる情報**:
- タイトル（`title`）- **100%正確**
- 説明文（`description`）
- 公開日時（`publishedAt`）- **正確な日時**
- サムネイルURL（`thumbnailUrl`）- **高解像度**
- 再生時間（`duration`）
- 再生回数（`viewCount`）
- いいね数（`likeCount`）
- コメント数（`commentCount`）
- タグ（`tags`）
- カテゴリ（`categoryId`）

**使用例**:
```typescript
// VIDEO_IDから詳細情報を取得
GET https://www.googleapis.com/youtube/v3/videos
  ?part=snippet,contentDetails,statistics
  &id=VIDEO_ID1,VIDEO_ID2,VIDEO_ID3
  &key=YOUR_API_KEY
```

---

## 📋 新しいサービス構成

### 1. `services/youtubeService.ts`（新規作成）

```typescript
export class YouTubeService {
  private apiKey: string;
  
  constructor() {
    this.apiKey = (import.meta as any).env?.VITE_YOUTUBE_API_KEY || '';
  }
  
  // チャンネルハンドル（@example）からチャンネルIDを取得
  async getChannelId(handle: string): Promise<string | null> {
    // channels.list API呼び出し
  }
  
  // チャンネルの最新動画のVIDEO_IDリストを取得
  async getChannelVideos(channelId: string, maxResults: number = 3): Promise<string[]> {
    // search.list API呼び出し
    // VIDEO_ID[] を返す
  }
  
  // VIDEO_IDから動画の詳細情報を取得
  async getVideoDetails(videoIds: string[]): Promise<VideoDetails[]> {
    // videos.list API呼び出し
    // 正確なメタデータを返す
  }
}
```

### 2. `services/geminiService.ts`（修正）

```typescript
export class GeminiService {
  // 既存のscanChannelメソッドを削除または非推奨化
  
  // 新しいメソッド: VIDEO_IDまたはURLを指定して要約を生成
  async summarizeVideo(videoUrl: string, title: string): Promise<{
    summary: string;
    keyPoints: string[];
  }> {
    // VIDEO_IDまたはURLを指定
    // タイトルは既に正確に取得済み
    // 要約のみを生成
  }
}
```

### 3. `App.tsx`（修正）

```typescript
const scanAllChannels = async () => {
  for (const channel of channels) {
    // 1. YouTube Data API v3で最新動画のVIDEO_IDを取得
    const channelId = await youtubeService.getChannelId(channel.handle);
    const videoIds = await youtubeService.getChannelVideos(channelId, 3);
    
    // 2. 各VIDEO_IDの詳細情報を取得
    const videoDetails = await youtubeService.getVideoDetails(videoIds);
    
    for (const video of videoDetails) {
      // 3. 重複チェック（VIDEO_IDで確実）
      const exists = await api.current.checkVideoExists(video.url);
      if (exists) continue;
      
      // 4. Gemini APIで要約生成
      const { summary, keyPoints } = await gemini.current.summarizeVideo(
        video.url,
        video.title
      );
      
      // 5. Google Docs作成
      const docUrl = await googleApi.current.createSummaryDoc({
        ...video,
        summary,
        keyPoints
      });
      
      // 6. データベース保存
      await api.current.saveSummary({
        ...video,
        docUrl,
        summary,
        keyPoints
      });
    }
  }
};
```

---

## 🔑 必要なAPIキー

### YouTube Data API v3

1. **Google Cloud Console**でプロジェクトを選択
2. **APIとサービス** → **ライブラリ**
3. **YouTube Data API v3**を検索して有効化
4. **認証情報** → **APIキーを作成**
5. `.env.local`に追加:
   ```
   VITE_YOUTUBE_API_KEY=your_youtube_api_key
   ```

### APIクォータ

- **デフォルト**: 1日10,000ユニット
- **search.list**: 100ユニット/リクエスト
- **videos.list**: 1ユニット/リクエスト
- **channels.list**: 1ユニット/リクエスト

**計算例**:
- チャンネル3件 × 動画3件 = 9動画
- `search.list`: 3リクエスト × 100 = 300ユニット
- `videos.list`: 9リクエスト × 1 = 9ユニット
- **合計**: 約309ユニット/スキャン

**1日10,000ユニット**で約**32回スキャン可能**

---

## 📊 データフロー図

```
┌─────────────────────────────────────────────────────────────┐
│                     データフロー                             │
└─────────────────────────────────────────────────────────────┘

[チャンネル追加]
    │
    └─→ YouTubeService.getChannelId(@example)
            └─→ YouTube Data API v3: channels.list
                    └─→ channelId を取得
                            └─→ Supabaseに保存

[スキャン実行]
    │
    ├─→ YouTubeService.getChannelVideos(channelId)
    │      └─→ YouTube Data API v3: search.list
    │              └─→ VIDEO_ID[] を取得
    │
    ├─→ YouTubeService.getVideoDetails(VIDEO_ID[])
    │      └─→ YouTube Data API v3: videos.list
    │              └─→ 正確なメタデータを取得
    │                      - title（正確）
    │                      - publishedAt（正確）
    │                      - thumbnailUrl（高解像度）
    │
    ├─→ ApiService.checkVideoExists(VIDEO_ID)
    │      └─→ Supabase: video_idで重複チェック
    │
    ├─→ GeminiService.summarizeVideo(VIDEO_ID, title)
    │      └─→ Gemini API: 要約生成
    │              └─→ summary, keyPoints
    │
    ├─→ GoogleApiService.createSummaryDoc(...)
    │      └─→ Google Docs API: ドキュメント作成
    │
    └─→ ApiService.saveSummary(...)
            └─→ Supabase: 保存
                    - video_id（正確）
                    - title（正確）
                    - published_at（正確）
```

---

## 🎯 実装の優先順位

### フェーズ1: YouTube Data API v3の統合（必須）

1. **`services/youtubeService.ts`を作成**
   - `getChannelId`: チャンネルハンドル → チャンネルID
   - `getChannelVideos`: チャンネルID → VIDEO_IDリスト
   - `getVideoDetails`: VIDEO_ID → 正確なメタデータ

2. **`services/geminiService.ts`を修正**
   - `scanChannel`を削除または非推奨化
   - `summarizeVideo`を追加（VIDEO_IDまたはURLを指定）

3. **`App.tsx`を修正**
   - `scanAllChannels`を新しいフローに変更

### フェーズ2: チャンネル追加の改善（オプション）

1. **`services/geminiService.ts`の`findChannel`を修正**
   - YouTube Data API v3を使用してチャンネル情報を取得

---

## 📝 まとめ

### 現在の問題
- タイトルが不正確（検索結果から取得）
- URLの形式が異なる可能性
- 公開日時が不正確な可能性

### YouTube Data API v3統合後の改善
- ✅ タイトルが100%正確
- ✅ VIDEO_IDが確実に取得できる
- ✅ 公開日時が正確
- ✅ サムネイルURLが高解像度
- ✅ 重複チェックが確実

### 必要な作業
1. YouTube Data API v3のAPIキーを取得
2. `services/youtubeService.ts`を作成
3. `services/geminiService.ts`を修正
4. `App.tsx`を修正

