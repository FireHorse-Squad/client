import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { RefreshCw, AlertTriangle, BarChart3, MapPin, Download, ChevronDown, Calendar, Users } from "lucide-react";
import * as XLSX from "xlsx";
import api from "../utils/api";
import { onDataChange } from "../utils/dataSync";
import { calculateSemiWeeklySummary, findRate } from "../components/businesslogic/businesslogic";

import firehorseLogo from '../assets/animations/icon_no_bg.png';

const FirehorseLogo = ({ className = "w-40 h-40" }) => {
  const canvasRef = useRef(null);
  const [isHovering, setIsHovering] = useState(true);
  const animationFrameId = useRef(null);
  const particles = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth * 1.5;
      canvas.height = canvas.offsetHeight * 1.5;
    };

    resizeCanvas();

    class Particle {
      constructor() {
        const w = canvas.width;
        const h = canvas.height;

        this.x = w * 0.54;
        this.y = h * 0.56;

        this.vx = -(Math.random() * (w * 0.014) + w * 0.008);
        this.vy = Math.random() * (h * 0.01) - h * 0.002;

        this.life = 1.0;
        this.colorRate = 1 / 60;
        this.size = Math.random() * (w * 0.025) + w * 0.01;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.colorRate;
        this.size *= 0.98;
      }

      draw(ctx) {
        const r = 255;
        const g = Math.floor(this.life * 220);
        const b = Math.floor(this.life * 50);

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${this.life})`;

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (isHovering) {
        for (let i = 0; i < 4; i++) {
          particles.current.push(new Particle());
        }
      }

      particles.current = particles.current.filter(
        (particle) => particle.life > 0
      );

      particles.current.forEach((particle) => {
        particle.update();
        particle.draw(ctx);
      });

      animationFrameId.current = requestAnimationFrame(animate);
    };

    animate();

    window.addEventListener('resize', resizeCanvas);

    return () => {
      cancelAnimationFrame(animationFrameId.current);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [isHovering]);

  return (
    <div
      className={`relative overflow-visible inline-block ${className}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <img
        src={firehorseLogo}
        alt="Firehorse Logo"
        className="w-full h-full relative z-10 select-none pointer-events-none"
      />

      <canvas
        ref={canvasRef}
        className="absolute pointer-events-none z-20"
        style={{
          width: '300%',
          height: '300%',
          left: '-150%',
          top: '-100%',
        }}
      />
    </div>
  );
};

const getAdjustedDate = (date) => {
    if (!date) return "";
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return "";
    const adjusted = new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000);
    return adjusted.toISOString().split("T")[0];
};

