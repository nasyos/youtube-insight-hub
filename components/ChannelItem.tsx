
import React from 'react';
import { TrackedChannel } from '../types';

interface ChannelItemProps {
  channel: TrackedChannel;
  onRemove: (id: string) => void;
}

export const ChannelItem: React.FC<ChannelItemProps> = ({ channel, onRemove }) => {
  return (
    <div className="flex items-center justify-between p-3 mb-2 rounded-xl bg-stone-50 hover:bg-stone-100 transition-colors group border border-stone-200">
      <div className="flex items-center space-x-3 overflow-hidden">
        <img 
          src={channel.thumbnailUrl} 
          alt={channel.name} 
          className="w-10 h-10 rounded-full object-cover border-2 border-stone-300"
        />
        <div className="overflow-hidden">
          <p className="text-sm font-semibold truncate text-gray-900">{channel.name}</p>
          <p className="text-xs text-gray-600 truncate">{channel.handle}</p>
        </div>
      </div>
      <button 
        onClick={() => onRemove(channel.id)}
        className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-600 transition-all"
        title="解除"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
};
