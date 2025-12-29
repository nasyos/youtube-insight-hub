# YouTube Insight Hub - 設計仕様（Googleドキュメント主ストレージ版）

## 📋 設計方針の変更

### 現状の設計
- **要約データの保存先**: LocalStorage（全データ: summary, keyPoints等）
- **Googleドキュメント**: オプション（手動保存時のみ）
- **データベース**: 未実装

### 新しい設計（Googleドキュメント主ストレージ）
- **要約データの保存先**: Googleドキュメント（詳細内容）
- **データベース**: メタデータのみ保存（インデックス・検索用）
- **LocalStorage**: 一時的なキャッシュのみ

---

## 🎯 データの役割分担

### Googleドキュメント（主ストレージ）
**保存するデータ**:
- 動画タイトル
- チャンネル名
- 公開日
- 動画URL
- **要約文（詳細）**
- **重要なポイント（詳細）**
- その他の補足情報

**メリット**:
- ✅ ユーザーが直接編集可能
- ✅ 検索・共有が容易
- ✅ 容量制限なし（実質的）
- ✅ バージョン履歴が自動保存
- ✅ 複数人での共同編集が可能

### データベース（メタデータ・インデックス）
**保存するデータ**:
- 動画ID
- 動画タイトル（短縮版）
- 動画URL
- 公開日
- チャンネルID
- チャンネル名
- **GoogleドキュメントURL（docUrl）**
- サムネイルURL
- 作成日時
- 更新日時

**保存しないデータ**:
- ❌ 詳細な要約文（Googleドキュメントに保存）
- ❌ 重要なポイントの詳細（Googleドキュメントに保存）

**メリット**:
- ✅ 高速な検索・フィルタリング
- ✅ 重複チェック（同じ動画URLの判定）
- ✅ 一覧表示の高速化
- ✅ 自動化処理（定期クローリング、Webhook）での効率的な処理

---

## 📊 新しいデータフロー

### 1. 動画スキャン・要約生成時
```
1. GeminiService.scanChannel() で動画情報と要約を取得
   ↓
2. すぐにGoogleドキュメントを作成・保存
   - createSummaryDoc() を自動実行
   - 要約内容をGoogleドキュメントに書き込み
   ↓
3. データベースにメタデータのみ保存
   - docUrl（GoogleドキュメントのURL）
   - 動画URL（重複チェック用）
   - タイトル、チャンネル名、公開日など
   ↓
4. Webページに表示
   - データベースからメタデータを取得
   - カード表示（docUrlへのリンク付き）
```

### 2. 定期クローリング時
```
1. データベースからチャンネル一覧を取得
   ↓
2. 各チャンネルをスキャン
   ↓
3. 新しい動画かチェック（データベースの動画URLで判定）
   ↓
4. 新規動画の場合:
   - Googleドキュメントを作成
   - データベースにメタデータを保存
   - Google Chatに通知（docUrlを含む）
```

### 3. Webhook受信時
```
1. YouTubeから新しい動画の通知を受信
   ↓
2. データベースで重複チェック
   ↓
3. 新規動画の場合:
   - GeminiServiceで要約生成
   - Googleドキュメントを作成
   - データベースにメタデータを保存
   - Google Chatに通知
```

---

## 🗄️ データベーススキーマ（簡略版）

