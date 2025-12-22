
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GeminiService } from './services/geminiService';
import { GoogleApiService } from './services/googleApiService';
import { VideoSummary, TrackedChannel, StorageKey, GoogleConfig } from './types';
import { ChannelItem } from './components/ChannelItem';
import { SummaryCard } from './components/SummaryCard';

const App: React.FC = () => {
  const [channels, setChannels] = useState<TrackedChannel[]>(() => {
    const saved = localStorage.getItem(StorageKey.CHANNELS);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [summaries, setSummaries] = useState<VideoSummary[]>(() => {
    const saved = localStorage.getItem(StorageKey.SUMMARIES);
    return saved ? JSON.parse(saved) : [];
  });

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

  useEffect(() => {
    if (googleConfig.clientId) {
      const api = new GoogleApiService(googleConfig.clientId);
      if (api.handleCallback()) {
        setGoogleConfig(prev => ({ ...prev, isConnected: true }));
      } else if (api.hasValidToken()) {
        setGoogleConfig(prev => ({ ...prev, isConnected: true }));
      }
      googleApi.current = api;
    }
  }, [googleConfig.clientId]);

  useEffect(() => { localStorage.setItem(StorageKey.CHANNELS, JSON.stringify(channels)); }, [channels]);
  useEffect(() => { localStorage.setItem(StorageKey.SUMMARIES, JSON.stringify(summaries)); }, [summaries]);
  useEffect(() => { localStorage.setItem(StorageKey.GOOGLE_CONFIG, JSON.stringify(googleConfig)); }, [googleConfig]);

  const handleExportToGoogle = async (summary: VideoSummary) => {
    if (!googleApi.current) return;
    try {
      const docUrl = await googleApi.current.createSummaryDoc(summary);
      setSummaries(prev => prev.map(s => s.id === summary.id ? { ...s, docUrl } : s));
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
    if (channels.length === 0 || isScanning) return;
    setIsScanning(true);
    setError(null);
    try {
      for (const channel of channels) {
        const foundSummaries = await gemini.current.scanChannel(channel);
        for (const s of foundSummaries) {
          setSummaries(prev => {
            const exists = prev.some(existing => existing.title === s.title);
            if (exists) return prev;
            return [s, ...prev].slice(0, 50);
          });
        }
      }
    } catch (err) {
      setError("スキャン中にエラーが発生しました。");
    } finally {
      setIsScanning(false);
    }
  }, [channels, isScanning]);

  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || isAdding) return;
    setIsAdding(true);
    setError(null);
    try {
      const channel = await gemini.current.findChannel(searchQuery);
      if (channel) {
        if (!channels.some(c => c.handle === channel.handle)) {
          setChannels(prev => [...prev, channel]);
          setSearchQuery('');
        }
      } else setError('チャンネルが見つかりませんでした。');
    } catch (err) {
      setError('追加エラー');
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
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30">
      <aside className="w-full md:w-80 border-r border-slate-800 bg-slate-900/50 p-6 flex flex-col h-screen overflow-y-auto shrink-0">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Insight Hub</h1>
        </div>

        <form onSubmit={handleAddChannel} className="mb-8">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">チャンネルを追加</label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="チャンネル名 / @ハンドル"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-slate-100"
            />
            <button type="submit" disabled={isAdding} className="absolute right-2 top-2 p-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </button>
          </div>
        </form>

        <div className="flex-1 mb-8 overflow-y-auto">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 px-1">監視中</label>
          {channels.length === 0 ? (
            <p className="text-[10px] text-slate-600 italic px-1">追加されたチャンネルはありません</p>
          ) : (
            channels.map(c => <ChannelItem key={c.id} channel={c} onRemove={(id) => setChannels(prev => prev.filter(ch => ch.id !== id))} />)
          )}
        </div>

        <div className="mb-6 p-4 bg-slate-800/40 rounded-2xl border border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">連携設定</h2>
            <button onClick={() => setShowHelp('clientId')} className="text-indigo-400 hover:text-indigo-300 text-[10px] font-bold underline underline-offset-4">解決ガイド</button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-slate-500 font-bold block mb-1">Google Client ID</label>
              <input 
                type="password" 
                placeholder="...apps.googleusercontent.com" 
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-300 outline-none focus:border-indigo-500" 
                value={googleConfig.clientId} 
                onChange={e => setGoogleConfig(prev => ({ ...prev, clientId: e.target.value }))} 
              />
            </div>
            <button 
              onClick={handleConnectGoogle} 
              className={`w-full py-2 rounded-lg text-xs font-bold transition-all ${googleConfig.isConnected ? 'bg-green-600/20 text-green-400 border border-green-600/50' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`}
            >
              {googleConfig.isConnected ? 'Google 接続済み' : 'Googleと連携する'}
            </button>
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-slate-800">
          <button onClick={scanAllChannels} disabled={isScanning || channels.length === 0} className="w-full py-3 rounded-xl font-bold text-sm bg-white text-slate-900 active:scale-95 transition-all">
            {isScanning ? "スキャン中..." : "最新をチェック"}
          </button>
          {error && <p className="mt-3 text-[10px] text-red-400 leading-tight">{error}</p>}
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-10 overflow-y-auto bg-slate-950/50">
        <header className="mb-10">
          <h2 className="text-3xl font-bold text-white mb-2">最新の要約</h2>
          <p className="text-slate-400 text-sm">AIが要点を整理してレポートします。</p>
        </header>

        {summaries.length === 0 ? (
          <div className="py-32 text-center text-slate-600 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/20">
            チャンネルを追加してスキャンを開始してください。
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            {summaries.map((summary) => (
              <div key={summary.id} className="relative group">
                <SummaryCard summary={summary} />
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {summary.docUrl ? (
                    <a href={summary.docUrl} target="_blank" rel="noopener noreferrer" className="bg-green-600 text-white p-2 rounded-lg text-[10px] font-bold">DOC</a>
                  ) : googleConfig.isConnected && (
                    <button onClick={() => handleExportToGoogle(summary)} className="bg-indigo-600 text-white p-2 rounded-lg text-[10px] font-bold shadow-xl">Doc保存</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showHelp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-lg">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-red-400 flex items-center">
                <svg className="w-8 h-8 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                403エラー解決 & アカウント診断
              </h3>
              <button onClick={() => setShowHelp(null)} className="text-slate-500 hover:text-white"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            
            <div className="space-y-8">
              <div className="bg-red-500/10 p-6 rounded-2xl border border-red-500/30">
                <h4 className="text-white font-bold mb-3 flex items-center uppercase tracking-widest text-xs">
                  <span className="bg-red-500 text-white px-2 py-0.5 rounded mr-2">要確認</span>
                  どのアカウントでログインしていますか？
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  ブラウザで複数の Google アカウントにログインしている場合、**「デフォルトのアカウント」がテストユーザーでないと 403 になります**。<br/>
                  <span className="text-red-400 font-bold underline decoration-2">yoshio.nasu@extool.co.jp</span> をテストユーザーに追加済みであれば、連携ボタンを押した後に表示される画面で **必ずこのメールアドレスを選択してください**。
                </p>
              </div>

              <div className="bg-indigo-500/10 p-6 rounded-2xl border border-indigo-500/30">
                <h4 className="text-white font-bold mb-3 flex items-center uppercase tracking-widest text-xs">
                  <span className="bg-indigo-600 text-white px-2 py-0.5 rounded mr-2">重要</span>
                  貼り付け値の再確認
                </h4>
                <div className="space-y-5">
                  <div className="p-4 bg-black/50 rounded-xl border border-slate-700">
                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-2">① 承認済みの JavaScript 生成元 (Origin)</p>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 text-[11px] font-mono text-slate-300 break-all bg-slate-900/40 p-2 rounded">{originOnly}</code>
                      <button onClick={() => copyToClipboard(originOnly, "生成元URL")} className="text-indigo-400 hover:text-indigo-300 text-[10px] font-bold shrink-0">コピー</button>
                    </div>
                  </div>

                  <div className="p-4 bg-black/50 rounded-xl border border-slate-700">
                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-2">② 承認済みのリダイレクト URI (Redirect URI)</p>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 text-[11px] font-mono text-indigo-300 break-all bg-indigo-900/20 p-2 rounded">{fullUri}</code>
                      <button onClick={() => copyToClipboard(fullUri, "リダイレクトURI")} className="text-indigo-400 hover:text-indigo-300 text-[10px] font-bold shrink-0">コピー</button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center pt-4">
                <button onClick={() => setShowHelp(null)} className="px-12 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all shadow-xl">再試行する</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
