
import React, { useState } from 'react';
import { X, Users, Check, Camera, Loader2 } from 'lucide-react';
import { Contact } from '../types';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: Contact[];
  onCreate: (name: string, members: string[]) => void;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ isOpen, onClose, contacts, onCreate }) => {
  const [groupName, setGroupName] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen) return null;

  const toggleMember = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]
    );
  };

  const handleCreate = () => {
    if (!groupName.trim() || selectedIds.length === 0) return;
    setIsCreating(true);
    setTimeout(() => {
      onCreate(groupName, selectedIds);
      setIsCreating(false);
      setGroupName('');
      setSelectedIds([]);
      onClose();
    }, 800);
  };

  const availableContacts = contacts.filter(c => !c.isGroup);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-[#202c33] w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl border border-white/10 flex flex-col max-h-[80vh]">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#2a3942]/50">
          <h3 className="text-xl font-bold text-[#e9edef] flex items-center gap-2">
            <Users className="text-[#00a884]" /> New Group
          </h3>
          <button onClick={onClose} className="text-[#8696a0] hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto no-scrollbar">
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 bg-[#2a3942] rounded-3xl flex items-center justify-center text-[#8696a0] border border-white/5 relative group cursor-pointer">
              <Users size={32} />
              <div className="absolute inset-0 bg-black/40 rounded-3xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={20} className="text-white" />
              </div>
            </div>
            <input 
              type="text"
              placeholder="Group Name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full bg-[#2a3942] border-b-2 border-transparent focus:border-[#00a884] rounded-xl py-3 px-4 text-[#d1d7db] outline-none transition-all text-center text-lg font-semibold"
            />
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-[#00a884] uppercase tracking-widest px-1">Select Members</label>
            <div className="space-y-1">
              {availableContacts.map(contact => (
                <div 
                  key={contact.id}
                  onClick={() => toggleMember(contact.id)}
                  className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all ${
                    selectedIds.includes(contact.id) ? 'bg-[#00a884]/10 border border-[#00a884]/20' : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <img src={contact.avatar} className="w-10 h-10 rounded-full object-cover" alt={contact.name} />
                  <span className="flex-1 text-[#d1d7db] font-medium">{contact.name}</span>
                  {selectedIds.includes(contact.id) && (
                    <div className="bg-[#00a884] text-black rounded-full p-1">
                      <Check size={14} strokeWidth={4} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 bg-[#2a3942]/50 border-t border-white/5">
          <button 
            onClick={handleCreate}
            disabled={!groupName.trim() || selectedIds.length === 0 || isCreating}
            className="w-full bg-[#00a884] text-black font-bold py-4 rounded-2xl hover:bg-[#06cf9c] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#00a884]/20"
          >
            {isCreating ? <Loader2 className="animate-spin" /> : 'Create Zen Group'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupModal;
