import React from 'react';

export default function AnalyticsPage({ highRiskCount, medRiskCount, lowRiskCount }) {
  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-200/80 shadow-xs">
          <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Analytics</h1>
          <p className="text-xs text-slate-500 font-medium">Performance charts, active statistics, and metrics tracker.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Workspace Activity Trend</h3>
              <p className="text-[10px] text-slate-400 font-medium">Updated 5m ago</p>
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">+14.2% Growth</span>
          </div>

          <div className="h-44 flex items-end">
            <svg className="w-full h-full text-blue-500 overflow-visible" viewBox="0 0 400 100">
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3"/>
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0"/>
                </linearGradient>
              </defs>
              <path d="M 0 80 Q 50 30, 100 50 T 200 20 T 300 45 T 400 10 L 400 100 L 0 100 Z" fill="url(#chartGradient)" stroke="none" />
              <path d="M 0 80 Q 50 30, 100 50 T 200 20 T 300 45 T 400 10" fill="none" stroke="#2563EB" strokeWidth="3.5" strokeLinecap="round" />
              <circle cx="100" cy="50" r="5" fill="#2563EB" />
              <circle cx="200" cy="20" r="5" fill="#2563EB" />
              <circle cx="300" cy="45" r="5" fill="#2563EB" />
              <circle cx="400" cy="10" r="5" fill="#2563EB" />
            </svg>
          </div>

          <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase">
            <span>Q1</span>
            <span>Q2</span>
            <span>Q3</span>
            <span>Q4</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Risk Distribution Analysis</h3>
              <p className="text-[10px] text-slate-400 font-medium">Weighted summary metrics</p>
            </div>
            <span className="text-xs text-slate-500 font-medium">Calculated real-time</span>
          </div>

          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold text-slate-600">
                <span>High Risk</span>
                <span>{highRiskCount} items</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min((highRiskCount / 20) * 100, 100)}%` }} />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold text-slate-600">
                <span>Medium Risk</span>
                <span>{medRiskCount} items</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min((medRiskCount / 20) * 100, 100)}%` }} />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold text-slate-600">
                <span>Low Risk / Healthy</span>
                <span>{lowRiskCount} items</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min((lowRiskCount / 20) * 100, 100)}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
