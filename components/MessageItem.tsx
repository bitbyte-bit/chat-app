
import React, { useState, useRef, useEffect } from 'react';
import { Check, CheckCheck, Play, Pause, Volume2, File as FileIcon, Download, Copy } from 'lucide-react';
import { Message } from '../types';
import { decryptContent } from '../services/crypto';

interface MessageItemProps {
  message: Message;
  userName: string;
  onReact: (emoji: string) => void;
  onSwipeToReply?: (message: Message, decryptedContent: string) => void;
  onSwipeToDelete?: (messageId: string) => void;
}

const MessageItem: React.FC<MessageItemProps> = ({ message, onSwipeToReply, onSwipeToDelete }) => {
  const isMe = message.role === 'user';
  const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  const [decryptedText, setDecryptedText] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Swipe gesture state
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [startX, setStartX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const messageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const runDecryption = async () => {
      const text = await decryptContent(message.content);
      // Filter out technical fallbacks like "IMAGE", "VIDEO" if they are the only content
      const technicalFallbacks = ['IMAGE', 'VIDEO', 'AUDIO', 'FILE'];
      if (message.type !== 'text' && technicalFallbacks.includes(text)) {
        setDecryptedText(null);
      } else {
        setDecryptedText(text);
      }
    };
    runDecryption();
  }, [message.content, message.type]);

  const handleDownload = () => {
    if (message.mediaUrl) {
      const link = document.createElement('a');
      link.href = message.mediaUrl;
      link.download = message.fileName || 'file';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(label);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  // Swipe gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX;
    setSwipeOffset(diff);
  };

  const handleTouchEnd = () => {
    if (!isSwiping) return;

    const threshold = 80; // Minimum swipe distance

    if (Math.abs(swipeOffset) > threshold) {
      if (swipeOffset > 0 && onSwipeToReply && decryptedText) {
        // Swipe right - reply
        onSwipeToReply(message, decryptedText);
      } else if (swipeOffset < 0 && onSwipeToDelete) {
        // Swipe left - delete
        onSwipeToDelete(message.id);
      }
    }

    // Reset swipe state
    setSwipeOffset(0);
    setIsSwiping(false);
  };

  const renderStatus = () => {
    if (!isMe) return null;
    switch (message.status) {
      case 'read': return <CheckCheck size={12} className="text-[#53bdeb]" />;
      case 'delivered': return <CheckCheck size={12} className="text-[#8696a0]" />;
      case 'sent':
      default: return <Check size={12} className="text-[#8696a0]" />;
    }
  };

  const processText = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const phoneRegex = /(\+?\d[\d\s\-()]{8,}\d)/g;
    const parts = text.split(/((?:https?:\/\/[^\s]+)|(?:\+?\d[\d\s\-()]{8,}\d))/g);
    
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <span key={i} className="inline-flex items-center gap-1 group/link">
            <a href={part} target="_blank" rel="noopener noreferrer" className="text-[#00a884] underline decoration-[#00a884]/30 hover:text-[#06cf9c] transition-all">
              {part}
            </a>
            <button onClick={() => handleCopy(part, 'Copied')} className="opacity-0 group-hover/link:opacity-100 p-0.5 text-[#8696a0]"><Copy size={10} /></button>
          </span>
        );
      }
      if (part.match(phoneRegex) && part.replace(/[^\d]/g, '').length >= 10) {
        return (
          <span key={i} className="inline-flex items-center gap-1 group/phone">
            <a href={`tel:${part.replace(/[^\d+]/g, '')}`} className="text-[#00a884] underline decoration-[#00a884]/30 hover:text-[#06cf9c] transition-all">
              {part}
            </a>
            <button onClick={() => handleCopy(part, 'Copied')} className="opacity-0 group-hover/phone:opacity-100 p-0.5 text-[#8696a0]"><Copy size={10} /></button>
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className={`flex w-full mb-2 group relative ${isMe ? 'justify-end' : 'justify-start'}`}>
      {/* Swipe action backgrounds */}
      <div className="absolute inset-0 flex items-center">
        {swipeOffset > 50 && (
          <div className="flex items-center justify-start w-full pl-4 text-emerald-500">
            <div className="flex items-center gap-2 bg-emerald-500/10 rounded-full px-3 py-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                <path d="M21 3v5h-5"/>
                <polyline points="16,7 21,2 21,7"/>
                <line x1="8" y1="11" x2="8" y2="16"/>
                <line x1="12" y1="9" x2="8" y2="13"/>
              </svg>
              <span className="text-xs font-bold">Reply</span>
            </div>
          </div>
        )}
        {swipeOffset < -50 && (
          <div className="flex items-center justify-end w-full pr-4 text-rose-500">
            <div className="flex items-center gap-2 bg-rose-500/10 rounded-full px-3 py-1">
              <span className="text-xs font-bold">Delete</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18"/>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
              </svg>
            </div>
          </div>
        )}
      </div>

      <div
        ref={messageRef}
        className={`relative flex flex-col transition-transform duration-200 ease-out ${isMe ? 'items-end' : 'items-start'} max-w-[85%] md:max-w-[70%]`}
        style={{ transform: `translateX(${swipeOffset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className={`relative p-1 rounded-xl shadow-sm ${isMe ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-none' : 'bg-[#202c33] text-[#e9edef] rounded-tl-none'}`}>
          
          {/* Media Rendering */}
          {message.type === 'image' && message.mediaUrl && (
            <div className="rounded-lg overflow-hidden max-w-full">
              <img src={message.mediaUrl} alt="" className="max-w-full h-auto block" />
            </div>
          )}

          {message.type === 'video' && message.mediaUrl && (
            <div className="rounded-lg overflow-hidden bg-black max-w-full">
              <video src={message.mediaUrl} controls className="max-w-full h-auto block" />
            </div>
          )}

          {message.type === 'file' && message.mediaUrl && (
            <div className="flex items-center gap-3 py-1.5 px-3 bg-black/10 rounded-lg m-1">
              <FileIcon size={18} className="text-[#00a884]" />
              <div className="flex-1 min-w-0"><p className="text-[10px] font-bold truncate text-white">{message.fileName || 'File'}</p></div>
              <button onClick={handleDownload} className="text-[#00a884]"><Download size={16} /></button>
            </div>
          )}

          {message.type === 'audio' && message.mediaUrl && (
            <div className="flex items-center gap-3 py-1 px-3 min-w-[160px] m-1">
              <audio ref={audioRef} src={message.mediaUrl} onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} className="hidden" />
              <button onClick={() => { if(audioRef.current){ if(isPlaying) audioRef.current.pause(); else audioRef.current.play(); setIsPlaying(!isPlaying); }}} className={`p-1.5 rounded-lg ${isMe ? 'text-[#005c4b] bg-[#e9edef]' : 'text-[#202c33] bg-[#00a884]'}`}>
                {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
              </button>
              <div className="flex-1 h-0.5 bg-white/20 rounded-full"><div className="h-full bg-[#00a884]" style={{ width: `${(currentTime / duration) * 100 || 0}%` }} /></div>
            </div>
          )}

          {/* Text/Caption Rendering - Now outside type checks so it renders for images too */}
          {decryptedText && (
            <div className="px-2 pt-1 pb-4 text-[13px] leading-snug break-words whitespace-pre-wrap min-w-[60px] relative">
              {processText(decryptedText)}
              {copyFeedback && <div className="absolute -top-6 left-0 bg-[#00a884] text-black text-[8px] font-bold px-1.5 py-0.5 rounded shadow-lg">{copyFeedback}</div>}
            </div>
          )}

          <div className="absolute bottom-1 right-2 flex items-center gap-1">
            <span className="text-[8px] text-[#8696a0] font-bold">{time}</span>
            {renderStatus()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageItem;
