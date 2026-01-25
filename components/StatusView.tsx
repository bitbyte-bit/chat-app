
import React, { useState, useRef, useEffect } from 'react';
import { Plus, Camera, Send, X, Clock, Image as ImageIcon, Smile, ArrowLeft, Heart, MessageCircle, Share, UserPlus, Edit3, Trash2 } from 'lucide-react';
import { Moment, UserProfile } from '../types';
import { useNotification } from './NotificationProvider';

interface StatusViewProps {
  moments: Moment[];
  onAddMoment: (content: string, mediaUrl?: string) => void;
  onViewProfile: (userId: string) => void;
  userProfile: UserProfile;
}

const StatusView: React.FC<StatusViewProps> = ({ moments, onAddMoment, onViewProfile, userProfile }) => {
  const { showNotification, confirm } = useNotification();
  const [isPosting, setIsPosting] = useState(false);
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [editingMoment, setEditingMoment] = useState<Moment | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [likes, setLikes] = useState<Record<string, any[]>>({});
  const [comments, setComments] = useState<Record<string, any[]>>({});
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

  const handleLike = async (momentId: string) => {
    const isLiked = likes[momentId]?.some(l => l.user_id === userProfile.id);
    try {
      if (isLiked) {
        await fetch(`/api/moments/${momentId}/like?user_id=${userProfile.id}`, { method: 'DELETE' });
        setLikes(prev => ({ ...prev, [momentId]: prev[momentId].filter(l => l.user_id !== userProfile.id) }));
      } else {
        await fetch(`/api/moments/${momentId}/like`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userProfile.id })
        });
        const newLike = { user_id: userProfile.id, timestamp: Date.now() };
        setLikes(prev => ({ ...prev, [momentId]: [...(prev[momentId] || []), newLike] }));
      }
    } catch (e) {
      showNotification('Error updating like', [], 'error');
    }
  };

  const handleComment = async (momentId: string) => {
    const commentText = commentInputs[momentId]?.trim();
    if (!commentText) return;
    try {
      await fetch(`/api/moments/${momentId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userProfile.id,
          user_name: userProfile.name,
          user_avatar: userProfile.avatar,
          content: commentText
        })
      });
      const newComment = {
        id: Date.now().toString(),
        user_name: userProfile.name,
        user_avatar: userProfile.avatar,
        content: commentText,
        timestamp: Date.now()
      };
      setComments(prev => ({ ...prev, [momentId]: [newComment, ...(prev[momentId] || [])] }));
      setCommentInputs(prev => ({ ...prev, [momentId]: '' }));
    } catch (e) {
      showNotification('Error posting comment', [], 'error');
    }
  };

  const handleFollow = async (userId: string) => {
    try {
      await fetch(`/api/users/${userId}/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ follower_id: userProfile.id })
      });
      showNotification('Followed user', [], 'success');
    } catch (e) {
      showNotification('Error following user', [], 'error');
    }
  };

  const handleEdit = async () => {
    if (!editingMoment) return;
    try {
      await fetch(`/api/moments/${editingMoment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editingMoment.content, mediaUrl: editingMoment.mediaUrl })
      });
      setEditingMoment(null);
      // Reload moments
      window.location.reload();
    } catch (e) {
      showNotification('Error updating post', [], 'error');
    }
  };

  const handleDelete = async (momentId: string) => {
    if (!(await confirm('Delete this post?'))) return;
    try {
      await fetch(`/api/moments/${momentId}`, { method: 'DELETE' });
      // Reload moments
      window.location.reload();
    } catch (e) {
      showNotification('Error deleting post', [], 'error');
    }
  };

  useEffect(() => {
    moments.forEach(async (moment) => {
      try {
        const [likesRes, commentsRes] = await Promise.all([
          fetch(`/api/moments/${moment.id}/likes`),
          fetch(`/api/moments/${moment.id}/comments`)
        ]);
        const likesData = await likesRes.json();
        const commentsData = await commentsRes.json();
        setLikes(prev => ({ ...prev, [moment.id]: likesData }));
        setComments(prev => ({ ...prev, [moment.id]: commentsData }));
      } catch (e) {
        console.error('Error loading interactions', e);
      }
    });
  }, [moments]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b141a] animate-in fade-in duration-300 overflow-hidden">
      <header className={`h-[60px] bg-[#202c33] flex items-center justify-between px-4 shrink-0 shadow-lg ${isMobile ? 'safe-top h-[100px] pt-8' : ''}`}>
        <h2 className="text-[#e9edef] text-2xl font-bold font-outfit">Status Updates</h2>
        <button
          onClick={() => setIsPosting(true)}
          className="bg-[#00a884] text-black px-4 py-2 rounded-full font-bold hover:scale-105 transition-all"
        >
          <Plus size={20} />
        </button>
      </header>

      <div className="flex-1 overflow-x-auto no-scrollbar p-4">
        {moments.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center opacity-30">
              <Clock size={64} className="mx-auto mb-4 text-[#8696a0]" />
              <p className="text-[#8696a0] font-medium">No status updates yet</p>
            </div>
          </div>
        ) : (
          <div className="flex gap-4 pb-4">
            {moments.map(moment => (
              <div key={moment.id} className="flex-shrink-0 w-64 bg-[#202c33] rounded-2xl overflow-hidden border border-white/5 shadow-xl">
                {moment.mediaUrl && (
                  <div className="aspect-square w-full overflow-hidden">
                    <img src={moment.mediaUrl} alt="Status" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <img src={moment.userAvatar} className="w-8 h-8 rounded-full border border-white/10 cursor-pointer" alt={moment.userName} onClick={() => onViewProfile(moment.userId)} />
                    <div className="flex-1">
                      <p className="text-[#e9edef] text-sm font-bold cursor-pointer" onClick={() => onViewProfile(moment.userId)}>{moment.userName}</p>
                      <p className="text-[#8696a0] text-xs">{formatTime(moment.timestamp)}</p>
                    </div>
                    {moment.userId === userProfile.id && (
                      <div className="flex gap-1">
                        <button onClick={() => setEditingMoment(moment)} className="p-1 text-[#8696a0] hover:text-white"><Edit3 size={14} /></button>
                        <button onClick={() => handleDelete(moment.id)} className="p-1 text-[#8696a0] hover:text-rose-500"><Trash2 size={14} /></button>
                      </div>
                    )}
                  </div>
                  <p className="text-[#d1d7db] text-sm leading-relaxed mb-3">{moment.content}</p>
                  <div className="flex items-center justify-between text-xs text-[#8696a0]">
                    <div className="flex items-center gap-4">
                      <button onClick={() => handleLike(moment.id)} className={`flex items-center gap-1 ${likes[moment.id]?.some(l => l.user_id === userProfile.id) ? 'text-red-500' : 'hover:text-red-500'}`}>
                        <Heart size={14} fill={likes[moment.id]?.some(l => l.user_id === userProfile.id) ? 'currentColor' : 'none'} />
                        {likes[moment.id]?.length || 0}
                      </button>
                      <button onClick={() => {}} className="flex items-center gap-1 hover:text-blue-500">
                        <MessageCircle size={14} />
                        {comments[moment.id]?.length || 0}
                      </button>
                      <button onClick={() => handleFollow(moment.userId)} className="flex items-center gap-1 hover:text-green-500">
                        <UserPlus size={14} />
                      </button>
                      <button onClick={() => navigator.share({ title: moment.content, url: window.location.href })} className="flex items-center gap-1 hover:text-purple-500">
                        <Share size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Posting Modal */}
      {isPosting && (
        <div className="fixed inset-0 z-[150] bg-black/95 flex flex-col p-6 animate-in slide-in-from-bottom duration-300 safe-top safe-bottom">
          <div className="flex justify-between items-center mb-10">
            <button onClick={() => setIsPosting(false)} className="text-[#8696a0] hover:text-white p-2">
              <ArrowLeft size={32} />
            </button>
            <h3 className="text-white text-xl font-bold font-outfit">New Status</h3>
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
                    <span className="text-base font-bold uppercase tracking-widest">Add Image</span>
                  </button>
                )}
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
              </div>

              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's your status?"
                className="w-full bg-transparent border-none focus:ring-0 text-[#e9edef] text-2xl placeholder-[#3b4a54] text-center h-24 resize-none font-medium"
              />

              <div className="flex justify-between items-center pt-6 border-t border-white/5">
                <div className="flex gap-6 text-[#8696a0]">
                  <ImageIcon size={28} className="cursor-pointer hover:text-white transition-colors" onClick={() => fileInputRef.current?.click()} />
                </div>
                <button
                  onClick={handlePost}
                  disabled={!content.trim() && !mediaUrl}
                  className="bg-[#00a884] text-black px-12 py-4 rounded-full font-bold shadow-2xl shadow-[#00a884]/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 text-lg"
                >
                  Post
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingMoment && (
        <div className="fixed inset-0 z-[150] bg-black/95 flex flex-col p-6 animate-in slide-in-from-bottom duration-300 safe-top safe-bottom">
          <div className="flex justify-between items-center mb-10">
            <button onClick={() => setEditingMoment(null)} className="text-[#8696a0] hover:text-white p-2">
              <ArrowLeft size={32} />
            </button>
            <h3 className="text-white text-xl font-bold font-outfit">Edit Status</h3>
            <div className="w-8"></div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full">
            <div className="w-full bg-[#202c33] rounded-[48px] p-8 shadow-2xl border border-white/10 space-y-8">
              <textarea
                value={editingMoment.content}
                onChange={(e) => setEditingMoment({ ...editingMoment, content: e.target.value })}
                className="w-full bg-transparent border-none focus:ring-0 text-[#e9edef] text-2xl placeholder-[#3b4a54] text-center h-24 resize-none font-medium"
              />

              <div className="flex justify-center pt-6 border-t border-white/5">
                <button
                  onClick={handleEdit}
                  className="bg-[#00a884] text-black px-12 py-4 rounded-full font-bold shadow-2xl shadow-[#00a884]/30 hover:scale-105 active:scale-95 transition-all text-lg"
                >
                  Update
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
