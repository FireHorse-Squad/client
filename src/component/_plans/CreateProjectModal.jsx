import React, { useState } from 'react';

export default function CreateProjectModal({ isOpen, onClose, onSubmit, activeWorkspace }) {
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectEmoji, setNewProjectEmoji] = useState('✨');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectRisk, setNewProjectRisk] = useState('Low');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    onSubmit({
      name: newProjectName,
      emoji: newProjectEmoji,
      description: newProjectDesc || 'No description provided.',
      riskLevel: newProjectRisk,
    });
    setNewProjectName('');
    setNewProjectEmoji('✨');
    setNewProjectDesc('');
    setNewProjectRisk('Low');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-6 space-y-4 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Create New Project</h2>
            <p className="text-[10px] text-slate-400 font-medium">Adding to Workspace: {activeWorkspace?.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-1 space-y-1">
              <label className="text-slate-500">Emoji Icon</label>
              <select
                value={newProjectEmoji}
                onChange={(e) => setNewProjectEmoji(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-slate-800 font-medium text-center focus:outline-none"
              >
                <option>✨</option>
                <option>🚀</option>
                <option>🎨</option>
                <option>📐</option>
                <option>📱</option>
                <option>🐕</option>
                <option>💼</option>
              </select>
            </div>

            <div className="col-span-3 space-y-1">
              <label className="text-slate-500">Project Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Design Refresh"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-slate-500">Description</label>
            <textarea
              rows="3"
              placeholder="Summarize key features, scopes, or goals of this creative project..."
              value={newProjectDesc}
              onChange={(e) => setNewProjectDesc(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-500">Risk Threshold Rating</label>
            <div className="grid grid-cols-3 gap-2 pt-1">
              {['Low', 'Medium', 'High'].map((risk) => (
                <button
                  key={risk}
                  type="button"
                  onClick={() => setNewProjectRisk(risk)}
                  className={`py-2 px-3 rounded-xl border text-[11px] font-bold uppercase tracking-wider transition-all ${
                    newProjectRisk === risk
                      ? risk === 'High'
                        ? 'bg-red-50 border-red-500 text-red-600 font-extrabold'
                        : risk === 'Medium'
                        ? 'bg-amber-50 border-amber-500 text-amber-600 font-extrabold'
                        : 'bg-emerald-50 border-emerald-500 text-emerald-600 font-extrabold'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {risk}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl transition-colors">Cancel</button>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-colors">Add Project</button>
          </div>
        </form>
      </div>
    </div>
  );
}
