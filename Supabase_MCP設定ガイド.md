# Supabase MCPサーバー設定ガイド

## 📋 概要

このガイドでは、Supabase MCPサーバーをCursorで設定し、コンソール上でSupabaseを操作できるようにする手順を説明します。

## 🔑 必要な情報の取得

まず、Supabaseダッシュボードから以下の情報を取得してください：

### 1. プロジェクトリファレンス（Project Reference）の取得

**方法1: Supabaseダッシュボードから取得**

1. Supabaseダッシュボードにログイン
2. プロジェクトを選択
3. 「Settings」→「General」を開く
4. **Project URL**を確認（例: `https://xxxxxxxxxxxxx.supabase.co`）
5. URLの`https://`と`.supabase.co`の間の部分が**プロジェクトリファレンス**です
   - 例: `https://abcdefghijklmnop.supabase.co` → プロジェクトリファレンスは `abcdefghijklmnop`

**方法2: 既存の環境変数から取得**

既に`.env.local`ファイルに`VITE_SUPABASE_URL`が設定されている場合：

1. `.env.local`ファイルを開く
2. `VITE_SUPABASE_URL`の値を確認
   - 例: `VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co`
3. URLからプロジェクトリファレンスを抽出
   - `https://`と`.supabase.co`の間の部分がプロジェクトリファレンス
   - 例: `abcdefghijklmnop`

**具体例**:
```
VITE_SUPABASE_URL=https://xyzabc123def456.supabase.co
→ プロジェクトリファレンス: xyzabc123def456
```

### 2. サービスロールキー（Service Role Key）の取得

1. Supabaseダッシュボードで「Settings」→「API」を開く
2. 「Project API keys」セクションを確認
3. **`service_role`** キーをコピー
   - ⚠️ **重要**: このキーは機密情報です。絶対に公開しないでください
   - このキーはRLS（Row Level Security）をバイパスします

### 3. データベースパスワードの確認

1. Supabaseダッシュボードで「Settings」→「Database」を開く
2. 「Database password」セクションでパスワードを確認
   - プロジェクト作成時に設定したパスワードです
   - 忘れた場合は「Reset database password」で再設定できます

## 🛠️ MCPサーバーのインストール

### 方法1: npxを使用（推奨）

```bash
npx @supabase/mcp-server-supabase@latest
```

### 方法2: グローバルインストール

```bash
npm install -g @supabase/mcp-server-supabase
```

## ⚙️ Cursorでの設定

### Windowsでの設定ファイルの場所

Cursorの設定ファイルは以下の場所にあります：

```
C:\Users\<ユーザー名>\AppData\Roaming\Cursor\User\settings.json
```

または、環境変数を使用：

```
%APPDATA%\Cursor\User\settings.json
```

### 設定ファイルの編集方法

#### 方法1: Cursorの設定UIから編集（推奨）

1. **Cursorを開く**
2. **設定を開く**:
   - `Ctrl + ,` で設定を開く
   - または「File」→「Preferences」→「Settings」
3. **設定ファイルを開く**:
   - 設定画面の右上にある「Open Settings (JSON)」アイコンをクリック
   - または `Ctrl + Shift + P` でコマンドパレットを開き、「Preferences: Open User Settings (JSON)」を選択

#### 方法2: 直接ファイルを編集

1. エクスプローラーで以下のパスを開く:
   ```
   %APPDATA%\Cursor\User\
   ```
2. `settings.json` をテキストエディタで開く

### 設定ファイルの内容

現在の設定ファイルに、以下の `mcpServers` セクションを追加します：

**現在の設定ファイルの例**:
```json
{
    "window.commandCenter": true
}
```

**MCP設定を追加した後の設定ファイル**:
```json
{
    "window.commandCenter": true,
    "mcpServers": {
        "supabase": {
            "command": "npx",
            "args": [
                "-y",
                "@supabase/mcp-server-supabase@latest"
            ],
            "env": {
                "SUPABASE_PROJECT_REF": "your-project-ref-here",
                "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key-here",
                "SUPABASE_DB_PASSWORD": "your-database-password-here"
            }
        }
    }
}
```

