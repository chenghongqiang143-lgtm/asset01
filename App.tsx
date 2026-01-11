
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Asset, AssetCategory, CategoryColors, HistoryPoint, Budget } from './types';
import { Icons } from './constants';
import AssetCard from './components/AssetCard';
import AddAssetModal from './components/AddAssetModal';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';

const generateMockHistory = (baseValue: number): HistoryPoint[] => {
  const history: HistoryPoint[] = [];
  const today = new Date();
  for (let i = 10; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    history.push({
      date: d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }),
      value: baseValue * (0.9 + Math.random() * 0.2)
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
  { category: '生活', subCategory: '餐饮', monthlyAmount: 3000, spentThisMonth: 1800, carryOver: 200, notes: '吃饭相关' },
  { category: '生活', subCategory: '购物', monthlyAmount: 2000, spentThisMonth: 500, carryOver: 0, notes: '剁手买买买' },
  { category: '生活', subCategory: '交通', monthlyAmount: 500, spentThisMonth: 120, carryOver: 0 },
];

const THEME_COLORS = [
  '#0f172a', '#3b82f6', '#10b981', '#f43f5e', '#8b5cf6', 
  '#f59e0b', '#06b6d4', '#6366f1', '#d946ef', '#14b8a6'
];

const isDarkColor = (color: string) => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness < 155;
};

