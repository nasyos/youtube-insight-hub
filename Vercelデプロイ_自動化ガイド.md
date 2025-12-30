# Vercelデプロイ & 自動化ガイド

## 📊 現在の実装状況

### ✅ 完了している項目

1. **APIエンドポイント実装**
   - ✅ `/api/youtube/websub/callback` - WebSub通知受信
   - ✅ `/api/youtube/poll` - 手動ポーリング
   - ✅ `/api/youtube/websub/subscribe` - WebSub購読
   - ✅ `/api/youtube/websub/resubscribe` - WebSub再購読
   - ✅ `/api/youtube/jobs/process` - 要約ジョブ処理

2. **データベーススキーマ**
   - ✅ `channels`, `subscriptions`, `videos`, `video_jobs`テーブル作成済み

3. **サービス層**
   - ✅ `YouTubeService`, `WebSubService`, `VideoJobService`実装済み

4. **Cron設定**
   - ✅ `vercel.json`にCron設定済み

### ⚠️ 未完了項目

1. **環境変数の設定（Vercel上）**
2. **Vercelへのデプロイ**
3. **動作テスト**

---

## 🤔 Vercelにデプロイする必要性

### **必須な理由**

#### 1. **WebSub Callback URLの要件**
- **問題**: WebSubはYouTubeから**公開URL**に通知を送信します
- **ローカル環境**: `http://localhost:5173`は外部からアクセスできません
- **解決策**: Vercelにデプロイして、`https://your-app.vercel.app/api/youtube/websub/callback`のような公開URLを取得

#### 2. **Cronジョブの自動実行**
- **問題**: ローカル環境では、PCが起動している間しか動作しません
- **Vercel Cron**: 24時間365日、自動的にスケジュール実行されます
- **設定済みのCron**:
  - `/api/youtube/poll`: 6時間ごと（手動ポーリングの保険）
  - `/api/youtube/websub/resubscribe`: 1日1回（WebSub再購読）
  - `/api/youtube/jobs/process`: 5分ごと（要約ジョブ処理）

#### 3. **常時稼働の必要性**
- YouTubeの新着動画は**リアルタイム**で検知する必要があります
- ローカル環境では、PCを常時起動し続ける必要があります
- Vercelなら、サーバーレスで自動的に動作します

---

## 🔄 Vercel Cron Jobsの仕組み

### **原理**

```
┌─────────────────────────────────────────┐
│  Vercel Cron Scheduler                  │
│  (vercel.jsonの設定を読み込み)          │
└─────────────────────────────────────────┘
              │
              │ スケジュールに従って
              ▼
┌─────────────────────────────────────────┐
│  APIエンドポイントを呼び出し            │
│  (例: /api/youtube/poll)                │
└─────────────────────────────────────────┘
              │
              │ HTTPリクエスト
              ▼
┌─────────────────────────────────────────┐
│  Serverless Function実行                 │
│  (api/youtube/poll.ts)                  │
└─────────────────────────────────────────┘
              │
              │ 処理結果
              ▼
┌─────────────────────────────────────────┐
│  データベース更新 / 外部API呼び出し      │
└─────────────────────────────────────────┘
```

### **vercel.jsonの設定**

```json
{
  "crons": [
    {
      "path": "/api/youtube/poll",
      "schedule": "0 */6 * * *"  // 6時間ごと
    },
    {
      "path": "/api/youtube/websub/resubscribe",
      "schedule": "0 0 * * *"     // 1日1回（午前0時）
    },
    {
      "path": "/api/youtube/jobs/process",
      "schedule": "*/5 * * * *"   // 5分ごと
    }
  ]
}
```

### **Cron式の説明**

| スケジュール | 意味 | 例 |
|------------|------|-----|
| `0 */6 * * *` | 6時間ごと（0時、6時、12時、18時） | `/api/youtube/poll` |
| `0 0 * * *` | 毎日午前0時 | `/api/youtube/websub/resubscribe` |
| `*/5 * * * *` | 5分ごと | `/api/youtube/jobs/process` |

**Cron式の形式**: `分 時 日 月 曜日`

---

## 🚀 Vercelデプロイ手順

### **ステップ1: Vercelアカウント作成**

