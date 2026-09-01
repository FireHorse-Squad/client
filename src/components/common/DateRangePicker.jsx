import React, { useState, useRef, useEffect } from "react";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const getAdjustedDate = (date) => {
    if (!date) return "";
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return "";
    const adjusted = new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000);
    return adjusted.toISOString().split("T")[0];
};

const formatDateShort = (d) => {
    if (!d) return "";
    const date = new Date(d + "T00:00:00");
    return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
};

const DateRangePicker = ({ startDate, endDate, onStartChange, onEndChange, onClear }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [viewMonth, setViewMonth] = useState(() => {
        const ref = startDate || endDate || new Date().toISOString().split("T")[0];
        const d = new Date(ref + "T00:00:00");
        return new Date(d.getFullYear(), d.getMonth(), 1);
    });
    const wrapperRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    const handleDayClick = (day) => {
        if (!day) return;
        const clicked = getAdjustedDate(new Date(year, month, day));
        const hasStart = Boolean(startDate);
        const hasEnd = Boolean(endDate);
        if (!hasStart || (hasStart && hasEnd)) {
            onStartChange(clicked);
            onEndChange("");
        } else if (hasStart && !hasEnd) {
            if (clicked === startDate) {
                onEndChange(clicked);
            } else if (clicked < startDate) {
                onEndChange(startDate);
                onStartChange(clicked);
            } else {
                onEndChange(clicked);
            }
            setIsOpen(false);
        }
    };

    const isInRange = (day) => {
        if (!day || !startDate || !endDate) return false;
        const d = getAdjustedDate(new Date(year, month, day));
        return d > startDate && d < endDate;
    };

    const isStart = (day) => {
        if (!day || !startDate) return false;
        return getAdjustedDate(new Date(year, month, day)) === startDate;
    };

    const isEnd = (day) => {
        if (!day || !endDate) return false;
        return getAdjustedDate(new Date(year, month, day)) === endDate;
    };

    const prevMonth = () => {
        setViewMonth(new Date(year, month - 1, 1));
    };

    const nextMonth = () => {
        setViewMonth(new Date(year, month + 1, 1));
    };

    const handleToggle = () => {
        setIsOpen((prev) => !prev);
    };

    const handleClear = (e) => {
        e.stopPropagation();
        onClear?.();
    };

    const hasRange = Boolean(startDate && endDate);

    return (
        <div className="relative" ref={wrapperRef}>
            <button
                type="button"
                onClick={handleToggle}
                className="relative flex items-center gap-2 px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#1742c4]"
                title="Select date"
            >
                <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
                </svg>
                {hasRange ? (
                    <span className="text-slate-700 text-left text-xs font-medium">
                        {formatDateShort(startDate)} - {formatDateShort(endDate)}
                    </span>
                ) : (
                    <span className="text-slate-400 text-left text-xs">Select dates</span>
                )}
                {hasRange && (
                    <span
                        role="button"
                        tabIndex={0}
                        onClick={handleClear}
                        className="text-slate-400 hover:text-slate-600"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-3 z-50 w-[280px]">
                    <div className="flex items-center justify-between mb-2">
                        <button type="button" onClick={prevMonth} className="p-1 hover:bg-slate-100 rounded">
                            <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <span className="text-sm font-bold text-slate-800">
                            {MONTHS[month]} {year}
                        </span>
                        <button type="button" onClick={nextMonth} className="p-1 hover:bg-slate-100 rounded">
                            <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 mb-1">
                        {DAYS.map((d) => (
                            <div key={d} className="text-center text-[10px] font-bold text-slate-500 py-1">{d}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                        {days.map((day, idx) => {
                            if (!day) return <div key={`empty-${idx}`} className="p-1" />;
                            const inRange = isInRange(day);
                            const isStartDay = isStart(day);
                            const isEndDay = isEnd(day);
                            return (
                                <button
                                    key={day}
                                    type="button"
                                    onClick={() => handleDayClick(day)}
                                    className={`
                                        relative py-1.5 text-xs rounded-md transition-colors
                                        ${isStartDay || isEndDay
                                            ? "bg-[#1742c4] text-white font-bold"
                                            : inRange
                                                ? "bg-indigo-100 text-indigo-700"
                                                : "text-slate-700 hover:bg-slate-100"
                                        }
                                    `}
                                >
                                    {day}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DateRangePicker;
