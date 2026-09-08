import React, { useState } from 'react';
import * as XLSX from 'xlsx';

const REPORT_COLUMNS = [
    { key: 'timesheetNo', label: 'Timesheet No' },
    { key: 'date', label: 'Date' },
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

export default function ReportModal({ isOpen, onClose, timesheets = [] }) {
    const [selectedColumns, setSelectedColumns] = useState(() =>
        REPORT_COLUMNS.map((col) => col.key)
    );

    const toggleColumn = (key) => {
        setSelectedColumns((prev) =>
            prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
        );
    };

    const handleGenerate = () => {
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b p-6">
                    <h2 className="text-2xl font-bold text-slate-800">
                        Employee Costing Report
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-2 hover:bg-slate-100"
                    >
                        ✕
                    </button>
                </div>

                <div className="max-h-[65vh] overflow-y-auto p-6">
                    <div className="mb-6">
                        <h3 className="mb-4 text-lg font-bold">Report Columns</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {REPORT_COLUMNS.map((column) => (
                                <label
                                    key={column.key}
                                    className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedColumns.includes(column.key)}
                                        onChange={() => toggleColumn(column.key)}
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

                <div className="flex justify-end gap-3 border-t p-6">
                    <button
                        onClick={onClose}
                        className="rounded-lg border px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={selectedColumns.length === 0 || timesheets.length === 0}
                        className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Generate Excel
                    </button>
                </div>
            </div>
        </div>
    );
}
