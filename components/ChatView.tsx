
import React, { useState, useRef, useEffect } from 'react';
import {
  MoreVertical, Paperclip, Mic, Send, X, Phone, ArrowLeft, Trash2,
  Users, ShieldAlert, Settings, ShieldCheck, Reply, Video as VideoIcon,
  Camera, File as FileIcon, Image as ImageIcon, Loader2, Play, Pause, FileText, Check
} from 'lucide-react';
import { Contact, Message, UserProfile } from '../types';
import MessageItem from './MessageItem';
import { useNotification } from './NotificationProvider';

interface ChatViewProps {
  contact: Contact;
  messages: Message[];
  onSendMessage: (content: string, imageUrl?: string, audioUrl?: string, replyTo?: { id: string, text: string }, videoUrl?: string, file?: { url: string, name: string, size: number }) => void;
  onMarkAsRead: (messageId: string, contactId: string) => void;
  onReactToMessage: (messageId: string, emoji: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onStartCall: (type: 'audio' | 'video') => void;
  onBlockContact: (id: string) => void;
  onOpenGroupSettings: () => void;
  isTyping: boolean;
  onBack?: () => void;
  userProfile: UserProfile;
}

const compressImage = (dataUrl: string, quality: number = 0.8): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        } else {
          resolve(dataUrl); // Fallback
        }
      }, 'image/jpeg', quality);
    };
    img.src = dataUrl;
  });
};

