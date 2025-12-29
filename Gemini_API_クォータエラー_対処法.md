# Gemini API クォータエラー（429）の対処法

## 🔍 エラーの内容

コンソールに以下のエラーが表示されています：
```
429 (Too Many Requests)
"You exceeded your current quota, please check your plan and billing details."
status: "RESOURCE_EXHAUSTED"
```

**原因**: Gemini APIのクォータ（レート制限）を超過しています。

---

## ✅ 解決方法

### 方法1: しばらく待ってから再試行（推奨）

Gemini APIにはレート制限があります。しばらく待ってから再度お試しください。

**待機時間の目安**:
- 無料プラン: 1分間あたり15リクエスト、1日あたり1,500リクエスト
- 有料プラン: プランによって異なります

### 方法2: Google Cloud Consoleでクォータを確認

1. [Google Cloud Console](https://console.cloud.google.com) にアクセス
2. 「APIとサービス」→「割り当て」を開く
3. 「Generative Language API」を検索
4. 現在の使用状況と制限を確認

### 方法3: プラン・課金設定を確認

1. [Google AI Studio](https://aistudio.google.com/app/apikey) にアクセス
2. 使用しているAPIキーのプランを確認
3. 必要に応じて有料プランにアップグレード

### 方法4: リクエスト頻度を下げる

- チャンネル追加を連続で行わない
- スキャン機能を使用する際も、間隔を空ける

---

## 📊 Gemini APIのレート制限

### 無料プラン（Free Tier）

- **1分間あたり**: 15リクエスト
- **1日あたり**: 1,500リクエスト
- **1分間あたりのトークン数**: 1,000,000トークン

### 有料プラン（Paid Tier）

プランによって異なります。詳細は以下を参照：
- [Gemini API Rate Limits](https://ai.google.dev/gemini-api/docs/rate-limits)

---

## 🛠️ 実装した改善

エラーハンドリングを改善し、429エラーの場合に詳細なメッセージを表示するようにしました。

### `services/geminiService.ts` の変更

```typescript
catch (error: any) {
  console.error("Find Channel Error:", error);
  
  // 429エラー（クォータ超過）の場合の詳細なエラーメッセージ
  if (error?.error?.code === 429 || error?.status === 429) {
    throw new Error(
      'Gemini APIのクォータを超過しました。しばらく待ってから再度お試しください。\n' +
      '詳細: https://ai.google.dev/gemini-api/docs/rate-limits'
    );
  }
  
  // 400エラー（APIキー無効）の場合
  if (error?.error?.code === 400 || error?.status === 400) {
    throw new Error('Gemini APIキーが無効です。APIキーを確認してください。');
  }
  
  return null;
}
```

これにより、ユーザーに分かりやすいエラーメッセージが表示されます。

---

## ⏰ 次のステップ

1. **しばらく待つ**（5-10分程度）
2. **再度チャンネル追加を試す**
3. **それでもエラーが出る場合**:
   - Google Cloud Consoleでクォータを確認
   - 必要に応じて有料プランにアップグレード

---

## 📝 参考リンク

- [Gemini API Rate Limits](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Google AI Studio](https://aistudio.google.com/app/apikey)
- [Google Cloud Console](https://console.cloud.google.com)

