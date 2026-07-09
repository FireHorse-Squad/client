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
            const dayLower = dayOfWeek.toLowerCase();

            const txCode = parseInt(timesheet.transaction_code, 10);
            const isDoubleShift = timesheet.isDoubleShift;

            let normalTime = 0, overTimeHours = 0, doubleTimeHours = 0;
            let totalHours = 0;

            const isBiometric = timesheet.shift_type !== "Task" && timesheet.total_hours != null;
            const isAdHoc = timesheet.shift_type === "Ad-Hoc";

            if (isBiometric) {
                totalHours = parseFloat(timesheet.total_hours) || 0;
            } else if (timesheet.shift_type !== "Task") {
                totalHours = calculateHours(timesheet.start_time, timesheet.end_time);
            } else {
                totalHours = parseFloat(timesheet.units) || 0;
            }

            const tsOccupationRaw = timesheet.occupation || "";
            const baseOccupation = tsOccupationRaw.endsWith("2.0") ? tsOccupationRaw.slice(0, -3) : tsOccupationRaw;
            const occupation = baseOccupation || "General Worker";

            const clientRatesList = clientRates.filter(
                (r) => r.client_id?.toString().trim().toUpperCase() === timesheet.client_id?.toString().trim().toUpperCase()
            );
            let matchedRate = clientRatesList.find((r) => r.occupation?.toString().trim() === occupation) ||
                clientRatesList.find((r) => r.lookup?.toString().trim() === occupation) ||
                clientRatesList[0];

            if ((txCode === 1921 || txCode === 1922) && matchedRate) {
                doubleTimeHours = totalHours;
            } else if (txCode === 1920 && matchedRate) {
                const lunchDeduction =
                    timesheet.actual_lunch_hours !== null &&
                        timesheet.actual_lunch_hours !== undefined &&
                        timesheet.actual_lunch_hours !== ""
                        ? parseFloat(timesheet.actual_lunch_hours)
                        : parseFloat(matchedRate?.deduct_lunch_hour) || 0;
                overTimeHours = totalHours - lunchDeduction;
            } else if (timesheet.shift_type !== "Task") {
                const lunchDeduction =
                    timesheet.actual_lunch_hours !== null &&
                        timesheet.actual_lunch_hours !== undefined &&
                        timesheet.actual_lunch_hours !== ""
                        ? parseFloat(timesheet.actual_lunch_hours)
                        : parseFloat(matchedRate?.deduct_lunch_hour) || 0;
                if (isDoubleShift) {
                    normalTime = totalHours - lunchDeduction;
                } else {
                    const netHours = totalHours - lunchDeduction;
                    normalTime = Math.min(netHours, parseFloat(matchedRate?.hrs_pd) || 8);
                    overTimeHours = Math.max(0, netHours - (parseFloat(matchedRate?.hrs_pd) || 8));
                }
            } else {
                if (isAdHoc) normalTime = totalHours;
            }

            const groupKey = `${timesheet.client_id}|${occupation}`;

            if (!data[groupKey]) {
                data[groupKey] = {
                    client_id: timesheet.client_id,
                    client_name: timesheet.client_name,
                    occupation,
                    rateInfo: matchedRate,
                    hasAdHocNT: false,
                    NT: { count: 0, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 },
                    OT: { count: 0, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 },
                    DT: { count: 0, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 },
                    days: new Set(),
                };
            }
            const entry = data[groupKey];
            entry.days.add(dayLower);

            if (normalTime > 0) {
                entry.NT[dayLower] += normalTime;
                entry.NT.count += 1;
                if (isAdHoc) entry.hasAdHocNT = true;
            }
            if (overTimeHours > 0) {
                entry.OT[dayLower] += overTimeHours;
                entry.OT.count += 1;
            }
            if (doubleTimeHours > 0) {
                entry.DT[dayLower] += doubleTimeHours;
                entry.DT.count += 1;
            }
        });
    };

    const processSemiAgg = () => {
        const summaries = calculateSemiWeeklySummary(semiTimesheets, clientRates, employees, publicHolidays);
        summaries.forEach((summary) => {
            const groupKey = `${summary.co_number}|${summary.occupation}`;
            const fullRate =
                clientRates.find(
                    (r) =>
                        r.client_id?.toString().trim().toUpperCase() === summary.client_id?.toString().trim().toUpperCase() &&
                        r.occupation?.toString().trim() === summary.occupation
                ) ||
                clientRates.find(
                    (r) =>
                        r.client_id?.toString().trim().toUpperCase() === summary.client_id?.toString().trim().toUpperCase() &&
                        r.lookup?.toString().trim() === summary.occupation
                ) ||
                clientRates.find(
                    (r) =>
                        r.client_id?.toString().trim().toUpperCase() === summary.client_id?.toString().trim().toUpperCase()
                );
            if (!data[groupKey]) {
                data[groupKey] = {
                    client_id: summary.co_number,
                    client_name: summary.client_name || "",
                    occupation: summary.occupation,
                    rateInfo: fullRate,
                    hasAdHocNT: false,
                    NT: { count: 0, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 },
                    OT: { count: 0, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 },
                    DT: { count: 0, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 },
                    days: new Set(),
                };
            }
            const entry = data[groupKey];
            if (summary.normalTime > 0) {
                const daysInWeek = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
                const perDay = summary.normalTime / daysInWeek.length;
                daysInWeek.forEach(d => {
                    entry.NT[d] += perDay;
                    entry.days.add(d);
                });
                entry.NT.count += 1;
            }
            if (summary.overTime > 0) {
                const daysInWeek = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
                const perDay = summary.overTime / daysInWeek.length;
                daysInWeek.forEach(d => {
                    entry.OT[d] += perDay;
                    entry.days.add(d);
                });
                entry.OT.count += 1;
            }
        });
    };

    if (semiTimesheets.length > 0) {
        processSemiAgg();
    }
    if (nonSemiTimesheets.length > 0) {
        processNonSemi();
    }

    const typeOrder = { NT: 0, OT: 1, DT: 2 };
    const rows = Object.entries(data)
        .flatMap(([key, entry]) => {
            const types = ["NT", "OT", "DT"].filter(t => entry[t].count > 0);
            return types.map(type => {
                const rateInfo = entry.rateInfo || {};
                let rate = 0;
                let invoiceRate = 0;
                if (type === "NT") {
                    rate = entry.hasAdHocNT ? parseFloat(rateInfo.sub_total_a) || 0 : parseFloat(rateInfo.nt_hourly_rate) || 0;
                    invoiceRate = parseFloat(rateInfo.nt_invoice_rate) || 0;
                } else if (type === "OT") {
                    rate = parseFloat(rateInfo.ot_1_5_rate) || 0;
                    invoiceRate = parseFloat(rateInfo.ot_1_5_invoice_rate) || 0;
                } else if (type === "DT") {
                    rate = parseFloat(rateInfo.ot_2_0_rate) || 0;
                    invoiceRate = parseFloat(rateInfo.ot_2_0_invoice_rate) || 0;
                }
                return { key, entry, type, rate, invoiceRate };
            });
        })
        .sort((a, b) => {
            const nameA = a.entry.client_name || a.entry.client_id || "";
            const nameB = b.entry.client_name || b.entry.client_id || "";
            const cmp = nameA.localeCompare(nameB);
            if (cmp !== 0) return cmp;
            return (typeOrder[a.type] || 0) - (typeOrder[b.type] || 0);
        });

    return { data: rows, dates };
};