1. [Vercel](https://vercel.com)にアクセス
2. GitHubアカウントでログイン
3. プロジェクトをインポート（GitHubリポジトリから）

### **ステップ2: 環境変数の設定**

Vercelダッシュボードで、以下の環境変数を設定：

```
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# YouTube API
YOUTUBE_API_KEY=your_youtube_api_key

# Gemini API
GEMINI_API_KEY=your_gemini_api_key

# WebSub Callback URL（デプロイ後に設定）
CALLBACK_BASE_URL=https://your-app.vercel.app
```

**設定方法**:
1. Vercelダッシュボード → プロジェクト → Settings → Environment Variables
2. 各環境変数を追加（Production, Preview, Developmentすべてに設定）

### **ステップ3: デプロイ**

#### **方法1: GitHub連携（推奨）**

1. GitHubリポジトリをVercelに接続
2. 自動的にデプロイが開始されます
3. デプロイ完了後、`https://your-app.vercel.app`が利用可能

#### **方法2: Vercel CLI**

```bash
# Vercel CLIをインストール
npm i -g vercel

# ログイン
vercel login

# デプロイ
vercel

# 本番環境にデプロイ
vercel --prod
```

### **ステップ4: WebSub Callback URLの更新**

デプロイ後、実際のURLを取得して設定：

1. デプロイ完了後、`https://your-app.vercel.app`を確認
2. Vercelダッシュボードで環境変数`CALLBACK_BASE_URL`を更新
3. 再デプロイ（環境変数変更後は自動再デプロイされる場合あり）

---

## 🧪 テスト手順

### **ローカル環境でのテスト**

#### **1. 手動ポーリングのテスト**

```bash
curl -X POST http://localhost:5173/api/youtube/poll \
  -H "Content-Type: application/json" \
  -d '{"maxResults": 3}'
```

#### **2. 要約ジョブ処理のテスト**

```bash
curl -X POST http://localhost:5173/api/youtube/jobs/process \
  -H "Content-Type: application/json" \
  -d '{"limit": 1}'
```

#### **3. WebSub Callbackのテスト（ngrok使用）**

**注意**: WebSubは公開URLが必要なため、ローカル環境ではngrokを使用します。

```bash
# ngrokを起動（別ターミナル）
ngrok http 5173

# ngrok URLを取得（例: https://abc123.ngrok.io）
# WebSub Hubに購読リクエスト
curl -X POST https://pubsubhubbub.appspot.com/subscribe \
  -d "hub.mode=subscribe" \
  -d "hub.topic=https://www.youtube.com/feeds/videos.xml?channel_id=UCxxxxx" \
  -d "hub.callback=https://abc123.ngrok.io/api/youtube/websub/callback" \
  -d "hub.lease_seconds=432000"
```

### **Vercelデプロイ後のテスト**

#### **1. 手動ポーリング**

```bash
curl -X POST https://your-app.vercel.app/api/youtube/poll \
  -H "Content-Type: application/json" \
  -d '{"maxResults": 3}'
```

#### **2. WebSub購読**

```bash
curl -X POST https://your-app.vercel.app/api/youtube/websub/subscribe \
  -H "Content-Type: application/json" \
  -d '{"channelId": "UCxxxxx"}'
```

#### **3. Cronジョブの確認**

Vercelダッシュボード → プロジェクト → Cron Jobs で実行履歴を確認

---

## 📋 次のステップ（優先順位順）

### **優先度: 高**

1. ✅ **Vercelにデプロイ**
   - 環境変数を設定
   - デプロイ実行
   - WebSub Callback URLを確認

2. ✅ **動作テスト**
   - 手動ポーリングのテスト
   - WebSub購読のテスト
   - Cronジョブの動作確認

### **優先度: 中**

3. **通知機能の実装**
   - Slack通知
   - LINE通知
   - Email通知

4. **ダッシュボードの追加**
   - ジョブステータスの表示
   - 購読状況の表示
   - エラーログの表示

### **優先度: 低**

5. **最適化**
   - バッチ処理の最適化
   - キャッシュの活用
   - レート制限の考慮

---

## ⚠️ 注意事項

### **1. 環境変数の管理**

- **ローカル**: `.env.local`ファイル（Gitにコミットしない）
- **Vercel**: ダッシュボードで設定（暗号化されて保存）

### **2. WebSub Callback URL**

- **開発環境**: ngrokを使用（一時的）
- **本番環境**: VercelのURLを使用（永続的）

### **3. Cronジョブの実行時間**

- Vercelの無料プランでもCronジョブは利用可能
- 実行時間に制限がある場合あり（詳細はVercelのドキュメントを確認）

### **4. APIクォータ**

- YouTube Data API: 1日10,000ユニット（デフォルト）
- Gemini API: 利用プランに応じて制限あり
- レート制限を考慮した実装が必要

---

## 🔗 参考リンク

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [YouTube Data API v3](https://developers.google.com/youtube/v3)
- [WebSub (PubSubHubbub)](https://www.w3.org/TR/websub/)

