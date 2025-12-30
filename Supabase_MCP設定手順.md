# Supabase MCP設定手順

## 📋 概要

SupabaseのMCP（Model Context Protocol）を設定することで、Cursorから直接Supabaseデータベースにアクセスし、クエリの実行やデータベースの管理が可能になります。

---

## 🔑 ステップ1: Personal Access Tokenを取得

### 1.1 Supabaseダッシュボードにアクセス

1. [Supabaseダッシュボード](https://supabase.com/dashboard)にログイン
2. 右上のアカウントアイコンをクリック
3. 「**Account Settings**」を選択
4. 左メニューから「**Access Tokens**」をクリック

### 1.2 Personal Access Tokenを生成

1. 「**Generate new token**」ボタンをクリック
2. トークン名を入力（例: `Cursor MCP`）
3. 「**Generate token**」をクリック
4. **生成されたトークンをコピー**（この画面を閉じると二度と表示されません）

**重要**: トークンは安全に保管してください。

---

## ⚙️ ステップ2: MCP設定ファイルを更新

### 2.1 現在の設定を確認

現在の`mcp.json`ファイル:
```json
{
  "mcpServers": {
    "supabase": {
      "url": "https://mcp.supabase.com/mcp",
      "headers": {}
    }
  }
}
```

### 2.2 推奨設定に変更

Personal Access Tokenを使用する設定に変更します:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--access-token",
        "YOUR_PERSONAL_ACCESS_TOKEN_HERE"
      ]
    }
  }
}
```

**変更点**:
- `url`ベースから`command`ベースに変更
- `@supabase/mcp-server-supabase`パッケージを使用
- Personal Access Tokenを`--access-token`引数で指定

---

## 📝 ステップ3: 設定ファイルを更新

### 3.1 mcp.jsonファイルを開く

ファイルパス: `C:\Users\nasuy\.cursor\mcp.json`

### 3.2 設定を更新

上記の推奨設定に変更し、`YOUR_PERSONAL_ACCESS_TOKEN_HERE`の部分を、ステップ1.2で取得したPersonal Access Tokenに置き換えます。

**例**:
```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--access-token",
        "sbp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
      ]
    }
  }
}
```

---

## 🔄 ステップ4: Cursorを再起動

1. Cursorを完全に終了
2. Cursorを再起動
3. MCPサーバーが正常に接続されているか確認

---

## ✅ 動作確認

### MCPサーバーが正常に動作しているか確認

CursorのMCP機能を使用して、Supabaseデータベースにアクセスできるか確認します。

**確認方法**:
1. CursorでMCP機能を使用
2. Supabaseデータベースのクエリを実行
3. エラーが発生しないことを確認

---

## 🔒 セキュリティ注意事項

### 1. Personal Access Tokenの管理

- **絶対にGitHubにコミットしないでください**
- `.gitignore`に`mcp.json`が含まれていることを確認
- トークンが漏洩した場合は、すぐにSupabaseダッシュボードで無効化

### 2. トークンの権限

- Personal Access Tokenは、プロジェクトへの完全なアクセス権限を持ちます
- 必要最小限の権限で使用することを推奨

---

## 🐛 トラブルシューティング

### 問題1: MCPサーバーに接続できない

**解決方法**:
1. Personal Access Tokenが正しく設定されているか確認
2. `npx`コマンドが使用可能か確認
3. インターネット接続を確認

### 問題2: トークンが無効

**解決方法**:
1. Supabaseダッシュボードでトークンが有効か確認
2. 新しいトークンを生成して設定を更新

### 問題3: パッケージが見つからない

**解決方法**:
1. `npm`がインストールされているか確認
2. インターネット接続を確認
3. 手動でパッケージをインストール:
   ```bash
   npm install -g @supabase/mcp-server-supabase
   ```

---

## 📚 参考資料

- [Supabase MCP Server Documentation](https://github.com/supabase/mcp-server-supabase)
- [Model Context Protocol (MCP) Documentation](https://modelcontextprotocol.io/)

---

## 📝 まとめ

1. ✅ SupabaseダッシュボードでPersonal Access Tokenを取得
2. ✅ `mcp.json`ファイルを更新
3. ✅ Cursorを再起動
4. ✅ 動作確認

これで、Cursorから直接Supabaseデータベースにアクセスできるようになります！