**重要**: 既存の設定を削除せず、`mcpServers` セクションを追加してください。

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest"
      ],
      "env": {
        "SUPABASE_PROJECT_REF": "your-project-ref-here",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key-here",
        "SUPABASE_DB_PASSWORD": "your-database-password-here"
      }
    }
  }
}
```

### 設定値の置き換え

上記の設定で、以下の値を実際の値に置き換えてください：

- `your-project-ref-here`: プロジェクトリファレンス（例: `abcdefghijklmnop`）
- `your-service-role-key-here`: サービスロールキー
- `your-database-password-here`: データベースパスワード

### 設定例

**完全な設定ファイルの例**:

```json
{
    "window.commandCenter": true,
    "mcpServers": {
        "supabase": {
            "command": "npx",
            "args": [
                "-y",
                "@supabase/mcp-server-supabase@latest"
            ],
            "env": {
                "SUPABASE_PROJECT_REF": "abcdefghijklmnop",
                "SUPABASE_SERVICE_ROLE_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjE2MjM5MDIyfQ...",
                "SUPABASE_DB_PASSWORD": "MySecurePassword123!"
            }
        }
    }
}
```

**重要**: 
- `SUPABASE_PROJECT_REF`: プロジェクトリファレンス（通常20文字程度の英数字）
- `SUPABASE_SERVICE_ROLE_KEY`: サービスロールキー（非常に長い文字列、`eyJ`で始まる）
- `SUPABASE_DB_PASSWORD`: データベースパスワード（プロジェクト作成時に設定したもの）

**JSON形式の注意点**:
- 最後の項目の後にカンマ（`,`）を付けない
- 文字列は必ずダブルクォート（`"`）で囲む
- 設定ファイルを保存する前に、JSON形式が正しいか確認する

## 🔄 Cursorの再起動

設定を保存した後、**Cursorを完全に再起動**してください：

1. Cursorを完全に終了
2. 再度Cursorを起動
3. MCPサーバーが自動的に起動します

## ✅ 動作確認

### ステップ1: Cursorの再起動

設定を保存した後、**Cursorを完全に再起動**してください：

1. すべてのCursorウィンドウを閉じる
2. タスクマネージャーでCursorプロセスが終了していることを確認
3. Cursorを再度起動

### ステップ2: MCPサーバーの接続確認

Cursorを再起動後、以下の方法でMCPサーバーが正しく設定されているか確認できます：

1. **MCPリソースの確認**:
   - AIアシスタントに「Supabaseのテーブル一覧を表示して」と依頼
   - または「Supabaseのデータベーススキーマを確認して」と依頼
   - 正常に動作していれば、テーブル情報が表示されます

2. **エラーの確認**:
   - Cursorの出力パネル（`Ctrl + Shift + U`）でエラーメッセージを確認
   - 設定が正しくない場合は、エラーメッセージが表示されます

3. **MCPサーバーのログ確認**:
   - Cursorの開発者ツール（`Ctrl + Shift + I`）でコンソールを確認
   - MCPサーバー関連のエラーがないか確認

### ステップ3: テストクエリの実行

動作確認のために、以下のような簡単なクエリを試してみてください：

- 「Supabaseの`channels`テーブルのデータを表示して」
- 「Supabaseの`summaries`テーブルの件数を教えて」
- 「Supabaseのデータベーススキーマを確認して」

## 🎯 利用可能な操作

MCPサーバーが正しく設定されると、以下の操作がコンソール上で可能になります：

### データベース操作
- ✅ テーブルの作成・削除
- ✅ データの挿入・更新・削除
- ✅ クエリの実行
- ✅ スキーマの変更

### 認証・セキュリティ
- ✅ RLS（Row Level Security）ポリシーの設定
- ✅ ユーザー管理

### ストレージ
- ✅ ファイルのアップロード・ダウンロード
- ✅ バケットの管理

### その他
- ✅ 関数の作成・管理
- ✅ リアルタイムサブスクリプションの設定

## ⚠️ セキュリティの注意事項

1. **サービスロールキーの保護**:
   - サービスロールキーはRLSをバイパスします
   - 絶対に公開リポジトリにコミットしないでください
   - `.gitignore`に設定ファイルを含めることを推奨

2. **開発環境での使用を推奨**:
   - 本番環境では慎重に使用してください
   - 可能であれば、読み取り専用モードを検討してください

3. **プロジェクトスコープの設定**:
   - 必要に応じて、MCPサーバーのアクセス範囲を制限してください

## 🐛 トラブルシューティング

### 問題1: MCPサーバーが起動しない

**症状**: Cursorを再起動してもMCPサーバーが動作しない

