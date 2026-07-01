import React from 'react';

const colorStyles = {
  red: {
    selected: 'border-red-500 ring-2 ring-red-500/10 shadow-md',
    badge: 'text-red-600 bg-red-50',
    bar: 'bg-red-500',
    dot: 'bg-red-500 animate-pulse'
  },
  amber: {
    selected: 'border-amber-500 ring-2 ring-amber-500/10 shadow-md',
    badge: 'text-amber-600 bg-amber-50',
    bar: 'bg-amber-500',
    dot: 'bg-amber-500'
  },
  emerald: {
    selected: 'border-emerald-500 ring-2 ring-emerald-500/10 shadow-md',
    badge: 'text-emerald-600 bg-emerald-50',
    bar: 'bg-emerald-500',
    dot: 'bg-emerald-500'
  }
};

export default function RiskMetricCard({ label, count, badge, color, tooltipText, isSelected, onClick }) {
  const style = colorStyles[color];

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl p-6 border transition-all cursor-pointer relative overflow-hidden group ${
        isSelected ? style.selected : 'border-slate-200/80 hover:border-slate-300 shadow-sm hover:shadow-md'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-500">{label}</span>
          <div className="group/tooltip relative">
            <span className="text-slate-400 cursor-help">ℹ️</span>
            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-40">
              {tooltipText}
            </div>
          </div>
        </div>
        <span className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-4xl font-extrabold tracking-tight text-slate-900">
          {count.toLocaleString()}
        </span>
        <span className={`text-xs font-semibold ${style.badge} px-1.5 py-0.5 rounded`}>
          {badge}
        </span>
      </div>
      <div className={`absolute bottom-0 left-0 right-0 h-1 ${style.bar} opacity-0 group-hover:opacity-100 transition-opacity`} />
    </div>
  );
}
