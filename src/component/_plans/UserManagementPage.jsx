import React from 'react';

export default function UserManagementPage({ users, setIsAddUserOpen, onRemoveUser }) {
  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-200/80 shadow-xs">
            <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">User Management</h1>
            <p className="text-xs text-slate-500 font-medium">Manage access, workspace invitations, and team roles.</p>
          </div>
        </div>

        <button
          onClick={() => setIsAddUserOpen(true)}
          className="w-full sm:w-auto px-4 py-3 sm:py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 min-h-[44px]"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Invite Team Member
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-4 sm:px-6">Name</th>
                <th className="py-4 px-4 sm:px-6">Role</th>
                <th className="py-4 px-4 sm:px-6">Status</th>
                <th className="py-4 px-4 sm:px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/55 transition-colors">
                  <td className="py-4 px-4 sm:px-6 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs border border-slate-200">
                      {user.avatar}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 truncate">{user.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium truncate">{user.email}</p>
                    </div>
                  </td>
                  <td className="py-4 px-4 sm:px-6">
                    <span className="font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                      {user.role}
                    </span>
                  </td>
                  <td className="py-4 px-4 sm:px-6">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                      user.status === 'Active'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      {user.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 sm:px-6 text-right">
                    <button
                      onClick={() => onRemoveUser(user.id, user.name)}
                      className="text-slate-400 hover:text-red-600 font-semibold hover:bg-red-50 p-2 sm:p-1.5 rounded-lg transition-colors min-h-[36px] min-w-[36px]"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