const ChatView: React.FC<ChatViewProps> = ({
  contact, messages, onSendMessage, onMarkAsRead, onReactToMessage, onDeleteMessage,
  onStartCall, onBlockContact, onOpenGroupSettings, isTyping, onBack, userProfile
}) => {
  const { showNotification } = useNotification();
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ url: string, name: string, size: number } | null>(null);
  const [recordedAudio, setRecordedAudio] = useState<string | null>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string, text: string } | null>(null);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const genericFileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const isMobile = window.innerWidth < 768;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages, isTyping]);


  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // For large files (> 5MB), show immediate feedback without full processing
      if (file.size > 5 * 1024 * 1024) {
        // Create a temporary object for large files
        const tempFile = { url: '', name: file.name, size: file.size, file };
        setSelectedFile(tempFile);
        setSelectedImage(null);
        setSelectedVideo(null);
        setShowAttachmentMenu(false);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = async () => {
        let url = reader.result as string;
        if (file.type.startsWith('image/') && file.size > 2 * 1024 * 1024) { // Compress if > 2MB
          url = await compressImage(url, 0.8); // Compress to 80% quality
        }
        if (file.type.startsWith('image/')) {
          setSelectedImage(url);
          setSelectedVideo(null);
          setSelectedFile(null);
        } else if (file.type.startsWith('video/')) {
          setSelectedVideo(url);
          setSelectedImage(null);
          setSelectedFile(null);
        } else {
          setSelectedFile({ url, name: file.name, size: file.size });
          setSelectedImage(null);
          setSelectedVideo(null);
        }
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
        reader.onloadend = () => setRecordedAudio(reader.result as string);
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = window.setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch (err) {
      showNotification('Microphone access denied.', [], 'error');
    }
  };

  const stopRecording = (shouldPreview: boolean) => {
    if (mediaRecorderRef.current && isRecording) {
      if (!shouldPreview) mediaRecorderRef.current.onstop = () => {};
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const clearPreviews = () => {
    setSelectedImage(null);
    setSelectedVideo(null);
    setSelectedFile(null);
    setRecordedAudio(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedImage && !selectedVideo && !selectedFile && !recordedAudio) || isTyping || isUploading) return;

    // Show immediate feedback
    const messageData = {
      input: input.trim(),
      selectedImage,
      recordedAudio,
      replyTo,
      selectedVideo,
      selectedFile
    };

    // Clear UI immediately for better UX
    setInput('');
    clearPreviews();
    setReplyTo(null);

    // Process in background
    setIsUploading(true);
    try {
      await onSendMessage(
        messageData.input,
        messageData.selectedImage || undefined,
        messageData.recordedAudio || undefined,
        messageData.replyTo || undefined,
        messageData.selectedVideo || undefined,
        messageData.selectedFile || undefined
      );
    } finally {
      setIsUploading(false);
    }
  };

  const wallpaper = userProfile.settings.wallpaper;

  return (
    <div className="flex flex-col h-full bg-[#0b141a] relative overflow-hidden animate-in slide-in-from-right duration-300">
      <header className={`h-[50px] bg-[#202c33] px-3 flex items-center justify-between border-l border-[#222d34] shadow-sm shrink-0 z-40 ${isMobile ? 'safe-top pt-2 h-[70px]' : ''}`}>
        <div className="flex items-center gap-1 overflow-hidden">
          {onBack && <button onClick={onBack} className="p-2 text-[#d1d7db] hover:bg-white/5 rounded-full"><ArrowLeft size={20} /></button>}
          <div className="flex items-center gap-3 cursor-pointer flex-1 min-w-0" onClick={contact.isGroup ? onOpenGroupSettings : undefined}>
            <img src={contact.avatar} alt={contact.name} className="w-8 h-8 rounded-xl object-cover border border-white/5" />
            <div className="flex flex-col truncate pr-2">
              <span className="text-[#e9edef] font-bold text-sm leading-tight truncate flex items-center gap-1.5">
                {contact.hideDetails ? 'Zen Sanctuary' : contact.name}
                <ShieldCheck size={12} className="text-[#00a884]" />
              </span>
              <span className="text-[9px] text-[#8696a0] font-bold uppercase tracking-widest">
                {isTyping ? <span className="text-[#00a884] animate-pulse">Pulse active...</span> : (contact.isGroup ? `${contact.members?.length} souls` : contact.status)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[#aebac1]">
          {!contact.isGroup && (
            <div className="flex">
              <button onClick={() => onStartCall('video')} className="p-2 hover:bg-white/5 rounded-full transition-colors"><VideoIcon size={18} /></button>
              <button onClick={() => onStartCall('audio')} className="p-2 hover:bg-white/5 rounded-full transition-colors"><Phone size={18} /></button>
            </div>
          )}
          <button className={`p-2 transition-colors rounded-full ${showMenu ? 'bg-white/10 text-white' : 'hover:bg-white/5'}`} onClick={() => setShowMenu(!showMenu)}><MoreVertical size={18} /></button>
        </div>
      </header>

      <div 
        className={`flex-1 overflow-y-auto p-4 custom-scrollbar z-0 relative ${wallpaper ? '' : 'bg-[#0b141a]'}`} 
        style={{ 
          backgroundImage: wallpaper ? `url(${wallpaper})` : 'none', 
          backgroundSize: 'cover', 
          backgroundPosition: 'center', 
          backgroundColor: wallpaper ? 'transparent' : undefined 
        }}
      >
        <div className="max-w-2xl mx-auto space-y-1">
          {messages.map((msg) => (
            <MessageItem
              key={msg.id}
              message={msg}
              userName={userProfile.name}
              onReact={(emoji) => onReactToMessage(msg.id, emoji)}
              onSwipeToReply={(message, text) => setReplyTo({ id: message.id, text })}
              onSwipeToDelete={onDeleteMessage}
              isAdmin={userProfile.role === 'admin'}
            />
          ))}
          {isTyping && (
            <div className="flex justify-start mb-2">
              <div className="bg-[#202c33]/80 px-3 py-1.5 rounded-xl text-[#00a884] text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-[#00a884]/20 animate-pulse">Thinking</div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      <div className={`flex flex-col bg-[#202c33] shrink-0 z-40 border-t border-white/5 ${isMobile ? 'safe-bottom pb-1' : ''}`}>
        
        {/* Pre-send Preview Area */}
        {(selectedImage || selectedVideo || selectedFile || recordedAudio || replyTo) && (
          <div className="px-3 py-3 bg-[#1c272d] border-b border-white/5 flex flex-col gap-2 animate-in slide-in-from-bottom-2 duration-200">
            {replyTo && (
              <div className="flex items-center justify-between bg-[#2a3942] p-2 rounded-lg border-l-2 border-[#00a884]">
                <div className="flex items-center gap-2 truncate text-[10px] text-[#8696a0] italic"><Reply size={12} /> {replyTo.text}</div>
                <button onClick={() => setReplyTo(null)} className="text-[#8696a0] hover:text-white"><X size={14} /></button>
              </div>
            )}
            
            <div className="flex items-end justify-between">
              <div className="flex-1 flex gap-3 overflow-x-auto no-scrollbar py-1">
                {selectedImage && (
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/10 shrink-0 shadow-lg">
                    <img src={selectedImage} className="w-full h-full object-cover" alt="Preview" />
                    <button onClick={() => setSelectedImage(null)} className="absolute top-1 right-1 bg-black/60 p-1 rounded-full text-white"><X size={10} /></button>
                  </div>
                )}
                {selectedVideo && (
                  <div className="relative w-24 h-20 rounded-xl overflow-hidden border border-white/10 bg-black shrink-0 shadow-lg">
                    <video src={selectedVideo} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none"><VideoIcon size={16} className="text-white" /></div>
                    <button onClick={() => setSelectedVideo(null)} className="absolute top-1 right-1 bg-black/60 p-1 rounded-full text-white"><X size={10} /></button>
                  </div>
                )}
                {selectedFile && (
                  <div className="relative h-20 w-32 bg-[#2a3942] rounded-xl flex flex-col items-center justify-center p-2 border border-white/10 shrink-0 shadow-lg">
                    <FileText size={20} className="text-[#00a884] mb-1" />
                    <span className="text-[8px] text-white truncate w-full text-center font-bold px-1">{selectedFile.name}</span>
                    <button onClick={() => setSelectedFile(null)} className="absolute top-1 right-1 bg-black/60 p-1 rounded-full text-white"><X size={10} /></button>
                  </div>
                )}
                {recordedAudio && (
                  <div className="relative h-20 w-40 bg-[#00a884]/10 rounded-xl flex items-center justify-center gap-3 p-3 border border-[#00a884]/30 shrink-0 shadow-lg animate-in zoom-in-95">
                    <div className="p-2 bg-[#00a884] rounded-full text-black"><Mic size={16} /></div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-[#00a884] uppercase tracking-tighter">Recorded Memo</span>
                      <audio src={recordedAudio} controls className="h-6 w-20 opacity-60" />
                    </div>
                    <button onClick={() => setRecordedAudio(null)} className="absolute top-1 right-1 bg-[#00a884]/20 p-1 rounded-full text-[#00a884]"><X size={10} /></button>
                  </div>
                )}
              </div>
              {isUploading && <div className="p-2 flex items-center gap-2 text-[10px] text-[#00a884] font-black uppercase"><Loader2 className="animate-spin" size={12} /> Syncing</div>}
            </div>
          </div>
        )}

        <div className="px-3 py-2 flex items-center gap-2">
          {isRecording ? (
            <div className="flex-1 flex items-center gap-4 py-1">
              <Mic size={20} className="text-rose-500 animate-pulse" />
              <div className="flex-1 text-[#e9edef] font-mono text-sm tracking-wider">{Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}</div>
              <button onClick={() => stopRecording(false)} className="p-2 text-[#8696a0] hover:text-rose-500"><Trash2 size={20} /></button>
              <button onClick={() => stopRecording(true)} className="bg-[#00a884] text-black p-2 rounded-xl"><Check size={20} strokeWidth={3} /></button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1 text-[#8696a0] relative">
                <button onClick={() => cameraInputRef.current?.click()} className="p-2 hover:text-[#d1d7db] rounded-xl"><Camera size={20} /></button>
                <button onClick={() => setShowAttachmentMenu(!showAttachmentMenu)} className={`p-2 rounded-xl transition-all ${showAttachmentMenu ? 'bg-[#00a884] text-black' : 'hover:text-[#d1d7db]'}`}><Paperclip size={20} /></button>
                {showAttachmentMenu && (
                  <div className="absolute bottom-full mb-2 left-0 bg-[#2a3942] p-1.5 rounded-xl shadow-2xl border border-white/10 flex flex-col gap-1 z-50">
                    <button onClick={() => genericFileInputRef.current?.click()} className="p-2 hover:bg-white/5 rounded-lg flex items-center gap-2 text-[10px] font-bold uppercase text-white"><ImageIcon size={14} className="text-emerald-500" /> Files</button>
                  </div>
                )}
                <input type="file" ref={genericFileInputRef} onChange={handleFileSelect} className="hidden" />
                <input type="file" ref={cameraInputRef} onChange={handleFileSelect} accept="image/*" capture="environment" className="hidden" />
              </div>
              <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-2">
                <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Manifest message..." className="w-full bg-[#2a3942] border-none focus:ring-0 rounded-xl py-2 px-4 text-[#d1d7db] text-[13px] shadow-inner" />
                {(input.trim() || selectedImage || selectedVideo || selectedFile || recordedAudio) && (
                  <button type="submit" className="bg-[#00a884] text-black p-2 rounded-xl hover:bg-[#06cf9c] transition-all"><Send size={18} /></button>
                )}
              </form>
              {!input.trim() && !selectedImage && !selectedVideo && !selectedFile && !recordedAudio && (
                <button type="button" onClick={startRecording} className="text-[#00a884] p-2 hover:bg-white/5 rounded-xl"><Mic size={20} /></button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatView;
