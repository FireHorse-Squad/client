import React, { useState, useEffect, useCallback, useMemo } from "react";
import { RefreshCw, FileDown } from "lucide-react";
import BatchExportTable from "../components/batchExport/BatchExportTable";
import api from "../utils/api";
import { onDataChange } from "../utils/dataSync";
import { calculateBatchExportData } from "../components/businesslogic/businesslogic";
import DateRangePicker from "../components/common/DateRangePicker";

const BatchExport = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedClient, setSelectedClient] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rawTimesheets, setRawTimesheets] = useState([]);
  const [rawClientRates, setRawClientRates] = useState([]);
  const [rawEmployees, setRawEmployees] = useState([]);
  const [rawPublicHolidays, setRawPublicHolidays] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [timesheetsRes, clientRatesRes, employeesRes] = await Promise.all([
        api.get("/timesheets"),
        api.get("/clientrates"),
        api.get("/employees"),
      ]);

      let publicHolidays = [];
      try {
        const phRes = await api.get("/publicholidays");
        publicHolidays = phRes.data || [];
      } catch {
        publicHolidays = [];
      }

      setRawTimesheets(timesheetsRes.data || []);
      setRawClientRates(clientRatesRes.data || []);
      setRawEmployees(employeesRes.data || []);
      setRawPublicHolidays(publicHolidays);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to fetch data from backend",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const unsubscribe = onDataChange(() => {
      if (document.visibilityState === "visible") fetchData();
    });
    return () => {
      unsubscribe();
    };
  }, [fetchData]);

  const groupedData = useMemo(() => {
    if (!rawTimesheets.length) return {};

    let activeTimesheets = rawTimesheets.filter(
      (ts) => ts.status !== "archived",
    );

    if (startDate || endDate) {
      activeTimesheets = activeTimesheets.filter((ts) => {
        const tsDate = (ts.timesheet_date || "").toString().split(/[T\s]/)[0];
        if (startDate && endDate) {
          if (tsDate < startDate || tsDate > endDate) return false;
        } else if (startDate) {
          if (tsDate !== startDate) return false;
        } else if (endDate) {
          if (tsDate !== endDate) return false;
        }
        return true;
      });
    }

    const data = calculateBatchExportData(
      activeTimesheets,
      rawClientRates,
      rawEmployees,
      rawPublicHolidays,
    );

    return data.reduce((acc, item) => {
      const clientId = item.costCentre;
      if (!acc[clientId]) {
        acc[clientId] = [];
      }
      acc[clientId].push(item);
      return acc;
    }, {});
  }, [
    rawTimesheets,
    rawClientRates,
    rawEmployees,
    rawPublicHolidays,
    startDate,
    endDate,
  ]);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-200/80 shadow-xs">
              <FileDown className="w-5 h-5 text-slate-700" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Batch Export
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Export timesheet data for payroll processing.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 mb-2 sm:mb-0">
              <label className="text-sm font-medium text-slate-700 whitespace-nowrap">
                Date:
              </label>
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onStartChange={setStartDate}
                onEndChange={setEndDate}
                onClear={() => {
                  setStartDate("");
                  setEndDate("");
                }}
                buttonClassName="h-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700 whitespace-nowrap">
                Export:
              </label>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="h-10 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1742c4] focus:border-transparent"
              >
                <option value="">Select Client</option>
                {Object.keys(groupedData)
                  .sort()
                  .map((clientId) => (
                    <option key={clientId} value={clientId}>
                      {clientId}
                    </option>
                  ))}
              </select>
            </div>

            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-[#1742c4] text-white font-medium rounded-lg shadow-md hover:bg-[#4F46E5] transition disabled:bg-gray-400"
            >
              <RefreshCw
                className={`w-5 h-5 ${loading ? "animate-spin" : ""}`}
              />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      <div className="w-full">
        {loading && (
          <div className="text-center py-8">
            <p className="text-gray-500">Loading data...</p>
          </div>
        )}
        {error && (
          <div className="text-center py-8">
            <p className="text-red-500">Error: {error}</p>
          </div>
        )}
        {!loading && !error && !selectedClient && (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="text-slate-300 text-6xl mb-4">📊</div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">
              Select a Client to Export
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Choose a client from the dropdown above to view and export their
              batch timesheet data. The table will display calculated hours,
              rates, and amounts for each employee.
            </p>
          </div>
        )}
        {!loading && !error && selectedClient && (
          <BatchExportTable
            data={groupedData[selectedClient]}
            clientId={selectedClient}
          />
        )}
      </div>
    </div>
  );
};

export default BatchExport;
