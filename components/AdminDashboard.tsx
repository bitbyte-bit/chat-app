
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BarChart3, Users, MessageSquare, ShieldAlert, 
  Search, UserMinus, Send, 
  ShieldCheck, ArrowLeft, RefreshCw, Eye,
  Lock, X, Package, Plus, Trash2, Camera, FileUp, Cpu, Terminal,
  Ban, ShieldQuestion, AlertTriangle, CheckCircle, Loader2, AlertCircle, HardDriveDownload
} from 'lucide-react';
import { Contact, AccountStatus, Message, ZenjTool } from '../types';
import { dbQuery, dbRun, saveDatabase } from '../services/database';

interface AdminDashboardProps {
  onBack: () => void;
  onBroadcast: (message: string) => void;
  tools: ZenjTool[];
  loadTools: () => Promise<ZenjTool[]>;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack, onBroadcast, loadTools }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'tools' | 'broadcast' | 'register'>('users');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [users, setUsers] = useState<Contact[]>([]);
  const [tools, setTools] = useState<ZenjTool[]>([]);
  const [installs, setInstalls] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingTool, setIsAddingTool] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [conflictModal, setConflictModal] = useState<{ isOpen: boolean; tool: any } | null>(null);

  const [newTool, setNewTool] = useState({
    name: '',
    description: '',
    version: '1.0.0',
    icon: '',
    file: '',
    fileName: ''
  });

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    bio: '',
    avatar: '',
    avatarFile: null as File | null
  });

  const iconInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    const [dirUsers, toolList, metrics] = await Promise.all([
      dbQuery("SELECT * FROM directory_users"),
      loadTools(),
      dbQuery("SELECT val FROM system_metrics WHERE id = 'installs'")
    ]);

    setUsers((dirUsers as any[]).map(u => ({
      ...u,
      status: u.status || 'offline',
      accountStatus: u.accountStatus || 'active'
    })));
    setTools(toolList as ZenjTool[]);
    if (metrics && metrics.length > 0) setInstalls(metrics[0].val);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const stats = useMemo(() => {
    const total = users.length;
    const online = users.filter(u => u.status === 'online').length;
    return { total, online, installs, toolCount: tools.length };
  }, [users, installs, tools]);

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (u.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUpdateStatus = async (userId: string, status: AccountStatus) => {
    if (!confirm(`Are you sure you want to set status to ${status}?`)) return;
    const badge = status === 'warned' ? '⚠️' : status === 'suspended' ? '🚫' : status === 'banned' ? '⛔' : '';
    await dbRun("UPDATE directory_users SET accountStatus = ?, statusBadge = ? WHERE id = ?", [status, badge, userId]);
    loadData();
    onBroadcast(`User ${userId} has been ${status}.`);
  };

  const checkConflict = () => {
    const existing = tools.find(t => t.name.toLowerCase() === newTool.name.toLowerCase());
    if (existing) {
      setConflictModal({ isOpen: true, tool: existing });
      return true;
    }
    return false;
  };

  const initiateUpload = async () => {
    if (!newTool.name || !newTool.file || !newTool.icon) return;
    if (checkConflict()) return;
    performUpload();
  };

  const performUpload = async () => {
    setUploadProgress(0);
    setConflictModal(null);
    
    // Simulate File Upload Progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          finalizeUpload();
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 150);
  };

  const finalizeUpload = async () => {
    setIsFinalizing(true);
    const id = `tool-${Date.now()}`;
    await dbRun("INSERT INTO tools (id, name, description, version, iconUrl, fileUrl, fileName, timestamp, downloads) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [
      id, newTool.name, newTool.description, newTool.version, 
      newTool.icon, newTool.file, newTool.fileName, Date.now(), 0
    ]);
    setTimeout(() => {
      setIsAddingTool(false);
      setIsFinalizing(false);
      setUploadProgress(0);
      setNewTool({ name: '', description: '', version: '1.0.0', icon: '', file: '', fileName: '' });
      loadData();
    }, 1000);
  };

  const handleIconSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setNewTool(prev => ({ ...prev, icon: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setNewTool(prev => ({
        ...prev,
        file: reader.result as string,
        fileName: file.name
      }));
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewUser(prev => ({ ...prev, avatarFile: file }));
      const reader = new FileReader();
      reader.onloadend = () => setNewUser(prev => ({
        ...prev,
        avatar: reader.result as string
      }));
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0b141a] animate-in slide-in-from-right duration-300 overflow-hidden">
      <header className="h-[70px] bg-[#202c33] flex items-center px-6 gap-4 shrink-0 shadow-lg border-b border-[#00a884]/20">
        <button onClick={onBack} className="text-[#d1d7db] hover:text-white p-2 rounded-full hover:bg-white/5"><ArrowLeft size={24} /></button>
        <div className="flex-1">
          <h2 className="text-white text-xl font-bold font-outfit flex items-center gap-2">
            <ShieldCheck size={24} className="text-[#00a884]" /> Central Command
          </h2>
          <p className="text-[#8696a0] text-[10px] uppercase font-bold tracking-widest">Real-time Performance & Manifestation</p>
        </div>
        <div className="flex bg-[#111b21] rounded-xl p-1 border border-white/5">
           <button onClick={() => setActiveTab('users')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'users' ? 'bg-[#00a884] text-black shadow-lg' : 'text-[#8696a0]'}`}>Users</button>
           <button onClick={() => setActiveTab('register')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'register' ? 'bg-[#00a884] text-black shadow-lg' : 'text-[#8696a0]'}`}>Register</button>
           <button onClick={() => setActiveTab('broadcast')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'broadcast' ? 'bg-[#00a884] text-black shadow-lg' : 'text-[#8696a0]'}`}>Broadcast</button>
           <button onClick={() => setActiveTab('tools')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'tools' ? 'bg-[#00a884] text-black shadow-lg' : 'text-[#8696a0]'}`}>Lab</button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
        {activeTab === 'users' ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#111b21] p-4 rounded-[24px] border border-white/5 shadow-xl">
                <div className="text-[#8696a0] text-[10px] font-bold uppercase mb-1">Online Presence</div>
                <div className="text-3xl font-bold text-[#00a884] font-outfit">{stats.online}</div>
              </div>
              <div className="bg-[#111b21] p-4 rounded-[24px] border border-white/5 shadow-xl">
                <div className="text-[#8696a0] text-[10px] font-bold uppercase mb-1">Total Souls</div>
                <div className="text-3xl font-bold text-white font-outfit">{stats.total}</div>
              </div>
              <div className="bg-[#111b21] p-4 rounded-[24px] border border-white/5 shadow-xl">
                <div className="text-[#8696a0] text-[10px] font-bold uppercase mb-1">Tools Active</div>
                <div className="text-3xl font-bold text-amber-500 font-outfit">{stats.toolCount}</div>
              </div>
              <div className="bg-[#111b21] p-4 rounded-[24px] border border-white/5 shadow-xl">
                <div className="text-[#8696a0] text-[10px] font-bold uppercase mb-1">Installs</div>
                <div className="text-3xl font-bold text-rose-500 font-outfit">{stats.installs}</div>
              </div>
            </div>

            <div className="bg-[#111b21] rounded-[32px] border border-white/5 overflow-hidden flex flex-col h-[600px] shadow-2xl">
                <div className="p-6 border-b border-white/5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 bg-[#0b141a] px-4 py-2 rounded-2xl flex-1 max-w-md border border-white/5">
                    <Search className="text-[#3b4a54]" size={20} />
                    <input 
                      type="text" 
                      placeholder="Audit user by name or email..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-transparent flex-1 border-none focus:ring-0 text-white text-sm"
                    />
                  </div>
                  <button onClick={loadData} className="p-3 bg-[#00a884]/10 text-[#00a884] rounded-2xl hover:bg-[#00a884]/20 transition-all border border-[#00a884]/10"><RefreshCw size={20} /></button>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-white/5">
                  {filteredUsers.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-30">
                      <ShieldQuestion size={64} className="mb-4" />
                      <p className="font-outfit uppercase tracking-widest text-xs">No users found for audit</p>
                    </div>
                  ) : (
                    filteredUsers.map(u => (
                      <div key={u.id} className="flex items-center gap-4 p-5 hover:bg-white/5 transition-colors group">
                        <img src={u.avatar} className="w-12 h-12 rounded-2xl object-cover shadow-lg border border-white/5" alt="" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white block truncate">{u.name}</span>
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${
                              u.accountStatus === 'active' ? 'bg-emerald-500/10 text-emerald-500' :
                              u.accountStatus === 'warned' ? 'bg-amber-500/10 text-amber-500' :
                              'bg-rose-500/10 text-rose-500'
                            }`}>
                              {u.accountStatus}
                            </span>
                          </div>
                          <span className="text-[10px] text-[#8696a0] block truncate">{u.email || u.id}</span>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button onClick={() => handleUpdateStatus(u.id, 'active')} className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-black transition-all"><CheckCircle size={18} /></button>
                           <button onClick={() => handleUpdateStatus(u.id, 'warned')} className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl hover:bg-amber-500 hover:text-black transition-all"><AlertTriangle size={18} /></button>
                           <button onClick={() => handleUpdateStatus(u.id, 'suspended')} className="p-2.5 bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-black transition-all"><UserMinus size={18} /></button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
          </>
        ) : activeTab === 'register' ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
              <h3 className="text-[#00a884] font-bold font-outfit text-2xl flex items-center gap-3">
                <UserMinus size={32} /> User Registration
              </h3>
            </div>

            <div className="bg-[#111b21] rounded-[32px] p-8 border border-white/5 shadow-2xl max-w-2xl mx-auto">
              <h4 className="text-white font-bold text-xl font-outfit mb-6">Create New User Account</h4>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[#8696a0] text-xs font-bold uppercase tracking-widest mb-2">Full Name</label>
                    <input
                      type="text"
                      value={newUser.name}
                      onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-[#202c33] border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-[#8696a0] focus:border-[#00a884] focus:ring-1 focus:ring-[#00a884] transition-all"
                      placeholder="Enter full name"
                    />
                  </div>
                  <div>
                    <label className="block text-[#8696a0] text-xs font-bold uppercase tracking-widest mb-2">Email Address</label>
                    <input
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full bg-[#202c33] border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-[#8696a0] focus:border-[#00a884] focus:ring-1 focus:ring-[#00a884] transition-all"
                      placeholder="user@example.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[#8696a0] text-xs font-bold uppercase tracking-widest mb-2">Phone Number</label>
                    <input
                      type="tel"
                      value={newUser.phone}
                      onChange={(e) => setNewUser(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full bg-[#202c33] border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-[#8696a0] focus:border-[#00a884] focus:ring-1 focus:ring-[#00a884] transition-all"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  <div>
                    <label className="block text-[#8696a0] text-xs font-bold uppercase tracking-widest mb-2">Password</label>
                    <input
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full bg-[#202c33] border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-[#8696a0] focus:border-[#00a884] focus:ring-1 focus:ring-[#00a884] transition-all"
                      placeholder="Secure password"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#8696a0] text-xs font-bold uppercase tracking-widest mb-2">Bio (Optional)</label>
                  <textarea
                    value={newUser.bio}
                    onChange={(e) => setNewUser(prev => ({ ...prev, bio: e.target.value }))}
                    className="w-full bg-[#202c33] border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-[#8696a0] focus:border-[#00a884] focus:ring-1 focus:ring-[#00a884] transition-all resize-none"
                    rows={3}
                    placeholder="Tell us about yourself..."
                  />
                </div>

                <div>
                  <label className="block text-[#8696a0] text-xs font-bold uppercase tracking-widest mb-2">Profile Picture</label>
                  <div className="flex items-center gap-4">
                    <div
                      onClick={() => avatarInputRef.current?.click()}
                      className="w-16 h-16 bg-[#202c33] border border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer group shrink-0 relative overflow-hidden hover:border-[#00a884] transition-all"
                    >
                      {newUser.avatar ? (
                        <img src={newUser.avatar} alt="Avatar preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center">
                          <Camera size={20} className="mx-auto text-[#8696a0] group-hover:text-[#00a884] transition-colors" />
                          <span className="text-[8px] text-[#8696a0] group-hover:text-[#00a884] transition-colors mt-1 block">Upload</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarSelect}
                        className="hidden"
                      />
                      <div className="text-xs text-[#8696a0] mb-2">
                        {newUser.avatarFile ? `Selected: ${newUser.avatarFile.name}` : 'Click to upload profile picture or use generated avatar'}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setNewUser(prev => ({ ...prev, avatar: '', avatarFile: null }));
                          if (avatarInputRef.current) avatarInputRef.current.value = '';
                        }}
                        className="text-[10px] text-[#8696a0] hover:text-rose-500 underline"
                      >
                        Clear & use generated avatar
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={async () => {
                      if (!newUser.name || !newUser.email || !newUser.password) {
                        alert('Name, email, and password are required');
                        return;
                      }

                      const userId = `user-${Date.now()}`;
                      const avatar = newUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(newUser.name)}`;

                      try {
                        await dbRun(
                          "INSERT INTO profile (id, name, phone, email, password, bio, avatar, role, accountStatus, settings_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                          [userId, newUser.name, newUser.phone, newUser.email, newUser.password, newUser.bio || '', avatar, 'user', 'active', JSON.stringify({
                            theme: 'dark',
                            wallpaper: '',
                            vibrations: true,
                            notifications: true,
                            fontSize: 'medium',
                            brightness: 'dim',
                            customThemeColor: '#00a884'
                          })]
                        );

                        // Generate profile link
                        const profileLink = `${window.location.origin}?profile=${userId}`;

                        // Copy to clipboard
                        navigator.clipboard.writeText(profileLink);

                        alert(`User created successfully! Profile link copied to clipboard:\n${profileLink}`);

                        setNewUser({
                          name: '',
                          email: '',
                          phone: '',
                          password: '',
                          bio: '',
                          avatar: '',
                          avatarFile: null
                        });
                        if (avatarInputRef.current) avatarInputRef.current.value = '';

                        loadData();
                      } catch (error) {
                        console.error('Error creating user:', error);
                        alert('Error creating user. Please try again.');
                      }
                    }}
                    className="flex-1 bg-[#00a884] text-black font-bold py-3 px-6 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[#00a884]/20"
                  >
                    Create User & Generate Link
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'broadcast' ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
              <h3 className="text-[#00a884] font-bold font-outfit text-2xl flex items-center gap-3">
                <Send size={32} /> Message Broadcast
              </h3>
            </div>

            <div className="bg-[#111b21] rounded-[32px] p-8 border border-white/5 shadow-2xl max-w-2xl mx-auto">
              <h4 className="text-white font-bold text-xl font-outfit mb-6">Send Message to All Users</h4>
              <div className="space-y-6">
                <div>
                  <label className="block text-[#8696a0] text-xs font-bold uppercase tracking-widest mb-2">Broadcast Message</label>
                  <textarea
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    className="w-full bg-[#202c33] border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-[#8696a0] focus:border-[#00a884] focus:ring-1 focus:ring-[#00a884] transition-all resize-none"
                    rows={4}
                    placeholder="Enter your message to broadcast to all users..."
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => {
                      if (!broadcastMessage.trim()) {
                        alert('Please enter a message to broadcast');
                        return;
                      }
                      onBroadcast(broadcastMessage.trim());
                      setBroadcastMessage('');
                      alert('Message broadcasted successfully!');
                    }}
                    className="flex-1 bg-[#00a884] text-black font-bold py-3 px-6 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[#00a884]/20 flex items-center justify-center gap-2"
                  >
                    <Send size={18} />
                    Broadcast Message
                  </button>
                </div>

                <div className="text-xs text-[#8696a0] bg-[#202c33] rounded-2xl p-4 border border-white/5">
                  <strong className="text-white">Note:</strong> This message will be sent to all connected users in real-time and will appear in their chat as a system message from Zenj.
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-300">
             <div className="flex justify-between items-center">
                <h3 className="text-[#00a884] font-bold font-outfit text-2xl flex items-center gap-3">
                   <Terminal size={32} /> Software Manifestation
                </h3>
                <button 
                  onClick={() => setIsAddingTool(true)}
                  className="px-6 py-3 bg-[#00a884] text-black rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-[#00a884]/20 hover:scale-105 active:scale-95 transition-all"
                >
                  <Plus size={20} /> Create Tool
                </button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                {tools.length === 0 ? (
                  <div className="col-span-full py-20 text-center space-y-4 opacity-40 border-2 border-dashed border-white/5 rounded-[48px]">
                    <Package size={64} className="mx-auto text-[#8696a0]" strokeWidth={1} />
                    <p className="text-[#8696a0] font-outfit uppercase tracking-widest text-xs">No software tools manifested yet</p>
                  </div>
                ) : (
                  tools.map(tool => (
                    <div key={tool.id} className="bg-[#111b21] border border-white/5 rounded-[32px] p-6 shadow-2xl relative group overflow-hidden">
                       <div className="flex items-start justify-between mb-4">
                          <img src={tool.iconUrl} className="w-14 h-14 rounded-2xl border border-white/10 shadow-lg object-cover" alt="" />
                          <button onClick={() => dbRun("DELETE FROM tools WHERE id = ?", [tool.id]).then(loadData)} className="p-2 text-[#8696a0] hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"><Trash2 size={18} /></button>
                       </div>
                       <h4 className="text-white font-bold text-lg font-outfit">{tool.name}</h4>
                       <p className="text-[#8696a0] text-xs mt-1 mb-4 line-clamp-2 h-8">{tool.description}</p>
                       <div className="flex items-center justify-between pt-4 border-t border-white/5">
                          <span className="text-[10px] font-mono text-[#00a884] bg-[#00a884]/10 px-2 py-0.5 rounded uppercase">{tool.version}</span>
                          <span className="text-[10px] text-[#3b4a54] font-bold uppercase">{tool.downloads} Pulse</span>
                       </div>
                    </div>
                  ))
                )}
             </div>
          </div>
        )}
      </div>

      {isAddingTool && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col p-6 animate-in slide-in-from-bottom duration-300 safe-top safe-bottom overflow-hidden">
           <div className="flex justify-between items-center mb-10 max-w-lg mx-auto w-full">
              <button onClick={() => setIsAddingTool(false)} className="text-[#8696a0] hover:text-white p-2 bg-white/5 rounded-full">
                 <X size={28} />
              </button>
              <h3 className="text-white text-xl font-bold font-outfit">New Software Portal</h3>
              <div className="w-10"></div>
           </div>

           <div className="flex-1 overflow-y-auto no-scrollbar max-w-lg mx-auto w-full pb-10">
              <div className="bg-[#202c33] rounded-[48px] p-8 border border-white/10 space-y-6 shadow-2xl">
                 
                 {uploadProgress > 0 && (
                   <div className="space-y-3 p-6 bg-black/20 rounded-3xl border border-[#00a884]/20 animate-in fade-in zoom-in duration-300">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-[#00a884] uppercase tracking-widest">{isFinalizing ? 'Finalizing Pulse' : 'Transferring Manifest'}</span>
                        <span className="text-xs font-bold text-[#00a884]">{Math.round(uploadProgress)}%</span>
                      </div>
                      <div className="w-full h-2 bg-[#111b21] rounded-full overflow-hidden">
                        <div className="h-full bg-[#00a884] transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                      </div>
                      {isFinalizing && <div className="flex items-center gap-2 text-[10px] text-emerald-500/60 font-medium"><Loader2 size={12} className="animate-spin" /> Verifying cryptographic signatures...</div>}
                   </div>
                 )}

                 {!uploadProgress && (
                   <>
                    <div className="flex gap-6 items-start">
                      <div onClick={() => iconInputRef.current?.click()} className="w-24 h-24 bg-[#111b21] rounded-[28px] border border-white/5 flex flex-col items-center justify-center cursor-pointer group shrink-0 relative overflow-hidden">
                        {newTool.icon ? <img src={newTool.icon} className="w-full h-full object-cover" alt="" /> : <Camera size={32} className="text-[#3b4a54] group-hover:text-[#00a884] transition-colors" />}
                        <input type="file" ref={iconInputRef} onChange={handleIconSelect} accept="image/*" className="hidden" />
                      </div>
                      <div className="flex-1 space-y-4">
                        <input type="text" placeholder="Tool Name" value={newTool.name} onChange={(e) => setNewTool({...newTool, name: e.target.value})} className="w-full bg-[#111b21] border border-white/5 rounded-2xl py-3 px-5 text-white font-bold outline-none focus:border-[#00a884]/40" />
                        <input type="text" placeholder="Version (e.g. 1.0.0)" value={newTool.version} onChange={(e) => setNewTool({...newTool, version: e.target.value})} className="w-full bg-[#111b21] border border-white/5 rounded-2xl py-3 px-5 text-[#00a884] font-mono text-sm outline-none focus:border-[#00a884]/40" />
                      </div>
                    </div>

                    <div onClick={() => fileInputRef.current?.click()} className="w-full h-32 bg-[#111b21] border-2 border-dashed border-[#3b4a54] hover:border-[#00a884] rounded-[28px] flex flex-col items-center justify-center gap-3 cursor-pointer group transition-all">
                      {newTool.file ? (
                        <div className="flex flex-col items-center">
                          <ShieldCheck className="text-[#00a884]" size={40} />
                          <span className="text-[10px] text-white font-bold mt-2 truncate max-w-[200px]">{newTool.fileName}</span>
                        </div>
                      ) : (
                        <>
                          <FileUp size={40} className="text-[#3b4a54] group-hover:text-[#00a884]" />
                          <span className="text-[10px] font-bold text-[#8696a0] uppercase tracking-widest">Upload Bundle</span>
                        </>
                      )}
                      <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                    </div>

                    <textarea placeholder="Technical description..." value={newTool.description} onChange={(e) => setNewTool({...newTool, description: e.target.value})} className="w-full h-32 bg-[#111b21] border border-white/5 rounded-[28px] py-5 px-6 text-[#d1d7db] outline-none focus:border-[#00a884]/40 resize-none text-sm" />

                    <button onClick={initiateUpload} disabled={!newTool.name || !newTool.file || !newTool.icon} className="w-full bg-[#00a884] text-black py-5 rounded-[28px] font-black text-lg shadow-2xl shadow-[#00a884]/30 active:scale-95 transition-all disabled:opacity-50">
                      Manifest Software Tool
                    </button>
                   </>
                 )}
              </div>
           </div>
        </div>
      )}

      {conflictModal?.isOpen && (
        <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-[#202c33] p-8 rounded-[40px] border border-white/10 max-w-sm w-full space-y-6 shadow-[0_0_100px_rgba(255,165,0,0.1)]">
              <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 mx-auto">
                 <AlertCircle size={32} />
              </div>
              <div className="text-center space-y-2">
                 <h4 className="text-white font-bold text-xl font-outfit">Manifest Conflict</h4>
                 <p className="text-[#8696a0] text-sm">A software tool with the name <strong className="text-white">"{newTool.name}"</strong> already exists in the Zenj Network.</p>
              </div>
              <div className="space-y-3">
                 <button onClick={performUpload} className="w-full py-4 bg-amber-500 text-black font-black rounded-2xl shadow-xl shadow-amber-500/20 active:scale-95 transition-all">Overwrite Existing</button>
                 <button onClick={() => setConflictModal(null)} className="w-full py-3 bg-white/5 text-white font-bold rounded-2xl hover:bg-white/10 transition-all">Cancel Manifestation</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
