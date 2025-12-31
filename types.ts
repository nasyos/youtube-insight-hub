
// メタデータと要約内容（要約内容はGoogleドキュメントにも保存）
export interface VideoSummary {
  id: string;
  title: string;
  publishedAt: string;
  thumbnailUrl: string;
  channelId: string;
  channelTitle: string;
  url: string;
  docUrl: string; // Google Doc URL（必須）
  docId?: string; // Google Doc ID（オプション）
  summary?: string; // 要約内容（オプショナル）
  keyPoints?: string[]; // 重要なポイント（オプショナル）
  createdAt?: string;
  updatedAt?: string;
}

// Gemini APIから取得する際の一時的な型（要約内容を含む）
export interface VideoSummaryWithContent {
  id: string;
  title: string;
  publishedAt: string;
  thumbnailUrl: string;
  summary: string;
  keyPoints: string[];
  channelId: string;
  channelTitle: string;
  url: string;
}

export interface TrackedChannel {
  id: string;
  name: string;
  handle: string;
  lastChecked: string;
  thumbnailUrl: string;
  channelId?: string; // YouTubeチャンネルID（UCxxxxx）
  uploadsPlaylistId?: string; // アップロードプレイリストID
}

export interface GoogleConfig {
  clientId: string;
  chatWebhookUrl: string;
  autoExport: boolean;
  isConnected: boolean;
}

export interface AutomationConfig {
  isAutoScanEnabled: boolean;
  intervalMinutes: number;
}

export enum StorageKey {
  CHANNELS = 'yt_insight_channels',
  SUMMARIES = 'yt_insight_summaries',
  GOOGLE_CONFIG = 'yt_insight_google_config',
  AUTO_CONFIG = 'yt_insight_auto_config'
}
