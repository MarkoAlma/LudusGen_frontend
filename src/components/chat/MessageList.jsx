import React from 'react';
import { motion } from 'framer-motion';
import MessageItem from './MessageItem';

export default function MessageList({ messages, loadingHistory, selectedModel, onSuggestionClick }) {
  const themeColor = selectedModel?.color || "#8b5cf6";
  const isEmpty = !loadingHistory && messages.length === 0;

  return (
    <div className="flex flex-col space-y-4 w-full items-center">
      {/* Loading spinner */}
      {loadingHistory && messages.length === 0 && (
        <div className="flex items-center justify-center p-16">
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
              style={{ 
                borderLeftColor: `${themeColor}30`, 
                borderRightColor: `${themeColor}30`, 
                borderBottomColor: `${themeColor}30`, 
                borderTopColor: 'transparent' 
              }}
            />
            <span className="text-[10px] text-gray-400">Loading history...</span>
          </div>
        </div>
      )}


      {/* Messages — no container animation, just direct render */}
      <div className="flex flex-col w-full">
        {messages.map((msg, idx) => (
          <div key={msg.id || idx}>
            <MessageItem
              message={msg}
              themeColor={themeColor}
            />
          </div>
        ))}
      </div>

      {/* Scroll anchor */}
      <div className="h-4" />
    </div>
  );
}
