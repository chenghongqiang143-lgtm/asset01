import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import { Asset, AssetCategory, CategoryColors, HistoryPoint, Budget } from './types';
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
  // Generate roughly 1 year of data, every 3 days to keep it efficient but detailed enough
  for (let i = 0; i < 120; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - (i * 3));
    const dateStr = d.toISOString().split('T')[0];
    
    // Add point
    history.push({
      date: dateStr,
      value: currentValue
    });

    // Random walk backwards
    const change = (Math.random() - 0.5) * 0.05; // +/- 2.5% variation
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
  { category: '总计', monthlyAmount: 8000, spentThisMonth: 3200, carryOver: 500 },
  { category: '生活', subCategory: '餐饮', monthlyAmount: 3000, spentThisMonth: 1800, carryOver: 200, notes: '吃饭相关', color: '#f43f5e' },
  { category: '生活', subCategory: '购物', monthlyAmount: 2000, spentThisMonth: 500, carryOver: 0, notes: '剁手买买买', color: '#ec4899' },
  { category: '生活', subCategory: '交通', monthlyAmount: 500, spentThisMonth: 120, carryOver: 0, color: '#3b82f6' },
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
  const [viewingAssetChart, setViewingAssetChart] = useState<Asset | null>(null);
  const [showGlobalChart, setShowGlobalChart] = useState(false);
  const [chartRange, setChartRange] = useState<'30d' | '1y'>('30d');
  const [showDistribution, setShowDistribution] = useState<'asset' | 'budget' | null>(null);
  const [importText, setImportText] = useState('');

  const [editingBudgetIndex, setEditingBudgetIndex] = useState<number | null>(null);
  const [quickAddIndex, setQuickAddIndex] = useState<number | null>(null);
  const [quickAmount, setQuickAmount] = useState('');
  const [editingCategory, setEditingCategory] = useState<{name: string, type: 'asset' | 'budget'} | null>(null);

  const [isEditingTotalLimit, setIsEditingTotalLimit] = useState(false);
  const [tempTotalLimit, setTempTotalLimit] = useState('');

  const [isAssetCatExpanded, setIsAssetCatExpanded] = useState(false);
  const [isBudgetCatExpanded, setIsBudgetCatExpanded] = useState(false);

  // New state for scroll collapsing
  const [isScrolled, setIsScrolled] = useState(false);

  const longPressTimer = useRef<number | null>(null);

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

  // Scroll listener for collapsing effect
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
  }, [themeColor, isAutoTheme]);

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

  // Correct calculation of global history by aligning dates
  const globalHistory = useMemo(() => {
    if (assets.length === 0) return [];
    
    // 1. Collect all unique dates
    const allDates = new Set<string>();
    assets.forEach(a => a.history.forEach(h => allDates.add(h.date)));
    
    // 2. Sort dates chronologically
    const sortedDates = Array.from(allDates).sort((a, b) => parseDate(a) - parseDate(b));

    // 3. Calculate total value for each date
    return sortedDates.map(date => {
      let total = 0;
      const targetTime = parseDate(date);

      assets.forEach(asset => {
        // Find exact match or the closest previous record
        // This ensures if an asset wasn't updated on this specific date, we use its last known value
        // instead of 0 (which would cause a dip).
        
        let val = 0;
        const exactMatch = asset.history.find(h => h.date === date);
        
        if (exactMatch) {
            val = exactMatch.value;
        } else {
            // Find the latest point that is before or equal to targetTime
            let closest = null;
            // Assuming history is sorted, we can iterate or filter. 
            // Since we generated history sorted, let's assume it is roughly sorted or scan it.
            // A simple scan is safe for small datasets.
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

  // Filter history based on selected range
  const getChartData = (data: HistoryPoint[]) => {
      if (!data || data.length === 0) return [];
      
      const now = new Date().getTime();
      const cutoff = chartRange === '30d' 
          ? now - (30 * 24 * 60 * 60 * 1000)
          : new Date(new Date().getFullYear(), 0, 1).getTime(); // Start of year

      return data.filter(point => parseDate(point.date) >= cutoff);
  };

  const handleUpdateAsset = useCallback((id: string, updates: Partial<Asset>) => {
    setAssets(prev => prev.map(a => {
      if (a.id === id) {
        const newValue = updates.value !== undefined ? updates.value : a.value;
        // Use standard YYYY-MM-DD for new entries to ensure sorting works best
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

  const handleSaveTotalLimit = () => {
    const val = parseFloat(tempTotalLimit);
    if (!isNaN(val)) {
      const totalIdx = budgets.findIndex(b => b.category === '总计');
      if (totalIdx !== -1) handleUpdateBudget(totalIdx, { monthlyAmount: val });
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

  const handleQuickAdd = () => {
    if (quickAddIndex !== null) {
      const amount = parseFloat(quickAmount);
      if (!isNaN(amount)) {
        handleUpdateBudget(quickAddIndex, { spentThisMonth: budgets[quickAddIndex].spentThisMonth + amount });
      }
    }
    setQuickAddIndex(null);
    setQuickAmount('');
  };

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

  const handleRenameCategory = () => {
    if (!editingCategory) return;
    handleRenameCategoryAction(editingCategory.name, editingCategory.type);
    setEditingCategory(null);
  };

  const handleDeleteHistoryPoint = (assetId: string, index: number) => {
    if (!confirm('确定要删除这条记录吗？')) return;
    setAssets(prev => prev.map(a => {
      if (a.id === assetId) {
        const newHistory = [...a.history];
        newHistory.splice(index, 1);
        if (viewingAssetChart && viewingAssetChart.id === assetId) {
          setViewingAssetChart({ ...a, history: newHistory });
        }
        return { ...a, history: newHistory };
      }
      return a;
    }));
  };

  const handleDeleteBudget = () => {
    if (editingBudgetIndex === null) return;
    if (!confirm('确定要删除这个预算项目吗？')) return;

    setBudgets(prev => {
      const newBudgets = prev.filter((_, i) => i !== editingBudgetIndex);
      
      const categoriesOnly = newBudgets.filter(b => b.category !== '总计');
      const totalIdx = newBudgets.findIndex(b => b.category === '总计');
      
      if (totalIdx !== -1) {
        newBudgets[totalIdx] = {
          ...newBudgets[totalIdx],
          monthlyAmount: categoriesOnly.reduce((sum, b) => sum + b.monthlyAmount, 0),
          spentThisMonth: categoriesOnly.reduce((sum, b) => sum + b.spentThisMonth, 0)
        };
      }
      return newBudgets;
    });
    setEditingBudgetIndex(null);
  };

  const handleExportData = () => {
    const data = { assets, budgets, budgetCategoryList, assetCategoryList, themeColor, isAutoTheme, customCategoryColors };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assets_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert('导出成功！');
  };

  const handleImportData = () => {
    if (!importText.trim()) { alert('请粘贴备份数据！'); return; }
    try {
      const data = JSON.parse(importText);
      if (data.assets) setAssets(data.assets);
      if (data.budgets) setBudgets(data.budgets);
      if (data.budgetCategoryList) setBudgetCategoryList(data.budgetCategoryList);
      if (data.assetCategoryList) setAssetCategoryList(data.assetCategoryList);
      if (data.themeColor) setThemeColor(data.themeColor);
      if (data.customCategoryColors) setCustomCategoryColors(data.customCategoryColors);
      setImportText('');
      alert('数据导入成功！');
    } catch (e) {
      alert('导入失败，请检查格式。');
    }
  };

  const handleClearData = () => {
    if (!confirm('确定要清空所有数据吗？这将重置所有资产余额和月度支出，但会保留您的分类模板和预算限额。')) return;
    setAssets(prev => prev.map(a => ({
      ...a,
      value: 0,
      history: [{ date: new Date().toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }), value: 0 }],
      lastUpdated: new Date().toLocaleDateString('zh-CN')
    })));
    setBudgets(prev => prev.map(b => ({ ...b, spentThisMonth: 0 })));
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
      <main className="max-w-6xl mx-auto pt-10 pb-10">
        <div 
          className="flex transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-transform" 
          style={{ transform: `translateX(-${tabIndex * 100}%)`, width: '100%' }}
        >
          <div className="w-full flex-shrink-0 px-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredAssets.map(asset => (
                    <AssetCard key={asset.id} asset={asset} categoryColor={customCategoryColors[asset.category]} onDelete={(id) => setAssets(prev => prev.filter(a => a.id !== id))} onUpdate={handleUpdateAsset} onShowChart={setViewingAssetChart} onEditFull={setEditingAsset} onVisible={onAssetVisible} />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="w-full flex-shrink-0 px-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
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
                <div className="mb-4">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          <div className="w-full flex-shrink-0 px-4">
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
                <div className="grid grid-cols-1 gap-4 pt-6 border-t border-slate-100">
                  <div className="border border-slate-100 rounded overflow-hidden">
                    <button onClick={() => setIsAssetCatExpanded(!isAssetCatExpanded)} className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors">
                      <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest cursor-pointer">资产分类管理</label>
                      <div className={`transition-transform duration-300 ${isAssetCatExpanded ? 'rotate-180' : ''}`}>
                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="m18 15-6-6-6 6" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                    </button>
                    {isAssetCatExpanded && <div className="p-4 border-t border-slate-100"><CategoryManager list={assetCategoryList} colorsMap={customCategoryColors} onAdd={handleAddAssetCategory} onRename={handleRenameCategoryAction} onDelete={handleDeleteCategoryAction} onMove={handleMoveCategoryAction} onColorChange={handleUpdateCategoryColor} type="asset" /></div>}
                  </div>
                  <div className="border border-slate-100 rounded overflow-hidden">
                    <button onClick={() => setIsBudgetCatExpanded(!isBudgetCatExpanded)} className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors">
                      <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest cursor-pointer">预算大类管理</label>
                      <div className={`transition-transform duration-300 ${isBudgetCatExpanded ? 'rotate-180' : ''}`}>
                         <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="m18 15-6-6-6 6" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                    </button>
                    {isBudgetCatExpanded && <div className="p-4 border-t border-slate-100"><CategoryManager list={budgetCategoryList} colorsMap={customCategoryColors} onAdd={handleAddBudgetCategory} onRename={handleRenameCategoryAction} onDelete={handleDeleteCategoryAction} onMove={handleMoveCategoryAction} onColorChange={handleUpdateCategoryColor} type="budget" /></div>}
                  </div>
                </div>
                <div className="pt-6 border-t border-slate-100 space-y-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">数据管理</label>
                  <div className="flex flex-col gap-4">
                    <div className="flex gap-4">
                        <button onClick={handleExportData} className="flex-1 py-3 bg-slate-50 text-slate-600 font-bold text-[10px] uppercase tracking-widest border border-slate-200 rounded hover:bg-slate-100 transition-all active:scale-[0.98]">导出备份</button>
                        <button onClick={handleImportData} style={{ backgroundColor: themeColor }} className="flex-1 py-3 text-white font-black text-[10px] uppercase tracking-widest rounded hover:brightness-110 shadow-md transition-all active:scale-[0.98]">导入恢复</button>
                    </div>
                    <button onClick={handleClearData} className="w-full py-3 bg-rose-50 text-rose-600 border border-rose-200 font-black text-[10px] uppercase tracking-widest rounded hover:bg-rose-100 transition-all active:scale-[0.98]">
                        清空数据 (保留模板)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <div className="fixed bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-50 via-slate-50/80 to-transparent pointer-events-none z-30" />
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
      {showDistribution && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in zoom-in-95 duration-300" onClick={() => setShowDistribution(null)}>
          <div className="bg-white rounded w-full max-w-lg p-8 shadow-2xl border border-white/20 overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">{showDistribution === 'asset' ? '资产构成分析' : '预算额度分布'}</h2>
              <button onClick={() => setShowDistribution(null)} className="text-slate-400 hover:text-slate-900 font-black text-[10px] uppercase tracking-widest">关闭</button>
            </div>
            <div className="h-[250px] w-full mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={showDistribution === 'asset' ? assetDistributionData : budgetDistributionData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">
                    {(showDistribution === 'asset' ? assetDistributionData : budgetDistributionData).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={customCategoryColors[entry.name] || THEME_COLORS[index % THEME_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`¥${value.toLocaleString()}`, '金额']} contentStyle={{ borderRadius: '2px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 900 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 pt-4 border-t border-slate-100">
               {[...(showDistribution === 'asset' ? assetDistributionData : budgetDistributionData)].sort((a,b) => b.value - a.value).map((item, index) => {
                 const total = (showDistribution === 'asset' ? assetDistributionData : budgetDistributionData).reduce((sum, i) => sum + i.value, 0);
                 const percent = total > 0 ? (item.value / total * 100).toFixed(1) : '0.0';
                 const color = customCategoryColors[item.name] || THEME_COLORS[index % THEME_COLORS.length];
                 return (
                   <div key={item.name} className="flex justify-between items-center p-3 bg-slate-50 rounded border border-slate-100 hover:border-slate-200 transition-colors">
                     <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                       <span className="text-[10px] font-black text-slate-700 uppercase tracking-tighter">{item.name}</span>
                     </div>
                     <div className="flex gap-8 items-center font-mono">
                       <span className="text-[10px] font-bold text-slate-400">{percent}%</span>
                       <span className="text-[11px] font-black text-slate-900 w-20 text-right">¥{item.value.toLocaleString()}</span>
                     </div>
                   </div>
                 );
               })}
               <div className="flex justify-between items-center p-3 mt-4 rounded transition-colors duration-500" style={{ backgroundColor: themeColor, color: isThemeDark ? '#fff' : '#0f172a' }}>
                 <span className="text-[10px] font-black uppercase tracking-widest">总计</span>
                 <span className="text-[12px] font-mono font-black">¥{(showDistribution === 'asset' ? assetDistributionData : budgetDistributionData).reduce((sum, i) => sum + i.value, 0).toLocaleString()}</span>
               </div>
            </div>
          </div>
        </div>
      )}
      {(viewingAssetChart || showGlobalChart) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in zoom-in-95 duration-300">
          <div className="bg-white rounded w-full max-w-2xl p-6 shadow-2xl border border-white/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
              <div>
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{showGlobalChart ? '资产趋势分析' : viewingAssetChart?.name}</h2>
                  <p className="text-xs font-bold text-slate-400 mt-1">{showGlobalChart ? '全账户资产净值历史波动' : '该账户的历史资产价值记录'}</p>
              </div>
              <div className="flex items-center gap-4">
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button onClick={() => setChartRange('30d')} className={`px-4 py-1.5 text-[10px] font-black rounded-md transition-all ${chartRange === '30d' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>30天</button>
                    <button onClick={() => setChartRange('1y')} className={`px-4 py-1.5 text-[10px] font-black rounded-md transition-all ${chartRange === '1y' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>本年</button>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setViewingAssetChart(null); setShowGlobalChart(false); }} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-900 transition-colors">
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
              </div>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={getChartData(showGlobalChart ? globalHistory : (viewingAssetChart?.history || []))} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tickFormatter={(val) => {
                       // Format date to MM-DD for cleaner x-axis
                       try {
                           const d = new Date(val);
                           if (isNaN(d.getTime())) return val;
                           return `${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
                       } catch(e) { return val; }
                    }}
                    tick={{ fontSize: 9, fill: '#cbd5e1', fontWeight: 800, dy: 10 }}
                    padding={{ left: 10, right: 10 }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tickFormatter={(val) => `¥${(val/10000).toFixed(1)}w`} 
                    tick={{ fontSize: 9, fill: '#cbd5e1', fontWeight: 800, dx: 5, dy: -10 }} 
                    mirror={true}
                    width={40}
                  />
                  <Tooltip formatter={(val: number) => [`¥${val.toLocaleString()}`, '金额']} contentStyle={{ borderRadius: '2px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 900 }} />
                  <Area type="monotone" dataKey="value" stroke={viewingAssetChart ? (viewingAssetChart.color || customCategoryColors[viewingAssetChart.category] || CategoryColors[viewingAssetChart.category as AssetCategory]) : themeColor} strokeWidth={3} fillOpacity={0.05} fill={viewingAssetChart ? (viewingAssetChart.color || customCategoryColors[viewingAssetChart.category] || CategoryColors[viewingAssetChart.category as AssetCategory]) : themeColor} dot={{ r: 3, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 5, strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            {viewingAssetChart && (
                <div className="mt-6 border-t border-slate-100 pt-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">历史记录管理</h3>
                    <div className="max-h-48 overflow-y-auto space-y-1 pr-2">
                        {[...viewingAssetChart.history].map((h, i) => ({...h, originalIndex: i})).reverse().map((point) => (
                            <div key={point.originalIndex} className="flex items-center justify-between p-2 rounded hover:bg-slate-50 group transition-colors border border-transparent hover:border-slate-100">
                                <div className="flex items-center gap-4">
                                    <span className="text-[10px] font-black text-slate-400 font-mono w-20">{point.date}</span>
                                    <span className="text-sm font-bold text-slate-700 font-mono">¥{point.value.toLocaleString()}</span>
                                </div>
                                <button 
                                    onClick={() => handleDeleteHistoryPoint(viewingAssetChart.id, point.originalIndex)}
                                    className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded transition-all opacity-0 group-hover:opacity-100"
                                    title="删除记录"
                                >
                                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                </button>
                            </div>
                        ))}
                        {viewingAssetChart.history.length === 0 && <div className="text-center py-4 text-xs text-slate-300 font-bold">暂无记录</div>}
                    </div>
                </div>
            )}
          </div>
        </div>
      )}
      <AddAssetModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onAdd={(newAsset) => setAssets([...assets, { ...newAsset, id: Math.random().toString(36).substr(2, 9), currency: 'CNY', lastUpdated: new Date().toLocaleDateString('zh-CN'), history: [{ date: new Date().toISOString().split('T')[0], value: newAsset.value }] }])} assetCategoryList={assetCategoryList} categoryColors={customCategoryColors} />
      {editingAsset && <AddAssetModal 
        isOpen={!!editingAsset} 
        onClose={() => setEditingAsset(null)} 
        onAdd={(data) => { handleUpdateAsset(editingAsset.id, data); setEditingAsset(null); }} 
        initialData={editingAsset} 
        assetCategoryList={assetCategoryList} 
        categoryColors={customCategoryColors}
        onDelete={() => {
            if (confirm(`确定要删除账户 "${editingAsset.name}" 吗？`)) {
                setAssets(prev => prev.filter(a => a.id !== editingAsset.id));
                setEditingAsset(null);
            }
        }}
      />}
      {editingBudgetIndex !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xl animate-in zoom-in-95 duration-300">
          <div className="bg-white rounded w-full max-sm:max-w-xs max-w-sm p-8 shadow-2xl overflow-y-auto max-h-[90vh] overflow-hidden">
            <div className="-mx-8 -mt-8 px-8 py-6 mb-8" style={{ background: `linear-gradient(135deg, ${budgets[editingBudgetIndex].color || themeColor}, ${(budgets[editingBudgetIndex].color || themeColor)}22)` }}>
                <h2 className={`text-xl font-black uppercase ${isDarkColor(budgets[editingBudgetIndex].color || themeColor) ? 'text-white' : 'text-slate-900'}`}>编辑预算项目</h2>
            </div>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">分类</label>
                  <select className="w-full px-4 py-3 border border-slate-200 rounded font-bold bg-slate-50" value={budgets[editingBudgetIndex].category} onChange={e => handleUpdateBudget(editingBudgetIndex, { category: e.target.value })}>
                    {budgetCategoryList.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">名称</label>
                  <input type="text" className="w-full px-4 py-3 border border-slate-200 rounded font-bold" value={budgets[editingBudgetIndex].subCategory || ''} onChange={e => handleUpdateBudget(editingBudgetIndex, { subCategory: e.target.value })} placeholder="如：餐饮"/>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">月度额度 (¥)</label>
                <input type="number" className="w-full px-4 py-3 border border-slate-200 rounded font-bold" value={budgets[editingBudgetIndex].monthlyAmount} onChange={e => handleUpdateBudget(editingBudgetIndex, { monthlyAmount: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">备注信息</label>
                <input type="text" className="w-full px-4 py-3 border border-slate-200 rounded font-bold" value={budgets[editingBudgetIndex].notes || ''} onChange={e => handleUpdateBudget(editingBudgetIndex, { notes: e.target.value })} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">预算色值</label>
                <div className="grid grid-cols-6 gap-2">
                   {THEME_COLORS.map(color => (
                     <button 
                       key={color} 
                       onClick={() => handleUpdateBudget(editingBudgetIndex, { color })} 
                       style={{ backgroundColor: color }} 
                       className={`w-full aspect-square rounded border ${budgets[editingBudgetIndex].color === color ? 'border-slate-900 ring-2 ring-slate-900/10' : 'border-slate-100'} transition-all hover:scale-105 active:scale-95`}
                     />
                   ))}
                </div>
              </div>
            </div>
            <div className="flex gap-4 mt-10">
                <button onClick={handleDeleteBudget} className="px-5 py-4 text-rose-500 font-black text-xs uppercase tracking-widest hover:bg-rose-50 transition-colors border border-rose-100 rounded">删除</button>
                <button onClick={() => setEditingBudgetIndex(null)} style={{ backgroundColor: budgets[editingBudgetIndex].color || themeColor }} className="flex-1 py-4 text-white font-black text-xs uppercase tracking-widest rounded shadow-lg active:scale-95 transition-all">保存</button>
            </div>
          </div>
        </div>
      )}
      {editingCategory && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setEditingCategory(null)}>
          <div className="bg-white p-6 rounded shadow-2xl font-bold text-slate-900 text-sm max-w-xs text-center animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <p className="mb-4">是否重命名分类 "{editingCategory.name}"？</p>
            <div className="flex gap-3">
              <button onClick={() => setEditingCategory(null)} className="flex-1 py-2 text-slate-400 text-xs font-black uppercase">取消</button>
              <button onClick={handleRenameCategory} style={{ backgroundColor: themeColor }} className="flex-1 py-2 text-white rounded text-xs font-black uppercase tracking-widest">确认重命名</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};