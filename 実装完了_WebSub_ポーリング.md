# WebSub + ポーリング実装完了報告

## ✅ 実装完了項目

### 1. データベーススキーマ

**ファイル**: `supabase-schema-websub.sql`

**追加テーブル**:
- `subscriptions` - WebSub購読情報
- `videos` - YouTube動画メタデータ
- `video_jobs` - 要約ジョブ

**拡張テーブル**:
- `channels` - `channel_id`, `uploads_playlist_id`, `is_enabled`を追加

---

### 2. サービス層

#### YouTube Service
**ファイル**: `services/youtubeService.ts`

**メソッド**:
- `getChannelId(handle)` - チャンネルハンドル → チャンネルID
- `getChannelInfo(channelId)` - チャンネル情報取得
- `getChannelUploadsPlaylist(channelId)` - アップロードプレイリストID取得
- `getChannelVideos(channelId, maxResults)` - 最新動画VIDEO_ID取得（search.list）
- `getPlaylistVideos(playlistId, maxResults)` - プレイリスト動画取得（playlistItems.list）
- `getVideoDetails(videoIds)` - 動画詳細取得（videos.list、最大50件バッチ）
- `subscribeToWebSub(topicUrl, callbackUrl, leaseSeconds)` - WebSub購読

#### WebSub Service
**ファイル**: `services/websubService.ts`

**メソッド**:
- `verifySubscription(mode, topic, challenge)` - 購読検証
- `parseAtomFeed(xml)` - Atom XMLパース、videoId/channelId抽出
- `generateTopicUrl(channelId)` - WebSub topic URL生成
- `generateCallbackUrl(baseUrl)` - WebSub callback URL生成

#### Video Job Service
**ファイル**: `services/videoJobService.ts`

**メソッド**:
- `createJob(videoId)` - 要約ジョブ作成
- `getPendingJobs(limit)` - 保留中ジョブ取得
- `processJob(jobId)` - ジョブ処理（要約生成 → Google Docs作成）

#### Gemini Service拡張
**ファイル**: `services/geminiService.ts`

**追加メソッド**:
- `summarizeVideo(videoUrl, title)` - VIDEO_ID指定で要約生成

---

### 3. APIエンドポイント

#### WebSub Callback
**ファイル**: `api/youtube/websub/callback.ts`
**パス**: `/api/youtube/websub/callback`

**機能**:
- `GET`: 購読検証（hub.challengeを返す）
- `POST`: 通知受信（Atom XMLをパース、videoId抽出、DB保存、要約ジョブ投入）

**セキュリティ**:
- ペイロードサイズ制限（1MB）
- XMLパースの安全性

#### 手動ポーリング
**ファイル**: `api/youtube/poll.ts`
**パス**: `/api/youtube/poll`

**機能**:
- 有効なチャンネルを取得
- 各チャンネルの`uploads_playlist_id`を取得（無い場合は自動取得）
- `playlistItems.list`で最新動画を取得
- 重複チェック
- 新規videoIdを`videos.list`で詳細取得
- 要約ジョブを投入

#### WebSub購読
**ファイル**: `api/youtube/websub/subscribe.ts`
**パス**: `/api/youtube/websub/subscribe`

**機能**:
- チャンネル情報を取得
- WebSub Hubに購読リクエスト送信
- 購読情報をDBに保存

#### WebSub再購読
**ファイル**: `api/youtube/websub/resubscribe.ts`
**パス**: `/api/youtube/websub/resubscribe`

**機能**:
- 期限切れまたは期限間近（24時間以内）の購読を取得
- WebSub Hubに再購読リクエスト送信
- 購読情報を更新

#### 要約ジョブ処理
**ファイル**: `api/youtube/jobs/process.ts`
**パス**: `/api/youtube/jobs/process`

**機能**:
- 保留中のジョブを取得
- 各ジョブを処理（要約生成 → Google Docs作成）
- ステータスを更新

---

## 🔄 処理フロー

### WebSub自動取得フロー

```
1. YouTube → WebSub通知
   POST /api/youtube/websub/callback

2. Atom XMLをパース
   └─→ videoId, channelId抽出

3. 重複チェック（video_idで）
   └─→ videosテーブルで確認

4. 新規の場合
   ├─→ videosテーブルに保存（upsert）
   ├─→ videos.listで詳細取得（必要に応じて）
   └─→ video_jobsテーブルに投入（status=pending）

5. 要約ジョブ処理（非同期）
   POST /api/youtube/jobs/process
   ├─→ Gemini APIで要約生成
   ├─→ Google Docs作成
   └─→ 通知送信（TODO）
```

### 手動ポーリングフロー

```
1. POST /api/youtube/poll

2. 有効なチャンネルを取得
   └─→ channelsテーブル（is_enabled=true）

3. 各チャンネルについて
   ├─→ uploads_playlist_id取得（無い場合は自動取得）
   ├─→ playlistItems.listで最新動画取得
   └─→ 重複チェック

4. 新規videoId
   ├─→ videos.listで詳細取得（バッチ）
   ├─→ videosテーブルに保存
   └─→ video_jobsテーブルに投入
```

---

## 📋 セットアップ手順

### 1. データベースマイグレーション

SupabaseのSQL Editorで`supabase-schema-websub.sql`を実行

### 2. 環境変数の設定

`.env.local`に追加:
```env
VITE_YOUTUBE_API_KEY=your_youtube_api_key
CALLBACK_BASE_URL=https://your-domain.vercel.app  # 本番環境用
```

### 3. 開発サーバーを再起動

```bash
npm run dev
```

---

## 🧪 テスト方法

### 1. WebSub購読

```bash
curl -X POST http://localhost:5173/api/youtube/websub/subscribe \
  -H "Content-Type: application/json" \
  -d '{"channelId": "UCxxxxx"}'
```

### 2. 手動ポーリング

```bash
curl -X POST http://localhost:5173/api/youtube/poll \
  -H "Content-Type: application/json" \
  -d '{"maxResults": 3}'
```

### 3. 要約ジョブ処理

```bash
curl -X POST http://localhost:5173/api/youtube/jobs/process \
  -H "Content-Type: application/json" \
  -d '{"limit": 1}'
```

---

## ⚠️ 注意事項

### 1. Vercel Serverless Functions

- APIエンドポイントは`api/`ディレクトリに配置
- ディレクトリ構造がそのままURLパスになる
- 例: `api/youtube/websub/callback.ts` → `/api/youtube/websub/callback`

### 2. WebSub Callback URL

- **開発環境**: ngrok等を使用してローカルサーバーを公開
- **本番環境**: VercelのURLを使用

### 3. 環境変数

- サーバーサイド（APIエンドポイント）: `process.env`
- クライアントサイド: `import.meta.env.VITE_*`

---

## 🚀 次のステップ

1. **通知機能の実装**
   - Google Chat通知
   - Slack通知
   - Email通知

2. **Vercel Cron Jobsの設定**
   - `vercel.json`にcron設定を追加

3. **エラーハンドリングの強化**
   - リトライ機能
   - エラーログの記録

4. **ダッシュボードの追加**
   - ジョブステータスの表示
   - 購読状況の表示

---

## 📝 まとめ

✅ **WebSub自動取得**: 実装完了
✅ **手動ポーリング**: 実装完了
✅ **要約ジョブ処理**: 実装完了
✅ **DBスキーマ**: 実装完了
✅ **セキュリティ対策**: 実装完了

すべての主要機能が実装されました。次はテストとデプロイです。

