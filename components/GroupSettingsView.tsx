
import React, { useState } from 'react';
import { 
  X, Camera, UserPlus, Shield, UserMinus, 
  Trash2, EyeOff, UserCircle, ArrowLeft, Save, 
  LogOut, Crown 
} from 'lucide-react';
import { Contact, UserProfile } from '../types';

interface GroupSettingsViewProps {
  group: Contact;
  contacts: Contact[];
  userProfile: UserProfile;
  onUpdate: (updates: Partial<Contact>) => void;
  onDelete: () => void;
  onBack: () => void;
  onAddMember: (contactId: string) => void;
  onRemoveMember: (contactId: string) => void;
  onTransferOwnership: (contactId: string) => void;
}

const GroupSettingsView: React.FC<GroupSettingsViewProps> = ({
  group,
  contacts,
  userProfile,
  onUpdate,
  onDelete,
  onBack,
  onAddMember,
  onRemoveMember,
  onTransferOwnership
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(group.name);
  const isOwner = group.ownerId === userProfile.id;

  const handleSaveName = () => {
    onUpdate({ name: editedName });
    setIsEditing(false);
  };

  const memberContacts = contacts.filter(c => group.members?.includes(c.id));
  const otherContacts = contacts.filter(c => !group.members?.includes(c.id) && !c.isGroup);

  return (
    <div className="flex flex-col h-full bg-[#0b141a] animate-in slide-in-from-right duration-300">
      <header className="h-[60px] bg-[#202c33] flex items-center px-4 gap-4 shrink-0 shadow-lg z-10">
        <button onClick={onBack} className="text-[#d1d7db] hover:text-white">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-[#e9edef] text-lg font-medium">Group Info</h2>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
        <div className="flex flex-col items-center py-8 bg-[#111b21] border-b border-white/5">
          <div className="relative group mb-4">
            <img src={group.avatar} className="w-40 h-40 rounded-3xl object-cover shadow-2xl border-4 border-[#202c33]" alt={group.name} />
            {isOwner && (
              <div className="absolute inset-0 bg-black/40 rounded-3xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="text-white" size={32} />
              </div>
            )}
          </div>
          
          {isEditing ? (
            <div className="flex items-center gap-2 px-6">
              <input 
                value={editedName} 
                onChange={(e) => setEditedName(e.target.value)}
                className="bg-transparent border-b border-[#00a884] text-2xl font-bold text-center text-white outline-none"
              />
              <button onClick={handleSaveName} className="text-[#00a884] p-1"><Save size={24}/></button>
            </div>
          ) : (
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              {group.hideDetails ? '••••••••' : group.name}
              {isOwner && <button onClick={() => setIsEditing(true)} className="text-[#8696a0] hover:text-white"><Shield size={16}/></button>}
            </h1>
          )}
          <p className="text-[#8696a0] text-sm mt-1">Group • {group.members?.length} members</p>
        </div>

        {/* Group Privacy Options */}
        {isOwner && (
          <div className="mt-4 bg-[#111b21] p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <EyeOff size={20} className="text-[#00a884]" />
                <div>
                  <p className="text-[#e9edef]">Zen Mode (Hide Details)</p>
                  <p className="text-xs text-[#8696a0]">Hide group name and admin names in chats</p>
                </div>
              </div>
              <input 
                type="checkbox" 
                checked={group.hideDetails} 
                onChange={(e) => onUpdate({ hideDetails: e.target.checked })}
                className="w-5 h-5 accent-[#00a884]"
              />
            </div>
          </div>
        )}

        {/* Add Members Section */}
        {isOwner && otherContacts.length > 0 && (
          <div className="mt-4 p-4">
            <h3 className="text-xs font-bold text-[#00a884] uppercase tracking-widest mb-3">Add Members</h3>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
              {otherContacts.map(contact => (
                <button 
                  key={contact.id}
                  onClick={() => onAddMember(contact.id)}
                  className="flex flex-col items-center min-w-[80px] group"
                >
                  <div className="relative">
                    <img src={contact.avatar} className="w-12 h-12 rounded-full mb-1 border border-white/10 group-hover:border-[#00a884]" alt={contact.name} />
                    <div className="absolute -top-1 -right-1 bg-[#00a884] text-black rounded-full p-0.5"><UserPlus size={10} /></div>
                  </div>
                  <span className="text-[10px] text-[#8696a0] truncate w-full text-center">{contact.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Participants List */}
        <div className="mt-4 bg-[#111b21] border-y border-white/5">
          <h3 className="p-4 text-xs font-bold text-[#8696a0] uppercase tracking-widest">{group.members?.length} Participants</h3>
          <div className="divide-y divide-white/5">
            {/* Me */}
            <div className="flex items-center gap-4 p-4">
              <img src={userProfile.avatar} className="w-10 h-10 rounded-full" alt="Me" />
              <div className="flex-1">
                <p className="text-[#e9edef] font-medium">You</p>
                <p className="text-xs text-[#8696a0]">{userProfile.bio}</p>
              </div>
              {isOwner && <span className="text-[10px] bg-[#00a884]/10 text-[#00a884] px-1.5 py-0.5 rounded border border-[#00a884]/20 uppercase">Group Admin</span>}
            </div>

            {/* Other Members */}
            {memberContacts.map(contact => (
              <div key={contact.id} className="flex items-center gap-4 p-4 group">
                <img src={contact.avatar} className="w-10 h-10 rounded-full" alt={contact.name} />
                <div className="flex-1">
                  <p className="text-[#e9edef] font-medium">
                    {group.hideDetails && !isOwner ? 'Member' : contact.name}
                  </p>
                  <p className="text-xs text-[#8696a0]">{contact.phone}</p>
                </div>
                
                {isOwner && (
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => onTransferOwnership(contact.id)}
                      className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-full" 
                      title="Make Admin"
                    >
                      <Crown size={18} />
                    </button>
                    <button 
                      onClick={() => onRemoveMember(contact.id)}
                      className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-full" 
                      title="Remove Member"
                    >
                      <UserMinus size={18} />
                    </button>
                  </div>
                )}
                {group.ownerId === contact.id && (
                   <span className="text-[10px] bg-[#00a884]/10 text-[#00a884] px-1.5 py-0.5 rounded border border-[#00a884]/20 uppercase">Group Admin</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Dangerous Actions */}
        <div className="mt-8 px-4 space-y-4">
          <button 
            onClick={onDelete} 
            className="w-full flex items-center gap-3 p-4 bg-rose-500/10 text-rose-500 rounded-2xl hover:bg-rose-500/20 transition-all font-bold"
          >
            <Trash2 size={20} />
            {isOwner ? 'Delete Group' : 'Exit Group'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupSettingsView;
