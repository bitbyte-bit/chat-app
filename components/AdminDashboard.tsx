
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  BarChart3, Users, MessageSquare, ShieldAlert,
  Search, UserMinus, Send,
  ShieldCheck, ArrowLeft, RefreshCw, Eye,
  Lock, X, Package, Plus, Trash2, Camera, FileUp, Cpu, Terminal,
  Ban, ShieldQuestion, AlertTriangle, CheckCircle, Loader2, AlertCircle, Edit3
} from 'lucide-react';
import { Contact, AccountStatus, Message, ZenjTool } from '../types';
import { getSocket } from '../services/socket';
import { useNotification } from './NotificationProvider';

interface AdminDashboardProps {
  onBack: () => void;
  onBroadcast: (message: string) => void;
  tools: ZenjTool[];
  loadTools: () => Promise<ZenjTool[]>;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack, onBroadcast, loadTools }) => {
  const { showNotification, confirm } = useNotification();
  const [activeTab, setActiveTab] = useState<'users' | 'tools' | 'broadcast' | 'register' | 'messages' | 'notifications' | 'performance'>('users');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [users, setUsers] = useState<Contact[]>([]);
  const [tools, setTools] = useState<ZenjTool[]>([]);
  const [installs, setInstalls] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingTool, setIsAddingTool] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [conflictModal, setConflictModal] = useState<{ isOpen: boolean; tool: any } | null>(null);
  const [editingTool, setEditingTool] = useState<ZenjTool | null>(null);
  const [viewingUser, setViewingUser] = useState<any | null>(null);
  const [userMessages, setUserMessages] = useState<Message[]>([]);
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<any[]>([]);

  const handleEditTool = async () => {
    if (!editingTool) return;
    try {
      const response = await fetch(`/api/tools/${editingTool.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingTool.name,
          description: editingTool.description,
          version: editingTool.version,
          iconUrl: editingTool.iconUrl,
          fileUrl: editingTool.fileUrl,
          fileName: editingTool.fileName
        })
      });
      if (response.ok) {
        setEditingTool(null);
        loadData();
        showNotification('Tool updated successfully', [], 'success');
      } else {
        showNotification('Failed to update tool', [], 'error');
      }
    } catch (err) {
      showNotification('Error updating tool', [], 'error');
    }
  };

  const handleViewUser = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setViewingUser(user);
      const messages = await fetch(`/api/messages?contact_id=${userId}&limit=50`).then(r => r.json()).catch(() => []);
      setUserMessages(messages as Message[]);
    }
  };

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
    const [dirUsers, toolList, metrics, messageCount, messages, notifs, perfMetrics] = await Promise.all([
      fetch('/api/directory').then(r => r.json()).catch(() => []),
      loadTools(),
      fetch('/api/metrics').then(r => r.json()).catch(() => ({ val: 0 })),
      fetch('/api/messages').then(r => r.json()).then(msgs => ({ count: msgs.length })).catch(() => ({ count: 0 })),
      fetch('/api/messages').then(r => r.json()).then(msgs => msgs.slice(0, 100)).catch(() => []),
      fetch('/api/notifications').then(r => r.json()).catch(() => []),
      fetch('/api/metrics?metric_name=response_time').then(r => r.json()).catch(() => [])
    ]);

    setUsers((dirUsers as any[]).map(u => ({
      ...u,
      status: u.status || 'offline',
      accountStatus: u.accountStatus || 'active'
    })));
    setTools(toolList as ZenjTool[]);
    if (metrics && metrics.length > 0) setInstalls(metrics[0].val);
    setMessageCount(messageCount.count || 0);
    setAllMessages(messages as Message[]);
    setNotifications(notifs);
    setPerformanceMetrics(metrics);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);

    // Socket listeners for real-time updates
    const socket = getSocket();
    if (socket) {
      socket.on('user_added', loadData);
      socket.on('user_status', loadData);
      socket.on('new_notification', () => loadData()); // Reload notifications
    }

    return () => {
      clearInterval(interval);
      if (socket) {
        socket.off('user_added', loadData);
        socket.off('user_status', loadData);
        socket.off('new_notification', loadData);
      }
    };
  }, []);

  const stats = useMemo(() => {
    const total = users.length;
    const online = users.filter(u => u.status === 'online').length;
    const warned = users.filter(u => u.accountStatus === 'warned').length;
    return { total, online, installs, toolCount: tools.length, warned, messages: messageCount };
  }, [users, installs, tools, messageCount]);

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (u.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUpdateStatus = async (userId: string, status: AccountStatus) => {
    if (!(await confirm(`Are you sure you want to set status to ${status}?`))) return;
    const badge = status === 'warned' ? '⚠️' : status === 'suspended' ? '🚫' : status === 'banned' ? '⛔' : '';
    try {
      const response = await fetch(`/api/users/${userId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountStatus: status, statusBadge: badge })
      });
      if (response.ok) {
        loadData();
        // Broadcast the status change
        await fetch('/api/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: `User ${userId} has been ${status}.` })
        });
      } else {
        showNotification('Failed to update user status', [], 'error');
      }
    } catch (err) {
      showNotification('Error updating user status', [], 'error');
    }
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
    try {
      const response = await fetch('/api/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTool.name,
          description: newTool.description,
          version: newTool.version,
          iconUrl: newTool.icon,
          fileUrl: newTool.file,
          fileName: newTool.fileName
        })
      });
      if (response.ok) {
        setTimeout(() => {
          setIsAddingTool(false);
          setIsFinalizing(false);
          setUploadProgress(0);
          setNewTool({ name: '', description: '', version: '1.0.0', icon: '', file: '', fileName: '' });
          loadData();
          showNotification('Tool uploaded successfully', [], 'success');
        }, 1000);
      } else {
        showNotification('Failed to upload tool', [], 'error');
        setIsFinalizing(false);
        setUploadProgress(0);
      }
    } catch (err) {
      showNotification('Error uploading tool', [], 'error');
      setIsFinalizing(false);
      setUploadProgress(0);
    }
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
            <button onClick={() => setActiveTab('messages')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'messages' ? 'bg-[#00a884] text-black shadow-lg' : 'text-[#8696a0]'}`}>Messages</button>
            <button onClick={() => setActiveTab('notifications')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'notifications' ? 'bg-[#00a884] text-black shadow-lg' : 'text-[#8696a0]'}`}>Notifications</button>
            <button onClick={() => setActiveTab('performance')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'performance' ? 'bg-[#00a884] text-black shadow-lg' : 'text-[#8696a0]'}`}>Performance</button>
            <button onClick={() => setActiveTab('broadcast')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'broadcast' ? 'bg-[#00a884] text-black shadow-lg' : 'text-[#8696a0]'}`}>Broadcast</button>
            <button onClick={() => setActiveTab('tools')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'tools' ? 'bg-[#00a884] text-black shadow-lg' : 'text-[#8696a0]'}`}>Lab</button>
         </div>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
        {activeTab === 'users' ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="bg-[#111b21] p-4 rounded-[24px] border border-white/5 shadow-xl">
                <Users className="text-[#00a884] mb-2" size={24} />
                <div className="text-[#8696a0] text-[10px] font-bold uppercase mb-1">Online</div>
                <div className="text-3xl font-bold text-[#00a884] font-outfit">{stats.online}</div>
              </div>
              <div className="bg-[#111b21] p-4 rounded-[24px] border border-white/5 shadow-xl">
                <Users className="text-white mb-2" size={24} />
                <div className="text-[#8696a0] text-[10px] font-bold uppercase mb-1">Total</div>
                <div className="text-3xl font-bold text-white font-outfit">{stats.total}</div>
              </div>
              <div className="bg-[#111b21] p-4 rounded-[24px] border border-white/5 shadow-xl">
                <ShieldAlert className="text-amber-500 mb-2" size={24} />
                <div className="text-[#8696a0] text-[10px] font-bold uppercase mb-1">Warned</div>
                <div className="text-3xl font-bold text-amber-500 font-outfit">{stats.warned}</div>
              </div>
              <div className="bg-[#111b21] p-4 rounded-[24px] border border-white/5 shadow-xl">
                <MessageSquare className="text-blue-500 mb-2" size={24} />
                <div className="text-[#8696a0] text-[10px] font-bold uppercase mb-1">Messages</div>
                <div className="text-3xl font-bold text-blue-500 font-outfit">{stats.messages}</div>
              </div>
              <div className="bg-[#111b21] p-4 rounded-[24px] border border-white/5 shadow-xl">
                <Terminal className="text-amber-500 mb-2" size={24} />
                <div className="text-[#8696a0] text-[10px] font-bold uppercase mb-1">Tools</div>
                <div className="text-3xl font-bold text-amber-500 font-outfit">{stats.toolCount}</div>
              </div>
              <div className="bg-[#111b21] p-4 rounded-[24px] border border-white/5 shadow-xl">
                <Cpu className="text-rose-500 mb-2" size={24} />
                <div className="text-[#8696a0] text-[10px] font-bold uppercase mb-1">Installs</div>
                <div className="text-3xl font-bold text-rose-500 font-outfit">{stats.installs}</div>
              </div>
            </div>

            {/* Bar Chart */}
            <div className="bg-[#111b21] rounded-[32px] border border-white/5 p-6 shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <BarChart3 className="text-[#00a884]" size={24} />
                <h3 className="text-white font-bold font-outfit">System Analytics</h3>
              </div>
              <div className="grid grid-cols-6 gap-4">
                <div className="text-center">
                  <div className="text-[#8696a0] text-xs font-bold uppercase mb-2">Online</div>
                  <div className="h-32 bg-[#0b141a] rounded-lg flex items-end justify-center p-2">
                    <div
                      className="bg-[#00a884] rounded w-full transition-all duration-500"
                      style={{ height: `${Math.min((stats.online / Math.max(stats.total, 1)) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <div className="text-[#00a884] font-bold mt-2">{stats.online}</div>
                </div>
                <div className="text-center">
                  <div className="text-[#8696a0] text-xs font-bold uppercase mb-2">Total</div>
                  <div className="h-32 bg-[#0b141a] rounded-lg flex items-end justify-center p-2">
                    <div
                      className="bg-white rounded w-full transition-all duration-500"
                      style={{ height: `${Math.min((stats.total / Math.max(stats.total, 1)) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <div className="text-white font-bold mt-2">{stats.total}</div>
                </div>
                <div className="text-center">
                  <div className="text-[#8696a0] text-xs font-bold uppercase mb-2">Warned</div>
                  <div className="h-32 bg-[#0b141a] rounded-lg flex items-end justify-center p-2">
                    <div
                      className="bg-amber-500 rounded w-full transition-all duration-500"
                      style={{ height: `${Math.min((stats.warned / Math.max(stats.total, 1)) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <div className="text-amber-500 font-bold mt-2">{stats.warned}</div>
                </div>
                <div className="text-center">
                  <div className="text-[#8696a0] text-xs font-bold uppercase mb-2">Messages</div>
                  <div className="h-32 bg-[#0b141a] rounded-lg flex items-end justify-center p-2">
                    <div
                      className="bg-blue-500 rounded w-full transition-all duration-500"
                      style={{ height: `${Math.min((stats.messages / Math.max(stats.messages + 100, 1)) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <div className="text-blue-500 font-bold mt-2">{stats.messages}</div>
                </div>
                <div className="text-center">
                  <div className="text-[#8696a0] text-xs font-bold uppercase mb-2">Tools</div>
                  <div className="h-32 bg-[#0b141a] rounded-lg flex items-end justify-center p-2">
                    <div
                      className="bg-amber-500 rounded w-full transition-all duration-500"
                      style={{ height: `${Math.min((stats.toolCount / Math.max(stats.toolCount + 10, 1)) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <div className="text-amber-500 font-bold mt-2">{stats.toolCount}</div>
                </div>
                <div className="text-center">
                  <div className="text-[#8696a0] text-xs font-bold uppercase mb-2">Installs</div>
                  <div className="h-32 bg-[#0b141a] rounded-lg flex items-end justify-center p-2">
                    <div
                      className="bg-rose-500 rounded w-full transition-all duration-500"
                      style={{ height: `${Math.min((stats.installs / Math.max(stats.installs + 10, 1)) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <div className="text-rose-500 font-bold mt-2">{stats.installs}</div>
                </div>
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
                           <button onClick={() => handleViewUser(u.id)} className="p-2.5 bg-blue-500/10 text-blue-500 rounded-xl hover:bg-blue-500 hover:text-black transition-all"><Eye size={18} /></button>
                           <button onClick={() => handleUpdateStatus(u.id, 'active')} className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-black transition-all"><CheckCircle size={18} /></button>
                           <button onClick={() => handleUpdateStatus(u.id, 'warned')} className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl hover:bg-amber-500 hover:text-black transition-all"><AlertTriangle size={18} /></button>
                           <button onClick={() => handleUpdateStatus(u.id, 'suspended')} className="p-2.5 bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-black transition-all"><UserMinus size={18} /></button>
                           <button onClick={() => handleUpdateStatus(u.id, 'banned')} className="p-2.5 bg-gray-500/10 text-gray-500 rounded-xl hover:bg-gray-500 hover:text-black transition-all"><Lock size={18} /></button>
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
                      if (!newUser.name || !newUser.email || !newUser.phone || !newUser.password) {
                        showNotification('All fields are required', [], 'error');
                        return;
                      }

                      try {
                        const response = await fetch('/api/register', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            name: newUser.name,
                            email: newUser.email,
                            phone: newUser.phone,
                            password: newUser.password
                          })
                        });
                        const data = await response.json();
                        if (response.ok) {
                          // Generate profile link
                          const profileLink = `${window.location.origin}?profile=${data.userId}`;

                          // Copy to clipboard
                          navigator.clipboard.writeText(profileLink);

                          showNotification(`User created successfully! Profile link copied to clipboard:\n${profileLink}`, [], 'success');

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
                          loadData(); // Refresh the UI
                        } else {
                          showNotification(data.error, [], 'error');
                        }
                      } catch (err) {
                        showNotification('Error creating user', [], 'error');
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
        ) : activeTab === 'messages' ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
              <h3 className="text-[#00a884] font-bold font-outfit text-2xl flex items-center gap-3">
                <MessageSquare size={32} /> Message Audit
              </h3>
            </div>
            <div className="bg-[#111b21] rounded-[32px] border border-white/5 overflow-hidden flex flex-col h-[600px] shadow-2xl">
              <div className="p-6 border-b border-white/5">
                <h4 className="text-white font-bold text-xl font-outfit">Recent Messages</h4>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-white/5">
                {allMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-30">
                    <MessageSquare size={64} className="mb-4" />
                    <p className="font-outfit uppercase tracking-widest text-xs">No messages found</p>
                  </div>
                ) : (
                  allMessages.map(m => (
                    <div key={m.id} className="flex items-center gap-4 p-5 hover:bg-white/5 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white block truncate">{m.role}</span>
                          <span className="text-[10px] text-[#8696a0]">{new Date(m.timestamp).toLocaleString()}</span>
                        </div>
                        <span className="text-[12px] text-[#8696a0] block truncate">{m.content}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'notifications' ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
              <h3 className="text-[#00a884] font-bold font-outfit text-2xl flex items-center gap-3">
                <AlertTriangle size={32} /> Notification Center
              </h3>
              <button onClick={() => setNotifications([...notifications, { id: `temp-${Date.now()}`, title: '', message: '', type: 'info', active: true }])} className="p-3 bg-[#00a884] text-black rounded-2xl hover:bg-[#06cf9c] transition-all"><Plus size={20} /></button>
            </div>
            <div className="space-y-4">
              {notifications.map(notif => (
                <div key={notif.id} className="bg-[#111b21] rounded-[24px] p-6 border border-white/5">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 space-y-4">
                      <input
                        type="text"
                        placeholder="Notification Title"
                        value={notif.title}
                        onChange={(e) => setNotifications(notifications.map(n => n.id === notif.id ? { ...n, title: e.target.value } : n))}
                        className="w-full bg-[#202c33] border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-[#8696a0] focus:border-[#00a884] focus:ring-1 focus:ring-[#00a884] transition-all"
                      />
                      <textarea
                        placeholder="Notification Message"
                        value={notif.message}
                        onChange={(e) => setNotifications(notifications.map(n => n.id === notif.id ? { ...n, message: e.target.value } : n))}
                        className="w-full bg-[#202c33] border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-[#8696a0] focus:border-[#00a884] focus:ring-1 focus:ring-[#00a884] transition-all resize-none"
                        rows={3}
                      />
                      <div className="flex items-center gap-4">
                        <select
                          value={notif.type}
                          onChange={(e) => setNotifications(notifications.map(n => n.id === notif.id ? { ...n, type: e.target.value } : n))}
                          className="bg-[#202c33] border border-white/10 rounded-2xl px-4 py-2 text-white focus:border-[#00a884] focus:ring-1 focus:ring-[#00a884] transition-all"
                        >
                          <option value="info">Info</option>
                          <option value="warning">Warning</option>
                          <option value="success">Success</option>
                          <option value="error">Error</option>
                        </select>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={notif.active}
                            onChange={(e) => setNotifications(notifications.map(n => n.id === notif.id ? { ...n, active: e.target.checked } : n))}
                          />
                          <span className="text-[#8696a0] text-sm">Active</span>
                        </label>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {notif.id.startsWith('temp-') ? (
                        <button onClick={async () => {
                          const res = await fetch('/api/notifications', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ title: notif.title, message: notif.message, type: notif.type })
                          });
                          if (res.ok) {
                            loadData();
                          }
                        }} className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-black transition-all"><CheckCircle size={18} /></button>
                      ) : (
                        <button onClick={async () => {
                          const res = await fetch(`/api/notifications/${notif.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ title: notif.title, message: notif.message, type: notif.type, active: notif.active })
                          });
                          if (res.ok) {
                            loadData();
                          }
                        }} className="p-2 bg-blue-500/10 text-blue-500 rounded-xl hover:bg-blue-500 hover:text-black transition-all"><Edit3 size={18} /></button>
                      )}
                      <button onClick={async () => {
                        const res = await fetch(`/api/notifications/${notif.id}`, { method: 'DELETE' });
                        if (res.ok) {
                          loadData();
                        }
                      }} className="p-2 bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-black transition-all"><Trash2 size={18} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === 'performance' ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
              <h3 className="text-[#00a884] font-bold font-outfit text-2xl flex items-center gap-3">
                <BarChart3 size={32} /> Performance Analytics
              </h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Response Time Chart */}
              <div className="bg-[#111b21] rounded-[32px] border border-white/5 p-6 shadow-2xl">
                <h4 className="text-white font-bold text-xl font-outfit mb-4">Response Times (ms)</h4>
                <div className="h-64 flex items-end justify-between gap-2">
                  {performanceMetrics.filter(m => m.metric_name === 'response_time').slice(0, 10).reverse().map((m, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center">
                      <div
                        className="bg-[#00a884] rounded-t w-full transition-all duration-500"
                        style={{ height: `${Math.min((m.value / 1000) * 100, 100)}%` }}
                      ></div>
                      <span className="text-xs text-[#8696a0] mt-2">{new Date(m.timestamp).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* User Activity Chart */}
              <div className="bg-[#111b21] rounded-[32px] border border-white/5 p-6 shadow-2xl">
                <h4 className="text-white font-bold text-xl font-outfit mb-4">User Activity</h4>
                <div className="h-64 flex items-end justify-between gap-2">
                  {performanceMetrics.filter(m => m.metric_name === 'user_activity').slice(0, 10).reverse().map((m, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center">
                      <div
                        className="bg-blue-500 rounded-t w-full transition-all duration-500"
                        style={{ height: `${Math.min(m.value * 10, 100)}%` }}
                      ></div>
                      <span className="text-xs text-[#8696a0] mt-2">{new Date(m.timestamp).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Memory Usage Line Chart */}
              <div className="bg-[#111b21] rounded-[32px] border border-white/5 p-6 shadow-2xl">
                <h4 className="text-white font-bold text-xl font-outfit mb-4">Memory Usage (MB)</h4>
                <div className="h-64 relative">
                  <svg className="w-full h-full" viewBox="0 0 400 200">
                    <polyline
                      fill="none"
                      stroke="#00a884"
                      strokeWidth="2"
                      points={
                        performanceMetrics.filter(m => m.metric_name === 'memory_usage').slice(0, 20).reverse().map((m, i) => `${(i / 19) * 400},${200 - (m.value / 100) * 200}`).join(' ')
                      }
                    />
                  </svg>
                </div>
              </div>

              {/* Error Rate Chart */}
              <div className="bg-[#111b21] rounded-[32px] border border-white/5 p-6 shadow-2xl">
                <h4 className="text-white font-bold text-xl font-outfit mb-4">Error Rate (%)</h4>
                <div className="h-64 flex items-end justify-between gap-2">
                  {performanceMetrics.filter(m => m.metric_name === 'error_rate').slice(0, 10).reverse().map((m, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center">
                      <div
                        className="bg-rose-500 rounded-t w-full transition-all duration-500"
                        style={{ height: `${Math.min(m.value * 100, 100)}%` }}
                      ></div>
                      <span className="text-xs text-[#8696a0] mt-2">{new Date(m.timestamp).toLocaleDateString()}</span>
                    </div>
                  ))}
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
                    onClick={async () => {
                      if (!broadcastMessage.trim()) {
                        showNotification('Please enter a message to broadcast', [], 'error');
                        return;
                      }
                      try {
                        const response = await fetch('/api/broadcast', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ content: broadcastMessage.trim() })
                        });
                        if (response.ok) {
                          setBroadcastMessage('');
                          showNotification('Message broadcasted successfully!', [], 'success');
                        } else {
                          showNotification('Failed to send broadcast', [], 'error');
                        }
                      } catch (err) {
                        showNotification('Error sending broadcast', [], 'error');
                      }
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
                          <div className="flex gap-2">
                            <button onClick={() => setEditingTool(tool)} className="p-2 text-[#8696a0] hover:text-[#00a884] hover:bg-[#00a884]/10 rounded-xl transition-all"><Edit3 size={18} /></button>
                            <button onClick={async () => {
                              if (await confirm('Are you sure you want to delete this tool?')) {
                                try {
                                  const response = await fetch(`/api/tools/${tool.id}`, { method: 'DELETE' });
                                  if (response.ok) {
                                    loadData();
                                    showNotification('Tool deleted successfully', [], 'success');
                                  } else {
                                    showNotification('Failed to delete tool', [], 'error');
                                  }
                                } catch (err) {
                                  showNotification('Error deleting tool', [], 'error');
                                }
                              }
                            }} className="p-2 text-[#8696a0] hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"><Trash2 size={18} /></button>
                          </div>
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

      {editingTool && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col p-6 animate-in slide-in-from-bottom duration-300 safe-top safe-bottom overflow-hidden">
          <div className="flex justify-between items-center mb-6 max-w-lg mx-auto w-full">
            <button onClick={() => setEditingTool(null)} className="text-[#8696a0] hover:text-white p-2 bg-white/5 rounded-full"><X size={28} /></button>
            <h3 className="text-white text-xl font-bold font-outfit">Edit Tool</h3>
            <div className="w-10"></div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full overflow-y-auto no-scrollbar pb-10">
            <div className="w-full bg-[#202c33] rounded-[48px] p-8 shadow-2xl border border-white/10 space-y-6">
              <div className="flex gap-6">
                <div onClick={() => iconInputRef.current?.click()} className="w-24 h-24 bg-[#0b141a] rounded-[32px] border border-white/5 flex items-center justify-center cursor-pointer group shrink-0 relative overflow-hidden">
                  {editingTool.iconUrl ? <img src={editingTool.iconUrl} className="w-full h-full object-cover" alt="" /> : <Camera size={32} className="text-[#3b4a54] group-hover:text-amber-500" />}
                  <input type="file" ref={iconInputRef} onChange={(e) => { const f = e.target.files?.[0]; if(f) { const r = new FileReader(); r.onloadend = () => setEditingTool({...editingTool, iconUrl: r.result as string}); r.readAsDataURL(f); } }} accept="image/*" className="hidden" />
                </div>
                <div className="flex-1 space-y-4">
                  <input type="text" placeholder="Tool Identity" value={editingTool.name} onChange={(e) => setEditingTool({...editingTool, name: e.target.value})} className="w-full bg-[#0b141a] border border-white/5 rounded-2xl py-3 px-5 text-white font-bold outline-none focus:border-amber-500/50" />
                  <input type="text" placeholder="Version (1.0.0)" value={editingTool.version} onChange={(e) => setEditingTool({...editingTool, version: e.target.value})} className="w-full bg-[#0b141a] border border-white/5 rounded-2xl py-3 px-5 text-amber-500 font-mono text-xs outline-none focus:border-amber-500/50" />
                </div>
              </div>
              <textarea placeholder="Technical description..." value={editingTool.description} onChange={(e) => setEditingTool({...editingTool, description: e.target.value})} className="w-full h-24 bg-[#0b141a] border border-white/5 rounded-2xl py-4 px-6 text-[#d1d7db] outline-none resize-none text-sm" />
              <button onClick={handleEditTool} className="w-full bg-amber-500 text-black py-5 rounded-[28px] font-black text-lg shadow-2xl shadow-amber-500/30 transition-all">Update Tool</button>
            </div>
          </div>
        </div>
      )}

      {viewingUser && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col p-6 animate-in slide-in-from-bottom duration-300 safe-top safe-bottom overflow-hidden">
          <div className="flex justify-between items-center mb-6 max-w-lg mx-auto w-full">
            <button onClick={() => setViewingUser(null)} className="text-[#8696a0] hover:text-white p-2 bg-white/5 rounded-full"><X size={28} /></button>
            <h3 className="text-white text-xl font-bold font-outfit">User Details</h3>
            <div className="w-10"></div>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full overflow-y-auto no-scrollbar pb-10">
            <div className="w-full bg-[#202c33] rounded-[48px] p-8 shadow-2xl border border-white/10 space-y-6">
              <div className="flex items-center gap-4">
                <img src={viewingUser.avatar} className="w-16 h-16 rounded-2xl border border-white/10" alt="" />
                <div>
                  <h4 className="text-white font-bold text-xl font-outfit">{viewingUser.name}</h4>
                  <span className={`text-sm px-2 py-0.5 rounded ${viewingUser.accountStatus === 'active' ? 'bg-emerald-500/10 text-emerald-500' : viewingUser.accountStatus === 'warned' ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'}`}>{viewingUser.accountStatus}</span>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[#8696a0] text-sm font-bold">Email</label>
                  <p className="text-white">{viewingUser.email || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-[#8696a0] text-sm font-bold">Phone</label>
                  <p className="text-white">{viewingUser.phone || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-[#8696a0] text-sm font-bold">Bio</label>
                  <p className="text-white">{viewingUser.bio || 'No bio'}</p>
                </div>
                <div>
                  <label className="text-[#8696a0] text-sm font-bold">Status</label>
                  <p className="text-white">{viewingUser.status || 'offline'}</p>
                </div>
              </div>
              <div>
                <label className="text-[#8696a0] text-sm font-bold mb-2 block">Recent Messages</label>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {userMessages.length === 0 ? (
                    <p className="text-[#8696a0] text-sm">No messages</p>
                  ) : (
                    userMessages.slice(0, 10).map(m => (
                      <div key={m.id} className="bg-[#111b21] p-3 rounded-lg">
                        <div className="flex justify-between items-start">
                          <span className="text-white text-sm font-bold">{m.role}</span>
                          <span className="text-[#8696a0] text-xs">{new Date(m.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-[#8696a0] text-sm mt-1">{m.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
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