const formatDayValue = (val) => val > 0.005 ? val.toFixed(2) : "0.00";

const getOccupationDisplay = (row) => {
    return row.entry.occupation;
};


const getRowTotal = (row) => {
    const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
    return days.reduce((sum, d) => sum + getDayHours(row, d), 0);
};

const getDayHours = (row, dayKey) => {
    const typeHour = row.type === "NT" ? row.entry.NT : row.type === "OT" ? row.entry.OT : row.entry.DT;
    return typeHour[dayKey] || 0;
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
        const unsubscribe = onDataChange(() => {
            if (document.visibilityState === 'visible') fetchData();
        });
        return () => {
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

    const handleDownload = async () => {
        setDownloading(true);
        const element = pdfRef.current;

        // 1. Save original styles to restore them later
        const originalStyle = element.style.cssText;
        const originalWidth = element.style.width;


        element.style.transform = "scale(0.7)";
        element.style.transformOrigin = "top left";
        element.style.width = "142%";

        const opt = {
            margin: 5,
            filename: `Costing_Schedule_${activeClientName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`,
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                windowWidth: element.scrollWidth
            },
            jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
        };

        try {
            // 3. Trigger the PDF generation
            await html2pdf().set(opt).from(element).save();
        } catch (err) {
            console.error("PDF generation failed:", err);
        } finally {
            // 4. Restore original styles so the UI on the screen looks normal again
            element.style.cssText = originalStyle;
            element.style.width = originalWidth;
            setDownloading(false);
        }
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
            const typeHours = row.type === "NT" ? row.entry.NT : row.type === "OT" ? row.entry.OT : row.entry.DT;
            const rowHrs = typeHours.mon + typeHours.tue + typeHours.wed + typeHours.thu + typeHours.fri + typeHours.sat + typeHours.sun;
            monTot += typeHours.mon;
            tueTot += typeHours.tue;
            wedTot += typeHours.wed;
            thuTot += typeHours.thu;
            friTot += typeHours.fri;
            satTot += typeHours.sat;
            sunTot += typeHours.sun;
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
            <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-100/60 border border-slate-100">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    <div className="flex items-start gap-4 flex-1">
                        <div>
                            <h2 className="text-1xl font-bold text-slate-800">Cost Centre</h2>
                            <p className="text-[16px] text-slate-400 mt-0.5 max-w-sm">
                                Select a client name and cost center
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
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
                                        <th colSpan="2" className="px-4 py-2.5 text-[10px] font-black tracking-widest text-slate-200 border-r border-slate-700/50 uppercase">Resource Particulars</th>
                                        <th colSpan="7" className="px-4 py-2.5 text-center text-[10px] font-black tracking-widest text-slate-200 border-r border-slate-700/50 uppercase bg-indigo-950/40">Weekly Hours Breakdown</th>
                                        <th colSpan="5" className="px-4 py-2.5 text-right text-[10px] font-black tracking-widest text-slate-200 uppercase">Costing & Billing Rates (R)</th>
                                    </tr>
                                    <tr className="bg-[#2D328F]/95 text-[11px] font-bold text-white uppercase tracking-wider sticky top-0 z-10 border-b border-slate-700">
                                        <th className="px-5 py-3.5 min-w-[240px] sticky left-0 bg-[#2D328F] z-20 shadow-[2px_0_5px_rgba(0,0,0,0.15)]">Role / Description</th>
                                        <th className="px-4 py-3.5 min-w-[110px] border-r border-indigo-900/40">Total Emp</th>
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
                                <tbody className="divide-y divide-slate-100 text-xs text-slncreateate-600 font-medium">
                                    {data.map((row, index) => {
                                        const totalRowHrs = getRowTotal(row);
                                        const rowRate = row.rate;
                                        const rowCost = totalRowHrs * rowRate;
                                        const rowCharge = totalRowHrs * row.invoiceRate;
                                        const isSmoke = index % 2 === 0;
                                        const rowBg = isSmoke ? "bg-[#F9FAFC] hover:bg-slate-100/80" : "bg-white hover:bg-slate-50";
                                        const dayVal = (d) => formatDayValue(getDayHours(row, d));
                                        const selfCount = row.type === "NT" ? row.entry.NT.count : row.type === "OT" ? row.entry.OT.count : row.type === "DT" ? row.entry.DT.count : 0;

                                        return (
                                            <tr key={row.key + "-" + row.type} className={`${rowBg} transition-all duration-150`}>
                                                <td className={`px-5 py-3.5 text-slate-800 font-bold sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)] ${isSmoke ? "bg-[#F9FAFC]" : "bg-white"} flex flex-col gap-0.5`}>
                                                    <span>{getOccupationDisplay(row)}</span>
                                                    <span className="text-[10px] font-normal text-slate-400">[{row.type}]</span>
                                                </td>
                                                <td className="px-4 py-3.5 border-r border-slate-100 text-[#22C55E] font-semibold">
                                                    {selfCount}
                                                </td>
                                                <td className={`px-3 py-3.5 text-center font-mono ${row.entry.NT.mon + row.entry.OT.mon + row.entry.DT.mon > 0 ? "text-slate-900 font-bold" : "text-slate-300"}`}>{dayVal("mon")}</td>
                                                <td className={`px-3 py-3.5 text-center font-mono ${row.entry.NT.tue + row.entry.OT.tue + row.entry.DT.tue > 0 ? "text-slate-900 font-bold" : "text-slate-300"}`}>{dayVal("tue")}</td>
                                                <td className={`px-3 py-3.5 text-center font-mono ${row.entry.NT.wed + row.entry.OT.wed + row.entry.DT.wed > 0 ? "text-slate-900 font-bold" : "text-slate-300"}`}>{dayVal("wed")}</td>
                                                <td className={`px-3 py-3.5 text-center font-mono ${row.entry.NT.thu + row.entry.OT.thu + row.entry.DT.thu > 0 ? "text-slate-900 font-bold" : "text-slate-300"}`}>{dayVal("thu")}</td>
                                                <td className={`px-3 py-3.5 text-center font-mono ${row.entry.NT.fri + row.entry.OT.fri + row.entry.DT.fri > 0 ? "text-slate-900 font-bold" : "text-slate-300"}`}>{dayVal("fri")}</td>
                                                <td className={`px-3 py-3.5 text-center font-mono bg-amber-50/40 text-amber-800 ${row.entry.NT.sat + row.entry.OT.sat + row.entry.DT.sat > 0 ? "font-bold" : "text-slate-300"}`}>{dayVal("sat")}</td>
                                                <td className={`px-3 py-3.5 text-center font-mono bg-amber-50/40 text-amber-800 border-r border-slate-100 ${row.entry.NT.sun + row.entry.OT.sun + row.entry.DT.sun > 0 ? "font-bold" : "text-slate-300"}`}>{dayVal("sun")}</td>
                                                <td className="px-4 py-3.5 text-center font-black text-indigo-600 bg-indigo-50/40">{totalRowHrs.toFixed(2)}</td>
                                                <td className="px-4 py-3.5 text-right font-mono text-slate-500">R {rowRate.toFixed(2)}</td>
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
                                        <td className="px-4 py-4 border-r border-slate-200"></td>
                                        <td className="px-3 py-4 text-center font-mono">{totals.mon.toFixed(2)}</td>
                                        <td className="px-3 py-4 text-center font-mono">{totals.tue.toFixed(2)}</td>
                                        <td className="px-3 py-4 text-center font-mono">{totals.wed.toFixed(2)}</td>
                                        <td className="px-3 py-4 text-center font-mono">{totals.thu.toFixed(2)}</td>
                                        <td className="px-3 py-4 text-center font-mono">{totals.fri.toFixed(2)}</td>
                                        <td className="px-3 py-4 text-center font-mono bg-amber-100/50">{totals.sat.toFixed(2)}</td>
                                        <td className="px-3 py-4 text-center font-mono bg-amber-100/50 border-r border-slate-200">{totals.sun.toFixed(2)}</td>
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
