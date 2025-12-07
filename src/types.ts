
export type ProductCategory = {
  id: string;
  name: string;
  imageUrl?: string;
};

export type Product = {
  _id?: string;
  category: string; 
  buttonName: string;
  invoiceTitle: string;
  invoiceDescription: string;
  price: number;
  priceReal: number;
  type: 'static' | 'api';
  productImageUrl?: string;
  staticKey?: string;
  apiUrl?: string;
  apiToken?: string;
  apiDays?: number;
  ownerId?: string;
};

export type DbStatus = {
  status: 'loading' | 'connected' | 'error';
  memory: string | null;
};

export type TelegramLog = {
    timestamp: string;
    payload: any;
};

export type ProductView = 'list' | 'form';

export type Campaign = {
    _id?: string;
    name: string;
    text: string;
    imageUrl?: string;
    status: 'draft' | 'sending' | 'stopped' | 'completed' | 'error';
    createdAt: string;
    lifetimeHours: number;
    stats?: {
        sent: number;
        total: number;
        errors: number;
    }
};

export type CampaignTemplate = {
    id: string;
    name: string;
    text: string;
};

export type CustomLink = {
  text: string;
  url: string;
  showInGroups: boolean;
};

export type BackgroundExportStatus = {
    status: 'idle' | 'running' | 'completed' | 'error' | 'stopped';
    progress: number;
    total: number;
    filePath: string | null;
    error: string | null;
};

export type TelegramStats = {
  totalUsers: number;
  activeUsers: number;
  blockedUsers: number;
  newToday: number;
  newThisWeek: number;
};

export type BotUser = {
  _id: string;
  chatId: number;
  username?: string;
  firstName?: string;
  status: 'active' | 'banned';
  role: 'user' | 'moderator';
  lastSeen: string;
  joinedAt: string;
};

export type RpsDataPoint = {
  time: string;
  rps: number;
};
