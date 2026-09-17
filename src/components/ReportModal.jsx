import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';

const REPORT_COLUMNS = [
    { key: 'timesheetNo', label: 'Timesheet No' },
    { key: 'date', label: 'Date' },
    { key: 'capturedAt', label: 'Captured At' },
    { key: 'clientId', label: 'Client ID' },
    { key: 'clientName', label: 'Client Name' },
    { key: 'empNo', label: 'Employee Number' },
    { key: 'employeeName', label: 'Employee Name' },
    { key: 'txCode', label: 'Transaction Code' },
    { key: 'occupation', label: 'Occupation' },
    { key: 'shiftType', label: 'Shift Type' },
    { key: 'ntHrs', label: 'Normal Hours' },
    { key: 'otHrs', label: 'Overtime Hours' },
    { key: 'dtHrs', label: 'Double Time Hours' },
    { key: 'ntRate', label: 'NT Rate (R)' },
    { key: 'otRate', label: 'OT Rate (R)' },
    { key: 'dtRate', label: 'DT Rate (R)' },
    { key: 'ntPay', label: 'Normal Pay (R)' },
    { key: 'otPay', label: 'Overtime Pay (R)' },
    { key: 'dtPay', label: 'Double Time Pay (R)' },
    { key: 'ntInvoiceRate', label: 'NT Invoice Rate (R)' },
    { key: 'otInvoiceRate', label: 'OT Invoice Rate (R)' },
    { key: 'dtInvoiceRate', label: 'DT Invoice Rate (R)' },
    { key: 'ntInvoicePay', label: 'NT Invoice Pay (R)' },
    { key: 'otInvoicePay', label: 'OT Invoice Pay (R)' },
    { key: 'dtInvoicePay', label: 'DT Invoice Pay (R)' },
];

const DAY_NAMES = ['Mon', 'Tues', 'Wed', 'Thur', 'Fri', 'Sat', 'Sun'];

function getDayIndex(dateStr) {
    if (!dateStr) return -1;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return -1;
    const day = d.getDay();
    return day === 0 ? 6 : day - 1;
}

