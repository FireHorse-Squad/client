import React from 'react';

export default function BatchExportPage() {
  return (
     <div className="space-y-8 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-200/80 shadow-xs">
              <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Batch Export</h1>
              <p className="text-xs text-slate-500 font-medium">Export timesheets and payroll data in bulk.</p>
            </div>
          </div>
          <button
            className="w-full sm:w-auto px-4 py-3 sm:py-2 bg-[#1742c4] hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow transition flex items-center justify-center gap-2 min-h-[44px]"
          >
            Export Data
          </button>
        </div>
      </div>
    </div>
  );
}


