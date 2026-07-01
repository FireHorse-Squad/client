import React, { useState, useRef } from 'react';
import TimesheetList from "../components/_timesheets/timesheetlist";
import TimesheetModal from "../components/_timesheets/timesheetmodal";
import { Upload, FileSpreadsheet, Fingerprint, Plus, Pencil, Trash2 } from 'lucide-react';
import api from '../utils/api';
import { dispatchDataChange } from '../utils/dataSync';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';

export default function Timesheets() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRow, setEditingRow] = useState(null);
    const [importing, setImporting] = useState(false);
    const [importType, setImportType] = useState(null);
    const [importMsg, setImportMsg] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const csvInputRef = useRef(null);
    const bioInputRef = useRef(null);

    const handleSave = () => {
        setRefreshKey((prev) => prev + 1);
        dispatchDataChange('timesheet-save');
    };

    const handleEdit = (row) => {
        setEditingRow(row);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (row) => {
        setDeleteTarget(row);
    };

    const handleDeleteConfirm = async () => {
        if (!deleteTarget?.id) return;
        setDeleting(true);
        try {
            await api.delete(`/timesheets/${deleteTarget.id}`);
            dispatchDataChange('timesheet-delete');
            setRefreshKey((prev) => prev + 1);
            setDeleteTarget(null);
        } catch (err) {
            setImportMsg({ type: 'error', text: err.response?.data?.message || 'Failed to delete timesheet' });
        } finally {
            setDeleting(false);
        }
    };

    const handleBulkDelete = async (selectedIds) => {
        setDeleting(true);
        try {
            await Promise.all(selectedIds.map(id => api.delete(`/timesheets/${id}`)));
            dispatchDataChange('timesheet-delete');
            setRefreshKey((prev) => prev + 1);
        } catch (err) {
            setImportMsg({ type: 'error', text: err.response?.data?.message || 'Failed to delete selected timesheets' });
            throw err;
        } finally {
            setDeleting(false);
        }
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setEditingRow(null);
    };

    const handleCSVImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImporting(true);
        setImportType('csv');
        setImportMsg(null);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await api.post('/timesheets/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setImportMsg({ type: 'success', text: res.data.message || `Imported ${res.data.imported} timesheets` });
            dispatchDataChange('csv-import');
            window.location.reload();
        } catch (err) {
            setImportMsg({ type: 'error', text: err.response?.data?.message || 'CSV import failed' });
        } finally {
            setImporting(false);
            e.target.value = '';
        }
    };

    const handleBiometricsImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImporting(true);
        setImportType('biometric');
        setImportMsg(null);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await api.post('/timesheets/import-biometrics', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setImportMsg({ type: 'success', text: res.data.message || `Imported ${res.data.imported} biometric timesheets` });
            dispatchDataChange('biometric-import');
            window.location.reload();
        } catch (err) {
            setImportMsg({ type: 'error', text: err.response?.data?.message || 'Biometrics import failed' });
        } finally {
            setImporting(false);
            e.target.value = '';
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 md:p-8 mt-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-200/80 shadow-xs">
                            <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Timesheets</h1>
                            <p className="text-xs text-slate-500 font-medium">Track and manage employee working hours.</p>
                        </div>
                    </div>
                    <div className="inline-flex flex-wrap items-center gap-3 p-6 bg-slate-50 border border-slate-200/90 rounded-2xl shadow-[0_4px_20px_-4px_rgba(148,163,184,0.12)]">
                        <button
                            onClick={() => csvInputRef.current?.click()}
                            disabled={importing}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100/80 active:scale-[0.98] border border-emerald-200/80 hover:border-emerald-300 shadow-xs disabled:opacity-50"
                        >
                            <FileSpreadsheet className="w-4 h-4 text-emerald-600" strokeWidth={2.2} />
                            <span>{importing && importType === 'csv' ? 'Importing...' : 'Import CSV'}</span>
                        </button>
                        <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
                        <button
                            onClick={() => bioInputRef.current?.click()}
                            disabled={importing}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100/80 active:scale-[0.98] border border-indigo-200/80 hover:border-indigo-300 shadow-xs disabled:opacity-50"
                        >
                            <Fingerprint className="w-4 h-4 text-indigo-600" strokeWidth={2.2} />
                            <span>{importing && importType === 'biometric' ? 'Importing...' : 'Import Biometrics'}</span>
                        </button>
                        <input ref={bioInputRef} type="file" accept=".csv" className="hidden" onChange={handleBiometricsImport} />
                        <button
                            onClick={() => { setEditingRow(null); setIsModalOpen(true); }}
                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 bg-amber-500 text-white hover:bg-amber-600 active:scale-[0.98] border border-amber-600/10 shadow-sm hover:shadow-md"
                        >
                            <Plus className="w-4 h-4 text-white" strokeWidth={2.5} />
                            <span>New Timesheet</span>
                        </button>
                    </div>
                </div>
                {importMsg && (
                    <div className={`mt-4 p-3 rounded-lg text-sm font-medium flex items-center gap-2 ${importMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        {importMsg.text}
                    </div>
                )}
            </div>
            <div className="w-[100%] b">
                <TimesheetList
                    refreshKey={refreshKey}
                    onEdit={handleEdit}
                    onDelete={handleDeleteClick}
                    onBulkDelete={handleBulkDelete}
                />
            </div>
            <TimesheetModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                onSave={handleSave}
                editData={editingRow}
            />

            <Dialog
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                maxWidth="xs"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 2,
                        borderTop: '8px solid #1742c4',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                    }
                }}
            >
                <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#1e293b', pb: 1 }}>
                    Delete Timesheet
                </DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ color: '#475569', fontSize: '0.95rem' }}>
                        Are you sure you want to delete this record? This action cannot be undone.
                        {deleteTarget && (
                            <span className="block mt-2 text-xs text-slate-500">
                                Timesheet <strong>#{deleteTarget.timesheetNo}</strong> — {deleteTarget.clientName}
                            </span>
                        )}
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
                    <Button
                        onClick={() => setDeleteTarget(null)}
                        disabled={deleting}
                        sx={{
                            color: '#475569',
                            border: '1px solid #cbd5e1',
                            borderRadius: 1,
                            textTransform: 'none',
                            fontWeight: 600,
                            px: 3,
                            '&:hover': { border: '1px solid #94a3b8', backgroundColor: '#f8fafc' },
                        }}
                    >
                        No
                    </Button>
                    <Button
                        onClick={handleDeleteConfirm}
                        disabled={deleting}
                        variant="contained"
                        sx={{
                            backgroundColor: '#dc2626',
                            '&:hover': { backgroundColor: '#b91c1c' },
                            borderRadius: 1,
                            textTransform: 'none',
                            fontWeight: 600,
                            px: 3,
                        }}
                    >
                        {deleting ? 'Deleting...' : 'Yes, Delete'}
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}
