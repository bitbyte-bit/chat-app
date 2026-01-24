
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  type: 'text' | 'image' | 'audio' | 'video' | 'file';
  mediaUrl?: string;
  fileName?: string;
  fileSize?: number;
  status?: 'sent' | 'delivered' | 'read';
  reactions?: Record<string, string[]>; 
  replyToId?: string;
  replyToText?: string;
}

export type AccountStatus = 'active' | 'warned' | 'suspended' | 'banned';
export type AccountType = 'member' | 'business';

export interface Contact {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'offline' | 'typing...';
  accountStatus: AccountStatus;
  statusBadge?: string; 
  lastMessageSnippet: string;
  lastMessageTime: number;
  systemInstruction: string;
  phone?: string;
  email?: string;
  isInvitePlaceholder?: boolean;
  inviteExpired?: boolean;
  isGroup?: boolean;
  members?: string[]; 
  ownerId?: string;
  adminIds?: string[];
  isBlocked?: boolean;
  isMuted?: boolean;
  hideDetails?: boolean; 
  unreadCount?: number;
  accountType?: AccountType;
  rating?: number;
  ratingCount?: number;
}

export interface Product {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerAvatar: string;
  title: string;
  description: string;
  price: string;
  imageUrl: string;
  timestamp: number;
  likes: number;
  isLiked?: boolean;
  isFollowed?: boolean;
  rating?: number;
  ratingCount?: number;
}

export interface ZenjTool {
  id: string;
  name: string;
  description: string;
  version: string;
  iconUrl: string;
  fileUrl: string; 
  fileName: string;
  timestamp: number;
  downloads: number;
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
  theme: 'dark' | 'light' | 'zen-emerald' | 'zen-ocean' | 'custom';
  wallpaper: string;
  vibrations: boolean;
  notifications: boolean;
  fontSize: 'small' | 'medium' | 'large';
  brightness: 'dim' | 'bright';
  customThemeColor?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: 'user' | 'admin';
  accountType: AccountType;
  password?: string;
  bio: string;
  avatar: string;
  accountStatus: AccountStatus;
  statusBadge?: string;
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
  DISCOVERY = 'discovery',
  ADMIN_DASHBOARD = 'admin-dashboard'
}
