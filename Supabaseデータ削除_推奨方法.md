# Supabaseデータ削除 - 推奨方法

## ✅ 推奨: テーブルを保持してデータだけを削除

**テーブルを削除（DROP TABLE）せずに、データだけを削除（DELETE）する方法が推奨されます。**

### 理由

1. **テーブル構造が保持される**
   - スキーマ、インデックス、制約などがそのまま残る
   - 再作成の手間が不要

2. **すぐに使用可能**
   - 削除後、すぐに新しいデータを保存できる
   - アプリケーションの再設定が不要

3. **安全**
   - テーブル構造を誤って削除するリスクがない
   - 必要に応じて段階的に削除できる

---

## 📋 データ削除の手順

### 方法1: SQL Editorから削除（推奨）

1. [Supabaseダッシュボード](https://app.supabase.com)にアクセス
2. プロジェクトを選択
3. 左メニューから「SQL Editor」をクリック
4. 以下のSQLを実行:

```sql
-- すべての要約を削除
DELETE FROM summaries;

-- すべてのチャンネルを削除（必要に応じて）
DELETE FROM channels;

-- 削除されたことを確認
SELECT COUNT(*) FROM summaries;  -- 0になるはず
SELECT COUNT(*) FROM channels;   -- 0になるはず
```

### 方法2: Table Editorから削除

1. 左メニューから「Table Editor」をクリック
2. `summaries`テーブルを選択
3. すべての行を選択（チェックボックスで全選択）
4. 「Delete」ボタンをクリック
5. 確認ダイアログで「Delete」をクリック

---

## 🔍 削除前の確認

### データの確認

削除前に、どのくらいのデータがあるか確認できます:

```sql
-- 要約の件数を確認
SELECT COUNT(*) as summary_count FROM summaries;

-- チャンネルの件数を確認
SELECT COUNT(*) as channel_count FROM channels;

-- 最新の要約を確認（必要に応じて）
SELECT title, created_at FROM summaries ORDER BY created_at DESC LIMIT 10;
```

---

## ⚠️ 注意事項

### 1. 外部キー制約

`summaries`テーブルは`channels`テーブルを参照しているため、削除の順序に注意してください:

```sql
-- 正しい順序: まずsummariesを削除、その後channelsを削除
DELETE FROM summaries;  -- 先に削除
DELETE FROM channels;   -- その後削除
```

**理由**: `summaries`テーブルに`channel_id`の外部キー制約があるため、参照先の`channels`を先に削除するとエラーになります。

### 2. CASCADE削除

もし`channels`テーブルに`ON DELETE CASCADE`が設定されている場合、`channels`を削除すると自動的に`summaries`も削除されます。この場合は順序を気にする必要はありません。

---

## 🎯 完全な削除スクリプト

```sql
-- 1. データの件数を確認
SELECT 
  (SELECT COUNT(*) FROM summaries) as summary_count,
  (SELECT COUNT(*) FROM channels) as channel_count;

-- 2. すべての要約を削除
DELETE FROM summaries;

-- 3. すべてのチャンネルを削除（必要に応じて）
DELETE FROM channels;

-- 4. 削除されたことを確認
SELECT 
  (SELECT COUNT(*) FROM summaries) as summary_count_after,
  (SELECT COUNT(*) FROM channels) as channel_count_after;
```

---

## ✅ 削除後の確認

1. **Supabaseダッシュボードで確認**
   - Table Editorで`summaries`と`channels`テーブルが空になっていることを確認

2. **アプリケーションで確認**
   - ブラウザでアプリケーションをリロード（F5）
   - 要約一覧が空になっていることを確認
   - チャンネル一覧が空になっていることを確認（チャンネルも削除した場合）

3. **新しいデータの保存テスト**
   - チャンネルを追加
   - 「最新をチェック」を実行
   - 新しい要約が正常に保存されることを確認

---

## 🔄 テーブルを削除する場合との比較

### テーブルを削除する場合（非推奨）

```sql
DROP TABLE IF EXISTS summaries CASCADE;
DROP TABLE IF EXISTS channels CASCADE;
```

**デメリット**:
- テーブル構造、インデックス、制約がすべて削除される
- `supabase-schema.sql`を再実行してテーブルを再作成する必要がある
- 時間がかかる

### データだけを削除する場合（推奨）

```sql
DELETE FROM summaries;
DELETE FROM channels;
```

**メリット**:
- テーブル構造が保持される
- すぐに新しいデータを保存できる
- 安全で簡単

---

## 📝 まとめ

- ✅ **推奨**: テーブルを保持してデータだけを削除（`DELETE FROM`）
- ❌ **非推奨**: テーブルごと削除（`DROP TABLE`）

データだけを削除すれば、テーブル構造はそのままなので、すぐに新しいデータを保存できます。問題はありません。


