import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import { Asset, AssetCategory, CategoryColors, HistoryPoint, Budget, Transaction } from './types';
import { Icons } from './constants';
import AssetCard from './components/AssetCard';
import BudgetCard from './components/BudgetCard';
import AddAssetModal from './components/AddAssetModal';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';

// Helper to ensure date comparison works with both YYYY-MM-DD and MM/DD legacy formats
const parseDate = (dateStr: string) => {
  if (dateStr.includes('-')) return new Date(dateStr).getTime();
  const [m, d] = dateStr.split('/').map(Number);
  const year = new Date().getFullYear();
  return new Date(year, m - 1, d).getTime();
};

const generateMockHistory = (baseValue: number): HistoryPoint[] => {
  const history: HistoryPoint[] = [];
  const today = new Date();
  let currentValue = baseValue;
  for (let i = 0; i < 120; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - (i * 3));
    const dateStr = d.toISOString().split('T')[0];
    history.push({
      date: dateStr,
      value: currentValue
    });
    const change = (Math.random() - 0.5) * 0.05;
    currentValue = currentValue / (1 + change);
  }
  return history.reverse();
};

const DEFAULT_BUDGET_CATEGORIES = ['生活', '投资', '其他'];
const DEFAULT_ASSET_CATEGORIES = Object.values(AssetCategory);

const INITIAL_ASSETS: Asset[] = [
  { id: '1', name: '工商银行活期', category: AssetCategory.CASH, value: 45000, currency: 'CNY', change24h: 0, lastUpdated: '2024-05-20', history: generateMockHistory(45000) },
  { id: '2', name: '腾讯控股 (00700)', category: AssetCategory.STOCK, value: 120500, currency: 'CNY', change24h: 1.2, lastUpdated: '2024-05-20', history: generateMockHistory(120500) },
  { id: '3', name: '招商银行信用卡', category: AssetCategory.LIABILITY, value: 8500, targetValue: 50000, durationMonths: 12, currency: 'CNY', lastUpdated: '2024-05-20', history: generateMockHistory(8500), notes: '还款日10号' },
  { id: '4', name: '欧洲之行攒钱', category: AssetCategory.SAVING, value: 12000, targetValue: 30000, durationMonths: 6, currency: 'CNY', lastUpdated: '2024-05-20', history: generateMockHistory(12000) },
  { id: '5', name: 'Bitcoin', category: AssetCategory.CRYPTO, value: 58000, currency: 'CNY', change24h: 4.5, lastUpdated: '2024-05-20', history: generateMockHistory(58000) },
];

const INITIAL_BUDGETS: Budget[] = [
  { category: '总计', monthlyAmount: 8000, spentThisMonth: 3200, carryOver: 500, transactions: [] },
  { category: '生活', subCategory: '餐饮', monthlyAmount: 3000, spentThisMonth: 1800, carryOver: 200, notes: '吃饭相关', color: '#f43f5e', transactions: [] },
  { category: '生活', subCategory: '购物', monthlyAmount: 2000, spentThisMonth: 500, carryOver: 0, notes: '剁手买买买', color: '#ec4899', transactions: [] },
  { category: '生活', subCategory: '交通', monthlyAmount: 500, spentThisMonth: 120, carryOver: 0, color: '#3b82f6', transactions: [] },
];

const THEME_COLORS = [
  '#ef4444', '#f43f5e', '#3b82f6', '#10b981', '#8b5cf6', 
  '#f59e0b', '#06b6d4', '#6366f1', '#d946ef', '#14b8a6', '#0f172a'
];

const isDarkColor = (color: string) => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness < 155;
};

const FilterBar = memo(({ selected, onSelect, categories, onAdd, type, themeColor, isThemeDark, startLongPress, clearLongPress }: any) => {
  const uniqueCategories = Array.from(new Set(categories)).filter(Boolean);
  
  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 mt-1 flex-nowrap w-full">
      <div className="flex flex-nowrap gap-2 items-center">
        {['全部', ...uniqueCategories].map(cat => (
          <button
            key={cat}
            onClick={() => onSelect(cat as string)}
            onMouseDown={() => startLongPress(cat, type)}
            onMouseUp={clearLongPress}
            onMouseLeave={clearLongPress}
            onTouchStart={() => startLongPress(cat, type)}
            onTouchEnd={clearLongPress}
            style={{ 
              backgroundColor: selected === cat ? themeColor : 'white',
              borderColor: selected === cat ? themeColor : '#e2e8f0',
              color: selected === cat ? (isThemeDark ? 'white' : '#0f172a') : '#94a3b8'
            }}
            className={`px-4 h-9 rounded text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border shadow-sm flex items-center justify-center flex-shrink-0 active:scale-95`}
          >
            {cat as string}
          </button>
        ))}
        {onAdd && (
          <button
            onClick={onAdd}
            className="px-4 h-9 rounded text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-400 border border-slate-200 hover:border-slate-400 flex items-center justify-center flex-shrink-0 transition-all hover:bg-slate-200 active:scale-95"
          >
            + 新增
          </button>
        )}
      </div>
    </div>
  );
});

