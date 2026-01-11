
import React, { useState, useEffect } from 'react';
import { Asset, AssetCategory } from '../types';

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (asset: { name: string, category: AssetCategory, value: number, targetValue?: number, durationMonths?: number, notes?: string }) => void;
  initialData?: Asset;
  assetCategoryList: string[];
}

const AddAssetModal: React.FC<AddAssetModalProps> = ({ isOpen, onClose, onAdd, initialData, assetCategoryList }) => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white rounded-sm w-full max-w-md p-8 shadow-2xl border border-slate-200">
        <h2 className="text-2xl font-black mb-8 text-slate-900 uppercase tracking-tighter">
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
              className="w-full px-4 py-3 border border-slate-200 rounded-sm focus:ring-2 focus:ring-slate-900 focus:outline-none font-bold"
              placeholder="例如：我的主银行卡"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">账户类别</label>
              <select 
                value={category}
                onChange={(e) => setCategory(e.target.value as AssetCategory)}
                className="w-full px-4 py-3 border border-slate-200 rounded-sm focus:ring-2 focus:ring-slate-900 focus:outline-none font-bold appearance-none bg-slate-50"
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
                className="w-full px-4 py-3 border border-slate-200 rounded-sm focus:ring-2 focus:ring-slate-900 focus:outline-none font-bold"
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
                  className="w-full px-4 py-3 border border-slate-200 rounded-sm focus:ring-2 focus:ring-slate-900 focus:outline-none font-bold"
                  placeholder="金额"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">期限 (个月)</label>
                <input 
                  type="number" 
                  value={durationMonths}
                  onChange={(e) => setDurationMonths(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-sm focus:ring-2 focus:ring-slate-900 focus:outline-none font-bold"
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
              className="w-full px-4 py-3 border border-slate-200 rounded-sm focus:ring-2 focus:ring-slate-900 focus:outline-none font-bold bg-slate-50 h-20 resize-none"
              placeholder="添加补充信息..."
            />
          </div>

          <div className="flex gap-4 pt-6">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-3 text-slate-400 font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-colors border border-slate-100 rounded-sm"
            >
              取消
            </button>
            <button 
              type="submit"
              className="flex-1 py-3 bg-slate-900 text-white font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all rounded-sm shadow-lg shadow-slate-200"
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
