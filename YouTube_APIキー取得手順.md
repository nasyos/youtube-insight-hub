# YouTube Data API v3 キー取得手順

## 📋 ステップ1: YouTube Data API v3を有効化

### 1.1 ライブラリページにアクセス

1. Google Cloud Consoleにアクセス: https://console.cloud.google.com
2. プロジェクト「youtube-insight-hub」を選択
3. 左側のメニューから「**APIとサービス**」→「**ライブラリ**」をクリック

### 1.2 YouTube Data API v3を検索して有効化

1. 検索バーで「**YouTube Data API v3**」を検索
2. 「**YouTube Data API v3**」をクリック
3. 「**有効にする**」ボタンをクリック

**確認**: 「このAPIは有効です」と表示されればOK

---

## 📋 ステップ2: APIキーを作成

### 2.1 認証情報ページにアクセス

1. 左側のメニューから「**APIとサービス**」→「**認証情報**」をクリック
   - 現在表示されているページです

### 2.2 APIキーを作成

1. ページ上部の「**+ 認証情報を作成**」ボタンをクリック
2. ドロップダウンメニューから「**APIキー**」を選択

### 2.3 APIキーが作成される

- 新しいAPIキーが作成され、ポップアップが表示されます
- APIキーが表示されます（例: `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`）

### 2.4 APIキーをコピー

- 表示されたAPIキーをコピー
- **重要**: このAPIキーは後で使用するため、安全に保管してください

---

## 📋 ステップ3: APIキーの制限を設定（推奨）

### 3.1 APIキーの制限を設定

1. 作成したAPIキーの名前（例: 「API key 1」）をクリック
2. 「**アプリケーションの制限**」セクションで「**HTTPリファラー（ウェブサイト）**」を選択
3. 「**ウェブサイトの制限**」に以下を追加:
   ```
   http://localhost:5173/*
   http://localhost:3000/*
   https://your-domain.vercel.app/*
   ```
4. 「**APIの制限**」セクションで「**キーを制限**」を選択
5. 「**YouTube Data API v3**」を選択（チェックボックス）
6. 「**保存**」をクリック

**注意**: 開発中は制限を設定せずに使用することもできますが、本番環境では必ず制限を設定してください。

---

## 📋 ステップ4: 環境変数に追加

### 4.1 .env.localファイルを開く

プロジェクトのルートディレクトリにある`.env.local`ファイルを開きます。

### 4.2 APIキーを追加

既存の環境変数に以下を追加:

```env
# 既存の環境変数
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key

# 新規追加
VITE_YOUTUBE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**重要**: 
- `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`の部分を、ステップ2.4でコピーした実際のAPIキーに置き換えてください
- ファイルを保存してください

### 4.3 開発サーバーを再起動

```bash
# 開発サーバーを停止（Ctrl+C）
# その後、再起動
npm run dev
```

---

## ✅ 確認

### APIキーが正しく設定されているか確認

1. ブラウザの開発者ツール（F12）を開く
2. コンソールタブを開く
3. アプリケーションをリロード
4. コンソールに以下のようなログが表示されればOK:
   ```
   ✅ YouTube APIキーが正常に設定されました
   ```

---

## ⚠️ 注意事項

### 1. APIキーのセキュリティ

- **絶対にGitHubにコミットしないでください**
- `.env.local`は`.gitignore`に含まれていることを確認してください
- 本番環境では、環境変数として設定してください（Vercelなど）

### 2. APIキーの制限

- 開発中は制限を設定せずに使用できますが、本番環境では必ず制限を設定してください
- IPアドレス制限やHTTPリファラー制限を設定することで、不正使用を防げます

### 3. 既存のAPIキーとの違い

- **Gemini APIキー**: Gemini AIのAPIを使用するためのキー
- **YouTube Data API v3キー**: YouTubeの動画情報を取得するためのキー
- 両方とも必要です

---

## 📝 まとめ

1. ✅ YouTube Data API v3を有効化
2. ✅ APIキーを作成
3. ✅ APIキーの制限を設定（推奨）
4. ✅ `.env.local`に追加
5. ✅ 開発サーバーを再起動

これで、YouTube Data API v3を使用する準備が整いました！

