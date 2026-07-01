import React, { useState, useMemo, useRef, useCallback } from "react";

// Initial static data configurations
const INITIAL_CLIENT_NAMES = [
  "ADV01 Advaplex",
  "MOOO1 Connect Logistics",
  "MOOO2 Connect Logistic",
  "MOOO3 Connect Logistic",
  "MOOO4 Connect Logistic",
  "S001 Snip-it",
  "S002 Snip-it",
  "S003 Snip-it",
  "S004 Snip-it"
];

const INITIAL_STATUSES = [
  "Draft", "Submitted", "Pending Approval", "Approved", "Open", 
  "Partially Filled", "Filled", "Cancelled", "Expired", "Rejected"
];

const INITIAL_COLUMNS_CONFIG = [
  { key: "timesheet_no", label: "Timesheet No", width: "w-36", type: "text", editable: true, deletable: false },
  { key: "client_name", label: "Client Name", width: "w-56", type: "select", options: INITIAL_CLIENT_NAMES, editable: true, deletable: false },
  { key: "date", label: "Date", width: "w-36", type: "date", editable: true, deletable: false },
  { key: "employee_no", label: "Employee No", width: "w-36", type: "text", editable: true, deletable: false },
  { key: "occupation", label: "Occupation", width: "w-52", type: "text", editable: true, deletable: false },
  { key: "quantity", label: "Quantity", width: "w-28", align: "right", type: "number", editable: true, deletable: false },
  { key: "filledPercent", label: "Filled % (Drag/Edit)", width: "w-60", type: "percentage", editable: true, deletable: false },
  { key: "status", label: "Status", width: "w-40", align: "center", type: "select", options: INITIAL_STATUSES, editable: true, deletable: false },
  { key: "unitPrice", label: "Unit Price", width: "w-28", align: "right", type: "number", editable: true, deletable: false },
  { key: "subTotal", label: "Sub Total", width: "w-36", align: "right", type: "number", editable: false, deletable: false },
  { key: "feeRate", label: "Fee Rate", width: "w-24", align: "right", type: "number", editable: true, deletable: false },
  { key: "feeAmount", label: "Fee Amount", width: "w-36", align: "right", type: "number", editable: false, deletable: false },
  { key: "totalInUsd", label: "Total in USD", width: "w-36", align: "right", type: "number", editable: false, deletable: false },
];

const INITIAL_ROWS = [
  { id: 1, timesheet_no: "128991", client_name: "ADV01 Advaplex", employee_no: "CPE4556", occupation: "General Worker", quantity: 25000, filledPercent: 100.00, status: "Filled", unitPrice: 42.50, feeRate: 0.150, date: "2026-08-15" },
  { id: 2, timesheet_no: "881267", client_name: "ADV01 Advaplex", employee_no: "CPE4556", occupation: "General Worker", quantity: 12000, filledPercent: 45.50, status: "Partially Filled", unitPrice: 89.20, feeRate: 0.125, date: "2026-03-22" },
  { id: 3, timesheet_no: "190438", client_name: "MOOO1 Connect Logistics", employee_no: "CPE4556", occupation: "General Worker", quantity: 50000, filledPercent: 0.00, status: "Open", unitPrice: 15.80, feeRate: 0.220, date: "2026-11-05" },
  { id: 4, timesheet_no: "304453", client_name: "MOOO2 Connect Logistic", employee_no: "CPE4556", occupation: "General Worker", quantity: 75000, filledPercent: 100.00, status: "Filled", unitPrice: 11.40, feeRate: 0.180, date: "2026-01-10" },
  { id: 5, timesheet_no: "559124", client_name: "MOOO3 Connect Logistic", employee_no: "CPE4556", occupation: "General Worker", quantity: 8000, filledPercent: 12.00, status: "Partially Filled", unitPrice: 142.10, feeRate: 0.110, date: "2026-09-30" },
  { id: 6, timesheet_no: "710285", client_name: "MOOO4 Connect Logistic", employee_no: "CPE4556", occupation: "General Worker", quantity: 33000, filledPercent: 0.00, status: "Draft", unitPrice: 28.30, feeRate: 0.145, date: "2027-12-14" },
  { id: 7, timesheet_no: "290067", client_name: "S001 Snip-it", employee_no: "CPE4556", occupation: "General Worker", quantity: 90000, filledPercent: 100.00, status: "Filled", unitPrice: 9.85, feeRate: 0.250, date: "2028-06-01" },
  { id: 8, timesheet_no: "638291", client_name: "S002 Snip-it", employee_no: "CPE4556", occupation: "General Worker", quantity: 15000, filledPercent: 78.00, status: "Partially Filled", unitPrice: 115.00, feeRate: 0.190, date: "2027-10-18" },
  { id: 9, timesheet_no: "947153", client_name: "S003 Snip-it", employee_no: "CPE4556", occupation: "General Worker", quantity: 42000, filledPercent: 100.00, status: "Filled", unitPrice: 64.20, feeRate: 0.130, date: "2028-04-12" },
  { id: 10, timesheet_no: "110439", client_name: "S004 Snip-it", employee_no: "CPE4556", occupation: "General Worker", quantity: 19000, filledPercent: 0.00, status: "Pending Approval", unitPrice: 18.90, feeRate: 0.175, date: "2027-07-25" }
];

