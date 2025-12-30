# APIキー認証 ローカルテスト手順

## ✅ 環境設定完了

以下のAPIキーが生成され、`.env.local`に設定されました：

```
API_KEY=C7J0NquorPID83H6atT1YKWGFplixAB9
```

---

## 🚀 テスト手順

### **方法1: PowerShellスクリプトを使用（推奨）**

最も簡単な方法です。同じターミナルで実行できます。

#### **ステップ1: 開発サーバーを起動**

```powershell
# バックグラウンドで起動
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev"
```

または、別のターミナルで：
```powershell
npm run dev
```

サーバーが起動したら、以下のメッセージが表示されます：
```
  VITE v6.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

#### **ステップ2: テストスクリプトを実行**

同じターミナル（または別のターミナル）で：

```powershell
.\test-api-auth.ps1
```

これで、すべてのテストが自動的に実行されます。

---

### **方法2: 手動でコマンドを実行**

#### **ステップ1: 開発サーバーを起動**

```powershell
npm run dev
```

サーバーが起動したら、以下のメッセージが表示されます：
```
  VITE v6.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

**注意**: このプロジェクトはポート3000で動作します（`vite.config.ts`で設定）。

#### **ステップ2: 認証なしでリクエスト（エラーになることを確認）**

**PowerShellでは`curl`は使えません**。`Invoke-RestMethod`を使用してください：

```powershell
try {
    Invoke-RestMethod -Uri "http://localhost:3000/api/youtube/poll" `
        -Method POST `
        -ContentType "application/json" `
        -Body '{"maxResults": 1}'
} catch {
    Write-Host "ステータスコード: $($_.Exception.Response.StatusCode.value__)"
    Write-Host "エラー: $($_.Exception.Message)"
}
```

**期待される結果**: `401 Unauthorized`

```json
{
  "error": "Unauthorized. Invalid or missing API key."
}
```

#### **ステップ3: 認証ありでリクエスト（成功することを確認）**

```powershell
$headers = @{
    "Content-Type" = "application/json"
    "X-API-Key" = "C7J0NquorPID83H6atT1YKWGFplixAB9"
}

Invoke-RestMethod -Uri "http://localhost:3000/api/youtube/poll" `
    -Method POST `
    -Headers $headers `
    -Body '{"maxResults": 1}'
```

**期待される結果**: `200 OK`（正常なレスポンス）

```json
{
  "processed": 0,
  "newVideos": 0,
  "errors": []
}
```

#### **ステップ4: 間違ったAPIキーでリクエスト（エラーになることを確認）**

```powershell
$headers = @{
    "Content-Type" = "application/json"
    "X-API-Key" = "wrong-api-key"
}

try {
    Invoke-RestMethod -Uri "http://localhost:3000/api/youtube/poll" `
        -Method POST `
        -Headers $headers `
        -Body '{"maxResults": 1}'
} catch {
    Write-Host "ステータスコード: $($_.Exception.Response.StatusCode.value__)"
    Write-Host "エラー: $($_.Exception.Message)"
}
```

**期待される結果**: `401 Unauthorized`

---

## 🧪 他のエンドポイントのテスト

### **要約ジョブ処理**

```powershell
# 認証なし（エラー）
try {
    Invoke-RestMethod -Uri "http://localhost:3000/api/youtube/jobs/process" `
        -Method POST `
        -ContentType "application/json" `
        -Body '{"limit": 1}'
} catch {
    Write-Host "エラー: $($_.Exception.Message)"
}

# 認証あり（成功）
$headers = @{
    "Content-Type" = "application/json"
    "X-API-Key" = "C7J0NquorPID83H6atT1YKWGFplixAB9"
}
Invoke-RestMethod -Uri "http://localhost:3000/api/youtube/jobs/process" `
    -Method POST `
    -Headers $headers `
    -Body '{"limit": 1}'
```

### **WebSub購読**

```powershell
# 認証なし（エラー）
try {
    Invoke-RestMethod -Uri "http://localhost:3000/api/youtube/websub/subscribe" `
        -Method POST `
        -ContentType "application/json" `
        -Body '{"channelId": "UCxxxxx"}'
} catch {
    Write-Host "エラー: $($_.Exception.Message)"
}

# 認証あり（成功）
$headers = @{
    "Content-Type" = "application/json"
    "X-API-Key" = "C7J0NquorPID83H6atT1YKWGFplixAB9"
}
Invoke-RestMethod -Uri "http://localhost:3000/api/youtube/websub/subscribe" `
    -Method POST `
    -Headers $headers `
    -Body '{"channelId": "UCxxxxx"}'
```

### **WebSub再購読**

```powershell
# 認証なし（エラー）
try {
    Invoke-RestMethod -Uri "http://localhost:3000/api/youtube/websub/resubscribe" `
        -Method POST `
        -ContentType "application/json" `
        -Body '{}'
} catch {
    Write-Host "エラー: $($_.Exception.Message)"
}

# 認証あり（成功）
$headers = @{
    "Content-Type" = "application/json"
    "X-API-Key" = "C7J0NquorPID83H6atT1YKWGFplixAB9"
}
Invoke-RestMethod -Uri "http://localhost:3000/api/youtube/websub/resubscribe" `
    -Method POST `
    -Headers $headers `
    -Body '{}'
```

---

## ⚠️ PowerShellでの注意点

**重要**: PowerShellでは`curl`コマンドは`Invoke-WebRequest`のエイリアスになっているため、`-H`などのオプションは使えません。

**解決方法**:
1. **推奨**: `test-api-auth.ps1`スクリプトを使用（最も簡単）
2. **代替**: `Invoke-RestMethod`コマンドを直接使用

---

## ✅ テスト結果の確認ポイント

### **成功パターン**

1. ✅ 認証なし → `401 Unauthorized`
2. ✅ 認証あり（正しいキー） → `200 OK`
3. ✅ 認証あり（間違ったキー） → `401 Unauthorized`

### **失敗パターン**

1. ❌ 認証なしでも成功する → 認証が機能していない
2. ❌ 認証ありでもエラー → APIキーが正しく設定されていない

---

## 🐛 トラブルシューティング

### **問題1: 認証なしでも成功する**

**原因**: 環境変数`API_KEY`が設定されていない

**解決方法**:
1. `.env.local`ファイルを確認
2. `API_KEY=C7J0NquorPID83H6atT1YKWGFplixAB9`が含まれているか確認
3. 開発サーバーを再起動（環境変数の変更は再起動が必要）

### **問題2: 認証ありでもエラーになる**

**原因**: APIキーが一致していない

**解決方法**:
1. `.env.local`の`API_KEY`を確認
2. リクエストヘッダーの`X-API-Key`を確認
3. コピペミスがないか確認（スペース、改行など）

### **問題3: サーバーに接続できない**

**原因**: 開発サーバーが起動していない

**解決方法**:
1. 別のターミナルで`npm run dev`を実行
2. ポート3000が使用可能か確認
3. ファイアウォールの設定を確認

---

## 📊 テスト結果の記録

テストを実行したら、以下の結果を記録してください：

| テスト項目 | 期待結果 | 実際の結果 | ステータス |
|----------|---------|-----------|----------|
| 認証なしリクエスト | 401 Unauthorized | | |
| 認証あり（正しいキー） | 200 OK | | |
| 認証あり（間違ったキー） | 401 Unauthorized | | |

---

## 🎯 次のステップ

テストが成功したら：

1. ✅ **Vercelにデプロイ**
2. ✅ **Vercelで環境変数`API_KEY`を設定**
3. ✅ **本番環境でテスト**