export const App: React.FC = () => {
  const [isAppReady, setIsAppReady] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'budget' | 'settings'>('home');
  const [assets, setAssets] = useState<Asset[]>(() => {
    const saved = localStorage.getItem('assets_data');
    return saved ? JSON.parse(saved) : INITIAL_ASSETS;
  });
  const [budgets, setBudgets] = useState<Budget[]>(() => {
    const saved = localStorage.getItem('budget_data');
    return saved ? JSON.parse(saved) : INITIAL_BUDGETS;
  });
  const [budgetCategoryList, setBudgetCategoryList] = useState<string[]>(() => {
    const saved = localStorage.getItem('budget_category_list');
    return saved ? JSON.parse(saved) : DEFAULT_BUDGET_CATEGORIES;
  });
  const [assetCategoryList, setAssetCategoryList] = useState<string[]>(() => {
    const saved = localStorage.getItem('asset_category_list');
    return saved ? JSON.parse(saved) : DEFAULT_ASSET_CATEGORIES;
  });
  
  const [customCategoryColors, setCustomCategoryColors] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('category_colors_map');
    return saved ? JSON.parse(saved) : CategoryColors;
  });

  const [selectedAssetCategory, setSelectedAssetCategory] = useState<string>('全部');
  const [selectedBudgetCategory, setSelectedBudgetCategory] = useState<string>('全部');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [activeHeaderColor, setActiveHeaderColor] = useState<string>('#ffffff');
  const [isAutoTheme, setIsAutoTheme] = useState(() => localStorage.getItem('auto_theme') === 'true');
  const [themeColor, setThemeColor] = useState(() => localStorage.getItem('app_theme') || '#ef4444');
  const [isSmallCardMode, setIsSmallCardMode] = useState(() => localStorage.getItem('small_card_mode') === 'true');

  const [viewingAssetChart, setViewingAssetChart] = useState<Asset | null>(null);
  const [showGlobalChart, setShowGlobalChart] = useState(false);
  const [chartRange, setChartRange] = useState<'30d' | '1y'>('30d');
  const [showDistribution, setShowDistribution] = useState<'asset' | 'budget' | null>(null);

  const [editingBudgetIndex, setEditingBudgetIndex] = useState<number | null>(null);
  const [viewingTransactionsIndex, setViewingTransactionsIndex] = useState<number | null>(null);

  const [quickAddIndex, setQuickAddIndex] = useState<number | null>(null);
  const [quickAmount, setQuickAmount] = useState('');
  const [editingCategory, setEditingCategory] = useState<{name: string, type: 'asset' | 'budget'} | null>(null);

  const [isAddingTransaction, setIsAddingTransaction] = useState(false);
  const [newTransactionAmount, setNewTransactionAmount] = useState('');
  const [newTransactionNote, setNewTransactionNote] = useState('');

  const [isEditingTotalLimit, setIsEditingTotalLimit] = useState(false);
  const [tempTotalLimit, setTempTotalLimit] = useState('');

  const [isAssetCatExpanded, setIsAssetCatExpanded] = useState(false);
  const [isBudgetCatExpanded, setIsBudgetCatExpanded] = useState(false);

  const [isScrolled, setIsScrolled] = useState(false);
  const longPressTimer = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabIndex = useMemo(() => {
    switch (activeTab) {
      case 'home': return 0;
      case 'budget': return 1;
      case 'settings': return 2;
      default: return 0;
    }
  }, [activeTab]);

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!INITIAL_ASSETS || !INITIAL_BUDGETS) throw new Error("Data Initialization Error");
        await new Promise(resolve => setTimeout(resolve, 600));
        setIsAppReady(true);
        const loader = document.getElementById('initial-loader');
        if (loader) {
          loader.style.opacity = '0';
          setTimeout(() => loader.remove(), 500);
        }
      } catch (e) {
        setIsAppReady(true);
        const loader = document.getElementById('initial-loader');
        if (loader) loader.remove();
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (isAutoTheme) {
      const randomIndex = Math.floor(Math.random() * THEME_COLORS.length);
      setThemeColor(THEME_COLORS[randomIndex]);
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 20;
      setIsScrolled(scrolled);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => localStorage.setItem('assets_data', JSON.stringify(assets)), [assets]);
  useEffect(() => localStorage.setItem('budget_data', JSON.stringify(budgets)), [budgets]);
  useEffect(() => localStorage.setItem('budget_category_list', JSON.stringify(budgetCategoryList)), [budgetCategoryList]);
  useEffect(() => localStorage.setItem('asset_category_list', JSON.stringify(assetCategoryList)), [assetCategoryList]);
  useEffect(() => localStorage.setItem('category_colors_map', JSON.stringify(customCategoryColors)), [customCategoryColors]);
  useEffect(() => {
    localStorage.setItem('app_theme', themeColor);
    localStorage.setItem('auto_theme', isAutoTheme.toString());
    localStorage.setItem('small_card_mode', isSmallCardMode.toString());
  }, [themeColor, isAutoTheme, isSmallCardMode]);

  const filteredAssets = useMemo(() => {
    if (selectedAssetCategory === '全部') return assets;
    return assets.filter(a => a.category === selectedAssetCategory);
  }, [assets, selectedAssetCategory]);

  const filteredBudgets = useMemo(() => {
    const list = budgets.filter(b => b.category !== '总计');
    if (selectedBudgetCategory === '全部') return list;
    return list.filter(b => b.category === selectedBudgetCategory);
  }, [budgets, selectedBudgetCategory]);

  const stats = useMemo(() => {
    const positive = assets.filter(a => a.category !== AssetCategory.LIABILITY);
    const negative = assets.filter(a => a.category === AssetCategory.LIABILITY);
    const totalAssets = positive.reduce((sum, a) => sum + a.value, 0);
    const totalLiabilities = negative.reduce((sum, a) => sum + a.value, 0);
    return { totalAssets, totalLiabilities, netWorth: totalAssets - totalLiabilities };
  }, [assets]);

  const budgetStats = useMemo(() => {
    const total = budgets.find(b => b.category === '总计');
    return {
      limit: total?.monthlyAmount || 0,
      spent: total?.spentThisMonth || 0,
      remaining: (total?.monthlyAmount || 0) - (total?.spentThisMonth || 0)
    };
  }, [budgets]);

  const assetDistributionData = useMemo(() => {
    const distribution: Record<string, number> = {};
    assets.forEach(a => {
      distribution[a.category] = (distribution[a.category] || 0) + a.value;
    });
    return Object.entries(distribution).map(([name, value]) => ({ name, value }));
  }, [assets]);

  const budgetDistributionData = useMemo(() => {
    const distribution: Record<string, number> = {};
    budgets.filter(b => b.category !== '总计').forEach(b => {
      distribution[b.category] = (distribution[b.category] || 0) + b.monthlyAmount;
    });
    return Object.entries(distribution).map(([name, value]) => ({ name, value }));
  }, [budgets]);

  const globalHistory = useMemo(() => {
    if (assets.length === 0) return [];
    const allDates = new Set<string>();
    assets.forEach(a => a.history.forEach(h => allDates.add(h.date)));
    const sortedDates = Array.from(allDates).sort((a, b) => parseDate(a) - parseDate(b));
    return sortedDates.map(date => {
      let total = 0;
      const targetTime = parseDate(date);
      assets.forEach(asset => {
        let val = 0;
        const exactMatch = asset.history.find(h => h.date === date);
        if (exactMatch) {
            val = exactMatch.value;
        } else {
            let closest = null;
            let maxTime = -1;
            for (const h of asset.history) {
                const hTime = parseDate(h.date);
                if (hTime <= targetTime && hTime > maxTime) {
                    maxTime = hTime;
                    closest = h;
                }
            }
            if (closest) val = closest.value;
        }
        if (asset.category === AssetCategory.LIABILITY) total -= val;
        else total += val;
      });
      return { date, value: total };
    });
  }, [assets]);

  const getChartData = (data: HistoryPoint[]) => {
      if (!data || data.length === 0) return [];
      const now = new Date().getTime();
      const cutoff = chartRange === '30d' 
          ? now - (30 * 24 * 60 * 60 * 1000)
          : new Date(new Date().getFullYear(), 0, 1).getTime();
      return data.filter(point => parseDate(point.date) >= cutoff);
  };

  const handleUpdateAsset = useCallback((id: string, updates: Partial<Asset>) => {
    setAssets(prev => prev.map(a => {
      if (a.id === id) {
        const newValue = updates.value !== undefined ? updates.value : a.value;
        const todayStr = new Date().toISOString().split('T')[0];
        const newHistory = updates.value !== undefined 
          ? [...a.history, { date: todayStr, value: newValue }]
          : a.history;
        return { 
          ...a, 
          ...updates, 
          history: newHistory,
          lastUpdated: new Date().toLocaleDateString('zh-CN') 
        };
      }
      return a;
    }));
  }, []);

  const handleUpdateBudget = useCallback((index: number, updates: Partial<Budget>) => {
    setBudgets(prev => {
      const newBudgets = [...prev];
      newBudgets[index] = { ...newBudgets[index], ...updates };
      if (newBudgets[index].category !== '总计') {
        const categoriesOnly = newBudgets.filter(b => b.category !== '总计');
        const totalIdx = newBudgets.findIndex(b => b.category === '总计');
        if (totalIdx !== -1) {
          newBudgets[totalIdx] = {
            ...newBudgets[totalIdx],
            monthlyAmount: categoriesOnly.reduce((sum, b) => sum + b.monthlyAmount, 0),
            spentThisMonth: categoriesOnly.reduce((sum, b) => sum + b.spentThisMonth, 0)
          };
        }
      }
      return newBudgets;
    });
  }, []);

  const handleAddNewBudget = () => {
    const defaultCategory = selectedBudgetCategory !== '全部' && budgetCategoryList.includes(selectedBudgetCategory)
      ? selectedBudgetCategory
      : (budgetCategoryList[0] || '生活');
    const newBudget: Budget = {
      category: defaultCategory,
      subCategory: '新预算项目',
      monthlyAmount: 0,
      spentThisMonth: 0,
      carryOver: 0,
      color: themeColor,
      transactions: []
    };
    setBudgets(prev => {
        const next = [...prev, newBudget];
        setTimeout(() => setEditingBudgetIndex(next.length - 1), 0);
        return next;
    });
  };

  const handleSaveTotalLimit = () => {
    const floatVal = parseFloat(tempTotalLimit);
    if (!isNaN(floatVal)) {
      const totalIdx = budgets.findIndex(b => b.category === '总计');
      if (totalIdx !== -1) handleUpdateBudget(totalIdx, { monthlyAmount: floatVal });
    }
    setIsEditingTotalLimit(false);
  };

  const startLongPress = useCallback((nameOrIndex: string | number, type: 'asset' | 'budget' | 'budgetItem') => {
    if (nameOrIndex === '全部') return;
    longPressTimer.current = window.setTimeout(() => {
      if (type === 'budgetItem') {
        setEditingBudgetIndex(nameOrIndex as number);
      } else {
        setEditingCategory({ name: nameOrIndex as string, type: type as 'asset' | 'budget' });
      }
    }, 700);
  }, []);

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const onAssetVisible = useCallback((id: string, color: string) => {
    setActiveHeaderColor(color);
  }, []);

  const handleAddBudgetCategory = () => {
    const newCat = prompt('请输入新预算分类名称：');
    if (newCat && !budgetCategoryList.includes(newCat)) {
      setBudgetCategoryList([...budgetCategoryList, newCat]);
      setCustomCategoryColors(prev => ({ ...prev, [newCat]: THEME_COLORS[Math.floor(Math.random() * THEME_COLORS.length)] }));
    }
  };

  const handleAddAssetCategory = () => {
    const newCat = prompt('请输入新资产分类名称：');
    if (newCat && !assetCategoryList.includes(newCat)) {
      setAssetCategoryList([...assetCategoryList, newCat]);
      setCustomCategoryColors(prev => ({ ...prev, [newCat]: THEME_COLORS[Math.floor(Math.random() * THEME_COLORS.length)] }));
    }
  };

  const handleRenameCategoryAction = (oldName: string, type: 'asset' | 'budget') => {
    const newName = prompt('重命名分类为：', oldName);
    if (newName && newName !== oldName) {
      if (type === 'budget') {
        setBudgetCategoryList(budgetCategoryList.map(c => c === oldName ? newName : c));
        setBudgets(budgets.map(b => b.category === oldName ? { ...b, category: newName } : b));
        if (selectedBudgetCategory === oldName) setSelectedBudgetCategory(newName);
      } else {
        setAssetCategoryList(assetCategoryList.map(c => c === oldName ? newName : c));
        setAssets(assets.map(a => a.category === (oldName as AssetCategory) ? { ...a, category: newName as AssetCategory } : a));
        if (selectedAssetCategory === oldName) setSelectedAssetCategory(newName);
      }
      setCustomCategoryColors(prev => {
        const next = { ...prev };
        next[newName] = next[oldName] || themeColor;
        delete next[oldName];
        return next;
      });
    }
  };

  const handleMoveCategoryAction = (index: number, direction: 'up' | 'down', type: 'asset' | 'budget') => {
    const list = type === 'asset' ? [...assetCategoryList] : [...budgetCategoryList];
    if (direction === 'up' && index > 0) {
      [list[index], list[index - 1]] = [list[index - 1], list[index]];
    } else if (direction === 'down' && index < list.length - 1) {
      [list[index], list[index + 1]] = [list[index + 1], list[index]];
    }
    if (type === 'asset') setAssetCategoryList(list);
    else setBudgetCategoryList(list);
  };

  const handleDeleteCategoryAction = (name: string, type: 'asset' | 'budget') => {
    if (!confirm(`确定要删除分类 "${name}" 吗？该分类下的项目将移动到 "其他"。`)) return;
    if (type === 'budget') {
      setBudgetCategoryList(budgetCategoryList.filter(c => c !== name));
      setBudgets(budgets.map(b => b.category === name ? { ...b, category: '其他' } : b));
      if (selectedBudgetCategory === name) setSelectedBudgetCategory('全部');
    } else {
      setAssetCategoryList(assetCategoryList.filter(c => c !== name));
      setAssets(assets.map(a => a.category === (name as AssetCategory) ? { ...a, category: '其他' as AssetCategory } : a));
      if (selectedAssetCategory === name) setSelectedAssetCategory('全部');
    }
  };

  const handleUpdateCategoryColor = (name: string, color: string) => {
    setCustomCategoryColors(prev => ({ ...prev, [name]: color }));
  };

  const getFullData = () => ({
    assets,
    budgets,
    budgetCategoryList,
    assetCategoryList,
    themeColor,
    isAutoTheme,
    customCategoryColors,
    timestamp: new Date().toISOString()
  });

  // Updated handleExportFile to use Data URL
  const handleExportFile = () => {
    const data = getFullData();
    const jsonString = JSON.stringify(data, null, 2);
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `assets_backup_${dateStr}.txt`;

    try {
      // 解决中文 Base64 乱码的通用转换方案
      const base64 = btoa(encodeURIComponent(jsonString).replace(/%([0-9A-F]{2})/g, (match, p1) => 
        String.fromCharCode(parseInt(p1, 16))
      ));
      const dataUrl = `data:application/octet-stream;base64,${base64}`;
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => document.body.removeChild(a), 300);
    } catch (err) {
      alert('导出失败');
    }
  };

  const performRestore = (jsonData: any) => {
    if (confirm('确定要从备份数据恢复吗？当前数据将被覆盖。')) {
        if (jsonData.assets) setAssets(jsonData.assets);
        if (jsonData.budgets) setBudgets(jsonData.budgets);
        if (jsonData.budgetCategoryList) setBudgetCategoryList(jsonData.budgetCategoryList);
        if (jsonData.assetCategoryList) setAssetCategoryList(jsonData.assetCategoryList);
        if (jsonData.themeColor) setThemeColor(jsonData.themeColor);
        if (jsonData.customCategoryColors) setCustomCategoryColors(jsonData.customCategoryColors);
        if (jsonData.isAutoTheme !== undefined) setIsAutoTheme(jsonData.isAutoTheme);
        alert('数据恢复成功！');
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);
        performRestore(data);
      } catch (err) {
        alert('文件解析失败，请确保选择了正确的备份文件。');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleClearData = () => {
    if (!confirm('确定要清空所有数据吗？这将重置所有资产余额和月度支出，但会保留您的分类模板和预算限额。')) return;
    setAssets(prev => prev.map(a => ({
      ...a,
      value: 0,
      history: [{ date: new Date().toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }), value: 0 }],
      lastUpdated: new Date().toLocaleDateString('zh-CN')
    })));
    setBudgets(prev => prev.map(b => ({ ...b, spentThisMonth: 0, transactions: [] })));
    alert('数据已清空。');
  };

  const isThemeDark = isDarkColor(themeColor);

  const CategoryManager = ({ list, colorsMap, onAdd, onRename, onDelete, onMove, onColorChange, type }: { list: string[], colorsMap: Record<string, string>, onAdd: () => void, onRename: (n: string, t: any) => void, onDelete: (n: string, t: any) => void, onMove: (idx: number, dir: 'up' | 'down', t: any) => void, onColorChange: (n: string, c: string) => void, type: 'asset' | 'budget' }) => (
    <div className="space-y-2 mt-4 animate-in slide-in-from-top-2 duration-300">
      {list.map((cat, idx) => (
        <div key={cat} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded group transition-all hover:border-slate-300 relative">
          <div className="flex items-center gap-3">
             <div className="relative group/color">
                <button 
                   className="w-4 h-4 rounded-full border border-white shadow-sm transition-transform active:scale-90"
                   style={{ backgroundColor: colorsMap[cat] || '#64748b' }}
                />
                <div className="absolute left-0 top-6 hidden group-hover/color:grid grid-cols-6 gap-2 p-3 bg-white shadow-2xl border border-slate-200 rounded z-[100] w-max min-w-[150px]">
                   {THEME_COLORS.map(c => (
                     <button 
                        key={c} 
                        onClick={() => onColorChange(cat, c)} 
                        style={{ backgroundColor: c }} 
                        className="w-4 h-4 rounded hover:scale-110 active:scale-90 transition-transform shadow-sm border border-black/5" 
                     />
                   ))}
                </div>
             </div>
             <span className="text-xs font-bold text-slate-700">{cat}</span>
          </div>
          <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onMove(idx, 'up', type)} disabled={idx === 0} className="p-1 text-slate-400 hover:text-slate-900 transition-colors disabled:opacity-20">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3"><path d="m18 15-6-6-6 6"/></svg>
            </button>
            <button onClick={() => onMove(idx, 'down', type)} disabled={idx === list.length - 1} className="p-1 text-slate-400 hover:text-slate-900 transition-colors disabled:opacity-20">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            <button onClick={() => onRename(cat, type)} className="p-1 text-slate-400 hover:text-blue-500 transition-colors">
              <Icons.Cog className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onDelete(cat, type)} className="p-1 text-slate-400 hover:text-rose-500 transition-colors">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
      ))}
      <button onClick={onAdd} style={{ borderColor: `${themeColor}40` }} className="w-full py-2 border-2 border-dashed text-slate-400 text-[10px] font-black uppercase tracking-widest rounded hover:border-slate-400 hover:text-slate-600 transition-all active:scale-[0.98]">
        + 新增分类
      </button>
    </div>
  );

  if (!isAppReady) return null;

  return (
    <div className="min-h-screen pb-40 transition-all duration-700 overflow-x-hidden" style={{ backgroundColor: activeHeaderColor === '#ffffff' ? '#f8fafc' : `${activeHeaderColor}08` }}>
      {/* Container with overflow-hidden for sliding content */}
      <div className="w-full overflow-hidden">
        <main 
          className="flex transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-transform w-[300%]" 
          style={{ transform: `translateX(-${tabIndex * (100 / 3)}%)` }}
        >
          {/* Asset Page */}
          <div className="w-1/3 flex-shrink-0 px-4 pt-10 box-border">
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              <div className="lg:col-span-1 space-y-6">
                <section 
                  className={`text-white rounded shadow-2xl relative overflow-hidden transition-all duration-500 flex flex-col justify-between sticky top-4 z-20 h-[180px] p-6 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.35)]`}
                  style={{ backgroundColor: themeColor, background: `linear-gradient(135deg, ${themeColor} 0%, ${themeColor}CC 100%)` }}
                >
                  <div className="flex justify-between items-start relative z-10">
                    <h2 className="text-white/60 text-[10px] font-black uppercase tracking-[0.2em]">净资产规模</h2>
                    <div className="flex gap-2">
                      <button onClick={() => setShowDistribution('asset')} className="h-8 w-8 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded text-white border border-white/10 transition-colors">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 2v10l8.5 5"/></svg>
                      </button>
                      <button onClick={() => setShowGlobalChart(true)} className="h-8 w-8 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded text-white border border-white/10 transition-colors">
                        <Icons.Chart className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className={`font-mono font-black relative z-10 tracking-tighter text-white transition-all duration-500 text-3xl`}>
                    {new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 }).format(stats.netWorth)}
                  </div>
                  <div className={`grid grid-cols-2 gap-3 relative z-10 border-t border-white/10 pt-3 transition-all duration-500 origin-bottom opacity-100 h-auto scale-y-100`}>
                    <div className="bg-white/10 p-2 rounded border border-white/5">
                      <span className="text-[8px] font-black text-white/50 uppercase block">总资产</span>
                      <span className="text-sm font-bold text-white">¥{stats.totalAssets.toLocaleString()}</span>
                    </div>
                    <div className="bg-black/10 p-2 rounded border border-white/5 text-right">
                      <span className="text-[8px] font-black text-white/50 uppercase block">负债</span>
                      <span className="text-sm font-bold text-rose-200">-¥{stats.totalLiabilities.toLocaleString()}</span>
                    </div>
                  </div>
                </section>
              </div>
              <div className="lg:col-span-2 overflow-hidden">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-black text-slate-900 uppercase tracking-tighter">资产账户清单</h2>
                    <div className="max-w-full overflow-hidden">
                      <FilterBar 
                        selected={selectedAssetCategory} 
                        onSelect={setSelectedAssetCategory} 
                        categories={assetCategoryList} 
                        onAdd={handleAddAssetCategory}
                        type="asset"
                        themeColor={themeColor}
                        isThemeDark={isThemeDark}
                        startLongPress={startLongPress}
                        clearLongPress={clearLongPress}
                      />
                    </div>
                  </div>
                  <button onClick={() => setIsModalOpen(true)} className="flex items-center justify-center gap-2 text-white px-5 h-10 rounded text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 flex-shrink-0 md:mt-6" style={{ backgroundColor: themeColor }}>
                    <Icons.Plus className="w-4 h-4" /> <span>新增账户</span>
                  </button>
                </div>
                <div className={`grid ${isSmallCardMode ? 'grid-cols-2 gap-3' : 'grid-cols-1 md:grid-cols-2 gap-4'} animate-in fade-in duration-500`}>
                  {filteredAssets.map(asset => (
                    <AssetCard key={asset.id} asset={asset} categoryColor={customCategoryColors[asset.category]} onDelete={(id) => setAssets(prev => prev.filter(a => a.id !== id))} onUpdate={handleUpdateAsset} onShowChart={setViewingAssetChart} onEditFull={setEditingAsset} onVisible={onAssetVisible} isSmallMode={isSmallCardMode} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Budget Page */}
          <div className="w-1/3 flex-shrink-0 px-4 pt-10 box-border">
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              <div className="lg:col-span-1 space-y-6">
                <section 
                  className={`text-white rounded shadow-2xl relative overflow-hidden transition-all duration-500 flex flex-col justify-between sticky top-4 z-20 h-[180px] p-6 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.35)]`}
                  style={{ backgroundColor: themeColor, background: `linear-gradient(135deg, ${themeColor} 0%, ${themeColor}CC 100%)` }}
                >
                  <div className="flex justify-between items-start relative z-10">
                    <h2 className="text-white/60 text-[10px] font-black uppercase tracking-[0.2em]">月度预算剩余</h2>
                    <div className="flex gap-2 items-center">
                      <button onClick={() => setShowDistribution('budget')} className="h-8 w-8 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded text-white border border-white/10 transition-colors">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 2v10l8.5 5"/></svg>
                      </button>
                      <div className="h-8 px-2 flex items-center bg-white/10 rounded text-[10px] font-black border border-white/10 tracking-widest">
                        {Math.round((budgetStats.spent / (budgetStats.limit || 1)) * 100)}%
                      </div>
                    </div>
                  </div>
                  <div className={`font-mono font-black relative z-10 tracking-tighter text-white transition-all duration-500 text-3xl`}>
                    {new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 }).format(budgetStats.remaining)}
                  </div>
                  <div className={`grid grid-cols-2 gap-3 relative z-10 border-t border-white/10 pt-3 transition-all duration-500 origin-bottom opacity-100 h-auto scale-y-100`}>
                    <div className="bg-white/10 p-2 rounded border border-white/5 overflow-hidden">
                      <span className="text-[8px] font-black text-white/50 uppercase block">总预算</span>
                      {isEditingTotalLimit ? (
                        <input 
                          autoFocus
                          type="number"
                          value={tempTotalLimit}
                          onChange={(e) => setTempTotalLimit(e.target.value)}
                          onBlur={handleSaveTotalLimit}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveTotalLimit()}
                          className="w-full bg-white/20 text-white font-bold text-sm px-1 rounded outline-none border-none"
                        />
                      ) : (
                        <span 
                          onClick={() => { setIsEditingTotalLimit(true); setTempTotalLimit(budgetStats.limit.toString()); }}
                          className="text-sm font-bold text-white cursor-pointer hover:bg-white/5 px-0.5 rounded transition-colors block"
                        >
                          ¥{budgetStats.limit.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <div className="bg-black/10 p-2 rounded border border-white/5 text-right">
                      <span className="text-[8px] font-black text-white/50 uppercase block">已确认支出</span>
                      <span className="text-sm font-bold text-white">¥{budgetStats.spent.toLocaleString()}</span>
                    </div>
                  </div>
                </section>
              </div>
              <div className="lg:col-span-2 overflow-hidden">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-black text-slate-900 uppercase tracking-tighter">消费预算计划</h2>
                    <div className="max-w-full overflow-hidden">
                      <FilterBar 
                        selected={selectedBudgetCategory} 
                        onSelect={setSelectedBudgetCategory} 
                        categories={budgetCategoryList}
                        onAdd={handleAddBudgetCategory}
                        type="budget"
                        themeColor={themeColor}
                        isThemeDark={isThemeDark}
                        startLongPress={startLongPress}
                        clearLongPress={clearLongPress}
                      />
                    </div>
                  </div>
                  <button onClick={handleAddNewBudget} className="flex items-center justify-center gap-2 text-white px-5 h-10 rounded text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 flex-shrink-0 md:mt-6" style={{ backgroundColor: themeColor }}>
                    <Icons.Plus className="w-4 h-4" /> <span>新增预算</span>
                  </button>
                </div>
                <div className={`grid ${isSmallCardMode ? 'grid-cols-2 gap-3' : 'grid-cols-1 md:grid-cols-2 gap-4'} animate-in fade-in duration-500`}>
                  {filteredBudgets.map((b) => {
                    const realIndex = budgets.indexOf(b);
                    return (
                      <BudgetCard 
                        key={realIndex} 
                        budget={b} 
                        index={realIndex} 
                        themeColor={customCategoryColors[b.category] || themeColor} 
                        onUpdate={handleUpdateBudget} 
                        onEditFull={setEditingBudgetIndex} 
                        onQuickAdd={setQuickAddIndex} 
                        onViewTransactions={setViewingTransactionsIndex}
                        isSmallMode={isSmallCardMode}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Settings Page */}
          <div className="w-1/3 flex-shrink-0 px-4 pt-10 box-border">
            <div className="max-w-2xl mx-auto space-y-8">
              <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden p-8 space-y-8">
                <div className="-mx-8 -mt-8 px-8 py-6 mb-2" style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}22)` }}>
                  <h2 className={`text-2xl font-black uppercase tracking-tighter ${isThemeDark ? 'text-white' : 'text-slate-900'}`}>应用设置</h2>
                </div>
                <section>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">应用主题色</label>
                  <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
                    {THEME_COLORS.map(color => (
                      <button key={color} onClick={() => { setThemeColor(color); setIsAutoTheme(false); }} style={{ backgroundColor: color }} className={`w-full aspect-square rounded border-2 ${themeColor === color ? 'border-slate-900 ring-4 ring-slate-900/10' : 'border-slate-100'} transition-all hover:scale-105 active:scale-95`} />
                    ))}
                  </div>
                </section>
                
                <section className="pt-6 border-t border-slate-100">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">显示偏好</label>
                  <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded">
                    <div>
                      <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">紧凑型小卡片模式</h4>
                      <p className="text-[10px] font-bold text-slate-400 mt-0.5">一屏展示更多内容</p>
                    </div>
                    <button 
                      onClick={() => setIsSmallCardMode(!isSmallCardMode)}
                      className={`w-12 h-6 rounded-full transition-all duration-300 relative ${isSmallCardMode ? 'bg-slate-900' : 'bg-slate-200'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${isSmallCardMode ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                </section>

                <div className="pt-6 border-t border-slate-100 space-y-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">数据管理与备份</label>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={handleExportFile} 
                      style={{ backgroundColor: themeColor }}
                      className="flex flex-col items-center justify-center gap-2 py-6 text-white font-black text-[10px] uppercase tracking-widest rounded hover:brightness-110 shadow-lg transition-all active:scale-[0.98]"
                    >
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M12 15V3m0 12l-4-4m4 4l4-4M2 17l.621 2.485A2 2 0 0 0 4.561 21h14.878a2 2 0 0 0 1.94-1.515L22 17" /></svg>
                      导出数据文件
                    </button>
                    <button 
                      onClick={() => fileInputRef.current?.click()} 
                      className="flex flex-col items-center justify-center gap-2 py-6 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded hover:bg-slate-800 shadow-lg transition-all active:scale-[0.98]"
                    >
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M12 3v12m0-12l-4 4m4-4l4 4M2 17l.621 2.485A2 2 0 0 0 4.561 21h14.878a2 2 0 0 0 1.94-1.515L22 17" /></svg>
                      导入备份文件
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleImportFile} 
                      accept=".json,.txt" 
                      className="hidden" 
                    />
                  </div>

                  <button onClick={handleClearData} className="w-full py-3 bg-rose-50 text-rose-600 border border-rose-200 font-black text-[10px] uppercase tracking-widest rounded hover:bg-rose-100 transition-all active:scale-[0.98]">
                      清空本地数据
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-auto min-w-[320px] max-w-lg z-40 h-16 flex items-center justify-center gap-3 px-3 rounded-lg shadow-[0_12px_40px_-10px_rgba(0,0,0,0.15)] transition-all duration-700 border border-slate-200 bg-white backdrop-blur-md">
        {[
          { id: 'home', label: '资产', icon: Icons.Home },
          { id: 'budget', label: '预算', icon: Icons.Target },
          { id: 'settings', label: '设置', icon: Icons.Cog }
        ].map((item: any) => (
          <button key={item.id} onClick={() => setActiveTab(item.id)} style={{ backgroundColor: activeTab === item.id ? themeColor : 'transparent', color: activeTab === item.id ? (isThemeDark ? 'white' : '#0f172a') : '#94a3b8' }} className={`flex items-center justify-center h-12 flex-1 min-w-[80px] px-3 transition-all duration-300 rounded overflow-hidden group border ${activeTab === item.id ? 'border-transparent' : 'border-transparent hover:border-slate-100'} active:scale-95`}>
            <item.icon className={`w-5 h-5 flex-shrink-0 mr-2 transition-transform ${activeTab === item.id ? 'scale-110' : ''}`} />
            <span className="text-[11px] font-black whitespace-nowrap">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Modals remain same */}
      <AddAssetModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onAdd={(newAsset) => setAssets([...assets, { ...newAsset, id: Math.random().toString(36).substr(2, 9), currency: 'CNY', lastUpdated: new Date().toLocaleDateString('zh-CN'), history: [{ date: new Date().toISOString().split('T')[0], value: newAsset.value }] }])} assetCategoryList={assetCategoryList} categoryColors={customCategoryColors} defaultCategory={selectedAssetCategory !== '全部' ? selectedAssetCategory : undefined} />
    </div>
  );
};
