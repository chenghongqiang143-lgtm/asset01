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
  isSmallMode?: boolean;
}

const AssetCard: React.FC<AssetCardProps> = memo(({ asset, categoryColor, onDelete, onUpdate, onShowChart, onEditFull, onVisible, isSmallMode }) => {
  const [isEditingValue, setIsEditingValue] = useState(false);
  const [tempValue, setTempValue] = useState(asset.value.toString());
  const cardRef = useRef<HTMLDivElement>(null);
  const pressTimer = useRef<number | null>(null);

  const isPositive = (asset.change24h || 0) >= 0;
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
        background: `
          radial-gradient(circle at 0% 0%, rgba(255,255,255,0.35) 0%, transparent 45%),
          linear-gradient(135deg, ${baseColor}D9, ${baseColor}BF)
        `,
        boxShadow: `
          0 10px 20px -5px ${baseColor}40,
          0 4px 6px -2px ${baseColor}20,
          inset 0 1px 0 0 rgba(255,255,255,0.35),
          inset 0 -1px 0 0 rgba(0,0,0,0.05)
        `,
      }}
      className={`relative rounded transition-all duration-300 group overflow-hidden active:scale-[0.98] flex flex-col justify-between hover:-translate-y-1 ${isSmallMode ? 'h-[88px] px-3 py-3' : 'h-[118px] px-4 py-3.5'}`}
    >
      <div className="bg-noise" />
      
      {hasProgress && (
        <div className="absolute top-0 left-0 h-full transition-all duration-1000 z-0 bg-gradient-to-r from-white/0 via-white/5 to-white/20 mix-blend-overlay" style={{ width: `${progressPercent}%` }} />
      )}
      {hasProgress && (
        <div className="absolute bottom-0 left-0 h-[3px] bg-white/40 z-10 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(255,255,255,0.5)]" style={{ width: `${progressPercent}%` }} />
      )}

      <div className={`relative z-10 flex justify-between items-start ${isSmallMode ? 'mb-1' : 'mb-1.5'}`}>
        <div className="min-w-0 pr-2">
          <h3 className={`${isSmallMode ? 'text-sm' : 'text-[16px]'} font-black text-white truncate drop-shadow-md leading-tight tracking-tight`}>{asset.name}</h3>
        </div>
        {!isSmallMode && (
          <button onClick={(e) => { e.stopPropagation(); onShowChart(asset); }} className="p-1.5 bg-white/10 hover:bg-white/25 text-white rounded opacity-70 hover:opacity-100 transition-all duration-200 border border-white/10 shadow-sm backdrop-blur-sm">
            <Icons.Chart className="w-3 h-3" />
          </button>
        )}
      </div>
      
      <div className="relative z-10 flex justify-between items-end">
        <div className="min-w-0">
          {isEditingValue ? (
            <input autoFocus type="number" value={tempValue} onChange={(e) => setTempValue(e.target.value)} onBlur={handleSaveValue} onKeyDown={(e) => e.key === 'Enter' && handleSaveValue()} className={`${isSmallMode ? 'text-lg' : 'text-xl'} font-mono font-black text-white bg-black/20 border-none outline-none rounded px-1.5 w-32 shadow-inner`} onClick={(e) => e.stopPropagation()} />
          ) : (
            <div onClick={(e) => { e.stopPropagation(); setIsEditingValue(true); setTempValue(asset.value.toString()); }} className="cursor-text group/val inline-block">
              <span className={`${isSmallMode ? 'text-lg' : 'text-[21px]'} font-mono font-black text-white drop-shadow-md tracking-tight leading-none group-hover/val:underline decoration-white/30 underline-offset-4 decoration-2`}>
                {new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 }).format(asset.value)}
              </span>
            </div>
          )}
        </div>
        <div className="text-right flex flex-col items-end gap-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-black text-white/80 uppercase tracking-widest bg-black/20 px-1.5 py-0.5 rounded backdrop-blur-sm shadow-sm border border-white/5">
              {asset.category}
            </span>
            {asset.change24h !== undefined && !hasProgress && !isSmallMode && (
              <span className={`text-[9px] font-bold px-1 py-0.5 rounded bg-black/10 backdrop-blur-sm ${isPositive ? 'text-emerald-200' : 'text-rose-200'}`}>
                {isPositive ? '↑' : '↓'}{Math.abs(asset.change24h)}%
              </span>
            )}
          </div>
          <div className="text-[9px] text-white/50 font-mono font-black uppercase whitespace-nowrap leading-none tracking-wider">{asset.lastUpdated}</div>
        </div>
      </div>
    </div>
  );
});

export default AssetCard;