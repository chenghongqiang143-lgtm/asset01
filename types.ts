
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

export interface Budget {
  category: string; 
  subCategory?: string; // 增加子分类字段
  monthlyAmount: number;
  spentThisMonth: number;
  carryOver: number;
  notes?: string;
}

export interface AIInsight {
  summary: string;
  suggestions: string[];
  riskLevel: string;
}
