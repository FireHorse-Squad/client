import React from 'react';

const riskStyles = {
  High: { bg: 'bg-red-50', text: 'text-red-600' },
  Medium: { bg: 'bg-amber-50', text: 'text-amber-600' },
  Low: { bg: 'bg-emerald-50', text: 'text-emerald-600' }
};

export default function ProjectCard({ project, onStatusToggle, onDelete }) {
  const risk = riskStyles[project.riskLevel] || riskStyles.Low;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 flex flex-col justify-between hover:shadow-lg hover:border-slate-300 transition-all group relative duration-200 min-h-[190px]">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{project.emoji}</span>
            <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
              {project.name}
            </h3>
          </div>
          <button
            onClick={() => onDelete(project.id)}
            className="text-slate-400 hover:text-red-500 transition-all p-1.5 sm:p-1 rounded-lg hover:bg-red-50 sm:opacity-0 sm:group-hover:opacity-100 min-h-[36px] min-w-[36px] flex items-center justify-center"
            title="Delete Project"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed font-medium">
          {project.description}
        </p>
      </div>

      <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
        <button
          onClick={() => onStatusToggle(project.id)}
          className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase transition-colors ${
            project.status === 'Active'
              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {project.status}
        </button>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Risk:</span>
          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${risk.bg} ${risk.text}`}>
            {project.riskLevel}
          </span>
        </div>
      </div>
    </div>
  );
}
