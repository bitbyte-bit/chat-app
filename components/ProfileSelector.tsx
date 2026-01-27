import React from 'react';
import { UserProfile } from '../types';
import { User, Plus, LogOut } from 'lucide-react';

interface ProfileSelectorProps {
  profiles: UserProfile[];
  currentProfile: UserProfile | null;
  onSelectProfile: (profile: UserProfile) => void;
  onCreateNew: () => void;
  onLogout: () => void;
}

const ProfileSelector: React.FC<ProfileSelectorProps> = ({
  profiles,
  currentProfile,
  onSelectProfile,
  onCreateNew,
  onLogout
}) => {
  return (
    <div className="fixed inset-0 z-[250] bg-[#0b141a] flex flex-col items-center justify-center p-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#00a884] blur-[120px] rounded-full" style={{ opacity: 0.1 }}></div>
      </div>

      <div className="w-full max-w-sm relative z-10 text-center space-y-8 animate-in fade-in zoom-in duration-700">
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-white font-outfit">
              Select Account
            </h2>
            <p className="text-[#8696a0] text-sm">Choose an account to continue</p>
          </div>
        </div>

        <div className="space-y-3">
          {profiles.map((profile) => (
            <button
              key={profile.id}
              onClick={() => onSelectProfile(profile)}
              className={`w-full p-4 bg-[#202c33] border rounded-xl text-left transition-all hover:bg-[#2a3942] ${
                currentProfile?.id === profile.id ? 'border-[#00a884] bg-[#2a3942]' : 'border-white/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <img
                  src={profile.avatar}
                  alt={profile.name}
                  className="w-10 h-10 rounded-full"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium truncate">{profile.name}</div>
                  <div className="text-[#8696a0] text-sm truncate">{profile.email}</div>
                </div>
                {currentProfile?.id === profile.id && (
                  <div className="text-[#00a884]">
                    <User size={16} />
                  </div>
                )}
              </div>
            </button>
          ))}

          <button
            onClick={onCreateNew}
            className="w-full p-4 bg-[#00a884] border border-[#00a884] rounded-xl text-white font-medium transition-all hover:bg-[#00a884]/90 flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            Create New Account
          </button>
        </div>

        {currentProfile && (
          <div className="pt-4">
            <button
              onClick={onLogout}
              className="text-[#8696a0] text-sm hover:text-white transition-colors flex items-center gap-2 mx-auto"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileSelector;