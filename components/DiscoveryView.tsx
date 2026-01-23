
import React, { useState, useMemo } from 'react';
import { Search, UserPlus, Sparkles, Check, Filter, Compass, UserCircle } from 'lucide-react';
import { UserProfile } from '../types';

interface DirectoryUser {
  id: string;
  name: string;
  bio: string;
  avatar: string;
  tags: string; // Comma separated
}

interface DiscoveryViewProps {
  users: DirectoryUser[];
  onConnect: (user: DirectoryUser) => void;
  connectedIds: string[];
  currentUser?: UserProfile;
}

const DiscoveryView: React.FC<DiscoveryViewProps> = ({ users, onConnect, connectedIds, currentUser }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  // Inject current user into the directory list
  const allUsers = useMemo(() => {
    if (!currentUser) return users;
    const me: DirectoryUser = {
      id: currentUser.id,
      name: `${currentUser.name} (You)`,
      bio: currentUser.bio,
      avatar: currentUser.avatar,
      tags: 'Me, Member'
    };
    return [me, ...users];
  }, [users, currentUser]);

  const filteredUsers = useMemo(() => {
    let result = allUsers;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(u => 
        u.name.toLowerCase().includes(q) || 
        u.bio.toLowerCase().includes(q) ||
        u.tags.toLowerCase().includes(q)
      );
    }
    if (activeFilter !== 'All') {
      result = result.filter(u => u.tags.includes(activeFilter));
    }
    return result;
  }, [allUsers, searchQuery, activeFilter]);

  const allTags = useMemo(() => {
    const tagsSet = new Set<string>(['All']);
    allUsers.forEach(u => u.tags.split(',').forEach(t => tagsSet.add(t.trim())));
    return Array.from(tagsSet);
  }, [allUsers]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b141a] animate-in fade-in duration-500 overflow-hidden">
      <header className="h-[60px] md:h-[100px] bg-[#202c33] flex items-center px-6 md:px-12 gap-4 shrink-0 shadow-lg relative z-10">
        <div className="flex items-center gap-3">
           <Compass className="text-[#00a884]" size={28} />
           <h2 className="text-white text-2xl font-bold font-outfit">Discovery</h2>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar p-6 md:p-12">
        <div className="max-w-6xl mx-auto space-y-10">
          
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3b4a54]" size={20} />
                <input 
                  type="text"
                  placeholder="Find your tribe (e.g. Designer, Philosopher, AI)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#111b21] border border-white/5 rounded-[24px] py-4 pl-12 pr-6 text-white outline-none focus:border-[#00a884]/40 transition-all text-lg shadow-2xl"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0">
                {allTags.map(tag => (
                  <button 
                    key={tag}
                    onClick={() => setActiveFilter(tag)}
                    className={`px-6 py-4 rounded-[24px] font-bold text-sm whitespace-nowrap transition-all border ${
                      activeFilter === tag 
                        ? 'bg-[#00a884] text-black border-transparent shadow-xl shadow-[#00a884]/20' 
                        : 'bg-[#111b21] text-[#8696a0] border-white/5 hover:border-[#00a884]/40'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="py-20 text-center space-y-4">
              <div className="w-20 h-20 bg-[#202c33] rounded-full flex items-center justify-center mx-auto text-[#3b4a54]"><Filter size={40} /></div>
              <h3 className="text-xl font-bold text-[#8696a0]">No peers found in this quadrant</h3>
              <p className="text-[#3b4a54]">Try widening your search to discover more souls.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
              {filteredUsers.map(user => {
                const isMe = user.id === currentUser?.id;
                const isConnected = connectedIds.includes(user.id);
                return (
                  <div key={user.id} className={`group bg-[#111b21] rounded-[40px] p-6 border transition-all shadow-2xl relative overflow-hidden ${isMe ? 'border-[#00a884]/40 ring-1 ring-[#00a884]/20' : 'border-white/5 hover:border-[#00a884]/30'}`}>
                    <div className={`absolute top-0 right-0 w-32 h-32 blur-[60px] rounded-full -translate-y-1/2 translate-x-1/2 transition-colors ${isMe ? 'bg-[#00a884]/20' : 'bg-[#00a884]/5 group-hover:bg-[#00a884]/10'}`}></div>
                    
                    <div className="flex items-start gap-4 mb-6">
                      <img src={user.avatar} alt={user.name} className="w-20 h-20 rounded-[28px] object-cover border-2 border-[#202c33] shadow-lg" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xl font-bold text-white truncate font-outfit">{user.name}</h4>
                        <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest mt-1 ${isMe ? 'text-[#00a884]' : 'text-[#8696a0]'}`}>
                          {isMe ? <UserCircle size={12} /> : <Sparkles size={12} />} {isMe ? 'Your Presence' : 'Registered Member'}
                        </div>
                      </div>
                    </div>

                    <p className="text-[#8696a0] text-sm leading-relaxed mb-6 line-clamp-3 h-[60px]">{user.bio}</p>

                    <div className="flex flex-wrap gap-2 mb-8">
                      {user.tags.split(',').map(tag => (
                        <span key={tag} className={`px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-tighter ${isMe && tag.trim() === 'Me' ? 'bg-[#00a884] text-black' : 'bg-white/5 text-[#d1d7db]'}`}>
                          {tag.trim()}
                        </span>
                      ))}
                    </div>

                    {isMe ? (
                      <div className="w-full py-4 rounded-[20px] bg-white/5 text-[#8696a0] font-bold flex items-center justify-center gap-2 border border-white/5">
                        <span>Identity Lock</span>
                      </div>
                    ) : (
                      <button 
                        onClick={() => !isConnected && onConnect(user)}
                        disabled={isConnected}
                        className={`w-full py-4 rounded-[20px] font-bold flex items-center justify-center gap-2 transition-all ${
                          isConnected 
                            ? 'bg-white/5 text-[#00a884] cursor-default' 
                            : 'bg-[#00a884] text-black hover:bg-[#06cf9c] active:scale-95 shadow-xl shadow-[#00a884]/10'
                        }`}
                      >
                        {isConnected ? (
                          <><Check size={18} strokeWidth={3} /><span>Connected</span></>
                        ) : (
                          <><UserPlus size={18} strokeWidth={3} /><span>Zen Connect</span></>
                        )}
                      </button>
                    )}
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
