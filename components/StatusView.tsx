
import React, { useState, useRef } from 'react';
import { Plus, Camera, Send, X, Clock, Image as ImageIcon, Smile, ArrowLeft } from 'lucide-react';
import { Moment, UserProfile } from '../types';

interface StatusViewProps {
  moments: Moment[];
  onAddMoment: (content: string, mediaUrl?: string) => void;
  userProfile: UserProfile;
}

const StatusView: React.FC<StatusViewProps> = ({ moments, onAddMoment, userProfile }) => {
  const [isPosting, setIsPosting] = useState(false);
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isMobile = window.innerWidth < 768;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setMediaUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handlePost = () => {
    if (!content.trim() && !mediaUrl) return;
    onAddMoment(content, mediaUrl || undefined);
    setContent('');
    setMediaUrl(null);
    setIsPosting(false);
  };

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ago`;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b141a] animate-in fade-in duration-300 overflow-hidden">
      <header className={`h-[60px] bg-[#202c33] flex items-center px-4 shrink-0 shadow-lg ${isMobile ? 'safe-top h-[100px] pt-8' : ''}`}>
        <h2 className="text-[#e9edef] text-2xl font-bold font-outfit">Zen Moments</h2>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar p-4 md:p-8">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* My Status Trigger */}
          <div 
            onClick={() => setIsPosting(true)}
            className="flex items-center gap-4 p-5 bg-[#202c33] rounded-[32px] cursor-pointer hover:bg-[#2a3942] active:scale-[0.98] transition-all border border-white/5 shadow-xl"
          >
            <div className="relative">
              <img src={userProfile.avatar} alt="Me" className="w-16 h-16 rounded-full border-2 border-[#00a884] object-cover shadow-lg" />
              <div className="absolute bottom-0 right-0 bg-[#00a884] text-black rounded-full p-1 border-4 border-[#202c33]">
                <Plus size={16} strokeWidth={3} />
              </div>
            </div>
            <div>
              <h3 className="text-[#e9edef] font-bold text-lg">My Moment</h3>
              <p className="text-[#8696a0] text-sm font-medium">Capture your presence</p>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-[#00a884] text-xs font-bold uppercase tracking-widest px-2">Recent Updates</h4>
            {moments.length === 0 ? (
              <div className="text-center py-20 opacity-30">
                <Clock size={64} className="mx-auto mb-4 text-[#8696a0]" />
                <p className="text-[#8696a0] font-medium">Quietness prevails</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-20">
                {moments.map(moment => (
                  <div key={moment.id} className="bg-[#202c33] rounded-[40px] overflow-hidden border border-white/5 shadow-2xl group transition-all">
                    {moment.mediaUrl && (
                      <div className="aspect-[4/5] w-full overflow-hidden">
                        <img src={moment.mediaUrl} alt="Moment" className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-1000" />
                      </div>
                    )}
                    <div className="p-6">
                      <div className="flex items-center gap-4 mb-4">
                        <img src={moment.userAvatar} className="w-10 h-10 rounded-full border border-white/10 shadow-md" alt={moment.userName} />
                        <div>
                          <p className="text-[#e9edef] text-sm font-bold">{moment.userName}</p>
                          <p className="text-[#8696a0] text-[10px] uppercase font-bold tracking-tighter">{formatTime(moment.timestamp)}</p>
                        </div>
                      </div>
                      <p className="text-[#d1d7db] text-base leading-relaxed font-medium">{moment.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Posting Modal */}
      {isPosting && (
        <div className="fixed inset-0 z-[150] bg-black/95 flex flex-col p-6 animate-in slide-in-from-bottom duration-300 safe-top safe-bottom">
          <div className="flex justify-between items-center mb-10">
            <button onClick={() => setIsPosting(false)} className="text-[#8696a0] hover:text-white p-2">
              <ArrowLeft size={32} />
            </button>
            <h3 className="text-white text-xl font-bold font-outfit">New Moment</h3>
            <div className="w-8"></div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full">
            <div className="w-full bg-[#202c33] rounded-[48px] p-8 shadow-2xl border border-white/10 space-y-8">
              <div className="relative aspect-[4/5] w-full rounded-[36px] bg-[#0b141a] border border-white/5 overflow-hidden flex items-center justify-center shadow-inner">
                {mediaUrl ? (
                  <>
                    <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button onClick={() => setMediaUrl(null)} className="absolute top-6 right-6 bg-black/50 text-white p-3 rounded-full backdrop-blur-md">
                      <X size={20} />
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center gap-4 text-[#8696a0] hover:text-[#00a884] transition-colors"
                  >
                    <div className="p-8 bg-white/5 rounded-full">
                       <Camera size={56} strokeWidth={1.5} />
                    </div>
                    <span className="text-base font-bold uppercase tracking-widest">Capture Vision</span>
                  </button>
                )}
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
              </div>

              <textarea 
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's in your mind?"
                className="w-full bg-transparent border-none focus:ring-0 text-[#e9edef] text-2xl placeholder-[#3b4a54] text-center h-24 resize-none font-medium"
              />

              <div className="flex justify-between items-center pt-6 border-t border-white/5">
                <div className="flex gap-6 text-[#8696a0]">
                  <ImageIcon size={28} className="cursor-pointer hover:text-white transition-colors" onClick={() => fileInputRef.current?.click()} />
                  <Smile size={28} className="cursor-pointer hover:text-white transition-colors" />
                </div>
                <button 
                  onClick={handlePost}
                  disabled={!content.trim() && !mediaUrl}
                  className="bg-[#00a884] text-black px-12 py-4 rounded-full font-bold shadow-2xl shadow-[#00a884]/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 text-lg"
                >
                  Share
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusView;
