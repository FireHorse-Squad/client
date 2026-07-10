import React, { useState, useEffect, useRef, useMemo } from 'react';
import api from '../utils/api';
import { Plus, Edit, FileSpreadsheet, Trash2, X, AlertCircle, CheckSquare, Square } from 'lucide-react';
import BulkDeleteModal from '../components/common/BulkDeleteModal';
import { dispatchDataChange, onDataChange } from '../utils/dataSync';

const HEADER_BG = '#2D328F';

const DISPLAY_FIELDS = [
    { key: '__checkbox__', label: '', minWidth: 40, isCheckbox: true },
    { key: 'lookup', label: 'LOOKUP', minWidth: 110 },
    { key: 'client_id', label: 'CLIENT ID', minWidth: 120 },
    { key: 'client_name', label: 'CLIENT NAME', minWidth: 180 },
    { key: 'site', label: 'SITE', minWidth: 130 },
    { key: 'region', label: 'REGION', minWidth: 110 },
    { key: 'pay_cycle', label: 'PAY CYCLE', minWidth: 110 },
    { key: 'sector', label: 'SECTOR', minWidth: 110 },
    { key: 'contact_person', label: 'CONTACT PERSON', minWidth: 150 },
    { key: 'contact_details', label: 'CONTACT DETAILS', minWidth: 170 },
    { key: 'sales_rep', label: 'SALES REP', minWidth: 130 },
    { key: 'transaction_code', label: 'TRANSACTION CODE', minWidth: 130 },
    { key: 'occupation', label: 'OCCUPATION', minWidth: 140 },
    { key: 'nt_hourly_rate', label: 'NT RATE', minWidth: 100, align: 'right' },
    { key: 'ot_1_5_rate', label: 'OT 1.5 RATE', minWidth: 110, align: 'right' },
    { key: 'ot_2_0_rate', label: 'OT 2.0 RATE', minWidth: 110, align: 'right' },
    { key: 'annual_leave', label: 'ANNUAL LEAVE', minWidth: 110, align: 'right' },
    { key: 'sick_leave', label: 'SICK LEAVE', minWidth: 100, align: 'right' },
    { key: 'family_resp_leave', label: 'FAMILY RESP LEAVE', minWidth: 130, align: 'right' },
    { key: 'paid_public_holidays', label: 'PAID PUBLIC HOL', minWidth: 120, align: 'right' },
    { key: 'severance_provision', label: 'SEVERANCE PROV', minWidth: 120, align: 'right' },
    { key: 'annual_bonus', label: 'ANNUAL BONUS', minWidth: 110, align: 'right' },
    { key: 'provident_fund', label: 'PROVIDENT FUND', minWidth: 120, align: 'right' },
    { key: 'wellness_fund', label: 'WELLNESS FUND', minWidth: 120, align: 'right' },
    { key: 'industry_reg_levy', label: 'INDUSTRY LEVY', minWidth: 120, align: 'right' },
    { key: 'sub_total_a', label: 'SUB TOTAL A', minWidth: 110, align: 'right' },
    { key: 'uif', label: 'UIF', minWidth: 80, align: 'right' },
    { key: 'sdl', label: 'SDL', minWidth: 80, align: 'right' },
    { key: 'coida', label: 'COIDA', minWidth: 80, align: 'right' },
    { key: 'sub_total_b', label: 'SUB TOTAL B', minWidth: 110, align: 'right' },
    { key: 'medicals', label: 'MEDICALS', minWidth: 100, align: 'right' },
    { key: 'criminal_checks', label: 'CRIMINAL CHECKS', minWidth: 120, align: 'right' },
    { key: 'ppe', label: 'PPE', minWidth: 80, align: 'right' },
    { key: 'preservation_fund', label: 'PRESERVATION FUND', minWidth: 130, align: 'right' },
    { key: 'service_fee', label: 'SERVICE FEE', minWidth: 110, align: 'right' },
    { key: 'admin_costs', label: 'ADMIN COSTS', minWidth: 120, align: 'right' },
    { key: 'payroll_financing_fee', label: 'PAYROLL FIN', minWidth: 120, align: 'right' },
    { key: 'supervision_fee', label: 'SUPER FEE', minWidth: 110, align: 'right' },
    { key: 'nt_invoice_rate', label: 'NT INV RATE', minWidth: 120, align: 'right' },
    { key: 'ot_1_5_invoice_rate', label: 'OT 1.5 INV', minWidth: 120, align: 'right' },
    { key: 'ot_2_0_invoice_rate', label: 'OT 2.0 INV', minWidth: 120, align: 'right' },
    { key: 'night_shift_allowance', label: 'NIGHT ALLOW', minWidth: 120, align: 'right' },
    { key: 'substance_allowance', label: 'SUBSTANCE ALLOW', minWidth: 130, align: 'right' },
    { key: 'hazardous_allowance', label: 'HAZARD ALLOW', minWidth: 130, align: 'right' },
    { key: 'nt_per_day', label: 'NT PER DAY', minWidth: 100, align: 'right' },
    { key: 'deduct_lunch_hour', label: 'LUNCH DEDUCT', minWidth: 110, align: 'right' },
    { key: 'hrs_pd', label: 'HRS/DAY', minWidth: 90, align: 'right' },
];

