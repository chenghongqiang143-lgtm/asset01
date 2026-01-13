import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import { Asset, AssetCategory, CategoryColors, HistoryPoint, Budget, Transaction } from './types';
import { Icons } from './constants';
import AssetCard from './components/AssetCard';
import BudgetCard from './components/BudgetCard';
import AddAssetModal from './components/AddAssetModal';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';

/**
 * 极简 IndexedDB 封装，支持大数据量存储
 */
const DB_NAME = 'AssetsManagerDB';
const DB_VERSION = 1;
const STORE_NAME = 'app_state';

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const saveToDB = async (key: string, value: any) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(value, key);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
};

const loadFromDB = async (key: string): Promise<any> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// --- Helper Functions ---
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
  { id: '1', name: '常用储蓄账户', category: AssetCategory.CASH, value: 45000, currency: 'CNY', change24h: 0, lastUpdated: '2024-05-20', history: generateMockHistory(45000) },
  { id: '2', name: '股票投资组合', category: AssetCategory.STOCK, value: 120500, currency: 'CNY', change24h: 1.2, lastUpdated: '2024-05-20', history: generateMockHistory(120500) },
  { id: '3', name: '招商银行信用卡', category: AssetCategory.LIABILITY, value: 8500, targetValue: 50000, durationMonths: 12, currency: 'CNY', lastUpdated: '2024-05-20', history: generateMockHistory(8500), notes: '还款日10号' },
];

const INITIAL_BUDGETS: Budget[] = [
  { category: '总计', monthlyAmount: 8000, spentThisMonth: 3200, carryOver: 500, transactions: [] },
  { category: '生活', subCategory: '餐饮支出', monthlyAmount: 3000, spentThisMonth: 1800, carryOver: 200, color: '#f43f5e', transactions: [] },
];

const THEME_COLORS = ['#ef4444', '#f43f5e', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#06b6d4', '#6366f1', '#d946ef', '#14b8a6', '#0f172a'];

const isDarkColor = (color: string) => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 2), 16);
  const b = parseInt(hex.substring(4, 2), 16);
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
      </div>
    </div>
  );
});

