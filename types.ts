
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  type: 'text' | 'image' | 'audio' | 'video';
  mediaUrl?: string;
  status?: 'sent' | 'delivered' | 'read';
  reactions?: Record<string, string[]>; // emoji -> list of user names
  replyToId?: string;
  replyToText?: string;
}

export interface Contact {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'offline' | 'typing...';
  lastMessageSnippet: string;
  lastMessageTime: number;
  systemInstruction: string;
  phone?: string;
  isInvitePlaceholder?: boolean;
  inviteExpired?: boolean;
  isGroup?: boolean;
  members?: string[]; // IDs of members
  ownerId?: string;
  adminIds?: string[];
  isBlocked?: boolean;
  isMuted?: boolean;
  hideDetails?: boolean; // Zen feature to hide names/numbers
  unreadCount?: number;
}

export interface Moment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  mediaUrl?: string;
  timestamp: number;
  type: 'text' | 'image' | 'video';
}

export interface AppSettings {
  theme: 'dark' | 'light' | 'zen-emerald' | 'zen-ocean';
  wallpaper: string;
  vibrations: boolean;
  notifications: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  password?: string;
  bio: string;
  avatar: string;
  settings: AppSettings;
}

export type CallType = 'audio' | 'video' | null;

export interface CallState {
  isActive: boolean;
  type: CallType;
  contact: Contact | null;
}

export enum AppMode {
  CHATS = 'chats',
  ZEN_SPACE = 'zen-space',
  STATUS = 'status',
  SETTINGS = 'settings',
  PROFILE = 'profile',
  CONTACT_SYNC = 'contact-sync',
  GROUP_SETTINGS = 'group-settings',
  DISCOVERY = 'discovery'
}
