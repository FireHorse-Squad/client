import * as XLSX from "xlsx";
import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { FileText, ChevronDown, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import html2pdf from "html2pdf.js";
import api from "../utils/api";
import { onDataChange } from "../utils/dataSync";
import { processCostingData } from "../components/businesslogic/costing";
import { getAdjustedDate } from "../components/businesslogic/dateUtils";
import { useAuth } from "../context/AuthContext";

const formatDateHeader = (dateStr) => {
    const date = new Date(dateStr + "T00:00:00");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${date.getDate()} ${months[date.getMonth()]}`;
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
    const { user } = useAuth();
    const [allTimesheets, setAllTimesheets] = useState([]);
    const [allClientRates, setAllClientRates] = useState([]);
    const [allEmployees, setAllEmployees] = useState([]);
    const [publicHolidays, setPublicHolidays] = useState([]);
    const [selectedClientName, setSelectedClientName] = useState("");
    const [selectedClientId, setSelectedClientId] = useState("");
    const [selectedTsNo, setSelectedTsNo] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [currentWeekStart, setCurrentWeekStart] = useState(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const pdfRef = useRef(null);
    const [costingTab, setCostingTab] = useState('schedule');
    const clientPdfRef = useRef(null);

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

    useEffect(() => {
        if (currentWeekStart) return;
        const activeTs = allTimesheets.filter((ts) => ts.status !== "archived");
        if (activeTs.length > 0) {
            const uniqueDates = [...new Set(activeTs.map((ts) => getAdjustedDate(ts.timesheet_date)).filter(Boolean))].sort();
            if (uniqueDates.length > 0) {
                setCurrentWeekStart(uniqueDates[uniqueDates.length - 1]);
            }
        } else {
            setCurrentWeekStart(new Date().toISOString().split("T")[0]);
        }
    }, [allTimesheets, currentWeekStart]);

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
        setSelectedTsNo("");
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
        setSelectedTsNo("");
    };

    const tsNumberOptions = useMemo(() => {
        let source = allTimesheets.filter((ts) => ts.status !== "archived" && ts.timesheet_number);

        if (selectedClientName) {
            source = source.filter(
                (ts) => ts.client_name && ts.client_name.toString().trim() === selectedClientName
            );
        }

        if (selectedClientId) {
            source = source.filter(
                (ts) => ts.client_id && ts.client_id.toString().trim() === selectedClientId
            );
        }

        const unique = [...new Set(source.map((ts) => ts.timesheet_number.toString()))];
        return unique.sort((a, b) => {
            const aNum = parseFloat(a);
            const bNum = parseFloat(b);
            if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
            return a.localeCompare(b);
        });
    }, [allTimesheets, selectedClientName, selectedClientId]);

    const handleTsNoChange = (e) => {
        setSelectedTsNo(e.target.value);
    };

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchData().then(() => setIsRefreshing(false));
    };

    const handlePrevWeek = () => {
        if (!currentWeekStart) return;
        const date = new Date(currentWeekStart + "T00:00:00");
        date.setDate(date.getDate() - 7);
        setCurrentWeekStart(date.toISOString().split("T")[0]);
    };

    const handleNextWeek = () => {
        if (!currentWeekStart) return;
        const date = new Date(currentWeekStart + "T00:00:00");
        date.setDate(date.getDate() + 7);
        setCurrentWeekStart(date.toISOString().split("T")[0]);
    };

    const handleDateChange = (e) => {
        const val = e.target.value;
        if (!val) return;
        const date = new Date(val + "T00:00:00");
        const day = date.getDay();
        const diff = day === 0 ? 6 : day - 1;
        date.setDate(date.getDate() - diff);
        setCurrentWeekStart(date.toISOString().split("T")[0]);
        setShowDatePicker(false);
    };

    const handleDownload = async () => {
        setDownloading(true);
        const isClientTab = costingTab === 'clientSchedule';
        const element = isClientTab ? clientPdfRef.current : pdfRef.current;

        if (!element) {
            setDownloading(false);
            return;
        }

        const outerContainer = pdfRef.current;
        const elementsToExpand = new Set([element]);
        if (outerContainer) elementsToExpand.add(outerContainer);
        elementsToExpand.forEach((el) => {
            el.style.maxHeight = "none";
            el.style.overflow = "visible";
        });

        void element.offsetHeight;

        const rowStyle = document.createElement("style");
        rowStyle.id = "pdf-row-pagebreak-style";
        rowStyle.textContent = "table { page-break-inside: auto; } table tr { page-break-inside: avoid !important; }";
        document.head.appendChild(rowStyle);

        const baseOpt = {
            margin: 5,
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                useSVGElev: true,
                allowTally: true,
                logging: false,
                windowWidth: element.scrollWidth,
            },
            jsPDF: { unit: "mm", format: [420, 297], orientation: "landscape" },
            pagebreak: { mode: "css", after: ".page-break" },
        };

        const clientNamePart = activeClientName.replace(/\s+/g, "_");
        const datePart = new Date().toISOString().split("T")[0];
        const filename = isClientTab
            ? `Client_Costing_Schedule_${clientNamePart}_${datePart}.pdf`
            : `Costing_Schedule_${clientNamePart}_${datePart}.pdf`;

        const opt = { ...baseOpt, filename };

        try {
            await html2pdf().set(opt).from(element).save();
        } catch (err) {
            console.error("PDF generation failed:", err);
        } finally {
            const injectedStyle = document.getElementById("pdf-row-pagebreak-style");
            if (injectedStyle) injectedStyle.remove();

            elementsToExpand.forEach((el) => {
                el.style.maxHeight = "";
                el.style.overflow = "";
            });

            setDownloading(false);
        }
    };

    const handleCostAllocationReport = () => {
        const unfilteredTimesheets = allTimesheets.filter((ts) => ts.status !== "archived");
        if (!unfilteredTimesheets.length) return;

        const clientNameMap = {};
        const clientRegionMap = {};
        allClientRates.forEach((r) => {
            const id = r.client_id?.toString().trim();
            const name = r.client_name?.toString().trim();
            const region = r.region?.toString().trim();
            if (id && name) clientNameMap[id] = name;
            if (id && region) clientRegionMap[id] = region;
        });

        const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

        const allResult = processCostingData(unfilteredTimesheets, allClientRates, allEmployees, publicHolidays, null, true);
        const reportData = allResult.data;

        const detailRows = reportData.map(({ entry, type, rate, invoiceRate }) => {
            const typeHours = type === "NT" ? entry.NT : type === "OT" ? entry.OT : entry.DT;
            const hours = days.reduce((sum, d) => sum + (typeHours[d] || 0), 0);
            const cost = hours * rate;
            const charge = hours * invoiceRate;
            const clientName = entry.client_name || clientNameMap[entry.client_id?.toString().trim()] || "";
            const region = clientRegionMap[entry.client_id?.toString().trim()] || "";
            return {
                Region: region,
                "Shift Type": entry.shift_type || "",
                "Timesheet No": Array.isArray(entry.tsNumber) ? entry.tsNumber.join(", ") : (entry.tsNumber || ""),
                "Employee No": entry.empNo || "",
                "Client Name": clientName,
                "Cost Centre": entry.client_id == null ? "" : entry.client_id.toString(),
                Occupation: entry.occupation || "",
                Type: type,
                Hours: parseFloat(hours.toFixed(2)),
                Rate: parseFloat(rate.toFixed(2)),
                "Invoice Rate": parseFloat(invoiceRate.toFixed(2)),
                Cost: parseFloat(cost.toFixed(2)),
                Charge: parseFloat(charge.toFixed(2)),
            };
        });

        const summaryMap = {};
        detailRows.forEach((row) => {
            const key = row["Cost Centre"];
            if (!summaryMap[key]) {
                summaryMap[key] = {
                    Region: row.Region,
                    "Shift Type": row["Shift Type"] || "",
                    "Client Name": row["Client Name"],
                    "Cost Centre": key,
                    "Total Hours": 0,
                    "Total Cost": 0,
                    "Total Charge": 0,
                };
            }
            summaryMap[key]["Total Hours"] = parseFloat((summaryMap[key]["Total Hours"] + row.Hours).toFixed(2));
            summaryMap[key]["Total Cost"] = parseFloat((summaryMap[key]["Total Cost"] + row.Cost).toFixed(2));
            summaryMap[key]["Total Charge"] = parseFloat((summaryMap[key]["Total Charge"] + row.Charge).toFixed(2));
        });
        const summaryRows = Object.values(summaryMap);

        const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
        const wsDetail = XLSX.utils.json_to_sheet(detailRows);

        wsSummary["!cols"] = [
            { wch: 16 }, { wch: 12 }, { wch: 24 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
        ];
        wsDetail["!cols"] = [
            { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 24 }, { wch: 20 }, { wch: 8 }, { wch: 12 },
            { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 },
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, wsSummary, "Cost Centre Summary");
        XLSX.utils.book_append_sheet(wb, wsDetail, "Costing Projection");
        XLSX.writeFile(wb, `Cost_Allocation_Report_${new Date().toISOString().split("T")[0]}.xlsx`);
    };

    const processClientCostingData = useCallback((rows, employees = []) => {
        const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
        const grouped = {};

        rows.forEach((row) => {
            const empNo = row.entry.empNo || "";
            const occupation = row.entry.occupation || "";
            const key = `${empNo}|${occupation}`;

            if (!grouped[key]) {
                const matchedEmployee = employees.find((emp) => (emp.co_number || "").toString().trim() === empNo.toString().trim());
                grouped[key] = {
                    empNo,
                    employeeName: matchedEmployee?.full_name || row.entry.employeeName || "",
                    occupation,
                    client_id: row.entry.client_id,
                    rateInfo: row.entry.rateInfo,
                    NT: { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 },
                    OT: { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 },
                    DT: { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 },
                };
            }

            const entry = grouped[key];
            const typeHours = row.type === "NT" ? entry.NT : row.type === "OT" ? entry.OT : entry.DT;
            days.forEach((d) => {
                typeHours[d] += row.entry[row.type][d] || 0;
            });
        });

        return Object.values(grouped).map((entry) => {
            const rateInfo = entry.rateInfo || {};
            const payRateNT = parseFloat(rateInfo.nt_hourly_rate) || 0;
            const chargeRateNT = parseFloat(rateInfo.nt_invoice_rate) || 0;
            const payRateOT = parseFloat(rateInfo.ot_1_5_rate) || 0;
            const chargeRateOT = parseFloat(rateInfo.ot_1_5_invoice_rate) || 0;
            const payRateDT = parseFloat(rateInfo.ot_2_0_rate) || 0;
            const chargeRateDT = parseFloat(rateInfo.ot_2_0_invoice_rate) || 0;

            const totalNT = days.reduce((sum, d) => sum + entry.NT[d], 0);
            const totalOT = days.reduce((sum, d) => sum + entry.OT[d], 0);
            const totalDT = days.reduce((sum, d) => sum + entry.DT[d], 0);
            const totalCharge = totalNT * chargeRateNT + totalOT * chargeRateOT + totalDT * chargeRateDT;

            return {
                empNo: entry.empNo,
                employeeName: entry.employeeName,
                occupation: entry.occupation,
                client_id: entry.client_id,
                rateInfo: entry.rateInfo,
                payRateNT,
                chargeRateNT,
                payRateOT,
                chargeRateOT,
                payRateDT,
                chargeRateDT,
                NT: entry.NT,
                OT: entry.OT,
                DT: entry.DT,
                totalNT,
                totalOT,
                totalDT,
                totalCharge,
            };
        });
    }, []);

    const { data, dates, allData, clientScheduleRawData } = useMemo(() => {
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

        if (selectedTsNo) {
            filteredTimesheets = filteredTimesheets.filter(
                (ts) => ts.timesheet_number && ts.timesheet_number.toString() === selectedTsNo
            );
        }

        const allResult = processCostingData(filteredTimesheets, filteredClientRates, allEmployees, publicHolidays, null, true, false);
        const weekResult = processCostingData(filteredTimesheets, filteredClientRates, allEmployees, publicHolidays, currentWeekStart, false, false, true);
        const clientWeekResult = processCostingData(filteredTimesheets, filteredClientRates, allEmployees, publicHolidays, currentWeekStart, false, true, true);
        return { data: weekResult.data, dates: weekResult.dates, allData: allResult.data, clientScheduleRawData: clientWeekResult.data };
    }, [allTimesheets, allClientRates, allEmployees, publicHolidays, selectedClientName, selectedClientId, selectedTsNo, currentWeekStart]);

    const clientCostingData = useMemo(() => {
        return processClientCostingData(clientScheduleRawData, allEmployees);
    }, [clientScheduleRawData, allEmployees, processClientCostingData]);

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

    const kpiTotals = useMemo(() => {
        let totalHrsSum = 0;
        let totalCostSum = 0;
        let totalChargeSum = 0;

        allData.forEach(row => {
            const typeHours = row.type === "NT" ? row.entry.NT : row.type === "OT" ? row.entry.OT : row.entry.DT;
            const rowHrs = typeHours.mon + typeHours.tue + typeHours.wed + typeHours.thu + typeHours.fri + typeHours.sat + typeHours.sun;
            totalHrsSum += rowHrs;
            totalCostSum += rowHrs * row.rate;
            totalChargeSum += rowHrs * row.invoiceRate;
        });

        const profit = totalChargeSum - totalCostSum;
        const margin = totalChargeSum > 0 ? (profit / totalChargeSum) * 100 : 0;

        return { totalHrs: totalHrsSum, cost: totalCostSum, charge: totalChargeSum, margin };
    }, [allData]);

    const activeClientName = useMemo(() => {
        if (selectedClientId) {
            const rate = allClientRates.find(r => r.client_id?.toString().trim() === selectedClientId);
            return rate?.client_name || selectedClientId;
        }
        if (selectedClientName) return selectedClientName;
        return "All Clients";
    }, [selectedClientId, selectedClientName, allClientRates]);

    const renderScheduleTable = () => {
        return (
            <table className="border-collapse border-spacing-0 text-left w-full" style={{ minWidth: "1200px" }}>
                <thead>
                    <tr className="bg-[#2D328F]">
                        <th colSpan="2" className="px-4 py-2.5 text-[10px] font-black tracking-widest text-slate-200 border-r border-slate-700/50 uppercase">{activeClientName} - {selectedClientId}</th>
                        <th colSpan="7" className="px-4 py-2.5 text-center text-[10px] font-black tracking-widest text-slate-200 border-r border-slate-700/50 uppercase bg-indigo-950/40">Weekly Hours Breakdown</th>
                        <th colSpan="5" className="px-4 py-2.5 text-right text-[10px] font-black tracking-widest text-slate-200 uppercase">Costing & Billing Rates (R)</th>
                    </tr>
                    <tr className="bg-[#2D328F]/95 text-[11px] font-bold text-white uppercase tracking-wider sticky top-0 z-10 border-b border-slate-700">
                        <th style={{ width: "120px" }} className="px-2 py-3 bg-[#2D328F] shadow-[2px_0_5px_rgba(0,0,0,0.15)] text-[10px]">TS No</th>
                        <th style={{ width: "200px" }} className="px-3 py-3 bg-[#2D328F] shadow-[2px_0_5px_rgba(0,0,0,0.15)]">Role / Description</th>
                        {dates.map((d, i) => (
                            <th key={i} style={{ width: "45px" }} className={`px-1.5 py-3 text-center bg-indigo-950/25 text-[10px] ${i >= 5 ? 'bg-amber-500/20 text-amber-200' : ''} ${i === 6 ? 'border-r border-indigo-900/40' : ''}`}>
                                {formatDateHeader(d.date)}
                            </th>
                        ))}
                        <th style={{ width: "60px" }} className="px-2 py-3 text-center font-black text-indigo-200 text-[10px]">Total</th>
                        <th style={{ width: "75px" }} className="px-2 py-3 text-right text-[10px]">Hrly Rate</th>
                        <th style={{ width: "85px" }} className="px-2 py-3 text-right font-black text-orange-200 text-[10px]">Cost</th>
                        <th style={{ width: "75px" }} className="px-2 py-3 text-right text-[10px]">Inv Rate</th>
                        <th style={{ width: "85px" }} className="px-2 py-3 text-right font-black text-emerald-200 text-[10px]">Charge</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-600 font-medium">
                    {data.map((row, index) => {
                        const totalRowHrsVal = getRowTotal(row);
                        const rowRate = row.rate;
                        const rowCost = totalRowHrsVal * rowRate;
                        const rowCharge = totalRowHrsVal * row.invoiceRate;
                        const isSmoke = index % 2 === 0;
                        const rowBg = isSmoke ? "bg-[#F9FAFC] hover:bg-slate-100/80" : "bg-white hover:bg-slate-50";
                        const dayVal = (d) => formatDayValue(getDayHours(row, d));

                        return (
                            <tr key={row.key + "-" + row.type} className={`${rowBg} transition-all duration-150`}>
                                 <td style={{ width: "120px" }} className={`px-2 py-2 text-slate-800 font-bold shadow-[2px_0_5px_rgba(0,0,0,0.02)] ${isSmoke ? "bg-[#F9FAFC]" : "bg-white"} text-center`}>
                                      <div className="flex flex-wrap gap-x-1 gap-y-0 justify-center font-mono text-[12px] leading-tight">
                                          {[...(row.timesheetNumbers || [])].sort().map((num, i) => (
                                              <span key={i}>{num}</span>
                                          ))}
                                      </div>
                                 </td>
                                 <td style={{ width: "200px" }} className={`px-3 py-2 text-slate-800 font-bold shadow-[2px_0_5px_rgba(0,0,0,0.02)] ${isSmoke ? "bg-[#F9FAFC]" : "bg-white"} flex flex-col gap-0.5`}>
                                     <span className="text-[11px]">{getOccupationDisplay(row)}</span>
                                     <span className="text-[9px] font-normal text-slate-900">[{row.type}]</span>
                                 </td>
                                 <td style={{ width: "45px" }} className={`px-2 py-2 text-center font-mono ${row.entry.NT.mon + row.entry.OT.mon + row.entry.DT.mon > 0 ? "text-slate-900 font-bold" : "text-slate-300"} text-[11px]`}>{dayVal("mon")}</td>
                                <td style={{ width: "45px" }} className={`px-2 py-2 text-center font-mono ${row.entry.NT.tue + row.entry.OT.tue + row.entry.DT.tue > 0 ? "text-slate-900 font-bold" : "text-slate-300"} text-[11px]`}>{dayVal("tue")}</td>
                                <td style={{ width: "45px" }} className={`px-2 py-2 text-center font-mono ${row.entry.NT.wed + row.entry.OT.wed + row.entry.DT.wed > 0 ? "text-slate-900 font-bold" : "text-slate-300"} text-[11px]`}>{dayVal("wed")}</td>
                                <td style={{ width: "45px" }} className={`px-2 py-2 text-center font-mono ${row.entry.NT.thu + row.entry.OT.thu + row.entry.DT.thu > 0 ? "text-slate-900 font-bold" : "text-slate-300"} text-[11px]`}>{dayVal("thu")}</td>
                                <td style={{ width: "45px" }} className={`px-2 py-2 text-center font-mono ${row.entry.NT.fri + row.entry.OT.fri + row.entry.DT.fri > 0 ? "text-slate-900 font-bold" : "text-slate-300"} text-[11px]`}>{dayVal("fri")}</td>
                                <td style={{ width: "45px" }} className={`px-2 py-2 text-center font-mono bg-amber-50/40 text-amber-800 ${row.entry.NT.sat + row.entry.OT.sat + row.entry.DT.sat > 0 ? "font-bold" : "text-slate-300"} text-[11px]`}>{dayVal("sat")}</td>
                                <td style={{ width: "45px" }} className={`px-2 py-2 text-center font-mono bg-amber-50/40 text-amber-800 border-r border-slate-100 ${row.entry.NT.sun + row.entry.OT.sun + row.entry.DT.sun > 0 ? "font-bold" : "text-slate-300"} text-[11px]`}>{dayVal("sun")}</td>
                                <td style={{ width: "60px" }} className="px-2 py-2 text-center font-black text-indigo-600 bg-indigo-50/40 text-[11px]">{totalRowHrsVal.toFixed(2)}</td>
                                <td style={{ width: "75px" }} className="px-2 py-2 text-right font-mono font-bold text-slate-900 text-[11px]">R {rowRate.toFixed(2)}</td>
                                <td style={{ width: "85px" }} className="px-2 py-2 text-right font-mono font-black text-slate-900 bg-orange-50/40 text-[11px]">R {rowCost.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td style={{ width: "75px" }} className="px-2 py-2 text-right font-mono font-bold text-slate-900 text-[11px]">R {row.invoiceRate.toFixed(2)}</td>
                                <td style={{ width: "85px" }} className="px-2 py-2 text-right font-mono font-black text-slate-900 bg-emerald-50/40 text-[11px]">R {rowCharge.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                        );
                    })}
                    <tr className="bg-slate-100/90 text-slate-900 font-black text-xs border-t-2 border-slate-300">
                        <td style={{ width: "120px" }} className="px-2 py-2.5 bg-slate-100 shadow-[2px_0_5px_rgba(0,0,0,0.05)]"></td>
                        <td style={{ width: "200px" }} className="px-3 py-2.5 bg-slate-100 shadow-[2px_0_5px_rgba(0,0,0,0.05)] font-black uppercase tracking-wider text-slate-800">
                            Grand Total
                        </td>
                        <td style={{ width: "45px" }} className="px-2 py-2.5 text-center font-mono">{totals.mon.toFixed(2)}</td>
                        <td style={{ width: "45px" }} className="px-2 py-2.5 text-center font-mono">{totals.tue.toFixed(2)}</td>
                        <td style={{ width: "45px" }} className="px-2 py-2.5 text-center font-mono">{totals.wed.toFixed(2)}</td>
                        <td style={{ width: "45px" }} className="px-2 py-2.5 text-center font-mono">{totals.thu.toFixed(2)}</td>
                        <td style={{ width: "45px" }} className="px-2 py-2.5 text-center font-mono">{totals.fri.toFixed(2)}</td>
                        <td style={{ width: "45px" }} className="px-2 py-2.5 text-center font-mono bg-amber-100/50">{totals.sat.toFixed(2)}</td>
                        <td style={{ width: "45px" }} className="px-2 py-2.5 text-center font-mono bg-amber-100/50 border-r border-slate-200">{totals.sun.toFixed(2)}</td>
                        <td style={{ width: "60px" }} className="px-2 py-2.5 text-center font-mono bg-indigo-100 text-indigo-900 text-[11px] font-black">{totals.totalHrs.toFixed(2)}</td>
                        <td style={{ width: "75px" }} className="px-2 py-2.5 text-right text-[9px] text-slate-400">Average Rate</td>
                        <td style={{ width: "85px" }} className="px-2 py-2.5 text-right font-mono text-[11px] font-black text-slate-900 bg-orange-100">
                            R {totals.cost.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ width: "75px" }} className="px-2 py-2.5 text-right text-[9px] text-slate-400">Average Inv</td>
                        <td style={{ width: "85px" }} className="px-2 py-2.5 text-right font-mono text-[11px] font-black text-slate-900 bg-emerald-100">
                            R {totals.charge.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                    </tr>
                </tbody>
            </table>
        );
    };

    const renderClientCostingTable = () => {
        const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
        const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        const clientRows = clientCostingData;
        const fmt = (val) => val > 0.005 ? val.toFixed(2) : "0.00";

        let grandTotalNT = 0;
        let grandTotalOT = 0;
        let grandTotalDT = 0;
        let grandTotalCharge = 0;
        let grandTotalNTCharge = 0;
        let grandTotalOTCharge = 0;
        let grandTotalDTCharge = 0;

        days.forEach((d) => {
            grandTotalNT += clientRows.reduce((sum, r) => sum + (r.NT[d] || 0), 0);
            grandTotalOT += clientRows.reduce((sum, r) => sum + (r.OT[d] || 0), 0);
            grandTotalDT += clientRows.reduce((sum, r) => sum + (r.DT[d] || 0), 0);
        });
        grandTotalCharge = clientRows.reduce((sum, r) => sum + r.totalCharge, 0);
        grandTotalNTCharge = clientRows.reduce((sum, r) => sum + (r.totalNT * r.chargeRateNT), 0);
        grandTotalOTCharge = clientRows.reduce((sum, r) => sum + (r.totalOT * r.chargeRateOT), 0);
        grandTotalDTCharge = clientRows.reduce((sum, r) => sum + (r.totalDT * r.chargeRateDT), 0);

        return (
            <div ref={clientPdfRef} className="overflow-x-auto">
                    <table className="border-collapse border-spacing-0 text-left w-full" style={{ minWidth: "1100px" }}>
                        <thead>
                            <tr className="bg-[#2D328F]">
                                <th colSpan="3" className="px-3 py-2.5 text-[10px] font-black tracking-widest text-slate-200 border-r border-slate-700/50 uppercase">Employee Info</th>
                                <th colSpan="3" className="px-3 py-2.5 text-center text-[10px] font-black tracking-widest text-slate-200 border-r border-slate-700/50 uppercase">Charge Rates (R)</th>
                                <th colSpan="13" className="px-3 py-2.5 text-center text-[10px] font-black tracking-widest text-slate-200 border-r border-slate-700/50 uppercase">Daily Hours Breakdown</th>
                                <th colSpan="3" className="px-3 py-2.5 text-center text-[10px] font-black tracking-widest text-slate-200 border-r border-slate-700/50 uppercase">Total Hours</th>
                                <th colSpan="3" className="px-3 py-2.5 text-center text-[10px] font-black tracking-widest text-slate-200 border-r border-slate-700/50 uppercase">Charge Rates (R)</th>
                                <th className="px-3 py-2.5 text-right text-[10px] font-black tracking-widest text-slate-200 uppercase">Total Charge</th>
                            </tr>
                            <tr className="bg-[#2D328F]/95 text-[10px] font-bold text-white uppercase tracking-wider sticky top-0 z-10 border-b border-slate-700">
                                <th style={{ width: "110px" }} className="px-2 py-2.5 bg-[#2D328F] text-[9px]">Employee Name</th>
                                <th style={{ width: "55px" }} className="px-2 py-2.5 bg-[#2D328F] text-[9px]">Emp No</th>
                                <th style={{ width: "95px" }} className="px-2 py-2.5 bg-[#2D328F] text-[9px]">Position</th>
                                <th style={{ width: "50px" }} className="px-1.5 py-2.5 text-right bg-[#2D328F] text-[9px] bg-orange-900/20 text-orange-100">Chg NT</th>
                                <th style={{ width: "50px" }} className="px-1.5 py-2.5 text-right bg-[#2D328F] text-[9px] bg-orange-900/20 text-orange-100">Chg OT</th>
                                <th style={{ width: "50px" }} className="px-1.5 py-2.5 text-right bg-[#2D328F] text-[9px] border-r border-slate-700/40 bg-orange-900/20 text-orange-100">Chg DT</th>
                            {dayLabels.map((label, i) => (
                                <th key={label} colSpan={i === 6 ? 1 : 2} style={{ width: i === 6 ? "38px" : "72px" }} className={`px-1.5 py-2.5 text-center bg-indigo-950/25 text-[9px] ${i >= 5 ? 'bg-amber-500/20 text-amber-200' : ''} ${i === 6 ? 'border-r border-indigo-900/40' : ''}`}>
                                    {label}
                                </th>
                            ))}
                                <th style={{ width: "40px" }} className="px-1.5 py-2.5 text-center font-black text-indigo-200 text-[9px]">N/T</th>
                                <th style={{ width: "40px" }} className="px-1.5 py-2.5 text-center font-black text-indigo-200 text-[9px]">O/T</th>
                                <th style={{ width: "40px" }} className="px-1.5 py-2.5 text-center font-black text-indigo-200 text-[9px] border-r border-slate-700/40">D/T</th>
                                <th style={{ width: "50px" }} className="px-1.5 py-2.5 text-right text-[9px]">Chg NT</th>
                                <th style={{ width: "50px" }} className="px-1.5 py-2.5 text-right text-[9px]">Chg OT</th>
                                <th style={{ width: "50px" }} className="px-1.5 py-2.5 text-right text-[9px] border-r border-slate-700/40">Chg DT</th>
                                <th style={{ width: "68px" }} className="px-2 py-2.5 text-right font-black text-emerald-200 text-[9px]">Total</th>
                            </tr>
                        <tr className="bg-[#2D328F]/80 text-[9px] font-bold text-white uppercase tracking-wider border-b border-slate-700">
                            <th style={{ width: "80px" }} className="px-1.5 py-1 bg-[#2D328F]"></th>
                            <th style={{ width: "45px" }} className="px-1.5 py-1 bg-[#2D328F]"></th>
                            <th style={{ width: "70px" }} className="px-1.5 py-1 bg-[#2D328F]"></th>
                            <th style={{ width: "40px" }} className="px-1 py-1 text-right bg-[#2D328F]">NT</th>
                            <th style={{ width: "40px" }} className="px-1 py-1 text-right bg-[#2D328F]">OT</th>
                            <th style={{ width: "40px" }} className="px-1 py-1 text-right bg-[#2D328F] border-r border-slate-700/40">DT</th>
                            {dayLabels.map((label, i) => (
                                <th key={label + "-sub"} colSpan={i === 6 ? 1 : 2} style={{ width: i === 6 ? "30px" : "58px" }} className={`px-1 py-1 text-center bg-indigo-950/30 text-[8px] ${i >= 5 ? 'bg-amber-500/15' : ''}`}>
                                    {i === 6 ? "D/T" : "N/T O/T"}
                                </th>
                            ))}
                            <th style={{ width: "32px" }} className="px-1 py-1 text-center bg-[#2D328F]">Hrs</th>
                            <th style={{ width: "32px" }} className="px-1 py-1 text-center bg-[#2D328F]">Hrs</th>
                            <th style={{ width: "32px" }} className="px-1 py-1 text-center bg-[#2D328F] border-r border-slate-700/40">Hrs</th>
                            <th style={{ width: "40px" }} className="px-1 py-1 text-right bg-[#2D328F]">R</th>
                            <th style={{ width: "40px" }} className="px-1 py-1 text-right bg-[#2D328F]">R</th>
                            <th style={{ width: "40px" }} className="px-1 py-1 text-right bg-[#2D328F] border-r border-slate-700/40">R</th>
                            <th style={{ width: "55px" }} className="px-1.5 py-1 text-right bg-[#2D328F]">R</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-600 font-medium">
                        {clientRows.map((row, index) => {
                            const isSmoke = index % 2 === 0;
                            const rowBg = isSmoke ? "bg-[#F9FAFC] hover:bg-slate-100/80" : "bg-white hover:bg-slate-50";
                            const fmt = (val) => val > 0.005 ? val.toFixed(2) : "0.00";

                            return (
                                <tr key={row.empNo + "-" + row.occupation} className={`${rowBg} transition-all duration-150`}>
                                    <td style={{ width: "110px" }} className={`px-2 py-2 text-slate-800 font-bold ${isSmoke ? "bg-[#F9FAFC]" : "bg-white"} text-[11px]`}>
                                        {row.employeeName || "-"}
                                    </td>
                                    <td style={{ width: "55px" }} className={`px-2 py-2 text-slate-800 font-bold ${isSmoke ? "bg-[#F9FAFC]" : "bg-white"} text-center font-mono text-[11px]`}>
                                        {row.empNo || "-"}
                                    </td>
                                    <td style={{ width: "95px" }} className={`px-2 py-2 text-slate-800 font-bold ${isSmoke ? "bg-[#F9FAFC]" : "bg-white"} text-[11px]`}>
                                        {row.occupation || "-"}
                                    </td>
                                    <td style={{ width: "50px" }} className={`px-1.5 py-2 text-right font-mono bg-orange-50/40 ${row.chargeRateNT > 0 ? "text-slate-900 font-bold" : "text-slate-300"} text-[10px]`}>R {row.chargeRateNT.toFixed(2)}</td>
                                    <td style={{ width: "50px" }} className={`px-1.5 py-2 text-right font-mono bg-orange-50/40 ${row.chargeRateOT > 0 ? "text-slate-900 font-bold" : "text-slate-300"} text-[10px]`}>R {row.chargeRateOT.toFixed(2)}</td>
                                    <td style={{ width: "50px" }} className={`px-1.5 py-2 text-right font-mono bg-orange-50/40 border-r border-slate-100 ${row.chargeRateDT > 0 ? "text-slate-900 font-bold" : "text-slate-300"} text-[10px]`}>R {row.chargeRateDT.toFixed(2)}</td>
                                    {days.map((d) => (
                                        <React.Fragment key={d}>
                                            {d !== "sun" ? (
                                                <>
                                                    <td style={{ width: "36px" }} className={`px-1.5 py-2 text-center font-mono ${(row.NT[d] || 0) > 0 ? "text-slate-900 font-bold" : "text-slate-300"} text-[10px]`}>{fmt(row.NT[d] || 0)}</td>
                                                    <td style={{ width: "36px" }} className={`px-1.5 py-2 text-center font-mono ${(row.OT[d] || 0) > 0 ? "text-slate-900 font-bold" : "text-slate-300"} text-[10px]`}>{fmt(row.OT[d] || 0)}</td>
                                                </>
                                            ) : (
                                                <td style={{ width: "38px" }} className={`px-1.5 py-2 text-center font-mono ${(row.DT[d] || 0) > 0 ? "text-slate-900 font-bold" : "text-slate-300"} text-[10px]`}>{fmt(row.DT[d] || 0)}</td>
                                            )}
                                        </React.Fragment>
                                    ))}
                                    <td style={{ width: "40px" }} className="px-1.5 py-2 text-center font-black text-indigo-600 bg-indigo-50/30 text-[10px]">{fmt(row.totalNT)}</td>
                                    <td style={{ width: "40px" }} className="px-1.5 py-2 text-center font-black text-indigo-600 bg-indigo-50/30 text-[10px]">{fmt(row.totalOT)}</td>
                                    <td style={{ width: "40px" }} className="px-1.5 py-2 text-center font-black text-indigo-600 bg-indigo-50/30 border-r border-slate-200 text-[10px]">{fmt(row.totalDT)}</td>
                                    <td style={{ width: "50px" }} className="px-1.5 py-2 text-right font-mono font-bold text-slate-900 text-[10px]">R {(row.totalNT * row.chargeRateNT).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td style={{ width: "50px" }} className="px-1.5 py-2 text-right font-mono font-bold text-slate-900 text-[10px]">R {(row.totalOT * row.chargeRateOT).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td style={{ width: "50px" }} className={`px-1.5 py-2 text-right font-mono font-bold text-slate-900 border-r border-slate-200 text-[10px]`}>R {(row.totalDT * row.chargeRateDT).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td style={{ width: "68px" }} className="px-2 py-2 text-right font-mono font-black text-slate-900 bg-emerald-50/40 text-[10px]">R {row.totalCharge.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                </tr>
                            );
                        })}
                        {clientRows.length > 0 && (
                            <tr className="bg-slate-100/90 text-slate-900 font-black text-xs border-t-2 border-slate-300">
                                <td style={{ width: "110px" }} className="px-2 py-2.5 bg-slate-100 shadow-[2px_0_5px_rgba(0,0,0,0.05)]"></td>
                                <td style={{ width: "55px" }} className="px-2 py-2.5 bg-slate-100 shadow-[2px_0_5px_rgba(0,0,0,0.05)]"></td>
                                <td style={{ width: "95px" }} className="px-2 py-2.5 bg-slate-100 shadow-[2px_0_5px_rgba(0,0,0,0.05)] font-black uppercase tracking-wider text-slate-800">
                                    Grand Total
                                </td>
                                <td style={{ width: "50px" }} className="px-1.5 py-2.5 bg-slate-100"></td>
                                <td style={{ width: "50px" }} className="px-1.5 py-2.5 bg-slate-100"></td>
                                <td style={{ width: "50px" }} className="px-1.5 py-2.5 bg-slate-100 border-r border-slate-200"></td>
                                {days.map((d) => (
                                    <React.Fragment key={d}>
                                        {d !== "sun" ? (
                                            <>
                                                <td style={{ width: "36px" }} className={`px-1.5 py-2.5 text-center font-mono ${grandTotalNT > 0 ? "font-black text-slate-900" : "text-slate-400"} text-[10px]`}>{fmt(grandTotalNT > 0 ? (clientRows.reduce((sum, r) => sum + (r.NT[d] || 0), 0)) : 0)}</td>
                                                <td style={{ width: "36px" }} className={`px-1.5 py-2.5 text-center font-mono ${grandTotalOT > 0 ? "font-black text-slate-900" : "text-slate-400"} text-[10px]`}>{fmt(grandTotalOT > 0 ? (clientRows.reduce((sum, r) => sum + (r.OT[d] || 0), 0)) : 0)}</td>
                                            </>
                                        ) : (
                                            <td style={{ width: "38px" }} className={`px-1.5 py-2.5 text-center font-mono ${grandTotalDT > 0 ? "font-black text-slate-900" : "text-slate-400"} text-[10px]`}>{fmt(grandTotalDT > 0 ? (clientRows.reduce((sum, r) => sum + (r.DT[d] || 0), 0)) : 0)}</td>
                                        )}
                                    </React.Fragment>
                                ))}
                                <td style={{ width: "40px" }} className="px-1.5 py-2.5 text-center font-mono bg-indigo-100 text-indigo-900 text-[10px] font-black">{fmt(grandTotalNT)}</td>
                                <td style={{ width: "40px" }} className="px-1.5 py-2.5 text-center font-mono bg-indigo-100 text-indigo-900 text-[10px] font-black">{fmt(grandTotalOT)}</td>
                                <td style={{ width: "40px" }} className="px-1.5 py-2.5 text-center font-mono bg-indigo-100 border-r border-slate-200 text-[10px] font-black">{fmt(grandTotalDT)}</td>
                                <td style={{ width: "50px" }} className="px-1.5 py-2.5 text-right font-mono bg-slate-100 text-[10px] font-black text-slate-900">R {grandTotalNTCharge.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td style={{ width: "50px" }} className="px-1.5 py-2.5 text-right font-mono bg-slate-100 text-[10px] font-black text-slate-900">R {grandTotalOTCharge.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td style={{ width: "50px" }} className="px-1.5 py-2.5 text-right font-mono bg-slate-100 border-r border-slate-200 text-[10px] font-black text-slate-900">R {grandTotalDTCharge.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td style={{ width: "68px" }} className="px-2 py-2.5 text-right font-mono text-[11px] font-black text-slate-900 bg-emerald-100">
                                    R {grandTotalCharge.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        );
    };

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

                        <div className="flex flex-col gap-1.5 flex-1 min-w-[180px]">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Filter by Timesheet No</label>
                            <div className="relative">
                                <select
                                    value={selectedTsNo}
                                    onChange={handleTsNoChange}
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold appearance-none cursor-pointer pr-10"
                                >
                                    <option value="">All</option>
                                    {tsNumberOptions.map(num => (
                                        <option key={num} value={num}>{num}</option>
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
                        <span className="text-3xl font-black text-slate-800">{kpiTotals.totalHrs.toFixed(1)}</span>
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
                            {kpiTotals.cost.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                            {kpiTotals.charge.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                        <span className="text-3xl font-black text-slate-800">{kpiTotals.margin.toFixed(1)}</span>
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

                    <div className="flex items-center gap-3">
                        {user?.role === 'Account Manager' && (
                            <button
                                onClick={handleCostAllocationReport}
                                disabled={data.length === 0}
                                className="px-4 py-2.5 bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition-all flex items-center justify-center cursor-pointer disabled:bg-slate-100 disabled:text-slate-400"
                            >
                                <FileText className="w-4 h-4 mr-2" />
                                Cost Allocation Report
                            </button>
                        )}
                        <button
                            onClick={handleDownload}
                            disabled={data.length === 0 || downloading}
                            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all flex items-center justify-center cursor-pointer disabled:bg-slate-300"
                        >
                            <DownloadIcon />
                            {downloading ? "Generating PDF..." : (costingTab === 'clientSchedule' ? "Download Client Costing PDF" : "Download PDF Report")}
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-3xl shadow-xl shadow-slate-100/80 border border-slate-100/80">
                    <div className="px-6 border-b border-slate-100 flex items-center gap-6">
                        <button
                            onClick={() => setCostingTab('schedule')}
                            className={`pb-3 text-sm font-semibold transition ${costingTab === 'schedule'
                                    ? "border-b-4 border-[#1742c4] text-[#1742c4]"
                                    : "text-slate-400 hover:text-slate-600"
                                }`}
                        >
                            Costing Schedule
                        </button>
                        <button
                            onClick={() => setCostingTab('clientSchedule')}
                            className={`pb-3 text-sm font-semibold transition ${costingTab === 'clientSchedule'
                                    ? "border-b-4 border-[#1742c4] text-[#1742c4]"
                                    : "text-slate-400 hover:text-slate-600"
                                }`}
                        >
                            Client Costing Schedule
                        </button>
                    </div>
                    <div className="bg-slate-50/70 border-b border-slate-100 px-6 py-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                        <div className="flex items-center gap-2">
                            <CalendarIcon />
                            <span className="text-xs sm:text-sm font-bold text-slate-700">{activeClientName}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handlePrevWeek}
                                disabled={!currentWeekStart}
                                className="p-1.5 bg-white hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 transition-all flex items-center justify-center cursor-pointer disabled:opacity-40"
                                title="Previous Week"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-xs font-bold text-slate-700 min-w-[140px] text-center">
                                {dates.length > 0 ? `${formatDateHeader(dates[0].date)} - ${formatDateHeader(dates[6].date)}` : ""}
                            </span>
                            <button
                                onClick={handleNextWeek}
                                disabled={!currentWeekStart}
                                className="p-1.5 bg-white hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 transition-all flex items-center justify-center cursor-pointer disabled:opacity-40"
                                title="Next Week"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                            <div className="relative">
                                <button
                                    onClick={() => setShowDatePicker((prev) => !prev)}
                                    disabled={!currentWeekStart}
                                    className="p-1.5 bg-white hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 transition-all flex items-center justify-center cursor-pointer disabled:opacity-40"
                                    title="Pick a date to jump to that week"
                                >
                                    <CalendarIcon />
                                </button>
                                {showDatePicker && currentWeekStart && (
                                    <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-2 z-50">
                                        <input
                                            type="date"
                                            value={currentWeekStart}
                                            onChange={handleDateChange}
                                            className="text-xs font-bold text-slate-700 border border-slate-200 rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                                        />
                                    </div>
                                )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">{data.length} schedule entries</span>
                            <span className="text-[10px] text-slate-400">·</span>
                            <span className="text-[10px] text-slate-500 font-medium">Table: selected week only</span>
                        </div>
                    </div>

                    <div ref={pdfRef} className="overflow-auto max-h-[50vh] lg:max-h-[70vh]">
                        {data.length === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                <div className="text-slate-300 text-5xl mb-3">📊</div>
                                <p className="font-semibold text-slate-600">No data available for this selection</p>
                                <p className="text-xs mt-1">Select a client to view the costing schedule.</p>
                            </div>
                        ) : (() => {
                            if (costingTab === 'schedule') {
                                return renderScheduleTable();
                            }
                            return renderClientCostingTable();
                        })()}
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