export const App: React.FC = () => {
  const [isAppReady, setIsAppReady] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'budget' | 'settings'>('home');
  
  // States
  const [assets, setAssets] = useState<Asset[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [budgetCategoryList, setBudgetCategoryList] = useState<string[]>(DEFAULT_BUDGET_CATEGORIES);
  const [assetCategoryList, setAssetCategoryList] = useState<string[]>(DEFAULT_ASSET_CATEGORIES);
  const [customCategoryColors, setCustomCategoryColors] = useState<Record<string, string>>(CategoryColors);
  const [themeColor, setThemeColor] = useState('#ef4444');
  const [isSmallCardMode, setIsSmallCardMode] = useState(false);

  // UI States
  const [selectedAssetCategory, setSelectedAssetCategory] = useState<string>('全部');
  const [selectedBudgetCategory, setSelectedBudgetCategory] = useState<string>('全部');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [activeHeaderColor, setActiveHeaderColor] = useState<string>('#ffffff');
  const [isAutoTheme, setIsAutoTheme] = useState(false);
  const [viewingAssetChart, setViewingAssetChart] = useState<Asset | null>(null);
  const [showGlobalChart, setShowGlobalChart] = useState(false);
  const [chartRange, setChartRange] = useState<'30d' | '1y'>('30d');
  const [showDistribution, setShowDistribution] = useState<'asset' | 'budget' | null>(null);
  const [isAssetCatExpanded, setIsAssetCatExpanded] = useState(false);
  const [isBudgetCatExpanded, setIsBudgetCatExpanded] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tabIndex = useMemo(() => activeTab === 'home' ? 0 : activeTab === 'budget' ? 1 : 2, [activeTab]);

  // --- Data Loading (IndexedDB) ---
  useEffect(() => {
    const loadAllData = async () => {
      try {
        const storedAssets = await loadFromDB('assets_data');
        const storedBudgets = await loadFromDB('budget_data');
        const storedAssetCats = await loadFromDB('asset_category_list');
        const storedBudgetCats = await loadFromDB('budget_category_list');
        const storedColors = await loadFromDB('category_colors_map');
        const storedTheme = await loadFromDB('app_theme');
        const storedSmallMode = await loadFromDB('small_card_mode');

        if (storedAssets) setAssets(storedAssets); else setAssets(INITIAL_ASSETS);
        if (storedBudgets) setBudgets(storedBudgets); else setBudgets(INITIAL_BUDGETS);
        if (storedAssetCats) setAssetCategoryList(storedAssetCats);
        if (storedBudgetCats) setBudgetCategoryList(storedBudgetCats);
        if (storedColors) setCustomCategoryColors(storedColors);
        if (storedTheme) setThemeColor(storedTheme);
        if (storedSmallMode !== undefined) setIsSmallCardMode(storedSmallMode);

        await new Promise(r => setTimeout(r, 600));
        setIsAppReady(true);
        const loader = document.getElementById('initial-loader');
        if (loader) { loader.style.opacity = '0'; setTimeout(() => loader.remove(), 500); }
      } catch (err) {
        console.error('DB Load Error', err);
        setIsAppReady(true);
      }
    };
    loadAllData();
  }, []);

  // --- Data Persisting (IndexedDB) ---
  useEffect(() => { if (isAppReady) saveToDB('assets_data', assets); }, [assets, isAppReady]);
  useEffect(() => { if (isAppReady) saveToDB('budget_data', budgets); }, [budgets, isAppReady]);
  useEffect(() => { if (isAppReady) saveToDB('asset_category_list', assetCategoryList); }, [assetCategoryList, isAppReady]);
  useEffect(() => { if (isAppReady) saveToDB('budget_category_list', budgetCategoryList); }, [budgetCategoryList, isAppReady]);
  useEffect(() => { if (isAppReady) saveToDB('category_colors_map', customCategoryColors); }, [customCategoryColors, isAppReady]);
  useEffect(() => { if (isAppReady) saveToDB('app_theme', themeColor); }, [themeColor, isAppReady]);
  useEffect(() => { if (isAppReady) saveToDB('small_card_mode', isSmallCardMode); }, [isSmallCardMode, isAppReady]);

  // --- Logic ---
  const filteredAssets = useMemo(() => selectedAssetCategory === '全部' ? assets : assets.filter(a => a.category === selectedAssetCategory), [assets, selectedAssetCategory]);
  const filteredBudgets = useMemo(() => budgets.filter(b => b.category !== '总计' && (selectedBudgetCategory === '全部' || b.category === selectedBudgetCategory)), [budgets, selectedBudgetCategory]);

  const stats = useMemo(() => {
    const totalAssets = assets.filter(a => a.category !== AssetCategory.LIABILITY).reduce((sum, a) => sum + a.value, 0);
    const totalLiabilities = assets.filter(a => a.category === AssetCategory.LIABILITY).reduce((sum, a) => sum + a.value, 0);
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

  const handleUpdateAsset = useCallback((id: string, updates: Partial<Asset>) => {
    setAssets(prev => prev.map(a => {
      if (a.id === id) {
        const newValue = updates.value !== undefined ? updates.value : a.value;
        const todayStr = new Date().toISOString().split('T')[0];
        const newHistory = updates.value !== undefined ? [...a.history, { date: todayStr, value: newValue }] : a.history;
        return { ...a, ...updates, history: newHistory, lastUpdated: new Date().toLocaleDateString('zh-CN') };
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

  // --- Android Optimized Export ---
  const handleExportFile = async () => {
    const fullData = {
      assets,
      budgets,
      assetCategoryList,
      budgetCategoryList,
      customCategoryColors,
      themeColor,
      isSmallCardMode,
      timestamp: new Date().toISOString(),
      source: "AssetsManagerV1"
    };

    const jsonString = JSON.stringify(fullData, null, 2);
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `AssetsBackup_${dateStr}.txt`; // 改为 .txt 以提高安卓系统的通过率

    // 优先尝试分享 API (原生感最强)
    if (navigator.share && typeof navigator.canShare === 'function') {
      const file = new File([jsonString], fileName, { type: 'text/plain' });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: '资产管理备份',
            text: '包含您所有的资产历史记录。'
          });
          return;
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') return;
          console.warn('Navigator Share failed, trying direct stream download...');
        }
      }
    }

    // 备选：强制二进制流下载 (Android Chrome 兼容性极高)
    const blob = new Blob([jsonString], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    alert('备份文件已发起保存。若系统询问，请选择“文件管理器”或“另存为”。');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (!confirm('确定从该文件恢复吗？现有数据将被覆盖。')) return;
        if (data.assets) setAssets(data.assets);
        if (data.budgets) setBudgets(data.budgets);
        if (data.assetCategoryList) setAssetCategoryList(data.assetCategoryList);
        if (data.budgetCategoryList) setBudgetCategoryList(data.budgetCategoryList);
        if (data.themeColor) setThemeColor(data.themeColor);
        if (data.customCategoryColors) setCustomCategoryColors(data.customCategoryColors);
        alert('数据恢复成功！');
      } catch (err) {
        alert('解析失败，请确保文件格式正确。');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const isThemeDark = isDarkColor(themeColor);

  if (!isAppReady) return null;

  return (
    <div className="min-h-screen pb-40 transition-colors duration-700" style={{ backgroundColor: activeHeaderColor === '#ffffff' ? '#f8fafc' : `${activeHeaderColor}08` }}>
      <main className="max-w-6xl mx-auto pt-10 px-4">
        <div 
          className="flex transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]" 
          style={{ transform: `translateX(-${tabIndex * 100}%)`, width: '100%' }}
        >
          {/* Home Tab */}
          <div className="w-full flex-shrink-0">
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                   <section className="text-white rounded p-6 h-[180px] flex flex-col justify-between shadow-2xl relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${themeColor} 0%, ${themeColor}CC 100%)` }}>
                      <div className="flex justify-between items-start z-10">
                         <h2 className="text-white/60 text-[10px] font-black uppercase tracking-widest">净资产规模</h2>
                         <button onClick={() => setShowGlobalChart(true)} className="h-8 w-8 flex items-center justify-center bg-white/10 rounded hover:bg-white/20 transition-colors border border-white/10"><Icons.Chart className="w-4 h-4"/></button>
                      </div>
                      <div className="font-mono font-black text-3xl tracking-tighter z-10">{new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 }).format(stats.netWorth)}</div>
                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10 z-10">
                        <div><span className="text-[8px] font-black text-white/50 uppercase block">总资产</span><span className="text-sm font-bold">¥{stats.totalAssets.toLocaleString()}</span></div>
                        <div className="text-right"><span className="text-[8px] font-black text-white/50 uppercase block">负债</span><span className="text-sm font-bold text-rose-200">-¥{stats.totalLiabilities.toLocaleString()}</span></div>
                      </div>
                   </section>
                </div>
                <div className="lg:col-span-2">
                   <div className="flex justify-between items-end mb-4">
                      <div className="flex-1 overflow-hidden mr-4">
                         <h2 className="text-lg font-black uppercase tracking-tighter mb-1">资产清单</h2>
                         <FilterBar selected={selectedAssetCategory} onSelect={setSelectedAssetCategory} categories={assetCategoryList} themeColor={themeColor} isThemeDark={isThemeDark} />
                      </div>
                      <button onClick={() => setIsModalOpen(true)} style={{ backgroundColor: themeColor }} className="h-10 px-4 rounded text-white text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 flex items-center gap-2"><Icons.Plus className="w-4 h-4"/> 账户</button>
                   </div>
                   <div className={`grid ${isSmallCardMode ? 'grid-cols-2 gap-3' : 'grid-cols-1 md:grid-cols-2 gap-4'}`}>
                      {filteredAssets.map(asset => (
                        <AssetCard key={asset.id} asset={asset} categoryColor={customCategoryColors[asset.category]} onUpdate={handleUpdateAsset} onEditFull={setEditingAsset} onShowChart={setViewingAssetChart} isSmallMode={isSmallCardMode} />
                      ))}
                   </div>
                </div>
             </div>
          </div>

          {/* Budget Tab */}
          <div className="w-full flex-shrink-0">
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                   <section className="text-white rounded p-6 h-[180px] flex flex-col justify-between shadow-2xl" style={{ background: `linear-gradient(135deg, ${themeColor} 0%, ${themeColor}CC 100%)` }}>
                      <div className="flex justify-between items-start">
                         <h2 className="text-white/60 text-[10px] font-black uppercase tracking-widest">预算剩余</h2>
                         <div className="px-2 h-7 flex items-center bg-white/10 rounded text-[10px] font-black border border-white/10">{Math.round((budgetStats.spent / (budgetStats.limit || 1)) * 100)}%</div>
                      </div>
                      <div className="font-mono font-black text-3xl tracking-tighter">{new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 }).format(budgetStats.remaining)}</div>
                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
                        <div><span className="text-[8px] font-black text-white/50 uppercase block">月额度</span><span className="text-sm font-bold">¥{budgetStats.limit.toLocaleString()}</span></div>
                        <div className="text-right"><span className="text-[8px] font-black text-white/50 uppercase block">已支出</span><span className="text-sm font-bold">¥{budgetStats.spent.toLocaleString()}</span></div>
                      </div>
                   </section>
                </div>
                <div className="lg:col-span-2">
                   <div className="mb-4"><h2 className="text-lg font-black uppercase tracking-tighter">预算监控</h2></div>
                   <div className={`grid ${isSmallCardMode ? 'grid-cols-2 gap-3' : 'grid-cols-1 md:grid-cols-2 gap-4'}`}>
                      {filteredBudgets.map((b, i) => (
                        <BudgetCard key={i} budget={b} index={budgets.indexOf(b)} themeColor={customCategoryColors[b.category] || themeColor} onUpdate={handleUpdateBudget} isSmallMode={isSmallCardMode} onEditFull={() => {}} onQuickAdd={() => {}} onViewTransactions={() => {}} />
                      ))}
                   </div>
                </div>
             </div>
          </div>

          {/* Settings Tab */}
          <div className="w-full flex-shrink-0">
             <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded p-8 space-y-8 shadow-sm">
                <div className="-mx-8 -mt-8 px-8 py-6 mb-2" style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}22)` }}>
                  <h2 className={`text-2xl font-black uppercase tracking-tighter ${isThemeDark ? 'text-white' : 'text-slate-900'}`}>存储与管理</h2>
                </div>

                <section className="space-y-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">数据同步方案 (针对安卓优化)</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={handleExportFile} style={{ backgroundColor: themeColor }} className="flex flex-col items-center justify-center gap-2 py-6 text-white rounded hover:brightness-110 shadow-lg active:scale-95 transition-all">
                      <Icons.Plus className="w-6 h-6 rotate-45" />
                      <span className="font-black text-[10px] uppercase tracking-widest">导出备份文件</span>
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center gap-2 py-6 bg-slate-900 text-white rounded hover:bg-slate-800 shadow-lg active:scale-95 transition-all">
                      <Icons.Plus className="w-6 rotate-180" />
                      <span className="font-black text-[10px] uppercase tracking-widest">导入备份文件</span>
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleImportFile} accept=".txt,.json" className="hidden" />
                  </div>
                  <p className="text-[9px] font-bold text-slate-400">注意：备份文件已改为 .txt 扩展名以提高系统兼容性。如果导出失败，请尝试在浏览器设置中开启“允许下载文件”。</p>
                </section>

                <section className="pt-6 border-t border-slate-100">
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">视觉设置</label>
                   <div className="flex items-center justify-between p-4 bg-slate-50 rounded border border-slate-200">
                      <div><h4 className="text-xs font-black text-slate-700 uppercase">紧凑卡片模式</h4><p className="text-[10px] font-bold text-slate-400 mt-0.5">适合账户较多时一屏展示</p></div>
                      <button onClick={() => setIsSmallCardMode(!isSmallCardMode)} className={`w-12 h-6 rounded-full relative transition-all ${isSmallCardMode ? 'bg-slate-900' : 'bg-slate-200'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isSmallCardMode ? 'left-7' : 'left-1'}`} /></button>
                   </div>
                </section>

                <section className="pt-6 border-t border-slate-100">
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">主题配色</label>
                   <div className="grid grid-cols-5 gap-3">
                      {THEME_COLORS.map(c => <button key={c} onClick={() => setThemeColor(c)} style={{ backgroundColor: c }} className={`aspect-square rounded border-2 ${themeColor === c ? 'border-slate-900 ring-4 ring-slate-900/10' : 'border-slate-100'}`} />)}
                   </div>
                </section>
             </div>
          </div>
        </div>
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-auto min-w-[300px] bg-white border border-slate-200 rounded-lg shadow-xl h-16 flex items-center px-2 z-50">
        {[
          { id: 'home', label: '资产', icon: Icons.Home },
          { id: 'budget', label: '预算', icon: Icons.Target },
          { id: 'settings', label: '管理', icon: Icons.Cog }
        ].map(item => (
          <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`flex-1 h-12 rounded flex items-center justify-center gap-2 transition-all ${activeTab === item.id ? 'text-white' : 'text-slate-400'}`} style={{ backgroundColor: activeTab === item.id ? themeColor : 'transparent' }}>
            <item.icon className="w-5 h-5" />
            <span className="text-[11px] font-black">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Chart Modals */}
      {viewingAssetChart && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md" onClick={() => setViewingAssetChart(null)}>
          <div className="bg-white rounded w-full max-w-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
               <h2 className="text-xl font-black tracking-tighter uppercase">{viewingAssetChart.name} 趋势</h2>
               <button onClick={() => setViewingAssetChart(null)} className="p-2 bg-slate-100 rounded-full text-slate-400"><Icons.Plus className="rotate-45"/></button>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={viewingAssetChart.history}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" hide />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip formatter={(v: number) => [`¥${v.toLocaleString()}`, '价值']} />
                  <Area type="monotone" dataKey="value" stroke={themeColor} fill={`${themeColor}22`} strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <AddAssetModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onAdd={data => setAssets([...assets, { ...data, id: Math.random().toString(36).substr(2, 9), currency: 'CNY', lastUpdated: new Date().toLocaleDateString('zh-CN'), history: [{ date: new Date().toISOString().split('T')[0], value: data.value }] }])} 
        assetCategoryList={assetCategoryList} 
        categoryColors={customCategoryColors} 
      />
    </div>
  );
};