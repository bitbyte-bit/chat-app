
import React, { useState, useRef, useEffect } from 'react';
import { Check, CheckCheck, Play, Pause, Volume2, SmilePlus, Lock, Reply as ReplyIcon } from 'lucide-react';
import { Message } from '../types';
import { decryptContent } from '../services/crypto';

interface MessageItemProps {
  message: Message;
  userName: string;
  onReact: (emoji: string) => void;
  onSwipeToReply?: (message: Message, decryptedContent: string) => void;
}

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
const SWIPE_THRESHOLD = 60;

const MessageItem: React.FC<MessageItemProps> = ({ message, userName, onReact, onSwipeToReply }) => {
  const isMe = message.role === 'user';
  const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  const [decryptedText, setDecryptedText] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const [swipeX, setSwipeX] = useState(0);
  const touchStartRef = useRef<number | null>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const runDecryption = async () => {
      const text = await decryptContent(message.content);
      setDecryptedText(text);
    };
    if (message.type === 'text' || message.type === 'audio') {
      runDecryption();
    } else {
      setDecryptedText(message.content);
    }
  }, [message.content, message.type]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const renderStatus = () => {
    if (!isMe) return null;
    switch (message.status) {
      case 'read': return <CheckCheck size={16} className="text-[#53bdeb]" />;
      case 'delivered': return <CheckCheck size={16} className="text-[#8696a0]" />;
      case 'sent':
      default: return <Check size={16} className="text-[#8696a0]" />;
    }
  };

  const handleLongPress = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setShowEmojiPicker(true);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartRef.current === null) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStartRef.current;
    
    // Only allow swiping right
    if (diff > 0) {
      setSwipeX(Math.min(diff, SWIPE_THRESHOLD + 20));
    }
  };

  const onTouchEnd = () => {
    if (swipeX >= SWIPE_THRESHOLD && onSwipeToReply && decryptedText) {
      onSwipeToReply(message, decryptedText);
      if (window.navigator.vibrate) window.navigator.vibrate(10);
    }
    setSwipeX(0);
    touchStartRef.current = null;
  };

  const hasReactions = message.reactions && Object.keys(message.reactions).length > 0;

  return (
    <div 
      className={`flex w-full mb-3 group relative transition-transform duration-100 ease-out ${isMe ? 'justify-end' : 'justify-start'}`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ transform: `translateX(${swipeX}px)` }}
    >
      {swipeX > 0 && (
        <div className="absolute left-[-40px] top-1/2 -translate-y-1/2 flex items-center justify-center text-[#00a884] opacity-50 transition-opacity" style={{ opacity: swipeX / SWIPE_THRESHOLD }}>
          <ReplyIcon size={24} />
        </div>
      )}

      <div className={`relative flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%] md:max-w-[75%]`}>
        
        {showEmojiPicker && (
          <div 
            ref={pickerRef}
            className={`absolute z-20 -top-12 ${isMe ? 'right-0' : 'left-0'} bg-[#2a3942] border border-white/10 rounded-full px-2 py-1 flex items-center gap-1 shadow-2xl animate-in fade-in zoom-in duration-200`}
          >
            {EMOJIS.map(emoji => (
              <button key={emoji} onClick={() => { onReact(emoji); setShowEmojiPicker(false); }} className="hover:scale-125 transition-transform p-1.5">{emoji}</button>
            ))}
          </div>
        )}

        <div 
          onContextMenu={handleLongPress}
          className={`relative px-3 py-2 rounded-2xl shadow-sm ${
            isMe ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-none' : 'bg-[#202c33] text-[#e9edef] rounded-tl-none'
          }`}
        >
          <div className={`absolute top-0 w-3 h-3 ${isMe ? 'right-[-8px] border-l-[10px] border-l-[#005c4b] border-b-[10px] border-b-transparent' : 'left-[-8px] border-r-[10px] border-r-[#202c33] border-b-[10px] border-b-transparent'}`}></div>

          {message.replyToText && (
            <div className={`mb-2 p-2 rounded-lg text-xs border-l-4 border-[#00a884] ${isMe ? 'bg-black/20' : 'bg-black/10'} opacity-70 truncate max-w-full italic`}>
               {message.replyToText}
            </div>
          )}

          {message.type === 'image' && message.mediaUrl && (
            <div className="mb-2 rounded-xl overflow-hidden bg-black/20">
              <img src={message.mediaUrl} alt="Shared media" className="max-w-full h-auto block" />
            </div>
          )}

          {message.type === 'video' && message.mediaUrl && (
            <div className="mb-2 rounded-xl overflow-hidden bg-black/20 max-w-[280px]">
              <video src={message.mediaUrl} controls className="w-full h-auto block" playsInline />
            </div>
          )}

          {message.type === 'audio' && message.mediaUrl && (
            <div className="flex items-center gap-3 py-1 pr-6 min-w-[200px]">
              <audio ref={audioRef} src={message.mediaUrl} onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} onEnded={() => { setIsPlaying(false); setCurrentTime(0); }} className="hidden" />
              <button onClick={togglePlay} className={`p-2 rounded-full flex items-center justify-center ${isMe ? 'text-[#005c4b] bg-[#e9edef]' : 'text-[#202c33] bg-[#00a884]'}`}>
                {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
              </button>
              <div className="flex-1 space-y-1"><div className="h-1 bg-white/20 rounded-full relative overflow-hidden"><div className="absolute top-0 left-0 h-full bg-[#00a884] transition-all" style={{ width: `${(currentTime / duration) * 100 || 0}%` }} /></div></div>
              <Volume2 size={14} className="opacity-50" />
            </div>
          )}

          {message.type === 'text' && (
            <div className="text-[14.5px] leading-relaxed break-words whitespace-pre-wrap pr-12 min-w-[60px] flex items-start gap-1">
              {decryptedText === null ? '...' : decryptedText}
            </div>
          )}

          <div className="absolute bottom-1 right-2 flex items-center gap-1">
            <span className="text-[10px] text-[#8696a0]">{time}</span>
            {renderStatus()}
          </div>

          <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`absolute -bottom-2 ${isMe ? '-left-8' : '-right-8'} p-1.5 text-[#8696a0] opacity-0 group-hover:opacity-100 transition-opacity hover:text-white`}><SmilePlus size={16} /></button>
        </div>

        {hasReactions && (
          <div className={`mt-[-8px] flex flex-wrap gap-1 ${isMe ? 'justify-end' : 'justify-start'} z-10`}>
            {Object.entries(message.reactions || {}).map(([emoji, users]) => (
              <div key={emoji} title={users.join(', ')} className="bg-[#2a3942] border border-white/10 rounded-full px-1.5 py-0.5 text-xs flex items-center gap-1 shadow-md hover:bg-[#32414a] cursor-help">
                <span>{emoji}</span>
                {users.length > 1 && <span className="text-[9px] text-[#8696a0] font-bold">{users.length}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageItem;
