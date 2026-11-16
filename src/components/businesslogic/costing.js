import {
  getAdjustedDate,
  calculateHours,
  getDayOfWeek,
  getWeekStart,
  generateWeekDates,
  isPublicHoliday,
} from './dateUtils';
import { findRate } from './businesslogic';

/**
 * Unified costing data processor used by both Dashboard and CostingSchedule pages.
 *
 * Replaces duplicated ~380-line implementations that existed in both pages.
 *
 * @param {Array} timesheets - Raw timesheet records
 * @param {Array} clientRates - Client rate definitions
 * @param {Array} employees - Employee roster
 * @param {Array} publicHolidays - Public holiday date strings
 * @param {string|null} referenceDate - Optional week anchor date (YYYY-MM-DD)
 * @param {boolean} skipWeekFilter - When true, skips week-boundary filtering
 * @param {boolean} groupByEmployee - When true, groups by employee number (CostingSchedule client view)
 * @param {boolean} returnTsNumberAsArray - When true, tsNumber is an array (CostingSchedule client view)
 * @param {boolean} groupByTimesheet - When true, includes timesheet number in the group key (default).
 *        When false, occupations are grouped by client + occupation + pay type, accumulating hours
 *        across workers/timesheets (CostingSchedule schedule view).
 * @returns {{ data: Array, dates: Array }}
 */