export default function Clients() {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importType, setImportType] = useState(null);
    const [importMsg, setImportMsg] = useState(null);
    const [editingClient, setEditingClient] = useState(null);
    const [formData, setFormData] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
    const [bulkDeleting, setBulkDeleting] = useState(false);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const clientInputRef = useRef(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    useEffect(() => {
        fetchClients();
        const unsubscribe = onDataChange(() => {
            fetchClients();
        });
        return () => unsubscribe();
    }, []);

    const fetchClients = async () => {
        try {
            setLoading(true);
            const response = await api.get('/clientrates');
            setClients(response.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch clients');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            lookup: '', client_id: '', client_name: '', site: '', region: '', pay_cycle: '', sector: '',
            contact_person: '', contact_details: '', sales_rep: '', transaction_code: '', occupation: '',
            nt_hourly_rate: '', ot_1_5_rate: '', ot_2_0_rate: '', hrs_pd: '', deduct_lunch_hour: '',
            sub_total_a: '', sub_total_b: '', uif: '', sdl: '', coida: '', medicals: '', criminal_checks: '', ppe: '',
            preservation_fund: '', service_fee: '', admin_costs: '', payroll_financing_fee: '',
            supervision_fee: '', nt_invoice_rate: '', ot_1_5_invoice_rate: '', ot_2_0_invoice_rate: '',
            night_shift_allowance: '', substance_allowance: '', hazardous_allowance: '', nt_per_day: '',
            annual_leave: '', sick_leave: '', family_resp_leave: '', paid_public_holidays: '',
            severance_provision: '', annual_bonus: '', provident_fund: '', wellness_fund: '', industry_reg_levy: ''
        });
        setEditingClient(null);
    };

    const handleOpenModal = (client = null) => {
        if (client) {
            setEditingClient(client);
            setFormData({
                lookup: client.lookup || '',
                client_id: client.client_id || '',
                client_name: client.client_name || '',
                site: client.site || '',
                region: client.region || '',
                pay_cycle: client.pay_cycle || '',
                sector: client.sector || '',
                contact_person: client.contact_person || '',
                contact_details: client.contact_details || '',
                sales_rep: client.sales_rep || '',
                transaction_code: client.transaction_code || '',
                occupation: client.occupation || '',
                nt_hourly_rate: client.nt_hourly_rate || '',
                ot_1_5_rate: client.ot_1_5_rate || '',
                ot_2_0_rate: client.ot_2_0_rate || '',
                hrs_pd: client.hrs_pd || '',
                deduct_lunch_hour: client.deduct_lunch_hour || '',
                sub_total_a: client.sub_total_a || '',
                sub_total_b: client.sub_total_b || '',
                nt_invoice_rate: client.nt_invoice_rate || '',
                ot_1_5_invoice_rate: client.ot_1_5_invoice_rate || '',
                ot_2_0_invoice_rate: client.ot_2_0_invoice_rate || '',
                annual_leave: client.annual_leave || '',
                sick_leave: client.sick_leave || '',
                family_resp_leave: client.family_resp_leave || '',
                paid_public_holidays: client.paid_public_holidays || '',
                severance_provision: client.severance_provision || '',
                annual_bonus: client.annual_bonus || '',
                provident_fund: client.provident_fund || '',
                wellness_fund: client.wellness_fund || '',
                industry_reg_levy: client.industry_reg_levy || '',
                uif: client.uif || '',
                sdl: client.sdl || '',
                coida: client.coida || '',
                medicals: client.medicals || '',
                criminal_checks: client.criminal_checks || '',
                ppe: client.ppe || '',
                preservation_fund: client.preservation_fund || '',
                service_fee: client.service_fee || '',
                admin_costs: client.admin_costs || '',
                supervision_fee: client.supervision_fee || '',
                payroll_financing_fee: client.payroll_financing_fee || '',
                night_shift_allowance: client.night_shift_allowance || '',
                substance_allowance: client.substance_allowance || '',
                hazardous_allowance: client.hazardous_allowance || '',
                nt_per_day: client.nt_per_day || '',
            });
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
            const numericFields = ['nt_hourly_rate', 'ot_1_5_rate', 'ot_2_0_rate', 'hrs_pd', 'deduct_lunch_hour',
                'sub_total_a', 'uif', 'sdl', 'coida', 'medicals', 'criminal_checks', 'ppe',
                'preservation_fund', 'service_fee', 'admin_costs', 'payroll_financing_fee',
                'supervision_fee', 'nt_invoice_rate', 'ot_1_5_invoice_rate', 'ot_2_0_invoice_rate',
                'night_shift_allowance', 'substance_allowance', 'hazardous_allowance', 'nt_per_day',
                'annual_leave', 'sick_leave', 'family_resp_leave', 'paid_public_holidays',
                'severance_provision', 'annual_bonus', 'provident_fund', 'wellness_fund', 'industry_reg_levy'];

            const payload = { ...formData };
            numericFields.forEach(field => {
                if (payload[field] !== '' && payload[field] != null) {
                    payload[field] = parseFloat(payload[field]);
                } else {
                    payload[field] = null;
                }
            });

            if (editingClient) {
                await api.put(`/clientrates/${editingClient.id}`, payload);
            } else {
                await api.post('/clientrates', payload);
            }
            await fetchClients();
            dispatchDataChange('client-save');
            setIsModalOpen(false);
            resetForm();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save client');
        } finally {
            setSubmitting(false);
        }
    };

//trigger deploy
    const handleClientImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImporting(true);
        setImportType('csv');
        setImportMsg(null);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await api.post('/clientrates/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setImportMsg({ type: 'success', text: res.data.message || `Imported ${res.data.imported} clientrates` });
            dispatchDataChange('csv-import');
            window.location.reload();
        } catch (err) {
            setImportMsg({ type: 'error', text: err.response?.data?.message || 'CSV import failed' });
        } finally {
            setImporting(false);
            e.target.value = '';
        }
    };

    const handleDelete = async (id) => {
        setSubmitting(true);
        setError('');
        try {
            await api.delete(`/clientrates/${id}`);
            await fetchClients();
            dispatchDataChange('client-delete');
            setDeleteConfirm(null);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete client');
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
            await Promise.all(selectedIds.map((id) => api.delete(`/clientrates/${id}`)));
            await fetchClients();
            dispatchDataChange('client-delete');
            setSelectedIds([]);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete selected clients');
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
        let result = [...clients];
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            result = result.filter(c =>
                (c.client_id || '').toLowerCase().includes(lower) ||
                (c.client_name || '').toLowerCase().includes(lower) ||
                (c.occupation || '').toLowerCase().includes(lower)
            );
        }
        if (sortConfig.key) {
            result.sort((a, b) => {
                const aVal = a[sortConfig.key];
                const bVal = b[sortConfig.key];
                const aNum = parseFloat(aVal);
                const bNum = parseFloat(bVal);
                if (!isNaN(aNum) && !isNaN(bNum)) {
                    return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
                }
                const aStr = String(aVal || '').toLowerCase();
                const bStr = String(bVal || '').toLowerCase();
                if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return result;
    }, [clients, searchTerm, sortConfig]);

    const paginatedData = useMemo(() => {
        const startIdx = page * rowsPerPage;
        return filteredData.slice(startIdx, startIdx + rowsPerPage);
    }, [filteredData, page, rowsPerPage]);

    const totalPages = Math.ceil(filteredData.length / rowsPerPage) || 1;

    const handlePageChange = (newPage) => {
        if (newPage >= 0 && newPage < totalPages) setPage(newPage);
    };

    const handleRowsPerPageChange = (e) => {
        setRowsPerPage(parseInt(e.target.value, 10));
        setPage(0);
    };

    const getNumericValue = (val) => {
        const num = parseFloat(val);
        return isNaN(num) ? '-' : num.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 md:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">


                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-200/80 shadow-xs">
                            <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Clients</h1>
                            <p className="text-xs text-slate-500 font-medium">Client management and rate configuration.</p>
                        </div>
                    </div>


                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => clientInputRef.current?.click()}
                            disabled={importing}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100/80 active:scale-[0.98] border border-emerald-200/80 hover:border-emerald-300 shadow-xs">
                            <FileSpreadsheet className="w-4 h-4 text-emerald-600" strokeWidth={2.2} />
                            <span>{importing && importType === 'csv' ? 'Importing...' : 'Import Rates'}</span>
                        </button>
                        <input ref={clientInputRef} type="file" accept=".csv" className="hidden" onChange={handleClientImport} />

                        <button onClick={() => handleOpenModal()} className="px-4 py-2.5 bg-[#1742c4] hover:bg-blue-800 text-white text-sm font-bold rounded-xl shadow transition flex items-center justify-center gap-2">
                            <Plus size={16} /> New Client
                        </button>
                    </div>
                </div>
                 {importMsg && (
                    <div className={`mt-4 p-3 rounded-lg text-sm font-medium flex items-center gap-2 ${importMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        {importMsg.text}
                    </div>
                )}
            </div>

            {error && <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg">{error}</div>}


            <div className="w-full flex flex-col bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">Client Rates</h1>
                        <p className="text-xs text-slate-500 mt-1">{filteredData.length} client rate records</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="text" placeholder="Search clients..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }} className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs w-48" />
                    </div>
                </div>
                {selectedIds.length > 0 && (
                    <div className="bg-red-50 border-b border-red-200 px-6 py-3 flex items-center justify-between">
                        <span className="text-sm font-semibold text-red-700">
                            {selectedIds.length} client{selectedIds.length > 1 ? "s" : ""} selected
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
                                {DISPLAY_FIELDS.map((column, index) => {
                                    if (column.isCheckbox) {
                                        return (
                                            <th key={column.key} style={{ minWidth: `${column.minWidth}px`, width: `${column.minWidth}px`, backgroundColor: HEADER_BG }} className="text-white font-semibold text-xs py-3.5 px-2 uppercase tracking-wider text-center border-r border-indigo-900/40 select-none rounded-tl-sm">
                                                <button onClick={handleSelectAll} className="hover:opacity-80 transition" title={selectedIds.length === paginatedData.length && paginatedData.length > 0 ? "Deselect All" : "Select All Clients"}>
                                                    {selectedIds.length === paginatedData.length && paginatedData.length > 0 ? <CheckSquare className="w-4 h-4 text-white" /> : <Square className="w-4 h-4 text-white/70" />}
                                                </button>
                                            </th>
                                        );
                                    }
                                    return (
                                        <th key={column.key} style={{ minWidth: `${column.minWidth}px`, width: `${column.minWidth}px`, backgroundColor: HEADER_BG }} className={`text-white font-semibold text-xs py-3.5 px-4 uppercase tracking-wider text-left border-r border-indigo-900/40 select-none ${column.align === 'right' ? 'text-right' : 'text-left'} ${index === DISPLAY_FIELDS.length - 1 ? 'rounded-tr-sm' : ''}`}>
                                            <div className="flex items-center justify-between cursor-pointer" onClick={() => handleSort(column.key)}>
                                                <span>{column.label}</span>
                                                <span className="text-[9px] opacity-60">⇅</span>
                                            </div>
                                        </th>
                                    );
                                })}
                                <th key="actions" style={{ minWidth: '80px', width: '80px', backgroundColor: HEADER_BG }} className="text-white font-semibold text-xs py-3.5 px-4 uppercase tracking-wider text-center border-r border-indigo-900/40 select-none rounded-tr-sm">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {paginatedData.length > 0 ? (
                                paginatedData.map((row, rowIndex) => {
                                    const isEven = rowIndex % 2 === 0;
                                    const rowClass = isEven ? 'bg-[#F5F7FA] hover:bg-slate-200/80 transition-colors' : 'bg-white hover:bg-slate-100 transition-colors';
                                    return (
                                        <tr key={row.id} className={rowClass}>
                                            {DISPLAY_FIELDS.map((column) => {
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
                                                const cellVal = row[column.key];
                                                const isNumeric = column.align === 'right';
                                                return (
                                                    <td key={column.key} style={{ width: `${column.minWidth}px` }} className={`px-4 py-3 text-xs border-r border-slate-200/60 truncate text-slate-700 font-medium ${isNumeric ? 'text-right font-mono text-slate-800' : 'text-left'}`} title={String(cellVal ?? '-')}>
                                                        {isNumeric ? (cellVal != null ? `R ${getNumericValue(cellVal)}` : '-') : (cellVal || '-')}
                                                    </td>
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
                                })
                            ) : (
                                <tr><td colSpan={DISPLAY_FIELDS.length + 1} className="py-16 text-center text-slate-400 bg-white"><div className="flex flex-col items-center justify-center"><div className="text-slate-300 text-5xl mb-3">📭</div><p className="text-base font-semibold text-slate-500">No client records found</p></div></td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 text-xs sm:text-sm text-[#2D328F] select-none">
                    <div className="text-center md:text-left">Showing <strong className="text-[#2D328F]">{Math.min(filteredData.length, page * rowsPerPage + 1)}</strong> to <strong className="text-[#2D328F]">{Math.min(filteredData.length, (page + 1) * rowsPerPage)}</strong> of <strong className="text-[#2D328F]">{filteredData.length}</strong> clients</div>
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


            {deleteConfirm && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
                        <div className="p-6 text-center"><div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600"><AlertCircle size={32} /></div><h3 className="text-xl font-bold text-slate-800 mb-2">Delete Client?</h3><p className="text-slate-500">This action cannot be undone.</p></div>
                        <div className="flex gap-3 p-6 pt-0"><button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-lg transition-colors">Cancel</button><button onClick={() => handleDelete(deleteConfirm)} disabled={submitting} className="flex-1 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50">{submitting ? 'Deleting...' : 'Delete'}</button></div>
                    </div>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
                        <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-slate-800">{editingClient ? 'Edit Client' : 'Add New Client'}</h3>
                            <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="p-1 text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Client ID</label><input type="text" required className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.client_id || ''} onChange={e => setFormData({ ...formData, client_id: e.target.value })} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Client Name</label><input type="text" required className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.client_name || ''} onChange={e => setFormData({ ...formData, client_name: e.target.value })} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Site</label><input type="text" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.site || ''} onChange={e => setFormData({ ...formData, site: e.target.value })} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Region</label><input type="text" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.region || ''} onChange={e => setFormData({ ...formData, region: e.target.value })} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Pay Cycle</label><input type="text" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.pay_cycle || ''} onChange={e => setFormData({ ...formData, pay_cycle: e.target.value })} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Sector</label><input type="text" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.sector || ''} onChange={e => setFormData({ ...formData, sector: e.target.value })} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Contact Person</label><input type="text" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.contact_person || ''} onChange={e => setFormData({ ...formData, contact_person: e.target.value })} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Contact Details</label><input type="text" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.contact_details || ''} onChange={e => setFormData({ ...formData, contact_details: e.target.value })} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Sales Rep</label><input type="text" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.sales_rep || ''} onChange={e => setFormData({ ...formData, sales_rep: e.target.value })} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Lookup</label><input type="text" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.lookup || ''} onChange={e => setFormData({ ...formData, lookup: e.target.value })} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Transaction Code</label><input type="text" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.transaction_code || ''} onChange={e => setFormData({ ...formData, transaction_code: e.target.value })} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Occupation</label><input type="text" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.occupation || ''} onChange={e => setFormData({ ...formData, occupation: e.target.value })} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">NT Hourly Rate</label><input type="number" step="0.01" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.nt_hourly_rate || ''} onChange={e => setFormData({ ...formData, nt_hourly_rate: e.target.value })} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">OT 1.5 Rate</label><input type="number" step="0.01" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.ot_1_5_rate || ''} onChange={e => setFormData({ ...formData, ot_1_5_rate: e.target.value })} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">OT 2.0 Rate</label><input type="number" step="0.01" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.ot_2_0_rate || ''} onChange={e => setFormData({ ...formData, ot_2_0_rate: e.target.value })} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Hours Per Day</label><input type="number" step="0.01" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.hrs_pd || ''} onChange={e => setFormData({ ...formData, hrs_pd: e.target.value })} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Deduct Lunch Hour</label><input type="number" step="0.01" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.deduct_lunch_hour || ''} onChange={e => setFormData({ ...formData, deduct_lunch_hour: e.target.value })} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Sub Total A</label><input type="number" step="0.01" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.sub_total_a || ''} onChange={e => setFormData({ ...formData, sub_total_a: e.target.value })} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Sub Total B</label><input type="number" step="0.01" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.sub_total_b || ''} onChange={e => setFormData({ ...formData, sub_total_b: e.target.value })} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">NT Invoice Rate</label><input type="number" step="0.01" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.nt_invoice_rate || ''} onChange={e => setFormData({ ...formData, nt_invoice_rate: e.target.value })} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">OT 1.5 Invoice Rate</label><input type="number" step="0.01" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.ot_1_5_invoice_rate || ''} onChange={e => setFormData({ ...formData, ot_1_5_invoice_rate: e.target.value })} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">OT 2.0 Invoice Rate</label><input type="number" step="0.01" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.ot_2_0_invoice_rate || ''} onChange={e => setFormData({ ...formData, ot_2_0_invoice_rate: e.target.value })} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Annual Leave</label><input type="number" step="0.01" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.annual_leave || ''} onChange={e => setFormData({ ...formData, annual_leave: e.target.value })} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Sick Leave</label><input type="number" step="0.01" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.sick_leave || ''} onChange={e => setFormData({ ...formData, sick_leave: e.target.value })} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Family Resp Leave</label><input type="number" step="0.01" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.family_resp_leave || ''} onChange={e => setFormData({ ...formData, family_resp_leave: e.target.value })} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Paid Public Holidays</label><input type="number" step="0.01" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.paid_public_holidays || ''} onChange={e => setFormData({ ...formData, paid_public_holidays: e.target.value })} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Severance Provision</label><input type="number" step="0.01" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.severance_provision || ''} onChange={e => setFormData({ ...formData, severance_provision: e.target.value })} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Annual Bonus</label><input type="number" step="0.01" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.annual_bonus || ''} onChange={e => setFormData({ ...formData, annual_bonus: e.target.value })} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Provident Fund</label><input type="number" step="0.01" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.provident_fund || ''} onChange={e => setFormData({ ...formData, provident_fund: e.target.value })} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Wellness Fund</label><input type="number" step="0.01" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.wellness_fund || ''} onChange={e => setFormData({ ...formData, wellness_fund: e.target.value })} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Industry Reg Levy</label><input type="number" step="0.01" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.industry_reg_levy || ''} onChange={e => setFormData({ ...formData, industry_reg_levy: e.target.value })} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Night Shift Allowance</label><input type="number" step="0.01" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.night_shift_allowance || ''} onChange={e => setFormData({ ...formData, night_shift_allowance: e.target.value })} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Substance Allowance</label><input type="number" step="0.01" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.substance_allowance || ''} onChange={e => setFormData({ ...formData, substance_allowance: e.target.value })} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Hazardous Allowance</label><input type="number" step="0.01" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.hazardous_allowance || ''} onChange={e => setFormData({ ...formData, hazardous_allowance: e.target.value })} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">NT Per Day</label><input type="number" step="0.01" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.nt_per_day || ''} onChange={e => setFormData({ ...formData, nt_per_day: e.target.value })} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">UIF</label><input type="number" step="0.01" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.uif || ''} onChange={e => setFormData({ ...formData, uif: e.target.value })} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">SDL</label><input type="number" step="0.01" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.sdl || ''} onChange={e => setFormData({ ...formData, sdl: e.target.value })} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">COIDA</label><input type="number" step="0.01" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.coida || ''} onChange={e => setFormData({ ...formData, coida: e.target.value })} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Medicals</label><input type="number" step="0.01" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.medicals || ''} onChange={e => setFormData({ ...formData, medicals: e.target.value })} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Criminal Checks</label><input type="number" step="0.01" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.criminal_checks || ''} onChange={e => setFormData({ ...formData, criminal_checks: e.target.value })} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">PPE</label><input type="number" step="0.01" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.ppe || ''} onChange={e => setFormData({ ...formData, ppe: e.target.value })} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Preservation Fund</label><input type="number" step="0.01" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.preservation_fund || ''} onChange={e => setFormData({ ...formData, preservation_fund: e.target.value })} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Service Fee</label><input type="number" step="0.01" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.service_fee || ''} onChange={e => setFormData({ ...formData, service_fee: e.target.value })} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Admin Costs</label><input type="number" step="0.01" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.admin_costs || ''} onChange={e => setFormData({ ...formData, admin_costs: e.target.value })} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Supervision Fee</label><input type="number" step="0.01" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.supervision_fee || ''} onChange={e => setFormData({ ...formData, supervision_fee: e.target.value })} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Payroll Financing Fee</label><input type="number" step="0.01" className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.payroll_financing_fee || ''} onChange={e => setFormData({ ...formData, payroll_financing_fee: e.target.value })} /></div>
                            </div>
                            <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
                                <button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }} className="flex-1 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                                <button type="submit" disabled={submitting} className="flex-1 py-2 bg-[#1742c4] text-white font-semibold rounded-lg hover:bg-blue-800 transition-colors shadow-md disabled:opacity-50">{submitting ? 'Saving...' : (editingClient ? 'Save Changes' : 'Create Client')}</button>
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
                itemName="clients"
            />
        </div>
    );
}