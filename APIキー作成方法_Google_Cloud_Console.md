# APIキー作成方法 - Google Cloud Console

## 🎯 推奨方法：Google Cloud Consoleで作成

Google AI StudioとGoogle Cloud Consoleでプロジェクトが異なる場合、**Google Cloud Consoleで直接APIキーを作成する**のが最も簡単です。

---

## 📋 手順

### ステップ1: Google Cloud Consoleで認証情報ページを開く

1. [Google Cloud Console](https://console.cloud.google.com) にアクセス
2. プロジェクト「youtube-insight-hub」を選択
3. 「APIとサービス」→「認証情報」を開く

### ステップ2: APIキーを作成

1. ページ上部の「+ 認証情報を作成」ボタンをクリック
2. 「APIキー」を選択
3. APIキーが作成されます
4. **APIキーをコピー**（この時点でしか表示されません）

### ステップ3: APIキーの制限を設定（推奨）

1. 作成されたAPIキーをクリック
2. 「APIの制限」セクションで「キーを制限」を選択
3. 「Generative Language API」を選択
4. 「保存」をクリック

### ステップ4: 環境変数に設定

1. `.env.local` ファイルを開く
2. `VITE_GEMINI_API_KEY` に作成したAPIキーを設定
3. ファイルを保存（UTF-8、BOMなし）

### ステップ5: 開発サーバーを再起動

```bash
# Ctrl+C で停止
npm run dev
```

---

## 🔄 方法2: Google AI Studioでプロジェクトをインポート

Google AI StudioでGoogle Cloud Consoleのプロジェクトを使用したい場合：

### ステップ1: プロジェクトをインポート

1. Google AI Studioで「APIキーを作成」をクリック
2. 「Select a Cloud Project」ドロップダウンを開く
3. 「プロジェクトをインポート」を選択
4. Google Cloud ConsoleのプロジェクトIDを入力
   - プロジェクトID: `youtube-insight-hub`
   - または、Google Cloud Consoleで確認（プロジェクト設定から）

### ステップ2: APIキーを作成

1. インポートしたプロジェクトを選択
2. キー名を入力（例: `youtube-insight-hub-api-key`）
3. 「作成」をクリック
4. APIキーをコピー

### ステップ3: 環境変数に設定

1. `.env.local` ファイルを開く
2. `VITE_GEMINI_API_KEY` に作成したAPIキーを設定
3. ファイルを保存

---

## ⚠️ 重要な注意事項

### プロジェクトの違いについて

- **Google AI Studio**: 独自のプロジェクト管理システム
- **Google Cloud Console**: Google Cloudのプロジェクト管理システム
- これらは**別々に管理**されており、同期されていません

### どちらを使うべきか

- **Google Cloud Console**: 既存のプロジェクト「youtube-insight-hub」を使用したい場合（推奨）
- **Google AI Studio**: 新しいプロジェクトを作成したい場合

---

## ✅ 確認手順

1. APIキーが正しく設定されているか確認
   - `.env.local` ファイルで `VITE_GEMINI_API_KEY` が設定されているか
2. 開発サーバーを再起動
3. ブラウザのコンソール（F12）で確認
   - `✅ Gemini APIキーが正常に設定されました` が表示されるか
4. チャンネル追加を試す

---

## 🎯 推奨される手順

**最も簡単な方法**:
1. Google Cloud ConsoleでAPIキーを作成（方法1）
2. `.env.local` に設定
3. 開発サーバーを再起動

これで、既存の「youtube-insight-hub」プロジェクトでAPIキーを使用できます。

