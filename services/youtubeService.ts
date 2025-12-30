/**
 * YouTube Data API v3 サービス
 * チャンネル情報、動画リスト、動画詳細を取得
 */

export interface YouTubeChannelInfo {
  id: string;
  title: string;
  customUrl?: string;
  thumbnailUrl: string;
  subscriberCount?: string;
}

export interface YouTubeVideoDetails {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnailUrl: string;
  duration: string;
  viewCount: string;
  likeCount: string;
  channelId: string;
  channelTitle: string;
}

export interface YouTubePlaylistItem {
  videoId: string;
  publishedAt: string;
  title: string;
  description: string;
  thumbnailUrl: string;
}

export class YouTubeService {
  private apiKey: string;
  private baseUrl = 'https://www.googleapis.com/youtube/v3';

  constructor() {
    // Vercel Serverless Functionsでは process.env を使用
    // クライアント側では import.meta.env を使用
    if (typeof process !== 'undefined' && process.env) {
      // Serverless Functions環境
      this.apiKey = process.env.YOUTUBE_API_KEY || process.env.VITE_YOUTUBE_API_KEY || '';
    } else if (typeof import.meta !== 'undefined') {
      // クライアント側環境
      const env = (import.meta as any).env || {};
      this.apiKey = env.VITE_YOUTUBE_API_KEY || '';
    } else {
      this.apiKey = '';
    }
    
    if (!this.apiKey) {
      console.warn('⚠️ YouTube APIキーが設定されていません。');
    }
  }

  private ensureApiKey(): void {
    if (!this.apiKey) {
      throw new Error('YouTube APIキーが設定されていません。.env.local に VITE_YOUTUBE_API_KEY を設定してください。');
    }
  }

