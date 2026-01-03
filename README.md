<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# YouTube Insight Hub

YouTubeチャンネルの最新動画を自動的にチェックし、Gemini AIを使って内容を要約。Googleドキュメント保存とGoogle Chat通知機能を備えたダッシュボードです。

## 特徴

- 🎯 AIによる動画内容の自動要約（Gemini API）
- 📊 構造化されたレポート生成
- ☁️ Googleドライブ連携（自動ドキュメント作成）
- 🔔 リアルタイム通知（WebSub + ポーリング）
- 🤖 自動スケジュール実行（Cronジョブ）
- 🎨 モダンなUI/UX
- 💾 Supabaseによるデータ永続化

## ローカル実行

**前提条件:** Node.js

1. 依存関係のインストール:
   ```bash
   npm install
   ```

2. 環境変数の設定:
   `.env.local`ファイルを作成し、以下の環境変数を設定:
   ```env
   # Gemini API
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_API_KEY=your_gemini_api_key_here
   
   # YouTube Data API v3
   VITE_YOUTUBE_API_KEY=your_youtube_api_key_here
   YOUTUBE_API_KEY=your_youtube_api_key_here
   
   # Supabase
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. アプリケーションの実行:
   ```bash
   npm run dev
   ```

## Vercelへのデプロイ

### 1. Vercelアカウント作成
[Vercel](https://vercel.com)にアクセスし、GitHubアカウントでログイン

### 2. リポジトリの作成
プロジェクトをGitHubにプッシュ:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/your-username/youtube-insight-hub.git
git push -u origin main
```

### 3. Vercelプロジェクトの作成
1. Vercelダッシュボードで「New Project」をクリック
2. GitHubリポジトリをインポート
3. プロジェクト設定:
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (空欄)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 4. 環境変数の設定
Vercelダッシュボードのプロジェクト設定 → Environment Variables で以下を設定:

**必須の環境変数:**
```env
# Gemini API（要約生成用）
VITE_GEMINI_API_KEY=your_actual_gemini_api_key
GEMINI_API_KEY=your_actual_gemini_api_key

# YouTube Data API v3（チャンネル情報・動画メタデータ取得用）
VITE_YOUTUBE_API_KEY=your_youtube_api_key
YOUTUBE_API_KEY=your_youtube_api_key

# Supabase（データベース）
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**注意:** 
- `VITE_`プレフィックス付きの変数はクライアント側でも使用可能
- サーバーレス関数内では`VITE_`なしの変数を使用

### 5. デプロイ
「Deploy」をクリックしてデプロイ開始。数分で完了します。

### 6. カスタムドメイン（オプション）
プロジェクト設定 → Domains から独自ドメインを設定可能

## Google連携設定

デプロイ後に、以下のGoogleサービスを設定してください：

### Google Cloud Console設定
1. [Google Cloud Console](https://console.cloud.google.com)にアクセス
2. 新しいプロジェクト作成または既存プロジェクト選択
3. 「APIとサービス」→「認証情報」→「OAuth 2.0 クライアントIDを作成」
4. アプリケーションタイプ: 「ウェブアプリケーション」
5. 承認済みのJavaScript生成元: `https://your-vercel-domain.vercel.app`
6. 承認済みのリダイレクトURI: `https://your-vercel-domain.vercel.app`

### 必要なAPIの有効化
以下のAPIを有効化してください：

1. **Generative Language API**（Gemini API）
   - 動画要約生成に使用
   - APIキーを作成し、環境変数に設定

2. **YouTube Data API v3**
   - チャンネル情報・動画メタデータ取得に使用
   - APIキーを作成し、環境変数に設定
   - クォータ制限に注意（デフォルト: 10,000ユニット/日）

3. **Google Drive API**
   - ドキュメント作成に使用
   - OAuth 2.0認証が必要

4. **Google Docs API**
   - ドキュメント編集に使用
   - OAuth 2.0認証が必要

## 使用方法

1. **チャンネルを追加**
   - チャンネルハンドル（例: `@KashiwabaraJin`）またはチャンネル名を入力
   - YouTube Data API v3でチャンネル情報を取得
   - チャンネルIDとアップロードプレイリストIDを自動取得

2. **Google連携**
   - Google Client IDを入力してOAuth認証
   - Googleドキュメントへの自動保存を有効化

3. **手動スキャン**
   - 「最新をチェック」をクリック
   - 各チャンネルの最新動画3件を取得
   - Gemini APIで要約を生成
   - Googleドキュメントに自動保存

4. **自動スケジュール実行**
   - WebSubによるリアルタイム通知
   - ポーリング（6時間ごと）によるフォールバック
   - 要約ジョブ処理（1時間ごと）

## システムアーキテクチャ

### データフロー

