
import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  MoreVertical, 
  Smile, 
  Paperclip, 
  Mic, 
  Send,
  X,
  Loader2,
  Phone,
  Video,
  ArrowLeft,
  Trash2,
  Info,
  Users,
  ShieldAlert,
  Settings,
  ShieldCheck,
  Reply,
  Video as VideoIcon,
  Image as ImageIcon
} from 'lucide-react';
import { Contact, Message, UserProfile } from '../types';
import MessageItem from './MessageItem';

interface ChatViewProps {
  contact: Contact;
  messages: Message[];
  onSendMessage: (content: string, imageUrl?: string, audioUrl?: string, replyTo?: { id: string, text: string }, videoUrl?: string) => void;
  onMarkAsRead: (messageId: string, contactId: string) => void;
  onReactToMessage: (messageId: string, emoji: string) => void;
  onStartCall: (type: 'audio' | 'video') => void;
  onBlockContact: (id: string) => void;
  onOpenGroupSettings: () => void;
  isTyping: boolean;
  onBack?: () => void;
  userProfile: UserProfile;
}

const ChatView: React.FC<ChatViewProps> = ({ 
  contact, 
  messages, 
  onSendMessage, 
  onMarkAsRead,
  onReactToMessage, 
  onStartCall, 
  onBlockContact,
  onOpenGroupSettings,
  isTyping, 
  onBack, 
  userProfile 
}) => {
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string, text: string } | null>(null);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const isMobile = window.innerWidth < 768;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages, isTyping]);

  useEffect(() => {
    const unreadFromOther = messages.filter(m => m.role === 'assistant' && m.status !== 'read');
    if (unreadFromOther.length > 0) {
      unreadFromOther.forEach(m => onMarkAsRead(m.id, contact.id));
    }
  }, [messages, contact.id, onMarkAsRead]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setSelectedVideo(null);
        setShowAttachmentMenu(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedVideo(reader.result as string);
        setSelectedImage(null);
        setShowAttachmentMenu(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => audioChunksRef.current.push(event.data);
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => onSendMessage('', undefined, reader.result as string);
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = window.setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch (err) {
      alert('Could not access microphone');
    }
  };

  const stopRecording = (shouldSend: boolean) => {
    if (mediaRecorderRef.current && isRecording) {
      if (!shouldSend) mediaRecorderRef.current.onstop = () => {};
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedImage && !selectedVideo) || isTyping) return;
    onSendMessage(input, selectedImage || undefined, undefined, replyTo || undefined, selectedVideo || undefined);
    setInput('');
    setSelectedImage(null);
    setSelectedVideo(null);
    setReplyTo(null);
  };

  const handleSwipeToReply = (message: Message, decryptedContent: string) => {
    setReplyTo({
      id: message.id,
      text: decryptedContent.slice(0, 100) + (decryptedContent.length > 100 ? '...' : '')
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#0b141a] relative overflow-hidden animate-in slide-in-from-right duration-300">
      <header className={`h-[60px] md:h-[65px] bg-[#202c33] px-3 flex items-center justify-between border-l border-[#222d34] shadow-sm shrink-0 z-30 ${isMobile ? 'safe-top pt-2 h-[80px]' : ''}`}>
        <div className="flex items-center gap-1 overflow-hidden">
          {onBack && (
            <button onClick={onBack} className="p-2 text-[#d1d7db] hover:bg-white/5 rounded-full">
              <ArrowLeft size={24} />
            </button>
          )}
          <div 
            className="flex items-center gap-3 cursor-pointer group flex-1 min-w-0"
            onClick={contact.isGroup ? onOpenGroupSettings : undefined}
          >
            <div className="relative flex-shrink-0">
              <img src={contact.avatar} alt={contact.name} className="w-10 h-10 md:w-11 md:h-11 rounded-full object-cover border border-white/5" />
              {contact.isGroup && <div className="absolute -bottom-1 -right-1 bg-[#00a884] text-black rounded-full p-0.5 border border-[#202c33]"><Users size={10} /></div>}
            </div>
            <div className="flex flex-col truncate pr-2">
              <span className="text-[#e9edef] font-semibold text-base leading-tight group-hover:text-[#00a884] transition-colors truncate flex items-center gap-1.5">
                {contact.hideDetails ? 'Zen Chat' : contact.name}
                <ShieldCheck size={14} className="text-[#00a884]" />
              </span>
              <span className="text-[11px] text-[#8696a0]">
                {isTyping ? <span className="text-[#00a884] animate-pulse">thinking...</span> : (contact.isGroup ? `${contact.members?.length} members` : contact.status)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-6 text-[#aebac1]">
          {!contact.isGroup && (
            <div className="flex gap-1 md:gap-4">
              <button onClick={() => onStartCall('video')} className="p-2 hover:bg-white/5 rounded-full transition-colors"><VideoIcon size={22} /></button>
              <button onClick={() => onStartCall('audio')} className="p-2 hover:bg-white/5 rounded-full transition-colors"><Phone size={20} /></button>
            </div>
          )}
          <div className="relative">
            <button 
              className={`p-2 transition-colors rounded-full ${showMenu ? 'bg-white/10 text-white' : 'hover:bg-white/5'}`} 
              onClick={() => setShowMenu(!showMenu)}
            >
              <MoreVertical size={20} />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-[#2a3942] border border-white/10 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 origin-top-right">
                {contact.isGroup && (
                  <button onClick={() => { onOpenGroupSettings(); setShowMenu(false); }} className="w-full px-4 py-3 text-left text-sm text-[#e9edef] hover:bg-white/5 flex items-center gap-3 transition-colors">
                    <Settings size={18} /> Group Settings
                  </button>
                )}
                <button onClick={() => { onBlockContact(contact.id); setShowMenu(false); }} className="w-full px-4 py-3 text-left text-sm text-rose-500 hover:bg-rose-500/10 flex items-center gap-3 transition-colors">
                  <ShieldAlert size={18} /> Block Contact
                </button>
                <div className="mx-2 my-1 border-t border-white/5"></div>
                <button className="w-full px-4 py-3 text-left text-sm text-[#e9edef] hover:bg-white/5 flex items-center gap-3 transition-colors"><Trash2 size={18} /> Clear Chat</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div 
        className="flex-1 overflow-y-auto p-4 custom-scrollbar z-0 relative"
        style={{ 
          backgroundImage: userProfile.settings.wallpaper ? `url(${userProfile.settings.wallpaper})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="max-w-3xl mx-auto space-y-1">
          <div className="flex justify-center my-6">
            <div className="bg-[#111b21]/60 backdrop-blur-md text-[#8696a0] px-4 py-2 rounded-2xl text-[10px] font-bold uppercase tracking-widest border border-white/5 flex items-center gap-2 shadow-xl">
              <ShieldCheck size={14} className="text-[#00a884]" />
              Zen End-to-End Encrypted
            </div>
          </div>

          {messages.map((msg) => (
            <MessageItem key={msg.id} message={msg} userName={userProfile.name} onReact={(emoji) => onReactToMessage(msg.id, emoji)} onSwipeToReply={handleSwipeToReply} />
          ))}
          {isTyping && (
            <div className="flex justify-start mb-4">
              <div className="bg-[#202c33]/80 backdrop-blur-sm px-4 py-2 rounded-2xl text-[#00a884] text-xs font-bold flex items-center gap-3 border border-[#00a884]/20 animate-pulse shadow-lg">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-[#00a884] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 bg-[#00a884] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-[#00a884] rounded-full animate-bounce"></div>
                </div>
                Zen Thinking
              </div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      <div className={`flex flex-col bg-[#202c33] shrink-0 z-30 ${isMobile ? 'safe-bottom pb-2' : ''}`}>
        {replyTo && (
          <div className="px-4 py-2 bg-[#2a3942] border-l-4 border-[#00a884] flex items-center justify-between animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center gap-3 overflow-hidden">
              <Reply size={16} className="text-[#00a884] shrink-0" />
              <div className="flex flex-col truncate">
                <span className="text-[10px] font-bold text-[#00a884] uppercase">Replying to</span>
                <span className="text-xs text-[#d1d7db] truncate opacity-70">{replyTo.text}</span>
              </div>
            </div>
            <button onClick={() => setReplyTo(null)} className="p-1 text-[#8696a0] hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>
        )}

        <div className="min-h-[68px] px-3 py-3 flex items-end gap-2 relative">
          {(selectedImage || selectedVideo) && (
            <div className="absolute bottom-full left-4 mb-3 bg-[#2a3942] p-2 rounded-2xl shadow-2xl border border-white/10 animate-in slide-in-from-bottom duration-200 max-w-[150px]">
              <button onClick={() => { setSelectedImage(null); setSelectedVideo(null); }} className="absolute -top-2 -right-2 bg-rose-500 text-white p-1 rounded-full z-10 shadow-lg"><X size={14} /></button>
              {selectedImage && <img src={selectedImage} alt="Preview" className="w-full h-auto object-cover rounded-xl" />}
              {selectedVideo && <video src={selectedVideo} className="w-full h-auto rounded-xl" muted />}
            </div>
          )}

          {isRecording ? (
            <div className="flex-1 flex items-center gap-4 py-2 animate-in slide-in-from-right duration-300">
              <div className="relative"><div className="absolute inset-0 bg-rose-500/20 rounded-full animate-ping"></div><Mic size={24} className="text-rose-500 relative z-10" /></div>
              <div className="flex-1 text-[#e9edef] font-mono text-xl">{Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}</div>
              <button onClick={() => stopRecording(false)} className="p-3 text-[#8696a0] hover:text-rose-500 transition-colors"><Trash2 size={24} /></button>
              <button onClick={() => stopRecording(true)} className="bg-[#00a884] text-black p-4 rounded-full hover:bg-[#06cf9c] shadow-xl"><Send size={26} /></button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 text-[#8696a0] pb-1.5 relative">
                <button className="p-2 hover:text-[#d1d7db] hover:bg-white/5 rounded-full"><Smile size={26} /></button>
                <button onClick={() => setShowAttachmentMenu(!showAttachmentMenu)} className={`p-2 hover:text-[#d1d7db] rounded-full transition-all ${showAttachmentMenu ? 'bg-[#00a884] text-black' : 'hover:bg-white/5'}`}>
                  <Paperclip size={26} />
                </button>
                {showAttachmentMenu && (
                  <div className="absolute bottom-full mb-4 left-0 bg-[#2a3942] p-2 rounded-2xl shadow-2xl border border-white/10 flex flex-col gap-2 animate-in slide-in-from-bottom duration-200 z-50">
                     <button onClick={() => fileInputRef.current?.click()} className="p-3 hover:bg-white/5 rounded-xl flex items-center gap-3 text-sm text-white">
                        <ImageIcon size={20} className="text-emerald-500" /> Image
                     </button>
                     <button onClick={() => videoInputRef.current?.click()} className="p-3 hover:bg-white/5 rounded-xl flex items-center gap-3 text-sm text-white">
                        <VideoIcon size={20} className="text-blue-500" /> Video Clip
                     </button>
                  </div>
                )}
                <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
                <input type="file" ref={videoInputRef} onChange={handleVideoSelect} accept="video/*" className="hidden" />
              </div>
              <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-2 mb-0.5">
                <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Message" className="w-full bg-[#2a3942] border-none focus:ring-0 rounded-3xl py-2.5 px-5 text-[#d1d7db] placeholder-[#8696a0] text-base shadow-inner" />
                <button type="submit" disabled={isTyping} className={`bg-[#00a884] text-black p-3.5 rounded-full hover:bg-[#06cf9c] transition-all disabled:opacity-50 shadow-lg ${input.trim() || selectedImage || selectedVideo ? 'scale-100 opacity-100' : 'scale-0 opacity-0 hidden'}`}><Send size={24} /></button>
              </form>
              <button type="button" onClick={startRecording} className={`bg-[#00a884] text-black p-3.5 rounded-full hover:bg-[#06cf9c] transition-all mb-0.5 shadow-lg ${input.trim() || selectedImage || selectedVideo ? 'scale-0 opacity-0 hidden' : 'scale-100 opacity-100'}`}><Mic size={24} /></button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatView;
