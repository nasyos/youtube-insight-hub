
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GeminiService } from './services/geminiService';
import { GoogleApiService } from './services/googleApiService';
import { ApiService } from './services/apiService';
import { YouTubeService } from './services/youtubeService';
import { VideoSummary, TrackedChannel, StorageKey, GoogleConfig, VideoSummaryWithContent } from './types';
import { ChannelItem } from './components/ChannelItem';
import { SummaryTable } from './components/SummaryTable';

const App: React.FC = () => {
  const [channels, setChannels] = useState<TrackedChannel[]>([]);
  const [summaries, setSummaries] = useState<VideoSummary[]>([]);

  const [googleConfig, setGoogleConfig] = useState<GoogleConfig>(() => {
    const saved = localStorage.getItem(StorageKey.GOOGLE_CONFIG);
    return saved ? JSON.parse(saved) : {
      clientId: '',
      chatWebhookUrl: '',
      autoExport: false,
      isConnected: false
    };
  });

  const [isScanning, setIsScanning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [showHelp, setShowHelp] = useState<'clientId' | 'webhook' | null>(null);

  const gemini = useRef(new GeminiService());
  const googleApi = useRef<GoogleApiService | null>(null);
  const api = useRef(new ApiService());
  const youtube = useRef(new YouTubeService());

  // 初期データ読み込み
  useEffect(() => {
    const loadData = async () => {
      try {
        const [channelsData, summariesData] = await Promise.all([
          api.current.getChannels(),
          api.current.getSummaries()
        ]);
        setChannels(channelsData);
        setSummaries(summariesData);
      } catch (error: any) {
        console.warn('データの読み込みに失敗しました（正常な場合があります）:', error?.message || error);
        // エラー時はLocalStorageからフォールバック
        try {
          const savedChannels = localStorage.getItem(StorageKey.CHANNELS);
          const savedSummaries = localStorage.getItem(StorageKey.SUMMARIES);
          if (savedChannels) {
            try {
              const parsed = JSON.parse(savedChannels);
              if (Array.isArray(parsed)) setChannels(parsed);
            } catch (e) {
              console.warn('LocalStorageのチャンネルデータのパースに失敗:', e);
            }
          }
          if (savedSummaries) {
            try {
              const parsed = JSON.parse(savedSummaries);
              if (Array.isArray(parsed)) setSummaries(parsed);
            } catch (e) {
              console.warn('LocalStorageの要約データのパースに失敗:', e);
            }
          }
        } catch (e) {
          console.warn('LocalStorageからの読み込みに失敗:', e);
        }
        // エラーがあっても空配列で初期化（画面は表示される）
        setChannels([]);
        setSummaries([]);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (googleConfig.clientId) {
      const googleApiInstance = new GoogleApiService(googleConfig.clientId);
      
      // コールバック処理（認証後のリダイレクト）
      if (googleApiInstance.handleCallback()) {
        setGoogleConfig(prev => ({ ...prev, isConnected: true }));
        googleApi.current = googleApiInstance;
        return;
      }
      
      // 既存のトークンを確認
      if (googleApiInstance.hasValidToken()) {
        setGoogleConfig(prev => ({ ...prev, isConnected: true }));
        googleApi.current = googleApiInstance;
      } else {
        // トークンが無効な場合、接続状態をリセット
        setGoogleConfig(prev => ({ ...prev, isConnected: false }));
        googleApi.current = googleApiInstance;
      }
    } else {
      googleApi.current = null;
    }
  }, [googleConfig.clientId]);

  // Google設定のみLocalStorageに保存（認証情報のため）
  useEffect(() => { 
    localStorage.setItem(StorageKey.GOOGLE_CONFIG, JSON.stringify(googleConfig)); 
  }, [googleConfig]);

  // Google Chatへの送信関数
  const sendToGoogleChat = useCallback(async (summary: VideoSummary, docUrl: string) => {
    if (!googleConfig.chatWebhookUrl || !googleConfig.autoExport) {
      return; // Webhook URLが設定されていない、または自動送信がOFFの場合は送信しない
    }

    try {
      let message = `🔔 *新しい動画の要約*\n\n` +
        `*タイトル:* ${summary.title}\n` +
        `*チャンネル:* ${summary.channelTitle}\n` +
        `*公開日:* ${summary.publishedAt}\n\n`;

      // 要約内容を追加
      if (summary.summary) {
        message += `*要約:*\n${summary.summary}\n\n`;
      }

      // 重要なポイントを追加
      if (summary.keyPoints && summary.keyPoints.length > 0) {
        message += `*重要なポイント:*\n`;
        summary.keyPoints.forEach((point, index) => {
          message += `${index + 1}. ${point}\n`;
        });
        message += `\n`;
      }

      message += `📄 *Googleドキュメント:* ${docUrl}\n` +
        `📺 *動画URL:* ${summary.url}`;

      const response = await fetch(googleConfig.chatWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message }),
      });

      if (!response.ok) {
        throw new Error(`Google Chat送信に失敗しました: ${response.statusText}`);
      }

      console.log('Google Chatに通知を送信しました:', summary.title);
    } catch (err: any) {
      console.error('Google Chat送信エラー:', err);
      // エラーはログに記録するが、ユーザーには表示しない（要約の保存は成功しているため）
    }
  }, [googleConfig.chatWebhookUrl, googleConfig.autoExport]);

  const handleExportToGoogle = async (summary: VideoSummary) => {
    if (!googleApi.current) return;
    try {
      const { docUrl, docId } = await googleApi.current.createSummaryDoc(summary);
      // データベースを更新
      const updatedSummary = { ...summary, docUrl, docId };
      await api.current.saveSummary(updatedSummary);
      setSummaries(prev => prev.map(s => s.id === summary.id ? updatedSummary : s));
    } catch (err: any) {
      setError("Googleへの保存に失敗しました。再連携してください。");
    }
  };

  const handleConnectGoogle = () => {
    const trimmedId = googleConfig.clientId.trim();
    if (!trimmedId) return setError("Client IDを入力してください。");
    setError(null);
    try {
      const api = new GoogleApiService(trimmedId);
      googleApi.current = api;
      api.startRedirectAuth(); 
    } catch (err) {
      setError("認証プロセスを開始できませんでした。");
    }
  };

  const scanAllChannels = useCallback(async () => {
    if (channels.length === 0 || isScanning) {
      return;
    }
    
    // Google認証の確認
    if (!googleApi.current) {
      setError("Google認証が必要です。先にGoogleと連携してください。");
      return;
    }
    
    // トークンの有効性を確認
    if (!googleApi.current.hasValidToken()) {
      setError("Google認証のトークンが無効です。再度「Googleと連携する」ボタンをクリックして認証してください。");
      setGoogleConfig(prev => ({ ...prev, isConnected: false }));
      return;
    }
    
    setIsScanning(true);
    setError(null);
    let newCount = 0; // 新規に保存された動画の数
    try {
      for (const channel of channels) {
        const foundSummaries: VideoSummaryWithContent[] = await gemini.current.scanChannel(channel);
        for (const s of foundSummaries) {
          // デバッグ: Gemini APIが返したURLを確認
          console.log('📹 Gemini APIが返した動画:', {
            title: s.title,
            url: s.url,
          });
          
          // 重複チェック（既に取得済みの動画はスキップ）
          // published_atとtitleも渡して、より確実な重複チェックを行う
          const exists = await api.current.checkVideoExists(s.url, {
            publishedAt: s.publishedAt,
            title: s.title,
            channelId: s.channelId
          });
          if (exists) {
            console.log(`⏭️ スキップ: 既に取得済みの動画 "${s.title}" (URL: ${s.url})`);
            continue;
          }

          try {
            // 1. まずGoogleドキュメントを作成（要約内容を保存）
            const { docUrl, docId } = await googleApi.current.createSummaryDoc(s);
            
            // 2. メタデータと要約内容をデータベースに保存
            const summaryMetadata: VideoSummary = {
              id: s.id,
              title: s.title,
              publishedAt: s.publishedAt,
              thumbnailUrl: s.thumbnailUrl,
              channelId: s.channelId,
              channelTitle: s.channelTitle,
              url: s.url,
              docUrl: docUrl,
              docId: docId, // Google Docs IDを保存
              summary: s.summary, // 要約内容を保存
              keyPoints: s.keyPoints, // 重要なポイントを保存
            };
            
            const savedSummary = await api.current.saveSummary(summaryMetadata);
            newCount++; // 新規保存数をカウント
            
            // 3. Google Chatに通知（自動送信がONの場合）
            if (googleConfig.autoExport && googleConfig.chatWebhookUrl) {
              await sendToGoogleChat(savedSummary, docUrl);
            }
            
            // 4. ローカル状態を更新
            setSummaries(prev => [savedSummary, ...prev].slice(0, 50));
          } catch (err: any) {
            console.error('要約の保存に失敗:', err);
            setError(`要約の保存に失敗しました: ${err.message}`);
          }
        }
      }
      
      // 新着データがない場合のメッセージ
      if (newCount === 0) {
        setError("新着の投稿がありません。");
      }
    } catch (err: any) {
      console.error('スキャンエラー:', err);
      setError("スキャン中にエラーが発生しました。");
    } finally {
      setIsScanning(false);
    }
  }, [channels, isScanning, googleConfig.autoExport, googleConfig.chatWebhookUrl, sendToGoogleChat]);

  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || isAdding) return;
    setIsAdding(true);
    setError(null);
    try {
      // チャンネル情報の取得（Gemini APIを使用 - 5-30秒かかる場合があります）
      console.log('🔍 チャンネル情報を取得中...（5-30秒かかる場合があります）');
      const channel = await gemini.current.findChannel(searchQuery);
      if (channel) {
        if (!channels.some(c => c.handle === channel.handle)) {
          // YouTube Data API v3でチャンネルIDとアップロードプレイリストIDを取得
          try {
            const channelId = await youtube.current.getChannelId(channel.handle);
            if (channelId) {
              channel.channelId = channelId;
              const uploadsPlaylistId = await youtube.current.getChannelUploadsPlaylist(channelId);
              if (uploadsPlaylistId) {
                channel.uploadsPlaylistId = uploadsPlaylistId;
              }
            }
          } catch (youtubeError) {
            console.warn('YouTube Data API v3でのチャンネルID取得に失敗しました:', youtubeError);
            // エラーでも続行（channel_idなしで保存）
          }

          // データベースに保存
          const savedChannel = await api.current.addChannel(channel);
          setChannels(prev => [...prev, savedChannel]);
          setSearchQuery('');

          // WebSub購読を自動実行（channel_idが取得できた場合）
          if (savedChannel.channelId) {
            try {
              const apiKey = (import.meta as any).env?.VITE_API_KEY || '';
              if (apiKey) {
                const response = await fetch('/api/youtube/websub/subscribe', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': apiKey
                  },
                  body: JSON.stringify({ channelId: savedChannel.channelId })
                });
                if (response.ok) {
                  console.log('✅ WebSub購読を開始しました:', savedChannel.channelId);
                } else {
                  console.warn('⚠️ WebSub購読に失敗しました:', await response.text());
                }
              } else {
                console.warn('⚠️ API_KEYが設定されていないため、WebSub購読をスキップしました');
              }
            } catch (websubError) {
              console.warn('⚠️ WebSub購読エラー:', websubError);
              // エラーでも続行（チャンネルは追加済み）
            }
          }
        } else {
          setError('このチャンネルは既に追加されています。');
        }
      } else {
        setError('チャンネルが見つかりませんでした。');
      }
    } catch (err: any) {
      console.error('チャンネル追加エラー:', err);
      // エラーメッセージをそのまま表示（GeminiServiceから詳細なメッセージが返される）
      setError(err.message || 'チャンネルの追加に失敗しました。');
    } finally {
      setIsAdding(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    alert(`${label}をコピーしました！`);
  };

  const fullUri = GoogleApiService.getNormalizedCurrentUrl();
  const originOnly = fullUri ? new URL(fullUri).origin : "";

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-stone-50 text-gray-900 font-sans">
      <aside className="w-full md:w-80 border-r border-stone-200 bg-white p-6 flex flex-col h-screen overflow-y-auto shrink-0">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center border border-amber-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Insight Hub</h1>
        </div>

        <form onSubmit={handleAddChannel} className="mb-8">
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-2 px-1">チャンネルを追加</label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="チャンネル名 / @ハンドル"
              className="w-full bg-white border border-stone-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition-all text-gray-900"
            />
            <button type="submit" disabled={isAdding} className="absolute right-2 top-2 p-1.5 bg-amber-500 hover:bg-amber-600 rounded-lg text-white transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </button>
          </div>
        </form>

        <div className="flex-1 mb-8 overflow-y-auto">
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-3 px-1">監視中</label>
          {channels.length === 0 ? (
            <p className="text-[10px] text-gray-500 italic px-1">追加されたチャンネルはありません</p>
          ) : (
            channels.map(c => (
              <ChannelItem 
                key={c.id} 
                channel={c} 
                onRemove={async (id) => {
                  try {
                    await api.current.deleteChannel(id);
                    setChannels(prev => prev.filter(ch => ch.id !== id));
                  } catch (err: any) {
                    setError('チャンネルの削除に失敗しました。');
                  }
                }} 
              />
            ))
          )}
        </div>

        <div className="mb-6 p-4 bg-stone-50 rounded-2xl border border-stone-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-gray-700 uppercase tracking-widest">連携設定</h2>
            <button onClick={() => setShowHelp('clientId')} className="text-amber-600 hover:text-amber-700 text-[10px] font-bold underline underline-offset-4">解決ガイド</button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-gray-600 font-bold block mb-1">Google Client ID</label>
              <input 
                type="password" 
                placeholder="...apps.googleusercontent.com" 
                className="w-full bg-white border border-stone-300 rounded-lg px-2 py-1.5 text-xs text-gray-900 outline-none focus:border-amber-400" 
                value={googleConfig.clientId} 
                onChange={e => setGoogleConfig(prev => ({ ...prev, clientId: e.target.value }))} 
              />
            </div>
            <button 
              onClick={handleConnectGoogle} 
              className={`w-full py-2 rounded-lg text-xs font-bold transition-all ${googleConfig.isConnected ? 'bg-green-50 text-green-700 border border-green-300' : 'bg-amber-500 text-white hover:bg-amber-600'}`}
            >
              {googleConfig.isConnected ? 'Google 接続済み' : 'Googleと連携する'}
            </button>
          </div>
        </div>

        <div className="mb-6 p-4 bg-stone-50 rounded-2xl border border-stone-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-gray-700 uppercase tracking-widest">Google Chat通知</h2>
            <button onClick={() => setShowHelp('webhook')} className="text-amber-600 hover:text-amber-700 text-[10px] font-bold underline underline-offset-4">設定方法</button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-gray-600 font-bold block mb-1">Webhook URL</label>
              <input 
                type="text" 
                placeholder="https://chat.googleapis.com/v1/spaces/..." 
                className="w-full bg-white border border-stone-300 rounded-lg px-2 py-1.5 text-xs text-gray-900 outline-none focus:border-amber-400" 
                value={googleConfig.chatWebhookUrl} 
                onChange={e => setGoogleConfig(prev => ({ ...prev, chatWebhookUrl: e.target.value }))} 
              />
            </div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={googleConfig.autoExport}
                onChange={e => setGoogleConfig(prev => ({ ...prev, autoExport: e.target.checked }))}
                className="w-4 h-4 rounded border-stone-300 bg-white text-amber-600 focus:ring-amber-500"
              />
              <span className="text-xs text-gray-700">新しい要約を自動的にGoogle Chatに通知</span>
            </label>
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-stone-200">
          <button onClick={scanAllChannels} disabled={isScanning || channels.length === 0} className="w-full py-3 rounded-xl font-bold text-sm bg-amber-500 hover:bg-amber-600 text-white active:scale-95 transition-all disabled:bg-gray-300 disabled:text-gray-500">
            {isScanning ? "スキャン中..." : "最新をチェック"}
          </button>
          {error && <p className="mt-3 text-[10px] text-red-600 leading-tight">{error}</p>}
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-10 overflow-y-auto bg-stone-50">
        <header className="mb-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">最新の要約</h2>
          <p className="text-gray-600 text-sm">動画の要約と重要なポイントを表示します。</p>
        </header>

        <SummaryTable summaries={summaries} />
      </main>

      {showHelp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white border border-stone-200 rounded-3xl w-full max-w-2xl p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 flex items-center">
                <svg className="w-8 h-8 mr-2 text-amber-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                {showHelp === 'clientId' ? '403エラー解決 & アカウント診断' : 'Google Chat Webhook設定方法'}
              </h3>
              <button onClick={() => setShowHelp(null)} className="text-gray-500 hover:text-gray-900"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            
            {showHelp === 'clientId' ? (
            <div className="space-y-8">
              <div className="bg-red-50 p-6 rounded-2xl border border-red-200">
                <h4 className="text-gray-900 font-bold mb-3 flex items-center uppercase tracking-widest text-xs">
                  <span className="bg-red-500 text-white px-2 py-0.5 rounded mr-2">要確認</span>
                  どのアカウントでログインしていますか？
                </h4>
                <p className="text-xs text-gray-700 leading-relaxed mb-4">
                  ブラウザで複数の Google アカウントにログインしている場合、**「デフォルトのアカウント」がテストユーザーでないと 403 になります**。<br/>
                  <span className="text-red-400 font-bold underline decoration-2">yoshio.nasu@extool.co.jp</span> をテストユーザーに追加済みであれば、連携ボタンを押した後に表示される画面で **必ずこのメールアドレスを選択してください**。
                </p>
              </div>

              <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200">
                <h4 className="text-gray-900 font-bold mb-3 flex items-center uppercase tracking-widest text-xs">
                  <span className="bg-amber-500 text-white px-2 py-0.5 rounded mr-2">重要</span>
                  貼り付け値の再確認
                </h4>
                <div className="space-y-5">
                  <div className="p-4 bg-white rounded-xl border border-stone-200">
                    <p className="text-[10px] text-gray-600 font-bold uppercase mb-2">① 承認済みの JavaScript 生成元 (Origin)</p>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 text-[11px] font-mono text-gray-900 break-all bg-stone-50 p-2 rounded border border-stone-200">{originOnly}</code>
                      <button onClick={() => copyToClipboard(originOnly, "生成元URL")} className="text-amber-600 hover:text-amber-700 text-[10px] font-bold shrink-0">コピー</button>
                    </div>
                  </div>

                  <div className="p-4 bg-white rounded-xl border border-stone-200">
                    <p className="text-[10px] text-gray-600 font-bold uppercase mb-2">② 承認済みのリダイレクト URI (Redirect URI)</p>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 text-[11px] font-mono text-gray-900 break-all bg-stone-50 p-2 rounded border border-stone-200">{fullUri}</code>
                      <button onClick={() => copyToClipboard(fullUri, "リダイレクトURI")} className="text-amber-600 hover:text-amber-700 text-[10px] font-bold shrink-0">コピー</button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center pt-4">
                <button onClick={() => setShowHelp(null)} className="px-12 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-all shadow-lg">再試行する</button>
              </div>
            </div>
            ) : (
            <div className="space-y-8">
              <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200">
                <h4 className="text-gray-900 font-bold mb-3 flex items-center uppercase tracking-widest text-xs">
                  <span className="bg-amber-500 text-white px-2 py-0.5 rounded mr-2">手順</span>
                  Google Chat Webhook URLの取得方法
                </h4>
                <div className="space-y-4 text-xs text-gray-700">
                  <div>
                    <p className="font-bold text-gray-900 mb-2">1. Google Chatスペースを開く</p>
                    <p>通知を受け取りたいGoogle Chatスペースを開きます。</p>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 mb-2">2. アプリと統合を設定</p>
                    <p>スペース名の横にある「設定」→「アプリと統合」を開きます。</p>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 mb-2">3. Incoming Webhookを追加</p>
                    <p>「アプリを追加」→「Incoming Webhook」を検索して追加します。</p>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 mb-2">4. Webhook URLをコピー</p>
                    <p>作成されたWebhookのURLをコピーして、上記の「Webhook URL」フィールドに貼り付けます。</p>
                    <p className="text-gray-600 mt-2">URLの形式: <code className="bg-stone-100 px-2 py-1 rounded border border-stone-200">https://chat.googleapis.com/v1/spaces/...</code></p>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 mb-2">5. 自動通知を有効化</p>
                    <p>「新しい要約を自動的にGoogle Chatに通知」にチェックを入れると、新しい要約が生成されたときに自動的に通知が送信されます。</p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 p-6 rounded-2xl border border-green-200">
                <h4 className="text-gray-900 font-bold mb-3 flex items-center uppercase tracking-widest text-xs">
                  <span className="bg-green-500 text-white px-2 py-0.5 rounded mr-2">確認</span>
                  通知内容
                </h4>
                <p className="text-xs text-gray-700 leading-relaxed">
                  通知には以下の情報が含まれます：
                </p>
                <ul className="text-xs text-gray-700 mt-2 space-y-1 list-disc list-inside">
                  <li>動画のタイトル</li>
                  <li>チャンネル名</li>
                  <li>公開日</li>
                  <li>Googleドキュメントへのリンク</li>
                  <li>動画URL</li>
                </ul>
              </div>

              <div className="text-center pt-4">
                <button onClick={() => setShowHelp(null)} className="px-12 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-all shadow-lg">閉じる</button>
              </div>
            </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
