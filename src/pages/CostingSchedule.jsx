import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { FileText, ChevronDown, RefreshCw } from "lucide-react";
import html2pdf from "html2pdf.js";
import api from "../utils/api";
import { onDataChange } from "../utils/dataSync";
import { calculateSemiWeeklySummary } from "../components/businesslogic/businesslogic";

const getAdjustedDate = (date) => {
    if (!date) return "";
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return "";
    const adjusted = new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000);
    return adjusted.toISOString().split("T")[0];
};

const calculateHours = (timeIn, timeOut) => {
    const start = new Date(`1970-01-01T${timeIn}`);
    const end = new Date(`1970-01-01T${timeOut}`);
    let diff = (end - start) / (1000 * 60 * 60);
    if (diff <= 0) diff += 24;
    return diff;
};

const getDayOfWeek = (dateStr) => {
    const date = new Date(dateStr);
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days[date.getDay()];
};

const getWeekBounds = (dateStr) => {
    const date = new Date(dateStr);
    const day = date.getDay();
    const daysToSubtract = { 0: 6, 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 };
    const diff = daysToSubtract[day];
    const monday = new Date(date);
    monday.setDate(date.getDate() - diff);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { start: monday, end: sunday };
};

const generateWeekDates = (referenceDate) => {
    const { start } = getWeekBounds(referenceDate);
    const dates = [];
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(start);
        currentDate.setDate(start.getDate() + i);
        dates.push({ day: days[i], date: currentDate.toISOString().split("T")[0] });
    }
    return dates;
};