export default function ReportModal({ isOpen, onClose, timesheets = [] }) {
    const [selectedColumns, setSelectedColumns] = useState([]);
    const [isHeadcountMode, setIsHeadcountMode] = useState(false);
    const [generating, setGenerating] = useState(false);

    const allSelected = selectedColumns.length === REPORT_COLUMNS.length;

    const toggleColumn = (key) => {
        setSelectedColumns((prev) =>
            prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
        );
    };

    const toggleAll = () => {
        setSelectedColumns(allSelected ? [] : REPORT_COLUMNS.map((col) => col.key));
    };

    const pivotData = useMemo(() => {
        if (!isHeadcountMode || !timesheets.length) return [];

        const groups = {};
        const keys = [];

        timesheets.forEach((row) => {
            if (!row.clientName) return;
            const occupationKey = (row.occupation || '').toString().trim();
            const key = `${row.clientName.toString().trim()}|${occupationKey}`;
            keys.push(key);
            if (!groups[key]) {
                groups[key] = {
                    clientId: row.clientId || '',
                    clientName: row.clientName || '',
                    occupation: occupationKey,
                    region: row.region || '',
                    site: row.site || '',
                    daySets: DAY_NAMES.map(() => new Set()),
                };
            }
            const group = groups[key];
            const dayIdx = getDayIndex(row.date);
            if (dayIdx >= 0 && dayIdx < 7) {
                group.daySets[dayIdx].add(row.empNo);
            }
        });

        console.log('Headcount pivot keys:', keys);
        console.log('Headcount pivot groups:', Object.keys(groups).length, 'unique groups from', timesheets.length, 'rows');

        return Object.values(groups)
            .map((group) => {
                const dayCounts = group.daySets.map((set) => (set ? set.size : 0));
                const total = dayCounts.reduce((a, b) => a + b, 0);
                return {
                    region: group.region,
                    clientName: group.clientName,
                    site: group.site,
                    occupation: group.occupation,
                    dayCounts,
                    total,
                };
            })
            .sort((a, b) => {
                if (a.clientName !== b.clientName) return a.clientName.localeCompare(b.clientName);
                return a.occupation.localeCompare(b.occupation);
            });
    }, [isHeadcountMode, timesheets]);

    const dateRange = useMemo(() => {
        const dates = timesheets
            .map((r) => {
                if (!r.date) return null;
                const d = new Date(r.date);
                return isNaN(d.getTime()) ? null : d;
            })
            .filter(Boolean);

        if (!dates.length) return null;
        const min = new Date(Math.min(...dates.map((d) => d.getTime())));
        const max = new Date(Math.max(...dates.map((d) => d.getTime())));
        const fmt = (d) => d.toISOString().split('T')[0];
        return `${fmt(min)} - ${fmt(max)}`;
    }, [timesheets]);

    const handleGenerate = () => {
        if (isHeadcountMode) {
            if (pivotData.length === 0) return;
            setGenerating(true);
            try {
                const headers = ['Region', 'Client Name', 'Site', 'Job Description', ...DAY_NAMES, 'Total'];
                const rows = pivotData.map((row) => [
                    row.region,
                    row.clientName,
                    row.site,
                    row.occupation,
                    ...row.dayCounts,
                    row.total,
                ]);

                const ws = XLSX.utils.aoa_to_sheet([
                    ['HeadCount'],
                    [`Date: Week: ${dateRange || '-'}`],
                    [],
                    headers,
                    ...rows,
                ]);

                ws['!cols'] = headers.map(() => ({ wch: 18 }));

                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'HeadCount');

                const today = new Date().toISOString().split('T')[0];
                XLSX.writeFile(wb, `headcount_report_${today}.xlsx`);
                onClose?.();
            } catch (err) {
                console.error('Failed to generate headcount report:', err);
            } finally {
                setGenerating(false);
            }
            return;
        }

        if (selectedColumns.length === 0 || timesheets.length === 0) return;

        const columns = REPORT_COLUMNS.filter((col) =>
            selectedColumns.includes(col.key)
        );

        const headers = columns.map((col) => col.label);
        const rows = timesheets.map((row) =>
            columns.map((col) => {
                const value = row[col.key];
                if (['ntPay', 'otPay', 'dtPay', 'ntInvoicePay', 'otInvoicePay', 'dtInvoicePay'].includes(col.key)) {
                    return value != null ? Number(value).toFixed(2) : 0;
                }
                if (typeof value === 'number') {
                    return Number.isInteger(value) ? value : value.toFixed(2);
                }
                return value ?? '';
            })
        );

        const clientName = [...new Set(timesheets.map(r => r.clientName).filter(Boolean))].join(', ') || '-';
        const clientId = [...new Set(timesheets.map(r => r.clientId).filter(Boolean))].join(', ') || '-';

        const parseDate = (val) => {
            if (!val) return null;
            const d = new Date(val);
            return isNaN(d.getTime()) ? null : d;
        };

        const dates = timesheets.map(r => parseDate(r.date)).filter(Boolean);
        const minDate = dates.length ? new Date(Math.min(...dates.map(d => d.getTime()))) : null;
        const maxDate = dates.length ? new Date(Math.max(...dates.map(d => d.getTime()))) : null;

        const getWeekStart = (date) => {
            const d = new Date(date);
            const day = d.getDay();
            const diff = day === 0 ? 6 : day - 1;
            d.setDate(d.getDate() - diff);
            return d.toISOString().split('T')[0];
        };

        const getWeekEnd = (date) => {
            const d = new Date(date);
            const day = d.getDay();
            const diff = day === 0 ? 0 : 7 - day;
            d.setDate(d.getDate() + diff);
            return d.toISOString().split('T')[0];
        };

        const weekStart = minDate ? getWeekStart(minDate) : '-';
        const weekEnd = maxDate ? getWeekEnd(maxDate) : '-';

        const ws = XLSX.utils.aoa_to_sheet([
            [`Client: ${clientName} (${clientId})`],
            [`Week: ${weekStart} - ${weekEnd}`],
            [],
            headers,
            ...rows,
        ]);

        const totalsRow = new Array(columns.length).fill('');
        columns.forEach((col, index) => {
            if (['ntPay', 'otPay', 'dtPay', 'ntInvoicePay', 'otInvoicePay', 'dtInvoicePay'].includes(col.key)) {
                const sum = rows.reduce((acc, row) => acc + (parseFloat(row[index]) || 0), 0);
                totalsRow[index] = Number.isInteger(sum) ? sum : sum.toFixed(2);
            }
        });

        XLSX.utils.sheet_add_aoa(ws, [['TOTALS', ...totalsRow.slice(1)]], { origin: -1 });
        ws['!cols'] = headers.map(() => ({ wch: 18 }));

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Report');

        const date = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `timesheet_report_${date}.xlsx`);

        onClose?.();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-800/75">
            <div className="relative w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] bg-white rounded-xl shadow-2xl p-4 sm:p-6 md:p-8 border-t-8 border-[#1742c4] flex flex-col overflow-hidden">
                <div className="flex-shrink-0 flex justify-between items-center pb-4 border-b border-gray-100 mb-6">
                    <h2 className="text-2xl font-bold text-[#1742c4] flex items-center gap-2">
                        Employee Costing Report
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-[#F5B52A] hover:text-red-500 transition-colors p-1 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        ✕
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <div className="mb-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isHeadcountMode}
                                onChange={(e) => setIsHeadcountMode(e.target.checked)}
                                className="h-4 w-4 accent-indigo-600"
                            />
                            <span className="text-sm font-medium text-slate-700">Headcount Report</span>
                        </label>
                    </div>

                    <div className={`mb-6 ${isHeadcountMode ? 'opacity-40 pointer-events-none' : ''}`}>
                        <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold text-blue-600 uppercase">Report Columns</h3>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={allSelected}
                                        onChange={toggleAll}
                                        disabled={isHeadcountMode}
                                        className="h-4 w-4 accent-indigo-600"
                                    />
                                    <span className="text-sm font-semibold text-slate-700">Select All</span>
                                </label>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {REPORT_COLUMNS.map((column) => (
                                    <label
                                        key={column.key}
                                        className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 cursor-pointer hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedColumns.includes(column.key)}
                                            onChange={() => toggleColumn(column.key)}
                                            disabled={isHeadcountMode}
                                            className="h-4 w-4 accent-indigo-600"
                                        />
                                        <span className="text-sm font-medium text-slate-700">
                                            {column.label}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-gray-100 p-6">
                    <button
                        onClick={onClose}
                        className="rounded-lg border px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={generating || (isHeadcountMode ? pivotData.length === 0 : (selectedColumns.length === 0 || timesheets.length === 0))}
                        className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {generating ? 'Generating...' : 'Generate Excel'}
                    </button>
                </div>
            </div>
        </div>
    );
}
