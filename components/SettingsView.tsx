
import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft, Palette, Bell, Smartphone,
  Trash2, Check, ChevronRight, Save,
  Camera, User, Phone, Info, ShieldCheck, BarChart3,
  Sun, Moon, Zap, UserCircle2, Building2, BellRing, Vibrate, Pipette, Download, Image as ImageIcon, Smile, LogOut
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
  onOpenAdmin: () => void;
  onLogout: () => void;
}

const THEMES = [
  { id: 'dark', label: 'Dark', color: '#0b141a' },
  { id: 'light', label: 'Light', color: '#f8fafc' },
  { id: 'zen-emerald', label: 'Emerald', color: '#064e3b' },
  { id: 'zen-ocean', label: 'Ocean', color: '#0c4a6e' },
];

const SettingsView: React.FC<SettingsViewProps> = ({
  profile, onUpdateSettings, onUpdateProfile, onClearData, onBack, onOpenAdmin, onLogout
}) => {
  const { settings } = profile;
  const isAdmin = profile.email === 'bitbyte790@gmail.com' || profile.role === 'admin';

  const [editedProfile, setEditedProfile] = useState<UserProfile>(profile);
  const [profileSaved, setProfileSaved] = useState(false);
  const [installable, setInstallable] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const wallpaperInputRef = useRef<HTMLInputElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isStandalone) { setInstallable(false); return; }
    if ((window as any).deferredPrompt) { setInstallable(true); }
    const handleInstallAvailable = () => setInstallable(true);
    window.addEventListener('pwa-install-available', handleInstallAvailable);
    return () => window.removeEventListener('pwa-install-available', handleInstallAvailable);
  }, []);

  const handleInstall = async () => {
    const deferredPrompt = (window as any).deferredPrompt;
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') { (window as any).deferredPrompt = null; setInstallable(false); }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setEditedProfile({ ...editedProfile, avatar: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const handleWallpaperChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => onUpdateSettings({ wallpaper: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    onUpdateProfile(editedProfile);
    // Update status on server
    try {
      await fetch('/api/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: editedProfile.id, status: editedProfile.status })
      });
    } catch (e) {
      console.error('Failed to update status', e);
    }
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateSettings({ customThemeColor: e.target.value, theme: 'custom' });
  };

  return (
    <div className="flex flex-col h-full bg-[#0b141a] animate-in slide-in-from-right duration-300 overflow-hidden">
      <header className="h-[50px] bg-[#202c33] flex items-center px-4 gap-4 shrink-0 shadow-sm z-10">
        <button onClick={onBack} className="text-[#d1d7db] hover:text-white transition-colors"><ArrowLeft size={20} /></button>
        <h2 className="text-[#e9edef] text-sm font-bold uppercase tracking-wider">Sanctuary Settings</h2>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar p-4 md:p-6 space-y-6">
        <div className="max-w-xl mx-auto space-y-6 pb-12">
          
          {/* Identity Section */}
          <section className="space-y-3">
            <h3 className="text-[10px] font-black text-[#00a884] uppercase tracking-widest px-1">Identity Manifest</h3>
            <div className="bg-[#111b21] rounded-2xl p-6 border border-white/5 space-y-6 shadow-sm">
              <div className="flex flex-col items-center gap-4">
                <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                  <img src={editedProfile.avatar} alt="" className="w-24 h-24 rounded-3xl object-cover border-2 border-[#202c33] shadow-lg" />
                  <div className="absolute inset-0 bg-black/40 rounded-3xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera className="text-white" size={20} /></div>
                  <input type="file" ref={avatarInputRef} onChange={handleAvatarChange} accept="image/*" className="hidden" />
                </div>
                
                <div className="w-full space-y-4">
                  <div className="space-y-1">
                    <label className="text-[#8696a0] text-[9px] font-bold uppercase tracking-widest flex items-center gap-2 ml-1"><User size={12} /> Display Name</label>
                    <input type="text" value={editedProfile.name} onChange={(e) => setEditedProfile({...editedProfile, name: e.target.value})} className="w-full bg-[#202c33] border border-white/5 rounded-xl px-4 py-2 text-[#d1d7db] text-sm outline-none focus:border-[#00a884]/30" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[#8696a0] text-[9px] font-bold uppercase tracking-widest flex items-center gap-2 ml-1"><Phone size={12} /> Contact Node</label>
                    <input type="text" value={editedProfile.phone} onChange={(e) => setEditedProfile({...editedProfile, phone: e.target.value})} className="w-full bg-[#202c33] border border-white/5 rounded-xl px-4 py-2 text-[#d1d7db] text-sm outline-none focus:border-[#00a884]/30" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[#8696a0] text-[9px] font-bold uppercase tracking-widest flex items-center gap-2 ml-1"><Info size={12} /> Manifest Bio</label>
                    <textarea value={editedProfile.bio} onChange={(e) => setEditedProfile({...editedProfile, bio: e.target.value})} className="w-full h-16 bg-[#202c33] border border-white/5 rounded-xl px-4 py-2 text-[#d1d7db] text-sm outline-none resize-none focus:border-[#00a884]/30" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[#8696a0] text-[9px] font-bold uppercase tracking-widest flex items-center gap-2 ml-1"><Smile size={12} /> Status Message</label>
                    <input type="text" value={editedProfile.status || ''} onChange={(e) => setEditedProfile({...editedProfile, status: e.target.value})} placeholder="Set your status..." className="w-full bg-[#202c33] border border-white/5 rounded-xl px-4 py-2 text-[#d1d7db] text-sm outline-none focus:border-[#00a884]/30" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setEditedProfile({...editedProfile, accountType: 'member'})} className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${editedProfile.accountType === 'member' ? 'bg-[#00a884]/10 border-[#00a884] text-[#00a884]' : 'bg-[#2a3942] border-white/5 text-[#8696a0]'}`}>
                      <UserCircle2 size={16} /><span className="text-[10px] font-bold uppercase">Personal</span>
                    </button>
                    <button onClick={() => setEditedProfile({...editedProfile, accountType: 'business'})} className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${editedProfile.accountType === 'business' ? 'bg-[#00a884]/10 border-[#00a884] text-[#00a884]' : 'bg-[#2a3942] border-white/5 text-[#8696a0]'}`}>
                      <Building2 size={16} /><span className="text-[10px] font-bold uppercase">Business</span>
                    </button>
                  </div>
                </div>
                <button onClick={handleSaveProfile} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all bg-[#00a884] text-black hover:bg-[#06cf9c]">
                  {profileSaved ? <Check size={16} strokeWidth={3} /> : <Save size={16} />}
                  {profileSaved ? 'Identity Saved' : 'Update Manifest'}
                </button>
              </div>
            </div>
          </section>

          {/* Behavior Section */}
          <section className="space-y-3">
            <h3 className="text-[10px] font-black text-[#00a884] uppercase tracking-widest px-1">Behavior & Pulse</h3>
            <div className="bg-[#111b21] rounded-2xl overflow-hidden border border-white/5 divide-y divide-white/5 shadow-sm">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 text-[#e9edef]"><BellRing size={18} className="text-[#8696a0]" />
                  <div className="flex flex-col"><span className="text-xs font-bold">Network Signals</span><span className="text-[9px] text-[#8696a0]">Sync notifications</span></div>
                </div>
                <button onClick={() => onUpdateSettings({ notifications: !settings.notifications })} className={`relative w-10 h-5 rounded-full transition-all flex items-center px-0.5 ${settings.notifications ? 'bg-[#00a884]' : 'bg-[#2a3942]'}`}><div className={`w-4 h-4 rounded-full bg-white transition-transform ${settings.notifications ? 'translate-x-5' : 'translate-x-0'}`}></div></button>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 text-[#e9edef]"><Vibrate size={18} className="text-[#8696a0]" />
                  <div className="flex flex-col"><span className="text-xs font-bold">Haptic Feedback</span><span className="text-[9px] text-[#8696a0]">Vibrate on interaction</span></div>
                </div>
                <button onClick={() => onUpdateSettings({ vibrations: !settings.vibrations })} className={`relative w-10 h-5 rounded-full transition-all flex items-center px-0.5 ${settings.vibrations ? 'bg-[#00a884]' : 'bg-[#2a3942]'}`}><div className={`w-4 h-4 rounded-full bg-white transition-transform ${settings.vibrations ? 'translate-x-5' : 'translate-x-0'}`}></div></button>
              </div>
            </div>
          </section>

          {/* Appearance Section */}
          <section className="space-y-3">
            <h3 className="text-[10px] font-black text-[#00a884] uppercase tracking-widest px-1">Visual Flow</h3>
            <div className="bg-[#111b21] rounded-2xl overflow-hidden border border-white/5 divide-y divide-white/5 shadow-sm">
              <div className="p-4">
                <div className="flex items-center gap-3 mb-3 text-[#e9edef]"><Palette size={18} className="text-[#8696a0]" /><span className="text-xs font-bold">Core Palette</span></div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4">
                  {THEMES.map(t => (
                    <button key={t.id} onClick={() => onUpdateSettings({ theme: t.id as any })} className={`flex-1 min-w-[70px] flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${settings.theme === t.id ? 'border-[#00a884] bg-[#00a884]/5' : 'border-transparent bg-[#2a3942]/30 hover:bg-white/5'}`}><div className="w-8 h-8 rounded-full border border-white/5 shadow-sm" style={{ backgroundColor: t.color }}></div><span className="text-[8px] font-bold text-[#d1d7db] uppercase">{t.label}</span></button>
                  ))}
                  <button onClick={() => onUpdateSettings({ theme: 'custom' })} className={`flex-1 min-w-[70px] flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${settings.theme === 'custom' ? 'border-[#00a884] bg-[#00a884]/5' : 'border-transparent bg-[#2a3942]/30 hover:bg-white/5'}`}><div className="w-8 h-8 rounded-full border border-white/5 shadow-sm flex items-center justify-center bg-gradient-to-tr from-rose-500 via-indigo-500 to-emerald-500" style={{ backgroundColor: settings.customThemeColor }}><Pipette size={10} className="text-white" /></div><span className="text-[8px] font-bold text-[#d1d7db] uppercase">Custom</span></button>
                </div>
                {settings.theme === 'custom' && (
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 animate-in fade-in duration-300">
                    <span className="text-[11px] font-bold text-[#d1d7db]">Accent Manifestation</span>
                    <input type="color" value={settings.customThemeColor || '#00a884'} onChange={handleCustomColorChange} className="w-8 h-8 rounded-lg overflow-hidden border border-white/10 shadow-lg cursor-pointer bg-transparent" />
                  </div>
                )}
              </div>

              {/* Restore Wallpaper Setting */}
              <div className="p-4">
                <div className="flex items-center gap-3 mb-2 text-[#e9edef]"><ImageIcon size={18} className="text-[#8696a0]" /><span className="text-xs font-bold">Sanctuary Backdrop</span></div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      placeholder="Backdrop URL (e.g. Unsplash link)"
                      value={settings.wallpaper || ''}
                      onChange={(e) => onUpdateSettings({ wallpaper: e.target.value })}
                      className="flex-1 bg-[#202c33] border border-white/5 rounded-xl px-4 py-2 text-[#d1d7db] text-xs outline-none focus:border-[#00a884]/30"
                    />
                    <button onClick={() => wallpaperInputRef.current?.click()} className="p-2 text-[#00a884] hover:bg-[#00a884]/10 rounded-xl transition-colors"><Camera size={16} /></button>
                    {settings.wallpaper && <button onClick={() => onUpdateSettings({ wallpaper: '' })} className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors"><Trash2 size={16} /></button>}
                  </div>
                  <input type="file" ref={wallpaperInputRef} onChange={handleWallpaperChange} accept="image/*" className="hidden" />
                </div>
              </div>

              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 text-[#e9edef]">
                  {settings.brightness === 'dim' ? <Moon size={18} className="text-[#8696a0]" /> : <Sun size={18} className="text-[#8696a0]" />}
                  <div className="flex flex-col"><span className="text-xs font-bold">Luminance</span><span className="text-[9px] text-[#8696a0]">Intensity filter</span></div>
                </div>
                <button onClick={() => onUpdateSettings({ brightness: settings.brightness === 'dim' ? 'bright' : 'dim' })} className={`relative w-10 h-5 rounded-full transition-all flex items-center px-0.5 ${settings.brightness === 'bright' ? 'bg-[#00a884]' : 'bg-[#2a3942]'}`}><div className={`w-4 h-4 rounded-full bg-white transition-transform ${settings.brightness === 'bright' ? 'translate-x-5' : 'translate-x-0'}`}></div></button>
              </div>
            </div>
          </section>

          {installable && (
            <button onClick={handleInstall} className="w-full bg-[#00a884]/10 border border-[#00a884]/20 rounded-2xl p-4 flex items-center justify-between hover:bg-[#00a884]/20 transition-all group">
              <div className="flex items-center gap-4"><div className="p-2 bg-[#00a884] text-black rounded-xl"><Download size={20} /></div>
                <div className="text-left"><p className="text-white font-bold text-sm">Zenj Native</p><p className="text-[10px] text-[#8696a0]">Install for deep immersion</p></div>
              </div>
              <ChevronRight size={18} className="text-[#00a884] group-hover:translate-x-1 transition-transform" />
            </button>
          )}

          {isAdmin && (
            <button onClick={onOpenAdmin} className="w-full bg-[#00a884]/10 border border-[#00a884]/20 rounded-2xl p-4 flex items-center justify-between hover:bg-[#00a884]/20 transition-all group">
              <div className="flex items-center gap-4"><div className="p-2 bg-[#00a884] text-black rounded-xl"><BarChart3 size={20} /></div>
                <div className="text-left"><p className="text-white font-bold text-sm">Zen Command</p><p className="text-[10px] text-[#8696a0]">Command dashboard</p></div>
              </div>
              <ChevronRight size={18} className="text-[#00a884] group-hover:translate-x-1 transition-transform" />
            </button>
          )}

          <div className="pt-4 border-t border-white/5 space-y-3">
            <button onClick={onLogout} className="w-full py-3 bg-amber-500/5 text-amber-500 text-xs font-bold rounded-xl hover:bg-amber-500/10 transition-all flex items-center justify-center gap-2"><LogOut size={16} /> Logout</button>
            <button onClick={onClearData} className="w-full py-3 bg-rose-500/5 text-rose-500 text-xs font-bold rounded-xl hover:bg-rose-500/10 transition-all flex items-center justify-center gap-2"><Trash2 size={16} /> Purge Manifest</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
