
import React from 'react';
import { VideoSummary } from '../types';

interface SummaryCardProps {
  summary: VideoSummary;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ summary }) => {
  return (
    <div className="bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 shadow-xl transition-all hover:border-indigo-500/50 hover:translate-y-[-2px]">
      <div className="relative aspect-video overflow-hidden">
        <img 
          src={summary.thumbnailUrl} 
          alt={summary.title} 
          className="w-full h-full object-cover"
        />
        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-bold text-white uppercase tracking-wider">
          New Upload
        </div>
      </div>
      
      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-bold text-white leading-tight line-clamp-2 hover:text-indigo-400 cursor-pointer">
            <a href={summary.url} target="_blank" rel="noopener noreferrer">{summary.title}</a>
          </h3>
        </div>
        
        <div className="flex items-center text-xs text-slate-400 mb-4 space-x-2">
          <span className="font-semibold text-indigo-400">{summary.channelTitle}</span>
          <span>•</span>
          <span>{summary.publishedAt}</span>
        </div>

        <div className="mb-4">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-2 flex items-center">
            <svg className="w-3 h-3 mr-1 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
              <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
            </svg>
            Summary
          </h4>
          <p className="text-sm text-slate-300 leading-relaxed">
            {summary.summary}
          </p>
        </div>

        <div className="space-y-2">
          {summary.keyPoints.map((point, idx) => (
            <div key={idx} className="flex items-start text-xs text-slate-400">
              <span className="text-indigo-500 mr-2">•</span>
              <span>{point}</span>
            </div>
          ))}
        </div>
        
        <div className="mt-6 pt-4 border-t border-slate-700 flex justify-end">
          <a 
            href={summary.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center transition-colors"
          >
            Watch Video
            <svg className="ml-1 w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
};
