
import React, { useState, useMemo } from 'react';
import { 
  MessageSquareText, 
  CircleDashed, 
  Sparkles, 
  Settings,
  Search,
  Users,
  Plus,
  Compass
} from 'lucide-react';
import { Contact, AppMode, UserProfile, Message } from '../types';

interface SidebarProps {
  contacts: Contact[];
  activeContactId: string | null;
  onSelectContact: (id: string) => void;
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  userProfile: UserProfile;
  onOpenAddFriend: () => void;
  onOpenCreateGroup: () => void;
  conversations: Record<string, Message[]>;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  contacts, 
  activeContactId, 
  onSelectContact, 
  mode, 
  setMode, 
  userProfile,
  onOpenAddFriend,
  onOpenCreateGroup,
  conversations
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const visibleContacts = useMemo(() => {
    return contacts.filter(c => !c.isBlocked);
  }, [contacts]);

  const filteredContacts = useMemo(() => {
    let result = visibleContacts;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(contact => {
        if (contact.name.toLowerCase().includes(query)) return true;
        if (contact.phone?.toLowerCase().includes(query)) return true;
        const history = conversations[contact.id] || [];
        return history.some(msg => msg.type === 'text' && msg.content.toLowerCase().includes(query));
      });
    }
    return result.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
  }, [visibleContacts, searchQuery, conversations]);

  const getDisplaySnippet = (contact: Contact) => {
    if (!searchQuery.trim()) return contact.lastMessageSnippet;
    const query = searchQuery.toLowerCase();
    const history = conversations[contact.id] || [];
    const matchingMsg = history.find(msg => msg.type === 'text' && msg.content.toLowerCase().includes(query));
    if (matchingMsg && !contact.name.toLowerCase().includes(query)) return `Found: "${matchingMsg.content}"`;
    return contact.lastMessageSnippet;
  };

  const totalUnread = useMemo(() => {
    return visibleContacts.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  }, [visibleContacts]);

  const isMobile = window.innerWidth < 768;

  return (
    <div className="h-full w-full md:w-[320px] lg:w-[360px] flex flex-col bg-[#111b21] border-r border-white/5 safe-top overflow-hidden shrink-0">
      <div className={`h-[50px] bg-[#202c33] px-3 flex items-center justify-between shrink-0 ${isMobile ? 'hidden' : ''}`}>
        <button onClick={() => setMode(AppMode.SETTINGS)} className="w-8 h-8 rounded-xl overflow-hidden border border-white/10 hover:opacity-80 transition-opacity">
          <img src={userProfile.avatar} alt="Me" className="w-full h-full object-cover" />
        </button>
        <div className="flex items-center gap-4 lg:gap-5 text-[#aebac1]">
          <Compass size={18} className={`cursor-pointer hover:text-white transition-colors ${mode === AppMode.DISCOVERY ? 'text-[#00a884]' : ''}`} onClick={() => setMode(AppMode.DISCOVERY)} />
          <CircleDashed size={18} className={`cursor-pointer hover:text-white transition-colors ${mode === AppMode.STATUS ? 'text-[#00a884]' : ''}`} onClick={() => setMode(AppMode.STATUS)} />
          <div className="relative">
            <MessageSquareText size={18} className={`cursor-pointer hover:text-white transition-colors ${mode === AppMode.CHATS ? 'text-[#00a884]' : ''}`} onClick={() => setMode(AppMode.CHATS)} />
            {totalUnread > 0 && <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#00a884] rounded-full border-2 border-[#202c33]" />}
          </div>
          <Sparkles size={18} className={`cursor-pointer hover:text-white transition-colors ${mode === AppMode.ZEN_SPACE ? 'text-[#00a884]' : ''}`} onClick={() => setMode(AppMode.ZEN_SPACE)} />
          <Settings size={18} className={`cursor-pointer hover:text-white transition-colors ${mode === AppMode.SETTINGS ? 'text-[#00a884]' : ''}`} onClick={() => setMode(AppMode.SETTINGS)} />
        </div>
      </div>

      <div className="flex flex-col h-full overflow-hidden">
        {isMobile && (
          <div className="px-4 py-3 bg-[#111b21] flex justify-between items-center border-b border-white/5">
             <h1 className="text-xl font-black text-[#00a884] font-outfit uppercase tracking-tighter">Zenj</h1>
             <Plus size={20} className="text-[#8696a0]" onClick={onOpenAddFriend} />
          </div>
        )}

        <div className="px-3 py-2 flex items-center gap-2 shrink-0">
          <div className="flex-1 bg-[#202c33] rounded-xl flex items-center px-3 py-1.5 gap-2 border border-white/5 shadow-inner">
            <Search size={14} className={`${searchQuery ? 'text-[#00a884]' : 'text-[#8696a0]'}`} />
            <input 
              type="text" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              placeholder="Search" 
              className="bg-transparent border-none focus:ring-0 text-[13px] text-[#d1d7db] placeholder-[#8696a0] w-full" 
            />
          </div>
          <button onClick={onOpenCreateGroup} className="p-2 text-[#8696a0] hover:text-[#00a884] transition-colors"><Users size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar pb-20 md:pb-0">
          {filteredContacts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-[#3b4a54] opacity-50">
              <MessageSquareText size={32} className="mb-2" />
              <p className="text-[11px] font-bold uppercase tracking-widest">Silence</p>
            </div>
          ) : (
            filteredContacts.map((contact) => (
              <div 
                key={contact.id} 
                onClick={() => onSelectContact(contact.id)} 
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-white/5 active:bg-white/10 transition-colors border-b border-white/5 ${activeContactId === contact.id ? 'bg-white/5' : ''}`}
              >
                <div className="relative flex-shrink-0">
                  <img src={contact.avatar} alt={contact.name} className="w-10 h-10 rounded-[14px] object-cover border border-[#202c33] shadow-sm" />
                  {contact.status === 'online' && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#00a884] rounded-full border-2 border-[#111b21] shadow-sm" />
                  )}
                </div>
                <div className="flex-1 min-w-0 flex justify-between items-center">
                  <h3 className="text-[#e9edef] font-bold text-[13px] truncate leading-tight flex items-center gap-1.5">
                    {contact.name}
                    {contact.statusBadge && <span className="text-[10px] opacity-80">{contact.statusBadge}</span>}
                  </h3>
                  {contact.unreadCount ? <div className="bg-[#00a884] text-black text-[8px] font-black px-1 rounded-full min-w-[12px] text-center">{contact.unreadCount}</div> : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
