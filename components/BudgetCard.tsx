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
  isSmallMode?: boolean;
}

const BudgetCard: React.FC<BudgetCardProps> = memo(({ budget, index, themeColor, onUpdate, onEditFull, onQuickAdd, onViewTransactions, isSmallMode }) => {
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
      className={`bg-white border border-slate-200/80 rounded hover:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05)] hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden active:scale-[0.98] cursor-default flex flex-col justify-between group ${isSmallMode ? 'h-[88px] p-3' : 'h-[118px] p-4'}`}
    >
      <div className="bg-noise opacity-[0.2]" />

      <div 
        className="absolute top-0 left-0 h-full transition-all duration-1000 z-0" 
        style={{ width: `${progress}%`, backgroundColor: isOver ? '#ef444408' : `${itemColor}08` }} 
      />
      <div 
        className={`absolute bottom-0 left-0 h-[3px] transition-all duration-1000 z-10 ${isOver ? 'bg-rose-500' : ''}`} 
        style={{ width: `${progress}%`, backgroundColor: isOver ? undefined : itemColor }} 
      />
      
      <div className={`relative z-10 flex justify-between items-start ${isSmallMode ? 'mb-0' : 'mb-1'}`}>
        <div className="min-w-0 pr-2">
          <h3 className={`${isSmallMode ? 'text-[12px]' : 'text-[16px]'} font-black text-slate-800 truncate tracking-tight leading-tight group-hover:text-slate-900 transition-colors`}>{budget.subCategory || '未命名项目'}</h3>
          {!isSmallMode && budget.notes && (
            <p className="text-[10px] text-slate-400 font-bold truncate max-w-[150px] mt-0.5">{budget.notes}</p>
          )}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {!isSmallMode && (
            <button onClick={(e) => { e.stopPropagation(); onViewTransactions(index); }} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-all active:scale-90">
              <Icons.List className="w-3 h-3" />
            </button>
          )}
          <button 
            onClick={(e) => { e.stopPropagation(); onQuickAdd(index); }} 
            style={{ backgroundColor: itemColor }} 
            className={`${isSmallMode ? 'p-1.5' : 'p-2'} text-white rounded shadow-md hover:shadow-lg hover:brightness-110 active:scale-90 transition-all`}
          >
            <Icons.Plus className="w-3 h-3" />
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
              className={`${isSmallMode ? 'text-[15px]' : 'text-xl'} font-mono font-black text-slate-900 border-none outline-none bg-slate-100/50 rounded px-1 w-32 shadow-inner`} 
              onClick={(e) => e.stopPropagation()} 
            />
          ) : (
            <div 
              onClick={(e) => { e.stopPropagation(); setIsEditingValue(true); setTempValue(budget.spentThisMonth.toString()); }}
              className="cursor-text hover:bg-slate-50 px-0.5 -ml-0.5 rounded transition-colors inline-block"
            >
              <p className={`${isSmallMode ? 'text-[16px]' : 'text-[20px]'} font-mono font-black text-slate-800 tracking-tight leading-none`}>¥{budget.spentThisMonth.toLocaleString()}</p>
            </div>
          )}
        </div>
        <div className="text-right flex flex-col items-end gap-1">
          <span style={{ backgroundColor: isOver ? '#ef444415' : `${itemColor}15`, color: isOver ? '#ef4444' : itemColor }} className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-[2px] border border-transparent">
             {budget.category}
          </span>
          <div className={`text-[9px] font-black ${isOver ? 'text-rose-500' : 'text-slate-300'} font-mono leading-none`}>{progress.toFixed(0)}%</div>
        </div>
      </div>
    </div>
  );
});

export default BudgetCard;