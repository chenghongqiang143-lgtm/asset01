
import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import { Asset, AssetCategory, CategoryColors, HistoryPoint, Budget, Transaction } from './types';
import { Icons } from './constants';
import AssetCard from './components/AssetCard';
import BudgetCard from './components/BudgetCard';
import AddAssetModal from './components/AddAssetModal';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';

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
    history.push({ date: dateStr, value: currentValue });
    const change = (Math.random() - 0.5) * 0.05;
    currentValue = currentValue / (1 + change);
  }
  return history.reverse();
};

const DEFAULT_BUDGET_CATEGORIES = ['生活', '投资', '其他'];
const DEFAULT_ASSET_CATEGORIES = Object.values(AssetCategory);

const INITIAL_ASSETS: Asset[] = [
  { id: '1', name: '支付宝余额', category: AssetCategory.THIRD_PARTY, value: 45000, currency: 'CNY', change24h: 0, lastUpdated: '2024-05-20', history: generateMockHistory(45000) },
  { id: '2', name: '招商银行储蓄卡', category: AssetCategory.BANK, value: 120500, currency: 'CNY', change24h: 0.01, lastUpdated: '2024-05-20', history: generateMockHistory(120500) },
  { id: '3', name: '稳健理财Pro', category: AssetCategory.WEALTH, value: 58000, currency: 'CNY', change24h: 0.1, lastUpdated: '2024-05-20', history: generateMockHistory(58000) },
  { id: '4', name: '易方达蓝筹精选', category: AssetCategory.FUND, value: 32000, currency: 'CNY', change24h: -1.2, lastUpdated: '2024-05-20', history: generateMockHistory(32000) },
  { id: '5', name: '信用卡欠款', category: AssetCategory.LIABILITY, value: 8500, targetValue: 50000, durationMonths: 12, currency: 'CNY', lastUpdated: '2024-05-20', history: generateMockHistory(8500), notes: '还款日10号' },
];

const INITIAL_BUDGETS: Budget[] = [
  { category: '总计', monthlyAmount: 8000, spentThisMonth: 3200, carryOver: 500, transactions: [] },
  { category: '生活', subCategory: '餐饮', monthlyAmount: 3000, spentThisMonth: 1800, carryOver: 200, notes: '吃饭相关', color: '#f43f5e', transactions: [] },
  { category: '生活', subCategory: '购物', monthlyAmount: 2000, spentThisMonth: 500, carryOver: 0, notes: '剁手买买买', color: '#ec4899', transactions: [] },
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

const FilterBar = memo(({ selected, onSelect, categories, onAdd, type, themeColor, isThemeDark, onLongPress }: any) => {
  const uniqueCategories = Array.from(new Set(categories)).filter(Boolean);
  const pressTimer = useRef<number | null>(null);

  const handleStartPress = (cat: string) => {
    if (cat === '全部') return;
    pressTimer.current = window.setTimeout(() => onLongPress(cat, type), 700);
  };

  const handleEndPress = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 mt-1 flex-nowrap w-full select-none">
      <div className="flex flex-nowrap gap-2 items-center">
        {['全部', ...uniqueCategories].map(cat => (
          <button
            key={cat as string}
            onClick={() => onSelect(cat as string)}
            onMouseDown={() => handleStartPress(cat as string)}
            onMouseUp={handleEndPress}
            onMouseLeave={handleEndPress}
            onTouchStart={() => handleStartPress(cat as string)}
            onTouchEnd={handleEndPress}
            style={{ 
              backgroundColor: selected === cat ? themeColor : 'white',
              borderColor: selected === cat ? themeColor : '#e2e8f0',
              color: selected === cat ? (isThemeDark ? 'white' : '#0f172a') : '#94a3b8',
              borderRadius: '2px'
            }}
            className={`px-4 h-9 text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border shadow-sm flex items-center justify-center flex-shrink-0 active:scale-95`}
          >
            {cat as string}
          </button>
        ))}
        {onAdd && (
          <button
            onClick={onAdd}
            className="px-4 h-9 rounded-[2px] text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-400 border border-slate-200 hover:border-slate-400 flex items-center justify-center flex-shrink-0 transition-all hover:bg-slate-200 active:scale-95"
          >
            +
          </button>
        )}
      </div>
    </div>
  );
});

