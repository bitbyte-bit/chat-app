
import React from 'react';
import { MessageSquare, CircleDashed, Compass, Sparkles, Settings } from 'lucide-react';
import { AppMode } from '../types';

interface BottomNavProps {
  currentMode: AppMode;
  setMode: (mode: AppMode) => void;
  unreadCount: number;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentMode, setMode, unreadCount }) => {
  const navItems = [
    { mode: AppMode.CHATS, icon: MessageSquare, label: 'Chats', badge: unreadCount },
    { mode: AppMode.STATUS, icon: CircleDashed, label: 'Status' },
    { mode: AppMode.DISCOVERY, icon: Compass, label: 'Discovery' },
    { mode: AppMode.ZEN_SPACE, icon: Sparkles, label: 'Zen' },
    { mode: AppMode.SETTINGS, icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#111b21]/90 backdrop-blur-xl border-t border-white/5 safe-bottom z-[100] px-2 py-1">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentMode === item.mode;
          return (
            <button
              key={item.mode}
              onClick={() => setMode(item.mode)}
              className="relative flex flex-col items-center justify-center flex-1 py-1 transition-all duration-300"
            >
              <div className={`p-2 rounded-2xl transition-all duration-300 ${isActive ? 'bg-[#00a884]/10 text-[#00a884] scale-110' : 'text-[#8696a0]'}`}>
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                {item.badge ? (
                  <span className="absolute top-1 right-1/2 translate-x-4 bg-[#00a884] text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-[#111b21]">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                ) : null}
              </div>
              <span className={`text-[10px] font-bold mt-0.5 transition-opacity duration-300 ${isActive ? 'opacity-100 text-[#00a884]' : 'opacity-60 text-[#8696a0]'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
