# APIキー認証 設定手順

## ✅ 実装完了

以下のエンドポイントにAPIキー認証を追加しました：

- ✅ `/api/youtube/poll`
- ✅ `/api/youtube/jobs/process`
- ✅ `/api/youtube/websub/subscribe`
- ✅ `/api/youtube/websub/resubscribe`

**注意**: `/api/youtube/websub/callback`はYouTubeから直接呼び出されるため、認証は不要です。

---

## 🔑 APIキーの生成

### **方法1: オンラインツールを使用（推奨）**

1. [Random.org](https://www.random.org/strings/)にアクセス
2. 以下の設定で生成：
   - **Length**: 32
   - **Character set**: Alphanumeric
   - **Generate**: 1 string
3. 生成された文字列をコピー

### **方法2: コマンドラインで生成**

```bash
# PowerShell (Windows)
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})

# Bash (Linux/Mac)
openssl rand -hex 32
```

### **方法3: Node.jsで生成**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## ⚙️ 環境変数の設定

### **ローカル開発環境**

`.env.local`ファイルに追加：

```env
# 既存の環境変数
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_YOUTUBE_API_KEY=your_youtube_api_key

# 新規追加
API_KEY=your-generated-api-key-here
```

**重要**: `.env.local`は`.gitignore`に含まれているため、Gitにコミットされません。

### **Vercel本番環境**

1. Vercelダッシュボードにアクセス
2. プロジェクトを選択
3. **Settings** → **Environment Variables**
4. 以下の環境変数を追加：
   - **Name**: `API_KEY`
   - **Value**: 生成したAPIキー
   - **Environment**: Production, Preview, Development（すべてにチェック）
5. **Save**をクリック

---

## 🧪 テスト方法

### **1. 認証なしでリクエスト（エラーになることを確認）**

```bash
# 認証なし
curl -X POST http://localhost:5173/api/youtube/poll \
  -H "Content-Type: application/json" \
  -d '{"maxResults": 3}'
```

**期待される結果**: `401 Unauthorized`

```json
{
  "error": "Unauthorized. Invalid or missing API key."
}
```

### **2. 認証ありでリクエスト（成功することを確認）**

```bash
# 認証あり
curl -X POST http://localhost:5173/api/youtube/poll \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key-here" \
  -d '{"maxResults": 3}'
```

**期待される結果**: `200 OK`（正常なレスポンス）

### **3. 間違ったAPIキーでリクエスト（エラーになることを確認）**

```bash
# 間違ったAPIキー
curl -X POST http://localhost:5173/api/youtube/poll \
  -H "Content-Type: application/json" \
  -H "X-API-Key: wrong-api-key" \
  -d '{"maxResults": 3}'
```

**期待される結果**: `401 Unauthorized`

---

## 🔄 Vercel Cronジョブからの呼び出し

VercelのCronジョブから自動的に呼び出される場合、`X-Vercel-Cron`ヘッダーが自動的に追加されるため、**認証は自動的に通過します**。

**設定不要**: `vercel.json`のCron設定は変更不要です。

```json
{
  "crons": [
    {
      "path": "/api/youtube/poll",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

---

## 📝 使用方法

### **curlコマンド**

```bash
curl -X POST https://your-app.vercel.app/api/youtube/poll \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key-here" \
  -d '{"maxResults": 3}'
```

### **JavaScript/TypeScript**

```typescript
const response = await fetch('https://your-app.vercel.app/api/youtube/poll', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-api-key-here'
  },
  body: JSON.stringify({
    maxResults: 3
  })
});
```

### **Postman**

1. **Headers**タブを開く
2. 以下のヘッダーを追加：
   - **Key**: `X-API-Key`
   - **Value**: `your-api-key-here`

---

## ⚠️ 注意事項

### **1. APIキーの管理**

- ✅ **環境変数で管理**（コードに直接書かない）
- ✅ **強力なランダム文字列を使用**（32文字以上推奨）
- ❌ **Gitにコミットしない**（`.gitignore`に追加済み）
- ❌ **ログに出力しない**

### **2. 開発環境での動作**

- 環境変数`API_KEY`が設定されていない場合、**認証をスキップ**します
- 開発環境では警告メッセージが表示されます：
  ```
  ⚠️ API_KEY環境変数が設定されていません。認証をスキップします。
  ```

### **3. 本番環境での必須設定**

- **Vercelデプロイ前**に必ず環境変数`API_KEY`を設定してください
- 設定しないと、すべてのリクエストが認証エラーになります

---

## 🔒 セキュリティ強化の効果

### **実装前**

- ❌ 誰でもAPIを呼び出せる
- ❌ 悪意のあるリクエストを防げない
- ❌ APIクォータの枯渇リスク
- ❌ コスト発生のリスク

### **実装後**

- ✅ 認証が必要（APIキー必須）
- ✅ 悪意のあるリクエストを防止
- ✅ APIクォータの保護
- ✅ コスト発生の防止

---

## 📊 次のステップ

1. ✅ **APIキー認証の実装**（完了）
2. ⏭️ **レート制限の実装**（次に実装）
3. ⏭️ **CORS設定の改善**
4. ⏭️ **WebSub Callbackの検証強化**

---

## 🐛 トラブルシューティング

### **問題1: 認証エラーが発生する**

**原因**: APIキーが正しく設定されていない

**解決方法**:
1. 環境変数`API_KEY`が設定されているか確認
2. リクエストヘッダーに`X-API-Key`が含まれているか確認
3. APIキーが正しいか確認（コピペミスなど）

### **問題2: 開発環境で認証がスキップされない**

**原因**: 環境変数が正しく読み込まれていない

**解決方法**:
1. `.env.local`ファイルがプロジェクトルートにあるか確認
2. 開発サーバーを再起動（環境変数の変更は再起動が必要）
3. 環境変数の形式を確認（`API_KEY=your-key`、スペースなし）

### **問題3: Vercel Cronジョブが認証エラーになる**

**原因**: Vercelの設定が正しくない

**解決方法**:
1. `vercel.json`のCron設定を確認
2. VercelダッシュボードでCronジョブの実行履歴を確認
3. 環境変数`API_KEY`が設定されているか確認（通常は不要ですが、念のため）

---

## 📚 参考リンク

- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)

