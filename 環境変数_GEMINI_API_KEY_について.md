# 環境変数 `GEMINI_API_KEY` について

## 🔍 `GEMINI_API_KEY: '未設定'` が表示される理由

### 原因

コードでは、2つの環境変数名をチェックしています：

```typescript
const apiKey = env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY;
```

デバッグログでは、両方を表示しているため：
- `VITE_GEMINI_API_KEY`: ✅ 設定されている（表示される）
- `GEMINI_API_KEY`: ❌ 未設定（`VITE_` プレフィックスがないため）

### Viteの環境変数の仕組み

Viteでは、**クライアント側（ブラウザ）でアクセスできる環境変数は `VITE_` プレフィックスが必要**です。

- ✅ `VITE_GEMINI_API_KEY`: ブラウザでアクセス可能
- ❌ `GEMINI_API_KEY`: ブラウザでアクセス不可（サーバーサイドのみ）

### なぜ両方をチェックしているか

コードでは、フォールバックとして `GEMINI_API_KEY` もチェックしていますが、Viteでは `VITE_` プレフィックスがない環境変数はブラウザで読み込めないため、常に「未設定」と表示されます。

---

## ✅ 現在の状態

- `VITE_GEMINI_API_KEY`: ✅ 正しく設定されている
- `GEMINI_API_KEY`: ❌ 未設定（これは正常です）

**結論**: 問題ありません。`VITE_GEMINI_API_KEY` が設定されているので、正常に動作しています。

---

## 🛠️ デバッグログを整理する場合

不要な `GEMINI_API_KEY` のチェックを削除したい場合は、デバッグログを修正できます：

```typescript
console.log('🔍 [デバッグ] import.meta.env の内容:', {
  DEV: env.DEV,
  MODE: env.MODE,
  VITE_GEMINI_API_KEY: env.VITE_GEMINI_API_KEY ? `${env.VITE_GEMINI_API_KEY.substring(0, 20)}...` : '未設定',
  // GEMINI_API_KEY のチェックを削除（Viteでは不要）
  allKeys: Object.keys(env).filter(key => key.startsWith('VITE_'))
});
```

ただし、現在の実装でも問題なく動作しているため、修正は必須ではありません。

---

## 📝 まとめ

- `GEMINI_API_KEY: '未設定'` は正常な動作です
- `VITE_GEMINI_API_KEY` が設定されていれば問題ありません
- チャンネル情報が取得できているので、APIキーは正しく動作しています