export const App: React.FC = () => {
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
  const [showDistribution, setShowDistribution] = useState<'asset' | 'budget' | null>(null);
  const [backupText, setBackupText] = useState('');

  const [editingBudgetIndex, setEditingBudgetIndex] = useState<number | null>(null);
  const [showBudgetColorPicker, setShowBudgetColorPicker] = useState(false);
  const [viewingTransactionsIndex, setViewingTransactionsIndex] = useState<number | null>(null);

  const [quickAddIndex, setQuickAddIndex] = useState<number | null>(null);
  const [quickAmount, setQuickAmount] = useState('');
  
  const [categoryAction, setCategoryAction] = useState<{name: string, type: 'asset' | 'budget'} | null>(null);

  const [isAddingTransaction, setIsAddingTransaction] = useState(false);
  const [newTransactionAmount, setNewTransactionAmount] = useState('');
  const [newTransactionNote, setNewTransactionNote] = useState('');

  const [isEditingTotalLimit, setIsEditingTotalLimit] = useState(false);
  const [tempTotalLimit, setTempTotalLimit] = useState('');

  const tabIndex = useMemo(() => {
    switch (activeTab) {
      case 'home': return 0;
      case 'budget': return 1;
      case 'settings': return 2;
      default: return 0;
    }
  }, [activeTab]);

  useEffect(() => {
    // 立即移除加载状态，不阻塞渲染
    // Use requestAnimationFrame to ensure the remove happens after the first paint
    requestAnimationFrame(() => {
      const loader = document.getElementById('initial-loader');
      if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 500);
      }
    });
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

  const stats = useMemo(() => {
    const pos = assets.filter(a => a.category !== AssetCategory.LIABILITY);
    const neg = assets.filter(a => a.category === AssetCategory.LIABILITY);
    const totalAssets = pos.reduce((sum, a) => sum + a.value, 0);
    const totalLiabilities = neg.reduce((sum, a) => sum + a.value, 0);
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

  const onAssetVisible = useCallback((id: string, color: string) => {
    if (isAutoTheme) {
      setActiveHeaderColor(color);
    }
  }, [isAutoTheme]);

  const handleUpdateAsset = useCallback((id: string, updates: Partial<Asset>) => {
    setAssets(prev => prev.map(a => {
      if (a.id === id) {
        const newValue = updates.value !== undefined ? updates.value : a.value;
        const todayStr = new Date().toISOString().split('T')[0];
        const newHistory = updates.value !== undefined 
          ? [...a.history, { date: todayStr, value: newValue }]
          : a.history;
        return { ...a, ...updates, history: newHistory, lastUpdated: new Date().toLocaleDateString('zh-CN') };
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

  const handleClearDataKeepTemplate = () => {
    if (!confirm('确定要清除所有数据但保留模板吗？\n资产数值将归零，预算流水将清空，但分类设置将保留。')) return;

    // Reset Assets: Keep structure, reset value to 0, clear history
    const resetAssets = assets.map(a => ({
      ...a,
      value: 0,
      change24h: 0,
      history: [],
      lastUpdated: new Date().toLocaleDateString('zh-CN')
    }));

    // Reset Budgets: Keep limit, reset spent and transactions
    const resetBudgets = budgets.map(b => ({
      ...b,
      spentThisMonth: 0,
      transactions: []
    }));

    // Update state directly
    setAssets(resetAssets);
    setBudgets(resetBudgets);
    alert('数据已重置，模板已保留。');
  };

  const handleAddBudgetCategory = () => {
    const newCat = prompt('请输入新预算分类名称：');
    if (newCat) {
      const trimmed = newCat.trim();
      if (!trimmed) return;
      if (budgetCategoryList.includes(trimmed)) {
        alert('分类已存在。');
        return;
      }
      setBudgetCategoryList([...budgetCategoryList, trimmed]);
      setCustomCategoryColors(prev => ({ ...prev, [trimmed]: THEME_COLORS[Math.floor(Math.random() * THEME_COLORS.length)] }));
    }
  };

  const handleAddAssetCategory = () => {
    const newCat = prompt('请输入新资产分类名称：');
    if (newCat) {
      const trimmed = newCat.trim();
      if (!trimmed) return;
      if (assetCategoryList.includes(trimmed)) {
        alert('分类已存在。');
        return;
      }
      setAssetCategoryList([...assetCategoryList, trimmed]);
      setCustomCategoryColors(prev => ({ ...prev, [trimmed]: THEME_COLORS[Math.floor(Math.random() * THEME_COLORS.length)] }));
    }
  };

  const handleRenameCategoryAction = (oldName: string, type: 'asset' | 'budget') => {
    const newName = prompt('重命名分类为：', oldName);
    if (newName) {
      const trimmed = newName.trim();
      if (!trimmed || trimmed === oldName) return;
      const list = type === 'asset' ? assetCategoryList : budgetCategoryList;
      if (list.includes(trimmed)) {
        alert('目标分类名称已存在。');
        return;
      }
      if (type === 'budget') {
        setBudgetCategoryList(budgetCategoryList.map(c => c === oldName ? trimmed : c));
        setBudgets(budgets.map(b => b.category === oldName ? { ...b, category: trimmed } : b));
        if (selectedBudgetCategory === oldName) setSelectedBudgetCategory(trimmed);
      } else {
        setAssetCategoryList(assetCategoryList.map(c => c === oldName ? trimmed : c));
        setAssets(assets.map(a => a.category === (oldName as AssetCategory) ? { ...a, category: trimmed as AssetCategory } : a));
        if (selectedAssetCategory === oldName) setSelectedAssetCategory(trimmed);
      }
      setCustomCategoryColors(prev => {
        const next = { ...prev };
        next[trimmed] = next[oldName] || themeColor;
        delete next[oldName];
        return next;
      });
    }
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

  const handleManualAddTransaction = () => {
    if (viewingTransactionsIndex === null) return;
    const amount = parseFloat(newTransactionAmount);
    if (!isNaN(amount) && amount !== 0) {
      const newTransaction: Transaction = {
        id: Date.now().toString(),
        amount: amount,
        date: new Date().toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }),
        note: newTransactionNote || '补录账单'
      };
      const currentBudget = budgets[viewingTransactionsIndex];
      handleUpdateBudget(viewingTransactionsIndex, { 
        spentThisMonth: currentBudget.spentThisMonth + amount,
        transactions: [newTransaction, ...(currentBudget.transactions || [])]
      });
      setIsAddingTransaction(false);
      setNewTransactionAmount('');
      setNewTransactionNote('');
    }
  };

  const handleQuickAdd = () => {
    if (quickAddIndex !== null) {
      const amount = parseFloat(quickAmount);
      if (!isNaN(amount)) {
        const currentBudget = budgets[quickAddIndex];
        handleUpdateBudget(quickAddIndex, { 
          spentThisMonth: currentBudget.spentThisMonth + amount,
          transactions: [{ id: Date.now().toString(), amount, date: new Date().toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }), note: '快速记录' }, ...(currentBudget.transactions || [])]
        });
      }
    }
    setQuickAddIndex(null);
    setQuickAmount('');
  };

  const handleCopyBackup = () => {
    const data = { assets, budgets, budgetCategoryList, assetCategoryList, themeColor, customCategoryColors };
    const jsonString = JSON.stringify(data, null, 2);
    setBackupText(jsonString);
    navigator.clipboard.writeText(jsonString).then(() => alert('备份已复制'));
  };

  const isThemeDark = isDarkColor(themeColor);

  return (
    <div className="min-h-screen pb-40 transition-all duration-700 overflow-x-hidden" style={{ backgroundColor: activeHeaderColor === '#ffffff' ? '#f8fafc' : `${activeHeaderColor}08` }}>
      <main className="max-w-6xl mx-auto pt-10 pb-10">
        <div 
          className="flex transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-transform" 
          style={{ 
            transform: `translate3d(-${tabIndex * 33.3333}%, 0, 0)`, 
            width: '300%' 
          }}
        >
          {/* 资产页 */}
          <div className="flex-shrink-0 px-4" style={{ width: '33.3333%' }}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1">
                <section 
                  className="text-white relative overflow-hidden flex flex-col justify-between h-[180px] p-6 shadow-2xl sticky top-4 z-20"
                  style={{ backgroundColor: themeColor, background: `linear-gradient(135deg, ${themeColor} 0%, ${themeColor}CC 100%)`, borderRadius: '4px' }}
                >
                  <Icons.Wallet className="absolute -bottom-6 -right-6 w-36 h-36 opacity-10 text-white pointer-events-none rotate-12 z-0" />
                  <div className="flex justify-between items-start relative z-10">
                    <h2 className="text-white/60 text-[10px] font-black uppercase tracking-widest">净资产</h2>
                    <div className="flex gap-2">
                      <button onClick={() => setShowDistribution('asset')} className="h-8 w-8 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-[2px] border border-white/10"><Icons.Target className="w-4 h-4" /></button>
                      <button onClick={() => setShowGlobalChart(true)} className="h-8 w-8 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-[2px] border border-white/10"><Icons.Chart className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <div className="font-mono font-black text-4xl tracking-tighter relative z-10">
                    ¥{stats.netWorth.toLocaleString()}
                  </div>
                  <div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-3 relative z-10">
                    <div>
                      <span className="text-[8px] font-black text-white/50 uppercase block">资产</span>
                      <span className="text-sm font-bold">¥{stats.totalAssets.toLocaleString()}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[8px] font-black text-white/50 uppercase block">负债</span>
                      <span className="text-sm font-bold text-rose-200">¥{stats.totalLiabilities.toLocaleString()}</span>
                    </div>
                  </div>
                </section>
              </div>
              <div className="lg:col-span-2">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-black text-slate-900 uppercase tracking-tighter">账户清单</h2>
                    <FilterBar selected={selectedAssetCategory} onSelect={setSelectedAssetCategory} categories={assetCategoryList} onAdd={handleAddAssetCategory} themeColor={themeColor} isThemeDark={isThemeDark} onLongPress={(name: any, type: any) => setCategoryAction({name, type})} />
                  </div>
                  <button onClick={() => setIsModalOpen(true)} className="flex items-center justify-center gap-2 text-white px-5 h-10 rounded-[2px] text-[10px] font-black uppercase tracking-widest shadow-md active:scale-95 md:mt-6" style={{ backgroundColor: themeColor }}>
                    <Icons.Plus className="w-4 h-4" /> <span>新增账户</span>
                  </button>
                </div>
                <div className="space-y-8">
                  {assetCategoryList.filter(c => selectedAssetCategory === '全部' || c === selectedAssetCategory).map(cat => {
                    const items = assets.filter(a => a.category === cat);
                    if (items.length === 0 && selectedAssetCategory === '全部') return null;
                    return (
                      <div key={cat} className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="h-4 w-1.5 rounded-full" style={{ backgroundColor: customCategoryColors[cat] || themeColor }} />
                          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{cat}</h3>
                          <div className="h-px flex-1 bg-slate-100"></div>
                        </div>
                        <div className={`grid ${isSmallCardMode ? 'grid-cols-2 gap-3' : 'grid-cols-1 md:grid-cols-2 gap-4'}`}>
                          {items.map(asset => (
                            <AssetCard 
                              key={asset.id} 
                              asset={asset} 
                              categoryColor={customCategoryColors[asset.category]} 
                              onDelete={(id) => setAssets(prev => prev.filter(a => a.id !== id))} 
                              onUpdate={handleUpdateAsset} 
                              onShowChart={setViewingAssetChart} 
                              onEditFull={(item) => setEditingAsset(item)}
                              onVisible={onAssetVisible} 
                              isSmallMode={isSmallCardMode} 
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          {/* 预算页 */}
          <div className="flex-shrink-0 px-4" style={{ width: '33.3333%' }}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1">
                <section 
                  className="text-white relative overflow-hidden flex flex-col justify-between h-[180px] p-6 shadow-2xl sticky top-4 z-20"
                  style={{ backgroundColor: themeColor, background: `linear-gradient(135deg, ${themeColor} 0%, ${themeColor}CC 100%)`, borderRadius: '4px' }}
                >
                  <Icons.Target className="absolute -bottom-6 -right-6 w-36 h-36 opacity-10 text-white pointer-events-none rotate-12 z-0" />
                  <div className="flex justify-between items-start relative z-10">
                    <h2 className="text-white/60 text-[10px] font-black uppercase tracking-widest">预算余额</h2>
                    <div className="flex gap-2">
                        <button onClick={() => setShowDistribution('budget')} className="h-8 w-8 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-[2px] border border-white/10"><Icons.Target className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <div className="font-mono font-black text-4xl tracking-tighter relative z-10">
                    ¥{budgetStats.remaining.toLocaleString()}
                  </div>
                  <div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-3 relative z-10">
                    <div onClick={() => { setIsEditingTotalLimit(true); setTempTotalLimit(budgetStats.limit.toString()); }} className="cursor-pointer hover:bg-white/5 rounded px-1 -ml-1 transition-colors">
                      <span className="text-[8px] font-black text-white/50 uppercase block">总额</span>
                      {isEditingTotalLimit ? (
                        <input autoFocus type="number" value={tempTotalLimit} onChange={e => setTempTotalLimit(e.target.value)} onBlur={() => { handleUpdateBudget(budgets.findIndex(b => b.category === '总计'), { monthlyAmount: parseFloat(tempTotalLimit) || 0 }); setIsEditingTotalLimit(false); }} className="w-full bg-white/20 text-white font-bold text-sm rounded outline-none" />
                      ) : (
                        <span className="text-sm font-bold">¥{budgetStats.limit.toLocaleString()}</span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-[8px] font-black text-white/50 uppercase block">已支出</span>
                      <span className="text-sm font-bold">¥{budgetStats.spent.toLocaleString()}</span>
                    </div>
                  </div>
                </section>
              </div>
              <div className="lg:col-span-2">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-black text-slate-900 uppercase tracking-tighter">预算计划</h2>
                    <FilterBar selected={selectedBudgetCategory} onSelect={setSelectedBudgetCategory} categories={budgetCategoryList} onAdd={handleAddBudgetCategory} themeColor={themeColor} isThemeDark={isThemeDark} onLongPress={(name: any, type: any) => setCategoryAction({name, type})} />
                  </div>
                  <button onClick={() => { const newBudget = { category: budgetCategoryList[0] || '生活', subCategory: '新项目', monthlyAmount: 0, spentThisMonth: 0, carryOver: 0, color: themeColor, transactions: [] }; setBudgets([...budgets, newBudget]); setTimeout(() => { setEditingBudgetIndex(budgets.length); setShowBudgetColorPicker(false); }, 0); }} className="flex items-center justify-center gap-2 text-white px-5 h-10 rounded-[2px] text-[10px] font-black uppercase tracking-widest shadow-md active:scale-95 md:mt-6" style={{ backgroundColor: themeColor }}>
                    <Icons.Plus className="w-4 h-4" /> <span>新增预算</span>
                  </button>
                </div>
                <div className="space-y-8">
                  {budgetCategoryList.filter(c => selectedBudgetCategory === '全部' || c === selectedBudgetCategory).map(cat => {
                    const items = budgets.filter(b => b.category === cat);
                    if (items.length === 0 && selectedBudgetCategory === '全部') return null;
                    return (
                      <div key={cat} className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="h-4 w-1.5 rounded-full" style={{ backgroundColor: customCategoryColors[cat] || themeColor }} />
                          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{cat}</h3>
                          <div className="h-px flex-1 bg-slate-100"></div>
                        </div>
                        <div className={`grid ${isSmallCardMode ? 'grid-cols-2 gap-3' : 'grid-cols-1 md:grid-cols-2 gap-4'}`}>
                          {items.map(b => (
                            <BudgetCard 
                                key={budgets.indexOf(b)} 
                                budget={b} 
                                index={budgets.indexOf(b)} 
                                themeColor={customCategoryColors[b.category] || themeColor} 
                                onUpdate={handleUpdateBudget} 
                                onEditFull={(idx) => { setEditingBudgetIndex(idx); setShowBudgetColorPicker(false); }}
                                onQuickAdd={setQuickAddIndex} 
                                onViewTransactions={setViewingTransactionsIndex} 
                                isSmallMode={isSmallCardMode} 
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          {/* 设置页 */}
          <div className="flex-shrink-0 px-4" style={{ width: '33.3333%' }}>
            <div className="max-w-xl mx-auto space-y-8 bg-white p-8 rounded shadow-sm border border-slate-200" style={{ borderRadius: '4px' }}>
              <h2 className="text-xl font-black uppercase tracking-tighter">偏好设置</h2>
              <section className="space-y-4">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">全局主色</label>
                <div className="grid grid-cols-10 gap-2">
                  {THEME_COLORS.map(c => (
                    <button key={c} onClick={() => setThemeColor(c)} style={{ backgroundColor: c }} className={`w-full aspect-square rounded-[2px] border-2 ${themeColor === c ? 'border-slate-900 ring-4 ring-slate-900/10' : 'border-slate-100'}`} />
                  ))}
                </div>
              </section>
              <section className="pt-6 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest">紧凑模式</h4>
                    <p className="text-[10px] font-bold text-slate-400">更小的卡片尺寸，显示更多内容</p>
                  </div>
                  <button onClick={() => setIsSmallCardMode(!isSmallCardMode)} className={`w-12 h-6 rounded-full relative transition-colors ${isSmallCardMode ? 'bg-slate-900' : 'bg-slate-200'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isSmallCardMode ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
              </section>
              
              <section className="pt-6 border-t border-slate-100">
                 <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-rose-500">保留模板清除数据</h4>
                    </div>
                    <button onClick={handleClearDataKeepTemplate} className="px-4 py-2 border border-rose-200 bg-rose-50 text-rose-600 font-black text-[10px] uppercase rounded-[4px] hover:bg-rose-100 active:scale-95 transition-all">
                       执行清除
                    </button>
                 </div>
              </section>

              <section className="pt-6 border-t border-slate-100 space-y-4">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">数据备份</label>
                <textarea value={backupText} onChange={e => setBackupText(e.target.value)} className="w-full h-24 p-3 bg-slate-50 border border-slate-200 text-[10px] font-mono rounded-[4px] outline-none" placeholder="粘贴数据在此恢复..." />
                <div className="flex gap-2">
                  <button onClick={handleCopyBackup} className="flex-1 py-3 bg-slate-50 text-slate-600 font-bold text-[10px] uppercase rounded-[4px] border border-slate-200">生成并复制备份</button>
                  <button onClick={() => { try { const d = JSON.parse(backupText); setAssets(d.assets); setBudgets(d.budgets); alert('恢复成功'); } catch(e) { alert('数据无效'); } }} style={{ backgroundColor: themeColor }} className="flex-1 py-3 text-white font-black text-[10px] uppercase rounded-[4px]">从文本恢复</button>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>

      {/* 底部导航 */}
      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-auto min-w-[320px] z-40 h-16 flex items-center gap-3 px-3 bg-white/80 backdrop-blur-md border border-slate-200 shadow-xl" style={{ borderRadius: '4px' }}>
        {[
          { id: 'home', label: '资产', icon: Icons.Home },
          { id: 'budget', label: '预算', icon: Icons.Target },
          { id: 'settings', label: '设置', icon: Icons.Cog }
        ].map((item: any) => (
          <button key={item.id} onClick={() => setActiveTab(item.id)} style={{ backgroundColor: activeTab === item.id ? themeColor : 'transparent', color: activeTab === item.id ? (isThemeDark ? 'white' : '#0f172a') : '#94a3b8', borderRadius: '2px' }} className="flex items-center justify-center h-12 flex-1 px-3 transition-all">
            <item.icon className="w-5 h-5 mr-2" />
            <span className="text-[11px] font-black">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* 分类管理弹窗 */}
      {categoryAction && (
        <div className="fixed inset-0 z-[125] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setCategoryAction(null)}>
          <div className="bg-white p-6 rounded-[4px] shadow-2xl w-full max-w-xs animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">管理分类: {categoryAction.name}</h3>
            <div className="space-y-3">
              <button onClick={() => { handleRenameCategoryAction(categoryAction.name, categoryAction.type); setCategoryAction(null); }} className="w-full py-3 bg-slate-50 text-slate-700 font-black text-xs uppercase tracking-widest rounded-[4px] border border-slate-200 hover:bg-slate-100 transition-all">重命名</button>
              <button onClick={() => { handleDeleteCategoryAction(categoryAction.name, categoryAction.type); setCategoryAction(null); }} className="w-full py-3 bg-rose-50 text-rose-600 font-black text-xs uppercase tracking-widest rounded-[4px] border border-rose-100 hover:bg-rose-100 transition-all">删除分类</button>
              <button onClick={() => setCategoryAction(null)} className="w-full py-3 text-slate-400 font-black text-xs uppercase tracking-widest">取消</button>
            </div>
          </div>
        </div>
      )}

      {/* 分布统计弹窗 */}
      {showDistribution && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in zoom-in-95 duration-300" onClick={() => setShowDistribution(null)}>
          <div className="bg-white rounded-[4px] w-full max-w-lg p-8 shadow-2xl border border-white/20 overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">{showDistribution === 'asset' ? '资产分布统计' : '预算支出分布'}</h2>
              <button onClick={() => setShowDistribution(null)} className="text-slate-400 hover:text-slate-900 font-black text-[10px] uppercase tracking-widest">关闭</button>
            </div>
            <div className="h-[250px] w-full mb-8">
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
            {/* 分类详情数字列表 */}
            <div className="space-y-2 pt-4 border-t border-slate-100">
               {[...(showDistribution === 'asset' ? assetDistributionData : budgetDistributionData)].sort((a,b) => b.value - a.value).map((item, index) => {
                 const total = (showDistribution === 'asset' ? assetDistributionData : budgetDistributionData).reduce((sum, i) => sum + i.value, 0);
                 const percent = total > 0 ? (item.value / total * 100).toFixed(1) : '0.0';
                 const color = customCategoryColors[item.name] || THEME_COLORS[index % THEME_COLORS.length];
                 return (
                   <div key={item.name} className="flex justify-between items-center p-3 bg-slate-50 rounded-[2px] border border-slate-100 hover:border-slate-200 transition-colors">
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
               <div className="flex justify-between items-center p-3 mt-4 transition-colors duration-500 rounded-[2px]" style={{ backgroundColor: themeColor, color: isThemeDark ? '#fff' : '#0f172a' }}>
                 <span className="text-[10px] font-black uppercase tracking-widest">总计</span>
                 <span className="text-[12px] font-mono font-black">¥{(showDistribution === 'asset' ? assetDistributionData : budgetDistributionData).reduce((sum, i) => sum + i.value, 0).toLocaleString()}</span>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* 资产趋势图弹窗 */}
      {(viewingAssetChart || showGlobalChart) && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md" onClick={() => { setViewingAssetChart(null); setShowGlobalChart(false); }}>
          <div className="bg-white rounded-[4px] w-full max-w-2xl p-8 shadow-2xl border border-white/20" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter">{showGlobalChart ? '资产总额趋势' : viewingAssetChart?.name}</h2>
                <p className="text-xs font-bold text-slate-400 mt-1">历史变动曲线</p>
              </div>
              <button 
                onClick={() => { setViewingAssetChart(null); setShowGlobalChart(false); }} 
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-500 font-black text-[10px] uppercase tracking-widest rounded-[2px] transition-colors"
              >
                关闭
              </button>
            </div>
            <div className="h-72 w-full mb-8">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={showGlobalChart ? globalHistory : (viewingAssetChart?.history || [])}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" hide />
                  <YAxis hide mirror />
                  <Tooltip contentStyle={{ borderRadius: '2px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 900 }} />
                  <Area type="monotone" dataKey="value" stroke={themeColor} strokeWidth={3} fillOpacity={0.05} fill={themeColor} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 border-t border-slate-100 pt-4">
               <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">近期数值详情</h3>
               <div className="max-h-40 overflow-y-auto space-y-1 pr-2 no-scrollbar">
                  {(() => {
                    const hist = [...(showGlobalChart ? globalHistory : (viewingAssetChart?.history || []))].reverse();
                    return hist.slice(0, 10).map((h, i) => {
                      const prev = hist[i + 1];
                      const change = prev ? h.value - prev.value : 0;
                      return (
                        <div key={i} className="flex justify-between items-center py-2 px-3 hover:bg-slate-50 rounded-[2px] transition-colors">
                            <span className="text-[10px] font-bold text-slate-400 font-mono">{h.date}</span>
                            <div className="flex items-center gap-3">
                              {prev && (
                                <span className={`text-[10px] font-bold font-mono ${change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                  {change > 0 ? '+' : ''}{change.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </span>
                              )}
                              <span className="text-xs font-black text-slate-900 font-mono">¥{h.value.toLocaleString()}</span>
                            </div>
                        </div>
                      );
                    });
                  })()}
               </div>
            </div>
          </div>
        </div>
      )}

      {/* 业务模态框 */}
      <AddAssetModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onAdd={(newAsset) => setAssets([...assets, { ...newAsset, id: Math.random().toString(36), currency: 'CNY', lastUpdated: new Date().toLocaleDateString('zh-CN'), history: [{ date: new Date().toISOString().split('T')[0], value: newAsset.value }] }])} assetCategoryList={assetCategoryList} categoryColors={customCategoryColors} defaultCategory={selectedAssetCategory !== '全部' ? selectedAssetCategory : undefined} />
      {editingAsset && <AddAssetModal isOpen={!!editingAsset} onClose={() => setEditingAsset(null)} onAdd={(data) => { handleUpdateAsset(editingAsset.id, data); setEditingAsset(null); }} initialData={editingAsset} assetCategoryList={assetCategoryList} categoryColors={customCategoryColors} onDelete={() => { setAssets(prev => prev.filter(a => a.id !== editingAsset.id)); setEditingAsset(null); }} />}
      {editingBudgetIndex !== null && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xl">
          <div className="bg-white rounded-[4px] w-full max-w-lg p-8 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-black uppercase mb-6">编辑预算详情</h2>
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <select className="w-full px-4 py-3 border border-slate-200 rounded-[4px] font-bold" value={budgets[editingBudgetIndex].category} onChange={e => handleUpdateBudget(editingBudgetIndex, { category: e.target.value })}>{budgetCategoryList.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select>
                <input type="text" className="w-full px-4 py-3 border border-slate-200 rounded-[4px] font-bold" value={budgets[editingBudgetIndex].subCategory || ''} onChange={e => handleUpdateBudget(editingBudgetIndex, { subCategory: e.target.value })} />
              </div>
              <input type="number" className="w-full px-4 py-3 border border-slate-200 rounded-[4px] font-bold" value={budgets[editingBudgetIndex].monthlyAmount} onChange={e => handleUpdateBudget(editingBudgetIndex, { monthlyAmount: parseFloat(e.target.value) || 0 })} placeholder="预算总额" />
              
              <div className="pt-2">
                <button 
                  type="button"
                  onClick={() => setShowBudgetColorPicker(!showBudgetColorPicker)}
                  className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                >
                  <Icons.Plus className={`w-3 h-3 transition-transform ${showBudgetColorPicker ? 'rotate-45' : ''}`} />
                  {showBudgetColorPicker ? '收起卡片颜色' : '自定义卡片颜色'}
                </button>
                {showBudgetColorPicker && (
                  <div className="grid grid-cols-6 gap-2 mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    {THEME_COLORS.map(c => <button key={c} onClick={() => handleUpdateBudget(editingBudgetIndex, { color: c })} style={{ backgroundColor: c }} className={`w-full aspect-square rounded-[2px] border ${budgets[editingBudgetIndex].color === c ? 'border-slate-900 ring-2 ring-slate-900/10' : 'border-slate-100'}`} />)}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => { setBudgets(prev => prev.filter((_, i) => i !== editingBudgetIndex)); setEditingBudgetIndex(null); }} className="px-5 py-3 text-rose-500 font-black text-xs border border-rose-100 rounded-[4px]">删除</button>
              <button onClick={() => setEditingBudgetIndex(null)} className="flex-1 py-3 text-white font-black text-xs uppercase rounded-[4px] shadow-lg" style={{ backgroundColor: budgets[editingBudgetIndex].color || themeColor }}>完成</button>
            </div>
          </div>
        </div>
      )}
      {viewingTransactionsIndex !== null && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xl">
          <div className="bg-white rounded-[4px] w-full max-w-md p-8 shadow-2xl max-h-[90vh] flex flex-col">
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black uppercase">{budgets[viewingTransactionsIndex].subCategory} 流水</h2>
                <button onClick={() => setIsAddingTransaction(true)} className="text-[10px] font-black uppercase bg-slate-900 text-white px-3 py-1.5 rounded-[2px]">+ 记账</button>
             </div>
             {isAddingTransaction && (
               <div className="mb-4 space-y-2 p-4 bg-slate-50 border border-slate-100 rounded-[4px]">
                 <input autoFocus type="number" placeholder="金额" className="w-full p-2 border border-slate-200 rounded-[4px] font-bold" value={newTransactionAmount} onChange={e => setNewTransactionAmount(e.target.value)} />
                 <input type="text" placeholder="备注" className="w-full p-2 border border-slate-200 rounded-[4px]" value={newTransactionNote} onChange={e => setNewTransactionNote(e.target.value)} />
                 <div className="flex justify-end gap-2">
                   <button onClick={() => setIsAddingTransaction(false)} className="text-[10px] font-bold text-slate-400">取消</button>
                   <button onClick={handleManualAddTransaction} className="text-[10px] font-bold text-slate-900">确认</button>
                 </div>
               </div>
             )}
             <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {(budgets[viewingTransactionsIndex].transactions || []).map(t => (
                  <div key={t.id} className="flex justify-between p-3 bg-slate-50 rounded-[2px] border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400">{t.date} {t.note}</span>
                    <span className="text-sm font-black">¥{t.amount.toLocaleString()}</span>
                  </div>
                ))}
             </div>
             <button onClick={() => setViewingTransactionsIndex(null)} className="w-full mt-6 py-3 bg-slate-100 text-slate-600 font-black text-xs uppercase rounded-[4px]">关闭</button>
          </div>
        </div>
      )}
      {quickAddIndex !== null && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setQuickAddIndex(null)}>
          <div className="bg-white p-6 rounded-[4px] shadow-2xl w-full max-w-xs animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-black mb-4">快速记账: {budgets[quickAddIndex].subCategory}</h3>
            <input autoFocus type="number" className="w-full px-4 py-3 border border-slate-200 rounded-[4px] font-bold text-xl mb-6 outline-none" placeholder="0.00" value={quickAmount} onChange={e => setQuickAmount(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleQuickAdd()} />
            <div className="flex gap-3">
              <button onClick={() => setQuickAddIndex(null)} className="flex-1 py-3 text-slate-400 font-black text-xs uppercase">取消</button>
              <button onClick={handleQuickAdd} style={{ backgroundColor: themeColor }} className="flex-1 py-3 text-white rounded-[4px] font-black text-xs uppercase shadow-md">确认</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