const processCostingData = (timesheets, clientRates, employees, publicHolidays = []) => {
    let filteredTimesheets = timesheets.filter((ts) => ts.status !== "archived");

    const semiTimesheets = filteredTimesheets.filter((ts) => ts.shift_type === "Semi");
    const nonSemiTimesheets = filteredTimesheets.filter((ts) => ts.shift_type !== "Semi");

    let dates = [];
    if (filteredTimesheets.length > 0) {
        const uniqueDates = [...new Set(filteredTimesheets.map((ts) => getAdjustedDate(ts.timesheet_date)).filter(Boolean))].sort();
        const referenceDate = uniqueDates[uniqueDates.length - 1];
        dates = generateWeekDates(referenceDate);
    } else {
        dates = generateWeekDates(new Date().toISOString().split("T")[0]);
    }

    const data = [];

    const processNonSemi = () => {
        nonSemiTimesheets.forEach((timesheet) => {
            const adjustedDate = getAdjustedDate(new Date(timesheet.timesheet_date));
            const dayOfWeek = getDayOfWeek(adjustedDate);

            const tsOccupationRaw = timesheet.occupation || "";
            const tsOccupation = tsOccupationRaw.endsWith("2.0") ? tsOccupationRaw.slice(0, -3) : tsOccupationRaw;

            let rate = clientRates.find(
                (r) =>
                    r.client_id?.toString().trim().toUpperCase() === timesheet.client_id?.toString().trim().toUpperCase() &&
                    r.occupation?.toString().trim() === tsOccupation
            );

            if (!rate) {
                const clientRatesList = clientRates.filter((r) => r.client_id?.toString().trim().toUpperCase() === timesheet.client_id?.toString().trim().toUpperCase());
                rate = clientRatesList.find((r) => r.lookup?.toString().trim() === tsOccupation);
            }

            if (!rate) {
                const txCode = parseInt(timesheet.transaction_code, 10);
                if (txCode === 1921 || txCode === 1922) {
                    rate = clientRates.find((r) => r.ot_2_0_rate && parseFloat(r.ot_2_0_rate) > 0);
                }
                if (!rate) {
                    rate = clientRates.find((r) => r.client_id?.toString().trim().toUpperCase() === timesheet.client_id?.toString().trim().toUpperCase());
                }
            }

            const isAdHoc = timesheet.shift_type === "Ad-Hoc";
            const isBiometric = timesheet.shift_type !== "Task" && timesheet.total_hours != null;
            const txCode = parseInt(timesheet.transaction_code, 10);

            let totalHours = 0;
            if (isBiometric) {
                totalHours = parseFloat(timesheet.total_hours) || 0;
            } else if (timesheet.shift_type !== "Task") {
                totalHours = calculateHours(timesheet.start_time, timesheet.end_time);
            } else {
                totalHours = parseFloat(timesheet.units) || 0;
            }

            let normalTime = 0, overTimeHours = 0, doubleTimeHours = 0;

            if (isBiometric) {
                const lunchDeduction =
                    timesheet.actual_lunch_hours !== null &&
                    timesheet.actual_lunch_hours !== undefined &&
                    timesheet.actual_lunch_hours !== ""
                        ? parseFloat(timesheet.actual_lunch_hours)
                        : parseFloat(rate?.deduct_lunch_hour) || 0;
                const netHours = totalHours - lunchDeduction;

                if (txCode === 1921 || txCode === 1922) {
                    doubleTimeHours = netHours;
                } else if (txCode === 1920) {
                    overTimeHours = netHours;
                } else {
                    if (isAdHoc) {
                        normalTime = netHours;
                    } else {
                        normalTime = totalHours;
                    }
                }
            } else if (timesheet.shift_type !== "Task") {
                if (timesheet.isDoubleShift) {
                    const lunchDeduction =
                        timesheet.actual_lunch_hours !== null &&
                        timesheet.actual_lunch_hours !== undefined &&
                        timesheet.actual_lunch_hours !== ""
                            ? parseFloat(timesheet.actual_lunch_hours)
                            : parseFloat(rate?.deduct_lunch_hour) || 0;
                    normalTime = totalHours - lunchDeduction;
                } else {
                    if (txCode === 1921 || txCode === 1922) {
                        const lunchDeduction =
                            timesheet.actual_lunch_hours !== null &&
                            timesheet.actual_lunch_hours !== undefined &&
                            timesheet.actual_lunch_hours !== ""
                                ? parseFloat(timesheet.actual_lunch_hours)
                                : parseFloat(rate?.deduct_lunch_hour) || 0;
                        doubleTimeHours = totalHours - lunchDeduction;
                    } else if (txCode === 1920) {
                        const lunchDeduction =
                            timesheet.actual_lunch_hours !== null &&
                            timesheet.actual_lunch_hours !== undefined &&
                            timesheet.actual_lunch_hours !== ""
                                ? parseFloat(timesheet.actual_lunch_hours)
                                : parseFloat(rate?.deduct_lunch_hour) || 0;
                        overTimeHours = totalHours - lunchDeduction;
                    } else {
                        const lunchDeduction =
                            timesheet.actual_lunch_hours !== null &&
                            timesheet.actual_lunch_hours !== undefined &&
                            timesheet.actual_lunch_hours !== ""
                                ? parseFloat(timesheet.actual_lunch_hours)
                                : parseFloat(rate?.deduct_lunch_hour) || 0;
                        const netHours = totalHours - lunchDeduction;
                        normalTime = Math.min(netHours, parseFloat(rate?.hrs_pd) || 8);
                        overTimeHours = Math.max(0, netHours - (parseFloat(rate?.hrs_pd) || 8));
                    }
                }
            }

            const occupation = timesheet.occupation || "General Worker";
            const employee = employees.find((emp) => emp.co_number?.toString().trim() === timesheet.co_number?.toString().trim());
            const employeeName = employee ? employee.full_name : "Unknown";

            if (normalTime > 0) {
                const ntRate = isAdHoc ? parseFloat(rate?.sub_total_a) || 0 : parseFloat(rate?.nt_hourly_rate) || 0;
                const ntInvoiceRate = parseFloat(rate?.nt_invoice_rate) || 0;
                data.push({
                    id: `${timesheet.id}-NT`,
                    co_number: timesheet.co_number,
                    date: adjustedDate,
                    occupation: isAdHoc ? `${occupation} Ad-Hoc` : occupation,
                    timeType: "NT",
                    rate: ntRate,
                    invoiceRate: ntInvoiceRate,
                    employeeName,
                    mon: dayOfWeek.toLowerCase() === "mon" ? normalTime : 0,
                    tue: dayOfWeek.toLowerCase() === "tue" ? normalTime : 0,
                    wed: dayOfWeek.toLowerCase() === "wed" ? normalTime : 0,
                    thu: dayOfWeek.toLowerCase() === "thu" ? normalTime : 0,
                    fri: dayOfWeek.toLowerCase() === "fri" ? normalTime : 0,
                    sat: dayOfWeek.toLowerCase() === "sat" ? normalTime : 0,
                    sun: dayOfWeek.toLowerCase() === "sun" ? normalTime : 0,
                });
            }

            if (overTimeHours > 0) {
                const otRate = parseFloat(rate?.ot_1_5_rate) || 0;
                const otInvoiceRate = parseFloat(rate?.ot_1_5_invoice_rate) || 0;
                data.push({
                    id: `${timesheet.id}-OT`,
                    co_number: timesheet.co_number,
                    date: adjustedDate,
                    occupation: `${occupation} OT`,
                    timeType: "OT",
                    rate: otRate,
                    invoiceRate: otInvoiceRate,
                    employeeName,
                    mon: dayOfWeek.toLowerCase() === "mon" ? overTimeHours : 0,
                    tue: dayOfWeek.toLowerCase() === "tue" ? overTimeHours : 0,
                    wed: dayOfWeek.toLowerCase() === "wed" ? overTimeHours : 0,
                    thu: dayOfWeek.toLowerCase() === "thu" ? overTimeHours : 0,
                    fri: dayOfWeek.toLowerCase() === "fri" ? overTimeHours : 0,
                    sat: dayOfWeek.toLowerCase() === "sat" ? overTimeHours : 0,
                    sun: dayOfWeek.toLowerCase() === "sun" ? overTimeHours : 0,
                });
            }

            if (doubleTimeHours > 0) {
                const dtRate = parseFloat(rate?.ot_2_0_rate) || 0;
                const dtInvoiceRate = parseFloat(rate?.ot_2_0_invoice_rate) || 0;
                data.push({
                    id: `${timesheet.id}-DT`,
                    co_number: timesheet.co_number,
                    date: adjustedDate,
                    occupation: `${occupation} DT`,
                    timeType: "DT",
                    rate: dtRate,
                    invoiceRate: dtInvoiceRate,
                    employeeName,
                    mon: dayOfWeek.toLowerCase() === "mon" ? doubleTimeHours : 0,
                    tue: dayOfWeek.toLowerCase() === "tue" ? doubleTimeHours : 0,
                    wed: dayOfWeek.toLowerCase() === "wed" ? doubleTimeHours : 0,
                    thu: dayOfWeek.toLowerCase() === "thu" ? doubleTimeHours : 0,
                    fri: dayOfWeek.toLowerCase() === "fri" ? doubleTimeHours : 0,
                    sat: dayOfWeek.toLowerCase() === "sat" ? doubleTimeHours : 0,
                    sun: dayOfWeek.toLowerCase() === "sun" ? doubleTimeHours : 0,
                });
            }
        });
    };

    const processSemi = () => {
        const summaries = calculateSemiWeeklySummary(semiTimesheets, clientRates, employees, publicHolidays);
        summaries.forEach((summary) => {
            if (summary.normalTime > 0) {
                data.push({
                    id: `${summary.co_number}-${summary.weekStart}-NT`,
                    co_number: summary.co_number,
                    date: summary.weekStart,
                    occupation: summary.occupation,
                    timeType: "NT",
                    rate: summary.rate,
                    invoiceRate: parseFloat(summary.rate?.nt_invoice_rate || 0),
                    employeeName: summary.employeeName,
                    mon: 0,
                    tue: 0,
                    wed: 0,
                    thu: 0,
                    fri: 0,
                    sat: 0,
                    sun: 0,
                    _weeklyTotal: summary.normalTime,
                });
            }

            if (summary.overTime > 0) {
                data.push({
                    id: `${summary.co_number}-${summary.weekStart}-OT`,
                    co_number: summary.co_number,
                    date: summary.weekStart,
                    occupation: `${summary.occupation} OT`,
                    timeType: "OT",
                    rate: summary.otRate,
                    invoiceRate: parseFloat(summary.rate?.ot_1_5_invoice_rate || 0),
                    employeeName: summary.employeeName,
                    mon: 0,
                    tue: 0,
                    wed: 0,
                    thu: 0,
                    fri: 0,
                    sat: 0,
                    sun: 0,
                    _weeklyTotal: summary.overTime,
                });
            }
        });
    };

    if (semiTimesheets.length > 0) {
        processSemi();
    }
    if (nonSemiTimesheets.length > 0) {
        processNonSemi();
    }

    return { data, dates };
};

