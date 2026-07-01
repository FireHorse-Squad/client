import React from 'react';
import ProjectCard from './ProjectCard';

export default function KreativgebeitPage({ projects, onStatusToggle, onDelete, onCreateProject }) {
  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-bold shadow-sm">
          K
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Kreativgebiet GmbH</h1>
          <p className="text-xs text-slate-500 font-medium">Workspace projects and management</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Projects</h2>
          <span className="text-xs text-slate-400 font-semibold">{projects.length} projects</span>
        </div>

        {projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} onStatusToggle={onStatusToggle} onDelete={onDelete} />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-4">
            <div className="text-4xl">📂</div>
            <div>
              <h3 className="font-bold text-slate-800">No projects yet</h3>
              <p className="text-xs text-slate-400 mt-1">Get started by creating your first project for Kreativgebiet GmbH.</p>
            </div>
            <button onClick={onCreateProject} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-3 sm:py-2.5 px-5 rounded-xl transition-all shadow-md min-h-[44px]">Create Project</button>
          </div>
        )}
      </div>
    </div>
  );
}
