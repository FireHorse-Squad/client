import React, { useState } from 'react';

export default function CreateWorkspaceModal({ isOpen, onClose, onSubmit }) {
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceColor, setNewWorkspaceColor] = useState('blue');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    onSubmit(newWorkspaceName, newWorkspaceColor);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-6 space-y-4 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Create New Workspace</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
          <div className="space-y-1">
            <label className="text-slate-500">Workspace Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Acme Studio"
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-slate-500">Pick a Brand Color</label>
            <div className="flex gap-2">
              {[
                { key: 'blue', bg: 'bg-blue-600' },
                { key: 'emerald', bg: 'bg-emerald-600' },
                { key: 'orange', bg: 'bg-orange-600' },
                { key: 'purple', bg: 'bg-purple-600' },
                { key: 'pink', bg: 'bg-pink-600' },
              ].map((colorObj) => (
                <button
                  key={colorObj.key}
                  type="button"
                  onClick={() => setNewWorkspaceColor(colorObj.key)}
                  className={`w-8 h-8 rounded-full ${colorObj.bg} border-2 transition-all flex items-center justify-center text-white text-xs font-bold ${
                    newWorkspaceColor === colorObj.key ? 'border-slate-800 scale-110 shadow-sm' : 'border-transparent'
                  }`}
                >
                  {newWorkspaceColor === colorObj.key && '✓'}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl transition-colors">Cancel</button>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-colors">Create</button>
          </div>
        </form>
      </div>
    </div>
  );
}
