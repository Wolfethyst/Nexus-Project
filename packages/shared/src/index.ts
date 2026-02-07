// Authentication types
export interface User {
  id: string;
  nexusId?: string;
  username?: string;
  display?: string;
  displayName?: string;
  avatar?: string;
  decoration?: string;
  email?: string;
}

export interface Session {
  loggedIn: boolean;
  user?: User;
  roles: string[];
  twitch?: { id: string; login: string };
  youtube?: { id: string; name: string };
}

export interface BanStatus {
  isBanned: boolean;
  expiresAt?: number;
  reason?: string;
  banKind?: string;
}

// Video types
export interface Video {
  id: string;
  title: string;
  duration?: string;
  url?: string;
  videoUrl?: string;
  platform?: 'youtube' | 'twitch' | 'bunny';
  thumbnail?: string;
  createdAt: string | number;
  type?: 'vod' | 'video' | 'clip';
  provider?: 'cloudflare' | 'bunny' | 'youtube' | 'odysee';
  cloudflareId?: string;
  videoId?: string;
  is_exclusive?: boolean;
}

export interface Clip extends Video {
  game?: string;
  windowSeconds?: number;
}

// Game types
export interface Game {
  name: string;
  cover?: string;
  summary?: string;
  developer?: string;
  publisher?: string;
  release_date?: string;
  steam_url?: string;
  steamUrl?: string;
  isVirtual?: boolean;
  isInbox?: boolean;
  __index?: number;
}

// Store/Marketplace types
export interface StoreItem {
  id: string;
  name: string;
  price: number;
  description?: string;
  image?: string;
  soundUrl?: string;
  category?: string;
}

export interface InventoryItem extends StoreItem {
  quantity: number;
  expiresAt?: number;
}

export interface Redemption {
  id: string;
  itemId: string;
  userId: string;
  redeemAt: string | number;
  expiresAt?: string | number;
}

// Stream types
export interface StreamTitle {
  title: string;
  game?: string;
  live: boolean;
}

// Chat types
export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  displayName?: string;
  nameColor?: string;
  content: string;
  timestamp: number;
  badges?: string[];
}

// Subscription types
export interface SubscriptionTier {
  id: string;
  name: string;
  price: number;
  benefits: string[];
  image?: string;
}

// API Response types
export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface ApiError {
  status: number;
  message: string;
  error?: string;
}
