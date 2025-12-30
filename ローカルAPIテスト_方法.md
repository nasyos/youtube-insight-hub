# ローカルAPIテスト方法

## ⚠️ 問題

Viteの開発サーバー（`npm run dev`）では、`/api/`エンドポイントは動作しません。

**理由**: 
- VercelのServerless Functionsは、Vercelにデプロイしたときにのみ動作します
- ローカル開発環境では、Viteが静的ファイルを配信するだけです

## ✅ 解決方法

### **方法1: Vercel CLIを使用（推奨）**

Vercel CLIを使用すると、ローカルでServerless Functionsを実行できます。

#### **ステップ1: Vercel CLIをインストール**

```powershell
npm install -g vercel
```

#### **ステップ2: Vercelにログイン**

```powershell
vercel login
```

#### **ステップ3: ローカルでServerless Functionsを起動**

```powershell
vercel dev
```

これで、`http://localhost:3000`でAPIエンドポイントが動作します。

#### **ステップ4: テストスクリプトを実行**

別のターミナルで：

```powershell
.\test-api-auth.ps1
```

---

### **方法2: Vercelにデプロイしてからテスト**

本番環境でテストする方法です。

#### **ステップ1: Vercelにデプロイ**

```powershell
vercel --prod
```

#### **ステップ2: 環境変数を設定**

Vercelダッシュボードで：
1. Settings → Environment Variables
2. `API_KEY`を追加（値: `C7J0NquorPID83H6atT1YKWGFplixAB9`）

#### **ステップ3: テストスクリプトを修正**

`test-api-auth.ps1`の`$baseUrl`を変更：

```powershell
$baseUrl = "https://your-app.vercel.app"
```

#### **ステップ4: テストスクリプトを実行**

```powershell
.\test-api-auth.ps1
```

---

### **方法3: 直接Node.jsで実行（開発用）**

APIエンドポイントを直接Node.jsで実行する方法です。

#### **ステップ1: テスト用のNode.jsスクリプトを作成**

`test-api-direct.js`を作成：

```javascript
// test-api-direct.js
import { YouTubeService } from './services/youtubeService.js';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const apiKey = process.env.API_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const youtubeService = new YouTubeService();

// 認証なしでリクエスト（エラーになることを確認）
async function testWithoutAuth() {
  console.log('テスト1: 認証なしでリクエスト');
  console.log('期待される結果: 401 Unauthorized');
  
  // 実際のエンドポイントハンドラーを直接呼び出す
  const req = new Request('http://localhost:3000/api/youtube/poll', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ maxResults: 1 })
  });
  
  // エンドポイントをインポートして実行
  // 注意: これは複雑になる可能性があります
}

testWithoutAuth();
```

**注意**: この方法は複雑で、エンドポイントの構造に依存します。

---

## 🎯 推奨方法

**最も簡単な方法**: **Vercel CLIを使用**

1. `vercel dev`でローカルでServerless Functionsを実行
2. テストスクリプトを実行
3. 認証が正しく動作することを確認

---

## 📝 次のステップ

1. ✅ **Vercel CLIをインストール**
2. ✅ **`vercel dev`でローカルサーバーを起動**
3. ✅ **テストスクリプトを実行**
4. ✅ **認証が正しく動作することを確認**

---

## 🔗 参考リンク

- [Vercel CLI Documentation](https://vercel.com/docs/cli)
- [Vercel Local Development](https://vercel.com/docs/cli/dev)