const App: React.FC = () => {
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
  const [themeColor, setThemeColor] = useState(() => localStorage.getItem('app_theme') || '#0f172a');
  const [viewingAssetChart, setViewingAssetChart] = useState<Asset | null>(null);
  const [showGlobalChart, setShowGlobalChart] = useState(false);
  const [importText, setImportText] = useState('');

  const [editingBudgetIndex, setEditingBudgetIndex] = useState<number | null>(null);
  const [quickAddIndex, setQuickAddIndex] = useState<number | null>(null);
  const [quickAmount, setQuickAmount] = useState('');
  const [editingCategory, setEditingCategory] = useState<{name: string, type: 'asset' | 'budget'} | null>(null);

  // 设置页折叠状态
  const [isAssetCatExpanded, setIsAssetCatExpanded] = useState(false);
  const [isBudgetCatExpanded, setIsBudgetCatExpanded] = useState(false);

  const longPressTimer = useRef<number | null>(null);

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

  const globalHistory = useMemo(() => {
    if (assets.length === 0) return [];
    const firstAsset = assets[0];
    return firstAsset.history.map((point, idx) => {
      let total = 0;
      assets.forEach(a => {
        const valAtIdx = a.history[idx]?.value || 0;
        if (a.category === AssetCategory.LIABILITY) total -= valAtIdx;
        else total += valAtIdx;
      });
      return { date: point.date, value: total };
    });
  }, [assets]);

  const handleUpdateAsset = (id: string, updates: Partial<Asset>) => {
    setAssets(prev => prev.map(a => a.id === id ? { ...a, ...updates, lastUpdated: new Date().toLocaleDateString('zh-CN') } : a));
  };

  const handleUpdateBudget = (index: number, updates: Partial<Budget>) => {
    const newBudgets = [...budgets];
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
    setBudgets(newBudgets);
  };

  const startLongPress = (nameOrIndex: string | number, type: 'asset' | 'budget' | 'budgetItem') => {
    if (nameOrIndex === '全部') return;
    longPressTimer.current = window.setTimeout(() => {
      if (type === 'budgetItem') {
        setEditingBudgetIndex(nameOrIndex as number);
      } else {
        setEditingCategory({ name: nameOrIndex as string, type: type as 'asset' | 'budget' });
      }
    }, 700);
  };

  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

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

  const isThemeDark = isDarkColor(themeColor);

  const FilterBar = ({ selected, onSelect, categories, onAdd, type }: { selected: string, onSelect: (c: any) => void, categories: string[], onAdd?: () => void, type: 'asset' | 'budget' }) => (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-4 mt-2">
      {['全部', ...categories].map(cat => (
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
          className={`px-4 h-9 rounded-sm text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border shadow-sm flex items-center justify-center`}
        >
          {cat}
        </button>
      ))}
      {onAdd && (
        <button
          onClick={onAdd}
          className="px-3 h-9 rounded-sm text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-400 border border-slate-200 hover:border-slate-400 flex items-center justify-center transition-all hover:bg-slate-200"
        >
          + 新增
        </button>
      )}
    </div>
  );

  const CategoryManager = ({ list, onAdd, onRename, onDelete, type }: { list: string[], onAdd: () => void, onRename: (n: string, t: any) => void, onDelete: (n: string, t: any) => void, type: 'asset' | 'budget' }) => (
    <div className="space-y-2 mt-4 animate-in slide-in-from-top-2 duration-300">
      {list.map(cat => (
        <div key={cat} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-sm group transition-all hover:border-slate-300">
          <span className="text-xs font-bold text-slate-700">{cat}</span>
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => onRename(cat, type)} 
              className="p-1 text-slate-400 hover:text-blue-500 transition-colors"
            >
              <Icons.Cog className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => onDelete(cat, type)} 
              className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
      ))}
      <button 
        onClick={onAdd} 
        style={{ borderColor: `${themeColor}40` }}
        className="w-full py-2 border-2 border-dashed text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-sm hover:border-slate-400 hover:text-slate-600 transition-all active:scale-[0.98]"
      >
        + 新增分类
      </button>
    </div>
  );

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
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setShowGlobalChart(true); 
                    }} 
                    className="p-1.5 bg-white/10 hover:bg-white/20 rounded-sm text-white border border-white/10 transition-colors z-20 pointer-events-auto"
                  >
                    <Icons.Chart className="w-4 h-4" />
                  </button>
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
            <div className="lg:col-span-2">
              <div className="flex justify-between items-end mb-4">
                <div className="flex-1">
                  <h2 className="text-lg font-black text-slate-900 uppercase tracking-tighter">资产账户清单</h2>
                  <FilterBar 
                    selected={selectedAssetCategory} 
                    onSelect={setSelectedAssetCategory} 
                    categories={assetCategoryList} 
                    onAdd={handleAddAssetCategory}
                    type="asset"
                  />
                </div>
                <button onClick={() => setIsModalOpen(true)} className="ml-4 flex items-center gap-2 text-white px-5 py-2 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 mb-4" style={{ backgroundColor: themeColor }}>
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
                  <div className="px-1.5 py-0.5 bg-white/10 rounded-sm text-[8px] font-black border border-white/10">
                    {Math.round((budgetStats.spent / (budgetStats.limit || 1)) * 100)}%
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
            <div className="lg:col-span-2">
              <div className="mb-4">
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tighter">消费预算计划</h2>
                <FilterBar 
                  selected={selectedBudgetCategory} 
                  onSelect={setSelectedBudgetCategory} 
                  categories={budgetCategoryList}
                  onAdd={handleAddBudgetCategory}
                  type="budget"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredBudgets.map((b, i) => {
                  const progress = Math.min(100, (b.spentThisMonth / (b.monthlyAmount || 1)) * 100);
                  const isOver = b.spentThisMonth > b.monthlyAmount;
                  const realIndex = budgets.indexOf(b);
                  return (
                    <div 
                      key={i} 
                      onMouseDown={() => startLongPress(realIndex, 'budgetItem')}
                      onMouseUp={clearLongPress}
                      onMouseLeave={clearLongPress}
                      onTouchStart={() => startLongPress(realIndex, 'budgetItem')}
                      onTouchEnd={clearLongPress}
                      className="bg-white border border-slate-200 rounded-sm p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden active:scale-[0.98] cursor-default h-[130px] flex flex-col justify-between"
                    >
                      <div className={`absolute bottom-0 left-0 h-1 transition-all duration-1000 ${isOver ? 'bg-rose-500' : ''}`} style={{ width: `${progress}%`, backgroundColor: isOver ? undefined : themeColor }} />
                      
                      <div className="flex justify-between items-start">
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-1.5 mb-1">
                             <span 
                               style={{ backgroundColor: isOver ? '#ef444420' : `${themeColor}20`, color: isOver ? '#ef4444' : themeColor }}
                               className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-sm"
                             >
                               {b.category}
                             </span>
                          </div>
                          <h3 className="text-base font-black text-slate-900 truncate tracking-tight leading-tight">
                            {b.subCategory || '未命名项目'}
                          </h3>
                        </div>
                        
                        <button 
                          onClick={(e) => { e.stopPropagation(); setQuickAddIndex(realIndex); }} 
                          style={{ backgroundColor: themeColor }}
                          className="p-1.5 text-white rounded-sm shadow-lg hover:brightness-110 active:scale-90 transition-all"
                        >
                          <Icons.Plus className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex justify-between items-end">
                        <div className="min-w-0">
                          <p className="text-2xl font-mono font-black text-slate-900 truncate">¥{b.spentThisMonth.toLocaleString()}</p>
                          <div className="text-[9px] font-bold text-slate-300 uppercase mt-0.5">
                            限额 ¥{b.monthlyAmount.toLocaleString()}
                          </div>
                        </div>
                        
                        <div className="text-right">
                          {b.notes && (
                            <div className="text-[9px] text-slate-400 font-bold mb-0.5 max-w-[120px] truncate leading-none">
                              {b.notes}
                            </div>
                          )}
                          <div className={`text-[10px] font-black ${isOver ? 'text-rose-500' : 'text-slate-400'}`}>
                            {progress.toFixed(0)}%
                          </div>
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
                    <button key={color} onClick={() => { setThemeColor(color); setIsAutoTheme(false); }} style={{ backgroundColor: color }} className={`w-full aspect-square rounded-sm border-2 ${themeColor === color ? 'border-slate-900 ring-4 ring-slate-900/10' : 'border-slate-100'}`} />
                  ))}
                </div>
              </section>

              <div className="grid grid-cols-1 gap-4 pt-6 border-t border-slate-100">
                {/* 资产分类折叠 */}
                <div className="border border-slate-100 rounded-sm overflow-hidden">
                   <button 
                     onClick={() => setIsAssetCatExpanded(!isAssetCatExpanded)}
                     className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
                   >
                     <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest cursor-pointer">资产分类管理</label>
                     <div className={`transition-transform duration-300 ${isAssetCatExpanded ? 'rotate-180' : ''}`}>
                       <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                     </div>
                   </button>
                   {isAssetCatExpanded && (
                     <div className="p-4 border-t border-slate-100">
                        <CategoryManager 
                          list={assetCategoryList} 
                          onAdd={handleAddAssetCategory} 
                          onRename={handleRenameCategoryAction} 
                          onDelete={handleDeleteCategoryAction} 
                          type="asset" 
                        />
                     </div>
                   )}
                </div>

                {/* 预算分类折叠 */}
                <div className="border border-slate-100 rounded-sm overflow-hidden">
                   <button 
                     onClick={() => setIsBudgetCatExpanded(!isBudgetCatExpanded)}
                     className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
                   >
                     <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest cursor-pointer">预算大类管理</label>
                     <div className={`transition-transform duration-300 ${isBudgetCatExpanded ? 'rotate-180' : ''}`}>
                       <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                     </div>
                   </button>
                   {isBudgetCatExpanded && (
                     <div className="p-4 border-t border-slate-100">
                        <CategoryManager 
                          list={budgetCategoryList} 
                          onAdd={handleAddBudgetCategory} 
                          onRename={handleRenameCategoryAction} 
                          onDelete={handleDeleteCategoryAction} 
                          type="budget" 
                        />
                     </div>
                   )}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 space-y-4">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">数据备份与恢复</label>
                <div className="flex gap-4">
                   <button 
                     onClick={handleExportData} 
                     className="flex-1 py-3 bg-slate-50 text-slate-600 font-bold text-[10px] uppercase tracking-widest border border-slate-200 rounded-sm hover:bg-slate-100 transition-all"
                   >
                     导出备份
                   </button>
                   <button 
                     onClick={handleImportData} 
                     style={{ backgroundColor: themeColor }}
                     className="flex-1 py-3 text-white font-black text-[10px] uppercase tracking-widest rounded-sm hover:brightness-110 shadow-md transition-all"
                   >
                     导入恢复
                   </button>
                </div>
                <textarea 
                  value={importText} 
                  onChange={e => setImportText(e.target.value)} 
                  placeholder="粘贴 JSON 备份数据于此进行恢复..." 
                  className="w-full h-24 p-3 text-[9px] font-mono border border-slate-200 rounded-sm focus:outline-none bg-slate-50" 
                />
              </div>
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-auto min-w-[320px] max-w-lg z-40 h-16 flex items-center justify-center gap-3 px-3 rounded-xl shadow-[0_12px_40px_-10px_rgba(0,0,0,0.15)] transition-all duration-700 border border-slate-200 bg-white">
        {[
          { id: 'home', label: '资产', icon: Icons.Home },
          { id: 'budget', label: '预算', icon: Icons.Target },
          { id: 'settings', label: '设置', icon: Icons.Cog }
        ].map((item: any) => (
          <button 
            key={item.id}
            onClick={() => setActiveTab(item.id)} 
            style={{ 
              backgroundColor: activeTab === item.id ? themeColor : 'transparent',
              color: activeTab === item.id ? (isThemeDark ? 'white' : '#0f172a') : '#94a3b8'
            }}
            className={`flex items-center justify-center h-12 flex-1 min-w-[80px] px-3 transition-all duration-300 rounded-lg overflow-hidden group border ${activeTab === item.id ? 'border-transparent' : 'border-transparent hover:border-slate-100'}`}
          >
            <item.icon className={`w-5 h-5 flex-shrink-0 mr-2 transition-transform ${activeTab === item.id ? 'scale-110' : ''}`} />
            <span className="text-[11px] font-black whitespace-nowrap">
              {item.label}
            </span>
          </button>
        ))}
      </nav>

      {editingCategory && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setEditingCategory(null)}>
          <div className="bg-white p-6 rounded shadow-2xl font-bold text-slate-900 text-sm max-w-xs text-center animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <p className="mb-4">是否重命名分类 "{editingCategory.name}"？</p>
            <div className="flex gap-3">
              <button onClick={() => setEditingCategory(null)} className="flex-1 py-2 text-slate-400 text-xs font-black uppercase">取消</button>
              <button onClick={handleRenameCategory} className="flex-1 py-2 bg-slate-900 text-white rounded-sm text-xs font-black uppercase tracking-widest">确认重命名</button>
            </div>
          </div>
        </div>
      )}

      {quickAddIndex !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white rounded-sm w-full max-w-sm p-8 shadow-2xl">
            <h2 className="text-xl font-black mb-6 text-slate-900 uppercase tracking-tighter">记一笔 {budgets[quickAddIndex].category}{budgets[quickAddIndex].subCategory ? ` · ${budgets[quickAddIndex].subCategory}` : ''}</h2>
            <input type="number" autoFocus className="w-full text-4xl font-mono font-black text-slate-900 border-b-4 border-slate-900 py-4 mb-8 focus:outline-none" placeholder="0.00" value={quickAmount} onChange={e => setQuickAmount(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleQuickAdd()} />
            <div className="flex gap-4">
              <button onClick={() => setQuickAddIndex(null)} className="flex-1 py-4 font-black text-xs uppercase text-slate-400 tracking-widest">取消</button>
              <button onClick={handleQuickAdd} className="flex-1 py-4 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-sm shadow-xl">确认记账</button>
            </div>
          </div>
        </div>
      )}

      {editingBudgetIndex !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xl animate-in zoom-in-95 duration-300">
          <div className="bg-white rounded-sm w-full max-w-sm p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h2 className="text-xl font-black mb-8 text-slate-900 uppercase">编辑预算项目</h2>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">分类</label>
                  <select 
                    className="w-full px-4 py-3 border border-slate-200 rounded-sm font-bold bg-slate-50" 
                    value={budgets[editingBudgetIndex].category} 
                    onChange={e => handleUpdateBudget(editingBudgetIndex, { category: e.target.value })}
                  >
                    {budgetCategoryList.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">名称</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 border border-slate-200 rounded-sm font-bold" 
                    value={budgets[editingBudgetIndex].subCategory || ''} 
                    onChange={e => handleUpdateBudget(editingBudgetIndex, { subCategory: e.target.value })} 
                    placeholder="如：餐饮"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">月度额度 (¥)</label>
                <input type="number" className="w-full px-4 py-3 border border-slate-200 rounded-sm font-bold" value={budgets[editingBudgetIndex].monthlyAmount} onChange={e => handleUpdateBudget(editingBudgetIndex, { monthlyAmount: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">备注信息</label>
                <input type="text" className="w-full px-4 py-3 border border-slate-200 rounded-sm font-bold" value={budgets[editingBudgetIndex].notes || ''} onChange={e => handleUpdateBudget(editingBudgetIndex, { notes: e.target.value })} />
              </div>
            </div>
            <button onClick={() => setEditingBudgetIndex(null)} className="w-full mt-10 py-4 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-sm shadow-lg">保存</button>
          </div>
        </div>
      )}

      {(viewingAssetChart || showGlobalChart) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in zoom-in-95 duration-300">
          <div className="bg-white rounded-sm w-full max-w-2xl p-6 shadow-2xl border border-white/20">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
                {showGlobalChart ? '资产趋势分析' : `${viewingAssetChart?.name} 历史波动`}
              </h2>
              <button 
                onClick={(e) => { 
                  e.stopPropagation();
                  setViewingAssetChart(null); 
                  setShowGlobalChart(false); 
                }} 
                className="p-2 text-slate-400 hover:text-slate-900 transition-colors font-black text-[10px] uppercase"
              >
                关闭
              </button>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={showGlobalChart ? globalHistory : viewingAssetChart?.history}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#94a3b8', fontWeight: 900 }} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ borderRadius: '2px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 900 }} />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke={viewingAssetChart ? CategoryColors[viewingAssetChart.category] : themeColor} 
                    strokeWidth={3} 
                    fillOpacity={0.05} 
                    fill={viewingAssetChart ? CategoryColors[viewingAssetChart.category] : themeColor}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <AddAssetModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onAdd={(newAsset) => setAssets([...assets, { ...newAsset, id: Math.random().toString(36).substr(2, 9), currency: 'CNY', lastUpdated: new Date().toLocaleDateString('zh-CN'), history: generateMockHistory(newAsset.value) }])} assetCategoryList={assetCategoryList} />
      {editingAsset && <AddAssetModal isOpen={!!editingAsset} onClose={() => setEditingAsset(null)} onAdd={(data) => { handleUpdateAsset(editingAsset.id, data); setEditingAsset(null); }} initialData={editingAsset} assetCategoryList={assetCategoryList} />}
    </div>
  );
};

export default App;
