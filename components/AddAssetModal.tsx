
import React, { useState, useEffect } from 'react';
import { Asset, AssetCategory } from '../types';

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (asset: { name: string, category: AssetCategory, value: number, targetValue?: number, durationMonths?: number, notes?: string }) => void;
  initialData?: Asset;
  assetCategoryList: string[];
  categoryColors: Record<string, string>;
  onDelete?: () => void;
}

const AddAssetModal: React.FC<AddAssetModalProps> = ({ isOpen, onClose, onAdd, initialData, assetCategoryList, categoryColors, onDelete }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<AssetCategory>(AssetCategory.CASH);
  const [value, setValue] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [durationMonths, setDurationMonths] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setCategory(initialData.category);
      setValue(initialData.value.toString());
      setTargetValue(initialData.targetValue?.toString() || '');
      setDurationMonths(initialData.durationMonths?.toString() || '');
      setNotes(initialData.notes || '');
    } else {
      setName('');
      setCategory((assetCategoryList[0] as AssetCategory) || AssetCategory.CASH);
      setValue('');
      setTargetValue('');
      setDurationMonths('');
      setNotes('');
    }
  }, [initialData, isOpen, assetCategoryList]);

  if (!isOpen) return null;

  // Determine the active theme color based on the selected category or initial asset color
  const activeColor = initialData?.color || categoryColors[category] || '#0f172a';

  const showTargetInput = category === AssetCategory.SAVING || category === AssetCategory.LIABILITY;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !value) return;
    onAdd({
      name,
      category,
      value: parseFloat(value),
      targetValue: targetValue ? parseFloat(targetValue) : undefined,
      durationMonths: durationMonths ? parseInt(durationMonths) : undefined,
      notes: notes.trim() || undefined
    });
    onClose();
  };

  // Helper style for focus rings to match the theme color
  const focusStyle = {
    '--tw-ring-color': activeColor,
    '--tw-ring-opacity': 0.2,
    borderColor: 'transparent' // Let the ring handle the visual border on focus mostly, or we can toggle it
  } as React.CSSProperties;

  const inputClass = "w-full px-4 py-3 border border-slate-200 rounded focus:ring-2 focus:outline-none font-bold transition-all";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white rounded w-full max-w-md p-8 shadow-2xl border border-slate-200">
        <h2 className="text-2xl font-black mb-8 text-slate-900 uppercase tracking-tighter" style={{ color: activeColor }}>
          {initialData ? '编辑账户' : '添加账户'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">账户名称</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              style={focusStyle}
              placeholder="例如：我的主银行卡"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">账户类别</label>
              <select 
                value={category}
                onChange={(e) => setCategory(e.target.value as AssetCategory)}
                className={`${inputClass} appearance-none bg-slate-50`}
                style={focusStyle}
              >
                {assetCategoryList.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">当前金额 (¥)</label>
              <input 
                type="number" 
                required
                step="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className={inputClass}
                style={focusStyle}
                placeholder="0.00"
              />
            </div>
          </div>

          {showTargetInput && (
            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  {category === AssetCategory.SAVING ? '攒钱目标 (¥)' : '负债限额 (¥)'}
                </label>
                <input 
                  type="number" 
                  step="0.01"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  className={inputClass}
                  style={focusStyle}
                  placeholder="金额"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">期限 (个月)</label>
                <input 
                  type="number" 
                  value={durationMonths}
                  onChange={(e) => setDurationMonths(e.target.value)}
                  className={inputClass}
                  style={focusStyle}
                  placeholder="几个月"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">备注</label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`${inputClass} bg-slate-50 h-20 resize-none`}
              style={focusStyle}
              placeholder="添加补充信息..."
            />
          </div>

          <div className="flex gap-4 pt-6">
            {initialData && onDelete && (
                <button 
                  type="button" 
                  onClick={onDelete}
                  className="px-5 py-3 text-rose-500 font-black text-xs uppercase tracking-widest hover:bg-rose-50 transition-colors border border-rose-100 rounded"
                >
                  删除
                </button>
            )}
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-3 text-slate-400 font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-colors border border-slate-100 rounded"
            >
              取消
            </button>
            <button 
              type="submit"
              style={{ backgroundColor: activeColor }}
              className="flex-1 py-3 text-white font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all rounded shadow-lg shadow-slate-200"
            >
              {initialData ? '保存修改' : '确认添加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddAssetModal;