```
ユーザー入力（チャンネルハンドル）
    ↓
/api/youtube/channel-info（Serverless Function）
    ↓
YouTube Data API v3（forHandle/search.list）
    ↓
チャンネル情報取得（ID, 名前, サムネイル, アップロードプレイリストID）
    ↓
Supabase（channelsテーブルに保存）
    ↓
WebSub購読（リアルタイム通知）またはポーリング（6時間ごと）
    ↓
新着動画検出（videosテーブルに保存）
    ↓
要約ジョブ作成（video_jobsテーブル）
    ↓
Cronジョブ（1時間ごと）で要約ジョブ処理
    ↓
Gemini API（動画要約生成）
    ↓
Google Docs API（ドキュメント作成）
    ↓
Supabase（summariesテーブルに保存）
    ↓
Google Chat通知（オプション）
```

### 主要コンポーネント

1. **フロントエンド（React + Vite）**
   - `App.tsx`: メインUIコンポーネント
   - チャンネル管理、要約表示、Google連携

2. **Serverless Functions（Vercel）**
   - `/api/youtube/channel-info`: チャンネル情報取得
   - `/api/youtube/poll`: ポーリング実行
   - `/api/youtube/jobs/process`: 要約ジョブ処理
   - `/api/channels`: チャンネルCRUD操作
   - `/api/summaries`: 要約CRUD操作

3. **サービス層**
   - `GeminiService`: Gemini API連携（要約生成）
   - `YouTubeService`: YouTube Data API v3連携
   - `GoogleApiService`: Google Docs/Drive API連携
   - `ApiService`: Supabase連携

4. **データベース（Supabase PostgreSQL）**
   - `channels`: チャンネル情報
   - `summaries`: 要約メタデータ
   - `videos`: 動画メタデータ
   - `video_jobs`: 要約ジョブ
   - `subscriptions`: WebSub購読情報

## データベーススキーマ

### channels テーブル
```sql
- id: VARCHAR PRIMARY KEY（内部ID）
- name: VARCHAR（チャンネル名）
- handle: VARCHAR（チャンネルハンドル）
- channel_id: VARCHAR UNIQUE（YouTubeチャンネルID: UCxxxxx）
- uploads_playlist_id: VARCHAR（アップロードプレイリストID）
- thumbnail_url: VARCHAR（サムネイルURL）
- last_checked: TIMESTAMP（最終チェック日時）
- is_enabled: BOOLEAN（有効/無効フラグ）
- created_at: TIMESTAMP
```

### summaries テーブル
```sql
- id: VARCHAR PRIMARY KEY（内部ID）
- video_url: VARCHAR（動画URL）
- video_id: VARCHAR UNIQUE（YouTube VIDEO_ID: 11文字）
- title: VARCHAR（動画タイトル）
- channel_id: VARCHAR（channels.idへの外部キー）
- channel_title: VARCHAR（チャンネル名）
- published_at: TIMESTAMP（公開日時）
- thumbnail_url: VARCHAR（サムネイルURL）
- doc_url: VARCHAR（GoogleドキュメントURL）
- doc_id: VARCHAR（GoogleドキュメントID）
- summary: TEXT（要約内容）
- key_points: JSONB（重要なポイント配列）
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### videos テーブル
```sql
- video_id: VARCHAR PRIMARY KEY（YouTube VIDEO_ID）
- channel_id: VARCHAR（channels.idへの外部キー）
- published_at: TIMESTAMP（公開日時）
- title: VARCHAR（動画タイトル）
- description: TEXT（説明文）
- thumbnail_url: VARCHAR（サムネイルURL）
- duration: VARCHAR（動画時間: ISO 8601形式）
- view_count: BIGINT（再生回数）
- like_count: BIGINT（いいね数）
- source: VARCHAR（取得元: 'websub' | 'poll'）
- event_type: VARCHAR（イベントタイプ: 'new_or_update' | 'deleted'）
- raw_payload: JSONB（生のAPIレスポンス）
- fetched_at: TIMESTAMP（取得日時）
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### video_jobs テーブル
```sql
- id: VARCHAR PRIMARY KEY（ジョブID）
- video_id: VARCHAR UNIQUE（videos.video_idへの外部キー）
- status: VARCHAR（ステータス: 'pending' | 'processing' | 'done' | 'failed'）
- started_at: TIMESTAMP（開始日時）
- finished_at: TIMESTAMP（終了日時）
- error: TEXT（エラーメッセージ）
- summary_text: TEXT（要約テキスト）
- key_points: JSONB（重要なポイント）
- doc_url: VARCHAR（Google Docs URL）
- doc_id: VARCHAR（Google Docs ID）
- notified_at: TIMESTAMP（通知送信日時）
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### subscriptions テーブル
```sql
- id: VARCHAR PRIMARY KEY（購読ID）
- channel_id: VARCHAR（channels.idへの外部キー）
- topic_url: VARCHAR（WebSub topic URL）
- callback_url: VARCHAR（WebSub callback URL）
- status: VARCHAR（ステータス: 'pending' | 'subscribed' | 'expired' | 'failed'）
- lease_expires_at: TIMESTAMP（購読期限）
- last_subscribed_at: TIMESTAMP（最終購読日時）
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

## Cronジョブ設定

VercelのCronジョブ機能を使用して自動実行を設定しています（`vercel.json`）:

```json
{
  "crons": [
    {
      "path": "/api/youtube/poll",
      "schedule": "0 */6 * * *"  // 6時間ごと（0時、6時、12時、18時）
    },
    {
      "path": "/api/youtube/jobs/process",
      "schedule": "0 * * * *"  // 1時間ごと
    }
  ]
}
```

