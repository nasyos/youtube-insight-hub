/**
 * YouTube URLからVIDEO_IDを抽出するユーティリティ関数
 */

/**
 * YouTube URLからVIDEO_IDを抽出
 * @param url YouTube URL（複数の形式に対応）
 * @returns VIDEO_ID（11文字）、抽出できない場合はnull
 */
export function extractVideoId(url: string): string | null {
  if (!url) {
    console.warn('⚠️ extractVideoId: URLが空です');
    return null;
  }

  // URLからスペースや改行を除去
  const cleanUrl = url.trim().replace(/\s+/g, '');
  
  // デバッグ: URLをログ出力
  console.log('🔍 extractVideoId: 元のURL =', url);
  console.log('🔍 extractVideoId: クリーンなURL =', cleanUrl);

  // YouTube URLのパターン（より柔軟に、スペースを考慮）
  const patterns = [
    // https://www.youtube.com/watch?v=VIDEO_ID または &v=VIDEO_ID（スペースを考慮）
    /(?:youtube\.com\/watch\?.*[&?]v=)\s*([a-zA-Z0-9_-]{11})/,
    // https://youtu.be/VIDEO_ID
    /(?:youtu\.be\/)\s*([a-zA-Z0-9_-]{11})/,
    // https://www.youtube.com/embed/VIDEO_ID
    /(?:youtube\.com\/embed\/)\s*([a-zA-Z0-9_-]{11})/,
    // https://www.youtube.com/v/VIDEO_ID
    /(?:youtube\.com\/v\/)\s*([a-zA-Z0-9_-]{11})/,
    // https://m.youtube.com/watch?v=VIDEO_ID
    /(?:m\.youtube\.com\/watch\?.*[&?]v=)\s*([a-zA-Z0-9_-]{11})/,
    // https://youtube.com/watch?v=VIDEO_ID (wwwなし)
    /(?:youtube\.com\/watch\?.*[&?]v=)\s*([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = cleanUrl.match(pattern);
    if (match && match[1]) {
      const videoId = match[1].trim();
      console.log('✅ extractVideoId: VIDEO_IDを抽出 =', videoId);
      return videoId;
    }
  }

  // パターンに一致しない場合、URL全体がVIDEO_IDの可能性（11文字、スペース除去後）
  const trimmedUrl = cleanUrl.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmedUrl)) {
    console.log('✅ extractVideoId: URL全体がVIDEO_ID =', trimmedUrl);
    return trimmedUrl;
  }

  console.warn('⚠️ extractVideoId: VIDEO_IDを抽出できませんでした。元のURL =', url, ', クリーンなURL =', cleanUrl);
  return null;
}

/**
 * YouTube URLを正規化（VIDEO_IDのみを返す）
 * @param url YouTube URL
 * @returns 正規化されたVIDEO_ID、抽出できない場合は元のURL
 */
export function normalizeYouTubeUrl(url: string): string {
  const videoId = extractVideoId(url);
  return videoId || url;
}