### channels テーブル
```sql
CREATE TABLE channels (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  handle VARCHAR NOT NULL,
  thumbnail_url VARCHAR,
  last_checked TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### summaries テーブル（メタデータのみ）
```sql
CREATE TABLE summaries (
  id VARCHAR PRIMARY KEY,
  video_url VARCHAR UNIQUE NOT NULL,  -- 重複チェック用
  title VARCHAR NOT NULL,
  channel_id VARCHAR REFERENCES channels(id),
  channel_title VARCHAR NOT NULL,
  published_at TIMESTAMP,
  thumbnail_url VARCHAR,
  doc_url VARCHAR NOT NULL,  -- GoogleドキュメントURL（必須）
  doc_id VARCHAR,  -- GoogleドキュメントID（オプション）
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_summaries_video_url ON summaries(video_url);
CREATE INDEX idx_summaries_channel_id ON summaries(channel_id);
CREATE INDEX idx_summaries_published_at ON summaries(published_at DESC);
CREATE INDEX idx_summaries_created_at ON summaries(created_at DESC);
```

**注意**: `summary`（要約文）や `key_points`（重要ポイント）のカラムは**不要**です。これらはGoogleドキュメントに保存されます。

---

## 🔄 実装の変更点

### 1. App.tsx の変更

#### 変更前（現状）
```typescript
// 要約をLocalStorageに全データ保存
setSummaries(prev => {
  const exists = prev.some(existing => existing.title === s.title);
  if (exists) return prev;
  return [s, ...prev].slice(0, 50);
});
```

#### 変更後（新設計）
```typescript
// 1. まずGoogleドキュメントを作成（要約内容を保存）
const docUrl = await googleApi.current.createSummaryDoc(s);

// 2. メタデータのみをデータベースに保存
await api.saveSummaryMetadata({
  id: s.id,
  videoUrl: s.url,
  title: s.title,
  channelId: s.channelId,
  channelTitle: s.channelTitle,
  publishedAt: s.publishedAt,
  thumbnailUrl: s.thumbnailUrl,
  docUrl: docUrl  // GoogleドキュメントURL
});

// 3. 表示用にメタデータを取得
const summaries = await api.getSummaries();
setSummaries(summaries);
```

### 2. Googleドキュメント作成の自動化

#### 変更前
- 手動ボタンクリック時のみ作成

#### 変更後
- スキャン時に自動的に作成
- `autoExport` フラグで制御可能

```typescript
const scanAllChannels = useCallback(async () => {
  // ...
  for (const channel of channels) {
    const foundSummaries = await gemini.current.scanChannel(channel);
    for (const s of foundSummaries) {
      // 重複チェック（データベースで確認）
      const exists = await api.checkVideoExists(s.url);
      if (exists) continue;
      
      // 自動的にGoogleドキュメントを作成
      const docUrl = await googleApi.current.createSummaryDoc(s);
      
      // メタデータのみをデータベースに保存
      await api.saveSummaryMetadata({
        ...s,
        docUrl
      });
    }
  }
}, [channels, isScanning]);
```

### 3. 表示データの取得

#### 変更前
```typescript
// LocalStorageから全データを取得
const [summaries, setSummaries] = useState<VideoSummary[]>(() => {
  const saved = localStorage.getItem(StorageKey.SUMMARIES);
  return saved ? JSON.parse(saved) : [];
});
```

#### 変更後
```typescript
// データベースからメタデータを取得
useEffect(() => {
  const loadSummaries = async () => {
    const data = await api.getSummaries();
    setSummaries(data);
  };
  loadSummaries();
}, []);
```

### 4. SummaryCard コンポーネントの変更

#### 変更前
```typescript
// 要約文と重要ポイントを直接表示
<p>{summary.summary}</p>
{summary.keyPoints.map(...)}
```

#### 変更後
```typescript
// Googleドキュメントへのリンクを強調
<a href={summary.docUrl} target="_blank">
  📄 要約をGoogleドキュメントで見る
</a>
// または、Googleドキュメントから要約を取得して表示（オプション）
```

---

## 📝 データベース活用方法の変更

### データベースの主な用途

1. **重複チェック**
   - 同じ動画URLが既に処理済みかチェック
   - `video_url` カラムでUNIQUE制約

2. **一覧表示・検索**
   - タイトル、チャンネル名での検索
   - 公開日でのソート・フィルタ
   - ページネーション

3. **自動化処理**
   - 定期クローリング: どのチャンネルをチェックするか
   - Webhook: 新しい動画かどうかの判定

4. **統計・分析**
   - チャンネルごとの動画数
   - 日付ごとの要約数
   - 最も多く要約されているチャンネル

### データベースに保存しないもの

- ❌ 詳細な要約文（Googleドキュメントに保存）
- ❌ 重要なポイントの詳細（Googleドキュメントに保存）
- ❌ 長文のコンテンツ（Googleドキュメントに保存）

### データベースに保存するもの（メタデータ）

- ✅ 動画URL（重複チェック用）
- ✅ タイトル（検索・表示用）
- ✅ チャンネル情報（フィルタ用）
- ✅ 公開日（ソート用）
- ✅ **GoogleドキュメントURL（必須）**
- ✅ サムネイルURL（表示用）

---

## 🎨 UI/UXの変更

### 1. 要約カードの表示

#### オプションA: 簡易表示（推奨）
- タイトル、チャンネル名、公開日のみ表示
- 「Googleドキュメントで見る」ボタンを大きく表示
- 要約文は表示しない（Googleドキュメントで確認）

#### オプションB: プレビュー表示
- タイトル、チャンネル名、公開日
- 要約文の最初の100文字をプレビュー表示
- 「続きを読む」でGoogleドキュメントを開く

### 2. 自動保存の設定

```typescript
// 設定UIに追加
<div>
  <label>
    <input 
      type="checkbox" 
      checked={googleConfig.autoSaveToDoc}
      onChange={e => setGoogleConfig(prev => ({
        ...prev, 
        autoSaveToDoc: e.target.checked
      }))}
    />
    新しい要約を自動的にGoogleドキュメントに保存
  </label>
</div>
```

---

## 🔧 実装の優先順位

### フェーズ1: データベース連携（メタデータのみ）
1. データベーススキーマ作成（メタデータのみ）
2. APIエンドポイント作成
3. フロントエンド修正（LocalStorage → API）

### フェーズ2: Googleドキュメント自動保存
1. スキャン時に自動的にGoogleドキュメント作成
2. データベースにメタデータ保存
3. UIの調整

### フェーズ3: 表示の最適化
1. SummaryCardの変更（Googleドキュメントリンク強調）
2. 検索・フィルタ機能の追加
3. ページネーション

---

## ✅ この設計のメリット

1. **データの一元管理**: 詳細な要約はGoogleドキュメントに集約
2. **編集の容易さ**: ユーザーが直接Googleドキュメントを編集可能
3. **データベースの軽量化**: メタデータのみで高速処理
4. **検索の柔軟性**: Googleドキュメントの検索機能を活用
5. **共有の容易さ**: Googleドキュメントの共有機能を活用
6. **容量制限なし**: Googleドキュメントは実質的に無制限

---

## ⚠️ 注意点

1. **Google認証が必要**: すべてのユーザーがGoogle認証を完了している必要がある
2. **オフライン対応不可**: Googleドキュメントはオンライン必須
3. **API制限**: Google Drive API / Docs APIのクォータに注意
4. **データ移行**: 既存のLocalStorageデータの移行が必要

---

## 📋 まとめ

**Googleドキュメントを主ストレージとする場合**:
- データベースは「メタデータ・インデックス」として活用
- 詳細な要約内容はGoogleドキュメントに保存
- データベースには `docUrl` とメタデータのみ保存
- 重複チェック、検索、一覧表示にデータベースを活用

この設計により、データベースは軽量で高速に動作し、詳細な要約内容はGoogleドキュメントで管理できるようになります。

