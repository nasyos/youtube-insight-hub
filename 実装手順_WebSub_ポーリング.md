# WebSub + ポーリング実装手順

## 📋 実装完了項目

### ✅ 完了した実装

1. **DBスキーマ**
   - `supabase-schema-websub.sql`を作成
   - `subscriptions`, `videos`, `video_jobs`テーブルを追加
   - `channels`テーブルを拡張

2. **YouTube Service**
   - `services/youtubeService.ts`を作成
   - `getChannelId`, `getChannelInfo`, `getChannelUploadsPlaylist`
   - `getChannelVideos`, `getPlaylistVideos`, `getVideoDetails`
   - `subscribeToWebSub`

3. **WebSub Service**
   - `services/websubService.ts`を作成
   - `verifySubscription`, `parseAtomFeed`
   - `generateTopicUrl`, `generateCallbackUrl`

4. **APIエンドポイント**
   - `api/youtube/websub/callback.ts` - WebSub通知受信
   - `api/youtube/poll.ts` - 手動ポーリング
   - `api/youtube/websub/subscribe.ts` - WebSub購読
   - `api/youtube/websub/resubscribe.ts` - WebSub再購読
   - `api/youtube/jobs/process.ts` - 要約ジョブ処理

5. **Video Job Service**
   - `services/videoJobService.ts`を作成
   - `createJob`, `getPendingJobs`, `processJob`

6. **Gemini Service拡張**
   - `summarizeVideo`メソッドを追加

---

## 🚀 セットアップ手順

### ステップ1: データベースマイグレーション

1. Supabaseダッシュボードにアクセス
2. 「SQL Editor」を開く
3. `supabase-schema-websub.sql`の内容をコピー＆ペースト
4. 「Run」をクリックして実行

### ステップ2: 環境変数の設定

`.env.local`に以下を追加:

```env
# 既存の環境変数
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key

# 新規追加
VITE_YOUTUBE_API_KEY=your_youtube_api_key

# WebSub callback URL（本番環境用）
CALLBACK_BASE_URL=https://your-domain.vercel.app
```

### ステップ3: 開発サーバーを再起動

```bash
npm run dev
```

---

## 📝 使用方法

### 1. チャンネルをWebSubに購読

```bash
POST /api/youtube/websub/subscribe
Content-Type: application/json

{
  "channelId": "UCxxxxx"
}
```

### 2. 手動ポーリング

```bash
POST /api/youtube/poll
Content-Type: application/json

{
  "channelIds": ["UCxxxxx"],  // オプション
  "maxResults": 3  // オプション
}
```

### 3. WebSub再購読

```bash
POST /api/youtube/websub/resubscribe
Content-Type: application/json

{
  "channelId": "UCxxxxx"  // オプション: 指定しない場合は全チャンネル
}
```

### 4. 要約ジョブ処理

```bash
POST /api/youtube/jobs/process
Content-Type: application/json

{
  "limit": 10  // オプション: デフォルト10
}
```

---

## 🔄 自動化（Vercel Cron Jobs）

### vercel.jsonに追加

```json
{
  "crons": [
    {
      "path": "/api/youtube/poll",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/youtube/websub/resubscribe",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/youtube/jobs/process",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**スケジュール説明**:
- `/api/youtube/poll`: 6時間ごと（手動ポーリングの保険）
- `/api/youtube/websub/resubscribe`: 1日1回（WebSub再購読）
- `/api/youtube/jobs/process`: 5分ごと（要約ジョブ処理）

---

## 🧪 テスト手順

### 1. WebSub Callbackのテスト

**ローカル開発環境**:
```bash
# ngrokを使用してローカルサーバーを公開
ngrok http 5173

# WebSub Hubに購読リクエスト
curl -X POST https://pubsubhubbub.appspot.com/subscribe \
  -d "hub.mode=subscribe" \
  -d "hub.topic=https://www.youtube.com/feeds/videos.xml?channel_id=UCxxxxx" \
  -d "hub.callback=https://your-ngrok-url.ngrok.io/api/youtube/websub/callback" \
  -d "hub.lease_seconds=432000"
```

### 2. 手動ポーリングのテスト

```bash
curl -X POST http://localhost:5173/api/youtube/poll \
  -H "Content-Type: application/json" \
  -d '{"maxResults": 3}'
```

### 3. 要約ジョブ処理のテスト

```bash
curl -X POST http://localhost:5173/api/youtube/jobs/process \
  -H "Content-Type: application/json" \
  -d '{"limit": 1}'
```

---

## ⚠️ 注意事項

### 1. WebSub Callback URL

- **開発環境**: `http://localhost:5173/api/youtube/websub/callback`
- **本番環境**: `https://your-domain.vercel.app/api/youtube/websub/callback`
- ngrokを使用する場合は、ngrok URLを設定

### 2. セキュリティ

- WebSub callbackは公開エンドポイントになるため、適切なセキュリティ対策が必要
- ペイロードサイズ制限（1MB）を実装済み
- XMLパースの安全性を考慮

### 3. エラーハンドリング

- 各エンドポイントで適切なエラーハンドリングを実装
- ログを確認して問題を特定

---

## 📊 次のステップ

1. **通知機能の実装**
   - Google Chat通知
   - Slack通知
   - Email通知

2. **ダッシュボードの追加**
   - ジョブステータスの表示
   - 購読状況の表示
   - エラーログの表示

3. **最適化**
   - バッチ処理の最適化
   - キャッシュの活用
   - レート制限の考慮

