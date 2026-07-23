import React, { useMemo, useRef, useState } from "react";
import { Download } from "lucide-react";
import html2pdf from "html2pdf.js";
import { calculateSemiWeeklySummary } from "../businesslogic/businesslogic";

const getAdjustedDate = (date) => {
    if (!date) return "";
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return "";
    const adjusted = new Date(
        dateObj.getTime() - dateObj.getTimezoneOffset() * 60000,
    );
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
    const daysToSubtract = {
        0: 6,
        1: 0,
        2: 1,
        3: 2,
        4: 3,
        5: 4,
        6: 5,
    };

    const diff = daysToSubtract[day];
    const monday = new Date(date);
    monday.setDate(date.getDate() - diff);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return {
        start: monday,
        end: sunday,
    };
};

const generateWeekDates = (referenceDate) => {
    const { start } = getWeekBounds(referenceDate);
    const dates = [];
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(start);
        currentDate.setDate(start.getDate() + i);
        dates.push({
            day: days[i],
            date: currentDate.toISOString().split("T")[0],
        });
    }

    return dates;
};

const processNonSemiTimesheets = (clientTimesheets, rates) => {
    const data = [];

    clientTimesheets.forEach((timesheet) => {
        const adjustedDate = getAdjustedDate(new Date(timesheet.timesheet_date));
        const dayOfWeek = getDayOfWeek(adjustedDate);

        const tsOccupationRaw = timesheet.occupation || "";
        const tsOccupation = tsOccupationRaw.endsWith("2.0") ? tsOccupationRaw.slice(0, -3) : tsOccupationRaw;

        let rate = rates.find(
            (r) =>
                r.client_id?.toString().trim().toUpperCase() === timesheet.client_id?.toString().trim().toUpperCase() &&
                r.occupation?.toString().trim() === tsOccupation,
        );

        if (!rate) {
            const clientRatesList = rates.filter(r => r.client_id?.toString().trim().toUpperCase() === timesheet.client_id?.toString().trim().toUpperCase());
            rate = clientRatesList.find(
                (r) =>
                    r.lookup?.toString().trim() === tsOccupation
            );
        }

        if (!rate) {
            const txCode = parseInt(timesheet.transaction_code, 10);
            if (txCode === 1921 || txCode === 1922) {
                rate = rates.find(
                    (r) =>
                        r.ot_2_0_rate && parseFloat(r.ot_2_0_rate) > 0
                );
            }
            if (!rate) {
                rate = rates.find(
                    (r) =>
                        r.client_id?.toString().trim().toUpperCase() === timesheet.client_id?.toString().trim().toUpperCase()
                );
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

        let normalTime = 0;
        let overTimeHours = 0;
        let doubleTimeHours = 0;

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
                    normalTime = netHours;
                }
            }
        } else if (timesheet.shift_type !== "Task") {
            if (timesheet.isDoubleShift) {
                const lunchDeduction = timesheet.actual_lunch_hours
                    ? parseFloat(timesheet.actual_lunch_hours)
                    : parseFloat(rate?.deduct_lunch_hour) || 0;
                normalTime = totalHours - lunchDeduction;
            } else {
                if (txCode === 1921 || txCode === 1922) {
                    const lunchDeduction = timesheet.actual_lunch_hours
                        ? parseFloat(timesheet.actual_lunch_hours)
                        : parseFloat(rate?.deduct_lunch_hour) || 0;
                    doubleTimeHours = totalHours - lunchDeduction;
                } else if (txCode === 1920) {
                    const lunchDeduction = timesheet.actual_lunch_hours
                        ? parseFloat(timesheet.actual_lunch_hours)
                        : parseFloat(rate?.deduct_lunch_hour) || 0;
                    overTimeHours = totalHours - lunchDeduction;
                } else {
                    const lunchDeduction = timesheet.actual_lunch_hours
                        ? parseFloat(timesheet.actual_lunch_hours)
                        : parseFloat(rate?.deduct_lunch_hour) || 0;
                    const netHours = totalHours - lunchDeduction;
                    normalTime = Math.min(netHours, parseFloat(rate?.hrs_pd) || 8);
                    overTimeHours = Math.max(
                        0,
                        netHours - (parseFloat(rate?.hrs_pd) || 8),
                    );
                }
            }
        }

        const occupation = timesheet.occupation || "General Worker";

        if (normalTime > 0) {
            const ntRate = isAdHoc
                ? parseFloat(rate?.sub_total_a) || 0
                : parseFloat(rate?.nt_hourly_rate) || 0;
            const ntInvoiceRate = parseFloat(rate?.nt_invoice_rate) || 0;

            data.push({
                co_number: timesheet.co_number,
                date: adjustedDate,
                occupation: isAdHoc ? `${occupation} Ad-Hoc` : occupation,
                timeType: "NT",
                rate: ntRate,
                invoiceRate: ntInvoiceRate,
                [dayOfWeek.toLowerCase()]: normalTime,
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
                co_number: timesheet.co_number,
                date: adjustedDate,
                occupation: `${occupation} OT`,
                timeType: "OT",
                rate: otRate,
                invoiceRate: otInvoiceRate,
                [dayOfWeek.toLowerCase()]: overTimeHours,
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
                co_number: timesheet.co_number,
                date: adjustedDate,
                occupation: `${occupation} DT`,
                timeType: "DT",
                rate: dtRate,
                invoiceRate: dtInvoiceRate,
                [dayOfWeek.toLowerCase()]: doubleTimeHours,
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

    return data;
};

const processTimesheetData = (timesheets, clientRates, clientId, employees = [], publicHolidays = []) => {
    if (!clientId) {
        return {
            data: [],
            dates: generateWeekDates(new Date().toISOString().split("T")[0]),
        };
    }

    const clientTimesheets = timesheets.filter(
        (ts) =>
            ts.client_id &&
            clientId &&
            ts.client_id.toString().trim() === clientId.toString().trim() &&
            ts.status !== "archived"
    );

    let dates = [];
    if (clientTimesheets.length > 0) {
        const uniqueDates = [
            ...new Set(
                clientTimesheets.map((ts) => getAdjustedDate(ts.timesheet_date)),
            ),
        ]
            .filter(Boolean)
            .sort();
        const referenceDate = uniqueDates[uniqueDates.length - 1];
        dates = generateWeekDates(referenceDate);
    } else {
        dates = generateWeekDates(new Date().toISOString().split("T")[0]);
    }

    const rates = clientRates
        ? clientRates.filter(
            (r) =>
                r.client_id &&
                clientId &&
                r.client_id.toString().trim() === clientId.toString().trim(),
        )
        : [];

    const semiTimesheets = clientTimesheets.filter((ts) => ts.shift_type === "Semi");
    const nonSemiTimesheets = clientTimesheets.filter((ts) => ts.shift_type !== "Semi");

    const data = processNonSemiTimesheets(nonSemiTimesheets, rates);

    if (semiTimesheets.length > 0) {
        const summaries = calculateSemiWeeklySummary(semiTimesheets, rates, employees, publicHolidays);
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

            if (summary.doubleTime > 0) {
                data.push({
                    id: `${summary.co_number}-${summary.weekStart}-DT`,
                    co_number: summary.co_number,
                    date: summary.weekStart,
                    occupation: `${summary.occupation} DT`,
                    timeType: "DT",
                    rate: summary.dtRate,
                    invoiceRate: parseFloat(summary.rate?.ot_2_0_invoice_rate || 0),
                    employeeName: summary.employeeName,
                    mon: 0,
                    tue: 0,
                    wed: 0,
                    thu: 0,
                    fri: 0,
                    sat: 0,
                    sun: 0,
                    _weeklyTotal: summary.doubleTime,
                });
            }
        });
    }

    return { data, dates };
};

const ClientCostingSchedule = ({ clientId, timesheets, clientRates, employees = [], publicHolidays = [] }) => {
    const [downloading, setDownloading] = useState(false);
    const { data, dates } = useMemo(
        () => processTimesheetData(timesheets, clientRates, clientId, employees, publicHolidays),
        [timesheets, clientRates, clientId, employees, publicHolidays],
    );

    const clientRate = clientRates.find(
        (r) => r.client_id?.toString().trim() === clientId?.toString().trim(),
    );
    const clientName = clientRate?.client_name || `Client ${clientId}`;

    const calculateTotalHours = (row) => {
        if (row._weeklyTotal) return row._weeklyTotal;
        return row.mon + row.tue + row.wed + row.thu + row.fri + row.sat + row.sun;
    };

    const calculateCost = (row) => {
        return calculateTotalHours(row) * row.rate;
    };

    const calculateCharge = (row) => {
        return calculateTotalHours(row) * row.invoiceRate;
    };

    const pdfRef = useRef(null);

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
        filename: `Costing_Schedule_${clientName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`,
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

    const grandTotalHours = data.reduce(
        (sum, row) => sum + calculateTotalHours(row),
        0,
    );
    const grandTotalCost = data.reduce((sum, row) => sum + calculateCost(row), 0);
    const grandTotalCharge = data.reduce(
        (sum, row) => sum + calculateCharge(row),
        0,
    );

    const getDayTotal = (dayKey) => {
        return data.reduce((sum, row) => sum + (row[dayKey] || 0), 0);
    };

    if (data.length === 0) {
        return (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800">
                    No timesheet data found for this client.
                </p>
            </div>
        );
    }

    return (
        <div className="w-full">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6 no-print">
                    <h1 className="text-2xl font-bold text-gray-800">
                        Costing Schedule - {clientName}
                    </h1>

                    <button
                        onClick={handleDownload}
                        disabled={downloading}
                        className="flex items-center gap-2 px-4 py-2 bg-[#1742c4] text-white font-medium rounded-lg shadow-md hover:bg-[#4F46E5] transition disabled:bg-gray-400"
                    >
                        {downloading ? (
                            <>
                                <svg
                                    className="animate-spin h-5 w-5"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    ></circle>
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    ></path>
                                </svg>
                                <span>Downloading...</span>
                            </>
                        ) : (
                            <>
                                <Download className="w-5 h-5" />
                                <span>Download PDF</span>
                            </>
                        )}
                    </button>
                </div>

                <div
                    ref={pdfRef}
                    id="costing-sheet"
                    className="bg-white shadow-xl overflow-x-auto"
                >
                    <table className="w-full border-collapse border border-gray-400 text-xs text-left">
                        <thead>
                            <tr className="bg-[#D9E1F2]">
                                <th colSpan="3" className="border border-black p-1 uppercase font-bold">
                                    {clientName}
                                </th>
                                <th colSpan="7" className="border border-black p-1 bg-[#EE8623]"></th>
                                <th className="border border-black p-1"></th>
                                <th className="border border-black p-1"></th>
                                <th className="border border-black p-1"></th>
                                <th className="border border-black p-1"></th>
                            </tr>
                            <tr className="bg-[#D9E1F2] font-bold text-center">
                                <th className="border border-black p-1 text-left">{clientId}</th>
                                <th className="border border-black p-1">CO Number</th>
                                <th className="border border-black p-1">Date</th>
                                {dates.map((d) => (
                                    <th key={d.day} className="border border-black p-1">{d.day}</th>
                                ))}
                                <th className="border border-black p-1">Total</th>
                                <th className="border border-black p-1">Hrly Rate</th>
                                <th className="border border-black p-1">Cost</th>
                                <th className="border border-black p-1">Inv Rate</th>
                                <th className="border border-black p-1">Charge</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((row, rowIndex) => (
                                <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-gray-100" : "bg-white"}>
                                    <td className="border border-black p-1">{row.employeeName ? row.employeeName : row.occupation}</td>
                                    <td className="border border-black p-1">{row.co_number}</td>
                                    <td className="border border-black p-1">{row.date}</td>
                                    <td className="border border-black p-1 text-center">{row.mon ? row.mon.toFixed(2) : "0.00"}</td>
                                    <td className="border border-black p-1 text-center">{row.tue ? row.tue.toFixed(2) : "0.00"}</td>
                                    <td className="border border-black p-1 text-center">{row.wed ? row.wed.toFixed(2) : "0.00"}</td>
                                    <td className="border border-black p-1 text-center">{row.thu ? row.thu.toFixed(2) : "0.00"}</td>
                                    <td className="border border-black p-1 text-center">{row.fri ? row.fri.toFixed(2) : "0.00"}</td>
                                    <td className="border border-black p-1 text-center">{row.sat ? row.sat.toFixed(2) : "0.00"}</td>
                                    <td className="border border-black p-1 text-center">{row.sun ? row.sun.toFixed(2) : "0.00"}</td>
                                    <td className="border border-black p-1 text-center font-bold">
                                        {calculateTotalHours(row).toFixed(2)}
                                    </td>
                                    <td className="border border-black p-1 text-right">R {row.rate.toFixed(2)}</td>
                                    <td className="border border-black p-1 text-right">R {calculateCost(row).toFixed(2)}</td>
                                    <td className="border border-black p-1 text-right">R {row.invoiceRate.toFixed(2)}</td>
                                    <td className="border border-black p-1 text-right font-bold">R {calculateCharge(row).toFixed(2)}</td>
                                </tr>
                            ))}
                            <tr className="bg-[#D9E1F2] font-bold">
                                <td className="border border-black p-1" colSpan="3">GRAND TOTAL</td>
                                <td className="border border-black p-1 text-center">{getDayTotal('mon').toFixed(2)}</td>
                                <td className="border border-black p-1 text-center">{getDayTotal('tue').toFixed(2)}</td>
                                <td className="border border-black p-1 text-center">{getDayTotal('wed').toFixed(2)}</td>
                                <td className="border border-black p-1 text-center">{getDayTotal('thu').toFixed(2)}</td>
                                <td className="border border-black p-1 text-center">{getDayTotal('fri').toFixed(2)}</td>
                                <td className="border border-black p-1 text-center">{getDayTotal('sat').toFixed(2)}</td>
                                <td className="border border-black p-1 text-center">{getDayTotal('sun').toFixed(2)}</td>
                                <td className="border border-black p-1 text-center">{grandTotalHours.toFixed(2)}</td>
                                <td className="border border-black p-1"></td>
                                <td className="border border-black p-1 text-right">R {grandTotalCost.toFixed(2)}</td>
                                <td className="border border-black p-1"></td>
                                <td className="border border-black p-1 text-right">R {grandTotalCharge.toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ClientCostingSchedule;
