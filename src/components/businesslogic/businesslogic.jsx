const calculateHours = (timeIn, timeOut) => {
    const start = new Date(`1970-01-01T${timeIn}`);
    const end = new Date(`1970-01-01T${timeOut}`);
    let diff = (end - start) / (1000 * 60 * 60);
    if (diff <= 0) diff += 24;
    return diff;
};

const getAdjustedDate = (date) => {
    if (!date) return "";
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return "";
    const adjusted = new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000);
    return adjusted.toISOString().split("T")[0];
};

const findRate = (clientRates, clientId, occupation) => {
    const tsClientId = clientId?.toString().trim().toUpperCase();
    const tsOccupationRaw = occupation?.toString().trim() || "";
    const tsOccupation = tsOccupationRaw.endsWith("2.0") ? tsOccupationRaw.slice(0, -3) : tsOccupationRaw;

    let rate = clientRates.find(
        (r) =>
            r.client_id?.toString().trim().toUpperCase() === tsClientId &&
            r.occupation?.toString().trim() === tsOccupation
    );

    if (!rate) {
        const clientRatesList = clientRates.filter(r => r.client_id?.toString().trim().toUpperCase() === tsClientId);
        rate = clientRatesList.find((r) => r.lookup?.toString().trim() === tsOccupation);
    }

    if (!rate) {
        rate = clientRates.find(
            (r) => r.client_id?.toString().trim().toUpperCase() === tsClientId
        );
    }

    return rate;
};

const getDayOfWeek = (dateStr) => {
    const date = new Date(dateStr);
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days[date.getDay()];
};

const getWeekKey = (dateStr) => {
    const d = new Date(dateStr);
    const dayNum = d.getDay() || 7;
    d.setDate(d.getDate() + 4 - dayNum);
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    return `${d.getFullYear()}-W${weekNo.toString().padStart(2, "0")}`;
};

const getWeekStart = (dateStr) => {
    const d = new Date(dateStr);
    const day = d.getDay();
    const diff = day === 0 ? 6 : day - 1;
    d.setDate(d.getDate() - diff);
    return d.toISOString().split("T")[0];
};

const isPublicHoliday = (dateStr, publicHolidays) => {
    if (!publicHolidays || !publicHolidays.length) return false;
    return publicHolidays.some((ph) => ph === dateStr);
};

export const calculateSemiWeeklySummary = (semiTimesheets, clientRates, employees, publicHolidays = []) => {
    const groups = {};

    const getLunch = (ts, rate) => {
        return ts.actual_lunch_hours !== null &&
            ts.actual_lunch_hours !== undefined &&
            ts.actual_lunch_hours !== ""
            ? parseFloat(ts.actual_lunch_hours)
            : parseFloat(rate?.deduct_lunch_hour) || 0;
    };

    const getNetHours = (ts, rate) => {
        let totalHours = 0;
        if (ts.total_hours != null) {
            totalHours = parseFloat(ts.total_hours) || 0;
        } else {
            totalHours = calculateHours(ts.start_time, ts.end_time);
        }
        return totalHours - getLunch(ts, rate);
    };

    semiTimesheets.forEach((ts) => {
        const rate = findRate(clientRates, ts.client_id, ts.occupation);
        if (!rate) return;
        const empNo = ts.co_number;
        const weekKey = getWeekKey(ts.timesheet_date);
        const key = `${empNo}-${weekKey}-${ts.client_id}-${ts.occupation}`;

        if (!groups[key]) {
            const employee = employees.find(
                (emp) => emp.co_number?.toString().trim() === empNo?.toString().trim()
            );
            groups[key] = {
                co_number: empNo,
                employeeName: employee?.full_name || "Unknown",
                weekKey,
                weekStart: getWeekStart(ts.timesheet_date),
                client_id: ts.client_id,
                occupation: ts.occupation,
                rate,
                transactionCode: ts.transaction_code || rate?.transaction_code || "",
                totalNetHours: 0,
                hasPublicHoliday: false,
                hasSaturday: false,
                daysWorked: 0,
            };
        } else if (ts.transaction_code) {
            groups[key].transactionCode = ts.transaction_code;
        }

        const g = groups[key];
        g.totalNetHours += getNetHours(ts, rate);
        g.daysWorked += 1;
        if (getDayOfWeek(ts.timesheet_date) === "Sat") g.hasSaturday = true;
        if (isPublicHoliday(ts.timesheet_date, publicHolidays))
            g.hasPublicHoliday = true;
    });

    return Object.values(groups)
        .map((g) => {
            const normalTimeRate = parseFloat(g.rate.nt_hourly_rate) || 0;
            const otRate = parseFloat(g.rate.ot_1_5_rate) || 0;

            let normalTime = 0;
            let overTime = 0;

            if (g.hasPublicHoliday && g.totalNetHours > 45) {
                normalTime = g.totalNetHours;
                overTime = 0;
            } else {
                normalTime = Math.min(g.totalNetHours, 45);
                overTime = Math.max(0, g.totalNetHours - 45);
            }

            return {
                ...g,
                normalTime: parseFloat(normalTime.toFixed(2)),
                overTime: parseFloat(overTime.toFixed(2)),
                totalHours: parseFloat(g.totalNetHours.toFixed(2)),
                normalTimePay: parseFloat((normalTime * normalTimeRate).toFixed(2)),
                overTimePay: parseFloat((overTime * otRate).toFixed(2)),
                rate: normalTimeRate,
                otRate,
            };
        })
        .sort((a, b) =>
            a.co_number.localeCompare(b.co_number) || a.weekKey.localeCompare(b.weekKey)
        );
};

