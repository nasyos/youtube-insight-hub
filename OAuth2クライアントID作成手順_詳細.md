# OAuth 2.0クライアントID作成手順（詳細版）

## 🎯 目的

Google連携機能（Googleドキュメント作成、Google Chat通知）を使用するために、OAuth 2.0クライアントIDを作成します。

---

## 📋 ステップ1: OAuth同意画面の設定（初回のみ）

**重要**: OAuth 2.0クライアントIDを作成する前に、OAuth同意画面を設定する必要があります。

### 1.1 OAuth同意画面にアクセス

1. [Google Cloud Console](https://console.cloud.google.com) にアクセス
2. プロジェクト「youtube-insight-hub」を選択
3. 左側のメニューから「APIとサービス」→「OAuth同意画面」をクリック

### 1.2 同意画面の設定

1. **ユーザータイプを選択**
   - 「内部」または「外部」を選択
   - 個人のGoogleアカウントでテストする場合は「外部」を選択

2. **アプリ情報を入力**
   - **アプリ名**: `YouTube Insight Hub`（任意）
   - **ユーザーサポートメール**: 自分のメールアドレス
   - **アプリのロゴ**: オプション（省略可能）
   - **アプリのホームページ**: `http://localhost:3000`（開発環境）
   - **アプリのプライバシーポリシーリンク**: オプション
   - **アプリの利用規約リンク**: オプション
   - **承認済みのドメイン**: オプション

3. **スコープの追加**
   - 「スコープを追加または削除」をクリック
   - 以下のスコープを追加：
     - ✅ `https://www.googleapis.com/auth/drive.file`
     - ✅ `https://www.googleapis.com/auth/drive.metadata.readonly`
     - ✅ `https://www.googleapis.com/auth/documents`

4. **テストユーザーの追加**（外部の場合）
   - 「テストユーザー」セクションで「+ ADD USERS」をクリック
   - 自分のGoogleアカウントのメールアドレスを追加
   - 「保存」をクリック

5. **保存**
   - 画面下部の「保存して次へ」をクリック
   - 各ステップを完了して「ダッシュボードに戻る」をクリック

---

## 📋 ステップ2: OAuth 2.0クライアントIDの作成

### 2.1 認証情報ページにアクセス

1. 左側のメニューから「APIとサービス」→「認証情報」をクリック
2. または、現在表示している「クライアント」ページから「+ クライアントを作成」をクリック

### 2.2 クライアントIDの作成

1. **「+ 認証情報を作成」** または **「+ クライアントを作成」** をクリック
2. **「OAuth 2.0 クライアントID」** を選択

3. **アプリケーションの種類を選択**
   - 「ウェブアプリケーション」を選択

4. **名前を入力**
   - 例: `YouTube Insight Hub - Local Development`

5. **承認済みのJavaScript生成元**
   - 「+ URIを追加」をクリック
   - `http://localhost:3000` を入力
   - 「+ URIを追加」を再度クリックして、必要に応じて追加

6. **承認済みのリダイレクトURI**
   - 「+ URIを追加」をクリック
   - `http://localhost:3000` を入力
   - これは、OAuth認証後にリダイレクトされるURLです

7. **作成**
   - 「作成」をクリック

8. **Client IDをコピー**
   - モーダルが表示され、**Client ID** と **Client Secret** が表示されます
   - **Client ID** をコピー（例: `123456789-abcdefghijklmnop.apps.googleusercontent.com`）
   - **重要**: Client Secretは表示されませんが、現在の実装では不要です

---

## 📋 ステップ3: 必要なAPIの有効化

### 3.1 Google Drive APIの有効化

1. 左側のメニューから「APIとサービス」→「ライブラリ」をクリック
2. 検索バーで「Google Drive API」を検索
3. 「Google Drive API」をクリック
4. 「有効にする」をクリック

### 3.2 Google Docs APIの有効化

1. 「ライブラリ」ページに戻る
2. 検索バーで「Google Docs API」を検索
3. 「Google Docs API」をクリック
4. 「有効にする」をクリック

---

## 📋 ステップ4: アプリ内で設定

### 4.1 Client IDをアプリに入力

1. アプリの「連携設定」セクションを開く
2. 「Google Client ID」の入力フィールドに、作成したClient IDを貼り付け
3. 入力フィールドの外をクリックして保存（自動保存される場合があります）

### 4.2 Google認証を実行

1. 「Googleと連携する」ボタンをクリック
2. **期待される動作**:
   - 新しいタブまたはポップアップでGoogle認証画面が開く
   - Googleアカウントを選択（複数アカウントがある場合）
   - 権限の承認画面が表示される
   - 「YouTube Insight Hub が次の権限をリクエストしています」と表示される
   - 権限を承認すると、元のページに戻る
   - 「Google 接続済み」または類似のメッセージが表示される

---

## ⚠️ よくある問題と解決方法

### 問題1: 「このアプリは確認されていません」と表示される

**原因**: OAuth同意画面が正しく設定されていない、またはテストユーザーが追加されていない

**解決方法**:
1. 「OAuth同意画面」を確認
2. テストユーザーとして自分のGoogleアカウントを追加
3. アプリ情報を正しく入力

### 問題2: 403エラーが表示される

**原因**: 
- 承認済みのJavaScript生成元が正しく設定されていない
- 承認済みのリダイレクトURIが正しく設定されていない

**解決方法**:
1. OAuth 2.0クライアントIDの設定を確認
2. `http://localhost:3000` が正しく設定されているか確認
3. 必要に応じて、`http://localhost:3002` なども追加

### 問題3: 認証画面が開かない

**原因**: 
- Client IDが正しく入力されていない
- ポップアップブロッカーが有効になっている

**解決方法**:
1. Client IDを再確認
2. ブラウザのポップアップを許可
3. 開発者ツールのコンソールでエラーを確認

---

## ✅ 確認チェックリスト

OAuth 2.0クライアントIDを作成したら、以下を確認：

- [ ] OAuth同意画面が設定されている
- [ ] テストユーザーが追加されている（外部の場合）
- [ ] OAuth 2.0クライアントIDが作成されている
- [ ] 承認済みのJavaScript生成元に `http://localhost:3000` が設定されている
- [ ] 承認済みのリダイレクトURIに `http://localhost:3000` が設定されている
- [ ] Google Drive APIが有効化されている
- [ ] Google Docs APIが有効化されている
- [ ] Client IDがアプリに入力されている
- [ ] Google認証が正常に完了する

---

## 🎯 次のステップ

OAuth 2.0クライアントIDの作成が完了したら：

1. **動画スキャン機能のテスト**
   - 「最新をチェック」ボタンをクリック
   - 新しい要約が生成されることを確認

2. **Googleドキュメント作成の確認**
   - Google Driveで「YouTube Insight Hub」フォルダが作成されることを確認
   - 要約ドキュメントが保存されることを確認

3. **Google Chat通知のテスト**（オプション）
   - Webhook URLを設定
   - 通知が届くことを確認

---

## 📝 参考リンク

- [Google Cloud Console](https://console.cloud.google.com)
- [OAuth 2.0設定ガイド](https://developers.google.com/identity/protocols/oauth2)
- [Google Drive API](https://developers.google.com/drive/api)
- [Google Docs API](https://developers.google.com/docs/api)

