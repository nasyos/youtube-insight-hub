import type { VercelRequest, VercelResponse } from '@vercel/node';

const YOUTUBE_BASE_URL = 'https://www.googleapis.com/youtube/v3';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { handle } = req.body;
  if (!handle) {
    return res.status(400).json({ error: 'handle is required' });
  }

  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || process.env.VITE_YOUTUBE_API_KEY;
  if (!YOUTUBE_API_KEY) {
    return res.status(500).json({ error: 'YouTube API key not configured' });
  }

  try {
    const handleWithoutAt = handle.replace('@', '');
    console.log('🔍 channel-info: ハンドル =', handle, '(without @ =', handleWithoutAt + ')');
    
    let channelId: string | null = null;
    let channelInfo: any = null;

    // 方法1: forHandleを試す（推奨）
    try {
      const url = new URL(`${YOUTUBE_BASE_URL}/channels`);
      url.searchParams.set('part', 'id,snippet');
      url.searchParams.set('forHandle', handleWithoutAt);
      url.searchParams.set('key', YOUTUBE_API_KEY);

      console.log('🔍 channel-info: forHandle APIを呼び出し中...');
      const response = await fetch(url.toString());
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 channel-info: forHandle APIレスポンス =', data);
        if (data.items && data.items.length > 0) {
          channelId = data.items[0].id;
          channelInfo = {
            id: channelId,
            title: data.items[0].snippet.title,
            handle: data.items[0].snippet.customUrl || handle,
            thumbnailUrl: data.items[0].snippet.thumbnails.high?.url || 
                         data.items[0].snippet.thumbnails.default?.url || 
                         `https://picsum.photos/seed/${data.items[0].snippet.title}/150/150`
          };
          console.log('✅ channel-info: チャンネルIDを取得しました (forHandle) =', channelId);
        } else {
          console.warn('⚠️ channel-info: forHandleでチャンネルが見つかりませんでした');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.warn('⚠️ channel-info: forHandle APIエラー', response.status, errorData);
        
        // 403エラーの場合、詳細なエラーメッセージを返す
        if (response.status === 403) {
          const errorMessage = errorData?.error?.message || 'YouTube Data API v3へのアクセスが拒否されました';
          return res.status(403).json({ 
            error: 'YouTube Data API v3が有効化されていません',
            details: errorMessage,
            helpUrl: errorData?.error?.message?.includes('Enable it by visiting') 
              ? 'https://console.developers.google.com/apis/api/youtube.googleapis.com/overview'
              : undefined
          });
        }
      }
    } catch (error: any) {
        console.warn('⚠️ channel-info: forHandle method failed:', error.message);
      }

    // 方法2: search.listをフォールバックとして試す
    if (!channelId) {
      try {
        const searchUrl = new URL(`${YOUTUBE_BASE_URL}/search`);
        searchUrl.searchParams.set('part', 'snippet');
        searchUrl.searchParams.set('q', handle); // @を含むハンドルで検索
        searchUrl.searchParams.set('type', 'channel');
        searchUrl.searchParams.set('maxResults', '1');
        searchUrl.searchParams.set('key', YOUTUBE_API_KEY);

        console.log('🔍 channel-info: search.list APIを呼び出し中...');
        const searchResponse = await fetch(searchUrl.toString());
        
        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          console.log('🔍 channel-info: search.list APIレスポンス =', searchData);
          if (searchData.items && searchData.items.length > 0) {
            const item = searchData.items[0];
            const customUrl = item.snippet?.customUrl;
            const foundChannelId = item.snippet.channelId;
            
            // ハンドル名が一致するか確認
            if (customUrl && customUrl.toLowerCase() === handle.toLowerCase()) {
              channelId = foundChannelId;
              channelInfo = {
                id: channelId,
                title: item.snippet.title,
                handle: customUrl || handle,
                thumbnailUrl: item.snippet.thumbnails.high?.url || 
                             item.snippet.thumbnails.default?.url || 
                             `https://picsum.photos/seed/${item.snippet.title}/150/150`
              };
              console.log('✅ channel-info: チャンネルIDを取得しました (search.list, ハンドル一致) =', channelId);
            } else {
              // ハンドルが一致しない場合でも、最初の結果を返す（フォールバック）
              channelId = foundChannelId;
              channelInfo = {
                id: channelId,
                title: item.snippet.title,
                handle: customUrl || handle,
                thumbnailUrl: item.snippet.thumbnails.high?.url || 
                             item.snippet.thumbnails.default?.url || 
                             `https://picsum.photos/seed/${item.snippet.title}/150/150`
              };
              console.log('⚠️ channel-info: ハンドルが一致しませんが、最初の結果を返します (search.list) =', channelId);
            }
          } else {
            console.warn('⚠️ channel-info: search.listでチャンネルが見つかりませんでした');
          }
        } else {
          const errorData = await searchResponse.json().catch(() => ({}));
          console.warn('⚠️ channel-info: search.list APIエラー', searchResponse.status, errorData);
          
          // 403エラーの場合、詳細なエラーメッセージを返す
          if (searchResponse.status === 403) {
            const errorMessage = errorData?.error?.message || 'YouTube Data API v3へのアクセスが拒否されました';
            return res.status(403).json({ 
              error: 'YouTube Data API v3が有効化されていません',
              details: errorMessage,
              helpUrl: errorData?.error?.message?.includes('Enable it by visiting') 
                ? 'https://console.developers.google.com/apis/api/youtube.googleapis.com/overview'
                : undefined
            });
          }
        }
      } catch (error: any) {
        console.warn('⚠️ channel-info: search.list method failed:', error.message);
      }
    }

    if (!channelId || !channelInfo) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    // アップロードプレイリストIDを取得
    let uploadsPlaylistId: string | null = null;
    try {
      const playlistUrl = new URL(`${YOUTUBE_BASE_URL}/channels`);
      playlistUrl.searchParams.set('part', 'contentDetails');
      playlistUrl.searchParams.set('id', channelId);
      playlistUrl.searchParams.set('key', YOUTUBE_API_KEY);

      console.log('🔍 channel-info: アップロードプレイリストIDを取得中...');
      const playlistResponse = await fetch(playlistUrl.toString());
      
      if (playlistResponse.ok) {
        const playlistData = await playlistResponse.json();
        if (playlistData.items && playlistData.items.length > 0) {
          uploadsPlaylistId = playlistData.items[0].contentDetails?.relatedPlaylists?.uploads || null;
          if (uploadsPlaylistId) {
            console.log('✅ channel-info: アップロードプレイリストIDを取得しました =', uploadsPlaylistId);
          } else {
            console.warn('⚠️ channel-info: アップロードプレイリストIDが見つかりませんでした');
          }
        }
      } else {
        const errorData = await playlistResponse.json().catch(() => ({}));
        console.warn('⚠️ channel-info: アップロードプレイリストID取得エラー', playlistResponse.status, errorData);
      }
    } catch (error: any) {
      console.warn('⚠️ channel-info: アップロードプレイリストID取得に失敗しました:', error.message);
    }

    return res.status(200).json({
      channelId,
      channelInfo,
      uploadsPlaylistId
    });

  } catch (error: any) {
    console.error('❌ channel-info error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

