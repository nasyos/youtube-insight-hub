/**
 * WebSub (PubSubHubbub) サービス
 * YouTubeのWebSub通知を処理
 */

export interface WebSubNotification {
  videoId: string;
  channelId: string;
  eventType: 'new_or_update' | 'deleted';
  rawPayload: any;
}

export class WebSubService {
  /**
   * WebSub購読検証（GETリクエスト）
   * hub.challengeを返して購読を検証
   */
  verifySubscription(mode: string, topic: string, challenge: string): string | null {
    // modeがsubscribeまたはunsubscribeの場合のみ処理
    if (mode !== 'subscribe' && mode !== 'unsubscribe') {
      console.warn('Invalid hub.mode:', mode);
      return null;
    }

    // challengeをそのまま返す（検証成功）
    return challenge;
  }

  /**
   * Atom XMLフィードをパースしてvideoIdとchannelIdを抽出
   */
  async parseAtomFeed(xml: string): Promise<WebSubNotification[]> {
    try {
      // XMLパース（DOMParserを使用）
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'text/xml');

      // パースエラーチェック
      const parseError = doc.querySelector('parsererror');
      if (parseError) {
        throw new Error('XML parse error: ' + parseError.textContent);
      }

      const notifications: WebSubNotification[] = [];
      const entries = doc.querySelectorAll('entry');

      for (const entry of entries) {
        // yt:videoIdを取得
        const videoIdElement = entry.querySelector('yt\\:videoId, videoId');
        const videoId = videoIdElement?.textContent?.trim();

        // yt:channelIdを取得
        const channelIdElement = entry.querySelector('yt\\:channelId, channelId');
        const channelId = channelIdElement?.textContent?.trim();

        if (videoId && channelId) {
          // 削除イベントかどうかを判定（yt:deleted要素の存在で判定）
          const deletedElement = entry.querySelector('yt\\:deleted, deleted');
          const eventType = deletedElement ? 'deleted' : 'new_or_update';

          notifications.push({
            videoId,
            channelId,
            eventType: eventType as 'new_or_update' | 'deleted',
            rawPayload: {
              title: entry.querySelector('title')?.textContent?.trim(),
              published: entry.querySelector('published')?.textContent?.trim(),
              updated: entry.querySelector('updated')?.textContent?.trim(),
              link: entry.querySelector('link')?.getAttribute('href'),
              author: entry.querySelector('author > name')?.textContent?.trim()
            }
          });
        }
      }

      return notifications;
    } catch (error) {
      console.error('parseAtomFeed error:', error);
      throw new Error(`Atom XML parse error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * WebSub topic URLを生成
   */
  generateTopicUrl(channelId: string): string {
    return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  }

  /**
   * WebSub callback URLを生成
   */
  generateCallbackUrl(baseUrl: string = ''): string {
    // 本番環境では環境変数から取得、開発環境ではlocalhost
    if (baseUrl) {
      return `${baseUrl}/api/youtube/websub/callback`;
    }
    
    // 開発環境のデフォルト
    return 'http://localhost:5173/api/youtube/websub/callback';
  }
}


