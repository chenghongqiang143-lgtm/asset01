
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
}

const BudgetCard: React.FC<BudgetCardProps> = memo(({ budget, index, themeColor, onUpdate, onEditFull, onQuickAdd }) => {
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
      className="bg-white border border-slate-200 rounded-sm p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden active:scale-[0.98] cursor-default h-[130px] flex flex-col justify-between"
    >
      <div 
        className="absolute top-0 left-0 h-full transition-all duration-1000 z-0" 
        style={{ width: `${progress}%`, backgroundColor: isOver ? '#ef444415' : `${itemColor}12` }} 
      />
      <div 
        className={`absolute bottom-0 left-0 h-1 transition-all duration-1000 z-10 ${isOver ? 'bg-rose-500' : ''}`} 
        style={{ width: `${progress}%`, backgroundColor: isOver ? undefined : itemColor }} 
      />
      
      <div className="absolute right-[-10%] bottom-[-15%] opacity-[0.04] pointer-events-none z-0 transform rotate-[15deg]">
        <Icons.Wallet className="w-24 h-24" />
      </div>

      <div className="relative z-10 flex justify-between items-start">
        <div className="min-w-0 pr-2">
          <div className="flex items-center gap-1.5 mb-1">
             <span style={{ backgroundColor: isOver ? '#ef444420' : `${itemColor}20`, color: isOver ? '#ef4444' : itemColor }} className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-sm">
               {budget.category}
             </span>
          </div>
          <h3 className="text-base font-black text-slate-900 truncate tracking-tight leading-tight">{budget.subCategory || '未命名项目'}</h3>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onQuickAdd(index); }} 
          style={{ backgroundColor: itemColor }} 
          className="p-2 text-white rounded-sm shadow-lg hover:brightness-110 active:scale-90 transition-all flex-shrink-0"
        >
          <Icons.Plus className="w-4 h-4" />
        </button>
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
              className="text-2xl font-mono font-black text-slate-900 border-none outline-none bg-slate-100 rounded-sm px-1 w-32" 
              onClick={(e) => e.stopPropagation()} 
            />
          ) : (
            <div 
              onClick={(e) => { e.stopPropagation(); setIsEditingValue(true); setTempValue(budget.spentThisMonth.toString()); }}
              className="cursor-text hover:bg-slate-50 px-0.5 rounded-sm transition-colors"
            >
              <p className="text-2xl font-mono font-black text-slate-900 truncate">¥{budget.spentThisMonth.toLocaleString()}</p>
            </div>
          )}
          <div className="text-[9px] font-bold text-slate-300 uppercase mt-0.5">限额 ¥{budget.monthlyAmount.toLocaleString()}</div>
        </div>
        <div className="text-right">
          {budget.notes && <div className="text-[9px] text-slate-400 font-bold mb-0.5 max-w-[120px] truncate leading-none">{budget.notes}</div>}
          <div className={`text-[10px] font-black ${isOver ? 'text-rose-500' : 'text-slate-400'}`}>{progress.toFixed(0)}%</div>
        </div>
      </div>
    </div>
  );
});

export default BudgetCard;