export const processCostingData = (
  timesheets,
  clientRates,
  employees,
  publicHolidays = [],
  referenceDate = null,
  skipWeekFilter = false,
  groupByEmployee = false,
  returnTsNumberAsArray = false,
  groupByTimesheet = true
) => {
  let filteredTimesheets = timesheets.filter((ts) => {
    const adjustedDate = getAdjustedDate(ts.timesheet_date);
    return adjustedDate && ts.status !== 'archived';
  });

  let dates = [];
  let weekStart = null;
  if (referenceDate) {
    dates = generateWeekDates(referenceDate);
    weekStart = dates[0]?.date || null;
  } else if (filteredTimesheets.length > 0) {
    const uniqueDates = [
      ...new Set(filteredTimesheets.map((ts) => getAdjustedDate(ts.timesheet_date)).filter(Boolean)),
    ].sort();
    const referenceDateFromData = uniqueDates[uniqueDates.length - 1];
    dates = generateWeekDates(referenceDateFromData);
    weekStart = dates[0]?.date || null;
  } else {
    dates = generateWeekDates(new Date().toISOString().split('T')[0]);
    weekStart = dates[0]?.date || null;
  }

  if (!skipWeekFilter && weekStart) {
    filteredTimesheets = filteredTimesheets.filter((ts) => {
      const adjustedDate = getAdjustedDate(ts.timesheet_date);
      if (!adjustedDate) return false;
      if (ts.shift_type === 'Semi') {
        return getWeekStart(adjustedDate) === weekStart;
      }
      return adjustedDate >= weekStart && adjustedDate <= dates[6]?.date;
    });
  }

  const semiTimesheets = filteredTimesheets.filter((ts) => ts.shift_type === 'Semi');
  const nonSemiTimesheets = filteredTimesheets.filter((ts) => ts.shift_type !== 'Semi');

  const data = [];

  const processNonSemi = () => {
    nonSemiTimesheets.forEach((timesheet) => {
      const adjustedDate = getAdjustedDate(new Date(timesheet.timesheet_date));
      const dayOfWeek = getDayOfWeek(adjustedDate);
      const dayLower = dayOfWeek.toLowerCase();

      const txCode = parseInt(timesheet.transaction_code, 10);
      const isDoubleShift = timesheet.isDoubleShift;

      let normalTime = 0,
        overTimeHours = 0,
        doubleTimeHours = 0;
      let totalHours = 0;

      const isBiometric =
        timesheet.shift_type !== 'Task' && timesheet.total_hours != null;
      const isAdHoc =
        timesheet.shift_type === 'Ad-Hoc' || timesheet.shift_type === 'Adhoc';

      if (isBiometric) {
        totalHours = parseFloat(timesheet.total_hours) || 0;
      } else if (timesheet.shift_type !== 'Task') {
        totalHours = calculateHours(timesheet.start_time, timesheet.end_time);
      } else {
        totalHours = parseFloat(timesheet.units) || 0;
      }

      const matchedRate = findRate(
        clientRates,
        timesheet.client_id,
        timesheet.occupation
      );

      const tsOccupationRaw = timesheet.occupation || '';
      const baseOccupation = tsOccupationRaw.endsWith('2.0')
        ? tsOccupationRaw.slice(0, -3)
        : tsOccupationRaw;
      const occupation = baseOccupation || 'General Worker';

      if (isBiometric) {
        if (txCode === 1921 || txCode === 1922) {
          const lunchDeduction =
            timesheet.actual_lunch_hours !== null &&
            timesheet.actual_lunch_hours !== undefined &&
            timesheet.actual_lunch_hours !== ''
              ? parseFloat(timesheet.actual_lunch_hours)
              : parseFloat(matchedRate?.deduct_lunch_hour) || 0;
          doubleTimeHours = totalHours - lunchDeduction;
        } else if (txCode === 1920) {
          const lunchDeduction =
            timesheet.actual_lunch_hours !== null &&
            timesheet.actual_lunch_hours !== undefined &&
            timesheet.actual_lunch_hours !== ''
              ? parseFloat(timesheet.actual_lunch_hours)
              : parseFloat(matchedRate?.deduct_lunch_hour) || 0;
          overTimeHours = totalHours - lunchDeduction;
        } else {
          const lunchDeduction =
            timesheet.actual_lunch_hours !== null &&
            timesheet.actual_lunch_hours !== undefined &&
            timesheet.actual_lunch_hours !== ''
              ? parseFloat(timesheet.actual_lunch_hours)
              : parseFloat(matchedRate?.deduct_lunch_hour) || 0;
          normalTime = totalHours - lunchDeduction;
        }
      } else if ((txCode === 1921 || txCode === 1922) && matchedRate) {
        const lunchDeduction =
          timesheet.actual_lunch_hours !== null &&
          timesheet.actual_lunch_hours !== undefined &&
          timesheet.actual_lunch_hours !== ''
            ? parseFloat(timesheet.actual_lunch_hours)
            : parseFloat(matchedRate?.deduct_lunch_hour) || 0;
        doubleTimeHours = totalHours - lunchDeduction;
      } else if (txCode === 1920 && matchedRate) {
        const lunchDeduction =
          timesheet.actual_lunch_hours !== null &&
          timesheet.actual_lunch_hours !== undefined &&
          timesheet.actual_lunch_hours !== ''
            ? parseFloat(timesheet.actual_lunch_hours)
            : parseFloat(matchedRate?.deduct_lunch_hour) || 0;
        overTimeHours = totalHours - lunchDeduction;
      } else if (timesheet.shift_type !== 'Task') {
        const lunchDeduction =
          timesheet.actual_lunch_hours !== null &&
          timesheet.actual_lunch_hours !== undefined &&
          timesheet.actual_lunch_hours !== ''
            ? parseFloat(timesheet.actual_lunch_hours)
            : parseFloat(matchedRate?.deduct_lunch_hour) || 0;
        if (isDoubleShift) {
          normalTime = totalHours - lunchDeduction;
        } else {
          const netHours = totalHours - lunchDeduction;
          normalTime = Math.min(
            netHours,
            parseFloat(matchedRate?.hrs_pd) || 8
          );
          overTimeHours = Math.max(
            0,
            netHours - (parseFloat(matchedRate?.hrs_pd) || 8)
          );
        }
      } else {
        if (isAdHoc) normalTime = totalHours;
      }

      const types = [];
      if (normalTime > 0) types.push({ type: 'NT', hours: normalTime });
      if (overTimeHours > 0) types.push({ type: 'OT', hours: overTimeHours });
      if (doubleTimeHours > 0) types.push({ type: 'DT', hours: doubleTimeHours });

      if (types.length === 0 && timesheet.shift_type !== 'Task') {
        types.push({ type: 'NT', hours: 0 });
      }

      types.forEach(({ type, hours }) => {
        const empKey =
          timesheet.co_number || timesheet.empNo || timesheet.employee_no || '';
        const groupKey = groupByEmployee
          ? `${empKey}|${timesheet.client_id || ''}|${occupation}|${type}|${groupByTimesheet ? timesheet.timesheet_number || '' : ''}`
          : `${groupByTimesheet ? timesheet.timesheet_number || '' : ''}|${timesheet.client_id || ''}|${occupation}|${type}`;

        if (!data[groupKey]) {
          const matchedEmployee = employees.find((emp) => {
            const coNumber =
              (timesheet.co_number ||
                timesheet.empNo ||
                timesheet.employee_no ||
                '').toString().trim();
            return (emp.co_number || '').toString().trim() === coNumber;
          });
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
            tsNumber: returnTsNumberAsArray
              ? [timesheet.timesheet_number].filter(Boolean)
              : timesheet.timesheet_number,
            empNo: timesheet.co_number || timesheet.empNo || timesheet.employee_no || '',
            employeeName: matchedEmployee?.full_name || '',
            shift_type: timesheet.shift_type,
          };
        }
        const entry = data[groupKey];
        entry.days.add(dayLower);
        entry[type][dayLower] += hours;
        entry[type].count += 1;
        if (type === 'NT' && isAdHoc) entry.hasAdHocNT = true;
        if (
          timesheet.timesheet_number &&
          returnTsNumberAsArray &&
          !entry.tsNumber.includes(timesheet.timesheet_number)
        ) {
          entry.tsNumber.push(timesheet.timesheet_number);
        }
      });
    });
  };

  const processSemiAgg = () => {
    const groups = semiTimesheets.reduce((acc, ts) => {
      const key = ts.semi_weekly_hours || '45';
      if (!acc[key]) acc[key] = [];
      acc[key].push(ts);
      return acc;
    }, {});

    const allSummaries = [];
    Object.entries(groups).forEach(([weeklyHoursStr, groupTimesheets]) => {
      const weeklyHours = parseFloat(weeklyHoursStr) || 45;
      const summaries = calculateSemiWeeklySummary(
        groupTimesheets,
        clientRates,
        employees,
        publicHolidays,
        weeklyHours
      );
      allSummaries.push(...summaries);
    });

    const semiTsNumbersByGroup = {};
    semiTimesheets.forEach((ts) => {
      const groupKey = `${ts.co_number}|${ts.client_id}|${ts.occupation}`;
      if (!semiTsNumbersByGroup[groupKey]) {
        semiTsNumbersByGroup[groupKey] = new Set();
      }
      if (ts.timesheet_number) {
        semiTsNumbersByGroup[groupKey].add(ts.timesheet_number);
      }
    });

    allSummaries.forEach((summary) => {
      const groupKey = `${summary.co_number}|${summary.client_id}|${summary.occupation}`;
      const fullRate = findRate(clientRates, summary.client_id, summary.occupation);
      const tsNumbersList = semiTsNumbersByGroup[groupKey]
        ? [...semiTsNumbersByGroup[groupKey]]
        : [];
      const representativeTsNumber =
        tsNumbersList.length === 1 ? tsNumbersList[0] : (tsNumbersList[0] || '');
      if (!data[groupKey]) {
        data[groupKey] = {
          client_id: summary.client_id,
          client_name: summary.client_name || '',
          occupation: summary.occupation,
          rateInfo: fullRate,
          hasAdHocNT: false,
          NT: { count: 0, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 },
          OT: { count: 0, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 },
          DT: { count: 0, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 },
          days: new Set(),
          tsNumber: returnTsNumberAsArray
            ? [representativeTsNumber].filter(Boolean)
            : representativeTsNumber,
          empNo: summary.co_number || '',
          employeeName: summary.employeeName || '',
          shift_type: 'Semi',
        };
      }
      const entry = data[groupKey];
      const isNightShift = summary.timesheets?.some((ts) => ts.semi_weekly_hours === 'n/s');
      const weeklyHours =
        summary.timesheets?.[0]?.semi_weekly_hours === 'n/s'
          ? 0
          : parseFloat(summary.timesheets?.[0]?.semi_weekly_hours || '45') || 45;

      if (isNightShift) {
        summary.timesheets?.forEach((ts) => {
          const adjustedDate = getAdjustedDate(new Date(ts.timesheet_date));
          const dayOfWeek = getDayOfWeek(adjustedDate);
          const dayLower = dayOfWeek.toLowerCase();
          let totalHours =
            ts.total_hours != null ? parseFloat(ts.total_hours) : calculateHours(ts.start_time, ts.end_time);
          const netHours = totalHours;
          if (netHours > 0) {
            entry.NT[dayLower] += netHours;
            entry.days.add(dayLower);
            entry.NT.count += 1;
          }
        });
      } else {
        const sundayTimesheets = [];
        const weekdayTimesheets = [];

        summary.timesheets?.forEach((ts) => {
          const adjustedDate = getAdjustedDate(new Date(ts.timesheet_date));
          const dayOfWeek = getDayOfWeek(adjustedDate);
          if (dayOfWeek === 'Sun') {
            sundayTimesheets.push({ ...ts, dayLower: 'sun' });
          } else {
            weekdayTimesheets.push({ ...ts, dayLower: dayOfWeek.toLowerCase() });
          }
        });

        weekdayTimesheets.sort((a, b) => new Date(a.timesheet_date) - new Date(b.timesheet_date));

        const totalWeekdayNetHours = weekdayTimesheets.reduce((sum, ts) => {
          const rate = findRate(clientRates, ts.client_id, ts.occupation);
          let totalHours =
            ts.total_hours != null ? parseFloat(ts.total_hours) : calculateHours(ts.start_time, ts.end_time);
          const lunchDeduction =
            ts.actual_lunch_hours !== null &&
            ts.actual_lunch_hours !== undefined &&
            ts.actual_lunch_hours !== ''
              ? parseFloat(ts.actual_lunch_hours)
              : parseFloat(rate?.deduct_lunch_hour) || 0;
          return sum + (totalHours - lunchDeduction);
        }, 0);

        let weekdayNTQuota = weeklyHours;
        if (summary.hasPublicHoliday && totalWeekdayNetHours > weeklyHours) {
          weekdayNTQuota = totalWeekdayNetHours;
        }

        let remainingWeekdayNT = weekdayNTQuota;

        weekdayTimesheets.forEach((ts) => {
          const rate = findRate(clientRates, ts.client_id, ts.occupation);
          let totalHours =
            ts.total_hours != null ? parseFloat(ts.total_hours) : calculateHours(ts.start_time, ts.end_time);
          const lunchDeduction =
            ts.actual_lunch_hours !== null &&
            ts.actual_lunch_hours !== undefined &&
            ts.actual_lunch_hours !== ''
              ? parseFloat(ts.actual_lunch_hours)
              : parseFloat(rate?.deduct_lunch_hour) || 0;
          const netHours = totalHours - lunchDeduction;
          const txCode = (ts.transaction_code || '').toString().trim();

          let dayNT = 0,
            dayOT = 0,
            dayDT = 0;

          if (txCode === '1920') {
            dayOT = netHours;
          } else if (txCode === '1921' || txCode === '1922') {
            dayDT = netHours;
          } else if (summary.hasPublicHoliday && totalWeekdayNetHours > weeklyHours) {
            dayNT = netHours;
          } else {
            dayNT = Math.min(netHours, remainingWeekdayNT);
            dayOT = netHours - dayNT;
            remainingWeekdayNT -= dayNT;
          }

          if (dayNT > 0) {
            entry.NT[ts.dayLower] += dayNT;
            entry.days.add(ts.dayLower);
            entry.NT.count += 1;
          }
          if (dayOT > 0) {
            entry.OT[ts.dayLower] += dayOT;
            entry.days.add(ts.dayLower);
            entry.OT.count += 1;
          }
          if (dayDT > 0) {
            entry.DT[ts.dayLower] += dayDT;
            entry.days.add(ts.dayLower);
            entry.DT.count += 1;
          }
        });

        sundayTimesheets.forEach((ts) => {
          const rate = findRate(clientRates, ts.client_id, ts.occupation);
          let totalHours =
            ts.total_hours != null ? parseFloat(ts.total_hours) : calculateHours(ts.start_time, ts.end_time);
          const lunchDeduction =
            ts.actual_lunch_hours !== null &&
            ts.actual_lunch_hours !== undefined &&
            ts.actual_lunch_hours !== ''
              ? parseFloat(ts.actual_lunch_hours)
              : parseFloat(rate?.deduct_lunch_hour) || 0;
          const netHours = totalHours - lunchDeduction;

          if (netHours > 0) {
            entry.DT['sun'] += netHours;
            entry.days.add('sun');
            entry.DT.count += 1;
          }
        });
      }

      if (summary.normalTime === 0 && summary.overTime === 0 && summary.doubleTime === 0) {
        summary.timesheets?.forEach(() => {
          entry.NT.count += 1;
        });
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
      const types = ['NT', 'OT', 'DT'].filter((t) => entry[t].count > 0);
      return types.map((type) => {
        const rateInfo = entry.rateInfo || {};
        let rate = 0;
        let invoiceRate = 0;
        if (type === 'NT') {
          rate = entry.hasAdHocNT
            ? parseFloat(rateInfo.sub_total_a) || 0
            : parseFloat(rateInfo.nt_hourly_rate) || 0;
          invoiceRate = parseFloat(rateInfo.nt_invoice_rate) || 0;
        } else if (type === 'OT') {
          rate = parseFloat(rateInfo.ot_1_5_rate) || 0;
          invoiceRate = parseFloat(rateInfo.ot_1_5_invoice_rate) || 0;
        } else if (type === 'DT') {
          rate = parseFloat(rateInfo.ot_2_0_rate) || 0;
          invoiceRate = parseFloat(rateInfo.ot_2_0_invoice_rate) || 0;
        }
        return {
          key,
          entry,
          type,
          rate,
          invoiceRate,
          tsNumber:
            returnTsNumberAsArray && Array.isArray(entry.tsNumber)
              ? entry.tsNumber[0] || ''
              : entry.tsNumber || '',
          timesheetNumbers: returnTsNumberAsArray && Array.isArray(entry.tsNumber)
            ? entry.tsNumber
            : undefined,
        };
      });
    })
    .sort((a, b) => {
      const nameA = a.entry.client_name || a.entry.client_id || '';
      const nameB = b.entry.client_name || b.entry.client_id || '';
      const cmp = nameA.localeCompare(nameB);
      if (cmp !== 0) return cmp;

      if (groupByEmployee || returnTsNumberAsArray) {
        const tsA = parseFloat(a.entry.tsNumber[0] || a.key.split('|')[0]);
        const tsB = parseFloat(b.entry.tsNumber[0] || b.key.split('|')[0]);
        const tsCmp = (isNaN(tsA) ? 0 : tsA) - (isNaN(tsB) ? 0 : tsB);
        if (tsCmp !== 0) return tsCmp;

        const getBaseKey = (row) => {
          const parts = row.key.split('|');
          if (parts.length === 5) {
            return parts.slice(0, 3).concat(parts[4]).join('|');
          }
          if (parts.length === 4) {
            return parts.slice(0, 2).concat(parts[3]).join('|');
          }
          return row.key;
        };

        const baseKeyA = getBaseKey(a);
        const baseKeyB = getBaseKey(b);
        const baseKeyCmp = baseKeyA.localeCompare(baseKeyB);
        if (baseKeyCmp !== 0) return baseKeyCmp;
      }

      return (typeOrder[a.type] || 0) - (typeOrder[b.type] || 0);
    });

  return { data: rows, dates };
};

export const calculateSemiWeeklySummary = (
  semiTimesheets,
  clientRates,
  employees,
  publicHolidays = [],
  weeklyHours = 45
) => {
  const regularTimesheets = semiTimesheets.filter((ts) => ts.semi_weekly_hours !== 'n/s');
  const nightShiftTimesheets = semiTimesheets.filter((ts) => ts.semi_weekly_hours === 'n/s');

  const groups = {};

  const getLunch = (ts, rate) => {
    return ts.actual_lunch_hours !== null &&
      ts.actual_lunch_hours !== undefined &&
      ts.actual_lunch_hours !== ''
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

  regularTimesheets.forEach((ts) => {
    const rate = findRate(clientRates, ts.client_id, ts.occupation);
    const empNo = ts.co_number;
    const weekKey = getWeekStart(ts.timesheet_date);
    const txCode = (ts.transaction_code || '').toString().trim();
    const key = `${empNo}-${weekKey}-${ts.client_id}-${ts.occupation}-${txCode}`;

    if (!groups[key]) {
      const employee = employees.find(
        (emp) => emp.co_number?.toString().trim() === empNo?.toString().trim()
      );
      groups[key] = {
        co_number: empNo,
        employeeName: employee?.full_name || 'Unknown',
        weekKey,
        weekStart: getWeekStart(ts.timesheet_date),
        client_id: ts.client_id,
        occupation: ts.occupation,
        rate,
        transactionCode: txCode,
        totalNetHours: 0,
        hasPublicHoliday: false,
        hasSaturday: false,
        daysWorked: 0,
        timesheets: [],
      };
    } else if (ts.transaction_code) {
      groups[key].transactionCode = txCode;
    }

    const g = groups[key];
    g.totalNetHours += getNetHours(ts, rate);
    g.daysWorked += 1;
    g.timesheets.push(ts);
    if (getDayOfWeek(ts.timesheet_date) === 'Sat') g.hasSaturday = true;
    if (isPublicHoliday(ts.timesheet_date, publicHolidays))
      g.hasPublicHoliday = true;
  });

  const regularSummaries = Object.values(groups)
    .map((g) => {
      const normalTimeRate = g.timesheets?.some(
        (ts) => ts.shift_type === 'Ad-Hoc' || ts.shift_type === 'Adhoc'
      )
        ? parseFloat(g.rate?.sub_total_a) || 0
        : parseFloat(g.rate?.nt_hourly_rate) || 0;
      const otRate = parseFloat(g.rate?.ot_1_5_rate) || 0;
      const dtRate = parseFloat(g.rate?.ot_2_0_rate) || 0;

      let normalTime = 0;
      let overTime = 0;
      let doubleTime = 0;

      const txCode = parseInt(g.transactionCode, 10);

      if (txCode === 1921 || txCode === 1922) {
        doubleTime = g.totalNetHours;
      } else if (txCode === 1920) {
        overTime = g.totalNetHours;
      } else {
        if (g.hasPublicHoliday && g.totalNetHours > weeklyHours) {
          normalTime = g.totalNetHours;
        } else {
          normalTime = Math.min(g.totalNetHours, weeklyHours);
          overTime = Math.max(0, g.totalNetHours - weeklyHours);
        }
      }

      return {
        ...g,
        normalTime: parseFloat(normalTime.toFixed(2)),
        overTime: parseFloat(overTime.toFixed(2)),
        doubleTime: parseFloat(doubleTime.toFixed(2)),
        totalHours: parseFloat(g.totalNetHours.toFixed(2)),
        normalTimePay: parseFloat((normalTime * normalTimeRate).toFixed(2)),
        overTimePay: parseFloat((overTime * otRate).toFixed(2)),
        doubleTimePay: parseFloat((doubleTime * dtRate).toFixed(2)),
        rate: normalTimeRate,
        otRate,
        dtRate,
      };
    })
    .sort((a, b) =>
      a.co_number.localeCompare(b.co_number) ||
      a.weekKey.localeCompare(b.weekKey) ||
      a.transactionCode.localeCompare(b.transactionCode)
    );

  const nightShiftGroups = {};

  nightShiftTimesheets.forEach((ts) => {
    const rate = findRate(clientRates, ts.client_id, ts.occupation);
    const empNo = ts.co_number;
    const weekKey = getWeekStart(ts.timesheet_date);
    const txCode = (ts.transaction_code || '').toString().trim();
    const key = `${empNo}-${weekKey}-${ts.client_id}-${ts.occupation}-${txCode}`;

    if (!nightShiftGroups[key]) {
      const employee = employees.find(
        (emp) => emp.co_number?.toString().trim() === empNo?.toString().trim()
      );
      nightShiftGroups[key] = {
        co_number: empNo,
        employeeName: employee?.full_name || 'Unknown',
        weekKey,
        weekStart: getWeekStart(ts.timesheet_date),
        client_id: ts.client_id,
        occupation: ts.occupation,
        rate,
        transactionCode: txCode,
        totalNetHours: 0,
        hasPublicHoliday: false,
        hasSaturday: false,
        daysWorked: 0,
        timesheets: [],
      };
    }

    const g = nightShiftGroups[key];
    const totalHours =
      ts.total_hours != null ? parseFloat(ts.total_hours) : calculateHours(ts.start_time, ts.end_time);
    g.totalNetHours += totalHours;
    g.daysWorked += 1;
    g.timesheets.push(ts);
    if (getDayOfWeek(ts.timesheet_date) === 'Sat') g.hasSaturday = true;
    if (isPublicHoliday(ts.timesheet_date, publicHolidays))
      g.hasPublicHoliday = true;
  });

  const nightShiftSummaries = Object.values(nightShiftGroups).map((g) => {
    const normalTimeRate = g.timesheets?.some(
      (ts) => ts.shift_type === 'Ad-Hoc' || ts.shift_type === 'Adhoc'
    )
      ? parseFloat(g.rate?.sub_total_a) || 0
      : parseFloat(g.rate?.nt_hourly_rate) || 0;
    const otRate = parseFloat(g.rate?.ot_1_5_rate) || 0;
    const dtRate = parseFloat(g.rate?.ot_2_0_rate) || 0;

    let normalTime = 0;
    let overTime = 0;
    let doubleTime = 0;

    const txCode = parseInt(g.transactionCode, 10);

    if (txCode === 1921 || txCode === 1922) {
      doubleTime = g.totalNetHours;
    } else if (txCode === 1920) {
      overTime = g.totalNetHours;
    } else {
      normalTime = g.totalNetHours;
    }

    return {
      ...g,
      normalTime: parseFloat(normalTime.toFixed(2)),
      overTime: parseFloat(overTime.toFixed(2)),
      doubleTime: parseFloat(doubleTime.toFixed(2)),
      totalHours: parseFloat(g.totalNetHours.toFixed(2)),
      normalTimePay: parseFloat((normalTime * normalTimeRate).toFixed(2)),
      overTimePay: parseFloat((overTime * otRate).toFixed(2)),
      doubleTimePay: parseFloat((doubleTime * dtRate).toFixed(2)),
      rate: normalTimeRate,
      otRate,
      dtRate,
    };
  });

  return [
    ...regularSummaries,
    ...nightShiftSummaries,
  ].sort((a, b) =>
    a.co_number.localeCompare(b.co_number) ||
    a.weekKey.localeCompare(b.weekKey) ||
    a.transactionCode.localeCompare(b.transactionCode)
  );
};
