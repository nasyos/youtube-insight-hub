# YouTube WebSub + ポーリング 実装設計書

## 📋 システム概要

### 目的
特定チャンネルの新着動画を自動（WebSub）と手動（ポーリング）の両方で取得し、要約を作成して通知する。

### アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                   システム全体構成                           │
└─────────────────────────────────────────────────────────────┘

[YouTube]
    │
    ├─→ WebSub通知（自動）
    │      └─→ POST /api/youtube/websub/callback
    │             └─→ Atom XML受信
    │                    └─→ videoId抽出 → DB保存
    │
    └─→ YouTube Data API v3（手動ポーリング）
           └─→ POST /api/youtube/poll
                  └─→ playlistItems.list
                         └─→ videoId取得 → DB保存

[DB: Supabase]
    │
    ├─→ channels（チャンネル情報）
    ├─→ subscriptions（WebSub購読情報）
    ├─→ videos（動画メタデータ）
    └─→ video_jobs（要約ジョブ）

[要約ジョブ]
    │
    ├─→ 新規videoId検知
    ├─→ videos.listで詳細取得
    ├─→ Gemini APIで要約生成
    ├─→ Google Docs作成
    └─→ 通知（Google Chat/Slack等）
```

---

## 🗄️ データベース設計

### 1. channels テーブル（拡張）

```sql
-- 既存のchannelsテーブルを拡張
ALTER TABLE channels 
  ADD COLUMN IF NOT EXISTS channel_id VARCHAR UNIQUE,  -- YouTubeチャンネルID（UCxxxxx）
  ADD COLUMN IF NOT EXISTS uploads_playlist_id VARCHAR,  -- アップロードプレイリストID
  ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT true;  -- 有効/無効フラグ

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_channels_channel_id ON channels(channel_id);
CREATE INDEX IF NOT EXISTS idx_channels_is_enabled ON channels(is_enabled);
```

### 2. subscriptions テーブル（新規）

```sql
CREATE TABLE IF NOT EXISTS subscriptions (
  id VARCHAR PRIMARY KEY,
  channel_id VARCHAR NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  topic_url VARCHAR NOT NULL,  -- WebSub topic URL
  callback_url VARCHAR NOT NULL,  -- WebSub callback URL
  status VARCHAR NOT NULL DEFAULT 'pending',  -- pending/subscribed/expired/failed
  lease_expires_at TIMESTAMP,  -- 購読期限
  last_subscribed_at TIMESTAMP,  -- 最後に購読した日時
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_channel_id ON subscriptions(channel_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_lease_expires_at ON subscriptions(lease_expires_at);
```

### 3. videos テーブル（新規）

```sql
CREATE TABLE IF NOT EXISTS videos (
  video_id VARCHAR PRIMARY KEY,  -- YouTube VIDEO_ID（11文字）
  channel_id VARCHAR NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  published_at TIMESTAMP NOT NULL,
  title VARCHAR NOT NULL,
  description TEXT,
  thumbnail_url VARCHAR,
  duration VARCHAR,  -- ISO 8601形式（PT4M13S等）
  view_count BIGINT,
  like_count BIGINT,
  fetched_at TIMESTAMP DEFAULT NOW(),  -- 取得日時
  source VARCHAR NOT NULL,  -- websub | poll
  event_type VARCHAR NOT NULL DEFAULT 'new_or_update',  -- new_or_update | deleted
  raw_payload JSONB,  -- 生のAPIレスポンスやAtom XML
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_videos_channel_id ON videos(channel_id);
CREATE INDEX IF NOT EXISTS idx_videos_published_at ON videos(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_fetched_at ON videos(fetched_at);
CREATE INDEX IF NOT EXISTS idx_videos_source ON videos(source);
```

### 4. video_jobs テーブル（新規）

```sql
CREATE TABLE IF NOT EXISTS video_jobs (
  id VARCHAR PRIMARY KEY,
  video_id VARCHAR NOT NULL UNIQUE REFERENCES videos(video_id) ON DELETE CASCADE,
  status VARCHAR NOT NULL DEFAULT 'pending',  -- pending | processing | done | failed
  started_at TIMESTAMP,
  finished_at TIMESTAMP,
  error TEXT,
  summary_text TEXT,  -- 要約テキスト（一時保存用）
  key_points JSONB,  -- 重要なポイント（JSON配列）
  doc_url VARCHAR,  -- Google Docs URL
  doc_id VARCHAR,  -- Google Docs ID
  notified_at TIMESTAMP,  -- 通知送信日時
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_jobs_status ON video_jobs(status);
CREATE INDEX IF NOT EXISTS idx_video_jobs_video_id ON video_jobs(video_id);
CREATE INDEX IF NOT EXISTS idx_video_jobs_created_at ON video_jobs(created_at);
```

---

## 🔌 APIエンドポイント設計

### 1. WebSub Callback（GET/POST）

**パス**: `/api/youtube/websub/callback`

#### GET: 購読検証

**リクエスト**:
```
GET /api/youtube/websub/callback
  ?hub.mode=subscribe
  &hub.topic=https://www.youtube.com/feeds/videos.xml?channel_id=UCxxxxx
  &hub.challenge=RANDOM_STRING
  &hub.lease_seconds=432000
```

**レスポンス**:
```
200 OK
hub.challenge（そのまま返す）
```

#### POST: 通知受信

**リクエスト**:
```
POST /api/youtube/websub/callback
Content-Type: application/atom+xml

<?xml version="1.0" encoding="UTF-8"?>
<feed>
  <entry>
    <yt:videoId>VIDEO_ID</yt:videoId>
    <yt:channelId>CHANNEL_ID</yt:channelId>
    ...
  </entry>
</feed>
```

**処理**:
1. XMLをパース
2. `yt:videoId`と`yt:channelId`を抽出
3. 重複チェック（video_idで）
4. DBに保存（upsert）
5. 要約ジョブを投入（新規の場合のみ）

---

### 2. 手動ポーリング

**パス**: `/api/youtube/poll`

**メソッド**: POST

**リクエスト**:
```json
{
  "channelIds": ["channel_id_1", "channel_id_2"],  // オプション: 指定しない場合は全チャンネル
  "maxResults": 3  // オプション: デフォルト3
}
```

**処理**:
1. 有効なチャンネルを取得
2. 各チャンネルの`uploads_playlist_id`を取得
3. `playlistItems.list`で最新動画を取得
4. 重複チェック
5. 新規videoIdをDBに保存
6. `videos.list`で詳細取得
7. 要約ジョブを投入

---

### 3. WebSub購読

**パス**: `/api/youtube/websub/subscribe`

**メソッド**: POST

**リクエスト**:
```json
{
  "channelId": "UCxxxxx"
}
```

**処理**:
1. チャンネル情報を取得
2. WebSub Hubに購読リクエスト送信
3. `subscriptions`テーブルに保存

---

### 4. WebSub再購読

**パス**: `/api/youtube/websub/resubscribe`

**メソッド**: POST

**リクエスト**:
```json
{
  "channelId": "UCxxxxx"  // オプション: 指定しない場合は全チャンネル
}
```

**処理**:
1. 期限切れまたは期限間近の購読を取得
2. WebSub Hubに再購読リクエスト送信
3. `subscriptions`テーブルを更新

---

## 🔧 実装モジュール

### 1. YouTube Service（拡張）

`services/youtubeService.ts`を拡張:

```typescript
export class YouTubeService {
  // 既存メソッド
  async getChannelId(handle: string): Promise<string | null>
  async getChannelVideos(channelId: string, maxResults: number): Promise<string[]>
  async getVideoDetails(videoIds: string[]): Promise<VideoDetails[]>
  
  // 新規メソッド
  async getChannelUploadsPlaylist(channelId: string): Promise<string | null>
  async getPlaylistVideos(playlistId: string, maxResults: number): Promise<string[]>
  async subscribeToWebSub(topicUrl: string, callbackUrl: string, leaseSeconds: number): Promise<boolean>
}
```

### 2. WebSub Service（新規）

`services/websubService.ts`を新規作成:

```typescript
export class WebSubService {
  async verifySubscription(mode: string, topic: string, challenge: string): Promise<string>
  async parseAtomFeed(xml: string): Promise<{ videoId: string; channelId: string }[]>
  async saveVideoFromWebSub(videoId: string, channelId: string, rawPayload: any): Promise<void>
}
```

### 3. Video Job Service（新規）

`services/videoJobService.ts`を新規作成:

```typescript
export class VideoJobService {
  async createJob(videoId: string): Promise<void>
  async processJob(jobId: string): Promise<void>
  async getPendingJobs(limit: number): Promise<VideoJob[]>
}
```

---

## 📊 処理フロー

### WebSub自動取得フロー

```
1. YouTube → WebSub通知
   └─→ POST /api/youtube/websub/callback

2. Atom XMLをパース
   └─→ videoId, channelId抽出

3. 重複チェック
   └─→ videosテーブルでvideo_id確認

4. 新規の場合
   ├─→ videosテーブルに保存
   ├─→ videos.listで詳細取得
   └─→ video_jobsテーブルに投入（status=pending）

5. 要約ジョブ処理（非同期）
   ├─→ Gemini APIで要約生成
   ├─→ Google Docs作成
   └─→ 通知送信
```

### 手動ポーリングフロー

```
1. POST /api/youtube/poll

2. 有効なチャンネルを取得
   └─→ channelsテーブル（is_enabled=true）

3. 各チャンネルについて
   ├─→ uploads_playlist_id取得
   ├─→ playlistItems.listで最新動画取得
   └─→ 重複チェック

4. 新規videoId
   ├─→ videos.listで詳細取得
   ├─→ videosテーブルに保存
   └─→ video_jobsテーブルに投入
```

---

## 🔒 セキュリティ対策

### 1. WebSub Callback

- **ペイロードサイズ制限**: 最大1MB
- **XMLパース**: 外部エンティティ無効化
- **レート制限**: 1秒あたり10リクエストまで

### 2. 重複処理対策

- **video_idユニーク制約**: データベースレベルで保証
- **Upsert使用**: 既存データは更新、新規は挿入
- **並行実行対策**: トランザクション + ロック

---

## 🚀 実装の優先順位

### フェーズ1: 基盤実装（必須）

1. ✅ DBスキーマ作成
2. ✅ YouTube Service拡張
3. ✅ WebSub Service作成
4. ✅ WebSub Callbackエンドポイント（GET/POST）

### フェーズ2: 手動ポーリング（必須）

1. ✅ 手動ポーリングエンドポイント
2. ✅ uploads_playlist_id取得機能

### フェーズ3: 購読管理（必須）

1. ✅ WebSub購読エンドポイント
2. ✅ WebSub再購読エンドポイント

### フェーズ4: 要約ジョブ（必須）

1. ✅ Video Job Service作成
2. ✅ 要約ジョブ処理
3. ✅ 通知機能

---

## 📝 次のステップ

1. DBスキーマのマイグレーション作成
2. YouTube Serviceの拡張
3. WebSub Serviceの実装
4. APIエンドポイントの実装
5. 要約ジョブ処理の実装

