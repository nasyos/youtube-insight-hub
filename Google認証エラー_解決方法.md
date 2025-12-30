# Google認証エラー「AccessToken missing」の解決方法

## 🔍 問題の原因

データを削除してGoogle Driveのフォルダを削除した後、再度実行すると「AccessToken missing」エラーが発生します。

### 原因

1. **トークンの失効**: ブラウザを閉じたり、ページをリロードすると、sessionStorageに保存されたトークンが失効する可能性があります
2. **トークンの再読み込み不足**: GoogleApiServiceのインスタンスが作成された後、sessionStorageからトークンが正しく読み込まれていない場合があります
3. **認証状態の不整合**: UI上は「Google 接続済み」と表示されていても、実際にはトークンが無効になっている場合があります

---

## ✅ 実装した修正

### 1. トークンの再読み込み機能を追加

**`services/googleApiService.ts`**:

```typescript
// トークンを明示的に再読み込み
refreshToken(): void {
  const savedToken = sessionStorage.getItem('google_access_token');
  if (savedToken) {
    this.accessToken = savedToken;
  }
}

hasValidToken(): boolean {
  // sessionStorageからトークンを再読み込み（ページリロード後など）
  const savedToken = sessionStorage.getItem('google_access_token');
  if (savedToken) {
    this.accessToken = savedToken;
  }
  
  const expiry = sessionStorage.getItem('google_token_expiry');
  const hasToken = !!this.accessToken;
  const isNotExpired = !expiry || Date.now() < parseInt(expiry);
  
  return hasToken && isNotExpired;
}
```

### 2. スキャン実行前のトークン確認

**`App.tsx`**:

```typescript
const scanAllChannels = useCallback(async () => {
  // Google認証の確認
  if (!googleApi.current) {
    setError("Google認証が必要です。先にGoogleと連携してください。");
    return;
  }
  
  // トークンの有効性を確認
  if (!googleApi.current.hasValidToken()) {
    setError("Google認証のトークンが無効です。再度「Googleと連携する」ボタンをクリックして認証してください。");
    setGoogleConfig(prev => ({ ...prev, isConnected: false }));
    return;
  }
  
  // スキャンを実行
  // ...
});
```

### 3. メソッド実行前のトークン再読み込み

**`services/googleApiService.ts`**:

```typescript
async createSummaryDoc(summary: VideoSummary | VideoSummaryWithContent): Promise<string> {
  // トークンを再読み込み
  this.refreshToken();
  
  if (!this.accessToken) {
    throw new Error("AccessToken missing. Please reconnect to Google.");
  }
  // ...
}

private async getOrCreateFolder(): Promise<string> {
  // トークンを再読み込み
  this.refreshToken();
  
  if (!this.accessToken) {
    throw new Error("AccessToken missing. Please reconnect to Google.");
  }
  // ...
}
```

---

## 🔧 解決手順

### 方法1: 再認証（推奨）

1. アプリケーションをリロード（F5）
2. 「連携設定」セクションで「Googleと連携する」ボタンをクリック
3. Google認証画面でアカウントを選択して認証
4. 認証後、「Google 接続済み」と表示されることを確認
5. 「最新をチェック」ボタンをクリックしてスキャンを実行

### 方法2: ブラウザのセッションストレージを確認

1. 開発者ツール（F12）を開く
2. 「Application」タブ（Chrome）または「ストレージ」タブ（Firefox）を開く
3. 「Session Storage」を確認
4. 確認項目:
   - `google_access_token` が存在するか
   - `google_token_expiry` が存在するか
   - 有効期限が切れていないか（現在時刻 < expiry）

### 方法3: セッションストレージをクリアして再認証

1. 開発者ツール（F12）を開く
2. 「Application」タブを開く
3. 「Session Storage」を右クリック → 「Clear」を選択
4. アプリケーションをリロード（F5）
5. 「Googleと連携する」ボタンをクリックして再認証

---

## 📋 確認チェックリスト

- [ ] Google Client IDが正しく設定されている
- [ ] 「Googleと連携する」ボタンをクリックして認証が完了している
- [ ] 「Google 接続済み」と表示されている
- [ ] Session Storageに`google_access_token`が保存されている
- [ ] トークンの有効期限が切れていない
- [ ] エラーメッセージが表示されていない

---

## ⚠️ 注意事項

### トークンの有効期限

- Google OAuthトークンは通常1時間で失効します
- ページをリロードしても、sessionStorageに保存されていれば再読み込みされます
- ブラウザを閉じると、sessionStorageはクリアされます（再認証が必要）

### 認証状態の確認

- UI上は「Google 接続済み」と表示されていても、実際にはトークンが無効になっている場合があります
- エラーが発生した場合は、必ず再認証を行ってください

---

## 🎯 修正後の動作

修正後は、以下のように動作します：

1. **スキャン実行前**: トークンの有効性を自動的に確認
2. **トークンが無効な場合**: エラーメッセージを表示し、再認証を促す
3. **メソッド実行時**: トークンを自動的に再読み込み
4. **トークンが見つからない場合**: 明確なエラーメッセージを表示

これにより、「AccessToken missing」エラーが発生した場合でも、ユーザーに適切な対処方法を案内できるようになりました。

