import React, { useState, useEffect } from "react";
import { FileDown, ArrowUpDown, CheckSquare, Square } from "lucide-react";
import Pagination from "@mui/material/Pagination";
import Stack from "@mui/material/Stack";

const EXPORTED_ROWS_STORAGE_PREFIX = "batchExport.exportedRows.";

const rowSignature = (row) => {
    if (!row) return "";
    return [
        row.co_number,
        row.transactionCode,
        row.jobCode,
        row.costCentre,
        row.qtyHrs,
        row.rate,
        row.amount,
        row.override,
        row.shiftType,
    ]
        .map((value) => String(value ?? ""))
        .join("|");
};

const signatureHash = (signature) => {
    let hash = 5381;
    for (let i = 0; i < signature.length; i++) {
        hash = (hash * 33) ^ signature.charCodeAt(i);
    }
    return (hash >>> 0).toString(36);
};

const getExportedRowsStorageKey = (clientId) =>
    `${EXPORTED_ROWS_STORAGE_PREFIX}${clientId ?? "default"}`;

const BatchExportTable = ({ data, rowsPerPage = 20, clientId = null }) => {
    const [page, setPage] = useState(1);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [selectedRows, setSelectedRows] = useState(new Set());
    const [exportedRows, setExportedRows] = useState(new Set());

    const safeData = data || [];

    useEffect(() => {
        let stored = null;
        try {
            const raw = localStorage.getItem(getExportedRowsStorageKey(clientId));
            stored = raw ? JSON.parse(raw) : null;
        } catch {
            stored = null;
        }

        const restored = new Set();
        if (stored && typeof stored === "object") {
            Object.entries(stored).forEach(([indexKey, hash]) => {
                const row = safeData[Number(indexKey)];
                if (row && signatureHash(rowSignature(row)) === hash) {
                    restored.add(row);
                }
            });
        }

        setExportedRows(restored);
        setSelectedRows(new Set());
    }, [safeData, clientId]);

    const handleChange = (event, value) => {
        setPage(value);
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
        setPage(1);
    };

    const sortedData = React.useMemo(() => {
        if (!sortConfig.key) return safeData;

        return [...safeData].sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];

            const aNum = parseFloat(aValue);
            const bNum = parseFloat(bValue);

            if (!isNaN(aNum) && !isNaN(bNum)) {
                return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
            }

            const aStr = String(aValue).toLowerCase();
            const bStr = String(bValue).toLowerCase();

            if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [safeData, sortConfig]);

    const startIndex = (page - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedData = sortedData.slice(startIndex, endIndex);
    const pageCount = Math.ceil(sortedData.length / rowsPerPage);

    const allCurrentPageSelected =
        paginatedData.length > 0 &&
        paginatedData.every((_, i) => selectedRows.has(startIndex + i));

    const handleSelectRow = (sortedIndex) => {
        setSelectedRows((prev) => {
            const next = new Set(prev);
            if (next.has(sortedIndex)) {
                next.delete(sortedIndex);
            } else {
                next.add(sortedIndex);
            }
            return next;
        });
    };

    const handleSelectAll = () => {
        const isAllSelected = paginatedData.every((_, i) => selectedRows.has(startIndex + i));
        setSelectedRows((prev) => {
            const next = new Set(prev);
            paginatedData.forEach((_, i) => {
                const idx = startIndex + i;
                if (isAllSelected) {
                    next.delete(idx);
                } else {
                    next.add(idx);
                }
            });
            return next;
        });
    };

    // const exportToCSV = () => {
    //     const rows = (safeData || []).map((row) => [
    //         String(row.co_number ?? ""),
    //         String(row.transactionCode ?? ""),
    //         String(row.jobCode ?? ""),
    //         String(row.costCentre ?? ""),
    //         String(row.qtyHrs ?? ""),
    //         row.rate != null ? String(row.rate) : "",
    //         row.amount != null ? String(row.amount) : "",
    //         row.override ? String(row.override).toUpperCase() : "N",
    //     ]);

    //     const csvContent = rows.map((cols) => cols.join(",")).join("\n");

    //     if (!csvContent) return;

    //     const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    //     const url = URL.createObjectURL(blob);
    //     const link = document.createElement("a");
    //     link.href = url;
    //     link.download = clientId ? `batch_export_client_${clientId}.csv` : "batch_export.csv";
    //     document.body.appendChild(link);
    //     link.click();
    //     document.body.removeChild(link);
    //     URL.revokeObjectURL(url);
    // };

    // const exportToCSV = () => {
    //     const rows = (safeData || []).map((row) => [
    //         String(row.co_number ?? ""),
    //         String(row.transactionCode ?? ""),
    //         String(row.jobCode ?? ""),
    //         String(row.costCentre ?? ""),
    //         String(row.qtyHrs ?? ""),
    //         row.rate != null ? String(row.rate) : "",
    //         row.amount != null ? String(row.amount) : "",
    //         row.override ? String(row.override).toUpperCase() : "N",
    //     ]);

    //     const csvContent = rows.map((cols) => cols.join(",")).join("\n");

    //     if (!csvContent) return;

    //     const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    //     const url = URL.createObjectURL(blob);
    //     const link = document.createElement("a");
    //     link.href = url;
    //     link.download = clientId ? `batch_export_client_${clientId}.csv` : "batch_export.csv";
    //     document.body.appendChild(link);
    //     link.click();
    //     document.body.removeChild(link);
    //     URL.revokeObjectURL(url);
    // };

const exportToTXT = () => {
        let exportData = safeData;

        if (selectedRows.size > 0) {
            exportData = Array.from(selectedRows)
                .sort((a, b) => a - b)
                .map((i) => sortedData[i]);
        }
        const rows = (exportData || []).map((row) => [
            String(row.co_number ?? ""),
            String(row.transactionCode ?? ""),
            String(row.jobCode ?? ""),
            String(row.costCentre ?? ""),
            String(row.qtyHrs ?? ""),
            row.rate != null ? String(row.rate) : "",
            row.amount != null ? String(row.amount) : "",
            row.override ? String(row.override).toUpperCase() : "N",
        ]);

        const csvContent = rows.map((cols) => cols.join(",")).join("\r\n");

        if (!csvContent) return;
  
  const blob = new Blob([ csvContent], { type: "text/plain;charset=utf-8;" });
  
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
 
  const filename = clientId ? `batch_export_client_${clientId}.txt` : "batch_export.txt";
  link.setAttribute("download", filename);
  
   link.style.visibility = "hidden";
   document.body.appendChild(link);
   link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  const indexByRow = new Map();
  safeData.forEach((row, index) => indexByRow.set(row, index));

  const mergedRows = new Set([...exportedRows, ...exportData]);

  const signatures = {};
  mergedRows.forEach((row) => {
      const index = indexByRow.get(row);
      if (index !== undefined) {
          signatures[index] = signatureHash(rowSignature(row));
      }
  });

  try {
      localStorage.setItem(getExportedRowsStorageKey(clientId), JSON.stringify(signatures));
  } catch {
      // storage unavailable; highlighting still applies for this session
  }

  setExportedRows(mergedRows);
  setSelectedRows(new Set());
};

    return (
        <div className="w-full bg-white shadow-xl rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        Batch Export Table <FileDown className="w-5 h-5" />
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">{safeData.length} records</p>
                </div>
                <button
                    onClick={exportToTXT }
                    className="flex items-center space-x-2 px-4 py-2 bg-[#1742c4] text-white font-medium rounded-lg shadow-md hover:bg-[#4F46E5] transition"
                >
                    <FileDown className="w-5 h-5" />
                    <span>Export to TXT</span>
                </button>
            </div>

            <div className="flex-grow overflow-auto max-h-[58vh] relative min-h-[400px] bg-slate-50">
                <table className="w-full border-separate border-spacing-0 table-fixed select-text">
                    <thead className="sticky top-0 z-20">
                        <tr>
                            <th style={{ minWidth: '40px', width: '40px' }} className="px-2 py-3.5 text-center text-xs font-bold text-white uppercase tracking-wider bg-[#2D328F]">
                                <button
                                    onClick={handleSelectAll}
                                    className="hover:opacity-80 transition"
                                    title={allCurrentPageSelected ? "Deselect All" : "Select All"}
                                >
                                    {allCurrentPageSelected ? (
                                        <CheckSquare className="w-4 h-4 text-white" />
                                    ) : (
                                        <Square className="w-4 h-4 text-white/70" />
                                    )}
                                </button>
                            </th>
                            <th className="px-4 py-3.5 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-[#1742c4] transition bg-[#2D328F]" onClick={() => handleSort('co_number')}>
                                <div className="flex items-center gap-1">co_number <ArrowUpDown className="w-3 h-3" /></div>
                            </th>
                            <th className="px-4 py-3.5 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-[#1742c4] transition bg-[#2D328F]" onClick={() => handleSort('transactionCode')}>
                                <div className="flex items-center gap-1">Transaction Code <ArrowUpDown className="w-3 h-3" /></div>
                            </th>
                            <th className="px-4 py-3.5 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-[#1742c4] transition bg-[#2D328F]" onClick={() => handleSort('jobCode')}>
                                <div className="flex items-center gap-1">Job Code <ArrowUpDown className="w-3 h-3" /></div>
                            </th>
                            <th className="px-4 py-3.5 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-[#1742c4] transition bg-[#2D328F]" onClick={() => handleSort('costCentre')}>
                                <div className="flex items-center gap-1">Cost Centre <ArrowUpDown className="w-3 h-3" /></div>
                            </th>
                            <th className="px-4 py-3.5 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-[#1742c4] transition bg-[#2D328F]" onClick={() => handleSort('qtyHrs')}>
                                <div className="flex items-center gap-1">QTY / Hrs <ArrowUpDown className="w-3 h-3" /></div>
                            </th>
                            <th className="px-4 py-3.5 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-[#1742c4] transition bg-[#2D328F]" onClick={() => handleSort('rate')}>
                                <div className="flex items-center gap-1">Rate <ArrowUpDown className="w-3 h-3" /></div>
                            </th>
                            <th className="px-4 py-3.5 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-[#1742c4] transition bg-[#2D328F]" onClick={() => handleSort('amount')}>
                                <div className="flex items-center gap-1">Amount <ArrowUpDown className="w-3 h-3" /></div>
                            </th>
                            <th className="px-4 py-3.5 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-[#1742c4] transition bg-[#2D328F]" onClick={() => handleSort('override')}>
                                <div className="flex items-center gap-1">Override <ArrowUpDown className="w-3 h-3" /></div>
                            </th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-200 bg-white">
                        {paginatedData.map((row, index) => {
                            const isEven = index % 2 === 0;
                            const rowClass = exportedRows.has(row)
                                ? 'bg-indigo-100 hover:bg-indigo-200 transition-colors'
                                : isEven
                                    ? 'bg-[#F5F7FA] hover:bg-slate-200/80 transition-colors'
                                    : 'bg-white hover:bg-slate-100 transition-colors';
                            return (
                                <tr key={index} className={rowClass}>
                                    <td style={{ minWidth: '40px', width: '40px' }} className="px-2 py-3 text-xs border-r border-slate-200/60 text-center">
                                        <button
                                            onClick={() => handleSelectRow(startIndex + index)}
                                            className={`transition ${selectedRows.has(startIndex + index) ? "text-[#1742c4]" : "text-slate-300 hover:text-slate-400"}`}
                                            title={selectedRows.has(startIndex + index) ? "Deselect" : "Select"}
                                        >
                                            {selectedRows.has(startIndex + index) ? (
                                                <CheckSquare className="w-4 h-4" />
                                            ) : (
                                                <Square className="w-4 h-4" />
                                            )}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 text-xs border-r border-slate-200/60 truncate text-slate-700 font-medium text-left">{row.co_number}</td>
                                    <td className="px-4 py-3 text-xs border-r border-slate-200/60 truncate text-slate-700 font-medium text-left">{row.transactionCode}</td>
                                    <td className="px-4 py-3 text-xs border-r border-slate-200/60 truncate text-slate-700 font-medium text-left">{row.jobCode}</td>
                                    <td className="px-4 py-3 text-xs border-r border-slate-200/60 truncate text-slate-700 font-medium text-left">{row.costCentre}</td>
                                    <td className="px-4 py-3 text-xs border-r border-slate-200/60 truncate text-slate-700 font-medium text-left">{row.qtyHrs}</td>
                                    <td className="px-4 py-3 text-xs border-r border-slate-200/60 truncate text-slate-700 font-medium text-left">R {row.rate}</td>
                                    <td className="px-4 py-3 text-xs border-r border-slate-200/60 truncate text-slate-700 font-medium text-left">R {row.amount}</td>
                                    <td className="px-4 py-3 text-xs border-r border-slate-200/60 truncate text-slate-700 font-medium text-left">{row.override}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {safeData.length === 0 && (
                <div className="py-16 text-center text-slate-400 bg-white">
                    <div className="flex flex-col items-center justify-center">
                        <div className="text-slate-300 text-5xl mb-3">📭</div>
                        <p className="text-base font-semibold text-slate-500">No data available</p>
                    </div>
                </div>
            )}

            {safeData.length > rowsPerPage && (
                <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 text-xs sm:text-sm text-[#2D328F] select-none">
                    <div className="text-center md:text-left">Showing <strong className="text-[#2D328F]">{Math.min(safeData.length, (page - 1) * rowsPerPage + 1)}</strong> to <strong className="text-[#2D328F]">{Math.min(safeData.length, page * rowsPerPage)}</strong> of <strong className="text-[#2D328F]">{safeData.length}</strong> records</div>
                    <Stack spacing={2} className="items-center">
                        <Pagination
                            count={pageCount}
                            page={page}
                            onChange={handleChange}
                            variant="outlined"
                            color="secondary"
                        />
                    </Stack>
                </div>
            )}
        </div>
    );
};

export default BatchExportTable;
