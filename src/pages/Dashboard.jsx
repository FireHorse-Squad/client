import React from 'react';

export default function Dashboard() {
    return (
        <div className="space-y-8 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-200/80 shadow-xs">
                    <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
                    </svg>
                </div>
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
                    <p className="text-xs text-slate-500 font-medium">Payroll overview</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Timesheets</h3>
                    <p className="text-3xl font-bold text-slate-900 mt-2">--</p>
                    <p className="text-xs text-slate-400 mt-1">This pay period</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Employees</h3>
                    <p className="text-3xl font-bold text-slate-900 mt-2">--</p>
                    <p className="text-xs text-slate-400 mt-1">Active in system</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Pending Export</h3>
                    <p className="text-3xl font-bold text-slate-900 mt-2">--</p>
                    <p className="text-xs text-slate-400 mt-1">Ready for batch export</p>
                </div>
            </div>
        </div>
    );
}
