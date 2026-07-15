import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { onDataChange } from '../../utils/dataSync';
import { Pencil, Trash2, CheckSquare, Square } from 'lucide-react';
import BulkDeleteModal from '../common/BulkDeleteModal';
import { calculateSemiWeeklySummary } from '../businesslogic/businesslogic';

const ArrowBackIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
    </svg>
);

const ArrowForwardIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
    </svg>
);

const FirstPageIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7M20 19l-7-7 7-7" />
    </svg>
);

const LastPageIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M4 5l7 7-7 7" />
    </svg>
);

const HEADER_BG = '#2D328F';

const calculateHours = (timeIn, timeOut) => {
    const start = new Date(`1970-01-01T${timeIn}`);
    const end = new Date(`1970-01-01T${timeOut}`);
    let diff = (end - start) / (1000 * 60 * 60);
    if (diff <= 0) diff += 24;
    return diff;
};

const calculateRow = (timesheet, clientRates, employees) => {
    const isBiometric = timesheet.shift_type !== 'Task' && timesheet.total_hours != null;
    let rate = null;

    if (timesheet.shift_type !== 'Task') {
        const tsClientId = timesheet.client_id?.toString().trim().toUpperCase();
        const tsOccupationRaw = timesheet.occupation?.toString().trim() || "";
        const tsOccupation = tsOccupationRaw.endsWith("2.0") ? tsOccupationRaw.slice(0, -3) : tsOccupationRaw;

        rate = clientRates.find(
            (r) =>
                r.client_id?.toString().trim().toUpperCase() === tsClientId &&
                r.occupation?.toString().trim() === tsOccupation
        );

        if (!rate) {
            const clientRatesList = clientRates.filter(r => r.client_id?.toString().trim().toUpperCase() === tsClientId);
            rate = clientRatesList.find(
                (r) =>
                    r.lookup?.toString().trim() === tsOccupation
            );
        }

        if (!rate) {
            rate = clientRates.find(
                (r) =>
                    r.client_id?.toString().trim().toUpperCase() === tsClientId
            );
        }
    }

    let totalHours = 0;
    let ntHrs = 0;
    let otHrs = 0;
    let dtHrs = 0;
    let ntPay = 0;
    let otPay = 0;
    let dtPay = 0;

     if (timesheet.shift_type === 'Task') {
        totalHours = parseFloat(timesheet.units) || 0;
        ntHrs = totalHours;
        ntPay = totalHours * (parseFloat(timesheet.rate) || 0);
    } else if (isBiometric) {
        const biometricHours = parseFloat(timesheet.total_hours) || 0;
        totalHours = biometricHours;
        const isAdHoc = timesheet.shift_type === 'Ad-Hoc';

        const lunchDeduction = (timesheet.actual_lunch_hours !== null && timesheet.actual_lunch_hours !== undefined && timesheet.actual_lunch_hours !== '') ? parseFloat(timesheet.actual_lunch_hours) : (parseFloat(rate?.deduct_lunch_hour) || 0);
        const netHours = biometricHours - lunchDeduction;

        if (timesheet.transaction_code === '1921' || timesheet.transaction_code === '1922') {
            dtHrs = netHours;
            dtPay = dtHrs * (parseFloat(rate?.ot_2_0_rate) || 0);
        } else if (timesheet.transaction_code === '1920') {
            otHrs = netHours;
            otPay = otHrs * (parseFloat(rate?.ot_1_5_rate) || 0);
        } else {
            if (isAdHoc) {
                ntHrs = netHours;
                ntPay = ntHrs * (parseFloat(rate?.sub_total_a) || 0);
            } else {
                const isSemi = timesheet.shift_type === 'Semi';
                if (isSemi) {
                    ntHrs = netHours;
                    ntPay = ntHrs * (parseFloat(rate?.nt_hourly_rate) || 0);
                } else {
                    ntHrs = biometricHours;
                    ntPay = biometricHours * (parseFloat(rate?.nt_hourly_rate) || 0);
                }
            }
        }
    } else {
        totalHours = calculateHours(timesheet.start_time, timesheet.end_time);
        const isAdHoc = timesheet.shift_type === 'Ad-Hoc';

        if (timesheet.isDoubleShift) {
            const lunchDeduction = timesheet.actual_lunch_hours !== null && timesheet.actual_lunch_hours !== undefined && timesheet.actual_lunch_hours !== '' ? parseFloat(timesheet.actual_lunch_hours) : (parseFloat(rate?.deduct_lunch_hour) || 0);
            const netHours = totalHours - lunchDeduction;
            ntHrs = netHours;
            const ntRate = isAdHoc ? (parseFloat(rate?.sub_total_a) || 0) : (parseFloat(rate?.nt_hourly_rate) || 0);
            ntPay = netHours * ntRate;
        } else {
            if (timesheet.transaction_code === '1921' || timesheet.transaction_code === '1922') {
                const lunchDeduction = timesheet.actual_lunch_hours !== null && timesheet.actual_lunch_hours !== undefined && timesheet.actual_lunch_hours !== '' ? parseFloat(timesheet.actual_lunch_hours) : (parseFloat(rate?.deduct_lunch_hour) || 0);
                const netHours = totalHours - lunchDeduction;
                dtHrs = netHours;
                dtPay = dtHrs * (parseFloat(rate?.ot_2_0_rate) || 0);
            } else if (timesheet.transaction_code === '1920') {
                const lunchDeduction = timesheet.actual_lunch_hours !== null && timesheet.actual_lunch_hours !== undefined && timesheet.actual_lunch_hours !== '' ? parseFloat(timesheet.actual_lunch_hours) : (parseFloat(rate?.deduct_lunch_hour) || 0);
                const netHours = totalHours - lunchDeduction;
                otHrs = netHours;
                otPay = otHrs * (parseFloat(rate?.ot_1_5_rate) || 0);
            } else {
                const lunchDeduction = timesheet.actual_lunch_hours !== null && timesheet.actual_lunch_hours !== undefined && timesheet.actual_lunch_hours !== '' ? parseFloat(timesheet.actual_lunch_hours) : (parseFloat(rate?.deduct_lunch_hour) || 0);
                const netHours = totalHours - lunchDeduction;
                if (isAdHoc) {
                    ntHrs = netHours;
                    ntPay = ntHrs * (parseFloat(rate?.sub_total_a) || 0);
                } else {
                    ntHrs = Math.min(netHours, parseFloat(rate?.hrs_pd) || 8);
                    otHrs = Math.max(0, netHours - (parseFloat(rate?.hrs_pd) || 8));
                    ntPay = ntHrs * (parseFloat(rate?.nt_hourly_rate) || 0);
                    otPay = otHrs * (parseFloat(rate?.ot_1_5_rate) || 0);
                }
            }
        }
    }
    const employee = employees.find(emp => emp.co_number?.toString().trim() === timesheet.co_number?.toString().trim());
    const employeeName = employee ? employee.full_name : 'Unknown';

    return {
        id: timesheet.id,
        timesheetNo: timesheet.timesheet_number || '',
        date: timesheet.timesheet_date || '',
        clientId: timesheet.client_id || '',
        clientName: timesheet.client_name || '',
        empNo: timesheet.co_number || '',
        employeeName,
        txCode: timesheet.transaction_code || '',
        shiftType: timesheet.shift_type || '',
        occupation: timesheet.occupation || '',
        start: timesheet.start_time || '',
        end: timesheet.end_time || '',
        totalHrs: parseFloat(totalHours.toFixed(2)),
        ntHrs: parseFloat(ntHrs.toFixed(2)),
        otHrs: parseFloat(otHrs.toFixed(2)),
        dtHrs: parseFloat(dtHrs.toFixed(2)),
        ntPay: parseFloat(ntPay.toFixed(2)),
        otPay: parseFloat(otPay.toFixed(2)),
        dtPay: parseFloat(dtPay.toFixed(2)),
        
    };
};

