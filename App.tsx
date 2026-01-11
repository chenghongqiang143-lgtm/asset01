
import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import { Asset, AssetCategory, CategoryColors, HistoryPoint, Budget } from './types';
import { Icons } from './constants';
import AssetCard from './components/AssetCard';
import AddAssetModal from './components/AddAssetModal';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';

const generateMockHistory = (baseValue: number): HistoryPoint[] => {
  const history: HistoryPoint[] = [];
  const today = new Date();
  for (let i = 15; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - Math.floor(i / 1.5));
    history.push({
      date: d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }),
      value: baseValue * (0.8 + Math.random() * 0.4)
    });
  }
  return history;
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
            onClick={() => onSelect(cat)}
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
            className={`px-4 h-9 rounded-sm text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border shadow-sm flex items-center justify-center flex-shrink-0 active:scale-95`}
          >
            {cat}
          </button>
        ))}
        {onAdd && (
          <button
            onClick={onAdd}
            className="px-4 h-9 rounded-sm text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-400 border border-slate-200 hover:border-slate-400 flex items-center justify-center flex-shrink-0 transition-all hover:bg-slate-200 active:scale-95"
          >
            + 新增
          </button>
        )}
      </div>
    </div>
  );
});

const App: React.FC = () => {
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
  
  const [selectedAssetCategory, setSelectedAssetCategory] = useState<string>('全部');
  const [selectedBudgetCategory, setSelectedBudgetCategory] = useState<string>('全部');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [activeHeaderColor, setActiveHeaderColor] = useState<string>('#ffffff');
  const [isAutoTheme, setIsAutoTheme] = useState(() => localStorage.getItem('auto_theme') === 'true');
  const [themeColor, setThemeColor] = useState(() => localStorage.getItem('app_theme') || '#ef4444');
  const [viewingAssetChart, setViewingAssetChart] = useState<Asset | null>(null);
  const [showGlobalChart, setShowGlobalChart] = useState(false);
  const [showDistribution, setShowDistribution] = useState<'asset' | 'budget' | null>(null);
  const [importText, setImportText] = useState('');

  const [editingBudgetIndex, setEditingBudgetIndex] = useState<number | null>(null);
  const [quickAddIndex, setQuickAddIndex] = useState<number | null>(null);
  const [quickAmount, setQuickAmount] = useState('');
  const [editingCategory, setEditingCategory] = useState<{name: string, type: 'asset' | 'budget'} | null>(null);

  const [isAssetCatExpanded, setIsAssetCatExpanded] = useState(false);
  const [isBudgetCatExpanded, setIsBudgetCatExpanded] = useState(false);

  const longPressTimer = useRef<number | null>(null);

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
    const timeout = setTimeout(() => {
      if (!isAppReady) {
        setIsAppReady(true);
        const loader = document.getElementById('initial-loader');
        if (loader) loader.remove();
      }
    }, 3000);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (isAutoTheme) {
      const randomIndex = Math.floor(Math.random() * THEME_COLORS.length);
      setThemeColor(THEME_COLORS[randomIndex]);
    }
  }, []);

  useEffect(() => localStorage.setItem('assets_data', JSON.stringify(assets)), [assets]);
  useEffect(() => localStorage.setItem('budget_data', JSON.stringify(budgets)), [budgets]);
  useEffect(() => localStorage.setItem('budget_category_list', JSON.stringify(budgetCategoryList)), [budgetCategoryList]);
  useEffect(() => localStorage.setItem('asset_category_list', JSON.stringify(assetCategoryList)), [assetCategoryList]);
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

  const globalHistory = useMemo(() => {
    if (assets.length === 0) return [];
    const longestIdx = assets.reduce((max, a, idx) => a.history.length > assets[max].history.length ? idx : max, 0);
    return assets[longestIdx].history.map((point, idx) => {
      let total = 0;
      assets.forEach(a => {
        const valAtIdx = a.history[idx]?.value || 0;
        if (a.category === AssetCategory.LIABILITY) total -= valAtIdx;
        else total += valAtIdx;
      });
      return { date: point.date, value: total };
    });
  }, [assets]);

  const handleUpdateAsset = useCallback((id: string, updates: Partial<Asset>) => {
    setAssets(prev => prev.map(a => {
      if (a.id === id) {
        const newValue = updates.value !== undefined ? updates.value : a.value;
        const newHistory = updates.value !== undefined 
          ? [...a.history, { date: new Date().toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }), value: newValue }]
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
  }, []);

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
    }
  };

  const handleAddAssetCategory = () => {
    const newCat = prompt('请输入新资产分类名称：');
    if (newCat && !assetCategoryList.includes(newCat)) {
      setAssetCategoryList([...assetCategoryList, newCat]);
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

  const handleRenameCategory = () => {
    if (!editingCategory) return;
    handleRenameCategoryAction(editingCategory.name, editingCategory.type);
    setEditingCategory(null);
  };

  const handleExportData = () => {
    const data = { assets, budgets, budgetCategoryList, assetCategoryList, themeColor, isAutoTheme };
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

  const CategoryManager = ({ list, onAdd, onRename, onDelete, type }: { list: string[], onAdd: () => void, onRename: (n: string, t: any) => void, onDelete: (n: string, t: any) => void, type: 'asset' | 'budget' }) => (
    <div className="space-y-2 mt-4 animate-in slide-in-from-top-2 duration-300">
      {list.map(cat => (
        <div key={cat} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-sm group transition-all hover:border-slate-300">
          <span className="text-xs font-bold text-slate-700">{cat}</span>
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onRename(cat, type)} className="p-1 text-slate-400 hover:text-blue-500 transition-colors">
              <Icons.Cog className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onDelete(cat, type)} className="p-1 text-slate-400 hover:text-rose-500 transition-colors">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
      ))}
      <button onClick={onAdd} style={{ borderColor: `${themeColor}40` }} className="w-full py-2 border-2 border-dashed text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-sm hover:border-slate-400 hover:text-slate-600 transition-all active:scale-[0.98]">
        + 新增分类
      </button>
    </div>
  );

  if (!isAppReady) return null;

  return (
    <div className="min-h-screen pb-40 transition-all duration-700" style={{ backgroundColor: activeHeaderColor === '#ffffff' ? '#f8fafc' : `${activeHeaderColor}08` }}>
      <main className="max-w-6xl mx-auto px-4 pt-10 pb-10">
        {activeTab === 'home' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start animate-in fade-in duration-500">
            <div className="lg:col-span-1 space-y-6">
              <section 
                className="text-white p-6 rounded-sm shadow-xl relative overflow-hidden transition-all duration-1000 h-[180px] flex flex-col justify-between"
                style={{ backgroundColor: themeColor, background: `linear-gradient(135deg, ${themeColor} 0%, ${themeColor}CC 100%)` }}
              >
                <div className="flex justify-between items-start relative z-10">
                  <h2 className="text-white/60 text-[10px] font-black uppercase tracking-[0.2em]">净资产规模</h2>
                  <div className="flex gap-2">
                    <button onClick={() => setShowDistribution('asset')} className="h-8 w-8 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-sm text-white border border-white/10 transition-colors">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 2v10l8.5 5"/></svg>
                    </button>
                    <button onClick={() => setShowGlobalChart(true)} className="h-8 w-8 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-sm text-white border border-white/10 transition-colors">
                      <Icons.Chart className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="text-3xl font-mono font-black relative z-10 tracking-tighter text-white">
                  {new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 }).format(stats.netWorth)}
                </div>
                <div className="grid grid-cols-2 gap-3 relative z-10 border-t border-white/10 pt-3">
                  <div className="bg-white/10 p-2 rounded-sm border border-white/5">
                    <span className="text-[8px] font-black text-white/50 uppercase block">总资产</span>
                    <span className="text-sm font-bold text-white">¥{stats.totalAssets.toLocaleString()}</span>
                  </div>
                  <div className="bg-black/10 p-2 rounded-sm border border-white/5 text-right">
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
                <button onClick={() => setIsModalOpen(true)} className="flex items-center justify-center gap-2 text-white px-5 h-10 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 flex-shrink-0 md:mt-6" style={{ backgroundColor: themeColor }}>
                  <Icons.Plus className="w-4 h-4" /> <span>新增账户</span>
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredAssets.map(asset => (
                  <AssetCard key={asset.id} asset={asset} onDelete={(id) => setAssets(prev => prev.filter(a => a.id !== id))} onUpdate={handleUpdateAsset} onShowChart={setViewingAssetChart} onEditFull={setEditingAsset} onVisible={onAssetVisible} />
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'budget' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start animate-in fade-in duration-500">
            <div className="lg:col-span-1 space-y-6">
              <section 
                className="text-white p-6 rounded-sm shadow-xl relative overflow-hidden transition-all duration-1000 h-[180px] flex flex-col justify-between"
                style={{ backgroundColor: themeColor, background: `linear-gradient(135deg, ${themeColor} 0%, ${themeColor}CC 100%)` }}
              >
                <div className="flex justify-between items-start relative z-10">
                  <h2 className="text-white/60 text-[10px] font-black uppercase tracking-[0.2em]">月度预算剩余</h2>
                  <div className="flex gap-2 items-center">
                    <button onClick={() => setShowDistribution('budget')} className="h-8 w-8 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-sm text-white border border-white/10 transition-colors">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 2v10l8.5 5"/></svg>
                    </button>
                    <div className="h-8 px-2 flex items-center bg-white/10 rounded-sm text-[10px] font-black border border-white/10 tracking-widest">
                      {Math.round((budgetStats.spent / (budgetStats.limit || 1)) * 100)}%
                    </div>
                  </div>
                </div>
                <div className="text-3xl font-mono font-black relative z-10 tracking-tighter text-white">
                  {new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 }).format(budgetStats.remaining)}
                </div>
                <div className="grid grid-cols-2 gap-3 relative z-10 border-t border-white/10 pt-3">
                  <div className="bg-white/10 p-2 rounded-sm border border-white/5">
                    <span className="text-[8px] font-black text-white/50 uppercase block">总预算</span>
                    <span className="text-sm font-bold text-white">¥{budgetStats.limit.toLocaleString()}</span>
                  </div>
                  <div className="bg-black/10 p-2 rounded-sm border border-white/5 text-right">
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
                {filteredBudgets.map((b, i) => {
                  const progress = Math.min(100, (b.spentThisMonth / (b.monthlyAmount || 1)) * 100);
                  const isOver = b.spentThisMonth > b.monthlyAmount;
                  const realIndex = budgets.indexOf(b);
                  const itemColor = b.color || themeColor;
                  return (
                    <div key={i} onMouseDown={() => startLongPress(realIndex, 'budgetItem')} onMouseUp={clearLongPress} onMouseLeave={clearLongPress} onTouchStart={() => startLongPress(realIndex, 'budgetItem')} onTouchEnd={clearLongPress} className="bg-white border border-slate-200 rounded-sm p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden active:scale-[0.98] cursor-default h-[130px] flex flex-col justify-between">
                      <div className={`absolute top-0 left-0 h-full transition-all duration-1000 z-0`} style={{ width: `${progress}%`, backgroundColor: isOver ? '#ef444415' : `${itemColor}12` }} />
                      <div className={`absolute bottom-0 left-0 h-1 transition-all duration-1000 z-10 ${isOver ? 'bg-rose-500' : ''}`} style={{ width: `${progress}%`, backgroundColor: isOver ? undefined : itemColor }} />
                      
                      {/* 背景大图标 */}
                      <div className="absolute right-[-10%] bottom-[-15%] opacity-[0.04] pointer-events-none z-0 transform rotate-[15deg]">
                        <Icons.Wallet className="w-24 h-24" />
                      </div>

                      <div className="relative z-10 flex justify-between items-start">
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-1.5 mb-1">
                             <span style={{ backgroundColor: isOver ? '#ef444420' : `${itemColor}20`, color: isOver ? '#ef4444' : itemColor }} className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-sm">
                               {b.category}
                             </span>
                          </div>
                          <h3 className="text-base font-black text-slate-900 truncate tracking-tight leading-tight">{b.subCategory || '未命名项目'}</h3>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setQuickAddIndex(realIndex); }} style={{ backgroundColor: itemColor }} className="p-2 text-white rounded-sm shadow-lg hover:brightness-110 active:scale-90 transition-all flex-shrink-0">
                          <Icons.Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="relative z-10 flex justify-between items-end">
                        <div className="min-w-0">
                          <p className="text-2xl font-mono font-black text-slate-900 truncate">¥{b.spentThisMonth.toLocaleString()}</p>
                          <div className="text-[9px] font-bold text-slate-300 uppercase mt-0.5">限额 ¥{b.monthlyAmount.toLocaleString()}</div>
                        </div>
                        <div className="text-right">
                          {b.notes && <div className="text-[9px] text-slate-400 font-bold mb-0.5 max-w-[120px] truncate leading-none">{b.notes}</div>}
                          <div className={`text-[10px] font-black ${isOver ? 'text-rose-500' : 'text-slate-400'}`}>{progress.toFixed(0)}%</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden p-8 space-y-8">
              <div className="-mx-8 -mt-8 px-8 py-6 mb-2" style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}22)` }}>
                <h2 className={`text-2xl font-black uppercase tracking-tighter ${isThemeDark ? 'text-white' : 'text-slate-900'}`}>应用设置</h2>
              </div>
              <section>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">应用主题色</label>
                <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
                  {THEME_COLORS.map(color => (
                    <button key={color} onClick={() => { setThemeColor(color); setIsAutoTheme(false); }} style={{ backgroundColor: color }} className={`w-full aspect-square rounded-sm border-2 ${themeColor === color ? 'border-slate-900 ring-4 ring-slate-900/10' : 'border-slate-100'} transition-all hover:scale-105 active:scale-95`} />
                  ))}
                </div>
              </section>
              <div className="grid grid-cols-1 gap-4 pt-6 border-t border-slate-100">
                <div className="border border-slate-100 rounded-sm overflow-hidden">
                   <button onClick={() => setIsAssetCatExpanded(!isAssetCatExpanded)} className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors">
                     <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest cursor-pointer">资产分类管理</label>
                     <div className={`transition-transform duration-300 ${isAssetCatExpanded ? 'rotate-180' : ''}`}>
                       <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                     </div>
                   </button>
                   {isAssetCatExpanded && <div className="p-4 border-t border-slate-100"><CategoryManager list={assetCategoryList} onAdd={handleAddAssetCategory} onRename={handleRenameCategoryAction} onDelete={handleDeleteCategoryAction} type="asset" /></div>}
                </div>
                <div className="border border-slate-100 rounded-sm overflow-hidden">
                   <button onClick={() => setIsBudgetCatExpanded(!isBudgetCatExpanded)} className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors">
                     <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest cursor-pointer">预算大类管理</label>
                     <div className={`transition-transform duration-300 ${isBudgetCatExpanded ? 'rotate-180' : ''}`}>
                       <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                     </div>
                   </button>
                   {isBudgetCatExpanded && <div className="p-4 border-t border-slate-100"><CategoryManager list={budgetCategoryList} onAdd={handleAddBudgetCategory} onRename={handleRenameCategoryAction} onDelete={handleDeleteCategoryAction} type="budget" /></div>}
                </div>
              </div>
              
              <div className="pt-6 border-t border-slate-100 space-y-4">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">数据管理</label>
                <div className="flex flex-col gap-4">
                   <div className="flex gap-4">
                      <button onClick={handleExportData} className="flex-1 py-3 bg-slate-50 text-slate-600 font-bold text-[10px] uppercase tracking-widest border border-slate-200 rounded-sm hover:bg-slate-100 transition-all active:scale-[0.98]">导出备份</button>
                      <button onClick={handleImportData} style={{ backgroundColor: themeColor }} className="flex-1 py-3 text-white font-black text-[10px] uppercase tracking-widest rounded-sm hover:brightness-110 shadow-md transition-all active:scale-[0.98]">导入恢复</button>
                   </div>
                   <button onClick={handleClearData} className="w-full py-3 bg-rose-50 text-rose-600 border border-rose-200 font-black text-[10px] uppercase tracking-widest rounded-sm hover:bg-rose-100 transition-all active:scale-[0.98]">
                      清空数据 (保留模板)
                   </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-50 via-slate-50/80 to-transparent pointer-events-none z-30" />
      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-auto min-w-[320px] max-w-lg z-40 h-16 flex items-center justify-center gap-3 px-3 rounded-xl shadow-[0_12px_40px_-10px_rgba(0,0,0,0.15)] transition-all duration-700 border border-slate-200 bg-white backdrop-blur-md">
        {[
          { id: 'home', label: '资产', icon: Icons.Home },
          { id: 'budget', label: '预算', icon: Icons.Target },
          { id: 'settings', label: '设置', icon: Icons.Cog }
        ].map((item: any) => (
          <button key={item.id} onClick={() => setActiveTab(item.id)} style={{ backgroundColor: activeTab === item.id ? themeColor : 'transparent', color: activeTab === item.id ? (isThemeDark ? 'white' : '#0f172a') : '#94a3b8' }} className={`flex items-center justify-center h-12 flex-1 min-w-[80px] px-3 transition-all duration-300 rounded-lg overflow-hidden group border ${activeTab === item.id ? 'border-transparent' : 'border-transparent hover:border-slate-100'} active:scale-95`}>
            <item.icon className={`w-5 h-5 flex-shrink-0 mr-2 transition-transform ${activeTab === item.id ? 'scale-110' : ''}`} />
            <span className="text-[11px] font-black whitespace-nowrap">{item.label}</span>
          </button>
        ))}
      </nav>

      {showDistribution && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in zoom-in-95 duration-300" onClick={() => setShowDistribution(null)}>
          <div className="bg-white rounded-sm w-full max-w-lg p-8 shadow-2xl border border-white/20" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">{showDistribution === 'asset' ? '资产构成分析' : '预算额度分布'}</h2>
              <button onClick={() => setShowDistribution(null)} className="text-slate-400 hover:text-slate-900 font-black text-[10px] uppercase tracking-widest">关闭</button>
            </div>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={showDistribution === 'asset' ? assetDistributionData : budgetDistributionData} cx="50%" cy="45%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" stroke="none">
                    {(showDistribution === 'asset' ? assetDistributionData : budgetDistributionData).map((entry, index) => <Cell key={`cell-${index}`} fill={showDistribution === 'asset' ? (CategoryColors[entry.name as keyof typeof CategoryColors] || themeColor) : THEME_COLORS[index % THEME_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`¥${value.toLocaleString()}`, '总额']} contentStyle={{ borderRadius: '2px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 900 }} />
                  <Legend verticalAlign="bottom" height={36} iconType="rect" formatter={(value) => <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {(viewingAssetChart || showGlobalChart) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in zoom-in-95 duration-300">
          <div className="bg-white rounded-sm w-full max-w-2xl p-6 shadow-2xl border border-white/20">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">{showGlobalChart ? '资产趋势分析' : `${viewingAssetChart?.name} 历史波动`}</h2>
              <button onClick={(e) => { e.stopPropagation(); setViewingAssetChart(null); setShowGlobalChart(false); }} className="p-2 text-slate-400 hover:text-slate-900 font-black text-[10px] uppercase">关闭</button>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={showGlobalChart ? globalHistory : viewingAssetChart?.history}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#94a3b8', fontWeight: 900 }} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `¥${(val/10000).toFixed(1)}w`} tick={{ fontSize: 8, fill: '#94a3b8', fontWeight: 900 }} width={50} />
                  <Tooltip formatter={(val: number) => [`¥${val.toLocaleString()}`, '金额']} contentStyle={{ borderRadius: '2px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 900 }} />
                  <Area type="monotone" dataKey="value" stroke={viewingAssetChart ? (viewingAssetChart.color || CategoryColors[viewingAssetChart.category]) : themeColor} strokeWidth={3} fillOpacity={0.05} fill={viewingAssetChart ? (viewingAssetChart.color || CategoryColors[viewingAssetChart.category]) : themeColor} dot={{ r: 3, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 5, strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
      <AddAssetModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onAdd={(newAsset) => setAssets([...assets, { ...newAsset, id: Math.random().toString(36).substr(2, 9), currency: 'CNY', lastUpdated: new Date().toLocaleDateString('zh-CN'), history: [{ date: new Date().toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }), value: newAsset.value }] }])} assetCategoryList={assetCategoryList} />
      {editingAsset && <AddAssetModal isOpen={!!editingAsset} onClose={() => setEditingAsset(null)} onAdd={(data) => { handleUpdateAsset(editingAsset.id, data); setEditingAsset(null); }} initialData={editingAsset} assetCategoryList={assetCategoryList} />}
    </div>
  );
};

export default App;
