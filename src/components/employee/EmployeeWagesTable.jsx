import React, { useState } from "react";
import { Calculator } from "lucide-react";
import Pagination from "@mui/material/Pagination";
import Stack from "@mui/material/Stack";

const EmployeeWagesTable = ({ data, rowsPerPage = 5 }) => {
    const [page, setPage] = useState(1);

    const handleChange = (event, value) => {
        setPage(value);
    };

    const startIndex = (page - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedData = data.slice(startIndex, endIndex);
    const pageCount = Math.ceil(data.length / rowsPerPage);

    return (
        <div className="bg-white shadow-xl rounded-xl p-6 mt-6">
            <h2 className="text-xl font-bold text-[#1742c4] mb-4 pb-2 border-b-2 border-[#1742c4] flex items-center gap-2">
                Employee Wages Table <Calculator className="w-5 h-5" />
            </h2>

            <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full min-w-[400px] divide-y divide-purple-200">
                    <thead className="bg-[#1742c4]">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">TS No.</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">CO Number</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Employee Name</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Normal Time Pay (R)</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Overtime Pay (R)</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Double Time Wages (R)</th>
                        </tr>
                    </thead>

                    <tbody className="bg-white divide-y divide-gray-100">
                        {paginatedData.map((row, index) => (
                            <tr key={index + startIndex} className="hover:bg-purple-50 transition duration-100">
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{row.ts_number}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{row.date}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{row.co_number}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{row.employeeName}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">R {row.normalTimePay}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">R {row.overTimePay}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">R {row.doubleTimePay}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {data.length === 0 && (
                <p className="text-center py-8 text-gray-500 italic">No data available.</p>
            )}

            {data.length > rowsPerPage && (
                <Stack spacing={2} className="mt-4 items-center">
                    <Pagination
                        count={pageCount}
                        page={page}
                        onChange={handleChange}
                        variant="outlined"
                        color="secondary"
                    />
                </Stack>
            )}
        </div>
    );
};

export default EmployeeWagesTable;
