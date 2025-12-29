# Supabase設定ガイド - 初心者向け完全版

## 📋 目次
1. [Supabaseとは](#supabaseとは)
2. [アカウント作成](#アカウント作成)
3. [プロジェクト作成](#プロジェクト作成)
4. [データベーススキーマ作成](#データベーススキーマ作成)
5. [APIキーの取得](#apiキーの取得)
6. [環境変数の設定](#環境変数の設定)
7. [動作確認](#動作確認)

---

## 1. Supabaseとは

**Supabase**は、Firebaseのオープンソース版のようなサービスで、データベースを簡単に使えるようにしてくれます。

**このプロジェクトでの役割**:
- チャンネル情報の保存
- 要約メタデータの保存
- 複数デバイス間でのデータ同期

---

## 2. アカウント作成

### ステップ1: SupabaseのWebサイトにアクセス

1. ブラウザで以下のURLを開きます：
   ```
   https://supabase.com
   ```

2. 右上の「**Start your project**」または「**Sign in**」をクリック

### ステップ2: アカウント作成

1. **GitHubアカウントでサインアップ（推奨）**
   - 「**Continue with GitHub**」をクリック
   - GitHubアカウントでログイン
   - 必要に応じて権限を許可

2. **または、メールアドレスでサインアップ**
   - メールアドレスを入力
   - パスワードを設定
   - 確認メールを確認

---

## 3. プロジェクト作成

### ステップ1: 新しいプロジェクトを作成

1. Supabaseダッシュボードにログイン後、「**New Project**」をクリック

### ステップ2: プロジェクト情報を入力

以下の情報を入力します：

**Organization（組織）**:
- 初回は新しい組織を作成します
- 「**New Organization**」をクリック
- 組織名を入力（例: `My Organization`）

**Project Name（プロジェクト名）**:
- 例: `youtube-insight-hub`
- 好きな名前でOKです

**Database Password（データベースパスワード）**:
- **重要**: 必ずメモしておいてください！
- 12文字以上の強力なパスワードを設定
- 例: `MySecurePassword123!`

**Region（リージョン）**:
- 日本からアクセスする場合: **`Northeast Asia (Tokyo)`** を選択
- または、最も近いリージョンを選択

**Pricing Plan（料金プラン）**:
- **Free** プランで問題ありません（無料枠で十分です）

### ステップ3: プロジェクト作成を実行

1. 「**Create new project**」をクリック
2. **2-3分待ちます**（データベースのセットアップ中）
3. 「**Your project is ready!**」と表示されたら完了

---

## 4. データベーススキーマ作成

### ステップ1: SQL Editorを開く

1. 左側のメニューから「**SQL Editor**」をクリック
   - アイコンは「</>」のような記号です

### ステップ2: 新しいクエリを作成

1. 「**New query**」をクリック

### ステップ3: SQLスクリプトを貼り付け

1. プロジェクトの `supabase-schema.sql` ファイルを開く
2. ファイルの内容をすべてコピー（Ctrl+A → Ctrl+C）
3. SQL Editorのエディタに貼り付け（Ctrl+V）

**SQLスクリプトの内容**:
```sql
-- channels テーブル
CREATE TABLE IF NOT EXISTS channels (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  handle VARCHAR NOT NULL,
  thumbnail_url VARCHAR,
  last_checked TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- summaries テーブル（メタデータのみ）
CREATE TABLE IF NOT EXISTS summaries (
  id VARCHAR PRIMARY KEY,
  video_url VARCHAR UNIQUE NOT NULL,
  title VARCHAR NOT NULL,
  channel_id VARCHAR REFERENCES channels(id) ON DELETE CASCADE,
  channel_title VARCHAR NOT NULL,
  published_at TIMESTAMP,
  thumbnail_url VARCHAR,
  doc_url VARCHAR NOT NULL,
  doc_id VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_summaries_video_url ON summaries(video_url);
CREATE INDEX IF NOT EXISTS idx_summaries_channel_id ON summaries(channel_id);
CREATE INDEX IF NOT EXISTS idx_summaries_published_at ON summaries(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_summaries_created_at ON summaries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_channels_handle ON channels(handle);

-- updated_at を自動更新する関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- summaries テーブルの updated_at を自動更新するトリガー
CREATE TRIGGER update_summaries_updated_at
  BEFORE UPDATE ON summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### ステップ4: SQLを実行

1. エディタの右下にある「**Run**」ボタンをクリック
   - または、`Ctrl + Enter` を押す

2. 成功メッセージが表示されます：
   ```
   Success. No rows returned
   ```

### ステップ5: テーブルが作成されたことを確認

1. 左側のメニューから「**Table Editor**」をクリック
2. 以下のテーブルが表示されていればOK：
   - `channels`
   - `summaries`

---

## 5. APIキーの取得

### ステップ1: プロジェクト設定を開く

1. 左側のメニューから「**Settings**」（歯車アイコン）をクリック
2. 「**API**」をクリック

### ステップ2: APIキーをコピー

以下の2つの値をコピーします：

#### ① Project URL

1. 「**Project URL**」の下にある値をコピー
   - 例: `https://abcdefghijklmnop.supabase.co`
   - 右側のコピーボタン（📋）をクリック

#### ② Publishable key（公開可能キー）

**方法1: キーが既に表示されている場合**
1. 「**Publishable key**」セクションを確認
2. 「**API KEY**」列に表示されているキーをコピー
   - 例: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`（長い文字列）
   - キーの右側にあるコピーボタン（📋）をクリック

**方法2: キーが非表示の場合**
1. 「**Publishable key**」セクションでキーをクリック
2. または、キーの右側にある「**表示**」や「**Show**」ボタンをクリック
3. 表示されたキーをコピー

**方法3: 新しいキーを作成する場合**
1. 「**+ New publishable key**」ボタンをクリック
2. キー名を入力（例: `youtube-insight-hub`）
3. 「**Create**」をクリック
4. 作成されたキーをコピー

**⚠️ 重要**: 
- `service_role` キーは**絶対に**コピーしないでください（セキュリティ上危険です）
- `Publishable key`（公開可能キー）のみを使用します
- このキーは「anon public key」と同じものです（UIが更新されました）

---

## 6. 環境変数の設定

### ステップ1: .env.localファイルを開く

1. VS Code（またはお使いのエディタ）でプロジェクトフォルダを開く
2. プロジェクトのルートディレクトリ（`package.json`がある場所）に `.env.local` ファイルを作成
   - まだ作成していない場合

### ステップ2: 環境変数を設定

`.env.local` ファイルに以下を貼り付けます：

```env
# Supabase設定
VITE_SUPABASE_URL=ここにProject URLを貼り付け
VITE_SUPABASE_ANON_KEY=ここにPublishable keyを貼り付け

# Gemini API（後で設定）
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

**例**:
```env
# Supabase設定
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxOTMxODE1MDIyfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**注意**: 
- `Publishable key`は「anon public key」と同じものです
- UIが更新されて名前が変わっただけで、機能は同じです

# Gemini API（後で設定）
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

### ステップ3: ファイルを保存

1. `Ctrl + S` で保存

### ステップ4: 開発サーバーを再起動

1. ターミナルで実行中の開発サーバーを停止
   - `Ctrl + C` を押す

2. 再度起動
   ```bash
   npm run dev
   ```

**⚠️ 重要**: 
- 環境変数を変更したら、**必ず**開発サーバーを再起動してください
- `.env.local` ファイルは**Gitにコミットしない**でください（既に`.gitignore`に追加されているはずです）

---

## 7. 動作確認

### ステップ1: ブラウザで確認

1. `http://localhost:3000` にアクセス
2. ブラウザの開発者ツール（F12）を開く
3. 「**Console**」タブを確認

### ステップ2: エラーの確認

**正常な場合**:
- Supabaseの警告メッセージが**表示されない**
- エラーが表示されない

**エラーが出る場合**:
- 「Supabase環境変数が設定されていません」という警告が出る
  - → `.env.local` ファイルが正しく保存されているか確認
  - → 開発サーバーを再起動したか確認

### ステップ3: 機能テスト

1. **チャンネル追加をテスト**
   - サイドバーでチャンネル名を入力
   - 「+」ボタンをクリック
   - （APIキーが設定されていない場合はエラーが出ますが、これは正常です）

2. **データベースを確認**
   - Supabaseダッシュボードの「**Table Editor**」を開く
   - `channels` テーブルにデータが追加されていればOK

---

## 🎯 よくある質問（FAQ）

### Q1: Project URLとPublishable keyの違いは？

**A**: 
- **Project URL**: データベースの場所（住所のようなもの）
- **Publishable key**: データベースにアクセスするための鍵（匿名ユーザー用）
- **注意**: 「Publishable key」は以前の「anon public key」と同じものです（UIが更新されました）

### Q2: service_role keyは使わないの？

**A**: 
- **使いません**。セキュリティ上危険です
- `Publishable key`（公開可能キー）のみを使用します
- `service_role` キーは管理者権限があり、誰でもデータを削除できてしまいます

### Q3: データベースパスワードを忘れたら？

**A**: 
- Settings → Database → Reset database password から再設定できます
- ただし、既存のデータは保持されます

### Q4: 無料プランでどのくらい使えるの？

**A**: 
- データベース: 500MB
- 帯域幅: 5GB/月
- このプロジェクトでは十分な容量です

### Q5: エラーが出る場合は？

**A**: 
1. `.env.local` ファイルが正しく保存されているか確認
2. 開発サーバーを再起動
3. ブラウザのコンソール（F12）でエラーメッセージを確認
4. Supabaseダッシュボードでテーブルが作成されているか確認

---

## 📝 まとめ

1. ✅ Supabaseアカウント作成
2. ✅ プロジェクト作成
3. ✅ データベーススキーマ作成（SQL実行）
4. ✅ APIキー取得（Project URL と Publishable key）
5. ✅ `.env.local` に環境変数を設定
6. ✅ 開発サーバーを再起動
7. ✅ 動作確認

これでSupabaseの設定は完了です！

---

## 🔗 参考リンク

- [Supabase公式ドキュメント](https://supabase.com/docs)
- [Supabaseダッシュボード](https://app.supabase.com)

---

**次のステップ**: Gemini APIキーの設定方法も知りたい場合は、お知らせください！

