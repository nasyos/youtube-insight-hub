import React, { useState } from 'react';
import { VideoSummary } from '../types';

interface SummaryTableProps {
  summaries: VideoSummary[];
}

export const SummaryTable: React.FC<SummaryTableProps> = ({ summaries }) => {
  const [expandedSummary, setExpandedSummary] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<VideoSummary | null>(null);

  const formatDate = (dateString: string) => {
    try {
      // 日付文字列をパースしてフォーマット
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        // パースできない場合はそのまま返す
        return dateString;
      }
      // 2025年を明示的に表示
      return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  if (summaries.length === 0) {
    return (
      <div className="py-32 text-center text-slate-600 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/20">
        チャンネルを追加してスキャンを開始してください。
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {summaries.map((summary) => (
          <div
            key={summary.id}
            className="bg-slate-800 rounded-xl border border-slate-700 p-6 hover:border-indigo-500/50 transition-all"
          >
            {/* ヘッダー部分 */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <a
                  href={summary.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xl font-bold text-white hover:text-indigo-400 transition-colors block mb-2"
                >
                  {summary.title}
                </a>
                <div className="flex items-center gap-4 text-sm text-slate-400">
                  <span className="font-semibold text-indigo-400">{summary.channelTitle}</span>
                  <span>•</span>
                  <span>{formatDate(summary.publishedAt)}</span>
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                {summary.docUrl && (
                  <a
                    href={summary.docUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-sm transition-all"
                  >
                    📄 ドキュメント
                  </a>
                )}
                <a
                  href={summary.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg text-sm transition-all"
                >
                  📺 動画を見る
                </a>
              </div>
            </div>

            {/* 要約部分 */}
            {summary.summary && (
              <div className="mb-4">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">要約</h3>
                <div className="bg-slate-900/50 rounded-lg p-4">
                  {expandedSummary === summary.id ? (
                    <div className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {summary.summary}
                    </div>
                  ) : (
                    <div className="text-slate-300 whitespace-pre-wrap leading-relaxed line-clamp-6">
                      {summary.summary}
                    </div>
                  )}
                  {summary.summary.length > 300 && (
                    <button
                      onClick={() => setExpandedSummary(expandedSummary === summary.id ? null : summary.id)}
                      className="mt-2 text-sm text-indigo-400 hover:text-indigo-300 font-semibold"
                    >
                      {expandedSummary === summary.id ? '折りたたむ' : '続きを読む'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 重要なポイント部分 */}
            {summary.keyPoints && summary.keyPoints.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">重要なポイント</h3>
                <div className="bg-slate-900/50 rounded-lg p-4">
                  <ul className="space-y-2">
                    {summary.keyPoints.map((point, index) => (
                      <li key={index} className="text-slate-300 flex items-start">
                        <span className="text-indigo-400 font-bold mr-2 flex-shrink-0">{index + 1}.</span>
                        <span className="leading-relaxed">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* 要約やポイントがない場合 */}
            {!summary.summary && (!summary.keyPoints || summary.keyPoints.length === 0) && (
              <div className="text-center py-8 text-slate-500 italic">
                要約がありません
              </div>
            )}

            {/* 詳細を見るボタン */}
            {(summary.summary || (summary.keyPoints && summary.keyPoints.length > 0)) && (
              <div className="mt-4 pt-4 border-t border-slate-700">
                <button
                  onClick={() => setShowDetailModal(summary)}
                  className="text-sm text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  📋 詳細を表示
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 詳細モーダル */}
      {showDetailModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-lg"
          onClick={() => setShowDetailModal(null)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-6 flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white mb-2">{showDetailModal.title}</h2>
                <div className="flex items-center gap-4 text-sm text-slate-400">
                  <span className="font-semibold text-indigo-400">{showDetailModal.channelTitle}</span>
                  <span>•</span>
                  <span>{formatDate(showDetailModal.publishedAt)}</span>
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(null)}
                className="ml-4 text-slate-400 hover:text-white text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {showDetailModal.summary && (
                <div>
                  <h3 className="text-lg font-bold text-slate-300 mb-3">📝 詳細要約</h3>
                  <div className="bg-slate-800 rounded-lg p-4">
                    <div className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {showDetailModal.summary}
                    </div>
                  </div>
                </div>
              )}

              {showDetailModal.keyPoints && showDetailModal.keyPoints.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-slate-300 mb-3">🔑 重要なポイント</h3>
                  <div className="bg-slate-800 rounded-lg p-4">
                    <ul className="space-y-3">
                      {showDetailModal.keyPoints.map((point, index) => (
                        <li key={index} className="text-slate-300 flex items-start">
                          <span className="text-indigo-400 font-bold mr-3 flex-shrink-0 text-lg">{index + 1}.</span>
                          <span className="leading-relaxed">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <div className="flex gap-4 pt-4 border-t border-slate-700">
                {showDetailModal.docUrl && (
                  <a
                    href={showDetailModal.docUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all"
                  >
                    📄 Googleドキュメントを開く
                  </a>
                )}
                <a
                  href={showDetailModal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-all"
                >
                  📺 YouTubeで見る
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

