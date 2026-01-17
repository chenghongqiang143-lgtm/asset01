import React, { useState, useEffect } from 'react';
import { Asset, AssetCategory } from '../types';
import { Icons } from '../constants';

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (asset: { name: string, category: AssetCategory, value: number, targetValue?: number, durationMonths?: number, notes?: string, color?: string }) => void;
  initialData?: Asset;
  assetCategoryList: string[];
  categoryColors: Record<string, string>;
  onDelete?: () => void;
  defaultCategory?: string;
}

const THEME_COLORS = [
  '#ef4444', '#f43f5e', '#3b82f6', '#10b981', '#8b5cf6', 
  '#f59e0b', '#06b6d4', '#6366f1', '#d946ef', '#14b8a6', '#0f172a'
];

const isDarkColor = (color: string) => {
  if (!color) return false;
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness < 155;
};

const AddAssetModal: React.FC<AddAssetModalProps> = ({ isOpen, onClose, onAdd, initialData, assetCategoryList, categoryColors, onDelete, defaultCategory }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<AssetCategory>(AssetCategory.THIRD_PARTY);
  const [value, setValue] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [durationMonths, setDurationMonths] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedColor, setSelectedColor] = useState<string | undefined>(undefined);
  const [showColorPicker, setShowColorPicker] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setCategory(initialData.category);
      setValue(initialData.value.toString());
      setTargetValue(initialData.targetValue?.toString() || '');
      setDurationMonths(initialData.durationMonths?.toString() || '');
      setNotes(initialData.notes || '');
      setSelectedColor(initialData.color);
    } else {
      setName('');
      const targetCategory = defaultCategory && assetCategoryList.includes(defaultCategory) 
        ? defaultCategory 
        : (assetCategoryList[0] || AssetCategory.THIRD_PARTY);
      setCategory(targetCategory as AssetCategory);
      setValue('');
      setTargetValue('');
      setDurationMonths('');
      setNotes('');
      setSelectedColor(undefined);
    }
    setShowColorPicker(false);
  }, [initialData, isOpen, assetCategoryList, defaultCategory]);

  if (!isOpen) return null;

  const activeColor = selectedColor || categoryColors[category] || '#0f172a';
  const isDark = isDarkColor(activeColor);
  const showTargetInput = category === AssetCategory.BANK || category === AssetCategory.LIABILITY;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !value) return;
    onAdd({
      name,
      category,
      value: parseFloat(value),
      targetValue: targetValue ? parseFloat(targetValue) : undefined,
      durationMonths: durationMonths ? parseInt(durationMonths) : undefined,
      notes: notes.trim() || undefined,
      color: selectedColor
    });
    onClose();
  };

  const focusStyle = { '--tw-ring-color': activeColor, '--tw-ring-opacity': 0.2, borderColor: 'transparent' } as React.CSSProperties;
  const inputClass = "w-full px-4 py-3 border border-slate-200 rounded focus:ring-2 focus:outline-none font-bold transition-all";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white rounded w-full max-w-md p-8 shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="-mx-8 -mt-8 px-8 py-6 mb-8 transition-colors duration-500" style={{ background: `linear-gradient(135deg, ${activeColor}, ${activeColor}22)` }}>
          <h2 className={`text-2xl font-black uppercase tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {initialData ? '编辑账户' : '添加账户'}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">账户名称</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} style={focusStyle} placeholder="例如：我的主银行卡" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">账户类别</label>
              <select value={category} onChange={(e) => setCategory(e.target.value as AssetCategory)} className={`${inputClass} appearance-none bg-slate-50`} style={focusStyle}>
                {assetCategoryList.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">当前金额 (¥)</label>
              <input type="number" required step="0.01" value={value} onChange={(e) => setValue(e.target.value)} className={inputClass} style={focusStyle} placeholder="0.00" />
            </div>
          </div>

          {showTargetInput && (
            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{category === AssetCategory.BANK ? '攒钱目标 (¥)' : '负债限额 (¥)'}</label>
                <input type="number" step="0.01" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} className={inputClass} style={focusStyle} placeholder="金额" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">期限 (个月)</label>
                <input type="number" value={durationMonths} onChange={(e) => setDurationMonths(e.target.value)} className={inputClass} style={focusStyle} placeholder="几个月" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">备注</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inputClass} bg-slate-50 h-20 resize-none`} style={focusStyle} placeholder="添加补充信息..." />
          </div>

          {/* 折叠颜色设定 */}
          <div>
            <button 
              type="button"
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
            >
              <Icons.Plus className={`w-3 h-3 transition-transform ${showColorPicker ? 'rotate-45' : ''}`} />
              {showColorPicker ? '收起卡片颜色' : '自定义卡片颜色'}
            </button>
            {showColorPicker && (
              <div className="grid grid-cols-6 gap-2 mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                {THEME_COLORS.map(c => (
                  <button 
                    key={c} 
                    type="button"
                    onClick={() => setSelectedColor(c)} 
                    style={{ backgroundColor: c }} 
                    className={`w-full aspect-square rounded-[2px] border-2 ${selectedColor === c ? 'border-slate-900 ring-2 ring-slate-900/10' : 'border-slate-100'}`} 
                  />
                ))}
                <button type="button" onClick={() => setSelectedColor(undefined)} className="w-full aspect-square rounded-[2px] border-2 border-slate-100 flex items-center justify-center bg-slate-50" title="重置颜色">
                  <div className="w-1/2 h-0.5 bg-slate-300 rotate-45"></div>
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-4 pt-4">
            {initialData && onDelete && (
                <button type="button" onClick={onDelete} className="px-5 py-3 text-rose-500 font-black text-xs uppercase tracking-widest hover:bg-rose-50 transition-colors border border-rose-100 rounded">删除</button>
            )}
            <button type="button" onClick={onClose} className="flex-1 py-3 text-slate-400 font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-colors border border-slate-100 rounded">取消</button>
            <button type="submit" style={{ backgroundColor: activeColor }} className="flex-1 py-3 text-white font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all rounded shadow-lg">
              {initialData ? '保存修改' : '确认添加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddAssetModal;