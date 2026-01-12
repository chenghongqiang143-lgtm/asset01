
export enum AssetCategory {
  CASH = '现金',
  STOCK = '股票',
  CRYPTO = '加密货币',
  REAL_ESTATE = '房地产',
  FUND = '基金',
  LIABILITY = '负债',
  SAVING = '攒钱',
  OTHER = '其他'
}

export const CategoryColors: Record<AssetCategory, string> = {
  [AssetCategory.CASH]: '#3b82f6', 
  [AssetCategory.STOCK]: '#6366f1', 
  [AssetCategory.CRYPTO]: '#f59e0b', 
  [AssetCategory.REAL_ESTATE]: '#10b981', 
  [AssetCategory.FUND]: '#a855f7', 
  [AssetCategory.LIABILITY]: '#ef4444', 
  [AssetCategory.SAVING]: '#ec4899', 
  [AssetCategory.OTHER]: '#64748b', 
};

export interface HistoryPoint {
  date: string;
  value: number;
}

export interface Asset {
  id: string;
  name: string;
  category: AssetCategory;
  value: number;
  targetValue?: number; 
  durationMonths?: number; 
  currency: string;
  change24h?: number;
  lastUpdated: string;
  color?: string;
  history: HistoryPoint[];
  notes?: string;
}

export interface Transaction {
  id: string;
  amount: number;
  date: string;
  note?: string;
}

export interface Budget {
  category: string; 
  subCategory?: string;
  monthlyAmount: number;
  spentThisMonth: number;
  carryOver: number;
  notes?: string;
  color?: string; // 增加自定义颜色支持
  transactions?: Transaction[]; // 增加流水明细
}

export interface AIInsight {
  summary: string;
  suggestions: string[];
  riskLevel: string;
}