### 実行スケジュール

- **ポーリング**: 6時間ごと（`0 */6 * * *`）
  - WebSubが無効な場合のフォールバック
  - 各チャンネルの最新動画をチェック

- **要約ジョブ処理**: 1時間ごと（`0 * * * *`）
  - `video_jobs`テーブルの`pending`ステータスのジョブを処理
  - Gemini APIで要約を生成
  - Googleドキュメントに保存
  - `summaries`テーブルに移行

### 実行時間制限

- Serverless Functionsの最大実行時間: **60秒**（`maxDuration: 60`）
- Vercel Hobbyプランの制限内で最適化

## WebSubによるリアルタイム通知

YouTube WebSub Hubを使用して、新着動画をリアルタイムで通知を受け取ります。

### 動作フロー

1. **チャンネル追加時**
   - チャンネルIDを取得
   - WebSub topic URLを構築: `https://www.youtube.com/xml/feeds/videos.xml?channel_id={channel_id}`
   - WebSub Hubに購読リクエスト送信
   - `subscriptions`テーブルに購読情報を保存

2. **通知受信時**
   - YouTubeからWebSub通知を受信
   - Atom XMLをパースして動画情報を取得
   - `videos`テーブルに保存
   - `video_jobs`テーブルに要約ジョブを作成

3. **購読期限管理**
   - 購読期限（通常7日間）をチェック
   - 期限切れの場合は自動再購読

### フォールバック

WebSubが無効な場合や通知が届かない場合、ポーリング（6時間ごと）で最新動画をチェックします。

## API仕様

### チャンネル情報取得

**エンドポイント**: `POST /api/youtube/channel-info`

**リクエスト**:
```json
{
  "handle": "@KashiwabaraJin"
}
```

**レスポンス**:
```json
{
  "channelId": "UCxxxxx",
  "channelInfo": {
    "title": "チャンネル名",
    "handle": "@KashiwabaraJin",
    "thumbnailUrl": "https://..."
  },
  "uploadsPlaylistId": "UUxxxxx"
}
```

### チャンネル追加

**エンドポイント**: `POST /api/channels`

**リクエスト**:
```json
{
  "name": "チャンネル名",
  "handle": "@KashiwabaraJin",
  "channelId": "UCxxxxx",
  "uploadsPlaylistId": "UUxxxxx",
  "thumbnailUrl": "https://..."
}
```

### 要約保存

**エンドポイント**: `POST /api/summaries`

**リクエスト**:
```json
{
  "title": "動画タイトル",
  "url": "https://www.youtube.com/watch?v=VIDEO_ID",
  "videoId": "VIDEO_ID",
  "channelId": "channel_internal_id",
  "docUrl": "https://docs.google.com/document/d/DOC_ID/edit",
  "docId": "DOC_ID",
  "summary": "要約内容",
  "keyPoints": ["ポイント1", "ポイント2"]
}
```

## トラブルシューティング

### チャンネルIDが取得できない

**原因**:
- YouTube Data API v3が有効化されていない
- APIキーの制限設定が厳しすぎる
- チャンネルハンドルが存在しない

**解決方法**:
1. Google Cloud Consoleで「YouTube Data API v3」を有効化
2. APIキーの制限を確認（HTTPリファラー制限を一時的に無効化してテスト）
3. チャンネルハンドルが正しいか確認（`@`記号を含む）

### 要約が生成されない

**原因**:
- Gemini APIキーが無効
- APIクォータ超過
- 動画URLが不正

**解決方法**:
1. 環境変数`VITE_GEMINI_API_KEY`と`GEMINI_API_KEY`を確認
2. Google Cloud Consoleで「Generative Language API」が有効化されているか確認
3. APIクォータを確認

### データベースエラー

**原因**:
- Supabase接続情報が不正
- テーブルスキーマが未作成
- 外部キー制約違反

**解決方法**:
1. `supabase-schema.sql`と`supabase-schema-websub.sql`を実行してスキーマを作成
2. 環境変数`VITE_SUPABASE_URL`と`VITE_SUPABASE_ANON_KEY`を確認
3. Supabaseダッシュボードでテーブル構造を確認

### Cronジョブが実行されない

**原因**:
- VercelのCronジョブ機能が有効化されていない
- `vercel.json`の設定が不正
- デプロイが完了していない

**解決方法**:
1. VercelダッシュボードでCronジョブの実行履歴を確認
2. `vercel.json`の構文を確認
3. 最新のデプロイが完了しているか確認

## 開発・デバッグ

### ローカル開発時の注意点

- Serverless Functionsは`vercel dev`でローカル実行可能
- 環境変数は`.env.local`に設定
- Supabaseはローカルでも接続可能（環境変数を設定）

### ログ確認

- **Vercel**: ダッシュボード → Functions → ログを確認
- **Supabase**: ダッシュボード → Logs → Postgres Logsを確認
- **ブラウザ**: 開発者ツールのコンソールでクライアント側ログを確認

## ライセンス

MIT License