// Pure calculation logic
const calculateRowDerivatives = (row) => {
  const quantity = parseInt(row.quantity) || 0;
  const unitPrice = parseFloat(row.unitPrice) || 0;
  const feeRate = parseFloat(row.feeRate) || 0;
  const filledPercent = parseFloat(row.filledPercent) || 0;

  const subTotal = parseFloat((quantity * unitPrice).toFixed(2));
  const feeAmount = parseFloat((subTotal * feeRate).toFixed(3));
  const totalInUsd = parseFloat((subTotal + feeAmount).toFixed(2));

  let status = row.status;
  if (filledPercent >= 100) {
    status = "Filled";
  } else if (filledPercent > 0 && (status === "Open" || status === "Draft")) {
    status = "Partially Filled";
  } else if (filledPercent === 0 && status === "Filled") {
    status = "Open";
  }

  return {
    ...row,
    quantity,
    unitPrice,
    feeRate,
    filledPercent,
    status,
    subTotal,
    feeAmount,
    totalInUsd,
  };
};

export default function App() {
  const [baseRows, setBaseRows] = useState(INITIAL_ROWS);
  const [columns, setColumns] = useState(INITIAL_COLUMNS_CONFIG);
  
  // Filtering & Query States
  const [searchTerm, setSearchTerm] = useState("");
  const [clientFilter, setClientFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedRowIds, setSelectedRowIds] = useState(new Set());
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  // Column Modification Modals/Triggers
  const [editingColKey, setEditingColKey] = useState(null);
  const [editingColLabel, setEditingColLabel] = useState("");
  const [showAddColForm, setShowAddColForm] = useState(false);
  const [newColForm, setNewColForm] = useState({ key: "", label: "", type: "text", width: "w-36" });

  // Cell Editing States
  const [editingCell, setEditingCell] = useState(null); // { rowId, columnKey }
  const [editValue, setEditValue] = useState("");

  // Add New Row States
  const [showAddRowForm, setShowAddRowForm] = useState(false);
  const [newRowData, setNewRowData] = useState({
    timesheet_no: "128991",
    client_name: "ADV01 Advaplex",
    employee_no: "CPE4000",
    occupation: "General Worker",
    quantity: 10000,
    filledPercent: 0,
    status: "Draft",
    unitPrice: 20.00,
    feeRate: 0.10,
    date: new Date().toISOString().split("T")[0]
  });

  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // 1. Column modification actions (CDUD / CRUD on Columns)
  const handleUpdateColumnLabel = (key) => {
    if (!editingColLabel.trim()) return;
    setColumns(prev => prev.map(col => col.key === key ? { ...col, label: editingColLabel } : col));
    setEditingColKey(null);
    showToast(`Column label updated to "${editingColLabel}"!`);
  };

  const handleAddColumn = (e) => {
    e.preventDefault();
    if (!newColForm.key.trim() || !newColForm.label.trim()) {
      showToast("Column key and label are required!", "error");
      return;
    }
    const formattedKey = newColForm.key.toLowerCase().replace(/\s+/g, "_");
    if (columns.some(c => c.key === formattedKey)) {
      showToast("Column with this key already exists!", "error");
      return;
    }

    const newlyCreatedCol = {
      key: formattedKey,
      label: newColForm.label,
      width: newColForm.width || "w-36",
      type: newColForm.type,
      editable: true,
      deletable: true
    };

    setColumns(prev => [...prev, newlyCreatedCol]);
    // Initialize default value in all existing rows
    setBaseRows(prev => prev.map(row => ({ ...row, [formattedKey]: newColForm.type === "number" ? 0 : "" })));
    setShowAddColForm(false);
    setNewColForm({ key: "", label: "", type: "text", width: "w-36" });
    showToast(`Added custom column "${newColForm.label}" successfully!`);
  };

  const handleDeleteColumn = (key) => {
    setColumns(prev => prev.filter(col => col.key !== key));
    setBaseRows(prev => prev.map(row => {
      const copy = { ...row };
      delete copy[key];
      return copy;
    }));
    showToast("Column removed", "info");
  };

  // 2. Row Derivative & Search Filters
  const processedRows = useMemo(() => {
    let result = baseRows.map(row => calculateRowDerivatives(row));

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(
        (r) =>
          (r.employee_no && r.employee_no.toLowerCase().includes(lower)) ||
          (r.occupation && r.occupation.toLowerCase().includes(lower)) ||
          (r.timesheet_no && r.timesheet_no.toLowerCase().includes(lower))
      );
    }

    if (clientFilter !== "All") {
      result = result.filter((r) => r.client_name === clientFilter);
    }

    if (statusFilter !== "All") {
      result = result.filter((r) => r.status === statusFilter);
    }

    if (sortConfig.key) {
      result.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];
        if (typeof valA === "string") {
          return sortConfig.direction === "asc"
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        }
        return sortConfig.direction === "asc" ? valA - valB : valB - valA;
      });
    }

    return result;
  }, [baseRows, searchTerm, clientFilter, statusFilter, sortConfig]);

  // 3. Row Selection & Sorting
  const toggleSelectRow = useCallback((id) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = () => {
    if (selectedRowIds.size === processedRows.length) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(processedRows.map(r => r.id)));
    }
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    } else if (sortConfig.key === key && sortConfig.direction === "desc") {
      key = null;
    }
    setSortConfig({ key, direction });
  };

  // 4. Row Operations (CRUD on Rows)
  const updateRowValue = useCallback((rowId, columnKey, newValue) => {
    setBaseRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, [columnKey]: newValue } : row))
    );
  }, []);

  const handleCellClickToEdit = (rowId, colKey, value) => {
    setEditingCell({ rowId, columnKey: colKey });
    setEditValue(value === undefined || value === null ? "" : String(value));
  };

  const handleCellSave = () => {
    if (!editingCell) return;
    const { rowId, columnKey } = editingCell;
    const colConfig = columns.find((c) => c.key === columnKey);

    let finalizedValue = editValue;
    if (colConfig.type === "number" || colConfig.type === "percentage") {
      finalizedValue = parseFloat(editValue);
      if (isNaN(finalizedValue)) finalizedValue = 0;
      if (columnKey === "quantity") finalizedValue = Math.round(finalizedValue);
    }

    updateRowValue(rowId, columnKey, finalizedValue);
    setEditingCell(null);
    showToast("Value updated & derivatives re-evaluated");
  };

  const handleAddRow = (e) => {
    e.preventDefault();
    if (!newRowData.employee_no.trim()) {
      showToast("Employee No is required!", "error");
      return;
    }

    const freshRow = {
      id: Date.now(),
      ...newRowData,
      quantity: Number(newRowData.quantity),
      unitPrice: Number(newRowData.unitPrice),
      feeRate: Number(newRowData.feeRate),
      filledPercent: Number(newRowData.filledPercent),
    };

    setBaseRows(prev => [...prev, freshRow]);
    setShowAddRowForm(false);
    showToast("New trade record added successfully!");
  };

  const handleDeleteSelected = () => {
    setBaseRows(prev => prev.filter(r => !selectedRowIds.has(r.id)));
    setSelectedRowIds(new Set());
    showToast("Selected items deleted", "info");
  };

  // Interactive Percentage slider drag
  const handleBarDragStart = (e, rowId) => {
    e.preventDefault();
    const targetElement = e.currentTarget;
    const rect = targetElement.getBoundingClientRect();

    const calculateAndUpdate = (clientX) => {
      const relativeX = clientX - rect.left;
      let pct = (relativeX / rect.width) * 100;
      pct = Math.max(0, Math.min(100, pct));
      updateRowValue(rowId, "filledPercent", parseFloat(pct.toFixed(1)));
    };

    const initialX = e.clientX || e.touches?.[0]?.clientX;
    calculateAndUpdate(initialX);

    const handleMove = (moveEvent) => {
      const clientX = moveEvent.clientX || moveEvent.touches?.[0]?.clientX;
      calculateAndUpdate(clientX);
    };

    const handleEnd = () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleMove, { passive: true });
    window.addEventListener("touchend", handleEnd);
  };

  // Visual status stylings
  const getStatusBadgeStyle = (status) => {
    switch(status) {
      case "Filled": return "bg-emerald-100 text-emerald-800 border border-emerald-200";
      case "Partially Filled": return "bg-amber-100 text-amber-800 border border-amber-200";
      case "Open": return "bg-sky-100 text-sky-800 border border-sky-200";
      case "Approved": return "bg-teal-100 text-teal-800 border border-teal-200";
      case "Submitted": return "bg-indigo-100 text-indigo-800 border border-indigo-200";
      case "Pending Approval": return "bg-purple-100 text-purple-800 border border-purple-200";
      case "Draft": return "bg-slate-100 text-slate-700 border border-slate-300";
      case "Cancelled": return "bg-rose-100 text-rose-800 border border-rose-200 line-through";
      default: return "bg-slate-50 text-slate-600 border border-slate-200";
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6 text-slate-800 font-sans antialiased">
      {/* Toast System */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-xl border border-slate-700 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Main Board Container */}
      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
        
        {/* Header Block */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              📊 Flex TradeFlow Matrix
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Interactive workspace supporting real-time calculations, dynamic row adjustments, and customized columns.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowAddColForm(!showAddColForm)}
              className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-200 transition flex items-center gap-1.5"
            >
              ⚙️ {showAddColForm ? "Hide Col Builder" : "Customize Columns"}
            </button>
            <button
              onClick={() => setShowAddRowForm(!showAddRowForm)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow transition flex items-center gap-1.5"
            >
              ➕ {showAddRowForm ? "Close Form" : "Add Row"}
            </button>
          </div>
        </div>

        {/* Dynamic Column Creator Panel */}
        {showAddColForm && (
          <div className="p-4 bg-indigo-50/50 border-b border-indigo-100 animate-fade-in">
            <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-3">🛠️ Dynamic Column Configuration</h3>
            <form onSubmit={handleAddColumn} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Unique Column Key</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. region, project_id"
                  value={newColForm.key}
                  onChange={(e) => setNewColForm({...newColForm, key: e.target.value})}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Display Title</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Project Code"
                  value={newColForm.label}
                  onChange={(e) => setNewColForm({...newColForm, label: e.target.value})}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Data Type</label>
                <select
                  value={newColForm.type}
                  onChange={(e) => setNewColForm({...newColForm, type: e.target.value})}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-indigo-500"
                >
                  <option value="text">Text (Standard)</option>
                  <option value="number">Numeric</option>
                  <option value="date">Date picker</option>
                </select>
              </div>
              <div>
                <button
                  type="submit"
                  className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded shadow transition"
                >
                  💾 Create Column
                </button>
              </div>
            </form>

            {/* List & edit current columns */}
            <div className="mt-4 pt-3 border-t border-slate-200">
              <span className="block text-[10px] font-semibold text-slate-500 uppercase mb-2">Modify Column Headers (Double-click Label to Edit)</span>
              <div className="flex flex-wrap gap-2">
                {columns.map(col => (
                  <div key={col.key} className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-md text-xs shadow-xs">
                    {editingColKey === col.key ? (
                      <input
                        type="text"
                        value={editingColLabel}
                        onChange={(e) => setEditingColLabel(e.target.value)}
                        onBlur={() => handleUpdateColumnLabel(col.key)}
                        onKeyDown={(e) => e.key === "Enter" && handleUpdateColumnLabel(col.key)}
                        autoFocus
                        className="px-1 border border-indigo-400 rounded outline-none"
                      />
                    ) : (
                      <span 
                        onDoubleClick={() => { setEditingColKey(col.key); setEditingColLabel(col.label); }}
                        className="cursor-pointer hover:text-indigo-600 font-medium"
                        title="Double-click to rename"
                      >
                        {col.label}
                      </span>
                    )}
                    {col.deletable && (
                      <button 
                        type="button" 
                        onClick={() => handleDeleteColumn(col.key)} 
                        className="text-slate-400 hover:text-red-500 font-semibold"
                        title="Delete Column"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Create Trade Record Panel */}
        {showAddRowForm && (
          <form onSubmit={handleAddRow} className="p-5 bg-blue-50/40 border-b border-blue-100 grid grid-cols-2 md:grid-cols-5 gap-3 animate-fade-in">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Employee No *</label>
              <input
                required
                type="text"
                value={newRowData.employee_no}
                onChange={(e) => setNewRowData({...newRowData, employee_no: e.target.value})}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Occupation</label>
              <input
                type="text"
                value={newRowData.occupation}
                onChange={(e) => setNewRowData({...newRowData, occupation: e.target.value})}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Timesheet No</label>
              <input
                type="text"
                value={newRowData.timesheet_no}
                onChange={(e) => setNewRowData({...newRowData, timesheet_no: e.target.value})}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Client Name</label>
              <select
                value={newRowData.client_name}
                onChange={(e) => setNewRowData({...newRowData, client_name: e.target.value})}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none"
              >
                {INITIAL_CLIENT_NAMES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Quantity</label>
              <input
                type="number"
                value={newRowData.quantity}
                onChange={(e) => setNewRowData({...newRowData, quantity: e.target.value})}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Unit Price</label>
              <input
                type="number"
                step="0.01"
                value={newRowData.unitPrice}
                onChange={(e) => setNewRowData({...newRowData, unitPrice: e.target.value})}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Fee Rate</label>
              <input
                type="number"
                step="0.001"
                value={newRowData.feeRate}
                onChange={(e) => setNewRowData({...newRowData, feeRate: e.target.value})}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Filled % (0-100)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={newRowData.filledPercent}
                onChange={(e) => setNewRowData({...newRowData, filledPercent: e.target.value})}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Trade Status</label>
              <select
                value={newRowData.status}
                onChange={(e) => setNewRowData({...newRowData, status: e.target.value})}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none"
              >
                {INITIAL_STATUSES.map(stat => <option key={stat} value={stat}>{stat}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded shadow-xs transition"
              >
                💾 Insert Record
              </button>
            </div>
          </form>
        )}

        {/* Global Toolbar and Filters */}
        <div className="p-4 bg-white border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                🔍
              </span>
              <input
                type="text"
                placeholder="Search Employee, ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs w-56 focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            {/* Client Filter */}
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
            >
              <option value="All">All Clients</option>
              {INITIAL_CLIENT_NAMES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
            >
              <option value="All">All Statuses</option>
              {INITIAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Action on selection */}
          {selectedRowIds.size > 0 && (
            <div className="flex items-center gap-2.5 animate-fade-in">
              <span className="text-xs text-slate-500 font-medium">{selectedRowIds.size} rows selected</span>
              <button
                onClick={handleDeleteSelected}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold rounded-lg border border-rose-200 transition"
              >
                🗑️ Delete Selected
              </button>
            </div>
          )}
        </div>

        {/* Primary spreadsheet matrix view with fixed column sticky properties */}
        <div className="w-full overflow-x-auto relative">
          <div className="min-w-max flex flex-col">
            
            {/* Header Row */}
            <div className="flex bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 h-10 divide-x divide-slate-200 items-center">
              {/* Checkbox Box */}
              <div className="flex items-center justify-center w-12 shrink-0 h-full sticky left-0 z-40 bg-slate-50">
                <input
                  type="checkbox"
                  checked={processedRows.length > 0 && selectedRowIds.size === processedRows.length}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 accent-blue-600 cursor-pointer rounded"
                />
              </div>

              {/* Dynamic Columns mapping */}
              {columns.map((col) => {
                const isSticky = col.key === "timesheet_no" || col.key === "client_name";
                let stickyStyle = {};
                if (isSticky) {
                  stickyStyle = col.key === "timesheet_no" ? { left: "48px" } : { left: "192px" };
                }

                return (
                  <div
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className={`h-full flex items-center justify-between px-3 hover:bg-slate-100 cursor-pointer transition group shrink-0 ${col.width} ${
                      col.align === "right" ? "text-right" : col.align === "center" ? "text-center justify-center" : "text-left"
                    } ${isSticky ? "sticky z-40 bg-slate-50 font-bold" : ""}`}
                    style={stickyStyle}
                  >
                    <span className="truncate pr-1 text-xs">{col.label}</span>
                    <span className="flex items-center gap-0.5 opacity-40 group-hover:opacity-100 transition text-[9px]">
                      {sortConfig.key === col.key ? (
                        sortConfig.direction === "asc" ? "▲" : "▼"
                      ) : (
                        "⇅"
                      )}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Matrix Rows Wrapper */}
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {processedRows.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 select-none">
                  No matching trade matrix records found.
                </div>
              ) : (
                processedRows.map((row, index) => {
                  const isSelected = selectedRowIds.has(row.id);
                  const isEven = index % 2 === 0;

                  return (
                    <div
                      key={row.id}
                      className={`flex hover:bg-blue-50/20 text-slate-700 text-xs items-center h-10 divide-x divide-slate-100 transition-colors ${
                        isSelected ? "bg-blue-50/40" : isEven ? "bg-slate-50/10" : "bg-white"
                      }`}
                    >
                      {/* Checkbox select block */}
                      <div className="flex items-center justify-center w-12 shrink-0 h-full sticky left-0 z-30 bg-white/95 backdrop-blur-xs border-r border-slate-200">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(row.id)}
                          className="w-4 h-4 accent-blue-600 cursor-pointer rounded"
                        />
                      </div>

                      {/* Map cells dynamically based on active custom schema */}
                      {columns.map((col) => {
                        const cellValue = row[col.key];
                        const isEditing = editingCell?.rowId === row.id && editingCell?.columnKey === col.key;
                        const isSticky = col.key === "timesheet_no" || col.key === "client_name";
                        let stickyStyle = {};
                        if (isSticky) {
                          stickyStyle = col.key === "timesheet_no" ? { left: "48px" } : { left: "192px" };
                        }

                        return (
                          <div
                            key={col.key}
                            onClick={() => col.editable && !isEditing && handleCellClickToEdit(row.id, col.key, cellValue)}
                            className={`h-full flex items-center px-3 shrink-0 ${col.width} ${
                              col.editable ? "cursor-pointer hover:bg-slate-50/60 group/cell" : "bg-slate-50/30 select-none"
                            } ${
                              col.align === "right" ? "justify-end text-right" : col.align === "center" ? "justify-center text-center" : "justify-start text-left"
                            } ${isSticky ? "sticky z-30 bg-white/95" : ""}`}
                            style={stickyStyle}
                          >
                            {isEditing ? (
                              <div className="w-full flex items-center" onClick={(e) => e.stopPropagation()}>
                                {col.type === "select" ? (
                                  <select
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={handleCellSave}
                                    autoFocus
                                    className="w-full px-1 py-0.5 border border-blue-500 rounded bg-white text-slate-900 focus:outline-none"
                                  >
                                    {(col.options || []).map((opt) => (
                                      <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                  </select>
                                ) : col.type === "date" ? (
                                  <input
                                    type="date"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={handleCellSave}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleCellSave();
                                      if (e.key === "Escape") setEditingCell(null);
                                    }}
                                    autoFocus
                                    className="w-full px-1.5 py-0.5 border border-blue-500 rounded bg-white text-slate-900 focus:outline-none"
                                  />
                                ) : (
                                  <input
                                    type={col.type === "number" || col.type === "percentage" ? "number" : "text"}
                                    step="any"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={handleCellSave}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleCellSave();
                                      if (e.key === "Escape") setEditingCell(null);
                                    }}
                                    autoFocus
                                    className="w-full px-1.5 py-0.5 border border-blue-500 rounded bg-white text-slate-900 focus:outline-none"
                                  />
                                )}
                              </div>
                            ) : (
                              <div className="truncate w-full relative flex items-center justify-between">
                                {col.type === "percentage" ? (
                                  <div className="flex items-center gap-1.5 w-full h-full select-none" onClick={(e) => e.stopPropagation()}>
                                    <div
                                      onMouseDown={(e) => handleBarDragStart(e, row.id)}
                                      onTouchStart={(e) => handleBarDragStart(e, row.id)}
                                      className="relative flex-1 bg-slate-100 h-6 border border-slate-200 rounded cursor-ew-resize overflow-hidden hover:border-blue-400 group/bar transition"
                                      title="Click to type percentage, or drag progress bar"
                                    >
                                      <div
                                        className={`h-full ${
                                          Number(cellValue) >= 100 ? "bg-emerald-500/80" : Number(cellValue) > 40 ? "bg-amber-400/80" : "bg-red-500/80"
                                        }`}
                                        style={{ width: `${Number(cellValue)}%` }}
                                      />
                                      <span className="absolute inset-0 flex items-center justify-center font-mono text-[9px] text-slate-800 font-bold pointer-events-none">
                                        {Number(cellValue).toFixed(1)} %
                                      </span>
                                    </div>
                                    <span 
                                      onClick={() => handleCellClickToEdit(row.id, col.key, cellValue)}
                                      className="p-1 hover:bg-slate-200 rounded text-slate-400 cursor-pointer text-[10px]"
                                    >
                                      ✏️
                                    </span>
                                  </div>
                                ) : col.key === "status" ? (
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${getStatusBadgeStyle(cellValue)}`}>
                                    {cellValue}
                                  </span>
                                ) : col.align === "right" ? (
                                  <span className="font-mono text-xs text-right w-full">
                                    {typeof cellValue === "number" ? cellValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 }) : cellValue}
                                  </span>
                                ) : (
                                  <span className="truncate">{cellValue !== undefined ? String(cellValue) : ""}</span>
                                )}

                                {col.editable && col.type !== "percentage" && (
                                  <span className="opacity-0 group-hover/cell:opacity-100 absolute right-0 bg-white/90 px-1 py-0.5 transition rounded text-[9px] text-slate-400 pointer-events-none">
                                    ✏️
                                  </span>
                                )}
                                {!col.editable && (
                                  <span className="opacity-0 group-hover/cell:opacity-100 absolute right-0 bg-slate-100/90 px-1 py-0.5 transition rounded text-[9px] text-slate-400 pointer-events-none" title="Formula derived cell">
                                    🔒
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer Statistics Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap gap-4 text-xs font-mono text-slate-600 justify-between items-center">
          <div className="flex gap-4">
            <div>
              Total Rows: <span className="text-blue-600 font-bold">{processedRows.length}</span>
            </div>
            <div>
              Summed USD Total: <span className="text-emerald-600 font-bold">
                ${processedRows.reduce((acc, row) => acc + (row.totalInUsd || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          <div className="text-[10px] text-slate-400">
            💡 Pro-Tip: Double-click customizable columns in header to change names dynamically.
          </div>
        </div>

      </div>
    </div>
  );
}