  /**
   * チャンネルハンドル（@example）からチャンネルIDを取得
   */
  async getChannelId(handle: string): Promise<string | null> {
    this.ensureApiKey();
    
    try {
      // @を削除
      const username = handle.replace('@', '');
      
      const url = new URL(`${this.baseUrl}/channels`);
      url.searchParams.set('part', 'id,snippet');
      url.searchParams.set('forUsername', username);
      url.searchParams.set('key', this.apiKey);

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        return data.items[0].id;
      }

      // forUsernameで見つからない場合、customUrlで検索
      return await this.getChannelIdByCustomUrl(handle);
    } catch (error) {
      console.error('getChannelId error:', error);
      return null;
    }
  }

  /**
   * カスタムURL（@example）からチャンネルIDを取得
   */
  private async getChannelIdByCustomUrl(handle: string): Promise<string | null> {
    try {
      const url = new URL(`${this.baseUrl}/channels`);
      url.searchParams.set('part', 'id');
      url.searchParams.set('forHandle', handle.replace('@', ''));
      url.searchParams.set('key', this.apiKey);

      const response = await fetch(url.toString());
      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.items && data.items.length > 0 ? data.items[0].id : null;
    } catch (error) {
      console.error('getChannelIdByCustomUrl error:', error);
      return null;
    }
  }

  /**
   * チャンネル情報を取得
   */
  async getChannelInfo(channelId: string): Promise<YouTubeChannelInfo | null> {
    this.ensureApiKey();

    try {
      const url = new URL(`${this.baseUrl}/channels`);
      url.searchParams.set('part', 'id,snippet,contentDetails,statistics');
      url.searchParams.set('id', channelId);
      url.searchParams.set('key', this.apiKey);

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        const item = data.items[0];
        return {
          id: item.id,
          title: item.snippet.title,
          customUrl: item.snippet.customUrl,
          thumbnailUrl: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url || '',
          subscriberCount: item.statistics?.subscriberCount
        };
      }

      return null;
    } catch (error) {
      console.error('getChannelInfo error:', error);
      return null;
    }
  }

  /**
   * チャンネルのアップロードプレイリストIDを取得
   */
  async getChannelUploadsPlaylist(channelId: string): Promise<string | null> {
    this.ensureApiKey();

    try {
      const url = new URL(`${this.baseUrl}/channels`);
      url.searchParams.set('part', 'contentDetails');
      url.searchParams.set('id', channelId);
      url.searchParams.set('key', this.apiKey);

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        return data.items[0].contentDetails?.relatedPlaylists?.uploads || null;
      }

      return null;
    } catch (error) {
      console.error('getChannelUploadsPlaylist error:', error);
      return null;
    }
  }

  /**
   * チャンネルの最新動画のVIDEO_IDリストを取得（search.list）
   */
  async getChannelVideos(channelId: string, maxResults: number = 3): Promise<string[]> {
    this.ensureApiKey();

    try {
      const url = new URL(`${this.baseUrl}/search`);
      url.searchParams.set('part', 'id');
      url.searchParams.set('channelId', channelId);
      url.searchParams.set('order', 'date');
      url.searchParams.set('maxResults', maxResults.toString());
      url.searchParams.set('type', 'video');
      url.searchParams.set('key', this.apiKey);

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.items) {
        return data.items
          .filter((item: any) => item.id?.videoId)
          .map((item: any) => item.id.videoId);
      }

      return [];
    } catch (error) {
      console.error('getChannelVideos error:', error);
      return [];
    }
  }

  /**
   * プレイリストの動画VIDEO_IDリストを取得（playlistItems.list）
   */
  async getPlaylistVideos(playlistId: string, maxResults: number = 3): Promise<string[]> {
    this.ensureApiKey();

    try {
      const url = new URL(`${this.baseUrl}/playlistItems`);
      url.searchParams.set('part', 'contentDetails');
      url.searchParams.set('playlistId', playlistId);
      url.searchParams.set('maxResults', maxResults.toString());
      url.searchParams.set('key', this.apiKey);

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.items) {
        return data.items
          .filter((item: any) => item.contentDetails?.videoId)
          .map((item: any) => item.contentDetails.videoId);
      }

      return [];
    } catch (error) {
      console.error('getPlaylistVideos error:', error);
      return [];
    }
  }

  /**
   * VIDEO_IDから動画の詳細情報を取得（videos.list）
   * 最大50件まで一度に取得可能
   */
  async getVideoDetails(videoIds: string[]): Promise<YouTubeVideoDetails[]> {
    this.ensureApiKey();

    if (videoIds.length === 0) {
      return [];
    }

    // 最大50件まで一度に取得可能
    const batchSize = 50;
    const results: YouTubeVideoDetails[] = [];

    for (let i = 0; i < videoIds.length; i += batchSize) {
      const batch = videoIds.slice(i, i + batchSize);

      try {
        const url = new URL(`${this.baseUrl}/videos`);
        url.searchParams.set('part', 'snippet,contentDetails,statistics');
        url.searchParams.set('id', batch.join(','));
        url.searchParams.set('key', this.apiKey);

        const response = await fetch(url.toString());
        if (!response.ok) {
          throw new Error(`YouTube API error: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.items) {
          for (const item of data.items) {
            results.push({
              id: item.id,
              title: item.snippet.title,
              description: item.snippet.description || '',
              publishedAt: item.snippet.publishedAt,
              thumbnailUrl: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url || '',
              duration: item.contentDetails?.duration || '',
              viewCount: item.statistics?.viewCount || '0',
              likeCount: item.statistics?.likeCount || '0',
              channelId: item.snippet.channelId,
              channelTitle: item.snippet.channelTitle
            });
          }
        }
      } catch (error) {
        console.error('getVideoDetails error:', error);
      }
    }

    return results;
  }

  /**
   * WebSub Hubに購読リクエストを送信
   */
  async subscribeToWebSub(topicUrl: string, callbackUrl: string, leaseSeconds: number = 432000): Promise<boolean> {
    try {
      const hubUrl = 'https://pubsubhubbub.appspot.com/subscribe';
      
      const params = new URLSearchParams({
        'hub.mode': 'subscribe',
        'hub.topic': topicUrl,
        'hub.callback': callbackUrl,
        'hub.lease_seconds': leaseSeconds.toString()
      });

      const response = await fetch(hubUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      // 202 Accepted または 204 No Content が正常
      return response.status === 202 || response.status === 204;
    } catch (error) {
      console.error('subscribeToWebSub error:', error);
      return false;
    }
  }
}


