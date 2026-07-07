import React, { useState, useEffect, useCallback } from "react";
import { RefreshCw, Clock, Calculator } from "lucide-react";
import EmployeeHoursTable from "../components/employee/EmployeeHoursTable";
import EmployeeWagesTable from "../components/employee/EmployeeWagesTable";
import api from "../utils/api";
import { onDataChange } from "../utils/dataSync";
import { calculateEmployeeData } from "../components/businesslogic/businesslogic";

const HoursWages = () => {
    const [employeeData, setEmployeeData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchCoNumber, setSearchCoNumber] = useState('');
    const [activeTab, setActiveTab] = useState('hours');

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const [timesheetsRes, clientRatesRes, employeesRes] = await Promise.all([
                api.get('/timesheets'),
                api.get('/clientrates'),
                api.get('/employees'),
            ]);

            const timesheets = timesheetsRes.data;
            const activeTimesheets = timesheets.filter(ts => ts.status !== 'archived');
            const clientRates = clientRatesRes.data;
            const employees = employeesRes.data;

            const data = calculateEmployeeData(activeTimesheets, clientRates, employees);
            setEmployeeData(data);
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
            fetchData();
        });
        return () => {
            unsubscribe();
        };
    }, [fetchData]);

    const filteredEmployeeData = employeeData.filter(data =>
        data.co_number.toString().toLowerCase().includes(searchCoNumber.toLowerCase())
    );

    return (
        <>
            <header className="py-6 px-8 rounded-[10px] border border-[#F5F5F5] bg-white sticky top-0 z-10 shadow-sm">
                <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                        <h1 className="text-[18px] font-bold text-[#EE8623]">
                            Hours And Wages
                        </h1>
                        <p className="text-sm text-gray-400">Streamline your payroll workflow with real-time tracking of hours and wages.</p>
                    </div>
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="flex items-center space-x-2 px-4 py-2 bg-[#1742c4] text-white font-medium rounded-lg shadow-md hover:bg-[#4F46E5] transition disabled:bg-gray-400"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
                        <span>Refresh</span>
                    </button>
                </div>
            </header>

            <main className="p-8 w-full">
                <div className="max-w-7xl mx-auto">
                    <div className="w-full flex border-b border-[#F5F5F5] shadow-sm mb-4 bg-white rounded-t-lg">
                        <button
                            onClick={() => {
                                setActiveTab('hours');
                                setSearchCoNumber('');
                            }}
                            className={`px-8 py-3 font-semibold transition flex items-center gap-2 ${
                                activeTab === 'hours'
                                    ? "border-b-4 border-[#1742c4] text-[#1742c4]"
                                    : "text-gray-400 hover:text-gray-600"
                            }`}
                        >
                            <Clock className="w-5 h-5" />
                            Employee Hours
                        </button>
                        <button
                            onClick={() => {
                                setActiveTab('wages');
                                setSearchCoNumber('');
                            }}
                            className={`px-8 py-3 font-semibold transition flex items-center gap-2 ${
                                activeTab === 'wages'
                                    ? "border-b-4 border-[#1742c4] text-[#1742c4]"
                                    : "text-gray-400 hover:text-gray-600"
                            }`}
                        >
                            <Calculator className="w-5 h-5" />
                            Employee Wages
                        </button>
                    </div>

                    <div className="mb-4">
                        <input
                            type="text"
                            placeholder="Search by CO Number..."
                            value={searchCoNumber}
                            onChange={(e) => setSearchCoNumber(e.target.value)}
                            className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1742c4] focus:border-transparent"
                        />
                    </div>

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
                    {!loading && !error && (
                        <>
                            {searchCoNumber && filteredEmployeeData.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-gray-500">No employee with that CO Number has been found.</p>
                                </div>
                            ) : (
                                <>
                                    {activeTab === 'hours' && (
                                        <EmployeeHoursTable data={filteredEmployeeData} rowsPerPage={20} />
                                    )}
                                    {activeTab === 'wages' && (
                                        <EmployeeWagesTable data={filteredEmployeeData} rowsPerPage={20} />
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>
            </main>
        </>
    );
};

export default HoursWages;
