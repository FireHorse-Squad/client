import React from 'react';

export default function WorkspaceDropdown({ workspaces, activeWorkspace, isOpen, onToggle, onSelect, onCreateWorkspace }) {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onToggle} />
      <div className="absolute left-0 mt-2 w-64 bg-white border border-slate-200/95 rounded-2xl shadow-xl py-3 z-20 animate-in fade-in slide-in-from-top-2 duration-150">
        <div className="space-y-1 px-2 pb-2">
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => onSelect(ws)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                activeWorkspace.id === ws.id
                  ? 'bg-slate-50 text-slate-900'
                  : 'hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-lg ${ws.color} text-white flex items-center justify-center text-xs font-bold`}>
                  {ws.initial}
                </span>
                <span>{ws.name}</span>
              </div>
              {activeWorkspace.id === ws.id && (
                <svg className="w-4 h-4 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>

        <div className="border-t border-slate-150 my-2" />

        <div className="px-2">
          <button
            onClick={onCreateWorkspace}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-xl text-xs text-center flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            Create Workspace
          </button>
        </div>
      </div>
    </>
  );
}
