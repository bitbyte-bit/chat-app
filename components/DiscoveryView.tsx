
import React, { useState, useMemo, useEffect } from 'react';
import { Search, UserPlus, Sparkles, Check, Filter, Compass, UserCircle, Plus, Info } from 'lucide-react';
import { UserProfile, AccountStatus } from '../types';

interface DirectoryUser {
  id: string;
  name: string;
  bio: string;
  avatar: string;
  tags: string; 
  accountStatus?: AccountStatus;
  statusBadge?: string;
  status?: 'online' | 'offline';
}

interface DiscoveryViewProps {
  users: DirectoryUser[];
  onConnect: (user: DirectoryUser) => void;
  connectedIds: string[];
  currentUser?: UserProfile;
  onOpenAddFriend: () => void;
}

const DiscoveryView: React.FC<DiscoveryViewProps> = ({ users, onConnect, connectedIds, currentUser, onOpenAddFriend }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  const allUsers = useMemo(() => {
    if (!currentUser) return users;
    // Don't show "You" in discovery to keep it focused on finding others
    return users.filter(u => u.id !== currentUser.id);
  }, [users, currentUser]);

  useEffect(() => {
    console.log('[DEBUG] DiscoveryView re-rendered with users:', users.length);
  }, [users]);

  const filteredUsers = useMemo(() => {
    let result = allUsers;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(u => 
        u.name.toLowerCase().includes(q) || 
        u.bio.toLowerCase().includes(q) ||
        (u.tags || '').toLowerCase().includes(q)
      );
    }
    if (activeFilter !== 'All') {
      result = result.filter(u => (u.tags || '').includes(activeFilter));
    }
    return result;
  }, [allUsers, searchQuery, activeFilter]);

  const allTags = useMemo(() => {
    const tagsSet = new Set<string>(['All']);
    allUsers.forEach(u => (u.tags || '').split(',').forEach(t => t.trim() && tagsSet.add(t.trim())));
    return Array.from(tagsSet);
  }, [allUsers]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b141a] animate-in fade-in duration-500 overflow-hidden">
      <header className="h-[70px] md:h-[100px] bg-[#202c33] flex items-center justify-between px-4 md:px-12 gap-4 shrink-0 shadow-lg relative z-20">
        <div className="flex items-center gap-3">
           {/* Fixed: Removed invalid md:size prop which is not supported by Lucide icons */}
           <Compass className="text-[#00a884]" size={24} />
           <h2 className="text-white text-lg md:text-2xl font-bold font-outfit">Discovery</h2>
        </div>
        <div className="flex-1 max-w-md hidden md:block relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3b4a54]" size={18} />
          <input 
            type="text"
            placeholder="Search the network..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#111b21] border border-white/5 rounded-full py-2.5 pl-11 pr-4 text-white text-sm outline-none focus:border-[#00a884]/40 transition-all"
          />
        </div>
        <button 
          onClick={onOpenAddFriend}
          className="p-2.5 bg-[#00a884] text-black rounded-xl hover:bg-[#06cf9c] transition-all shadow-lg shadow-[#00a884]/10 flex items-center gap-2 font-bold text-xs"
        >
          <UserPlus size={18} />
          <span className="hidden sm:inline">Add Friend</span>
        </button>
      </header>

      {/* Mobile Search Bar */}
      <div className="md:hidden px-4 py-3 bg-[#111b21] border-b border-white/5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3b4a54]" size={16} />
          <input 
            type="text"
            placeholder="Search souls..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#202c33] border border-white/5 rounded-xl py-2 pl-10 pr-4 text-white text-xs outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-3 md:p-12">
        <div className="max-w-7xl mx-auto space-y-6 md:space-y-10">
          
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
            {allTags.map(tag => (
              <button 
                key={tag}
                onClick={() => setActiveFilter(tag)}
                className={`px-4 py-2 rounded-xl font-bold text-[10px] md:text-xs whitespace-nowrap transition-all border uppercase tracking-widest ${
                  activeFilter === tag 
                    ? 'bg-[#00a884] text-black border-transparent shadow-lg shadow-[#00a884]/10' 
                    : 'bg-[#111b21] text-[#8696a0] border-white/5 hover:border-[#00a884]/40'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          {filteredUsers.length === 0 ? (
            <div className="py-20 text-center space-y-4">
              <div className="w-16 h-16 bg-[#202c33] rounded-3xl flex items-center justify-center mx-auto text-[#3b4a54]"><Filter size={32} /></div>
              <h3 className="text-lg font-bold text-[#8696a0]">No matches in the manifest</h3>
              <p className="text-[#3b4a54] text-xs">Broaden your frequency to find others.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6 pb-24">
              {filteredUsers.map(user => {
                const isConnected = connectedIds.includes(user.id);
                const isOnline = user.status === 'online';
                return (
                  <div 
                    key={user.id} 
                    className="group bg-[#111b21] rounded-[24px] md:rounded-[40px] p-3 md:p-6 border border-white/5 hover:border-[#00a884]/30 transition-all shadow-xl flex flex-col items-center text-center relative"
                  >
                    {/* Minimal Online/Offline Indicator */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-[#00a884] shadow-[0_0_8px_#00a884]' : 'bg-[#3b4a54]'}`}></div>
                      <span className="text-[8px] font-black uppercase text-[#3b4a54] tracking-tighter">
                        {isOnline ? 'Active' : 'Drifting'}
                      </span>
                    </div>

                    <div className="relative mb-3 md:mb-4">
                      <img src={user.avatar} alt={user.name} className="w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-[32px] object-cover border-2 border-[#202c33] shadow-lg group-hover:scale-105 transition-transform" />
                      {user.statusBadge && (
                        <div className="absolute -bottom-1 -right-1 bg-[#202c33] rounded-lg p-1 text-[10px] shadow-lg border border-white/5">
                          {user.statusBadge}
                        </div>
                      )}
                    </div>

                    <h4 className="text-xs md:text-lg font-bold text-white truncate w-full font-outfit mb-1">{user.name}</h4>
                    
                    <p className="text-[10px] md:text-sm text-[#8696a0] leading-tight mb-3 md:mb-4 line-clamp-2 h-6 md:h-10">
                      {user.bio || 'Navigating the Zenj network...'}
                    </p>

                    <div className="flex flex-wrap justify-center gap-1 mb-4 md:mb-6 h-4 md:h-6 overflow-hidden">
                      {(user.tags || '').split(',').slice(0, 2).map(tag => (
                        <span key={tag} className="px-2 py-0.5 text-[7px] md:text-[9px] font-bold rounded-full uppercase tracking-tighter bg-white/5 text-[#d1d7db]">
                          {tag.trim()}
                        </span>
                      ))}
                    </div>

                    <button 
                      onClick={() => !isConnected && onConnect(user)}
                      disabled={isConnected}
                      className={`w-full py-2 md:py-3.5 rounded-xl md:rounded-2xl font-bold flex items-center justify-center gap-2 transition-all text-[9px] md:text-xs ${
                        isConnected 
                          ? 'bg-white/5 text-[#00a884] cursor-default' 
                          : 'bg-[#00a884] text-black hover:bg-[#06cf9c] active:scale-95'
                      }`}
                    >
                      {isConnected ? (
                        <><Check size={14} strokeWidth={3} /><span>Synced</span></>
                      ) : (
                        <><Plus size={14} strokeWidth={3} /><span>Connect</span></>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiscoveryView;
