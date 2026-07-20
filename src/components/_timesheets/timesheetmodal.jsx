import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    X,
    Users,
    Save,
    Trash2,
    Clock,
    AlertTriangle,
    RefreshCw,
    Search,
    Pencil,
    Coffee,
} from "lucide-react";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import api from "../../utils/api";

const getAdjustedDate = (date) => {
    const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return adjusted.toISOString().split("T")[0];
};

const initialFormData = {
    timesheet_number: "",
    client_name: "",
    timesheet_date: getAdjustedDate(new Date()),
    co_number: "",
    transaction_code: "",
    occupation: "",
    shift_type: "",
    start_time: "08:00",
    end_time: "17:00",
    units: "",
    rate: "",
    total_hours: "",
    client_id: "",
    actual_lunch_hours: "",
    isDoubleShift: false,
};

const TimesheetModal = ({ isOpen, onClose, onSave, editData, onDelete }) => {
    const isEditMode = !!editData;
    const [formData, setFormData] = useState(initialFormData);
    const [employees, setEmployees] = useState([]);
    const [clientRates, setClientRates] = useState([]);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");
    const [snackbarSeverity, setSnackbarSeverity] = useState("success");
    const [coCount, setCoCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const modalRef = useRef(null);

    const [showIdleState, setShowIdleState] = useState(true);
    const [showErrorState, setShowErrorState] = useState(false);
    const [showEmployeeBadge, setShowEmployeeBadge] = useState(false);
    const [badgeInitials, setBadgeInitials] = useState("");
    const [badgeName, setBadgeName] = useState("");
    const [badgeOccupation, setBadgeOccupation] = useState("");
    const [badgeId, setBadgeId] = useState("");
    const [activeMatchId, setActiveMatchId] = useState("");
    const [badgeShiftType, setBadgeShiftType] = useState("");

    const [clientSearch, setClientSearch] = useState("");
    const [clientSearchOpen, setClientSearchOpen] = useState(false);
    const [filteredClients, setFilteredClients] = useState([]);
    const [selectedClient, setSelectedClient] = useState(null);
    const clientSearchWrapperRef = useRef(null);

    const [clientOccupations, setClientOccupations] = useState([]);
    const [selectedOccupation, setSelectedOccupation] = useState("");

    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    const showIdleStateFunc = () => {
        setShowIdleState(true);
        setShowErrorState(false);
        setShowEmployeeBadge(false);
    };

    const showErrorStateFunc = () => {
        setShowIdleState(false);
        setShowErrorState(true);
        setShowEmployeeBadge(false);
    };

    const triggerPopEffect = (employee) => {
        setShowIdleState(false);
        setShowErrorState(false);
        const initials = employee.full_name
            .split(" ")
            .map((part) => part[0])
            .slice(0, 2)
            .join("")
            .toUpperCase();
        setBadgeInitials(initials);
        setBadgeName(employee.full_name.toUpperCase());
        setBadgeOccupation(employee.role || employee.occupation || "Worker");
        setBadgeId(employee.co_number);
        setShowEmployeeBadge(true);
    };

    const handleEmployeeLookup = async (val) => {
        const cleanVal = val.trim().toUpperCase();
        if (!cleanVal) {
            showIdleStateFunc();
            return;
        }
        const employeeMatch = employees.find((emp) => emp.co_number === cleanVal);
        if (employeeMatch) {
            if (activeMatchId !== cleanVal) {
                setActiveMatchId(cleanVal);
                triggerPopEffect(employeeMatch);
            }
        } else if (cleanVal.length >= 3) {
            showErrorStateFunc();
        } else {
            showIdleStateFunc();
        }
    };

    const clearEmployeeInput = () => {
        setFormData({ ...formData, co_number: "" });
        showIdleStateFunc();
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === "timesheet_date") {
            const date = new Date(value);
            const adjustedValue = getAdjustedDate(date);
            setFormData({ ...formData, [name]: adjustedValue });
        } else if (name === "shift_type") {
            setFormData({
                ...formData,
                [name]: value,
                start_time: value === "Task" ? "" : "08:00",
                end_time: value === "Task" ? "" : "17:00",
                units: value === "Task" ? "" : formData.units,
                rate: value === "Task" ? "" : formData.rate,
            });
            setBadgeShiftType(value);
        } else if (name === "occupation") {
            setFormData({ ...formData, [name]: value });
            setBadgeOccupation(value);
            setSelectedOccupation(value);
        } else if (name === "isDoubleShift") {
            setFormData({ ...formData, [name]: e.target.checked });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const updateClientOccupations = (clientId) => {
        const occupations = [...new Set(
            clientRates
                .filter((cr) => cr.client_id?.toString().trim().toUpperCase() === clientId.toString().trim().toUpperCase() && cr.occupation)
                .map((cr) => cr.occupation)
        )];
        setClientOccupations(occupations);
    };

    const handleClientSelect = (client) => {
        setSelectedClient(client);
        setFormData({
            ...formData,
            client_id: client.client_id,
            client_name: client.client_name,
        });
        setClientSearch(`${client.client_id} - ${client.client_name}`);
        setClientSearchOpen(false);
        updateClientOccupations(client.client_id);
        setSelectedOccupation("");
        setFormData((prev) => ({ ...prev, occupation: "" }));
        setBadgeOccupation("");
        document.activeElement.blur();
    };

    const handleClientSearchChange = (value) => {
        setClientSearch(value);
        if (!value.trim()) {
            setFilteredClients([]);
            setClientSearchOpen(false);
            setSelectedClient(null);
            setFormData({ ...formData, client_id: "", client_name: "", occupation: "" });
            setClientOccupations([]);
            setSelectedOccupation("");
            return;
        }
        const q = value.trim().toUpperCase();
        const results = clientRates.filter((cr) => {
            const idMatch = cr.client_id?.toString().trim().toUpperCase().includes(q);
            const nameMatch = cr.client_name?.toString().trim().toUpperCase().includes(q);
            return idMatch || nameMatch;
        });
        const uniqueResults = results.filter(
            (cr, idx, self) => idx === self.findIndex((c) => c.client_id === cr.client_id)
        );
        setFilteredClients(uniqueResults);
        setClientSearchOpen(true);
    };

    const handleClientSearchKeyDown = (e) => {
        if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault();
            if (filteredClients.length > 0) {
                handleClientSelect(filteredClients[0]);
            } else if (clientSearch.trim()) {
                const exactIdMatch = clientRates.find(
                    (cr) => cr.client_id?.toString().trim().toUpperCase() === clientSearch.trim().toUpperCase()
                );
                if (exactIdMatch) {
                    handleClientSelect(exactIdMatch);
                } else {
                    const partialNameMatch = clientRates.find((cr) =>
                        cr.client_name?.toString().trim().toUpperCase().startsWith(clientSearch.trim().toUpperCase())
                    );
                    if (partialNameMatch) {
                        handleClientSelect(partialNameMatch);
                    }
                }
            }
        }
    };

    const handleOccupationChange = (e) => {
        const value = e.target.value;
        const match = clientRates.find(
            (cr) =>
                cr.client_id?.toString().trim().toUpperCase() === selectedClient?.client_id?.toString().trim().toUpperCase() &&
                cr.occupation === value
        );
        setFormData({
            ...formData,
            occupation: value,
            transaction_code: match?.transaction_code || match?.txCode || "",
        });
        setSelectedOccupation(value);
        setBadgeOccupation(value);
    };

    const populateForm = (data) => {
        const mapped = {
            timesheet_number: data.timesheet_number || data.timesheetNo || "",
            client_name: data.client_name || data.clientName || "",
            timesheet_date: data.timesheet_date || data.date || getAdjustedDate(new Date()),
            co_number: data.co_number || data.empNo || "",
            transaction_code: data.transaction_code || data.txCode || "",
            occupation: data.occupation || "",
            shift_type: data.shift_type || data.shiftType || "",
            start_time: data.start_time || data.start || "08:00",
            end_time: data.end_time || data.end || "17:00",
            units: data.units != null ? String(data.units) : "",
            rate: data.rate != null ? String(data.rate) : "",
            total_hours: data.total_hours != null ? String(data.total_hours) : "",
            client_id: data.client_id || data.clientId || "",
            actual_lunch_hours: data.actual_lunch_hours != null ? String(data.actual_lunch_hours) : "",
            isDoubleShift: data.isDoubleShift || false,
        };
        setFormData(mapped);
        setClientSearch(mapped.client_id ? `${mapped.client_id} - ${mapped.client_name}` : "");
        if (mapped.client_id) {
            setSelectedClient({ client_id: mapped.client_id, client_name: mapped.client_name });
            updateClientOccupations(mapped.client_id);
        }
        if (mapped.occupation) {
            setSelectedOccupation(mapped.occupation);
            setBadgeOccupation(mapped.occupation);
        }
        setCoCount(0);
        setShowIdleState(true);
        setShowErrorState(false);
        setShowEmployeeBadge(false);
        setBadgeShiftType("");
        setActiveMatchId("");
    };

    useEffect(() => {
        if (!isOpen) return;

        if (editData) {
            populateForm(editData);
        } else {
            setFormData(initialFormData);
            setCoCount(0);
            setShowIdleState(true);
            setShowErrorState(false);
            setShowEmployeeBadge(false);
            setEmployees([]);
            setClientRates([]);
            setBadgeShiftType("");
            setActiveMatchId("");
            setClientSearch("");
            setClientSearchOpen(false);
            setSelectedClient(null);
            setFilteredClients([]);
            setClientOccupations([]);
            setSelectedOccupation("");
        }

        const fetchLookups = async () => {
            try {
                const [empRes, crRes] = await Promise.all([
                    api.get('/employees'),
                    api.get('/clientrates'),
                ]);
                setEmployees(empRes.data);
                setClientRates(crRes.data);
            } catch (err) {
                console.error("Failed to load lookup data:", err);
            }
        };
        fetchLookups();


        const handleKeyDown = (e) => {

            if (e.key === 'Escape') {
                onCloseRef.current();
                return;
            }


            if (e.key === 'Tab' && modalRef.current) {

                const allFocusable = modalRef.current.querySelectorAll(
                    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
                );

                const focusableArray = Array.from(allFocusable);
                const firstElement = focusableArray[0];
                const lastElement = focusableArray[focusableArray.length - 1];

                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, editData]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                timesheet_number: formData.timesheet_number,
                timesheet_date: formData.timesheet_date,
                client_id: formData.client_id,
                client_name: formData.client_name,
                co_number: formData.co_number,
                transaction_code: formData.transaction_code,
                occupation: formData.occupation,
                shift_type: formData.shift_type || 'Standard',
                start_time: formData.start_time || null,
                end_time: formData.end_time || null,
                units: formData.units ? parseFloat(formData.units) : null,
                rate: formData.rate ? parseFloat(formData.rate) : null,
                total_hours: formData.total_hours ? parseFloat(formData.total_hours) : null,
                actual_lunch_hours: formData.actual_lunch_hours ? parseFloat(formData.actual_lunch_hours) : null,
                isDoubleShift: formData.isDoubleShift || false,
                status: 'active',
            };

            if (isEditMode && editData?.id) {
                await api.put(`/timesheets/${editData.id}`, payload);
                setSnackbarMessage("Timesheet updated successfully!");
            } else {
                await api.post('/timesheets', payload);
                setCoCount((prev) => prev + 1);
                setSnackbarMessage("Timesheet saved successfully!");

                const preservedTimesheetNumber = formData.timesheet_number;
                const preservedTimesheetDate = formData.timesheet_date;
                const preservedClientId = formData.client_id;
                const preservedClientName = formData.client_name;
                const preservedOccupation = formData.occupation;
                const preservedTransactionCode = formData.transaction_code;
                const preservedShiftType = formData.shift_type;

                setFormData((prev) => ({
                    ...initialFormData,
                    timesheet_number: preservedTimesheetNumber,
                    timesheet_date: preservedTimesheetDate,
                    client_id: preservedClientId,
                    client_name: preservedClientName,
                    occupation: preservedOccupation,
                    transaction_code: preservedTransactionCode,
                    shift_type: preservedShiftType,
                }));
                setClientSearch(preservedClientId ? `${preservedClientId} - ${preservedClientName}` : "");
                setShowIdleState(true);
                setShowErrorState(false);
                setShowEmployeeBadge(false);
                setBadgeInitials("");
                setBadgeName("");
                setBadgeOccupation(preservedOccupation || "");
                setBadgeShiftType(preservedShiftType || "");
                setBadgeId("");
                setActiveMatchId("");
                setClientSearchOpen(false);
                setSelectedClient(preservedClientId ? { client_id: preservedClientId, client_name: preservedClientName } : null);
                setFilteredClients([]);
                if (preservedClientId) {
                    const occupations = [...new Set(
                        clientRates
                            .filter((cr) => cr.client_id?.toString().trim().toUpperCase() === preservedClientId.toString().trim().toUpperCase() && cr.occupation)
                            .map((cr) => cr.occupation)
                    )];
                    if (preservedOccupation && !occupations.includes(preservedOccupation)) {
                        occupations.push(preservedOccupation);
                    }
                    setClientOccupations(occupations);
                } else {
                    setClientOccupations([]);
                }
                setSelectedOccupation(preservedOccupation || "");
            }

            setSnackbarSeverity("success");
            setSnackbarOpen(true);
            onSave?.();
        } catch (err) {
            const action = isEditMode ? "update" : "save";
            setSnackbarMessage(err.response?.data?.message || `Failed to ${action} timesheet`);
            setSnackbarSeverity("error");
            setSnackbarOpen(true);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        if (isEditMode && editData) {
            populateForm(editData);
        } else {
            setFormData({ ...initialFormData });
            setCoCount(0);
            setShowIdleState(true);
            setShowErrorState(false);
            setShowEmployeeBadge(false);
            setBadgeInitials("");
            setBadgeName("");
            setBadgeOccupation("");
            setBadgeId("");
            setActiveMatchId("");
            setClientSearch("");
            setClientSearchOpen(false);
            setSelectedClient(null);
            setFilteredClients([]);
            setClientOccupations([]);
            setSelectedOccupation("");
        }
    };

    const handleClose = () => {
        setFormData({ ...initialFormData });
        setCoCount(0);
        setShowIdleState(true);
        setShowErrorState(false);
        setShowEmployeeBadge(false);
        setBadgeInitials("");
        setBadgeName("");
        setBadgeOccupation("");
        setBadgeId("");
        setActiveMatchId("");
        setClientSearch("");
        setClientSearchOpen(false);
        setSelectedClient(null);
        setFilteredClients([]);
        setClientOccupations([]);
        setSelectedOccupation("");
        onClose();
    };

    const handleSnackbarClose = (event, reason) => {
        if (reason === "clickaway") return;
        setSnackbarOpen(false);
    };

    if (!isOpen) return null;

    return (
        <div ref={modalRef} className="fixed inset-0 z-50 overflow-y-auto bg-gray-800/75 flex items-center justify-center p-3 sm:p-4">
            <div className="relative w-[100%] max-h-[95vh] sm:max-h-[90vh] max-w-4xl bg-white rounded-xl shadow-2xl p-4 sm:p-6 md:p-8 border-t-8 border-[#1742c4] flex flex-col overflow-hidden">
                <div className="flex-shrink-0 flex justify-between items-center pb-4 border-b border-gray-100 mb-6">
                    <div className="flex flex-col text-left">
                        <h3 className="text-2xl font-bold text-[#1742c4] flex items-center gap-2">
                            {isEditMode ? "Edit Timesheet" : "Capture Timesheet"}
                        </h3>
                        {formData.timesheet_number && !isEditMode && (
                            <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                                <Users className="w-4 h-4 text-[#EE8623]" />
                                People count for Timesheet{" "}
                                <span className="font-bold text-gray-800">
                                    #{formData.timesheet_number}
                                </span>
                                :
                                <span className="text-[#EE8623] font-black text-xl ml-1">
                                    {coCount}
                                </span>
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleReset}
                            title="Refresh / Reset form"
                            className="text-slate-400 hover:text-[#1742c4] transition-colors p-1 focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <RefreshCw className="w-6 h-6" />
                        </button>
                        <button
                            onClick={handleClose}
                            className="text-[#F5B52A] hover:text-red-500 transition-colors p-1 focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <X className="w-8 h-8" />
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-left">
                        <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                            <div className="flex flex-col">
                                <label className="block text-[10px] font-bold text-blue-600 uppercase mb-1">Timesheet No</label>
                                <input type="text" name="timesheet_number" value={formData.timesheet_number} onChange={handleChange} placeholder="TS-0001" required className="w-full p-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div className="flex flex-col">
                                <label className="block text-[10px] font-bold text-blue-600 uppercase mb-1">Timesheet Date</label>
                                <input type="date" name="timesheet_date" value={formData.timesheet_date} onChange={handleChange} required className="w-full p-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div className="flex flex-col" ref={clientSearchWrapperRef}>
                                <label className="block text-[10px] font-bold text-blue-600 uppercase mb-1">Client</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                        <Search className="text-xs" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Search by ID (M0004) or name (Connect Logistics)"
                                        value={clientSearch}
                                        onChange={(e) => handleClientSearchChange(e.target.value)}
                                        onKeyDown={handleClientSearchKeyDown}
                                        onFocus={() => filteredClients.length > 0 && setClientSearchOpen(true)}
                                        autoComplete="off"
                                        className="w-full pl-9 pr-3 py-2 border border-blue-200 rounded-md text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    />
                                    {clientSearchOpen && filteredClients.length > 0 && (
                                        <div className="absolute left-0 right-0 mt-1 bg-white border border-blue-200 rounded-lg overflow-hidden shadow-lg z-50 max-h-48 overflow-y-auto">
                                            {filteredClients.map((client) => (
                                                <div
                                                    key={client.client_id}
                                                    tabIndex={0} //Tab scrolling
                                                    role="button"
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() => handleClientSelect(client)}
                                                    onKeyDown={(e) => {
                                                        // Triggers selection when user presses Enter while focused on the item
                                                        if (e.key === "Enter") {
                                                            handleClientSelect(client);
                                                        }
                                                    }}
                                                    className={`px-3 py-2 cursor-pointer text-xs hover:bg-blue-50 focus:bg-blue-100 outline-none flex items-center justify-between ${selectedClient?.client_id === client.client_id ? "bg-blue-100" : ""}`}
                                                >
                                                    <span className="font-mono font-bold text-[#1742c4]">{client.client_id}</span>
                                                    <span className="text-slate-700 truncate ml-2">{client.client_name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {selectedClient && (
                                    <p className="text-[9px] text-green-600 mt-1 font-medium">
                                        ✓ {selectedClient.client_id} - {selectedClient.client_name}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                            <div className="flex flex-col">
                                <label className="block text-[10px] font-bold text-blue-600 uppercase mb-1">Occupation</label>
                                <select
                                    name="occupation"
                                    value={formData.occupation}
                                    onChange={handleOccupationChange}
                                    disabled={!selectedClient || clientOccupations.length === 0}
                                    tabIndex={0}
                                    className="w-full p-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-400"
                                >
                                    <option value="">
                                        {!selectedClient ? "Select a client first" : clientOccupations.length === 0 ? "No occupations available" : "Select Occupation"}
                                    </option>
                                    {clientOccupations.map((occ) => (
                                        <option key={occ} value={occ}>{occ}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col">
                                <label className="block text-[10px] font-bold text-blue-600 uppercase mb-1">Transaction Code</label>
                                 <input type="text" name="transaction_code" value={formData.transaction_code} onChange={handleChange} placeholder="Enter transaction code" className="w-full p-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div className="flex flex-col">
                                <label className="block text-[10px] font-bold text-blue-600 uppercase mb-1">Shift Type</label>
                                <select name="shift_type" value={formData.shift_type} onChange={handleChange} className="w-full p-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none">
                                    <option value="">Select Shift Type</option>
                                    <option value="Semi">Semi</option>
                                    <option value="Ad-Hoc">Ad-Hoc</option>
                                </select>
                            </div>
                        </div>

                        <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                            <div className="relative">
                                <label className="block text-[10px] font-bold text-blue-600 uppercase tracking-wider flex justify-between mb-1"><span>Employee No (CO Number)</span></label>
                                <div className="relative mt-1">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Users className="text-xs" /></div>
                                    <input type="text" id="employeeInput" placeholder="Type code e.g. CE51510" autoComplete="off" value={formData.co_number} onChange={(e) => { const value = e.target.value.toUpperCase(); setFormData({ ...formData, co_number: value }); handleEmployeeLookup(value); }} className="w-full pl-9 pr-8 py-2 border border-blue-200 rounded-lg text-xs font-mono tracking-wider focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 uppercase" />
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                        <button id="clearBtn" onClick={clearEmployeeInput} className={formData.co_number ? "text-slate-400 hover:text-slate-600" : "text-slate-400 hover:text-slate-600 hidden"}><X className="w-3.5 h-3.5" /></button>
                                    </div>
                                </div>
                            </div>

                            <div id="lookupStage" className="relative">
                                <div id="stateIdle" className={showIdleState ? "flex flex-col items-center justify-center py-4" : "hidden"}>
                                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-2"><Clock className="w-4 h-4" /></div>
                                    <h4 className="text-xs font-semibold text-slate-500">No Employee Loaded</h4>
                                    <p className="text-[10px] text-slate-400 mt-0.5">Please specify a registry ID on the left.</p>
                                </div>
                                <div id="stateError" className={showErrorState ? "flex flex-col items-center justify-center py-4" : "hidden"}>
                                    <div className="h-8 w-8 rounded-full bg-red-50 flex items-center justify-center text-red-500 mx-auto mb-2"><AlertTriangle className="w-4 h-4" /></div>
                                    <h4 className="text-xs font-bold text-red-600">ID Unregistered</h4>
                                    <p className="text-[10px] text-slate-400 mt-0.5">We could not locate this badge record in logs.</p>
                                </div>
                                <div id="stateEmployeeBadge" className={showEmployeeBadge ? "flex flex-col items-center justify-center space-y-3" : "hidden"}>
                                    <div className="bg-white border border-blue-200 rounded-lg p-3 shadow-xs relative flex items-center gap-3 w-full max-w-xs">
                                        <div id="badgeAvatar" className="h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold text-white bg-blue-600 shadow-inner flex-shrink-0">{badgeInitials}</div>
                                        <div className="flex-grow min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Active Employee</span>
                                                {badgeShiftType && <span className={`inline-flex items-center justify-center px-2 py-0.5 text-[9px] font-medium rounded-full ${badgeShiftType === "Ad-Hoc" ? "bg-amber-100 text-amber-800" : badgeShiftType === "Semi" ? "bg-indigo-100 text-indigo-800" : badgeShiftType === "Biometric" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-800"}`}>{badgeShiftType}</span>}
                                            </div>
                                            <h4 id="badgeName" className="text-xs font-bold text-slate-800 truncate uppercase tracking-tight">{badgeName}</h4>
                                            <p className="text-[10px] text-slate-500 truncate">{formData.client_name || "No client assigned"}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-[10px] w-full max-w-xs">
                                        <div className="bg-white border border-blue-200 rounded-lg p-2"><span className="text-slate-400 uppercase font-bold text-[8px] block">Role Designation</span><span id="badgeRole" className="text-slate-700 font-semibold truncate block">{badgeOccupation}</span></div>
                                        <div className="bg-white border border-blue-200 rounded-lg p-2"><span className="text-slate-400 uppercase font-bold text-[8px] block">ID Association</span><span id="badgeID" className="text-orange-500 font-bold font-mono block">{badgeId}</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50/50 pt-[5px] px-4 pb-3 rounded-lg border border-blue-100 md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                            <div className="flex flex-col">
                                <label className="block text-[10px] font-bold text-blue-600 uppercase mb-1">Override Lunch (hrs)</label>
                                <div className="relative mt-1">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Coffee className="text-xs" /></div>
                                    <input type="number" step="0.01" name="actual_lunch_hours" value={formData.actual_lunch_hours} onChange={handleChange} placeholder="e.g. 0.50" className="w-full pl-9 pr-3 py-2 border border-blue-200 rounded-md text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                                </div>
                                <p className="text-[9px] text-slate-400 mt-1">30mins = 0.50, 45mins = 0.75 · Leave blank for client default</p>
                            </div>
                            <div className="flex flex-col">
                                <label className="block text-[10px] font-bold text-blue-600 uppercase mb-1">Start Time</label>
                                <input type="time" name="start_time" value={formData.start_time} onChange={handleChange} className="w-full p-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div className="flex flex-col">
                                <label className="block text-[10px] font-bold text-blue-600 uppercase mb-1">End Time</label>
                                <input type="time" name="end_time" value={formData.end_time} onChange={handleChange} className="w-full p-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                        </div>

                        {formData.shift_type === "Biometric" && (
                            <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                                <div className="flex flex-col">
                                    <label className="block text-[10px] font-bold text-blue-600 uppercase mb-1">Total Hours (Biometric)</label>
                                    <input type="number" step="0.01" name="total_hours" value={formData.total_hours} onChange={handleChange} placeholder="e.g. 8.5" className="w-full p-2 border border-blue-200 rounded-md" />
                                </div>
                                <div className="flex flex-col">
                                    <label className="block text-[10px] font-bold text-blue-600 uppercase mb-1">Double Shift</label>
                                    <select name="isDoubleShift" value={formData.isDoubleShift ? "true" : "false"} onChange={(e) => setFormData({ ...formData, isDoubleShift: e.target.value === "true" })} className="w-full p-2 border border-blue-200 rounded-md">
                                        <option value="false">No</option>
                                        <option value="true">Yes</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </form>
                </div>

                <div className="border-t border-slate-200 mt-6 flex-shrink-0">
                    <div className="px-4 sm:px-6 md:px-8 py-4 flex flex-col-reverse sm:flex-row justify-end items-center gap-3">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors min-h-[44px] focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            Cancel
                        </button>
                        <div className="hidden sm:block w-px h-8 bg-slate-200 mx-1"></div>
                        <button
                            type="submit"
                            onClick={handleSubmit}
                            disabled={loading}
                            className="w-full sm:w-auto px-5 py-2.5 bg-[#1742c4] hover:bg-[#4F46E5] text-white text-sm font-bold rounded-lg shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <Save className="w-4 h-4" />
                            {loading ? "Saving..." : isEditMode ? "Update Timesheet" : "Save & Capture"}
                        </button>
                    </div>
                </div>

                <Snackbar open={snackbarOpen} autoHideDuration={3000} onClose={handleSnackbarClose} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
                    <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} variant="filled" sx={{ width: "100%", borderRadius: "12px" }}>{snackbarMessage}</Alert>
                </Snackbar>
            </div>
        </div>
    );
};

export default TimesheetModal;
