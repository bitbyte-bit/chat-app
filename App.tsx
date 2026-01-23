
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Contact, Message, AppMode, CallState, 
  UserProfile, Moment, AppSettings 
} from './types';
import Sidebar from './components/Sidebar';
import ChatView from './components/ChatView';
import ImageGenView from './components/ImageGenView';
import ProfileView from './components/ProfileView';
import LiveCallOverlay from './components/LiveCallOverlay';
import AddFriendModal from './components/AddFriendModal';
import CreateGroupModal from './components/CreateGroupModal';
import StatusView from './components/StatusView';
import GroupSettingsView from './components/GroupSettingsView';
import SettingsView from './components/SettingsView';
import Onboarding from './components/Onboarding';
import DiscoveryView from './components/DiscoveryView';
import Login from './components/Login';
import PWAInstallBanner from './components/PWAInstallBanner';
import { generateResponse } from './services/gemini';
import { initDatabase, saveDatabase, getDb, dbQuery, dbRun } from './services/database';
import { deriveKeyFromPassword, encryptContent, decryptContent } from './services/crypto';
import { initSocket, emitMessage, emitReadReceipt } from './services/socket';
import { Sparkles, MessageSquare, CircleDashed, UserPlus, Settings as SettingsIcon, Loader2, Compass } from 'lucide-react';

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  wallpaper: '',
  vibrations: true,
  notifications: true
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
  
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [call, setCall] = useState<CallState>({ isActive: false, type: null, contact: null });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const socketRef = useRef<any>(null);

  useEffect(() => {
    const start = async () => {
      await initDatabase();
      loadDataFromDb();
      setDbReady(true);
    };
    start();
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Socket and Multi-user Simulation Logic
  useEffect(() => {
    if (isAuthenticated && userProfile) {
      const socket = initSocket(userProfile.id);
      socketRef.current = socket;

      socket.on("receive_message", async (data: any) => {
        // Save received message and its media content locally on the device's DB
        const timestamp = data.timestamp || Date.now();
        dbRun(
          "INSERT INTO messages (id, contact_id, role, content, timestamp, type, mediaUrl, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [data.id, data.senderId, 'assistant', data.content, timestamp, data.type || 'text', data.mediaUrl, 'delivered']
        );
        dbRun("UPDATE contacts SET lastMessageSnippet = ?, lastMessageTime = ? WHERE id = ?", [data.content.slice(0, 40), timestamp, data.senderId]);
        saveDatabase();
        loadDataFromDb();
      });

      socket.on("message_read", (data: { messageId: string, contactId: string }) => {
        dbRun("UPDATE messages SET status = 'read' WHERE id = ?", [data.messageId]);
        saveDatabase();
        loadDataFromDb();
      });
    }
  }, [isAuthenticated, userProfile]);

  useEffect(() => {
    if (userProfile && isAuthenticated) {
      const ogImage = document.getElementById('og-image');
      const ogTitle = document.getElementById('og-title');
      const ogDesc = document.getElementById('og-description');
      if (ogImage) ogImage.setAttribute('content', userProfile.avatar);
      if (ogTitle) ogTitle.setAttribute('content', `${userProfile.name} on Zenj`);
      if (ogDesc) ogDesc.setAttribute('content', userProfile.bio || 'Chat with me on Zenj');
    }
  }, [userProfile, isAuthenticated]);

  const loadDataFromDb = () => {
    const profileRows = dbQuery("SELECT * FROM profile LIMIT 1");
    if (profileRows.length > 0) {
      const p = profileRows[0] as any;
      setUserProfile({
        ...p,
        settings: p.settings_json ? JSON.parse(p.settings_json) : DEFAULT_SETTINGS
      });
    }

    const contactRows = dbQuery("SELECT * FROM contacts ORDER BY lastMessageTime DESC");
    setContacts(contactRows.map((c: any) => ({
      ...c,
      isInvitePlaceholder: !!c.isInvitePlaceholder,
      isGroup: !!c.isGroup,
      members: c.members_json ? JSON.parse(c.members_json) : [],
      isBlocked: !!c.isBlocked,
      hideDetails: !!c.hideDetails
    })));

    const momentRows = dbQuery("SELECT * FROM moments ORDER BY timestamp DESC");
    setMoments(momentRows as any);

    const messageRows = dbQuery("SELECT * FROM messages ORDER BY timestamp ASC");
    const convos: Record<string, Message[]> = {};
    messageRows.forEach((m: any) => {
      if (!convos[m.contact_id]) convos[m.contact_id] = [];
      convos[m.contact_id].push({
        ...m,
        reactions: m.reactions_json ? JSON.parse(m.reactions_json) : {}
      });
    });
    setConversations(convos);

    const dirRows = dbQuery("SELECT * FROM directory_users");
    setDirectoryUsers(dirRows);
  };

  const handleSendMessage = async (content: string, imageUrl?: string, audioUrl?: string, replyTo?: { id: string, text: string }, videoUrl?: string) => {
    if (!activeContactId || !userProfile) return;
    const activeContact = contacts.find(c => c.id === activeContactId);
    if (!activeContact) return;
    const timestamp = Date.now();
    const messageId = timestamp.toString();
    
    // Encrypt content before local storage for privacy
    const encryptedContent = await encryptContent(audioUrl ? 'Voice note' : (videoUrl ? 'Video clip' : content));
    const mediaUrl = audioUrl || imageUrl || videoUrl;
    const type = audioUrl ? 'audio' : (imageUrl ? 'image' : (videoUrl ? 'video' : 'text'));
    
    // All shared media is stored locally in the database as part of the message object
    dbRun(
      "INSERT INTO messages (id, contact_id, role, content, timestamp, type, mediaUrl, status, reply_to_id, reply_to_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [messageId, activeContactId, 'user', encryptedContent, timestamp, type, mediaUrl, 'sent', replyTo?.id, replyTo?.text]
    );

    if (activeContactId.startsWith('u-')) {
       emitMessage({
         id: messageId,
         senderId: userProfile.id,
         recipientId: activeContactId,
         content: encryptedContent,
         timestamp,
         type,
         mediaUrl
       });
    }
    
    setIsTyping(true);
    saveDatabase();
    loadDataFromDb();
    
    if (!activeContactId.startsWith('u-') || activeContactId === 'zenj-main') {
      try {
        let responseText = activeContact.isGroup ? `Zen Guardian: Acknowledged.` : await generateResponse(content, conversations[activeContactId] || [], activeContact.systemInstruction, imageUrl);
        const assistantId = (Date.now() + 1).toString();
        const encryptedResponse = await encryptContent(responseText);
        
        dbRun("INSERT INTO messages (id, contact_id, role, content, timestamp, type, status) VALUES (?, ?, ?, ?, ?, ?, ?)", [assistantId, activeContactId, 'assistant', encryptedResponse, Date.now(), 'text', 'delivered']);
        dbRun("UPDATE contacts SET lastMessageSnippet = ?, lastMessageTime = ? WHERE id = ?", [responseText.slice(0, 40), Date.now(), activeContactId]);
        
        saveDatabase();
        loadDataFromDb();
      } catch (error) { 
        console.error(error); 
      } finally { 
        setIsTyping(false); 
      }
    } else {
      setIsTyping(false);
    }
  };

  const handleMarkAsRead = (messageId: string, contactId: string) => {
    dbRun("UPDATE messages SET status = 'read' WHERE id = ?", [messageId]);
    if (contactId.startsWith('u-') && userProfile) {
       emitReadReceipt({ messageId, contactId, userId: userProfile.id });
    }
    saveDatabase();
    loadDataFromDb();
  };

  const handleRegister = async (profileData: { name: string; phone: string; email: string; password: string; bio: string; avatar: string }) => {
    const settingsJson = JSON.stringify(DEFAULT_SETTINGS);
    dbRun(
      "INSERT INTO profile (id, name, phone, email, password, bio, avatar, settings_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      ['me', profileData.name, profileData.phone, profileData.email, profileData.password, profileData.bio, profileData.avatar, settingsJson]
    );
    saveDatabase();
    await deriveKeyFromPassword(profileData.password, profileData.email);
    loadDataFromDb();
    setIsAuthenticated(true);
  };

  const handleLoginAttempt = async (password: string): Promise<boolean> => {
    if (userProfile && password === userProfile.password) {
      await deriveKeyFromPassword(password, userProfile.email);
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  // Derived state for active contact and its messages
  const activeContact = contacts.find(c => c.id === activeContactId);
  const activeMessages = activeContactId ? (conversations[activeContactId] || []) : [];

  if (!dbReady) return (
    <div className="h-screen bg-[#0b141a] flex flex-col items-center justify-center space-y-4">
      <Loader2 className="animate-spin text-[#00a884]" size={48} />
      <p className="text-[#8696a0] font-outfit uppercase tracking-widest text-xs">Initializing Zenj</p>
    </div>
  );

  return (
    <div className={`flex flex-col md:flex-row h-screen overflow-hidden font-sans text-[#f8fafc] theme-${userProfile?.settings?.theme || 'dark'}`}>
      <PWAInstallBanner />
      
      {!userProfile ? (
        <Onboarding onComplete={handleRegister} />
      ) : !isAuthenticated ? (
        <Login profile={userProfile} onLogin={handleLoginAttempt} />
      ) : (
        <>
          {call.isActive && call.contact && <LiveCallOverlay contact={call.contact} type={call.type} onEnd={() => setCall({ isActive: false, type: null, contact: null })} />}
          <AddFriendModal isOpen={isAddFriendModalOpen} onClose={() => setIsAddFriendModalOpen(false)} onAdd={(p) => {
             const id = `f-${Date.now()}`;
             dbRun("INSERT INTO contacts (id, name, avatar, status, lastMessageSnippet, lastMessageTime, systemInstruction, phone, isInvitePlaceholder) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [id, p, `https://api.dicebear.com/7.x/avataaars/svg?seed=${p}`, 'offline', 'Invite shared.', Date.now(), 'Zen Friend.', p, 1]);
             saveDatabase(); loadDataFromDb();
          }} userName={userProfile.name} />
          
          <CreateGroupModal isOpen={isCreateGroupModalOpen} onClose={() => setIsCreateGroupModalOpen(false)} contacts={contacts} onCreate={(name, members) => {
            const id = `g-${Date.now()}`;
            dbRun("INSERT INTO contacts (id, name, avatar, status, lastMessageSnippet, lastMessageTime, systemInstruction, isGroup, members_json, ownerId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [id, name, `https://api.dicebear.com/7.x/initials/svg?seed=${name}`, 'online', 'Group created.', Date.now(), 'Guardian.', 1, JSON.stringify([...members, 'me']), 'me']);
            saveDatabase(); loadDataFromDb(); setActiveContactId(id); setMode(AppMode.CHATS);
          }} />

          <div className="flex-1 flex overflow-hidden h-full">
            {(!isMobile || (!activeContactId && mode === AppMode.CHATS)) && (
              <div className={`${isMobile ? 'w-full' : 'w-full md:w-[30%] md:min-w-[350px] md:max-w-[450px]'} h-full flex flex-col border-r border-[#222d34]`}>
                <Sidebar 
                  contacts={contacts} 
                  activeContactId={activeContactId} 
                  onSelectContact={(id) => { setActiveContactId(id); setMode(AppMode.CHATS); }} 
                  mode={mode} setMode={setMode} userProfile={userProfile} 
                  onOpenAddFriend={() => setIsAddFriendModalOpen(true)} 
                  onOpenCreateGroup={() => setIsCreateGroupModalOpen(true)} 
                  conversations={conversations} 
                />
              </div>
            )}

            {(!isMobile || activeContactId || mode !== AppMode.CHATS) && (
              <div className={`flex-1 h-full relative overflow-hidden bg-[#0b141a] ${isMobile && !activeContactId && mode === AppMode.CHATS ? 'hidden' : ''}`}>
                {mode === AppMode.CHATS && activeContact && (
                  <ChatView 
                    contact={activeContact} 
                    messages={activeMessages} 
                    onSendMessage={handleSendMessage} 
                    onMarkAsRead={handleMarkAsRead}
                    onReactToMessage={() => {}} 
                    onStartCall={(t) => setCall({ isActive: true, type: t, contact: activeContact })} 
                    onBlockContact={(id) => { dbRun("UPDATE contacts SET isBlocked = 1 WHERE id = ?", [id]); saveDatabase(); loadDataFromDb(); setActiveContactId(null); }} 
                    onOpenGroupSettings={() => setMode(AppMode.GROUP_SETTINGS)} 
                    isTyping={isTyping} 
                    onBack={() => setActiveContactId(null)} 
                    userProfile={userProfile} 
                  />
                )}
                {mode === AppMode.DISCOVERY && (
                  <DiscoveryView users={directoryUsers} onConnect={(u) => {
                    dbRun("INSERT INTO contacts (id, name, avatar, status, lastMessageSnippet, lastMessageTime, systemInstruction) VALUES (?, ?, ?, ?, ?, ?, ?)", [u.id, u.name, u.avatar, 'online', 'Connected.', Date.now(), u.bio]);
                    saveDatabase(); loadDataFromDb(); setMode(AppMode.CHATS); setActiveContactId(u.id);
                  }} connectedIds={contacts.map(c => c.id)} currentUser={userProfile} />
                )}
                {mode === AppMode.SETTINGS && (
                  <SettingsView 
                    profile={userProfile} 
                    contacts={contacts} 
                    onBack={() => setMode(AppMode.CHATS)} 
                    onUpdateSettings={(s) => {
                      const newP = { ...userProfile, settings: { ...userProfile.settings, ...s } };
                      setUserProfile(newP);
                      dbRun("UPDATE profile SET settings_json = ? WHERE id = 'me'", [JSON.stringify(newP.settings)]);
                      saveDatabase();
                    }} 
                    onUpdateProfile={(p) => {
                      setUserProfile(p);
                      dbRun("UPDATE profile SET name=?, phone=?, email=?, bio=?, avatar=? WHERE id='me'", [p.name, p.phone, p.email, p.bio, p.avatar]);
                      saveDatabase();
                    }}
                    onUpdatePassword={async (newPass) => {
                      dbRun("UPDATE profile SET password = ? WHERE id = 'me'", [newPass]);
                      setUserProfile({ ...userProfile, password: newPass });
                      await deriveKeyFromPassword(newPass, userProfile.email);
                      saveDatabase();
                    }} 
                    onUnblockContact={(cid) => { dbRun("UPDATE contacts SET isBlocked = 0 WHERE id = ?", [cid]); saveDatabase(); loadDataFromDb(); }} 
                    onClearData={() => { if(confirm("Erase all data and reset identity?")) { localStorage.clear(); window.location.reload(); } }} 
                  />
                )}
                {mode === AppMode.ZEN_SPACE && <ImageGenView />}
                {mode === AppMode.PROFILE && (
                  <ProfileView 
                    profile={userProfile} 
                    onUpdate={(p) => { 
                      setUserProfile(p); 
                      dbRun("UPDATE profile SET name=?, phone=?, email=?, bio=?, avatar=? WHERE id='me'", [p.name, p.phone, p.email, p.bio, p.avatar]); 
                      saveDatabase(); 
                    }} 
                    onBack={() => setMode(AppMode.CHATS)} 
                  />
                )}
                {mode === AppMode.STATUS && (
                  <StatusView 
                    moments={moments} 
                    onAddMoment={(c, m) => {
                      const id = `m-${Date.now()}`;
                      dbRun("INSERT INTO moments (id, userId, userName, userAvatar, content, mediaUrl, timestamp, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [id, 'me', userProfile.name, userProfile.avatar, c, m, Date.now(), m ? 'image' : 'text']);
                      saveDatabase(); loadDataFromDb();
                    }} 
                    userProfile={userProfile} 
                  />
                )}
                
                {mode === AppMode.CHATS && !activeContact && !isMobile && (
                  <div className="h-full flex flex-col items-center justify-center bg-[#0b141a] p-12 text-center">
                    <div className="w-24 h-24 bg-emerald-500/10 rounded-[40px] flex items-center justify-center mb-6">
                      <Sparkles size={48} className="text-[#00a884]" />
                    </div>
                    <h1 className="text-3xl font-bold font-outfit mb-2">Zenj Chat</h1>
                    <p className="text-[#8696a0] max-w-sm">E2EE messaging active with Real-time AI. Select a contact to begin.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {isMobile && !activeContactId && mode !== AppMode.GROUP_SETTINGS && mode !== AppMode.PROFILE && (
            <div className="md:hidden fixed bottom-0 left-0 right-0 h-[70px] bg-[#202c33]/90 backdrop-blur-xl border-t border-white/5 flex items-center justify-around px-2 z-[60] safe-bottom">
              <button onClick={() => { setMode(AppMode.CHATS); setActiveContactId(null); }} className={`flex flex-col items-center gap-1 transition-all ${mode === AppMode.CHATS ? 'text-[#00a884] scale-110' : 'text-[#8696a0]'}`}>
                <MessageSquare size={22} /><span className="text-[10px] font-bold">Chats</span>
              </button>
              <button onClick={() => { setMode(AppMode.DISCOVERY); setActiveContactId(null); }} className={`flex flex-col items-center gap-1 transition-all ${mode === AppMode.DISCOVERY ? 'text-[#00a884] scale-110' : 'text-[#8696a0]'}`}>
                <Compass size={22} /><span className="text-[10px] font-bold">Discover</span>
              </button>
              <button onClick={() => { setMode(AppMode.ZEN_SPACE); setActiveContactId(null); }} className={`flex flex-col items-center gap-1 transition-all ${mode === AppMode.ZEN_SPACE ? 'text-[#00a884] scale-110' : 'text-[#8696a0]'}`}>
                <Sparkles size={22} /><span className="text-[10px] font-bold">Zen Space</span>
              </button>
              <button onClick={() => { setMode(AppMode.STATUS); setActiveContactId(null); }} className={`flex flex-col items-center gap-1 transition-all ${mode === AppMode.STATUS ? 'text-[#00a884] scale-110' : 'text-[#8696a0]'}`}>
                <CircleDashed size={22} /><span className="text-[10px] font-bold">Status</span>
              </button>
              <button onClick={() => { setMode(AppMode.SETTINGS); setActiveContactId(null); }} className={`flex flex-col items-center gap-1 transition-all ${mode === AppMode.SETTINGS ? 'text-[#00a884] scale-110' : 'text-[#8696a0]'}`}>
                <SettingsIcon size={22} /><span className="text-[10px] font-bold">Settings</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default App;
