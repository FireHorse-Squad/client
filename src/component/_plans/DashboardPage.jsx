import React from 'react';
import RiskMetricCard from './RiskMetricCard';
import ProjectCard from './ProjectCard';

export default function DashboardPage({
  workspaceProjects,
  selectedRiskFilter,
  setSelectedRiskFilter,
  highRiskCount,
  medRiskCount,
  lowRiskCount,
  deleteProject,
  toggleProjectStatus,
  setIsCreateProjectOpen,
  activeWorkspaceName
}) {
  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-200/80 shadow-xs">
          <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-xs text-slate-500 font-medium">Overview of workspace projects & issues</p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Your Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          <RiskMetricCard
            label="High risk items"
            count={highRiskCount}
            badge="Active"
            color="red"
            tooltipText="Critical actions required immediately"
            isSelected={selectedRiskFilter === 'High'}
            onClick={() => setSelectedRiskFilter(selectedRiskFilter === 'High' ? null : 'High')}
          />
          <RiskMetricCard
            label="Medium risk items"
            count={medRiskCount}
            badge="Review"
            color="amber"
            tooltipText="Potential bottlenecks identified"
            isSelected={selectedRiskFilter === 'Medium'}
            onClick={() => setSelectedRiskFilter(selectedRiskFilter === 'Medium' ? null : 'Medium')}
          />
          <RiskMetricCard
            label="Low risk items"
            count={lowRiskCount}
            badge="Healthy"
            color="emerald"
            tooltipText="Fully optimized health rating"
            isSelected={selectedRiskFilter === 'Low'}
            onClick={() => setSelectedRiskFilter(selectedRiskFilter === 'Low' ? null : 'Low')}
          />
        </div>
      </div>

      {selectedRiskFilter && (
        <div className="bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-semibold flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <span>Showing projects filtered with <strong>{selectedRiskFilter} Risk</strong> level</span>
          <button onClick={() => setSelectedRiskFilter(null)} className="w-full sm:w-auto text-slate-400 hover:text-slate-600 font-bold bg-white px-3 py-2 rounded-md border border-slate-200 min-h-[36px]">Clear Filter</button>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Pinned Projects</h2>
          <span className="text-xs text-slate-400 font-semibold">{workspaceProjects.length} projects in this workspace</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {workspaceProjects
            .filter(p => !selectedRiskFilter || p.riskLevel === selectedRiskFilter)
            .map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onStatusToggle={toggleProjectStatus}
                onDelete={deleteProject}
              />
            ))}

          {workspaceProjects.length === 0 && (
            <div className="col-span-3 bg-white border border-dashed border-slate-300 rounded-2xl p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-4">
              <div className="text-4xl">📂</div>
              <div>
                <h3 className="font-bold text-slate-800">No projects in this workspace yet</h3>
                <p className="text-xs text-slate-400 mt-1">Get started by creating your very first project for "{activeWorkspaceName}".</p>
              </div>
              <button onClick={() => setIsCreateProjectOpen(true)} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-3 sm:py-2.5 px-5 rounded-xl transition-all shadow-md min-h-[44px]">Create Project</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
