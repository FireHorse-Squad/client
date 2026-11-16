/**
 * Shared date/time utilities used across the payroll application.
 *
 * Consolidates duplicated functions that previously existed in:
 * - businesslogic.jsx
 * - Dashboard.jsx
 * - CostingSchedule.jsx
 * - timesheetlist.jsx
 * - timesheetmodal.jsx
 * - Employees.jsx
 */

/**
 * Adjust a date to local timezone ISO string (YYYY-MM-DD)
 */
export const getAdjustedDate = (date) => {
  if (!date) return '';
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return '';
  const adjusted = new Date(
    dateObj.getTime() - dateObj.getTimezoneOffset() * 60000
  );
  return adjusted.toISOString().split('T')[0];
};

/**
 * Calculate hours between two time strings (HH:MM format)
 */
export const calculateHours = (timeIn, timeOut) => {
  const start = new Date(`1970-01-01T${timeIn}`);
  const end = new Date(`1970-01-01T${timeOut}`);
  let diff = (end - start) / (1000 * 60 * 60);
  if (diff <= 0) diff += 24;
  return diff;
};

/**
 * Get day of week name from date string
 */
export const getDayOfWeek = (dateStr) => {
  const date = new Date(dateStr);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()];
};

/**
 * Get week bounds (Monday to Sunday) for a given date
 */
export const getWeekBounds = (dateStr) => {
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

/**
 * Get week start date (Monday) as YYYY-MM-DD
 */
export const getWeekStart = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d.toISOString().split('T')[0];
};

/**
 * Generate 7 day dates for a week starting from reference date
 */
export const generateWeekDates = (referenceDate) => {
  const { start } = getWeekBounds(referenceDate);
  const dates = [];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(start);
    currentDate.setDate(start.getDate() + i);
    dates.push({ day: days[i], date: currentDate.toISOString().split('T')[0] });
  }
  return dates;
};

/**
 * Format a date header for display (e.g. "15 Jan")
 */
export const formatDateHeader = (dateStr) => {
  const date = new Date(dateStr + 'T00:00:00');
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${date.getDate()} ${months[date.getMonth()]}`;
};

/**
 * Check if a date is a public holiday
 */
export const isPublicHoliday = (dateStr, publicHolidays) => {
  if (!publicHolidays || !publicHolidays.length) return false;
  return publicHolidays.some((ph) => ph === dateStr);
};

/**
 * Format a day value for display (shows 0.00 for near-zero)
 */
export const formatDayValue = (val) => (val > 0.005 ? val.toFixed(2) : '0.00');