const COLUMNS = [
    { id: '__checkbox__', label: '', minWidth: 40, isCheckbox: true },
    { id: 'timesheetNo', label: 'TIMESHEET NO', minWidth: 140 },
    { id: 'date', label: 'DATE', minWidth: 120 },
    { id: 'clientId', label: 'CLIENT ID', minWidth: 120 },
    { id: 'clientName', label: 'CLIENT NAME', minWidth: 200 },
    { id: 'empNo', label: 'EMP NO', minWidth: 110 },
    { id: 'employeeName', label: 'EMPLOYEE NAME', minWidth: 220 },
    { id: 'occupation', label: 'OCCUPATION', minWidth: 150 },
    { id: 'txCode', label: 'TX CODE', minWidth: 110 },
    { id: 'shiftType', label: 'SHIFT TYPE', minWidth: 130 },
    { id: 'start', label: 'START', minWidth: 100 },
    { id: 'end', label: 'END', minWidth: 100 },
    { id: 'totalHrs', label: 'TOTAL HRS', minWidth: 110, align: 'right' },
    { id: 'ntHrs', label: 'NT HRS', minWidth: 100, align: 'right' },
    { id: 'otHrs', label: 'OT HRS', minWidth: 100, align: 'right' },
    { id: 'dtHrs', label: 'DT HRS', minWidth: 100, align: 'right' },
    { id: 'ntPay', label: 'NT PAY(R)', minWidth: 120, align: 'right' },
    { id: 'otPay', label: 'OT PAY(R)', minWidth: 120, align: 'right' },
    { id: 'dtPay', label: 'DT PAY(R)', minWidth: 120, align: 'right' },
    
    { id: 'actions', label: 'ACTIONS', minWidth: 90, align: 'center' },
];

