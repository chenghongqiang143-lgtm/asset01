
export enum AssetCategory {
  THIRD_PARTY = '第三方支付',
  BANK = '银行储蓄',
  WEALTH = '理财',
  FUND = '基金',
  SAVING = '攒钱',
  LIABILITY = '负债',
  OTHER = '其他'
}

export const CategoryColors: Record<AssetCategory, string> = {
  [AssetCategory.THIRD_PARTY]: '#06b6d4', // Cyan for Alipay/WeChat
  [AssetCategory.BANK]: '#3b82f6',        // Blue for Banks
  [AssetCategory.WEALTH]: '#8b5cf6',      // Violet for Wealth
  [AssetCategory.FUND]: '#f59e0b',        // Amber/Orange for Funds
  [AssetCategory.SAVING]: '#10b981',      // Emerald for Saving
  [AssetCategory.LIABILITY]: '#ef4444',   // Red for Liability
  [AssetCategory.OTHER]: '#64748b',       // Slate for Others
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
