
import React, { useState, useEffect, useRef } from 'react';
import { 
  Contact, Message, AppMode, CallState, 
  UserProfile, Moment, AppSettings 
} from './types';
import Sidebar from './components/Sidebar';
import ChatView from './components/ChatView';
import MarketplaceView from './components/MarketplaceView';
import ProfileView from './components/ProfileView';
import LiveCallOverlay from './components/LiveCallOverlay';
import AddFriendModal from './components/AddFriendModal';
import CreateGroupModal from './components/CreateGroupModal';
import StatusView from './components/StatusView';
import SettingsView from './components/SettingsView';
import Onboarding from './components/Onboarding';
import DiscoveryView from './components/DiscoveryView';
import AdminDashboard from './components/AdminDashboard';
import Login from './components/Login';
import PWAInstallBanner from './components/PWAInstallBanner';
import BottomNav from './components/BottomNav';
import { NotificationProvider, useNotification } from './components/NotificationProvider';
import { generateResponse } from './services/gemini';
import { initDatabase, dbQuery, dbRun } from './services/database';
import { deriveKeyFromPassword, encryptContent, decryptContent } from './services/crypto';
import { initSocket, emitMessage } from './services/socket';
import { Sparkles, Loader2, X } from 'lucide-react';

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  wallpaper: '',
  vibrations: true,
  notifications: true,
  fontSize: 'medium',
  brightness: 'dim',
  customThemeColor: '#00a884'
};