const buildBatchExportRow = (timesheet, transactionCode, qtyHrs, rate, amount, shiftType) => {
    const adjustedDate = getAdjustedDate(new Date(timesheet.timesheet_date));
    const day = parseInt(adjustedDate.split("-")[2], 10);
    const jobCode = day.toString().padStart(2, "0");
    return {
        co_number: timesheet.co_number,
        transactionCode,
        jobCode,
        costCentre: timesheet.client_id,
        qtyHrs: qtyHrs.toFixed(2),
        rate: rate.toFixed(2),
        amount: amount.toFixed(2),
        override: "N",
        shiftType,
    };
};

export const calculateBatchExportRow = (timesheet, clientRates) => {
    if (timesheet.shift_type === "Task") {
        const units = parseFloat(timesheet.units) || 0;
        const taskRate = parseFloat(timesheet.rate) || 0;
        const txCode = parseInt(timesheet.transaction_code, 10);
        if (txCode === 1921 || txCode === 1922) {
            return buildBatchExportRow(timesheet, timesheet.transaction_code, units, taskRate, units * taskRate, timesheet.shift_type);
        } else if (txCode === 1920) {
            return buildBatchExportRow(timesheet, "1920", units, taskRate, units * taskRate, timesheet.shift_type);
        }
        return buildBatchExportRow(timesheet, timesheet.transaction_code, units, taskRate, units * taskRate, timesheet.shift_type);
    }

    const rate = findRate(clientRates, timesheet.client_id, timesheet.occupation);
    if (!rate) return null;

    const txCode = parseInt(timesheet.transaction_code, 10);
    const isBiometric = timesheet.total_hours != null;
    const isAdHoc = timesheet.shift_type === "Ad-Hoc";
    const effectiveTxCode = timesheet.transaction_code || rate?.transaction_code || "";

    if (isBiometric) {
        const biometricHours = parseFloat(timesheet.total_hours) || 0;
        const lunchDeduction =
            timesheet.actual_lunch_hours !== null &&
            timesheet.actual_lunch_hours !== undefined &&
            timesheet.actual_lunch_hours !== "" &&
            timesheet.actual_lunch_hours !== "0"
                ? parseFloat(timesheet.actual_lunch_hours)
                : parseFloat(rate?.deduct_lunch_hour) || 0;
        const netHours = biometricHours - lunchDeduction;

        if (txCode === 1921 || txCode === 1922) {
            const dtRate = parseFloat(rate?.ot_2_0_rate) || 0;
            return buildBatchExportRow(timesheet, effectiveTxCode, isAdHoc ? netHours : biometricHours, dtRate, (isAdHoc ? netHours : biometricHours) * dtRate, timesheet.shift_type);
        } else if (txCode === 1920) {
            const otRate = parseFloat(rate?.ot_1_5_rate) || 0;
            return buildBatchExportRow(timesheet, "1920", isAdHoc ? netHours : biometricHours, otRate, (isAdHoc ? netHours : biometricHours) * otRate, timesheet.shift_type);
        } else {
            const ntRate = isAdHoc ? parseFloat(rate?.sub_total_a) || 0 : parseFloat(rate?.nt_hourly_rate) || 0;
            if (timesheet.shift_type === "Semi" || isAdHoc) {
                return buildBatchExportRow(timesheet, effectiveTxCode, netHours, ntRate, netHours * ntRate, timesheet.shift_type);
            }
            return buildBatchExportRow(timesheet, effectiveTxCode, biometricHours, ntRate, biometricHours * ntRate, timesheet.shift_type);
        }
    } else {
        const totalHours = calculateHours(timesheet.start_time, timesheet.end_time);
        let normalTime = 0;
        let overTimeHours = 0;
        let doubleTimeHours = 0;

        const getLunch = () =>
            timesheet.actual_lunch_hours !== null &&
            timesheet.actual_lunch_hours !== undefined &&
            timesheet.actual_lunch_hours !== "" &&
            timesheet.actual_lunch_hours !== "0"
                ? parseFloat(timesheet.actual_lunch_hours)
                : parseFloat(rate.deduct_lunch_hour) || 0;

        if (timesheet.isDoubleShift) {
            normalTime = totalHours - getLunch();
        } else {
            if (txCode === 1921 || txCode === 1922) {
                doubleTimeHours = totalHours - getLunch();
            } else if (txCode === 1920) {
                overTimeHours = totalHours - getLunch();
            } else {
                const netHours = totalHours - getLunch();
                normalTime = Math.min(netHours, rate.hrs_pd);
                overTimeHours = Math.max(0, netHours - rate.hrs_pd);
            }
        }

        const ntRate = isAdHoc ? parseFloat(rate.sub_total_a) || 0 : parseFloat(rate.nt_hourly_rate) || 0;
        const otRate = parseFloat(rate.ot_1_5_rate) || 0;
        const dtRate = parseFloat(rate.ot_2_0_rate) || 0;

        const rows = [];
        if (normalTime > 0) {
            rows.push(buildBatchExportRow(timesheet, effectiveTxCode, normalTime, ntRate, normalTime * ntRate, timesheet.shift_type));
        }
        if (overTimeHours > 0) {
            rows.push(buildBatchExportRow(timesheet, "1920", overTimeHours, otRate, overTimeHours * otRate, timesheet.shift_type));
        }
        if (doubleTimeHours > 0) {
            rows.push(buildBatchExportRow(timesheet, effectiveTxCode, doubleTimeHours, dtRate, doubleTimeHours * dtRate, timesheet.shift_type));
        }
        return rows.length === 1 ? rows[0] : rows;
    }
};

