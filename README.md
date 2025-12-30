<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# YouTube Insight Hub

YouTubeチャンネルの最新動画を自動的にチェックし、Gemini AIを使って内容を要約。Googleドキュメント保存とGoogle Chat通知機能を備えたダッシュボードです。

## 特徴

- 🎯 AIによる動画内容の自動要約
- 📊 構造化されたレポート生成
- ☁️ Googleドライブ連携
- 🤖 24時間自動巡回スクリプト生成
- 🎨 モダンなUI/UX

## ローカル実行

**前提条件:** Node.js

1. 依存関係のインストール:
   ```bash
   npm install
   ```

2. 環境変数の設定:
   `.env.local`ファイルを作成し、Gemini APIキーを設定:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
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
```
GEMINI_API_KEY = your_actual_gemini_api_key
```

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
- Google Drive API
- Google Docs API

## 使用方法

1. チャンネルを追加（@ハンドルまたはチャンネル名）
2. Google Client IDを入力して連携
3. 「最新をチェック」をクリックしてAI要約生成
4. 要約をGoogleドキュメントに保存可能
