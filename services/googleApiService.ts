
import { VideoSummary, VideoSummaryWithContent } from "../types";

export class GoogleApiService {
  private accessToken: string | null = null;
  private folderId: string | null = null;

  constructor(private clientId: string) {
    this.clientId = clientId?.trim() || "";
    const savedToken = sessionStorage.getItem('google_access_token');
    const expiry = sessionStorage.getItem('google_token_expiry');
    if (savedToken && expiry && Date.now() < parseInt(expiry)) {
      this.accessToken = savedToken;
    }
  }

  /**
   * 現在のアドレスバーから、? や # を除いた「純粋なURL」を返します。
   */
  public static getNormalizedCurrentUrl(): string {
    try {
      let rawUrl = window.location.href.replace(/^blob:/, "");
      let cleanUrl = rawUrl.split('?')[0].split('#')[0];
      return cleanUrl.replace(/\/$/, "");
    } catch (e) {
      return "";
    }
  }

  /**
   * 認証用URLを生成します。
   * マルチログインによる403エラーを防ぐため prompt=select_account を付与します。
   */
  public generateAuthUrl(): string {
    const trimmedClientId = this.clientId.trim();
    const redirectUri = GoogleApiService.getNormalizedCurrentUrl();
    
    const SCOPES = [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.metadata.readonly',
      'https://www.googleapis.com/auth/documents'
    ];

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', trimmedClientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'token');
    authUrl.searchParams.set('scope', SCOPES.join(' '));
    authUrl.searchParams.set('include_granted_scopes', 'true');
    authUrl.searchParams.set('state', 'auth_redirect');
    // 重要: select_account を入れることで、ログイン中のアカウントから選ばせ、403を回避します
    authUrl.searchParams.set('prompt', 'select_account');

    return authUrl.toString();
  }

  startRedirectAuth(): void {
    if (!this.clientId) {
      alert("Google Client ID を入力してください。");
      return;
    }
    const url = this.generateAuthUrl();
    console.log("🔗 認証開始 URL:", url);
    window.location.href = url;
  }

  handleCallback(): boolean {
    const hash = window.location.hash.substring(1);
    if (!hash) return false;

    const params = new URLSearchParams(hash);
    const token = params.get('access_token');
    const expiresIn = params.get('expires_in');

    if (token) {
      this.accessToken = token;
      sessionStorage.setItem('google_access_token', token);
      if (expiresIn) {
        const expiryTime = Date.now() + parseInt(expiresIn) * 1000;
        sessionStorage.setItem('google_token_expiry', expiryTime.toString());
      }
      const cleanUrl = GoogleApiService.getNormalizedCurrentUrl();
      window.history.replaceState(null, '', cleanUrl);
      return true;
    }
    return false;
  }

  hasValidToken(): boolean {
    const expiry = sessionStorage.getItem('google_token_expiry');
    return !!this.accessToken && (!expiry || Date.now() < parseInt(expiry));
  }

  private async getOrCreateFolder(): Promise<string> {
    if (this.folderId) return this.folderId;
    if (!this.accessToken) throw new Error("AccessToken missing");
    
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='YouTube Insight Hub' and mimeType='application/vnd.google-apps.folder' and trashed=false`, {
      headers: { 'Authorization': `Bearer ${this.accessToken}` }
    });
    const data = await response.json();
    if (data.files?.length > 0) {
      this.folderId = data.files[0].id;
      return this.folderId!;
    }

    const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: "YouTube Insight Hub", mimeType: 'application/vnd.google-apps.folder' }),
    });
    const folder = await createResponse.json();
    return folder.id;
  }

  async createSummaryDoc(summary: VideoSummary | VideoSummaryWithContent): Promise<string> {
    if (!this.accessToken) throw new Error("AccessToken missing");
    
    const folderId = await this.getOrCreateFolder();
    
    // ドキュメントを作成
    const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name: `[Summary] ${summary.title}`, 
        mimeType: 'application/vnd.google-apps.document', 
        parents: [folderId] 
      }),
    });
    const file = await createResponse.json();
    if (file.error) throw new Error(file.error.message);
    const documentId = file.id;

    // 少し待ってからドキュメントの内容を書き込む（ドキュメントの初期化を待つ）
    await new Promise(resolve => setTimeout(resolve, 500));

    // ドキュメントの内容を書き込む
    const content = this.formatSummaryContent(summary);
    try {
      const updateResponse = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${this.accessToken}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          requests: [
            {
              insertText: {
                location: { index: 1 },
                text: content
              }
            }
          ]
        })
      });

      if (!updateResponse.ok) {
        const error = await updateResponse.json();
        console.error("Document update error:", error);
        // ドキュメントは作成されているので、URLは返す（ユーザーが手動で編集可能）
      }
    } catch (error) {
      console.error("Failed to write content to document:", error);
      // ドキュメントは作成されているので、URLは返す
    }

    return `https://docs.google.com/document/d/${documentId}/edit`;
  }

  private formatSummaryContent(summary: VideoSummary | VideoSummaryWithContent): string {
    let content = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    content += `📺 動画情報\n`;
    content += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    content += `タイトル: ${summary.title}\n\n`;
    content += `チャンネル: ${summary.channelTitle}\n`;
    content += `公開日: ${summary.publishedAt}\n`;
    content += `動画URL: ${summary.url}\n\n`;
    
    // VideoSummaryWithContentの場合はsummaryとkeyPointsを使用
    if ('summary' in summary && summary.summary) {
      content += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      content += `📝 詳細要約\n`;
      content += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      content += `${summary.summary}\n\n`;
      
      if ('keyPoints' in summary && summary.keyPoints && summary.keyPoints.length > 0) {
        content += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        content += `🔑 重要なポイント\n`;
        content += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        summary.keyPoints.forEach((point, index) => {
          content += `${index + 1}. ${point}\n\n`;
        });
      }
    } else if ('summary' in summary && summary.summary) {
      // VideoSummary型でもsummaryがある場合
      content += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      content += `📝 詳細要約\n`;
      content += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      content += `${summary.summary}\n\n`;
      
      if (summary.keyPoints && summary.keyPoints.length > 0) {
        content += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        content += `🔑 重要なポイント\n`;
        content += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        summary.keyPoints.forEach((point, index) => {
          content += `${index + 1}. ${point}\n\n`;
        });
      }
    } else {
      content += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      content += `📝 詳細要約\n`;
      content += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      content += `（要約内容は準備中です）\n`;
    }
    
    content += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    content += `この要約は、YouTube動画を見なくても内容を完全に理解できるように作成されています。\n`;
    content += `動画内で言及されたすべての重要な情報を含めています。\n`;
    content += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    
    return content;
  }
}
