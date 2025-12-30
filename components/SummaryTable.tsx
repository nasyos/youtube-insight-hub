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
      <div className="py-32 text-center text-gray-500 border-2 border-dashed border-stone-300 rounded-3xl bg-stone-50">
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
            className="bg-white rounded-xl border border-stone-200 p-6 hover:border-amber-300 transition-all shadow-sm"
          >
            {/* ヘッダー部分 */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <a
                  href={summary.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xl font-bold text-gray-900 hover:text-amber-600 transition-colors block mb-2"
                >
                  {summary.title}
                </a>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="font-semibold text-amber-600">{summary.channelTitle}</span>
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
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-sm transition-all"
                  >
                    📄 ドキュメント
                  </a>
                )}
                <a
                  href={summary.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white font-bold rounded-lg text-sm transition-all"
                >
                  📺 動画を見る
                </a>
              </div>
            </div>

            {/* 要約部分 */}
            {summary.summary && (
              <div className="mb-4">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">要約</h3>
                <div className="bg-stone-50 rounded-lg p-4 border border-stone-200">
                  {expandedSummary === summary.id ? (
                    <div className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {summary.summary}
                    </div>
                  ) : (
                    <div className="text-gray-800 whitespace-pre-wrap leading-relaxed line-clamp-6">
                      {summary.summary}
                    </div>
                  )}
                  {summary.summary.length > 300 && (
                    <button
                      onClick={() => setExpandedSummary(expandedSummary === summary.id ? null : summary.id)}
                      className="mt-2 text-sm text-amber-600 hover:text-amber-700 font-semibold"
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
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">重要なポイント</h3>
                <div className="bg-stone-50 rounded-lg p-4 border border-stone-200">
                  <ul className="space-y-2">
                    {summary.keyPoints.map((point, index) => (
                      <li key={index} className="text-gray-800 flex items-start">
                        <span className="text-amber-600 font-bold mr-2 flex-shrink-0">{index + 1}.</span>
                        <span className="leading-relaxed">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* 要約やポイントがない場合 */}
            {!summary.summary && (!summary.keyPoints || summary.keyPoints.length === 0) && (
              <div className="text-center py-8 text-gray-500 italic">
                要約がありません
              </div>
            )}

            {/* 詳細を見るボタン */}
            {(summary.summary || (summary.keyPoints && summary.keyPoints.length > 0)) && (
              <div className="mt-4 pt-4 border-t border-stone-200">
                <button
                  onClick={() => setShowDetailModal(summary)}
                  className="text-sm text-amber-600 hover:text-amber-700 font-semibold"
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowDetailModal(null)}
        >
          <div
            className="bg-white border border-stone-200 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-stone-200 p-6 flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{showDetailModal.title}</h2>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="font-semibold text-amber-600">{showDetailModal.channelTitle}</span>
                  <span>•</span>
                  <span>{formatDate(showDetailModal.publishedAt)}</span>
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(null)}
                className="ml-4 text-gray-500 hover:text-gray-900 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {showDetailModal.summary && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">📝 詳細要約</h3>
                  <div className="bg-stone-50 rounded-lg p-4 border border-stone-200">
                    <div className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {showDetailModal.summary}
                    </div>
                  </div>
                </div>
              )}

              {showDetailModal.keyPoints && showDetailModal.keyPoints.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">🔑 重要なポイント</h3>
                  <div className="bg-stone-50 rounded-lg p-4 border border-stone-200">
                    <ul className="space-y-3">
                      {showDetailModal.keyPoints.map((point, index) => (
                        <li key={index} className="text-gray-800 flex items-start">
                          <span className="text-amber-600 font-bold mr-3 flex-shrink-0 text-lg">{index + 1}.</span>
                          <span className="leading-relaxed">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <div className="flex gap-4 pt-4 border-t border-stone-200">
                {showDetailModal.docUrl && (
                  <a
                    href={showDetailModal.docUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg transition-all"
                  >
                    📄 Googleドキュメントを開く
                  </a>
                )}
                <a
                  href={showDetailModal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-800 text-white font-bold rounded-lg transition-all"
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