export const calculateBatchExportData = (timesheets, clientRates, employees = [], publicHolidays = []) => {
    const semiTimesheets = timesheets.filter((ts) => ts.shift_type === "Semi");
    const nonSemiTimesheets = timesheets.filter((ts) => ts.shift_type !== "Semi");

    const semiRows = calculateSemiWeeklySummary(semiTimesheets, clientRates, employees, publicHolidays).flatMap((summary) => {
        const d = new Date(summary.weekStart);
        const jobCode = d.getDate().toString().padStart(2, "0");
        const rows = [];
        if (summary.normalTime > 0) {
            rows.push({
                co_number: summary.co_number,
                transactionCode: summary.transactionCode || "",
                jobCode,
                costCentre: summary.client_id,
                qtyHrs: summary.normalTime.toFixed(2),
                rate: summary.rate.toFixed(2),
                amount: summary.normalTimePay.toFixed(2),
                override: "N",
                shiftType: "Semi",
                weekStart: summary.weekStart,
                employeeName: summary.employeeName,
                occupation: summary.occupation,
            });
        }
        if (summary.overTime > 0) {
            rows.push({
                co_number: summary.co_number,
                transactionCode: "1920",
                jobCode,
                costCentre: summary.client_id,
                qtyHrs: summary.overTime.toFixed(2),
                rate: summary.otRate.toFixed(2),
                amount: summary.overTimePay.toFixed(2),
                override: "N",
                shiftType: "Semi",
                weekStart: summary.weekStart,
                employeeName: summary.employeeName,
                occupation: summary.occupation,
            });
        }
        return rows;
    });

    const nonSemiRows = nonSemiTimesheets.flatMap((timesheet) => {
        const row = calculateBatchExportRow(timesheet, clientRates);
        if (!row) return [];
        return Array.isArray(row) ? row : [row];
    });

    return [...semiRows, ...nonSemiRows];
};