const getLocalDateString = (date) => {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
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

const getWeekStart = (dateStr) => {
    const d = new Date(dateStr);
    const day = d.getDay();
    const diff = day === 0 ? 6 : day - 1;
    d.setDate(d.getDate() - diff);
    return getLocalDateString(d);
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

const processCostingData = (timesheets, clientRates, employees, publicHolidays = [], referenceDate = null, skipWeekFilter = false) => {
    let filteredTimesheets = timesheets.filter((ts) => {
        const adjustedDate = getAdjustedDate(ts.timesheet_date);
        return adjustedDate && ts.status !== "archived";
    });

    let dates = [];
    let weekStart = null;
    if (referenceDate) {
        dates = generateWeekDates(referenceDate);
        weekStart = dates[0]?.date || null;
    } else if (filteredTimesheets.length > 0) {
        const uniqueDates = [...new Set(filteredTimesheets.map((ts) => getAdjustedDate(ts.timesheet_date)).filter(Boolean))].sort();
        const referenceDateFromData = uniqueDates[uniqueDates.length - 1];
        dates = generateWeekDates(referenceDateFromData);
        weekStart = dates[0]?.date || null;
    } else {
        dates = generateWeekDates(new Date().toISOString().split("T")[0]);
        weekStart = dates[0]?.date || null;
    }

    if (!skipWeekFilter && weekStart) {
        filteredTimesheets = filteredTimesheets.filter((ts) => {
            const adjustedDate = getAdjustedDate(ts.timesheet_date);
            if (!adjustedDate) return false;
            if (ts.shift_type === "Semi") {
                return getWeekStart(adjustedDate) === weekStart;
            }
            return adjustedDate >= weekStart && adjustedDate <= dates[6]?.date;
        });
    }

    const semiTimesheets = filteredTimesheets.filter((ts) => ts.shift_type === "Semi");
    const nonSemiTimesheets = filteredTimesheets.filter((ts) => ts.shift_type !== "Semi");

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
            const isAdHoc = timesheet.shift_type === "Ad-Hoc" || timesheet.shift_type === "Adhoc";

            if (isBiometric) {
                totalHours = parseFloat(timesheet.total_hours) || 0;
            } else if (timesheet.shift_type !== "Task") {
                totalHours = calculateHours(timesheet.start_time, timesheet.end_time);
            } else {
                totalHours = parseFloat(timesheet.units) || 0;
            }

            const matchedRate = findRate(clientRates, timesheet.client_id, timesheet.occupation);

            const tsOccupationRaw = timesheet.occupation || "";
            const baseOccupation = tsOccupationRaw.endsWith("2.0") ? tsOccupationRaw.slice(0, -3) : tsOccupationRaw;
            const occupation = baseOccupation || "General Worker";

            if (isBiometric) {
                if (txCode === 1921 || txCode === 1922) {
                    const lunchDeduction =
                        timesheet.actual_lunch_hours !== null &&
                        timesheet.actual_lunch_hours !== undefined &&
                        timesheet.actual_lunch_hours !== ""
                            ? parseFloat(timesheet.actual_lunch_hours)
                            : parseFloat(matchedRate?.deduct_lunch_hour) || 0;
                    doubleTimeHours = totalHours - lunchDeduction;
                } else if (txCode === 1920) {
                    const lunchDeduction =
                        timesheet.actual_lunch_hours !== null &&
                        timesheet.actual_lunch_hours !== undefined &&
                        timesheet.actual_lunch_hours !== ""
                            ? parseFloat(timesheet.actual_lunch_hours)
                            : parseFloat(matchedRate?.deduct_lunch_hour) || 0;
                    overTimeHours = totalHours - lunchDeduction;
                } else {
                    const lunchDeduction =
                        timesheet.actual_lunch_hours !== null &&
                        timesheet.actual_lunch_hours !== undefined &&
                        timesheet.actual_lunch_hours !== ""
                            ? parseFloat(timesheet.actual_lunch_hours)
                            : parseFloat(matchedRate?.deduct_lunch_hour) || 0;
                    normalTime = totalHours - lunchDeduction;
                }
            } else if ((txCode === 1921 || txCode === 1922) && matchedRate) {
                const lunchDeduction =
                    timesheet.actual_lunch_hours !== null &&
                        timesheet.actual_lunch_hours !== undefined &&
                        timesheet.actual_lunch_hours !== ""
                        ? parseFloat(timesheet.actual_lunch_hours)
                        : parseFloat(matchedRate?.deduct_lunch_hour) || 0;
                doubleTimeHours = totalHours - lunchDeduction;
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

            const types = [];
            if (normalTime > 0) types.push({ type: "NT", hours: normalTime });
            if (overTimeHours > 0) types.push({ type: "OT", hours: overTimeHours });
            if (doubleTimeHours > 0) types.push({ type: "DT", hours: doubleTimeHours });

            if (types.length === 0 && timesheet.shift_type !== "Task") {
                types.push({ type: "NT", hours: 0 });
            }

            types.forEach(({ type, hours }) => {
                const groupKey = `${timesheet.timesheet_number || ""}|${timesheet.client_id || ""}|${occupation}|${type}`;
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
                        tsNumber: timesheet.timesheet_number,
                        empNo: timesheet.co_number || timesheet.empNo || timesheet.employee_no || "",
                        shift_type: timesheet.shift_type,
                    };
                }
                const entry = data[groupKey];
                entry.days.add(dayLower);
                entry[type][dayLower] += hours;
                entry[type].count += 1;
                if (type === "NT" && isAdHoc) entry.hasAdHocNT = true;
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
            const summaries = calculateSemiWeeklySummary(groupTimesheets, clientRates, employees, publicHolidays, weeklyHours);
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
            const tsNumbersList = semiTsNumbersByGroup[groupKey] ? [...semiTsNumbersByGroup[groupKey]] : [];
            const representativeTsNumber = tsNumbersList.length === 1 ? tsNumbersList[0] : (tsNumbersList[0] || "");
            if (!data[groupKey]) {
                data[groupKey] = {
                    client_id: summary.client_id,
                    client_name: summary.client_name || "",
                    occupation: summary.occupation,
                    rateInfo: fullRate,
                    hasAdHocNT: false,
                    NT: { count: 0, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 },
                    OT: { count: 0, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 },
                    DT: { count: 0, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 },
                    days: new Set(),
                    tsNumber: representativeTsNumber,
                    empNo: summary.co_number || "",
                    shift_type: "Semi",
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
            if (summary.doubleTime > 0) {
                const daysInWeek = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
                const perDay = summary.doubleTime / daysInWeek.length;
                daysInWeek.forEach(d => {
                    entry.DT[d] += perDay;
                    entry.days.add(d);
                });
                entry.DT.count += 1;
            }

            if (summary.normalTime === 0 && summary.overTime === 0 && summary.doubleTime === 0) {
                entry.NT.count += 1;
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
                return { key, entry, type, rate, invoiceRate, tsNumber: entry.tsNumber || "" };
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

const Dashboard = () => {
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
    const hasLoadedData = useRef(false);
    const [wageClerks, setWageClerks] = useState([]);
    const [selectedWeekStart, setSelectedWeekStart] = useState(() => getWeekStart(new Date()));
    const [expandedClients, setExpandedClients] = useState({});
    const [visibleClientCount, setVisibleClientCount] = useState(3);

    const toggleClient = (clientName) => {
        setExpandedClients(prev => ({
            ...prev,
            [clientName]: !prev[clientName]
        }));
    };

    const fetchData = useCallback(async () => {
        try {
            if (!hasLoadedData.current) {
                setLoading(true);
            }
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
            const timesheets = timesheetsRes.data;
            const clientRates = clientRatesRes.data;
            const employees = employeesRes.data;
            setAllTimesheets(timesheets);
            setAllClientRates(clientRates);
            setAllEmployees(employees);
            setPublicHolidays(holidays);
            hasLoadedData.current = true;
            try {
                sessionStorage.setItem('dashboard_data', JSON.stringify({
                    timesheets,
                    clientRates,
                    employees,
                    holidays,
                }));
            } catch {}
        } catch (err) {
            console.error("Error fetching data:", err);
            setError(err.response?.data?.message || err.message || "Failed to fetch data from backend");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        try {
            const cached = sessionStorage.getItem('dashboard_data');
            if (cached) {
                const parsed = JSON.parse(cached);
                if (parsed.timesheets) setAllTimesheets(parsed.timesheets);
                if (parsed.clientRates) setAllClientRates(parsed.clientRates);
                if (parsed.employees) setAllEmployees(parsed.employees);
                if (parsed.holidays) setPublicHolidays(parsed.holidays);
                hasLoadedData.current = true;
            }
        } catch {}
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
        let isMounted = true;
        api.get('/auth/users')
            .then(res => {
                if (!isMounted) return;
                const clerks = (res.data || []).filter(u => u.role === 'Wages Clerk');
                setWageClerks(clerks);
            })
            .catch(() => {});
        return () => { isMounted = false; };
    }, []);

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

    const { allData } = useMemo(() => {
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

        const result = processCostingData(filteredTimesheets, filteredClientRates, allEmployees, publicHolidays, null, true);
        return { allData: result.data };
    }, [allTimesheets, allClientRates, allEmployees, publicHolidays, selectedClientName, selectedClientId, selectedTsNo]);

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

    const weeklyClerkSummary = useMemo(() => {
        const weekDates = [];
        const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        for (let i = 0; i < 7; i++) {
            const d = new Date(selectedWeekStart + "T00:00:00");
            d.setDate(d.getDate() + i);
            weekDates.push({
                date: getLocalDateString(d),
                day: dayNames[i],
                isWeekend: i >= 5,
            });
        }

        const activeTimesheets = allTimesheets.filter((ts) => ts.status !== "archived" && ts.created_at);

        return wageClerks.map(clerk => {
            const clerkTimesheets = activeTimesheets.filter((ts) => ts.user_id === clerk.id);
            const dailyCounts = weekDates.map((wd) => {
                const count = clerkTimesheets.filter((ts) => {
                    const created = new Date(ts.created_at);
                    if (isNaN(created.getTime())) return false;
                    return getLocalDateString(created) === wd.date;
                }).length;
                return { ...wd, count };
            });
            const total = dailyCounts.reduce((sum, d) => sum + d.count, 0);
            return {
                id: clerk.id,
                name: clerk.full_name || clerk.name || `Clerk ${clerk.id}`,
                dailyCounts,
                total,
            };
        }).sort((a, b) => a.name.localeCompare(b.name));
    }, [allTimesheets, wageClerks, selectedWeekStart]);

    const weekOptions = useMemo(() => {
        const options = [];
        const today = new Date();
        for (let i = 0; i < 2; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - i * 7);
            const start = getWeekStart(d);
            const startParts = start.split("-").map(Number);
            const startDate = new Date(startParts[0], startParts[1] - 1, startParts[2]);
            const endDate = new Date(startParts[0], startParts[1] - 1, startParts[2] + 6);
            const label = `Week of ${startDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} – ${endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
            options.push({ value: start, label });
        }
        return options;
    }, []);

    const uniqueClientRates = useMemo(() => {
        const seen = new Set();
        return allClientRates.filter(rate => {
            if (!rate.client_id) return false;
            const id = rate.client_id.toString().trim();
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
        });
    }, [allClientRates]);

    const clientCosting = useMemo(() => {
        const costingByClientName = {};
        let totalCost = 0;

        const getRate = (clientId) => uniqueClientRates.find(r => r.client_id.toString().trim() === clientId.toString().trim());

        allData.forEach(row => {
            const clientName = row.entry.client_name?.toString().trim();
            const clientId = row.entry.client_id?.toString().trim();
            if (!clientName || !clientId) return;

            const key = clientName;
            if (!costingByClientName[key]) {
                costingByClientName[key] = {
                    client_name: clientName,
                    cost_centres: [],
                    total_hours: 0,
                    total_cost: 0,
                };
            }

            const client = costingByClientName[key];
            const typeHours = row.type === "NT" ? row.entry.NT : row.type === "OT" ? row.entry.OT : row.entry.DT;
            const rowHrs = typeHours.mon + typeHours.tue + typeHours.wed + typeHours.thu + typeHours.fri + typeHours.sat + typeHours.sun;

            let cc = client.cost_centres.find(c => c.client_id === clientId);
            if (!cc) {
                const rate = getRate(clientId);
                cc = {
                    client_id: clientId,
                    site: rate?.site || '',
                    hours: 0,
                    cost: 0,
                };
                client.cost_centres.push(cc);
            }

            cc.hours += rowHrs;
            cc.cost += rowHrs * row.rate;
            client.total_hours += rowHrs;
            client.total_cost += rowHrs * row.rate;
            totalCost += rowHrs * row.rate;
        });

        uniqueClientRates.forEach(rate => {
            const clientName = rate.client_name?.toString().trim();
            const clientId = rate.client_id.toString().trim();
            if (!clientName) return;

            const key = clientName;
            if (!costingByClientName[key]) {
                costingByClientName[key] = {
                    client_name: clientName,
                    cost_centres: [{
                        client_id: clientId,
                        site: rate.site || '',
                        hours: 0,
                        cost: 0,
                    }],
                    total_hours: 0,
                    total_cost: 0,
                };
            } else {
                const existing = costingByClientName[key].cost_centres.find(c => c.client_id === clientId);
                if (!existing) {
                    costingByClientName[key].cost_centres.push({
                        client_id: clientId,
                        site: rate.site || '',
                        hours: 0,
                        cost: 0,
                    });
                }
            }
        });

        return Object.values(costingByClientName)
            .map(client => ({
                client: client.client_name,
                cost_centres: client.cost_centres
                    .filter(cc => cc.hours > 0 || cc.cost > 0)
                    .sort((a, b) => a.client_id.localeCompare(b.client_id)),
                hours: `${client.total_hours.toFixed(1)} hrs`,
                amount: `R ${client.total_cost.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                progress: totalCost > 0 ? Math.round(client.total_cost / totalCost * 100) : 0,
                total_cost: client.total_cost,
            }))
            .filter(client => {
                if (selectedClientName && client.client !== selectedClientName) return false;
                if (selectedClientId && !client.cost_centres.some(cc => cc.client_id === selectedClientId)) return false;
                return client.cost_centres.length > 0;
            })
            .sort((a, b) => a.client.localeCompare(b.client));
    }, [allData, uniqueClientRates, selectedClientName, selectedClientId]);

    const visibleClients = clientCosting.slice(0, visibleClientCount);
    const hasMoreClients = visibleClientCount < clientCosting.length;

    const exportClientCosting = () => {
        const data = clientCosting.flatMap((client) =>
            client.cost_centres.map((cc) => ({
                "Client Name": client.client,
                "Client ID": cc.client_id,
                Site: cc.site,
                Hours: `${cc.hours.toFixed(1)} hrs`,
                Amount: `R ${cc.cost.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            }))
        );

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Client Costing");
        XLSX.writeFile(workbook, "Client_Costing_Breakdown.xlsx");
    };

    return (
        <div className="min-h-screen bg-slate-100 p-4 md:p-6">
            {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                    <p className="text-red-600 font-medium">Error: {error}</p>
                    <button onClick={fetchData} className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition">
                        Retry
                    </button>
                </div>
            )}

            <div className="mb-8 rounded-[24px] bg-white p-6 shadow-sm">
                <div className="grid grid-cols-1 items-end gap-5 lg:grid-cols-[1.2fr_1fr_1fr_1fr_55px]">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Cost Centre</h2>
                        <p className="mt-1 text-sm text-slate-400">Select a client name and cost center</p>
                    </div>
                    <div>
                        <label className="mb-2 block text-[11px] font-bold tracking-widest text-slate-400">CLIENT NAME</label>
                        <div className="relative">
                            <select
                                value={selectedClientName}
                                onChange={handleClientNameChange}
                                disabled={loading}
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-indigo-400 appearance-none disabled:bg-slate-100"
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
                    <div>
                        <label className="mb-2 block text-[11px] font-bold tracking-widest text-slate-400">COST CENTRE</label>
                        <div className="relative">
                            <select
                                value={selectedClientId}
                                onChange={handleClientIdChange}
                                disabled={loading}
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-indigo-400 appearance-none disabled:bg-slate-100"
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
                    <div>
                        <label className="mb-2 block text-[11px] font-bold tracking-widest text-slate-400">FILTER BY TIMESHEET NO</label>
                        <div className="relative">
                            <select
                                value={selectedTsNo}
                                onChange={handleTsNoChange}
                                disabled={loading}
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-indigo-400 appearance-none disabled:bg-slate-100"
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
                    <button type="button" onClick={handleRefresh} disabled={isRefreshing || loading} className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-indigo-600 disabled:opacity-50">
                        <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[20px] bg-white p-6 shadow-sm">
                    <p className="text-xs font-semibold tracking-wider text-slate-400">TOTAL ACCUMULATED HOURS</p>
                    <div className="mt-4 flex items-baseline gap-1 text-3xl font-bold tracking-tight text-slate-900">
                        <span>{kpiTotals.totalHrs.toFixed(1)}</span>
                        <span className="text-sm font-medium text-slate-500">hrs</span>
                    </div>
                    <p className="mt-4 flex items-center gap-2 text-xs font-medium text-indigo-500">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                        Across {allData.length} schedule entries
                    </p>
                </div>

                <div className="rounded-[20px] bg-white p-6 shadow-sm">
                    <p className="text-xs font-semibold tracking-wider text-slate-400">COSTING PROJECTION</p>
                    <div className="mt-4 flex items-baseline gap-1 text-3xl font-bold tracking-tight text-slate-900">
                        <span className="text-lg font-medium text-slate-400">R</span>
                        <span>{kpiTotals.cost.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <p className="mt-4 flex items-center gap-2 text-xs font-medium text-orange-500">
                        <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                        Calculated internal expense
                    </p>
                </div>

                <div className="rounded-[20px] bg-white p-6 shadow-sm">
                    <p className="text-xs font-semibold tracking-wider text-slate-400">PROJECTED BILLING INVOICE</p>
                    <div className="mt-4 flex items-baseline gap-1 text-3xl font-bold tracking-tight text-indigo-600">
                        <span className="text-lg font-medium text-indigo-400">R</span>
                        <span>{kpiTotals.charge.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <p className="mt-4 flex items-center gap-2 text-xs font-medium text-green-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        Est. revenue generation
                    </p>
                </div>

                <div className="rounded-[20px] bg-white p-6 shadow-sm">
                    <p className="text-xs font-semibold tracking-wider text-slate-400">OPERATING MARGIN</p>
                    <div className="mt-4 flex items-baseline gap-1 text-3xl font-bold tracking-tight text-slate-900">
                        <span>{kpiTotals.margin.toFixed(1)}</span>
                        <span className="text-sm font-medium text-slate-500">%</span>
                    </div>
                    <p className="mt-4 flex items-center gap-2 text-xs font-medium text-indigo-500">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                        Net profitability ratio
                    </p>
                </div>
            </div>

            {/* <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[20px] bg-white p-6 shadow-sm">
                    <p className="text-xs font-semibold tracking-wider text-slate-400">PROVIDENT FUND</p>
                    <div className="mt-4 flex items-baseline gap-1 text-3xl font-bold tracking-tight text-slate-900">
                        <span className="text-lg font-medium text-slate-400">R</span>
                        <span>0</span>
                    </div>
                    <p className="mt-4 flex items-center gap-2 text-xs font-medium text-indigo-500">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                        Across 0 schedule entries
                    </p>
                </div>

                <div className="rounded-[20px] bg-white p-6 shadow-sm">
                    <p className="text-xs font-semibold tracking-wider text-slate-400">PPE</p>
                    <div className="mt-4 flex items-baseline gap-1 text-3xl font-bold tracking-tight text-slate-900">
                        <span className="text-lg font-medium text-slate-400">R</span>
                        <span>0</span>
                    </div>
                    <p className="mt-4 flex items-center gap-2 text-xs font-medium text-indigo-500">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                        Across 0 schedule entries
                    </p>
                </div>

                <div className="rounded-[20px] bg-white p-6 shadow-sm">
                    <p className="text-xs font-semibold tracking-wider text-slate-400">UIF</p>
                    <div className="mt-4 flex items-baseline gap-1 text-3xl font-bold tracking-tight text-slate-900">
                        <span className="text-lg font-medium text-slate-400">R</span>
                        <span>0</span>
                    </div>
                    <p className="mt-4 flex items-center gap-2 text-xs font-medium text-indigo-500">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                        Across 0 schedule entries
                    </p>
                </div>

                <div className="rounded-[20px] bg-white p-6 shadow-sm">
                    <p className="text-xs font-semibold tracking-wider text-slate-400">SDL</p>
                    <div className="mt-4 flex items-baseline gap-1 text-3xl font-bold tracking-tight text-slate-900">
                        <span className="text-lg font-medium text-slate-400">R</span>
                        <span>0</span>
                    </div>
                    <p className="mt-4 flex items-center gap-2 text-xs font-medium text-indigo-500">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                        Across 0 schedule entries
                    </p>
                </div>
            </div> */}

            <div className="rounded-[24px] border border-indigo-100 bg-white p-6 shadow-sm">
                <div className="mb-5 flex flex-col gap-4 border-b border-indigo-50 pb-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex gap-4">

                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Timesheets Captured This Week</h2>
                            <p className="mt-1 text-sm text-slate-500">Daily timesheet captures by Wage Clerk for the selected week.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <select
                                value={selectedWeekStart}
                                onChange={(e) => setSelectedWeekStart(e.target.value)}
                                className="h-9 appearance-none rounded-xl border border-indigo-200 bg-indigo-50/40 pl-3 pr-8 text-sm font-semibold text-indigo-700 outline-none focus:border-indigo-400"
                            >
                                {weekOptions.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                            <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-indigo-500">
                                <ChevronDown className="w-4 h-4" />
                            </span>
                        </div>
                        <div className="flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/40 px-3 py-2 text-sm font-semibold text-indigo-700">
                            <Users size={16} className="text-indigo-600" />
                            {wageClerks.length} Wage Clerk{wageClerks.length !== 1 ? 's' : ''}
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200">
                                <th className="pb-3 text-left text-xs font-bold tracking-wider text-slate-500">Wage Clerk</th>
                                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                                    <th key={day} className="pb-3 text-center text-xs font-bold tracking-wider text-slate-500">{day}</th>
                                ))}
                                <th className="pb-3 text-right text-xs font-bold tracking-wider text-slate-500">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {weeklyClerkSummary.map((clerk) => (
                                <tr key={clerk.id} className="border-b border-slate-100 last:border-b-0">
                                    <td className="py-4">
                                        <span className="text-sm font-bold text-slate-900">{clerk.name}</span>
                                    </td>
                                    {clerk.dailyCounts.map((day) => (
                                        <td key={day.date} className="px-2 py-4 text-center">
                                            <span className={`text-sm font-bold ${
                                                day.count > 0 ? 'text-slate-900' : 'text-slate-300'
                                            }`}>
                                                {day.count}
                                            </span>
                                        </td>
                                    ))}
                                    <td className="px-2 py-4 text-right">
                                        <span className="text-sm font-black text-slate-900">{clerk.total}</span>
                                    </td>
                                </tr>
                            ))}
                            {weeklyClerkSummary.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="px-2 py-8 text-center text-sm text-slate-500">No wage clerks found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="rounded-[24px] bg-white p-6 shadow-sm mt-8">
                <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="flex items-center gap-3">
                            <BarChart3 size={22} className="text-indigo-600" />
                            <h2 className="text-xl font-bold text-slate-900">Client Costing Breakdown per COST CENTRE</h2>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">Internal timesheet costing separated by COST CENTRE and site location</p>
                    </div>
                    <button onClick={exportClientCosting} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700">
                        <Download size={18} /> Download Excel
                    </button>
                </div>

                <div className="space-y-5">
                    {visibleClients.map((client, index) => {
                        const isExpanded = !!expandedClients[client.client];
                        return (
                            <div key={index} className="rounded-[18px] border border-slate-200 bg-slate-50/40 p-5">
                                <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                    <div className="flex items-center justify-between lg:flex-1">
                                        <h3 className="text-base font-bold text-slate-900">{client.client}</h3>
                                        <button
                                            onClick={() => toggleClient(client.client)}
                                            className="lg:hidden p-1 -mr-1"
                                        >
                                            <ChevronDown
                                                size={20}
                                                className={`text-slate-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                            />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-left lg:text-right">
                                            <div className="text-sm font-semibold text-slate-500">{client.hours}</div>
                                            <div className="mt-1 text-base font-bold text-slate-900">{client.amount}</div>
                                        </div>
                                        <button
                                            onClick={() => toggleClient(client.client)}
                                            className="hidden lg:flex p-1 -mr-1"
                                        >
                                            <ChevronDown
                                                size={20}
                                                className={`text-slate-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                            />
                                        </button>
                                    </div>
                                </div>
                                {isExpanded && (
                                    <div className="space-y-4">
                                        {client.cost_centres.map((cc) => {
                                            const progress = client.total_cost > 0 ? Math.round(cc.cost / client.total_cost * 100) : 0;
                                            return (
                                                <div key={cc.client_id} className="flex items-center gap-4">
                                                    <div className="w-48 shrink-0">
                                                        <div className="text-sm font-bold text-slate-700">{cc.client_id}</div>
                                                        <div className="text-xs text-slate-500">{cc.site}</div>
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
                                                            <span>COST</span>
                                                            <span>{progress}%</span>
                                                        </div>
                                                        <div className="h-[17px] overflow-hidden rounded-full bg-slate-200">
                                                            <div className="h-full rounded-full bg-gradient-to-r from-slate-400 via-indigo-500 to-indigo-600 transition-all duration-500" style={{width: progress + '%'}} />
                                                        </div>
                                                    </div>
                                                    <div className="w-32 text-right">
                                                        <div className="text-sm font-semibold text-slate-500">{cc.hours.toFixed(1)} hrs</div>
                                                        <div className="text-base font-bold text-slate-900">R {cc.cost.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {hasMoreClients && (
                        <button
                            onClick={() => setVisibleClientCount(prev => prev + 3)}
                            className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50"
                        >
                            Show More
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