// Premium SVG Icons
const DownloadIcon = () => (
    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
);

const RefreshIcon = () => (
    <svg className="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
);

const CalendarIcon = () => (
    <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
    </svg>
);

const DocumentIcon = () => (
    <svg className="w-10 h-10 text-indigo-600 bg-indigo-50 p-2.5 rounded-xl border border-indigo-100" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
);

export default function CostingSchedule() {
    const [allTimesheets, setAllTimesheets] = useState([]);
    const [allClientRates, setAllClientRates] = useState([]);
    const [allEmployees, setAllEmployees] = useState([]);
    const [publicHolidays, setPublicHolidays] = useState([]);
    const [selectedClientName, setSelectedClientName] = useState("");
    const [selectedClientId, setSelectedClientId] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const pdfRef = useRef(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const [timesheetsRes, clientRatesRes, employeesRes] = await Promise.all([
                api.get("/timesheets"),
                api.get("/clientrates"),
                api.get("/employees"),
            ]);
            let holidays = [];
            try {
                const phRes = await api.get("/publicholidays");
                holidays = phRes.data || [];
            } catch {
                holidays = [];
            }
            setAllTimesheets(timesheetsRes.data);
            setAllClientRates(clientRatesRes.data);
            setAllEmployees(employeesRes.data);
            setPublicHolidays(holidays);
        } catch (err) {
            console.error("Error fetching data:", err);
            setError(err.response?.data?.message || err.message || "Failed to fetch data from backend");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 86400000);
        const unsubscribe = onDataChange(() => fetchData());
        return () => {
            clearInterval(interval);
            unsubscribe();
        };
    }, [fetchData]);

    const uniqueClientNames = useMemo(() => {
        if (!allTimesheets.length) return [];
        const activeTimesheets = allTimesheets.filter((ts) => ts.status !== "archived");
        const names = [...new Set(activeTimesheets.map((ts) => ts.client_name).filter(Boolean))];
        return names.sort();
    }, [allTimesheets]);

    const nameToClientIds = useMemo(() => {
        const map = {};
        const activeTimesheets = allTimesheets.filter((ts) => ts.status !== "archived");
        activeTimesheets.forEach(ts => {
            if (!ts.client_name || !ts.client_id) return;
            const name = ts.client_name.toString().trim();
            const id = ts.client_id.toString().trim();
            if (!map[name]) map[name] = [];
            if (!map[name].includes(id)) map[name].push(id);
        });
        return map;
    }, [allTimesheets]);

    const allUniqueClientIds = useMemo(() => {
        const ids = new Set();
        const activeTimesheets = allTimesheets.filter((ts) => ts.status !== "archived");
        activeTimesheets.forEach(ts => {
            if (ts.client_id) ids.add(ts.client_id.toString().trim());
        });
        return [...ids].sort();
    }, [allTimesheets]);

    const availableClientIds = useMemo(() => {
        if (selectedClientName && nameToClientIds[selectedClientName]) {
            return nameToClientIds[selectedClientName];
        }
        return allUniqueClientIds;
    }, [selectedClientName, nameToClientIds, allUniqueClientIds]);

    const handleClientNameChange = (e) => {
        const name = e.target.value;
        setSelectedClientName(name);
        if (name) {
            const ids = nameToClientIds[name] || [];
            if (ids.length === 1) {
                setSelectedClientId(ids[0]);
            } else {
                setSelectedClientId("");
            }
        } else {
            setSelectedClientId("");
        }
    };

    const handleClientIdChange = (e) => {
        setSelectedClientId(e.target.value);
    };

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchData().then(() => setIsRefreshing(false));
    };

    const handleDownload = () => {
        if (!pdfRef.current || data.length === 0) return;
        setDownloading(true);
        const opt = {
            margin: 10,
            filename: `Costing_Schedule_${activeClientName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`,
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
        };
        html2pdf()
            .set(opt)
            .from(pdfRef.current)
            .save()
            .then(() => setDownloading(false))
            .catch(() => setDownloading(false));
    };

    const { data } = useMemo(() => {
        let filteredTimesheets = allTimesheets.filter((ts) => ts.status !== "archived");
        let filteredClientRates = allClientRates;

        if (selectedClientName) {
            filteredTimesheets = filteredTimesheets.filter(
                (ts) => ts.client_name && ts.client_name.toString().trim() === selectedClientName
            );
        }

        if (selectedClientId) {
            filteredTimesheets = filteredTimesheets.filter(
                (ts) => ts.client_id && ts.client_id.toString().trim() === selectedClientId
            );
            filteredClientRates = allClientRates.filter(
                (r) => r.client_id && r.client_id.toString().trim() === selectedClientId
            );
        }

        const result = processCostingData(filteredTimesheets, filteredClientRates, allEmployees, publicHolidays);
        return { data: result.data, dates: result.dates };
    }, [allTimesheets, allClientRates, allEmployees, publicHolidays, selectedClientName, selectedClientId]);

    const totals = useMemo(() => {
        let monTot = 0, tueTot = 0, wedTot = 0, thuTot = 0, friTot = 0, satTot = 0, sunTot = 0;
        let totalHrsSum = 0;
        let totalCostSum = 0;
        let totalChargeSum = 0;

        data.forEach(row => {
            const rowHrs = row.mon + row.tue + row.wed + row.thu + row.fri + row.sat + row.sun;
            monTot += row.mon;
            tueTot += row.tue;
            wedTot += row.wed;
            thuTot += row.thu;
            friTot += row.fri;
            satTot += row.sat;
            sunTot += row.sun;
            totalHrsSum += rowHrs;
            totalCostSum += rowHrs * row.rate;
            totalChargeSum += rowHrs * row.invoiceRate;
        });

        const profit = totalChargeSum - totalCostSum;
        const margin = totalChargeSum > 0 ? (profit / totalChargeSum) * 100 : 0;

        return {
            mon: monTot, tue: tueTot, wed: wedTot, thu: thuTot, fri: friTot, sat: satTot, sun: sunTot,
            totalHrs: totalHrsSum, cost: totalCostSum, charge: totalChargeSum, margin
        };
    }, [data]);

    const activeClientName = useMemo(() => {
        if (selectedClientId) {
            const rate = allClientRates.find(r => r.client_id?.toString().trim() === selectedClientId);
            return rate?.client_name || selectedClientId;
        }
        if (selectedClientName) return selectedClientName;
        return "All Clients";
    }, [selectedClientId, selectedClientName, allClientRates]);

    const getDayTotal = (dayKey) => data.reduce((sum, row) => sum + row[dayKey], 0);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-3" />
                    <p className="text-sm text-slate-500 font-medium">Loading costing data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                <p className="text-red-600 font-medium">Error: {error}</p>
                <button onClick={fetchData} className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition">
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col gap-8">
            {/* DRIBBBLE-STYLE FILTERS & CONTROL PANEL */}
            <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-100/60 border border-slate-100">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    <div className="flex items-start gap-4 flex-1">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">Cost Centre</h2>
                            <p className="text-lg text-slate-400 mt-0.5 max-w-sm">
                                Select a client name and cost center
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                        {/* Select Client Name Dropdown */}
                        <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Client Name</label>
                            <div className="relative">
                                <select
                                    value={selectedClientName}
                                    onChange={handleClientNameChange}
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold appearance-none cursor-pointer pr-10"
                                >
                                    <option value="">All Clients</option>
                                    {uniqueClientNames.map(name => (
                                        <option key={name} value={name}>{name}</option>
                                    ))}
                                </select>
                                <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                                    <ChevronDown className="w-4 h-4" />
                                </span>
                            </div>
                        </div>

                        {/* Select Client ID Dropdown (Cost Code Bracket) */}
                        <div className="flex flex-col gap-1.5 flex-1 min-w-[180px]">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Cost Centre</label>
                            <div className="relative">
                                <select
                                    value={selectedClientId}
                                    onChange={handleClientIdChange}
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold appearance-none cursor-pointer pr-10"
                                >
                                    <option value="">All Cost Codes</option>
                                    {availableClientIds.map(id => (
                                        <option key={id} value={id}>{id}</option>
                                    ))}
                                </select>
                                <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                                    <ChevronDown className="w-4 h-4" />
                                </span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-end gap-2 pt-5">
                            <button
                                onClick={handleRefresh}
                                disabled={isRefreshing || loading}
                                className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition-all flex items-center justify-center cursor-pointer disabled:opacity-50"
                                title="Reload Records"
                            >
                                <RefreshIcon />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* DRIBBBLE-STYLE KPI DASH CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* CARD 1: Total Hours */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-md shadow-slate-100/40 hover:translate-y-[-2px] transition-transform">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Accumulated Hours</p>
                    <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-3xl font-black text-slate-800">{totals.totalHrs.toFixed(1)}</span>
                        <span className="text-xs font-semibold text-slate-500">hrs</span>
                    </div>
                    <p className="text-[11px] text-indigo-500 font-semibold mt-2.5 flex items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mr-1.5"></span>
                        Across {data.length} schedule entries
                    </p>
                </div>

                {/* CARD 2: Total Cost */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-md shadow-slate-100/40 hover:translate-y-[-2px] transition-transform">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Costing Projection</p>
                    <div className="flex items-baseline gap-1 mt-2">
                        <span className="text-slate-400 font-bold text-lg">R</span>
                        <span className="text-3xl font-black text-slate-800">
                            {totals.cost.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                    <p className="text-[11px] text-amber-600 font-semibold mt-2.5 flex items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
                        Calculated internal expense
                    </p>
                </div>

                {/* CARD 3: Projected Invoice Charge */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-md shadow-slate-100/40 hover:translate-y-[-2px] transition-transform">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Projected Billing Invoice</p>
                    <div className="flex items-baseline gap-1 mt-2">
                        <span className="text-indigo-400 font-bold text-lg">R</span>
                        <span className="text-3xl font-black text-indigo-600">
                            {totals.charge.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                    <p className="text-[11px] text-green-600 font-semibold mt-2.5 flex items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>
                        Est. revenue generation
                    </p>
                </div>

                {/* CARD 4: Profit Margin % */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-md shadow-slate-100/40 hover:translate-y-[-2px] transition-transform">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Operating Margin</p>
                    <div className="flex items-baseline gap-1 mt-2">
                        <span className="text-3xl font-black text-slate-800">{totals.margin.toFixed(1)}</span>
                        <span className="text-xs font-bold text-slate-500">%</span>
                    </div>
                    <p className="text-[11px] text-indigo-500 font-semibold mt-2.5 flex items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mr-1.5"></span>
                        Net profitability ratio
                    </p>
                </div>
            </div>

            {/* SECTION: SCHEDULE LISTING */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-slate-800">Costing Schedule</h2>
                        <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-100">
                            {activeClientName}
                        </span>
                    </div>

                    <button
                        onClick={handleDownload}
                        disabled={data.length === 0 || downloading}
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all flex items-center justify-center cursor-pointer disabled:bg-slate-300"
                    >
                        <DownloadIcon />
                        {downloading ? "Generating PDF..." : "Download PDF Report"}
                    </button>
                </div>

                <div className="bg-white rounded-3xl shadow-xl shadow-slate-100/80 border border-slate-100/80 overflow-hidden">
                    <div className="bg-slate-50/70 border-b border-slate-100 px-6 py-4 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                        <div className="flex items-center gap-2">
                            <CalendarIcon />
                            <span className="text-xs sm:text-sm font-bold text-slate-700">{activeClientName}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">{data.length} schedule entries</span>
                    </div>

                    <div ref={pdfRef} className="overflow-x-auto overflow-y-auto max-h-[500px]">
                        {data.length === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                <div className="text-slate-300 text-5xl mb-3">📊</div>
                                <p className="font-semibold text-slate-600">No data available for this selection</p>
                                <p className="text-xs mt-1">Select a client to view the costing schedule.</p>
                            </div>
                        ) : (
                            <table className="w-full border-collapse border-spacing-0 text-left">
                                <thead>
                                    <tr className="bg-[#2D328F]">
                                        <th colSpan="3" className="px-4 py-2.5 text-[10px] font-black tracking-widest text-slate-200 border-r border-slate-700/50 uppercase">Resource Particulars</th>
                                        <th colSpan="7" className="px-4 py-2.5 text-center text-[10px] font-black tracking-widest text-slate-200 border-r border-slate-700/50 uppercase bg-indigo-950/40">Weekly Hours Breakdown</th>
                                        <th colSpan="5" className="px-4 py-2.5 text-right text-[10px] font-black tracking-widest text-slate-200 uppercase">Costing & Billing Rates (R)</th>
                                    </tr>
                                    <tr className="bg-[#2D328F]/95 text-[11px] font-bold text-white uppercase tracking-wider sticky top-0 z-10 border-b border-slate-700">
                                        <th className="px-5 py-3.5 min-w-[240px] sticky left-0 bg-[#2D328F] z-20 shadow-[2px_0_5px_rgba(0,0,0,0.15)]">Role / Description</th>
                                        <th className="px-4 py-3.5 min-w-[120px]">CO Number</th>
                                        <th className="px-4 py-3.5 min-w-[110px] border-r border-indigo-900/40">Date</th>
                                        <th className="px-3 py-3.5 text-center min-w-[65px] bg-indigo-950/25">Mon</th>
                                        <th className="px-3 py-3.5 text-center min-w-[65px] bg-indigo-950/25">Tue</th>
                                        <th className="px-3 py-3.5 text-center min-w-[65px] bg-indigo-950/25">Wed</th>
                                        <th className="px-3 py-3.5 text-center min-w-[65px] bg-indigo-950/25">Thu</th>
                                        <th className="px-3 py-3.5 text-center min-w-[65px] bg-indigo-950/25">Fri</th>
                                        <th className="px-3 py-3.5 text-center min-w-[65px] bg-amber-500/20 text-amber-200">Sat</th>
                                        <th className="px-3 py-3.5 text-center min-w-[65px] bg-amber-500/20 text-amber-200 border-r border-indigo-900/40">Sun</th>
                                        <th className="px-4 py-3.5 text-center min-w-[90px] font-black text-indigo-200">Total</th>
                                        <th className="px-4 py-3.5 text-right min-w-[100px]">Hrly Rate</th>
                                        <th className="px-4 py-3.5 text-right min-w-[110px] font-semibold text-amber-300">Cost</th>
                                        <th className="px-4 py-3.5 text-right min-w-[100px]">Inv Rate</th>
                                        <th className="px-4 py-3.5 text-right min-w-[110px] font-bold text-green-300">Charge</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs text-slate-600 font-medium">
                                    {data.map((row, index) => {
                                        const totalRowHrs = row._weeklyTotal ? row._weeklyTotal : (row.mon + row.tue + row.wed + row.thu + row.fri + row.sat + row.sun);
                                        const rowCost = totalRowHrs * row.rate;
                                        const rowCharge = totalRowHrs * row.invoiceRate;
                                        const isSmoke = index % 2 === 0;
                                        const rowBg = isSmoke ? "bg-[#F9FAFC] hover:bg-slate-100/80" : "bg-white hover:bg-slate-50";
                                        const dayVal = (d) => row[d] ? row[d].toFixed(2) : "0.00";

                                        return (
                                            <tr key={row.id} className={`${rowBg} transition-all duration-150`}>
                                                <td className={`px-5 py-3.5 text-slate-800 font-bold sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)] ${isSmoke ? "bg-[#F9FAFC]" : "bg-white"}`}>
                                                    {row.employeeName ? <span className="text-slate-900">{row.employeeName}</span> : row.occupation} <span className="text-[10px] font-normal text-slate-400 ml-1">[{row.timeType}]</span>
                                                </td>
                                                <td className="px-4 py-3.5 font-mono text-slate-500">{row.co_number}</td>
                                                <td className="px-4 py-3.5 border-r border-slate-100">{row.date}</td>
                                                <td className={`px-3 py-3.5 text-center font-mono ${row.mon > 0 ? "text-slate-900 font-bold" : "text-slate-300"}`}>{dayVal("mon")}</td>
                                                <td className={`px-3 py-3.5 text-center font-mono ${row.tue > 0 ? "text-slate-900 font-bold" : "text-slate-300"}`}>{dayVal("tue")}</td>
                                                <td className={`px-3 py-3.5 text-center font-mono ${row.wed > 0 ? "text-slate-900 font-bold" : "text-slate-300"}`}>{dayVal("wed")}</td>
                                                <td className={`px-3 py-3.5 text-center font-mono ${row.thu > 0 ? "text-slate-900 font-bold" : "text-slate-300"}`}>{dayVal("thu")}</td>
                                                <td className={`px-3 py-3.5 text-center font-mono ${row.fri > 0 ? "text-slate-900 font-bold" : "text-slate-300"}`}>{dayVal("fri")}</td>
                                                <td className={`px-3 py-3.5 text-center font-mono bg-amber-50/40 text-amber-800 ${row.sat > 0 ? "font-bold" : "text-slate-300"}`}>{dayVal("sat")}</td>
                                                <td className={`px-3 py-3.5 text-center font-mono bg-amber-50/40 text-amber-800 border-r border-slate-100 ${row.sun > 0 ? "font-bold" : "text-slate-300"}`}>{dayVal("sun")}</td>
                                                <td className="px-4 py-3.5 text-center font-black text-indigo-600 bg-indigo-50/40">{totalRowHrs.toFixed(2)}</td>
                                                <td className="px-4 py-3.5 text-right font-mono text-slate-500">R {row.rate.toFixed(2)}</td>
                                                <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-800">R {rowCost.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                <td className="px-4 py-3.5 text-right font-mono text-slate-500">R {row.invoiceRate.toFixed(2)}</td>
                                                <td className="px-4 py-3.5 text-right font-mono font-black text-slate-900 bg-green-50/25">R {rowCharge.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            </tr>
                                        );
                                    })}
                                    <tr className="bg-slate-100/90 text-slate-900 font-black text-xs border-t-2 border-slate-300">
                                        <td className="px-5 py-4 sticky left-0 bg-slate-100 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)] font-black uppercase tracking-wider text-slate-800">
                                            Grand Total
                                        </td>
                                        <td className="px-4 py-4"></td>
                                        <td className="px-4 py-4 border-r border-slate-200"></td>
                                        <td className="px-3 py-4 text-center font-mono">{getDayTotal("mon").toFixed(2)}</td>
                                        <td className="px-3 py-4 text-center font-mono">{getDayTotal("tue").toFixed(2)}</td>
                                        <td className="px-3 py-4 text-center font-mono">{getDayTotal("wed").toFixed(2)}</td>
                                        <td className="px-3 py-4 text-center font-mono">{getDayTotal("thu").toFixed(2)}</td>
                                        <td className="px-3 py-4 text-center font-mono">{getDayTotal("fri").toFixed(2)}</td>
                                        <td className="px-3 py-4 text-center font-mono bg-amber-100/50">{getDayTotal("sat").toFixed(2)}</td>
                                        <td className="px-3 py-4 text-center font-mono bg-amber-100/50 border-r border-slate-200">{getDayTotal("sun").toFixed(2)}</td>
                                        <td className="px-4 py-4 text-center font-mono bg-indigo-100 text-indigo-900 text-sm font-black">{totals.totalHrs.toFixed(2)}</td>
                                        <td className="px-4 py-4 text-right text-[10px] text-slate-400">Average Rate</td>
                                        <td className="px-4 py-4 text-right font-mono text-sm font-black text-slate-900">
                                            R {totals.cost.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-4 py-4 text-right text-[10px] text-slate-400">Average Inv</td>
                                        <td className="px-4 py-4 text-right font-mono text-sm font-black text-green-700 bg-green-100/50">
                                            R {totals.charge.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        )}
                    </div>

                    <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs text-slate-500">
                        <p>Values generated dynamically based on active hours registered under system ID.</p>
                        <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1.5 font-medium">
                                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 block"></span>
                                Active Costing: {selectedClientId || "All Cost Codes"}
                            </span>
                            <span className="flex items-center gap-1.5 font-medium">
                                <span className="w-2.5 h-2.5 rounded-full bg-green-500 block"></span>
                                Margin Ratio: {totals.margin.toFixed(1)}%
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