export const calculateTimesheetRow = (timesheet, clientRates, employees) => {
    const rate = findRate(clientRates, timesheet.client_id, timesheet.occupation);

    let totalHours = 0;
    let ntHrs = 0;
    let otHrs = 0;
    let dtHrs = 0;
    let ntPay = 0;
    let otPay = 0;
    let dtPay = 0;

    const isBiometric = timesheet.total_hours != null;
    const txCode = parseInt(timesheet.transaction_code, 10);
    const isAdHoc = timesheet.shift_type === "Ad-Hoc";

    if (timesheet.shift_type === "Task") {
        const totalUnits = parseFloat(timesheet.units) || 0;
        const taskTxCode = parseInt(timesheet.transaction_code, 10);
        if (taskTxCode === 1921 || taskTxCode === 1922) {
            dtHrs = totalUnits;
            dtPay = totalUnits * (parseFloat(timesheet.rate) || 0);
        } else if (taskTxCode === 1920) {
            otHrs = totalUnits;
            otPay = totalUnits * (parseFloat(timesheet.rate) || 0);
        } else {
            ntHrs = totalUnits;
            ntPay = totalUnits * (parseFloat(timesheet.rate) || 0);
        }
    } else if (isBiometric) {
        totalHours = parseFloat(timesheet.total_hours) || 0;
        const lunchDeduction =
            timesheet.actual_lunch_hours !== null &&
            timesheet.actual_lunch_hours !== undefined &&
            timesheet.actual_lunch_hours !== ""
                ? parseFloat(timesheet.actual_lunch_hours)
                : parseFloat(rate?.deduct_lunch_hour) || 0;
        const netHours = totalHours - lunchDeduction;

        if (txCode === 1921 || txCode === 1922) {
            dtHrs = netHours;
            dtPay = dtHrs * (parseFloat(rate?.ot_2_0_rate) || 0);
        } else if (txCode === 1920) {
            otHrs = netHours;
            otPay = otHrs * (parseFloat(rate?.ot_1_5_rate) || 0);
        } else {
            if (isAdHoc) {
                ntHrs = netHours;
                ntPay = ntHrs * (parseFloat(rate?.sub_total_a) || 0);
            } else {
                ntHrs = netHours;
                ntPay = netHours * (parseFloat(rate?.nt_hourly_rate) || 0);
            }
        }
    } else {
        totalHours = calculateHours(timesheet.start_time, timesheet.end_time);
        const getLunch = () =>
            timesheet.actual_lunch_hours !== null &&
            timesheet.actual_lunch_hours !== undefined &&
            timesheet.actual_lunch_hours !== ""
                ? parseFloat(timesheet.actual_lunch_hours)
                : parseFloat(rate?.deduct_lunch_hour) || 0;

        if (timesheet.isDoubleShift) {
            const netHours = totalHours - getLunch();
            ntHrs = netHours;
            const ntRate = isAdHoc ? parseFloat(rate?.sub_total_a) || 0 : parseFloat(rate?.nt_hourly_rate) || 0;
            ntPay = netHours * ntRate;
        } else {
            if (txCode === 1921 || txCode === 1922) {
                const netHours = totalHours - getLunch();
                dtHrs = netHours;
                dtPay = dtHrs * (parseFloat(rate?.ot_2_0_rate) || 0);
            } else if (txCode === 1920) {
                const netHours = totalHours - getLunch();
                otHrs = netHours;
                otPay = otHrs * (parseFloat(rate?.ot_1_5_rate) || 0);
            } else {
                const netHours = totalHours - getLunch();
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

    const employee = employees.find((emp) => emp.co_number?.toString().trim() === timesheet.co_number?.toString().trim());
    const employeeName = employee ? employee.full_name : "Unknown";

    return {
        id: timesheet.id,
        timesheetNo: timesheet.timesheet_number || "",
        date: timesheet.timesheet_date || "",
        clientId: timesheet.client_id || "",
        clientName: timesheet.client_name || "",
        empNo: timesheet.co_number || "",
        txCode: timesheet.transaction_code || "",
        shiftType: timesheet.shift_type || "",
        start: timesheet.start_time || "",
        end: timesheet.end_time || "",
        totalHrs: parseFloat(totalHours.toFixed(2)),
        ntHrs: parseFloat(ntHrs.toFixed(2)),
        otHrs: parseFloat(otHrs.toFixed(2)),
        dtHrs: parseFloat(dtHrs.toFixed(2)),
        ntPay: parseFloat(ntPay.toFixed(2)),
        otPay: parseFloat(otPay.toFixed(2)),
        dtPay: parseFloat(dtPay.toFixed(2)),
        employeeName,
    };
};

export const calculateEmployeeData = (timesheets, clientRates, employees) => {
    return timesheets
        .map((timesheet) => {
            const rate = findRate(clientRates, timesheet.client_id, timesheet.occupation);
            if (!rate) return null;

            let normalTime = 0;
            let overTimeHours = 0;
            let normalTimePay = 0;
            let overTimePay = 0;
            let doubleTimeHours = 0;
            let doubleTimePay = 0;

            const isBiometric = timesheet.total_hours != null;
            const txCode = parseInt(timesheet.transaction_code, 10);
            const isAdHoc = timesheet.shift_type === "Ad-Hoc";

    if (timesheet.shift_type === "Task") {
        const totalUnits = parseFloat(timesheet.units) || 0;
        const txCode = parseInt(timesheet.transaction_code, 10);
        if (txCode === 1921 || txCode === 1922) {
            doubleTimeHours = totalUnits;
            doubleTimePay = totalUnits * (parseFloat(timesheet.rate) || 0);
        } else if (txCode === 1920) {
            overTimeHours = totalUnits;
            overTimePay = totalUnits * (parseFloat(timesheet.rate) || 0);
        } else {
            normalTime = totalUnits;
            normalTimePay = normalTime * (parseFloat(timesheet.rate) || 0);
        }
    } else if (isBiometric) {
                const biometricHours = parseFloat(timesheet.total_hours) || 0;
                const lunchDeduction =
                    timesheet.actual_lunch_hours !== null &&
                    timesheet.actual_lunch_hours !== undefined &&
                    timesheet.actual_lunch_hours !== ""
                        ? parseFloat(timesheet.actual_lunch_hours)
                        : parseFloat(rate?.deduct_lunch_hour) || 0;
                const netHours = biometricHours - lunchDeduction;

                if (txCode === 1921 || txCode === 1922) {
                    doubleTimeHours = netHours;
                    doubleTimePay = doubleTimeHours * (parseFloat(rate?.ot_2_0_rate) || 0);
                } else if (txCode === 1920) {
                    overTimeHours = netHours;
                    overTimePay = overTimeHours * (parseFloat(rate?.ot_1_5_rate) || 0);
                } else {
                    if (isAdHoc) {
                        normalTime = netHours;
                        normalTimePay = normalTime * (parseFloat(rate?.sub_total_a) || 0);
                    } else {
                        normalTime = biometricHours;
                        normalTimePay = biometricHours * (parseFloat(rate?.nt_hourly_rate) || 0);
                    }
                }
            } else {
                const totalHours = calculateHours(timesheet.start_time, timesheet.end_time);
                const getLunch = () =>
                    timesheet.actual_lunch_hours !== null &&
                    timesheet.actual_lunch_hours !== undefined &&
                    timesheet.actual_lunch_hours !== ""
                        ? parseFloat(timesheet.actual_lunch_hours)
                        : parseFloat(rate.deduct_lunch_hour) || 0;

                if (timesheet.isDoubleShift) {
                    const netHours = totalHours - getLunch();
                    normalTime = netHours;
                    normalTimePay = netHours * (isAdHoc ? rate.sub_total_a : rate.nt_hourly_rate);
                } else {
                    if (txCode === 1921 || txCode === 1922) {
                        const netHours = totalHours - getLunch();
                        doubleTimeHours = netHours;
                        doubleTimePay = netHours * rate.ot_2_0_rate;
                    } else if (txCode === 1920) {
                        const netHours = totalHours - getLunch();
                        overTimeHours = netHours;
                        overTimePay = netHours * rate.ot_1_5_rate;
                    } else {
                        const netHours = totalHours - getLunch();
                        if (isAdHoc) {
                            normalTime = netHours;
                            normalTimePay = normalTime * (parseFloat(rate?.sub_total_a) || 0);
                        } else {
                            normalTime = Math.min(netHours, rate.hrs_pd);
                            overTimeHours = Math.max(0, netHours - rate.hrs_pd);
                            normalTimePay = normalTime * rate.nt_hourly_rate;
                            overTimePay = overTimeHours * rate.ot_1_5_rate;
                        }
                    }
                }
            }

            const employee = employees.find((emp) => emp.co_number?.toString().trim() === timesheet.co_number?.toString().trim());
            const employeeName = employee ? employee.full_name : "Unknown";

            return {
                ts_number: timesheet.timesheet_number,
                date: timesheet.timesheet_date,
                co_number: timesheet.co_number,
                employeeName,
                normalTime: timesheet.shift_type === "Task" ? `${normalTime.toFixed(0)} units` : normalTime.toFixed(2),
                overTimeHours: Math.max(0, overTimeHours).toFixed(2),
                doubleTimeHours: doubleTimeHours.toFixed(2),
                normalTimePay: normalTimePay.toFixed(2),
                overTimePay: overTimePay.toFixed(2),
                doubleTimePay: doubleTimePay.toFixed(2),
            };
        })
        .filter(Boolean);
};
