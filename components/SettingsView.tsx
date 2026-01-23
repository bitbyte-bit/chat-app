
import React, { useState, useRef } from 'react';
import { 
  ArrowLeft, Palette, Bell, Smartphone, 
  Wallpaper, Trash2, ShieldAlert, Check, 
  ChevronRight, Circle, Lock, Eye, EyeOff, Save, AlertCircle, Share2,
  Camera, User, Phone, Info, Mail
} from 'lucide-react';
import { UserProfile, AppSettings, Contact } from '../types';

interface SettingsViewProps {
  profile: UserProfile;
  contacts: Contact[];
  onUpdateSettings: (settings: Partial<AppSettings>) => void;
  onUpdateProfile: (profile: UserProfile) => void;
  onUpdatePassword: (newPass: string) => void;
  onUnblockContact: (id: string) => void;
  onClearData: () => void;
  onBack: () => void;
}

const THEMES = [
  { id: 'dark', label: 'Zen Dark', color: '#0b141a' },
  { id: 'zen-emerald', label: 'Zen Emerald', color: '#064e3b' },
  { id: 'zen-ocean', label: 'Zen Ocean', color: '#0c4a6e' },
];

const WALLPAPERS = [
  'https://images.unsplash.com/photo-1518173946687-a4c8a9b746f5?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=400&q=80',
  '' // None
];

