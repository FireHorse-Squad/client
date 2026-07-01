import React, { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';
import { Plus, Edit, Trash2, X, AlertCircle, CheckSquare, Square } from 'lucide-react';
import BulkDeleteModal from '../components/common/BulkDeleteModal';

const HEADER_BG = '#2D328F';

const COLUMNS = [
    { id: '__checkbox__', label: '', minWidth: 40, isCheckbox: true },
    { id: 'co_number', label: 'CO NUMBER', minWidth: 120 },
    { id: 'full_name', label: 'FULL NAME', minWidth: 180 },
    { id: 'id_number', label: 'ID NUMBER', minWidth: 140 },
    { id: 'co_code', label: 'CO CODE', minWidth: 100 },
];

export default function Employees() {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [formData, setFormData] = useState({ co_number: '', full_name: '', id_number: '', co_code: '' });
    const [submitting, setSubmitting] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
    const [bulkDeleting, setBulkDeleting] = useState(false);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    useEffect(() => { fetchEmployees(); }, []);

    const fetchEmployees = async () => {
        try {
            setLoading(true);
            const response = await api.get('/employees');
            setEmployees(response.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch employees');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({ co_number: '', full_name: '', id_number: '', co_code: '' });
        setEditingEmployee(null);
    };

    const handleOpenModal = (emp = null) => {
        if (emp) {
            setEditingEmployee(emp);
            setFormData({ co_number: emp.co_number, full_name: emp.full_name, id_number: emp.id_number || '', co_code: emp.co_code || '' });
        } else {
            resetForm();
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            if (editingEmployee) {
                await api.put(`/employees/${editingEmployee.id}`, formData);
            } else {
                await api.post('/employees', formData);
            }
            await fetchEmployees();
            setIsModalOpen(false);
            resetForm();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save employee');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        setSubmitting(true);
        setError('');
        try {
            await api.delete(`/employees/${id}`);
            await fetchEmployees();
            setDeleteConfirm(null);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete employee');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSelectAll = () => {
        if (selectedIds.length === paginatedData.length && paginatedData.length > 0) {
            setSelectedIds([]);
        } else {
            setSelectedIds(paginatedData.map((row) => row.id));
        }
    };

    const handleSelectRow = (id) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    };

    const handleBulkDeleteClick = () => {
        setBulkDeleteOpen(true);
    };

    const handleBulkDeleteConfirm = async () => {
        if (selectedIds.length === 0) return;
        setBulkDeleting(true);
        try {
            await Promise.all(selectedIds.map((id) => api.delete(`/employees/${id}`)));
            await fetchEmployees();
            setSelectedIds([]);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete selected employees');
        } finally {
            setBulkDeleting(false);
            setBulkDeleteOpen(false);
        }
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
        setPage(0);
    };

    const filteredData = useMemo(() => {
        let result = [...employees];
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            result = result.filter(e => (e.co_number || '').toLowerCase().includes(lower) || (e.full_name || '').toLowerCase().includes(lower));
        }
        if (sortConfig.key) {
            result.sort((a, b) => {
                const aVal = a[sortConfig.key];
                const bVal = b[sortConfig.key];
                const aNum = parseFloat(aVal);
                const bNum = parseFloat(bVal);
                if (!isNaN(aNum) && !isNaN(bNum)) return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
                const aStr = String(aVal || '').toLowerCase();
                const bStr = String(bVal || '').toLowerCase();
                if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return result;
    }, [employees, searchTerm, sortConfig]);

    const paginatedData = useMemo(() => {
        const startIdx = page * rowsPerPage;
        return filteredData.slice(startIdx, startIdx + rowsPerPage);
    }, [filteredData, page, rowsPerPage]);

    const totalPages = Math.ceil(filteredData.length / rowsPerPage) || 1;

    const handlePageChange = (newPage) => { if (newPage >= 0 && newPage < totalPages) setPage(newPage); };
    const handleRowsPerPageChange = (e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); };

    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 md:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-200/80 shadow-xs">
                            <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Employees</h1>
                            <p className="text-xs text-slate-500 font-medium">Employee roster and management.</p>
                        </div>
                    </div>
                    <button onClick={() => handleOpenModal()} className="w-full sm:w-auto px-4 py-3 sm:py-2 bg-[#1742c4] hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow transition flex items-center justify-center gap-2 min-h-[44px]"><Plus size={16} /> Add Employee</button>
                </div>
            </div>

            {error && <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg">{error}</div>}

            <div className="w-full bg-white py-4 sm:py-6 px-2 sm:px-4 flex flex-col font-sans">
                <div className="w-full flex flex-col bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div><h1 className="text-xl font-bold text-slate-800">Employee Directory</h1><p className="text-xs text-slate-500 mt-1">{filteredData.length} employees</p></div>
                        <input type="text" placeholder="Search employees..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }} className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs w-48" />
                    </div>
                    {selectedIds.length > 0 && (
                        <div className="bg-red-50 border-b border-red-200 px-6 py-3 flex items-center justify-between">
                            <span className="text-sm font-semibold text-red-700">
                                {selectedIds.length} employee{selectedIds.length > 1 ? "s" : ""} selected
                            </span>
                            <button
                                onClick={handleBulkDeleteClick}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete Selected
                            </button>
                        </div>
                    )}
                    <div className="flex-grow overflow-auto max-h-[58vh] relative min-h-[400px] bg-slate-50 border-b border-slate-200">
                        <table className="w-full border-separate border-spacing-0 table-fixed select-text">
                            <thead className="sticky top-0 z-20">
                                <tr>
                                    <th style={{ minWidth: `${COLUMNS[0].minWidth}px`, width: `${COLUMNS[0].minWidth}px`, backgroundColor: HEADER_BG }} className="text-white font-semibold text-xs py-3.5 px-2 uppercase tracking-wider text-center border-r border-indigo-900/40 select-none rounded-tl-sm">
                                        <button onClick={handleSelectAll} className="hover:opacity-80 transition" title={selectedIds.length === paginatedData.length && paginatedData.length > 0 ? "Deselect All" : "Select All Employees"}>
                                            {selectedIds.length === paginatedData.length && paginatedData.length > 0 ? <CheckSquare className="w-4 h-4 text-white" /> : <Square className="w-4 h-4 text-white/70" />}
                                        </button>
                                    </th>
                                    {COLUMNS.filter(c => !c.isCheckbox).map((column) => {
                                        const actualIndex = COLUMNS.indexOf(column);
                                        return (
                                            <th key={column.id} style={{ minWidth: `${column.minWidth}px`, width: `${column.minWidth}px`, backgroundColor: HEADER_BG }} className={`text-white font-semibold text-xs py-3.5 px-4 uppercase tracking-wider text-left border-r border-indigo-900/40 select-none ${actualIndex === COLUMNS.length - 1 ? 'rounded-tr-sm' : ''}`}>
                                                <div className="flex items-center justify-between cursor-pointer" onClick={() => handleSort(column.id)}><span>{column.label}</span><span className="text-[9px] opacity-60">⇅</span></div>
                                            </th>
                                        );
                                    })}
                                    <th key="actions" style={{ minWidth: '80px', width: '80px', backgroundColor: HEADER_BG }} className="text-white font-semibold text-xs py-3.5 px-4 uppercase tracking-wider text-center border-r border-indigo-900/40 select-none rounded-tr-sm">ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {paginatedData.length > 0 ? paginatedData.map((row, rowIndex) => {
                                    const isEven = rowIndex % 2 === 0;
                                    const rowClass = isEven ? 'bg-[#F5F7FA] hover:bg-slate-200/80 transition-colors' : 'bg-white hover:bg-slate-100 transition-colors';
                                    return (
                                        <tr key={row.id} className={rowClass}>
                                            {COLUMNS.map((column) => {
                                                if (column.isCheckbox) {
                                                    return (
                                                        <td key={column.key} style={{ width: `${column.minWidth}px` }} className="px-2 py-3 text-xs border-r border-slate-200/60 text-center">
                                                            <button
                                                                onClick={() => handleSelectRow(row.id)}
                                                                className={`transition ${selectedIds.includes(row.id) ? "text-[#1742c4]" : "text-slate-300 hover:text-slate-400"}`}
                                                                title={selectedIds.includes(row.id) ? "Deselect" : "Select"}
                                                            >
                                                                {selectedIds.includes(row.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                                            </button>
                                                        </td>
                                                    );
                                                }
                                                return (
                                                    <td key={column.id} style={{ width: `${column.minWidth}px` }} className="px-4 py-3 text-xs border-r border-slate-200/60 truncate text-slate-700 font-medium text-left" title={String(row[column.id] || '-')}>{row[column.id] || '-'}</td>
                                                );
                                            })}
                                            <td className="px-4 py-3 text-xs text-center border-r border-slate-200/60" style={{ width: '80px' }}>
                                                <div className="flex justify-center gap-1">
                                                    <button onClick={() => handleOpenModal(row)} className="p-1 text-slate-400 hover:text-blue-600 transition-colors"><Edit size={14} /></button>
                                                    <button onClick={() => setDeleteConfirm(row.id)} className="p-1 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr><td colSpan={COLUMNS.length + 1} className="py-16 text-center text-slate-400 bg-white"><div className="flex flex-col items-center justify-center"><div className="text-slate-300 text-5xl mb-3">📭</div><p className="text-base font-semibold text-slate-500">No employees found</p></div></td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 text-xs sm:text-sm text-[#2D328F] select-none">
                        <div className="text-center md:text-left">Showing <strong className="text-[#2D328F]">{Math.min(filteredData.length, page * rowsPerPage + 1)}</strong> to <strong className="text-[#2D328F]">{Math.min(filteredData.length, (page + 1) * rowsPerPage)}</strong> of <strong className="text-[#2D328F]">{filteredData.length}</strong> employees</div>
                        <div className="flex flex-wrap items-center justify-center gap-6">
                            <div className="flex items-center gap-2"><span className="text-xs text-[#2D328F]">Rows per page:</span>
                                <div className="relative"><select value={rowsPerPage} onChange={handleRowsPerPageChange} className="bg-[#2D328F]-100 hover:bg-slate-200 text-[#2D328F] border border-[#2D328F] rounded-[10px] px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#2D328F] pr-7 appearance-none cursor-pointer font-medium"><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option></select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#2D328F]"><svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg></div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1"><span className="text-xs text-[#2D328F] mr-2">Page <strong className="text-[#2D328F]">{page + 1}</strong> of <strong className="text-[#2D328F]">{totalPages}</strong></span>
                                <button onClick={() => handlePageChange(0)} disabled={page === 0} className="p-1.5 rounded text-[#2D328F] hover:bg-[#F5B52A] disabled:opacity-30 transition-colors cursor-pointer"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7M20 19l-7-7 7-7" /></svg></button>
                                <button onClick={() => handlePageChange(page - 1)} disabled={page === 0} className="p-1.5 rounded text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-colors cursor-pointer"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg></button>
                                <div className="hidden sm:flex items-center gap-1">{Array.from({ length: totalPages }).map((_, pIdx) => { if (pIdx < page - 1 || pIdx > page + 1) return null; return <button key={pIdx} onClick={() => handlePageChange(pIdx)} className={`w-8 h-8 rounded-full text-xs font-semibold transition-all cursor-pointer ${page === pIdx ? 'bg-[#2D328F] text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>{pIdx + 1}</button>; })}</div>
                                <button onClick={() => handlePageChange(page + 1)} disabled={page === totalPages - 1} className="p-1.5 rounded text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-colors cursor-pointer"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg></button>
                                <button onClick={() => handlePageChange(totalPages - 1)} disabled={page === totalPages - 1} className="p-1.5 rounded text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-colors cursor-pointer"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M4 5l7 7-7 7" /></svg></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {deleteConfirm && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
                        <div className="p-6 text-center"><div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600"><AlertCircle size={32} /></div><h3 className="text-xl font-bold text-slate-800 mb-2">Delete Employee?</h3><p className="text-slate-500">This action cannot be undone.</p></div>
                        <div className="flex gap-3 p-6 pt-0"><button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-lg transition-colors">Cancel</button><button onClick={() => handleDelete(deleteConfirm)} disabled={submitting} className="flex-1 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50">{submitting ? 'Deleting...' : 'Delete'}</button></div>
                    </div>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-slate-800">{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</h3>
                            <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="p-1 text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div><label className="block text-sm font-medium text-slate-700 mb-1">CO Number</label><input type="text" required className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.co_number} onChange={e => setFormData({ ...formData, co_number: e.target.value })} /></div>
                            <div><label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label><input type="text" required className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} /></div>
                            <div><label className="block text-sm font-medium text-slate-700 mb-1">ID Number</label><input type="text" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.id_number} onChange={e => setFormData({ ...formData, id_number: e.target.value })} /></div>
                            <div><label className="block text-sm font-medium text-slate-700 mb-1">CO Code</label><input type="text" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.co_code} onChange={e => setFormData({ ...formData, co_code: e.target.value })} /></div>
                            <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
                                <button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }} className="flex-1 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                                <button type="submit" disabled={submitting} className="flex-1 py-2 bg-[#1742c4] text-white font-semibold rounded-lg hover:bg-blue-800 transition-colors shadow-md disabled:opacity-50">{submitting ? 'Saving...' : (editingEmployee ? 'Save Changes' : 'Create Employee')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <BulkDeleteModal
                open={bulkDeleteOpen}
                onClose={() => setBulkDeleteOpen(false)}
                onConfirm={handleBulkDeleteConfirm}
                deleting={bulkDeleting}
                selectedCount={selectedIds.length}
                itemName="employees"
            />
        </div>
    );
}