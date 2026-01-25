
import React, { useRef, useState } from 'react';
import { Camera, Share2, Save, ArrowLeft, User, Phone, Info, Check } from 'lucide-react';
import { UserProfile } from '../types';
import { useNotification } from './NotificationProvider';

interface ProfileViewProps {
  profile: UserProfile;
  onUpdate: (profile: UserProfile) => void;
  onBack: () => void;
  isReadOnly?: boolean;
}

const ProfileView: React.FC<ProfileViewProps> = ({ profile, onUpdate, onBack, isReadOnly = false }) => {
  const [edited, setEdited] = useState(profile);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const isMobile = window.innerWidth < 768;
  const { showNotification } = useNotification();

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEdited({ ...edited, avatar: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    onUpdate(edited);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: `Zenj Profile: ${profile.name}`,
        text: profile.bio,
        url: window.location.href
      });
    } catch (e) {
      navigator.clipboard.writeText(window.location.href);
      showNotification("Link copied to clipboard!", [], 'success');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0b141a] animate-in slide-in-from-right duration-300 overflow-hidden">
      <header className={`h-[60px] md:h-[110px] bg-[#202c33] flex items-end px-4 pb-4 md:pb-6 gap-6 shrink-0 ${isMobile ? 'safe-top h-[120px] pt-10 pb-6' : ''}`}>
        <button onClick={onBack} className="p-2 text-[#d1d7db] hover:bg-white/5 rounded-full transition-colors">
          <ArrowLeft size={28} />
        </button>
        <h2 className="text-[#e9edef] text-2xl font-bold font-outfit">{isReadOnly ? 'User Profile' : 'Profile'}</h2>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar py-8">
        <div className="max-w-md mx-auto px-6 space-y-12">
          {/* Avatar Section */}
          <div className="flex flex-col items-center">
            <div className={`relative ${isReadOnly ? '' : 'group cursor-pointer active:scale-95 transition-transform'}`} onClick={isReadOnly ? undefined : () => fileInputRef.current?.click()}>
              <div className="absolute -inset-4 bg-[#00a884]/10 rounded-full blur-2xl"></div>
              <img
                src={edited.avatar}
                alt="User Avatar"
                className="w-52 h-52 rounded-[64px] object-cover border-4 border-[#202c33] shadow-2xl relative z-10"
              />
              {!isReadOnly && (
                <>
                  <div className="absolute inset-0 bg-black/40 rounded-[64px] flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <Camera className="text-white mb-2" size={40} />
                    <span className="text-white text-xs font-bold uppercase tracking-widest">Update</span>
                  </div>
                  <div className="absolute -bottom-2 -right-2 bg-[#00a884] text-black p-3 rounded-2xl shadow-xl z-30 border-4 border-[#202c33]">
                     <Camera size={20} />
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarChange}
                    accept="image/*"
                    className="hidden"
                  />
                </>
              )}
            </div>
          </div>

          {/* Fields */}
          <div className="space-y-10 bg-[#111b21] p-8 rounded-[48px] border border-white/5 shadow-2xl">
            <div className="space-y-3">
              <label className="text-[#00a884] text-xs font-bold uppercase tracking-widest flex items-center gap-2 ml-1">
                <User size={14} /> Full Name
              </label>
              <input
                type="text"
                value={edited.name}
                onChange={(e) => setEdited({...edited, name: e.target.value})}
                disabled={isReadOnly}
                className="w-full bg-[#202c33] border border-white/5 rounded-2xl px-5 py-4 text-[#d1d7db] font-medium focus:border-[#00a884]/50 outline-none transition-all shadow-inner disabled:opacity-50"
              />
              <p className="text-[#8696a0] text-[11px] font-medium leading-relaxed px-1">This is your public Zenj presence. It will be visible to everyone you message.</p>
            </div>

            <div className="space-y-3">
              <label className="text-[#00a884] text-xs font-bold uppercase tracking-widest flex items-center gap-2 ml-1">
                <Phone size={14} /> Contact Phone
              </label>
              <input
                type="text"
                value={edited.phone}
                onChange={(e) => setEdited({...edited, phone: e.target.value})}
                placeholder="+1 234 567 890"
                disabled={isReadOnly}
                className="w-full bg-[#202c33] border border-white/5 rounded-2xl px-5 py-4 text-[#d1d7db] font-medium focus:border-[#00a884]/50 outline-none transition-all shadow-inner disabled:opacity-50"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[#00a884] text-xs font-bold uppercase tracking-widest flex items-center gap-2 ml-1">
                <Info size={14} /> Presence Bio
              </label>
              <textarea
                value={edited.bio}
                onChange={(e) => setEdited({...edited, bio: e.target.value})}
                disabled={isReadOnly}
                className="w-full bg-[#202c33] border border-white/5 rounded-2xl px-5 py-4 text-[#d1d7db] font-medium focus:border-[#00a884]/50 outline-none transition-all resize-none shadow-inner disabled:opacity-50"
                rows={3}
              />
            </div>
          </div>

          {!isReadOnly && (
            <div className="flex gap-4 pt-4 pb-20">
              <button
                onClick={handleSave}
                className={`flex-[3] flex items-center justify-center gap-3 py-5 rounded-3xl font-bold text-lg transition-all shadow-2xl ${
                  saved ? 'bg-[#00a884] text-black' : 'bg-[#00a884] text-black hover:bg-[#06cf9c] shadow-[#00a884]/20'
                }`}
              >
                {saved ? <Check size={24} strokeWidth={3} /> : <Save size={24} />}
                {saved ? 'Zen Saved' : 'Update Profile'}
              </button>
              <button
                onClick={handleShare}
                className="flex-1 flex items-center justify-center bg-[#202c33] text-[#d1d7db] rounded-3xl hover:bg-[#2a3942] transition-colors border border-white/5"
              >
                <Share2 size={24} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