const SettingsView: React.FC<SettingsViewProps> = ({ 
  profile, 
  contacts, 
  onUpdateSettings, 
  onUpdateProfile,
  onUpdatePassword,
  onUnblockContact, 
  onClearData, 
  onBack 
}) => {
  const blockedContacts = contacts.filter(c => c.isBlocked);
  const { settings } = profile;

  // Profile editing state
  const [editedProfile, setEditedProfile] = useState<UserProfile>(profile);
  const [profileSaved, setProfileSaved] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passData, setPassData] = useState({ old: '', new: '', confirm: '' });
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState(false);
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditedProfile({ ...editedProfile, avatar: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = () => {
    onUpdateProfile(editedProfile);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const handlePasswordChange = () => {
    setPassError('');
    if (passData.old !== profile.password) {
      setPassError('Current password is incorrect');
      return;
    }
    if (passData.new.length < 6) {
      setPassError('New password must be at least 6 characters');
      return;
    }
    if (passData.new !== passData.confirm) {
      setPassError('New passwords do not match');
      return;
    }

    onUpdatePassword(passData.new);
    setPassSuccess(true);
    setPassData({ old: '', new: '', confirm: '' });
    setTimeout(() => {
      setPassSuccess(false);
      setShowPasswordForm(false);
    }, 2000);
  };

  const handleShareProfile = async () => {
    const shareText = "hey, i am on zenj. sign in to find new connections";
    const appLink = window.location.origin;

    // Dynamically update OG image for this session
    const ogImage = document.getElementById('og-image');
    if (ogImage) ogImage.setAttribute('content', profile.avatar);
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Zenj: Connect with ${profile.name}`,
          text: shareText,
          url: appLink
        });
      } catch (err) {
        console.error('Sharing failed', err);
      }
    } else {
      navigator.clipboard.writeText(`${shareText} ${appLink}`);
      alert('Invitation link copied to clipboard!');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0b141a] animate-in slide-in-from-right duration-300">
      <header className="h-[60px] bg-[#202c33] flex items-center px-4 gap-4 shrink-0 shadow-lg z-10">
        <button onClick={onBack} className="text-[#d1d7db] hover:text-white">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-[#e9edef] text-lg font-medium">Settings</h2>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar p-4 md:p-8 space-y-8">
        <div className="max-w-xl mx-auto space-y-10 pb-20">
          
          {/* Profile Section */}
          <section className="space-y-6">
            <h3 className="text-xs font-bold text-[#00a884] uppercase tracking-widest px-2">Account Profile</h3>
            <div className="bg-[#111b21] rounded-[48px] p-8 border border-white/5 shadow-2xl space-y-8">
              <div className="flex flex-col items-center gap-6">
                <div 
                  className="relative group cursor-pointer active:scale-95 transition-transform" 
                  onClick={() => avatarInputRef.current?.click()}
                >
                  <div className="absolute -inset-2 bg-[#00a884]/5 rounded-[40px] blur-xl"></div>
                  <img 
                    src={editedProfile.avatar} 
                    alt="User Avatar" 
                    className="w-32 h-32 rounded-[40px] object-cover border-4 border-[#202c33] shadow-2xl relative z-10"
                  />
                  <div className="absolute inset-0 bg-black/40 rounded-[40px] flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <Camera className="text-white" size={24} />
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-[#00a884] text-black p-2 rounded-xl shadow-xl z-30 border-2 border-[#202c33]">
                     <Camera size={14} />
                  </div>
                  <input 
                    type="file" 
                    ref={avatarInputRef} 
                    onChange={handleAvatarChange} 
                    accept="image/*" 
                    className="hidden" 
                  />
                </div>

                <div className="w-full space-y-6">
                  <div className="space-y-2">
                    <label className="text-[#8696a0] text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 ml-1">
                      <User size={12} /> Display Name
                    </label>
                    <input 
                      type="text"
                      value={editedProfile.name}
                      onChange={(e) => {
                        setEditedProfile({...editedProfile, name: e.target.value});
                        if (profileSaved) setProfileSaved(false);
                      }}
                      className="w-full bg-[#202c33] border border-white/5 rounded-2xl px-5 py-3 text-[#d1d7db] font-medium focus:border-[#00a884]/50 outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[#8696a0] text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 ml-1">
                      <Mail size={12} /> Email Address (Read-only)
                    </label>
                    <div className="w-full bg-[#202c33]/50 border border-white/5 rounded-2xl px-5 py-3 text-[#53616b] font-medium flex items-center gap-2">
                       <span className="truncate">{profile.email}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[#8696a0] text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 ml-1">
                      <Info size={12} /> Presence Bio
                    </label>
                    <textarea 
                      value={editedProfile.bio}
                      onChange={(e) => {
                        setEditedProfile({...editedProfile, bio: e.target.value});
                        if (profileSaved) setProfileSaved(false);
                      }}
                      className="w-full bg-[#202c33] border border-white/5 rounded-2xl px-5 py-3 text-[#d1d7db] font-medium focus:border-[#00a884]/50 outline-none transition-all resize-none"
                      rows={2}
                    />
                  </div>
                </div>

                <button 
                  onClick={handleSaveProfile}
                  className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold transition-all shadow-xl ${
                    profileSaved ? 'bg-[#00a884] text-black' : 'bg-[#00a884] text-black hover:bg-[#06cf9c] shadow-[#00a884]/10'
                  }`}
                >
                  {profileSaved ? <Check size={20} strokeWidth={3} /> : <Save size={20} />}
                  {profileSaved ? 'Changes Manifested' : 'Update Identity'}
                </button>
              </div>
            </div>
          </section>
          
          {/* Share Section */}
          <section className="space-y-4">
             <h3 className="text-xs font-bold text-[#00a884] uppercase tracking-widest px-2">Growth</h3>
             <button 
                onClick={handleShareProfile}
                className="w-full bg-[#111b21] p-5 rounded-[32px] flex items-center justify-between border border-white/5 hover:bg-white/5 transition-colors group"
             >
                <div className="flex items-center gap-3 text-[#e9edef]">
                  <div className="p-2 bg-[#00a884]/10 rounded-xl text-[#00a884]">
                    <Share2 size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Share Profile</p>
                    <p className="text-[10px] text-[#8696a0]">Invite others to join Zenj</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-[#8696a0] group-hover:text-white transition-colors" />
             </button>
          </section>

          {/* Security & Password */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold text-[#00a884] uppercase tracking-widest px-2">Security</h3>
            <div className="bg-[#111b21] rounded-[32px] overflow-hidden border border-white/5">
              {!showPasswordForm ? (
                <button 
                  onClick={() => setShowPasswordForm(true)}
                  className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3 text-[#e9edef]">
                    <Lock size={20} className="text-[#00a884]" />
                    <span className="font-medium">Change Password</span>
                  </div>
                  <ChevronRight size={20} className="text-[#8696a0]" />
                </button>
              ) : (
                <div className="p-6 space-y-5 animate-in slide-in-from-top duration-300">
                  <div className="flex items-center justify-between mb-2">
                     <h4 className="text-sm font-bold text-[#00a884]">Update Presence Key</h4>
                     <button onClick={() => setShowPasswordForm(false)} className="text-[#8696a0] text-xs">Cancel</button>
                  </div>

                  <div className="space-y-4">
                    <div className="relative">
                      <input 
                        type={showOld ? "text" : "password"}
                        placeholder="Current Password"
                        value={passData.old}
                        onChange={(e) => setPassData({...passData, old: e.target.value})}
                        className="w-full bg-[#202c33] border border-white/5 rounded-xl py-3.5 px-4 text-sm text-white outline-none focus:border-[#00a884]/40"
                      />
                      <button onClick={() => setShowOld(!showOld)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#3b4a54]">{showOld ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
                    </div>
                    <div className="relative">
                      <input 
                        type={showNew ? "text" : "password"}
                        placeholder="New Password"
                        value={passData.new}
                        onChange={(e) => setPassData({...passData, new: e.target.value})}
                        className="w-full bg-[#202c33] border border-white/5 rounded-xl py-3.5 px-4 text-sm text-white outline-none focus:border-[#00a884]/40"
                      />
                      <button onClick={() => setShowNew(!showNew)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#3b4a54]">{showNew ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
                    </div>
                    <input 
                      type="password"
                      placeholder="Confirm New Password"
                      value={passData.confirm}
                      onChange={(e) => setPassData({...passData, confirm: e.target.value})}
                      className="w-full bg-[#202c33] border border-white/5 rounded-xl py-3.5 px-4 text-sm text-white outline-none focus:border-[#00a884]/40"
                    />
                  </div>

                  {passError && <p className="text-rose-500 text-xs flex items-center gap-1"><AlertCircle size={12}/> {passError}</p>}
                  {passSuccess && <p className="text-[#00a884] text-xs flex items-center gap-1"><Check size={12}/> Password updated successfully</p>}

                  <button 
                    onClick={handlePasswordChange}
                    className="w-full bg-[#00a884] text-black font-bold py-3.5 rounded-xl hover:bg-[#06cf9c] transition-all flex items-center justify-center gap-2"
                  >
                    <Save size={18} /> Save New Key
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Personalization */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold text-[#00a884] uppercase tracking-widest px-2">Personalization</h3>
            <div className="bg-[#111b21] rounded-[32px] overflow-hidden border border-white/5 divide-y divide-white/5">
              
              {/* Theme Selection */}
              <div className="p-5">
                <div className="flex items-center gap-3 mb-4 text-[#e9edef]">
                  <Palette size={20} className="text-[#00a884]" />
                  <span className="font-medium">App Theme</span>
                </div>
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                  {THEMES.map(t => (
                    <button 
                      key={t.id}
                      onClick={() => onUpdateSettings({ theme: t.id as any })}
                      className={`flex flex-col items-center gap-2 p-2 rounded-2xl transition-all border-2 ${
                        settings.theme === t.id ? 'border-[#00a884] bg-[#00a884]/5' : 'border-transparent hover:bg-white/5'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full border border-white/10" style={{ backgroundColor: t.color }}></div>
                      <span className="text-[10px] text-[#d1d7db] whitespace-nowrap">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Wallpaper Selection */}
              <div className="p-5">
                <div className="flex items-center gap-3 mb-4 text-[#e9edef]">
                  <Wallpaper size={20} className="text-[#00a884]" />
                  <span className="font-medium">Chat Wallpaper</span>
                </div>
                <div className="flex gap-3 overflow-x-auto no-scrollbar">
                  {WALLPAPERS.map((wp, idx) => (
                    <button 
                      key={idx}
                      onClick={() => onUpdateSettings({ wallpaper: wp })}
                      className={`relative min-w-[70px] h-14 rounded-xl overflow-hidden border-2 transition-all ${
                        settings.wallpaper === wp ? 'border-[#00a884]' : 'border-transparent'
                      }`}
                    >
                      {wp ? (
                        <img src={wp} className="w-full h-full object-cover" alt="Wallpaper option" />
                      ) : (
                        <div className="w-full h-full bg-[#0b141a] flex items-center justify-center text-[10px] text-[#8696a0]">None</div>
                      )}
                      {settings.wallpaper === wp && (
                        <div className="absolute inset-0 bg-[#00a884]/40 flex items-center justify-center">
                          <Check size={16} className="text-black" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Behavior */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold text-[#00a884] uppercase tracking-widest px-2">Behavior</h3>
            <div className="bg-[#111b21] rounded-[32px] overflow-hidden border border-white/5 divide-y divide-white/5">
              <div className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-3 text-[#e9edef]">
                  <Bell size={20} className="text-[#00a884]" />
                  <span className="font-medium">In-app Notifications</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={settings.notifications} 
                  onChange={(e) => onUpdateSettings({ notifications: e.target.checked })}
                  className="w-5 h-5 accent-[#00a884]" 
                />
              </div>
              <div className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-3 text-[#e9edef]">
                  <Smartphone size={20} className="text-[#00a884]" />
                  <span className="font-medium">Haptic Vibrations</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={settings.vibrations} 
                  onChange={(e) => onUpdateSettings({ vibrations: e.target.checked })}
                  className="w-5 h-5 accent-[#00a884]" 
                />
              </div>
            </div>
          </section>

          {/* Blocked Contacts */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold text-rose-500 uppercase tracking-widest px-2">Privacy & Blocking</h3>
            <div className="bg-[#111b21] rounded-[32px] overflow-hidden border border-white/5">
              {blockedContacts.length === 0 ? (
                <div className="p-8 text-center text-[#8696a0] text-sm">
                  <ShieldAlert size={32} className="mx-auto mb-2 opacity-20" />
                  No blocked contacts.
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {blockedContacts.map(contact => (
                    <div key={contact.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src={contact.avatar} className="w-10 h-10 rounded-full" alt={contact.name} />
                        <div>
                          <p className="text-[#e9edef] font-medium">{contact.name}</p>
                          <p className="text-xs text-[#8696a0]">{contact.phone}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => onUnblockContact(contact.id)}
                        className="px-4 py-1.5 text-xs bg-rose-500/10 text-rose-500 rounded-full hover:bg-rose-500/20 transition-all font-bold"
                      >
                        Unblock
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Data Management */}
          <section className="space-y-4">
            <div className="bg-rose-500/5 rounded-[32px] p-6 border border-rose-500/10 text-center">
              <h4 className="text-rose-500 font-bold mb-2">Danger Zone</h4>
              <p className="text-xs text-[#8696a0] mb-6">Resetting your data will erase all messages, contacts, and personalizations locally. This cannot be undone.</p>
              <button 
                onClick={onClearData}
                className="flex items-center justify-center gap-2 w-full py-4 bg-rose-500 text-white font-bold rounded-2xl hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20"
              >
                <Trash2 size={20} />
                Erase Everything
              </button>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};

export default SettingsView;
