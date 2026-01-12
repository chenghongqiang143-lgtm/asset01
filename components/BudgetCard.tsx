import React, { useState, useRef, memo } from 'react';
import { Budget } from '../types';
import { Icons } from '../constants';

interface BudgetCardProps {
  budget: Budget;
  index: number;
  themeColor: string;
  onUpdate: (index: number, updates: Partial<Budget>) => void;
  onEditFull: (index: number) => void;
  onQuickAdd: (index: number) => void;
  onViewTransactions: (index: number) => void;
}

const BudgetCard: React.FC<BudgetCardProps> = memo(({ budget, index, themeColor, onUpdate, onEditFull, onQuickAdd, onViewTransactions }) => {
  const [isEditingValue, setIsEditingValue] = useState(false);
  const [tempValue, setTempValue] = useState(budget.spentThisMonth.toString());
  const pressTimer = useRef<number | null>(null);

  const progress = Math.min(100, (budget.spentThisMonth / (budget.monthlyAmount || 1)) * 100);
  const isOver = budget.spentThisMonth > budget.monthlyAmount;
  const itemColor = budget.color || themeColor;

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    pressTimer.current = window.setTimeout(() => onEditFull(index), 700);
  };

  const handleMouseUp = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const handleSaveValue = () => {
    const val = parseFloat(tempValue);
    if (!isNaN(val)) onUpdate(index, { spentThisMonth: val });
    setIsEditingValue(false);
  };

  return (
    <div 
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleMouseDown}
      onTouchEnd={handleMouseUp}
      style={{
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03), inset 0 1px 0 0 rgba(255,255,255,1)',
      }}
      className="bg-white border border-slate-200/80 rounded p-5 hover:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05)] hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden active:scale-[0.98] cursor-default h-[130px] flex flex-col justify-between group"
    >
      {/* 噪点纹理 - 模拟纸张质感 */}
      <div className="bg-noise opacity-[0.2]" />

      <div 
        className="absolute top-0 left-0 h-full transition-all duration-1000 z-0" 
        style={{ width: `${progress}%`, backgroundColor: isOver ? '#ef444408' : `${itemColor}08` }} 
      />
      <div 
        className={`absolute bottom-0 left-0 h-[3px] transition-all duration-1000 z-10 ${isOver ? 'bg-rose-500' : ''}`} 
        style={{ width: `${progress}%`, backgroundColor: isOver ? undefined : itemColor }} 
      />
      
      <div className="relative z-10 flex justify-between items-start mb-2">
        <div className="min-w-0 pr-2 pt-1">
          <h3 className="text-[17px] font-black text-slate-800 truncate tracking-tight leading-tight group-hover:text-slate-900 transition-colors">{budget.subCategory || '未命名项目'}</h3>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button 
            onClick={(e) => { e.stopPropagation(); onViewTransactions(index); }} 
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-all active:scale-90"
            title="查看流水"
          >
            <Icons.List className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onQuickAdd(index); }} 
            style={{ backgroundColor: itemColor }} 
            className="p-2 text-white rounded shadow-md hover:shadow-lg hover:brightness-110 active:scale-90 transition-all"
            title="快速记账"
          >
            <Icons.Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="relative z-10 flex justify-between items-end">
        <div className="min-w-0">
          {isEditingValue ? (
            <input 
              autoFocus 
              type="number" 
              value={tempValue} 
              onChange={(e) => setTempValue(e.target.value)} 
              onBlur={handleSaveValue} 
              onKeyDown={(e) => e.key === 'Enter' && handleSaveValue()} 
              className="text-2xl font-mono font-black text-slate-900 border-none outline-none bg-slate-100/50 rounded px-1 w-32 shadow-inner" 
              onClick={(e) => e.stopPropagation()} 
            />
          ) : (
            <div 
              onClick={(e) => { e.stopPropagation(); setIsEditingValue(true); setTempValue(budget.spentThisMonth.toString()); }}
              className="cursor-text hover:bg-slate-50 px-0.5 -ml-0.5 rounded transition-colors inline-block"
            >
              <p className="text-[22px] font-mono font-black text-slate-800 tracking-tight leading-none">¥{budget.spentThisMonth.toLocaleString()}</p>
            </div>
          )}
          <div className="flex items-center gap-1 mt-1">
            <div className="h-0.5 w-2 rounded-full bg-slate-200"></div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">限额 ¥{budget.monthlyAmount.toLocaleString()}</div>
          </div>
        </div>
        <div className="text-right flex flex-col items-end gap-1">
          <span style={{ backgroundColor: isOver ? '#ef444415' : `${itemColor}15`, color: isOver ? '#ef4444' : itemColor }} className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-[2px] border border-transparent">
             {budget.category}
          </span>
          {budget.notes && <div className="text-[9px] text-slate-400 font-bold max-w-[120px] truncate leading-none bg-slate-50 px-1 py-0.5 rounded border border-slate-100">{budget.notes}</div>}
          <div className={`text-[11px] font-black ${isOver ? 'text-rose-500' : 'text-slate-300'} font-mono`}>{progress.toFixed(0)}%</div>
        </div>
      </div>
    </div>
  );
});

export default BudgetCard;