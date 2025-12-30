# Vercel 完全セットアップ手順

## 📋 概要

この手順では、以下のことを行います：
1. Vercelにプロジェクトを作成（または既存プロジェクトを使用）
2. GitHubリポジトリを接続（オプション）
3. 環境変数を設定
4. デプロイ
5. APIキー認証のテスト

---

## 🚀 方法1: Vercelダッシュボードから設定（推奨・最も簡単）

### **ステップ1: Vercelダッシュボードにアクセス**

1. ブラウザで [Vercelダッシュボード](https://vercel.com/dashboard) にアクセス
2. ログイン（既にアカウントがある場合は自動的にログイン）

### **ステップ2: 新規プロジェクトを作成**

1. ダッシュボードで「**Add New...**」→「**Project**」をクリック
2. **Import Git Repository**が表示されます
   - **オプションA**: GitHubリポジトリを接続する場合
     - 「**Connect GitHub**」をクリック（まだ接続していない場合）
     - リポジトリ `youtube-insight-hub` を選択
     - 「**Import**」をクリック
   - **オプションB**: GitHubリポジトリを接続しない場合
     - 「**Deploy without Git**」をクリック（画面下部）
     - または、CLIからデプロイ（後述）

### **ステップ3: プロジェクト設定**

1. **Project Name**: `youtube-insight-hub`（任意の名前）
2. **Framework Preset**: `Vite` を選択
3. **Root Directory**: `./`（そのまま）
4. **Build Command**: `npm run build`（自動入力される）
5. **Output Directory**: `dist`（自動入力される）
6. **Install Command**: `npm install`（自動入力される）

### **ステップ4: 環境変数を設定**

**重要**: デプロイ前に環境変数を設定します。

1. プロジェクト設定画面で「**Environment Variables**」セクションを展開
2. 以下の環境変数を追加：

| Name | Value | Environment |
|------|-------|-------------|
| `SUPABASE_URL` | `https://vgscuhunmcpozsjlorfh.supabase.co` | Production, Preview, Development |
| `SUPABASE_ANON_KEY` | `sb_publishable_HsmW3Hd0kQ4oagj14fm-9A_MIx9Q30r` | Production, Preview, Development |
| `YOUTUBE_API_KEY` | `AIzaSyBalkCAxCGJZ6SWYXnzZZImis2PMa20UbE` | Production, Preview, Development |
| `GEMINI_API_KEY` | `AIzaSyAKOjo8Q3Qin6cx77vWhmNtAW7oiYCVjZ8` | Production, Preview, Development |
| `API_KEY` | `C7J0NquorPID83H6atT1YKWGFplixAB9` | Production, Preview, Development |

**設定方法**:
1. 「**Add New**」をクリック
2. **Name**に環境変数名を入力
3. **Value**に値を入力
4. **Environment**で「Production」「Preview」「Development」すべてにチェック
5. 「**Save**」をクリック
6. すべての環境変数について繰り返す

### **ステップ5: デプロイ**

1. 「**Deploy**」をクリック
2. デプロイが完了するまで待つ（1〜3分）
3. デプロイ完了後、URLが表示されます（例: `https://youtube-insight-hub.vercel.app`）

---

## 🔧 方法2: Vercel CLIから設定

### **ステップ1: プロジェクトをリンク**

```powershell
vercel link
```

以下の質問に答えます：

1. **Set up and develop?** → `Y` を入力してEnter
2. **Which scope?** → アカウントを選択（矢印キーで選択してEnter）
3. **Link to existing project?** → `N` を入力（新規作成）または `Y`（既存プロジェクトを使用）
4. **What's your project's name?** → `youtube-insight-hub` を入力してEnter
5. **In which directory is your code located?** → `./` を入力してEnter

### **ステップ2: 環境変数を設定**

`.vercel/.env.local`ファイルが作成されます。以下の内容を追加：

```env
SUPABASE_URL=https://vgscuhunmcpozsjlorfh.supabase.co
SUPABASE_ANON_KEY=sb_publishable_HsmW3Hd0kQ4oagj14fm-9A_MIx9Q30r
YOUTUBE_API_KEY=AIzaSyBalkCAxCGJZ6SWYXnzZZImis2PMa20UbE
GEMINI_API_KEY=AIzaSyAKOjo8Q3Qin6cx77vWhmNtAW7oiYCVjZ8
API_KEY=C7J0NquorPID83H6atT1YKWGFplixAB9
```

または、Vercelダッシュボードで設定（方法1のステップ4を参照）

### **ステップ3: デプロイ**

```powershell
vercel --prod
```

---

## 📝 デプロイ後の確認

### **1. デプロイURLを確認**

デプロイ完了後、以下のようなURLが表示されます：
```
https://youtube-insight-hub-xxxxx.vercel.app
```

このURLをメモしておいてください。

### **2. 環境変数が正しく設定されているか確認**

Vercelダッシュボードで：
1. プロジェクトを選択
2. **Settings** → **Environment Variables**
3. すべての環境変数が設定されているか確認

### **3. APIエンドポイントが動作するか確認**

ブラウザで以下にアクセス：
```
https://your-app.vercel.app/api/youtube/poll
```

**期待される結果**: `401 Unauthorized`（認証が必要なため）

---

## 🧪 APIキー認証のテスト

### **ステップ1: テストスクリプトを修正**

`test-api-auth.ps1`の`$baseUrl`を本番URLに変更：

```powershell
$baseUrl = "https://your-app.vercel.app"  # 実際のURLに置き換え
```

### **ステップ2: テストスクリプトを実行**

```powershell
.\test-api-auth.ps1
```

**期待される結果**:
- ✅ テスト1: 認証なし → `401 Unauthorized`
- ✅ テスト2: 認証あり（正しいキー） → `200 OK`
- ✅ テスト3: 認証あり（間違ったキー） → `401 Unauthorized`

---

## 🔄 既存プロジェクトを使用する場合

### **ステップ1: プロジェクトを選択**

1. Vercelダッシュボードにアクセス
2. 既存のプロジェクトを選択

### **ステップ2: 環境変数を確認・追加**

1. **Settings** → **Environment Variables**
2. 必要な環境変数が設定されているか確認
3. 不足している場合は追加（方法1のステップ4を参照）

### **ステップ3: 最新のコードをデプロイ**

**GitHubリポジトリが接続されている場合**:
- 自動的にデプロイされます
- または、手動で「**Redeploy**」をクリック

**GitHubリポジトリが接続されていない場合**:
```powershell
vercel --prod
```

---

## ⚙️ ローカル開発環境でのテスト（vercel dev）

### **ステップ1: プロジェクトをリンク**

```powershell
vercel link
```

既存プロジェクトを使用する場合：
- **Link to existing project?** → `Y`
- プロジェクトを選択

### **ステップ2: ローカル開発サーバーを起動**

```powershell
vercel dev
```

これで、`http://localhost:3000`でAPIエンドポイントが動作します。

### **ステップ3: テストスクリプトを実行**

```powershell
.\test-api-auth.ps1
```

---

## 🐛 トラブルシューティング

### **問題1: 環境変数が読み込まれない**

**解決方法**:
1. Vercelダッシュボードで環境変数が正しく設定されているか確認
2. **Environment**で「Production」「Preview」「Development」すべてにチェックされているか確認
3. デプロイを再実行

### **問題2: 404エラーが発生する**

**解決方法**:
1. `vercel.json`が正しく配置されているか確認
2. `api/`ディレクトリが存在するか確認
3. デプロイログを確認

### **問題3: APIキー認証が機能しない**

**解決方法**:
1. 環境変数`API_KEY`が設定されているか確認
2. リクエストヘッダーに`X-API-Key`が含まれているか確認
3. APIキーが正しいか確認（コピペミスなど）

---

## 📊 チェックリスト

デプロイ前に以下を確認：

- [ ] Vercelアカウントにログイン
- [ ] プロジェクトを作成（または既存プロジェクトを選択）
- [ ] 環境変数をすべて設定
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_ANON_KEY`
  - [ ] `YOUTUBE_API_KEY`
  - [ ] `GEMINI_API_KEY`
  - [ ] `API_KEY`
- [ ] デプロイを実行
- [ ] デプロイURLを確認
- [ ] APIエンドポイントが動作するか確認
- [ ] テストスクリプトを実行

---

## 🎯 推奨手順（最も簡単）

1. ✅ **Vercelダッシュボードから設定**（方法1）
   - ブラウザで操作できる
   - 視覚的にわかりやすい
   - 環境変数の設定が簡単

2. ✅ **GitHubリポジトリを接続**（オプション）
   - 自動デプロイが有効になる
   - コードをプッシュするだけでデプロイされる

3. ✅ **環境変数を設定**
   - デプロイ前に設定することを推奨

4. ✅ **デプロイ**
   - 初回デプロイは1〜3分かかります

5. ✅ **テスト**
   - デプロイURLでテストスクリプトを実行

---

## 🔗 参考リンク

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Vercel CLI](https://vercel.com/docs/cli)

