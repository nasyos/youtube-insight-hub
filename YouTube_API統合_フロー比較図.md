# YouTube Data API v3 統合 - フロー比較図

## 🔄 現在の実装 vs 新しい実装

### 現在の実装（Gemini API + Google Search）

```
┌─────────────────────────────────────────────────────────────┐
│                   現在の実装フロー                           │
└─────────────────────────────────────────────────────────────┘

[ユーザー] 「最新をチェック」ボタンをクリック
    │
    ▼
[App.tsx] scanAllChannels()
    │
    ▼
[GeminiService] scanChannel(channel)
    │
    ├─→ Gemini API + Google Search
    │      │
    │      ├─→ チャンネル「@example」を検索
    │      │      └─→ 検索結果から情報を取得
    │      │
    │      ├─→ 最新動画3件を検索
    │      │      └─→ 検索結果から情報を取得
    │      │
    │      └─→ 要約生成（Gemini AI）
    │             └─→ JSON形式で返す
    │                    {
    │                      title: "動画タイトル",      ← 不正確な可能性
    │                      url: "https://...",         ← 形式が異なる可能性
    │                      publishedAt: "2025-01-01", ← 不正確な可能性
    │                      summary: "...",
    │                      keyPoints: [...]
    │                    }
    │
    ▼
[各動画について処理]
    │
    ├─→ [ApiService] checkVideoExists(url)
    │      └─→ VIDEO_IDで重複チェック
    │             └─→ 見つからない場合、タイトル（最初の10文字）でチェック
    │
    ├─→ [GoogleApiService] createSummaryDoc(...)
    │      └─→ Google Docs作成
    │
    └─→ [ApiService] saveSummary(...)
           └─→ Supabaseに保存
                  - title（不正確な可能性）
                  - video_id（抽出できれば正確）
                  - published_at（不正確な可能性）

【問題点】
❌ タイトルが検索結果から取得されるため、不正確
❌ URLの形式が異なる可能性がある
❌ 公開日時が不正確な可能性がある
❌ タイトルでの重複チェックが不確実
```

---

### 新しい実装（YouTube Data API v3 + Gemini API）

```
┌─────────────────────────────────────────────────────────────┐
│              YouTube Data API v3 統合後のフロー            │
└─────────────────────────────────────────────────────────────┘

[ユーザー] 「最新をチェック」ボタンをクリック
    │
    ▼
[App.tsx] scanAllChannels()
    │
    ▼
[YouTubeService] getChannelId(channel.handle)
    │
    └─→ YouTube Data API v3: channels.list
           └─→ @example → channelId (UCxxxxx)
                  {
                    id: "UCxxxxx",
                    snippet: {
                      title: "チャンネル名",
                      customUrl: "@example"
                    }
                  }
    │
    ▼
[YouTubeService] getChannelVideos(channelId, maxResults=3)
    │
    └─→ YouTube Data API v3: search.list
           └─→ 最新動画のVIDEO_IDリストを取得
                  [
                    { videoId: "VIDEO_ID1" },
                    { videoId: "VIDEO_ID2" },
                    { videoId: "VIDEO_ID3" }
                  ]
    │
    ▼
[YouTubeService] getVideoDetails(videoIds)
    │
    └─→ YouTube Data API v3: videos.list
           └─→ 正確なメタデータを取得
                  [
                    {
                      id: "VIDEO_ID1",
                      snippet: {
                        title: "動画タイトル",        ← 100%正確
                        publishedAt: "2025-01-01T...", ← 正確な日時
                        thumbnails: {
                          high: { url: "..." }        ← 高解像度
                        },
                        description: "..."
                      },
                      statistics: {
                        viewCount: "12345",
                        likeCount: "678"
                      }
                    },
                    ...
                  ]
    │
    ▼
[各動画について処理]
    │
    ├─→ [ApiService] checkVideoExists(videoId)
    │      └─→ VIDEO_IDで重複チェック（確実）
    │             └─→ 見つかった場合、スキップ
    │
    ├─→ [GeminiService] summarizeVideo(videoUrl, title)
    │      │
    │      └─→ Gemini API: 要約生成
    │             └─→ VIDEO_IDまたはURLを指定
    │                    └─→ タイトルは既に正確に取得済み
    │                           {
    │                             summary: "...",
    │                             keyPoints: [...]
    │                           }
    │
    ├─→ [GoogleApiService] createSummaryDoc(...)
    │      └─→ Google Docs作成
    │
    └─→ [ApiService] saveSummary(...)
           └─→ Supabaseに保存
                  - title（100%正確）
                  - video_id（確実に正確）
                  - published_at（正確な日時）

【メリット】
✅ タイトルが100%正確（YouTube公式APIから取得）
✅ VIDEO_IDが確実に取得できる
✅ 公開日時が正確（ISO 8601形式）
✅ サムネイルURLが高解像度
✅ 重複チェックが確実（VIDEO_IDのみで十分）
✅ タイトルでの重複チェックが不要
```

---

## 📊 処理の比較

### 現在の実装

```
┌──────────────┐
│  Gemini API  │
│  + Search    │
└──────┬───────┘
       │
       ├─→ チャンネル検索
       ├─→ 動画検索
       ├─→ タイトル取得（不正確）
       ├─→ URL取得（形式が異なる可能性）
       ├─→ 公開日時取得（不正確な可能性）
       └─→ 要約生成
```

### 新しい実装

```
┌──────────────────┐      ┌──────────────┐
│ YouTube Data API │      │  Gemini API  │
│      v3          │      │              │
└────────┬─────────┘      └──────┬───────┘
         │                        │
         ├─→ チャンネルID取得      │
         ├─→ 動画リスト取得        │
         ├─→ メタデータ取得        │
         │   （100%正確）          │
         │                        │
         └────────────────────────┼─→ 要約生成
                                  │   （VIDEO_ID指定）
                                  │
                                  └─→ 要約のみ生成
```

---

## 🔑 重要な違い

### 1. メタデータの取得方法

| 項目 | 現在（Gemini + Search） | 新しい（YouTube API v3） |
|------|------------------------|-------------------------|
| タイトル | 検索結果から取得（不正確） | YouTube APIから取得（100%正確） |
| VIDEO_ID | URLから抽出（失敗する可能性） | APIから直接取得（確実） |
| 公開日時 | 検索結果から取得（不正確） | APIから取得（正確な日時） |
| サムネイル | プレースホルダー | 高解像度のサムネイル |

### 2. 重複チェック

| 項目 | 現在 | 新しい |
|------|------|--------|
| 主な方法 | VIDEO_ID（抽出できれば） | VIDEO_ID（確実） |
| フォールバック | タイトル（最初の10文字）+ 公開日時 | 不要（VIDEO_IDのみで十分） |
| 確実性 | 中 | 高 |

### 3. API使用量

| 項目 | 現在 | 新しい |
|------|------|--------|
| Gemini API | 1回/チャンネル（要約生成含む） | 1回/動画（要約生成のみ） |
| YouTube API | 0回 | 3回/チャンネル（channels.list, search.list, videos.list） |
| クォータ | Gemini APIのクォータ | YouTube APIのクォータ（1日10,000ユニット） |

---

## 🎯 実装後の期待される改善

1. **タイトルの正確性**: 100%正確なタイトルを取得
2. **重複チェックの確実性**: VIDEO_IDのみで確実に重複を検出
3. **データの整合性**: すべてのメタデータが正確
4. **ユーザー体験**: より信頼性の高い情報を提供