const App: React.FC = () => {
  const [dbReady, setDbReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [mode, setMode] = useState<AppMode>(AppMode.CHATS);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [conversations, setConversations] = useState<Record<string, Message[]>>({});
  const [directoryUsers, setDirectoryUsers] = useState<any[]>([]);
  const [viewedProfile, setViewedProfile] = useState<UserProfile | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set());

  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false);
  const { showNotification, confirm } = useNotification();
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [call, setCall] = useState<CallState>({ isActive: false, type: null, contact: null });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const socketRef = useRef<any>(null);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const updateBadge = (count: number) => {
    if ("setAppBadge" in navigator) {
      if (count > 0) {
        (navigator as any).setAppBadge(count);
      } else {
        (navigator as any).clearAppBadge();
      }
    }
  };

  const showPushNotification = async (title: string, body: string, icon?: string) => {
    if (Notification.permission === "granted" && document.hidden) {
      new Notification(title, { body, icon: icon || '/favicon.ico' });
    }
  };

  useEffect(() => {
    const start = async () => {
      const logMetric = async (name: string, value: number) => {
        fetch('/api/metrics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ metric_name: name, value, user_id: userProfile?.id })
        }).catch(console.error);
      };

      const bootTask = async () => {
        await initDatabase();
        // Track install metrics
        fetch('/api/metrics').catch(console.error);
        // Log user activity
        logMetric('user_activity', 1);
        await loadDataFromDb();
      };
      await bootTask();
      setDbReady(true);
      
      setTimeout(() => {
        if ((window as any).deferredPrompt) {
          window.dispatchEvent(new Event('pwa-install-available'));
        }
      }, 3000);
    };
    start();

    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    const syncInterval = setInterval(loadDataFromDb, 2000);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearInterval(syncInterval);
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated && userProfile) {
      const socket = initSocket(userProfile.id) as any;
      socketRef.current = socket;

      socket.on("receive_message", async (data: any) => {
        const timestamp = data.timestamp || Date.now();
        await dbRun(
          "INSERT INTO messages (id, contact_id, role, content, timestamp, type, mediaUrl, fileName, fileSize, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [data.id, data.contact_id || data.senderId, 'assistant', data.content, timestamp, data.type || 'text', data.mediaUrl, data.fileName, data.fileSize, 'delivered']
        );
        
        const sender = contacts.find(c => c.id === (data.contact_id || data.senderId));
        const decText = await decryptContent(data.content);
        if (userProfile.settings.notifications) {
          showPushNotification(sender?.name || "Zenj Message", decText, sender?.avatar);
        }
        await loadDataFromDb();
      });

      socket.on("broadcast", async (data: any) => {
        const timestamp = Date.now();
        const encrypted = await encryptContent(`📢 System Signal: ${data.content}`);
        await dbRun(
          "INSERT INTO messages (id, contact_id, role, content, timestamp, type, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [`broadcast-${timestamp}-${Math.random().toString(36).substr(2, 9)}`, 'zenj-main', 'assistant', encrypted, timestamp, 'text', 'delivered']
        );
        if (userProfile.settings.notifications) {
          showPushNotification("Zenj System", data.content);
        }
        await loadDataFromDb();
      });
      socket.on("user_status", loadDataFromDb);
      socket.on("user_added", loadDataFromDb);
      socket.on("new_notification", (notif) => setNotifications(prev => [notif, ...prev.filter(n => n.id !== notif.id)]));
      socket.on("update_notification", (notif) => setNotifications(prev => prev.map(n => n.id === notif.id ? notif : n)));
      socket.on("delete_notification", ({ id }) => setNotifications(prev => prev.filter(n => n.id !== id)));
    }
  }, [isAuthenticated, userProfile?.id, contacts]);

  useEffect(() => {
    const unread = contacts.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
    updateBadge(unread);
  }, [contacts]);

  // Handle Dynamic Theme Colors
  useEffect(() => {
    if (userProfile?.settings) {
      const color = userProfile.settings.customThemeColor || '#00a884';
      document.documentElement.style.setProperty('--zen-green', color);
      
      // Also inject a style tag for the .theme-custom background if chosen
      if (userProfile.settings.theme === 'custom') {
        let styleEl = document.getElementById('zen-custom-theme-style');
        if (!styleEl) {
          styleEl = document.createElement('style');
          styleEl.id = 'zen-custom-theme-style';
          document.head.appendChild(styleEl);
        }
        styleEl.innerHTML = `
          .theme-custom { background-color: ${color}22 !important; }
          .theme-custom .bg-\[\#0b141a\], .theme-custom .bg-\[\#111b21\] { background-color: ${color}11 !important; }
          .theme-custom .bg-\[\#202c33\], .theme-custom .bg-\[\#2a3942\] { background-color: ${color}22 !important; }
        `;
      }
    }
  }, [userProfile?.settings]);

  const loadDataFromDb = async () => {
    const [profileRows, messageRows, contactRows, dirRows, momentRows, notifRows] = await Promise.all([
      dbQuery("SELECT * FROM profile LIMIT 1"),
      dbQuery("SELECT * FROM messages ORDER BY timestamp DESC LIMIT 2000"),
      dbQuery("SELECT * FROM contacts ORDER BY lastMessageTime DESC"),
      dbQuery("SELECT * FROM directory_users"),
      dbQuery("SELECT * FROM moments ORDER BY timestamp DESC LIMIT 100"),
      fetch('/api/notifications').then(r => r.json()).catch(() => [])
    ]);

    if (profileRows.length > 0) {
      const p = profileRows[0] as any;
      const remoteUser = (dirRows as any[]).find(u => u.id === p.id || u.id === 'me');
      const accountStatus = remoteUser?.accountStatus || p.accountStatus;

      if (accountStatus === 'suspended' || accountStatus === 'banned') {
         setIsAuthenticated(false);
         showNotification(`Your account is currently ${accountStatus.toUpperCase()}. Contact the Zenj Council.`, [], 'error');
         return;
      }

      setUserProfile({
        ...p,
        accountStatus,
        accountType: p.accountType || 'member',
        settings: p.settings_json ? { ...DEFAULT_SETTINGS, ...JSON.parse(p.settings_json) } : DEFAULT_SETTINGS
      });
    }

    const convos: Record<string, Message[]> = {};
    messageRows.sort((a: any, b: any) => a.timestamp - b.timestamp).forEach((m: any) => {
      const cId = m.contact_id;
      if (!convos[cId]) convos[cId] = [];
      convos[cId].push({ ...m, reactions: m.reactions_json ? JSON.parse(m.reactions_json) : {} });
    });
    setConversations(convos);

    setContacts(contactRows.map((c: any) => {
      const unreadCount = (convos[c.id] || []).filter(m => m.role === 'assistant' && m.status !== 'read').length;
      
      // Merge live status from directory if available
      const dirUser = (dirRows as any[]).find(u => u.id === c.id || (c.phone && u.phone === c.phone));
      const liveStatus = dirUser ? dirUser.status : c.status;

      return {
        ...c,
        status: liveStatus,
        isGroup: !!c.isGroup,
        members: c.members_json ? JSON.parse(c.members_json) : [],
        isBlocked: !!c.isBlocked,
        unreadCount
      };
    }));

    setDirectoryUsers(dirRows);
    setMoments(momentRows);
    setNotifications(notifRows);
  };

  const handleRegister = async (data: any) => {
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone,
          password: data.password
        })
      });
      const result = await response.json();
      if (response.ok) {
        const newProfile: UserProfile = {
          id: result.userId,
          name: data.name,
          phone: data.phone,
          email: data.email,
          password: data.password,
          bio: data.bio,
          avatar: data.avatar,
          role: 'user',
          accountType: 'member',
          accountStatus: 'active',
          settings: DEFAULT_SETTINGS
        };
        // Save to local profile for the app to work
        await dbRun(
          "INSERT INTO profile (id, name, phone, email, password, bio, avatar, role, accountStatus, settings_json, accountType) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [newProfile.id, newProfile.name, newProfile.phone, newProfile.email, newProfile.password, newProfile.bio, newProfile.avatar, newProfile.role, newProfile.accountStatus, JSON.stringify(newProfile.settings), newProfile.accountType]
        );
        setUserProfile(newProfile);
        await deriveKeyFromPassword(data.password, data.email);
        setIsAuthenticated(true);
      } else {
        showNotification(result.error, [], 'error');
      }
    } catch (err) {
      showNotification('Registration failed', [], 'error');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!(await confirm('Are you sure you want to delete this message?'))) return;

    try {
      await dbRun("DELETE FROM messages WHERE id = ?", [messageId]);
      // Update conversations state directly
      setConversations(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(chatId => {
          updated[chatId] = updated[chatId].filter(msg => msg.id !== messageId);
        });
        return updated;
      });
      showNotification("Message deleted", [], 'success');
    } catch (error) {
      console.error('Delete message error:', error);
      showNotification("Failed to delete message", [], 'error');
    }
  };

  const handleLogout = () => {
    // Disconnect socket if connected
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    // Set authenticated to false to show login screen
    setIsAuthenticated(false);
  };

  const handleSendMessage = async (content: string, imageUrl?: string, audioUrl?: string, replyTo?: { id: string, text: string }, videoUrl?: string, file?: { url: string, name: string, size: number }) => {
    if (!activeContactId || !userProfile) return;
    if (userProfile.accountStatus !== 'active' && userProfile.accountStatus !== 'warned') {
        showNotification("Manifestation restricted: Account suspended.", [], 'error');
        return;
    }
    const activeContact = contacts.find(c => c.id === activeContactId);
    if (!activeContact) return;

    // Check file size limit
    if (file && file.size > 50 * 1024 * 1024) { // 50MB limit
      showNotification("File too large. Maximum size is 50MB.", [], 'error');
      return;
    }

    const timestamp = Date.now();
    const type = file ? 'file' : (audioUrl ? 'audio' : (imageUrl ? 'image' : (videoUrl ? 'video' : 'text')));
    const mediaUrl = file?.url || audioUrl || imageUrl || videoUrl;
    const msgId = `${timestamp}-${Math.random().toString(36).substr(2, 9)}`;

    // Immediate UI feedback - add message to state optimistically
    const optimisticMessage = {
      id: msgId,
      role: 'user' as const,
      content: content || (type === 'file' ? `File: ${file?.name}` : type.toUpperCase()),
      timestamp,
      type,
      mediaUrl,
      fileName: file?.name,
      fileSize: file?.size,
      status: 'sending' as const,
      reply_to_id: replyTo?.id,
      reply_to_text: replyTo?.text
    };
    setConversations(prev => ({
      ...prev,
      [activeContactId]: [...(prev[activeContactId] || []), optimisticMessage]
    }));

    if (userProfile.settings.vibrations && navigator.vibrate) {
      navigator.vibrate(20);
    }

    // Process encryption and database operations asynchronously
    (async () => {
      try {
        let finalMediaUrl = mediaUrl;

        // Handle large files that weren't pre-processed
        if (file && !mediaUrl && (file as any).file) {
          const actualFile = (file as any).file;
          finalMediaUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(actualFile);
          });
        }

        // Encrypt content (caption) if it exists, otherwise use a fallback based on type
        const encryptedContent = await encryptContent(content || (type === 'file' ? `File: ${file?.name}` : type.toUpperCase()));

        // Insert message into database
        await dbRun(
          "INSERT INTO messages (id, contact_id, role, content, timestamp, type, mediaUrl, fileName, fileSize, status, reply_to_id, reply_to_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [msgId, activeContactId, 'user', encryptedContent, timestamp, type, finalMediaUrl, file?.name, file?.size, 'sent', replyTo?.id, replyTo?.text]
        );

        // Update message status in state
        setConversations(prev => ({
          ...prev,
          [activeContactId]: (prev[activeContactId] || []).map(msg =>
            msg.id === msgId ? { ...msg, status: 'sent' as const, content: encryptedContent } : msg
          )
        }));

        // Send via socket for real-time delivery (only for non-main chats)
        if (!activeContactId.includes('main')) {
          emitMessage({
            id: msgId,
            content: encryptedContent,
            senderId: userProfile.id,
            recipientId: activeContactId,
            timestamp,
            type,
            mediaUrl: finalMediaUrl,
            fileName: file?.name,
            fileSize: file?.size
          });
        }

        // Handle AI responses for main chat
        if (activeContactId === 'zenj-main') {
          setIsTyping(true);
          try {
            let responseText = await generateResponse(content, conversations[activeContactId] || [], activeContact.systemInstruction, imageUrl);
            const encryptedResponse = await encryptContent(responseText);
            const responseId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            await dbRun("INSERT INTO messages (id, contact_id, role, content, timestamp, type, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
              [responseId, activeContactId, 'assistant', encryptedResponse, Date.now(), 'text', 'delivered']);
            // Update conversations state directly instead of full reload
            setConversations(prev => ({
              ...prev,
              [activeContactId]: [...(prev[activeContactId] || []), {
                id: responseId,
                role: 'assistant',
                content: encryptedResponse,
                timestamp: Date.now(),
                type: 'text',
                status: 'delivered'
              }]
            }));
          } catch (e) {
            console.error('AI response error:', e);
          } finally {
            setIsTyping(false);
          }
        }
      } catch (error) {
        console.error('Failed to send message:', error);
        // Update message status to failed
        setConversations(prev => ({
          ...prev,
          [activeContactId]: (prev[activeContactId] || []).map(msg =>
            msg.id === msgId ? { ...msg, status: 'failed' as const } : msg
          )
        }));
        showNotification('Failed to send message', [], 'error');
      }
    })();
  };

  const handleAddMoment = async (content: string, mediaUrl?: string) => {
    const momentId = `moment-${Date.now()}`;
    await dbRun(
      "INSERT INTO moments (id, userId, userName, userAvatar, content, mediaUrl, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [momentId, userProfile!.id, userProfile!.name, userProfile!.avatar, content, mediaUrl || null, Date.now()]
    );
    await loadDataFromDb();
  };

  const handleViewProfile = async (userId: string) => {
    const profile = directoryUsers.find(u => u.id === userId);
    if (profile) {
      setViewedProfile({
        ...profile,
        role: 'user',
        password: '', // Not shown
        settings: DEFAULT_SETTINGS
      });
      setMode(AppMode.PROFILE);
    }
  };

  const handleCheckInStore = async (sellerId: string, sellerName: string, sellerAvatar: string) => {
    if (sellerId === userProfile?.id) {
        showNotification("This is your own manifestation.", [], 'warning');
        return;
    }
    const existing = contacts.find(c => c.id === sellerId);
    if (!existing) {
       await dbRun("INSERT INTO contacts (id, name, avatar, status, lastMessageSnippet, lastMessageTime) VALUES (?, ?, ?, ?, ?, ?)", [sellerId, sellerName, sellerAvatar, 'offline', 'Check in Store triggered.', Date.now()]);
       await loadDataFromDb();
    }
    setActiveContactId(sellerId);
    setMode(AppMode.CHATS);
  };

  const totalUnread = contacts.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  const renderContent = () => {
    switch (mode) {
      case AppMode.CHATS:
        const activeContact = contacts.find(c => c.id === activeContactId);
        if (isMobile && activeContactId && activeContact) {
          return (
            <ChatView
              contact={activeContact}
              messages={conversations[activeContactId] || []}
              onSendMessage={handleSendMessage}
              onMarkAsRead={(mid) => dbRun("UPDATE messages SET status='read' WHERE id=?", [mid]).then(loadDataFromDb)}
              onReactToMessage={() => {}}
              onDeleteMessage={handleDeleteMessage}
              onStartCall={(t) => setCall({ isActive: true, type: t, contact: activeContact })}
              onBlockContact={() => {}}
              onOpenGroupSettings={() => {}}
              isTyping={isTyping}
              onBack={() => setActiveContactId(null)}
              userProfile={userProfile!}
            />
          );
        }
        if (!activeContactId && isMobile) {
          return (
            <Sidebar 
              contacts={contacts} 
              activeContactId={activeContactId} 
              onSelectContact={setActiveContactId} 
              mode={mode} setMode={setMode} 
              userProfile={userProfile!} 
              onOpenAddFriend={() => setIsAddFriendModalOpen(true)} 
              onOpenCreateGroup={() => setIsCreateGroupModalOpen(true)} 
              conversations={conversations} 
            />
          );
        }
        return (
          <div className="flex h-full w-full">
            {!isMobile && (
              <Sidebar 
                contacts={contacts} 
                activeContactId={activeContactId} 
                onSelectContact={setActiveContactId} 
                mode={mode} setMode={setMode} 
                userProfile={userProfile!} 
                onOpenAddFriend={() => setIsAddFriendModalOpen(true)} 
                onOpenCreateGroup={() => setIsCreateGroupModalOpen(true)} 
                conversations={conversations} 
              />
            )}
            <div className="flex-1 h-full bg-[#0b141a]">
              {activeContact ? (
                <ChatView
                  contact={activeContact}
                  messages={conversations[activeContactId] || []}
                  onSendMessage={handleSendMessage}
                  onMarkAsRead={(mid) => dbRun("UPDATE messages SET status='read' WHERE id=?", [mid]).then(loadDataFromDb)}
                  onReactToMessage={() => {}}
                  onDeleteMessage={handleDeleteMessage}
                  onStartCall={(t) => setCall({ isActive: true, type: t, contact: activeContact })}
                  onBlockContact={() => {}}
                  onOpenGroupSettings={() => {}}
                  isTyping={isTyping}
                  userProfile={userProfile!}
                />
              ) : null}
            </div>
          </div>
        );
      case AppMode.STATUS:
        return <StatusView moments={moments} onAddMoment={handleAddMoment} onViewProfile={handleViewProfile} userProfile={userProfile!} />;
      case AppMode.DISCOVERY:
        return <DiscoveryView users={directoryUsers} onConnect={(u) => dbRun("INSERT INTO contacts (id, name, avatar, status, lastMessageSnippet, lastMessageTime) VALUES (?, ?, ?, ?, ?, ?)", [u.id, u.name, u.avatar, 'online', 'Connected.', Date.now()]).then(() => { loadDataFromDb(); setMode(AppMode.CHATS); setActiveContactId(u.id); })} connectedIds={contacts.map(c => c.id)} currentUser={userProfile!} onOpenAddFriend={() => setIsAddFriendModalOpen(true)} />;
      case AppMode.ZEN_SPACE:
        return <MarketplaceView userProfile={userProfile!} onCheckInStore={handleCheckInStore} />;
      case AppMode.PROFILE:
        return <ProfileView profile={viewedProfile || userProfile!} onUpdate={(p) => dbRun("UPDATE profile SET name=?, phone=?, email=?, bio=?, avatar=?, accountType=? WHERE id=?", [p.name, p.phone, p.email, p.bio, p.avatar, p.accountType, p.id]).then(() => { loadDataFromDb(); setViewedProfile(null); })} onBack={() => { setMode(AppMode.STATUS); setViewedProfile(null); }} isReadOnly={!!viewedProfile} />;
      case AppMode.SETTINGS:
        return <SettingsView profile={userProfile!} contacts={contacts} onBack={() => setMode(AppMode.CHATS)} onUpdateSettings={(s) => dbRun("UPDATE profile SET settings_json = ? WHERE id = ?", [JSON.stringify({...userProfile!.settings, ...s}), userProfile!.id]).then(loadDataFromDb)} onUpdateProfile={(p) => dbRun("UPDATE profile SET name=?, phone=?, email=?, bio=?, avatar=?, accountType=? WHERE id=?", [p.name, p.phone, p.email, p.bio, p.avatar, p.accountType, userProfile!.id]).then(loadDataFromDb)} onUpdatePassword={(p) => dbRun("UPDATE profile SET password=? WHERE id=?", [p, userProfile!.id]).then(loadDataFromDb)} onUnblockContact={() => {}} onClearData={() => { localStorage.clear(); window.location.reload(); }} onOpenAdmin={() => setMode(AppMode.ADMIN_DASHBOARD)} onLogout={handleLogout} />;
      case AppMode.ADMIN_DASHBOARD:
        return <AdminDashboard onBack={() => setMode(AppMode.SETTINGS)} onBroadcast={(c) => socketRef.current?.emit("broadcast", { content: c })} tools={[]} loadTools={async () => await fetch('/api/tools').then(r => r.json()).catch(() => [])} />;
      default:
        return null;
    }
  };

  if (!dbReady) return (
    <div className="h-screen bg-[#0b141a] flex flex-col items-center justify-center space-y-4">
      <Loader2 className="animate-spin text-[#00a884]" size={48} />
      <p className="text-[#8696a0] font-outfit uppercase tracking-widest text-xs">Synchronizing Pulse</p>
    </div>
  );

  const s = userProfile?.settings || DEFAULT_SETTINGS;

  return (
    <div className={`flex h-screen overflow-hidden font-sans text-[#f8fafc] theme-${s.theme} ${s.fontSize} brightness-${s.brightness}`}>
      <PWAInstallBanner />
      {!userProfile ? <Onboarding onComplete={handleRegister} /> :
      !isAuthenticated ? <Login profile={userProfile} onLogin={async (p) => {
        if (p === userProfile.password) {
          await deriveKeyFromPassword(p, userProfile.email);
          setIsAuthenticated(true);
          return true;
        } return false;
      }} onRegister={handleRegister} /> : (
        <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-[#0b141a]">
          {call.isActive && call.contact && <LiveCallOverlay contact={call.contact} type={call.type} onEnd={() => setCall({ isActive: false, type: null, contact: null })} currentUserId={userProfile?.id || ''} />}
          <AddFriendModal isOpen={isAddFriendModalOpen} onClose={() => setIsAddFriendModalOpen(false)} onAdd={(p) => dbRun("INSERT INTO contacts (id, name, avatar, status, lastMessageSnippet, lastMessageTime) VALUES (?, ?, ?, ?, ?, ?)", [`f-${Date.now()}`, p, `https://api.dicebear.com/7.x/avataaars/svg?seed=${p}`, 'offline', 'Hello!', Date.now()]).then(loadDataFromDb)} userName={userProfile.name} />
          <CreateGroupModal isOpen={isCreateGroupModalOpen} onClose={() => setIsCreateGroupModalOpen(false)} contacts={contacts} onCreate={(n, m) => dbRun("INSERT INTO contacts (id, name, avatar, status, isGroup, members_json, lastMessageSnippet, lastMessageTime) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [`g-${Date.now()}`, n, `https://api.dicebear.com/7.x/initials/svg?seed=${n}`, 'active', 1, JSON.stringify(m), 'Group created.', Date.now()]).then(loadDataFromDb)} />
          {notifications.filter(n => n.active && !dismissedNotifications.has(n.id)).slice(0, 1).map(notif => (
            <div key={notif.id} className={`bg-${notif.type === 'error' ? 'rose' : notif.type === 'warning' ? 'amber' : notif.type === 'success' ? 'emerald' : 'blue'}-500/10 border-b border-${notif.type === 'error' ? 'rose' : notif.type === 'warning' ? 'amber' : notif.type === 'success' ? 'emerald' : 'blue'}-500/20 p-4 flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full bg-${notif.type === 'error' ? 'rose' : notif.type === 'warning' ? 'amber' : notif.type === 'success' ? 'emerald' : 'blue'}-500`}></div>
                <div>
                  <h4 className="font-bold text-white">{notif.title}</h4>
                  <p className="text-sm text-[#8696a0]">{notif.message}</p>
                </div>
              </div>
              <button onClick={() => setDismissedNotifications(prev => new Set([...prev, notif.id]))} className="text-[#8696a0] hover:text-white p-1"><X size={16} /></button>
            </div>
          ))}
          <main className="flex-1 h-full overflow-hidden">
            {renderContent()}
          </main>
          {(!isMobile || !activeContactId) && (
            <BottomNav 
              currentMode={mode} 
              setMode={(m) => { setMode(m); setActiveContactId(null); }} 
              unreadCount={totalUnread} 
            />
          )}
        </div>
      )}
    </div>
  );
};

export default App;