**解決方法**:
1. **Node.jsの確認**:
   ```bash
   node --version
   ```
   - Node.js 18以上が必要です
   - インストールされていない場合は、[Node.js公式サイト](https://nodejs.org/)からインストール

2. **npxの確認**:
   ```bash
   npx --version
   ```
   - npxが利用可能か確認

3. **設定ファイルの構文エラーを確認**:
   - JSON形式が正しいか確認
   - カンマの位置、引用符の閉じ忘れがないか確認
   - オンラインJSONバリデーター（例: [jsonlint.com](https://jsonlint.com/)）で検証

4. **Cursorのログを確認**:
   - `Ctrl + Shift + U` で出力パネルを開く
   - エラーメッセージを確認

### 問題2: 認証エラーが発生する

**症状**: 「Authentication failed」や「Invalid credentials」などのエラー

**解決方法**:
1. **プロジェクトリファレンスの確認**:
   - Supabaseダッシュボードで「Settings」→「General」を開く
   - Project URLから正しいプロジェクトリファレンスを抽出
   - スペースや改行が含まれていないか確認

2. **サービスロールキーの確認**:
   - Supabaseダッシュボードで「Settings」→「API」を開く
   - `service_role`キーを再コピー
   - キー全体がコピーされているか確認（非常に長い文字列です）
   - キーの前後にスペースや改行が含まれていないか確認

3. **データベースパスワードの確認**:
   - プロジェクト作成時に設定したパスワードを確認
   - 特殊文字が含まれている場合、エスケープが必要な場合があります
   - パスワードを忘れた場合は、「Settings」→「Database」→「Reset database password」で再設定

### 問題3: 接続できない

**症状**: 「Connection failed」や「Unable to connect」などのエラー

**解決方法**:
1. **Supabaseプロジェクトの状態確認**:
   - Supabaseダッシュボードでプロジェクトがアクティブか確認
   - プロジェクトが一時停止していないか確認

2. **インターネット接続の確認**:
   - インターネット接続が正常か確認
   - プロキシやVPNを使用している場合、設定を確認

3. **ファイアウォール設定の確認**:
   - 企業ネットワークを使用している場合、ファイアウォールでブロックされていないか確認

### 問題4: JSON構文エラー

**症状**: 設定ファイルを保存しようとするとエラーが表示される

**解決方法**:
1. **JSONバリデーターを使用**:
   - [jsonlint.com](https://jsonlint.com/)などのオンラインツールで検証
   - エラーの位置を特定

2. **よくあるエラー**:
   - 最後の項目の後にカンマ（`,`）がある
   - 文字列がダブルクォート（`"`）で囲まれていない
   - 中括弧（`{}`）や角括弧（`[]`）が閉じられていない

3. **設定ファイルの例を参考**:
   - このガイドの「設定例」セクションを参考に、正しい形式で記述

### 問題5: MCPサーバーが認識されない

**症状**: Cursorを再起動してもMCPサーバーが動作しない

**解決方法**:
1. **設定ファイルの場所を確認**:
   - 正しい場所（`%APPDATA%\Cursor\User\settings.json`）に設定ファイルがあるか確認

2. **設定ファイルの名前を確認**:
   - ファイル名が正確に`settings.json`であることを確認
   - 拡張子が`.json`であることを確認

3. **Cursorの完全再起動**:
   - すべてのCursorウィンドウを閉じる
   - タスクマネージャーでCursorプロセスが終了していることを確認
   - Cursorを再度起動

4. **MCPサーバーのログを確認**:
   - Cursorの開発者ツール（`Ctrl + Shift + I`）でコンソールを確認
   - MCPサーバー関連のエラーメッセージを確認

## 📚 参考リンク

- [Supabase公式ドキュメント - MCP](https://supabase.com/mcp)
- [Model Context Protocol公式サイト](https://modelcontextprotocol.io/)
- [Cursor公式ドキュメント](https://cursor.sh/docs)

## 💡 次のステップ

設定が完了したら、以下の操作を試してみてください：

1. **テーブル一覧の取得**:
   - AIアシスタントに「Supabaseのテーブル一覧を表示して」と依頼

2. **データのクエリ**:
   - 「Supabaseの`channels`テーブルのデータを表示して」
   - 「Supabaseの`summaries`テーブルの最新10件を表示して」

3. **スキーマの確認**:
   - 「Supabaseのデータベーススキーマを確認して」
   - 「Supabaseの`channels`テーブルの構造を教えて」

4. **データの操作**:
   - 「Supabaseの`channels`テーブルに新しいデータを追加して」
   - 「Supabaseの`summaries`テーブルのデータを更新して」

AIアシスタントに「Supabaseのテーブル一覧を表示して」と依頼すると、MCP経由でSupabaseにアクセスできます。

## 📋 クイックリファレンス

### 必要な情報の取得先

| 情報 | 取得場所 |
|------|----------|
| プロジェクトリファレンス | Settings → General → Project URL |
| サービスロールキー | Settings → API → service_role key |
| データベースパスワード | Settings → Database → Database password |

### 設定ファイルの場所

**Windows**:
```
%APPDATA%\Cursor\User\settings.json
```

**具体的なパス例**:
```
C:\Users\<ユーザー名>\AppData\Roaming\Cursor\User\settings.json
```

### 設定ファイルの最小構成

```json
{
    "mcpServers": {
        "supabase": {
            "command": "npx",
            "args": ["-y", "@supabase/mcp-server-supabase@latest"],
            "env": {
                "SUPABASE_PROJECT_REF": "your-project-ref",
                "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key",
                "SUPABASE_DB_PASSWORD": "your-database-password"
            }
        }
    }
}
```

### よく使うコマンド

- **設定ファイルを開く**: `Ctrl + Shift + P` → 「Preferences: Open User Settings (JSON)」
- **出力パネルを開く**: `Ctrl + Shift + U`
- **開発者ツールを開く**: `Ctrl + Shift + I`

