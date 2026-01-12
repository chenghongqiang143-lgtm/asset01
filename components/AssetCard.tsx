
import React, { useEffect, useRef, useState, memo } from 'react';
import { Asset, AssetCategory, CategoryColors } from '../types';
import { Icons } from '../constants';

interface AssetCardProps {
  asset: Asset;
  categoryColor?: string;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Asset>) => void;
  onShowChart: (asset: Asset) => void;
  onEditFull: (asset: Asset) => void;
  onVisible?: (id: string, color: string) => void;
}

const AssetCard: React.FC<AssetCardProps> = memo(({ asset, categoryColor, onDelete, onUpdate, onShowChart, onEditFull, onVisible }) => {
  const [isEditingValue, setIsEditingValue] = useState(false);
  const [tempValue, setTempValue] = useState(asset.value.toString());
  const cardRef = useRef<HTMLDivElement>(null);
  const pressTimer = useRef<number | null>(null);

  const isPositive = (asset.change24h || 0) >= 0;
  // Priority: Asset individual color > Category state color > Default CategoryColors mapping
  const baseColor = asset.color || categoryColor || CategoryColors[asset.category as AssetCategory] || '#64748b';

  const hasProgress = (asset.category === AssetCategory.SAVING || asset.category === AssetCategory.LIABILITY) && asset.targetValue;
  const progressPercent = hasProgress ? Math.min(100, (asset.value / (asset.targetValue || 1)) * 100) : 0;

  useEffect(() => {
    if (!onVisible) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.boundingClientRect.top < 80 && entry.boundingClientRect.bottom > 0) {
          onVisible(asset.id, baseColor);
        }
      },
      { threshold: [0, 0.1, 0.9, 1.0], rootMargin: '-64px 0px 0px 0px' }
    );
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [asset.id, baseColor, onVisible]);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    pressTimer.current = window.setTimeout(() => onEditFull(asset), 700);
  };

  const handleMouseUp = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const handleSaveValue = () => {
    const val = parseFloat(tempValue);
    if (!isNaN(val)) onUpdate(asset.id, { value: val });
    setIsEditingValue(false);
  };

  return (
    <div 
      ref={cardRef}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleMouseDown}
      onTouchEnd={handleMouseUp}
      style={{ 
        background: `linear-gradient(135deg, ${baseColor}, ${baseColor}EE)`,
        boxShadow: `0 4px 12px -2px ${baseColor}40`,
        borderColor: 'rgba(255, 255, 255, 0.15)'
      }}
      className="relative rounded-sm px-5 py-4 hover:shadow-xl transition-all duration-300 group overflow-hidden border cursor-default active:scale-[0.98] h-[130px] flex flex-col justify-between"
    >
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '10px 10px' }} />
      
      <div className="absolute right-[-10%] bottom-[-15%] opacity-[0.08] pointer-events-none z-0 transform rotate-[15deg] text-white">
        <Icons.CategoryIcon category={asset.category as AssetCategory} className="w-24 h-24" />
      </div>

      {hasProgress && (
        <div className="absolute top-0 left-0 h-full transition-all duration-1000 z-0 bg-white/10" style={{ width: `${progressPercent}%` }} />
      )}
      {hasProgress && (
        <div className="absolute bottom-0 left-0 h-1 bg-white/30 z-10 transition-all duration-1000 ease-out" style={{ width: `${progressPercent}%` }} />
      )}

      <div className="relative z-10 flex justify-between items-start">
        <div className="min-w-0 pr-2">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[8px] font-black text-white/70 uppercase tracking-widest bg-black/10 px-1.5 py-0.5 rounded-sm">
              {asset.category}
            </span>
            {asset.change24h !== undefined && !hasProgress && (
              <span className={`text-[8px] font-bold ${isPositive ? 'text-emerald-200' : 'text-rose-200'}`}>
                {isPositive ? '↑' : '↓'}{Math.abs(asset.change24h)}%
              </span>
            )}
          </div>
          <h3 className="text-base font-black text-white truncate drop-shadow-sm leading-tight tracking-tight">{asset.name}</h3>
        </div>
        <div className="flex gap-1">
          <button onClick={(e) => { e.stopPropagation(); onShowChart(asset); }} className="p-1.5 bg-white/10 hover:bg-white/30 text-white rounded-sm opacity-60 group-hover:opacity-100 transition-all duration-200">
            <Icons.Chart className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      
      <div className="relative z-10 flex justify-between items-end">
        <div className="min-w-0">
          {isEditingValue ? (
            <input autoFocus type="number" value={tempValue} onChange={(e) => setTempValue(e.target.value)} onBlur={handleSaveValue} onKeyDown={(e) => e.key === 'Enter' && handleSaveValue()} className="text-xl font-mono font-black text-white bg-black/20 border-none outline-none rounded-sm px-1.5 w-32" onClick={(e) => e.stopPropagation()} />
          ) : (
            <div onClick={(e) => { e.stopPropagation(); setIsEditingValue(true); setTempValue(asset.value.toString()); }} className="cursor-text hover:bg-white/5 px-0.5 rounded-sm transition-colors">
              <span className="text-2xl font-mono font-black text-white">{new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 }).format(asset.value)}</span>
            </div>
          )}
          {hasProgress && (
            <p className="text-[9px] font-bold text-white/60 mt-0.5 uppercase">{progressPercent.toFixed(0)}% / {new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 }).format(asset.targetValue || 0)}</p>
          )}
        </div>
        <div className="text-right">
          {asset.notes && <div className="text-[9px] text-white/70 font-bold mb-0.5 max-w-[120px] truncate leading-none drop-shadow-sm">{asset.notes}</div>}
          <div className="text-[8px] text-white/40 font-mono font-black uppercase whitespace-nowrap leading-none">{asset.lastUpdated}</div>
        </div>
      </div>
    </div>
  );
});

export default AssetCard;