export default function TimesheetList({ refreshKey, onEdit, onDelete, onBulkDelete }) {
    const { user: _user } = useAuth();
    const [rawTimesheets, setRawTimesheets] = useState([]);
    const [clientRates, setClientRates] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [publicHolidays, setPublicHolidays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [selectedIds, setSelectedIds] = useState([]);
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
    const [bulkDeleting, setBulkDeleting] = useState(false);
    const [selectedTsNo, setSelectedTsNo] = useState("");
    const [selectedEmpNo, setSelectedEmpNo] = useState("");

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const [tsRes, crRes, empRes] = await Promise.all([
                api.get('/timesheets'),
                api.get('/clientrates'),
                api.get('/employees'),
            ]);
            let holidays = [];
            try {
                const phRes = await api.get('/publicholidays');
                holidays = phRes.data || [];
            } catch {
                holidays = [];
            }
            setRawTimesheets(tsRes.data);
            setClientRates(crRes.data);
            setEmployees(empRes.data);
            setPublicHolidays(holidays);
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to fetch timesheets');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 86400000);
        const unsubscribe = onDataChange(() => {
            fetchData();
        });
        return () => {
            clearInterval(interval);
            unsubscribe();
        };
    }, [fetchData, refreshKey]);

    const processedData = useMemo(() => {
        const active = rawTimesheets.filter(ts => ts.status !== 'archived');
        return active.map(ts => calculateRow(ts, clientRates, employees));
    }, [rawTimesheets, clientRates, employees]);

    const tsNumberOptions = useMemo(() => {
        const unique = [...new Set(processedData.map((r) => (r.timesheetNo || '').toString()).filter(Boolean))];
        return unique.sort((a, b) => {
            const aNum = parseFloat(a);
            const bNum = parseFloat(b);
            if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
            return a.localeCompare(b);
        });
    }, [processedData]);

    const empNoOptions = useMemo(() => {
        const unique = [...new Set(processedData.map((r) => (r.empNo || '').toString()).filter(Boolean))];
        return unique.sort((a, b) => {
            const aNum = parseFloat(a);
            const bNum = parseFloat(b);
            if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
            return a.localeCompare(b);
        });
    }, [processedData]);

    const displayData = useMemo(() => {
        const byTsNo = selectedTsNo
            ? processedData.filter((r) => (r.timesheetNo || '').toString() === selectedTsNo)
            : processedData;
        const byEmpNo = selectedEmpNo
            ? byTsNo.filter((r) => (r.empNo || '').toString() === selectedEmpNo)
            : byTsNo;
        return byEmpNo;
    }, [processedData, selectedTsNo, selectedEmpNo]);

    const paginatedData = useMemo(() => {
        const startIdx = page * rowsPerPage;
        return displayData.slice(startIdx, startIdx + rowsPerPage);
    }, [displayData, page, rowsPerPage]);

    const totalPages = Math.ceil(displayData.length / rowsPerPage) || 1;

    const totals = useMemo(() => {
        const nonSemi = displayData.filter((r) => r.shiftType !== 'Semi');
        const nonSemiTotals = nonSemi.reduce(
            (acc, row) => ({
                totalHrs: acc.totalHrs + (row.totalHrs || 0),
                ntHrs: acc.ntHrs + (row.ntHrs || 0),
                otHrs: acc.otHrs + (row.otHrs || 0),
                dtHrs: acc.dtHrs + (row.dtHrs || 0),
                ntPay: acc.ntPay + (row.ntPay || 0),
                otPay: acc.otPay + (row.otPay || 0),
                dtPay: acc.dtPay + (row.dtPay || 0),
            }),
            { totalHrs: 0, ntHrs: 0, otHrs: 0, dtHrs: 0, ntPay: 0, otPay: 0, dtPay: 0 }
        );

        let semiTotals = { totalHrs: 0, ntHrs: 0, otHrs: 0, dtHrs: 0, ntPay: 0, otPay: 0, dtPay: 0 };

        const filteredRaw = rawTimesheets.filter((ts) => {
            if (ts.status === 'archived') return false;
            if (ts.shift_type !== 'Semi') return false;
            if (selectedEmpNo && (ts.co_number || '').toString() !== selectedEmpNo) return false;
            if (selectedTsNo && (ts.timesheet_number || '').toString() !== selectedTsNo) return false;
            return true;
        });

        if (filteredRaw.length > 0) {
            const summaries = calculateSemiWeeklySummary(filteredRaw, clientRates, employees, publicHolidays);
            summaries.forEach((s) => {
                semiTotals.totalHrs += s.totalHours;
                semiTotals.ntHrs += s.normalTime;
                semiTotals.otHrs += s.overTime;
                semiTotals.ntPay += s.normalTimePay;
                semiTotals.otPay += s.overTimePay;
            });
        }

        return {
            totalHrs: nonSemiTotals.totalHrs + semiTotals.totalHrs,
            ntHrs: nonSemiTotals.ntHrs + semiTotals.ntHrs,
            otHrs: nonSemiTotals.otHrs + semiTotals.otHrs,
            dtHrs: nonSemiTotals.dtHrs + semiTotals.dtHrs,
            ntPay: nonSemiTotals.ntPay + semiTotals.ntPay,
            otPay: nonSemiTotals.otPay + semiTotals.otPay,
            dtPay: nonSemiTotals.dtPay + semiTotals.dtPay,
        };
    }, [displayData, rawTimesheets, clientRates, employees, publicHolidays, selectedEmpNo, selectedTsNo]);

    const handlePageChange = (newPage) => {
        if (newPage >= 0 && newPage < totalPages) {
            setPage(newPage);
        }
    };

    const handleRowsPerPageChange = (e) => {
        setRowsPerPage(parseInt(e.target.value, 10));
        setPage(0);
    };

    const handleSelectAll = () => {
        if (selectedIds.length === displayData.length && displayData.length > 0) {
            setSelectedIds([]);
        } else {
            setSelectedIds(displayData.map((row) => row.id));
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
        if (!onBulkDelete || selectedIds.length === 0) return;
        setBulkDeleting(true);
        try {
            await onBulkDelete(selectedIds);
            setSelectedIds([]);
        } finally {
            setBulkDeleting(false);
            setBulkDeleteOpen(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-8">
                <p className="text-red-500">Error: {error}</p>
                <button onClick={fetchData} className="mt-4 px-4 py-2 bg-[#1742c4] text-white rounded-lg">Retry</button>
            </div>
        );
    }

    return (

        <div className="w-full flex flex-col bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-xl sm:text-1xl font-bold text-slate-800 flex items-center">
                        Capture Timesheet
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                        {displayData.length} active timesheet entries
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-500 font-medium">Filter by Timesheet No:</label>
                        <select
                            value={selectedTsNo}
                            onChange={(e) => {
                                setSelectedTsNo(e.target.value);
                                setPage(0);
                            }}
                            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1742c4] bg-white"
                        >
                            <option value="">All</option>
                            {tsNumberOptions.map((num) => (
                                <option key={num} value={num}>
                                    {num}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-500 font-medium">Filter by Employee No:</label>
                        <select
                            value={selectedEmpNo}
                            onChange={(e) => {
                                setSelectedEmpNo(e.target.value);
                                setPage(0);
                            }}
                            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1742c4] bg-white"
                        >
                            <option value="">All</option>
                            {empNoOptions.map((num) => (
                                <option key={num} value={num}>
                                    {num}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
            {selectedIds.length > 0 && (
                <div className="bg-red-50 border-b border-red-200 px-6 py-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-red-700">
                        {selectedIds.length} timesheet{selectedIds.length > 1 ? "s" : ""} selected
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
            <div className="flex-1 overflow-auto max-h-[58vh] relative bg-slate-50 border-b border-slate-200">
                <table className="w-full border-separate border-spacing-0 table-auto select-text">
                    <thead className="sticky top-0 z-20">
                        <tr>
                            <th
                                style={{ minWidth: `${COLUMNS[0].minWidth}px`, backgroundColor: HEADER_BG }}
                                className="text-white font-semibold text-xs py-3.5 px-2 uppercase tracking-wider text-center border-r border-indigo-900/40 select-none rounded-tl-sm"
                            >
                                <button
                                    onClick={handleSelectAll}
                                    className="hover:opacity-80 transition"
                                    title={selectedIds.length === displayData.length && displayData.length > 0 ? "Deselect All" : "Select All Timesheets"}
                                >
                                    {selectedIds.length === displayData.length && displayData.length > 0 ? (
                                        <CheckSquare className="w-4 h-4 text-white" />
                                    ) : (
                                        <Square className="w-4 h-4 text-white/70" />
                                    )}
                                </button>
                            </th>
                            {COLUMNS.filter(c => !c.isCheckbox).map((column) => {
                                const actualIndex = COLUMNS.indexOf(column);
                                return (
                                    <th
                                        key={column.id}
                                        style={{
                                            minWidth: `${column.minWidth}px`,
                                            width: `${column.minWidth}px`,
                                            backgroundColor: HEADER_BG
                                        }}
                                        className={`
                                            text-white font-semibold text-xs py-3.5 px-4 uppercase tracking-wider text-left border-r border-indigo-900/40 select-none
                                            ${column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left'}
                                            ${actualIndex === COLUMNS.length - 1 ? 'rounded-tr-sm' : ''}
                                        `}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span>{column.label}</span>
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {paginatedData.length > 0 ? (
                            paginatedData.map((row, rowIndex) => {
                                const isSmokeWhite = rowIndex % 2 === 0;
                                const rowClass = isSmokeWhite
                                    ? 'bg-[#F5F7FA] hover:bg-slate-200/80 transition-colors'
                                    : 'bg-white hover:bg-slate-100 transition-colors';

                                return (
                                    <tr key={row.id} className={rowClass}>
                                        <td
                                            style={{ minWidth: `${COLUMNS[0].minWidth}px` }}
                                            className="px-2 py-3 text-xs border-r border-slate-200/60 text-center"
                                        >
                                            <button
                                                onClick={() => handleSelectRow(row.id)}
                                                className={`transition ${selectedIds.includes(row.id) ? "text-[#1742c4]" : "text-slate-300 hover:text-slate-400"}`}
                                                title={selectedIds.includes(row.id) ? "Deselect" : "Select"}
                                            >
                                                {selectedIds.includes(row.id) ? (
                                                    <CheckSquare className="w-4 h-4" />
                                                ) : (
                                                    <Square className="w-4 h-4" />
                                                )}
                                            </button>
                                        </td>
                                        {COLUMNS.filter(c => !c.isCheckbox).map((column) => {
                                            const cellVal = row[column.id];
                                            const isNumeric = column.align === 'right';

                                            if (column.id === 'actions') {
                                                return (
                                                    <td
                                                        key={column.id}
                                                        style={{ width: `${column.minWidth}px` }}
                                                        className="px-4 py-3 text-xs border-r border-slate-200/60 text-center"
                                                    >
                                                        <div className="flex items-center justify-center gap-3">
                                                            <button
                                                                onClick={() => onEdit?.(row)}
                                                                className="text-blue-600 hover:text-blue-800 transition-colors"
                                                                title="Edit"
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => onDelete?.(row)}
                                                                className="text-red-500 hover:text-red-700 transition-colors"
                                                                title="Delete"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                );
                                            }

                                            return (
                                                <td
                                                    key={column.id}
                                                    style={{ width: `${column.minWidth}px` }}
                                                    className={`
                                                            px-4 py-3 text-xs border-r border-slate-200/60 truncate text-slate-700 font-medium
                                                            ${isNumeric ? 'text-right font-mono text-slate-800' : 'text-left'}
                                                        `}
                                                    title={String(cellVal)}
                                                >
                                                    {isNumeric ? (
                                                        column.id.endsWith('Pay') ? (
                                                            <span>
                                                                <span className="text-slate-400 mr-0.5 text-[10px]">R</span>
                                                                {cellVal.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </span>
                                                        ) : (
                                                            cellVal.toFixed(2)
                                                        )
                                                    ) : (
                                                        cellVal
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td
                                    colSpan={COLUMNS.length}
                                    className="py-16 text-center text-slate-400 bg-white"
                                >
                                    <div className="flex flex-col items-center justify-center">
                                        <div className="text-slate-300 text-5xl mb-3">📭</div>
                                        <p className="text-base font-semibold text-slate-500">No timesheet entries found</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                    <tfoot className="bg-indigo-100 border-t border-indigo-100">
                        <tr className="border-t border-indigo-100">
                            <td
                                colSpan={COLUMNS.findIndex(c => c.id === 'totalHrs')}
                                className="px-4 py-3 text-xs font-bold uppercase tracking-wider border-r border-indigo-100 text-indigo-900"
                            >
                                TOTALS
                            </td>
                            <td className="px-4 py-3 text-xs font-mono text-right border-r border-indigo-100 text-indigo-900">
                                {totals.totalHrs.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3 text-xs font-mono text-right border-r border-indigo-100 text-indigo-900">
                                {totals.ntHrs.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3 text-xs font-mono text-right border-r border-indigo-100 text-indigo-900">
                                {totals.otHrs.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3 text-xs font-mono text-right border-r border-indigo-100 text-indigo-900">
                                {totals.dtHrs.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3 text-xs font-mono text-right border-r border-indigo-100 text-indigo-900">
                                <span className="text-indigo-400 mr-0.5 text-[10px]">R</span>
                                {totals.ntPay.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3 text-xs font-mono text-right border-r border-indigo-100 text-indigo-900">
                                <span className="text-indigo-400 mr-0.5 text-[10px]">R</span>
                                {totals.otPay.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3 text-xs font-mono text-right border-r border-indigo-100 text-indigo-900">
                                <span className="text-indigo-400 mr-0.5 text-[10px]">R</span>
                                {totals.dtPay.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3 text-xs border-r border-indigo-100"></td>
                            <td className="px-4 py-3 text-xs"></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            {/* <div className="bg-[#2D328F] flex-shrink-0">
                    <div className="overflow-x-auto">
                        <table className="w-full border-separate border-spacing-0 table-fixed select-text">
                            <tfoot>
                                <tr>
                                    <td colSpan={COLUMNS.findIndex(c => c.id === 'totalHrs') + 1} className="px-4 py-3 text-xs font-bold text-white uppercase tracking-wider border-r border-indigo-900/40">
                                        TOTALS
                                    </td>
                                    <td className="px-4 py-3 text-xs font-mono text-right text-white border-r border-indigo-900/40">
                                        {totals.totalHrs.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-4 py-3 text-xs font-mono text-right text-white border-r border-indigo-900/40">
                                        {totals.ntHrs.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-4 py-3 text-xs font-mono text-right text-white border-r border-indigo-900/40">
                                        {totals.otHrs.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-4 py-3 text-xs font-mono text-right text-white border-r border-indigo-900/40">
                                        {totals.dtHrs.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-4 py-3 text-xs font-mono text-right text-white border-r border-indigo-900/40">
                                        <span className="text-indigo-300 mr-0.5 text-[10px]">R</span>
                                        {totals.ntPay.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-4 py-3 text-xs font-mono text-right text-white border-r border-indigo-900/40">
                                        <span className="text-indigo-300 mr-0.5 text-[10px]">R</span>
                                        {totals.otPay.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-4 py-3 text-xs font-mono text-right text-white border-r border-indigo-900/40">
                                        <span className="text-indigo-300 mr-0.5 text-[10px]">R</span>
                                        {totals.dtPay.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-white">
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div> */}
            <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 text-xs sm:text-sm text-[#2D328F] select-none">
                <div className="text-center md:text-left">
                    Showing <strong className="text-[#2D328F]">{Math.min(displayData.length, page * rowsPerPage + 1)}</strong> to{' '}
                    <strong className="text-[#2D328F]">
                        {Math.min(displayData.length, (page + 1) * rowsPerPage)}
                    </strong> of{' '}
                    <strong className="text-[#2D328F]">{displayData.length}</strong> timesheets
                </div>
                <div className="flex flex-wrap items-center justify-center gap-6">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-[#2D328F]">Rows per page:</span>
                        <div className="relative">
                            <select
                                value={rowsPerPage}
                                onChange={handleRowsPerPageChange}
                                className="bg-[#2D328F]-100 hover:bg-slate-200 text-[#2D328F] border border-[#2D328F] rounded-[10px] px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#2D328F] pr-7 appearance-none cursor-pointer font-medium"
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#2D328F]">
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-xs text-[#2D328F] mr-2">
                            Page <strong className="text-[#2D328F]">{page + 1}</strong> of <strong className="text-[#2D328F]">{totalPages}</strong>
                        </span>
                        <button
                            onClick={() => handlePageChange(0)}
                            disabled={page === 0}
                            className="p-1.5 rounded text-[#2D328F] hover:bg-[#F5B52A] disabled:opacity-30 disabled:hover:bg-[#F5B52A] transition-colors cursor-pointer"
                            title="First Page"
                        >
                            <FirstPageIcon />
                        </button>
                        <button
                            onClick={() => handlePageChange(page - 1)}
                            disabled={page === 0}
                            className="p-1.5 rounded text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                            title="Previous Page"
                        >
                            <ArrowBackIcon />
                        </button>
                        <div className="hidden sm:flex items-center gap-1">
                            {Array.from({ length: totalPages }).map((_, pIdx) => {
                                if (pIdx < page - 1 || pIdx > page + 1) return null;

                                return (
                                    <button
                                        key={pIdx}
                                        onClick={() => handlePageChange(pIdx)}
                                        className={`
                                                w-8 h-8 rounded-full text-xs font-semibold transition-all cursor-pointer
                                                ${page === pIdx
                                                ? 'bg-[#2D328F] text-white shadow'
                                                : 'text-slate-600 hover:bg-slate-100'
                                            }
                                            `}
                                    >
                                        {pIdx + 1}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => handlePageChange(page + 1)}
                            disabled={page === totalPages - 1}
                            className="p-1.5 rounded text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                            title="Next Page"
                        >
                            <ArrowForwardIcon />
                        </button>

                        <button
                            onClick={() => handlePageChange(totalPages - 1)}
                            disabled={page === totalPages - 1}
                            className="p-1.5 rounded text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                            title="Last Page"
                        >
                            <LastPageIcon />
                        </button>
                    </div>
                </div>
            </div>

            <BulkDeleteModal
                open={bulkDeleteOpen}
                onClose={() => setBulkDeleteOpen(false)}
                onConfirm={handleBulkDeleteConfirm}
                deleting={bulkDeleting}
                selectedCount={selectedIds.length}
                itemName="timesheets"
            />
        </div>
    );
}
