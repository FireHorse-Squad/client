//import ReportModal from "../components/ReportModal";
import { FileSpreadsheet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";


import * as XLSX from "xlsx";
import {
  RefreshCw,
  AlertTriangle,
  BarChart3,
  MapPin,
  Download,
} from "lucide-react";

const exportClientCosting = () => {
  const data = clientCosting.map((client) => ({
    "Client Name": client.client,
    "Client ID": client.id,
    Site: client.site,
    Hours: client.hours,
    Amount: client.amount,
    "Cost %": `${client.progress}%`,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();

 XLSX.utils.book_append_sheet(
  workbook,
  worksheet,
  "Client Costing"
);
  XLSX.writeFile(workbook, "Client_Costing_Breakdown.xlsx");
};

const Dashboard = () => {
const navigate = useNavigate();

 const [showReportModal, setShowReportModal] = useState(false);

  const reportColumns = [
  { key: "employeeNumber", label: "Employee Number" },
  { key: "employeeName", label: "Employee Name" },
  
  { key: "hoursWorked", label: "Hours Worked" },
  { key: "employeeRate", label: "Employee Rate" },
  { key: "employeeOTRate", label: "Employee OT Rate" },
  { key: "employeeDTRate", label: "Employee DT Rate" },
  { key: "employeeTotal", label: "Employee Total" },
  { key: "employeeOTTotal", label: "Employee OT Total" },
  { key: "employeeDTTotal", label: "Employee DT Total" },
  { key: "invoiceRate", label: "Invoice Rate" },
  { key: "invoiceOTRate", label: "Invoice OT Rate" },
  { key: "invoiceDTRate", label: "Invoice DT Rate" },
  { key: "invoiceTotal", label: "Invoice Total" },
  { key: "invoiceOTTotal", label: "Invoice OT Total" },
  { key: "invoiceDTTotal", label: "Invoice DT Total" },
  { key: "timesheetNumber", label: "Timesheet Number" },
];



  // =========================
  // SUMMARY DATA
  // =========================

  const summaryCards = [
    {
      title: "TOTAL ACCUMULATED HOURS",
      value: "14586.2",
      unit: "hrs",
      footer: "Across 234 schedule entries",
      footerColor: "text-indigo-500",
      dotColor: "bg-indigo-500",
    },
    {
      title: "COSTING PROJECTION",
      value: "568,953.79",
      currency: "R",
      footer: "Calculated internal expense",
      footerColor: "text-orange-500",
      dotColor: "bg-orange-500",
    },
    {
      title: "PROJECTED BILLING INVOICE",
      value: "722,967.26",
      currency: "R",
      footer: "Est. revenue generation",
      footerColor: "text-green-600",
      dotColor: "bg-green-500",
      valueColor: "text-indigo-600",
    },
    {
      title: "OPERATING MARGIN",
      value: "21.3",
      unit: "%",
      footer: "Net profitability ratio",
      footerColor: "text-indigo-500",
      dotColor: "bg-indigo-500",
    },

    {
      title: "PROVIDENT FUND",
      value: "146.2",
      currency: "R",
      footer: "Across 234 schedule entries",
      footerColor: "text-indigo-500",
      dotColor: "bg-indigo-500",
    },

    {
      title: "PPE",
      value: "875.2",
      currency: "R",
      footer: "Across 234 schedule entries",
      footerColor: "text-indigo-500",
      dotColor: "bg-indigo-500",
    },

    {
      title: "UIF",
      value: "8986.2",
      currency: "R",
      footer: "Across 234 schedule entries",
      footerColor: "text-indigo-500",
      dotColor: "bg-indigo-500",
    },

    {
      title: "SDL",
      value: "8006.2",
      currency: "R",
      footer: "Across 234 schedule entries",
      footerColor: "text-indigo-500",
      dotColor: "bg-indigo-500",
    },
  ];

  // =========================
  // UNLISTED PERSONNEL
  // =========================

  const unlistedPersonnel = [
    {
      client: "Global Tech Solutions",
      costCode: "CC-103",
      employeeNumber: "EMP-9042",
      resource: "GENERAL WORKER",
    },
    {
      client: "Apex Logistics",
      costCode: "CC-102",
      employeeNumber: "EMP-9811",
      resource: "GENERAL WORKER",
    },
    {
      client: "Vanguard Capital",
      costCode: "CC-101",
      employeeNumber: "EMP-9904",
      resource: "GENERAL WORKER",
    },
  ];

  // =========================
  // CLIENT COSTING
  // =========================

  const clientCosting = [
    {
      client: "Acme Health System",
      id: "CLI-101-A",
      site: "Durban Central Site",
      hours: "184.5 hrs",
      amount: "R 77 490,00",
      progress: 78,
    },
    {
      client: "Acme Health System",
      id: "CLI-101-B",
      site: "Cape Town Clinic",
      hours: "210.0 hrs",
      amount: "R 79 800,00",
      progress: 82,
    },
    {
      client: "Global Tech Solutions",
      id: "CLI-201-A",
      site: "JHB HQ Office",
      hours: "168.0 hrs",
      amount: "R 52 080,00",
      progress: 52,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      {/* =====================================================
          FILTER SECTION
      ====================================================== */}

      <div className="mb-8 rounded-[24px] bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 items-end gap-5 lg:grid-cols-[1.2fr_1fr_1fr_1fr_55px]">
          {/* Title */}
          <div>
            <h2 className="text-lg font-bold text-slate-900">Cost Centre</h2>

            <p className="mt-1 text-sm text-slate-400">
              Select a client name and cost center
            </p>
          </div>

          {/* Client Name */}
          <div>
            <label className="mb-2 block text-[11px] font-bold tracking-widest text-slate-400">
              CLIENT NAME
            </label>

            <select className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-indigo-400">
              <option>All Clients</option>
            </select>
          </div>

          {/* Cost Centre */}
          <div>
            <label className="mb-2 block text-[11px] font-bold tracking-widest text-slate-400">
              COST CENTRE
            </label>

            <select className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-indigo-400">
              <option>All Cost Codes</option>
            </select>
          </div>

          {/* Timesheet */}
          <div>
            <label className="mb-2 block text-[11px] font-bold tracking-widest text-slate-400">
              FILTER BY TIMESHEET NO
            </label>

            <select className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-indigo-400">
              <option>All</option>
            </select>
          </div>

          {/* Refresh */}
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-indigo-600"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* =====================================================
          SUMMARY CARDS
      ====================================================== */}

      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card, index) => (
          <div key={index} className="rounded-[20px] bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold tracking-wider text-slate-400">
              {card.title}
            </p>

            <div
              className={`mt-4 flex items-baseline gap-1 text-3xl font-bold tracking-tight ${
                card.valueColor || "text-slate-900"
              }`}
            >
              {card.currency && (
                <span className="text-lg font-medium text-slate-400">
                  {card.currency}
                </span>
              )}

              <span>{card.value}</span>

              {card.unit && (
                <span className="text-sm font-medium text-slate-500">
                  {card.unit}
                </span>
              )}
            </div>

            <div
              className={`mt-4 flex items-center gap-2 text-xs font-medium ${card.footerColor}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${card.dotColor}`} />

              {card.footer}
            </div>
          </div>
        ))}
      </div>

      {/* =====================================================
          UNLISTED PERSONNEL GRID
      ====================================================== */}

      {/* <div className="mb-8 rounded-[24px] border border-amber-300 bg-white p-6 shadow-sm">

        <div className="mb-5 flex flex-col gap-4 border-b border-amber-100 pb-5 lg:flex-row lg:items-start lg:justify-between">

          <div className="flex gap-4">

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
              <AlertTriangle size={19} />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Unknown Personnel (Not in Database)
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Isolated grid displaying Client Name, Cost Code, and Employee
                Number for personnel unlisted in the Employee Database
              </p>
            </div>

          </div>

          <div className="w-fit rounded-full border border-amber-300 bg-amber-50/30 px-4 py-2 text-sm font-semibold text-amber-700">
            {unlistedPersonnel.length} Unknown Entries
          </div>

        </div>


        <div className="overflow-x-auto">

          <table className="w-full min-w-[850px] border-collapse">

            <thead>
              <tr className="bg-amber-50/50">

                <th className="px-5 py-4 text-left text-xs font-bold tracking-wider text-slate-700">
                  CLIENT NAME
                </th>

                <th className="px-5 py-4 text-left text-xs font-bold tracking-wider text-slate-700">
                  COST CENTRE
                </th>

                <th className="px-5 py-4 text-left text-xs font-bold tracking-wider text-slate-700">
                  EMPLOYEE NUMBER
                </th>

                <th className="px-5 py-4 text-right text-xs font-bold tracking-wider text-slate-700">
                JOB DESCRIPTION
                </th>

              </tr>
            </thead>

            <tbody>

              {unlistedPersonnel.map((person, index) => (
                <tr
                  key={index}
                  className="border-t border-slate-100"
                >

                  <td className="px-5 py-5">
                    <span className="font-bold text-slate-900">
                      {person.client}
                    </span>
                  </td>

                  <td className="px-5 py-5">
                    <span className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700">
                      {person.costCode}
                    </span>
                  </td>

                  <td className="px-5 py-5">
                    <span className="inline-flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700">
                      <AlertTriangle size={15} />
                      {person.employeeNumber}
                    </span>
                  </td>

                  <td className="px-5 py-5 text-right">
                    <span className="text-sm text-slate-600">
                      {person.resource}
                    </span>

                    
                  </td>

                </tr>
              ))}

            </tbody>

          </table>

        </div>

      </div> */}

      {/* =====================================================
          CLIENT COSTING BREAKDOWN
      ====================================================== */}

      <div className="rounded-[24px] bg-white p-6 shadow-sm">
        {/* Header */}
        <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <BarChart3 size={22} className="text-indigo-600" />

              <h2 className="text-xl font-bold text-slate-900">
                Client Costing Breakdown per COST CENTRE
              </h2>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              Internal timesheet costing separated by COST CENTRE and site
              location
            </p>
          </div>

          {/* Active Sites */}
          <div className="flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600">
            <MapPin size={17} className="text-indigo-600" />9 Active Client
            Sites
          </div>
        </div>

        {/* Export Button */}

        <div className="mb-5 flex justify-end">
          <button
            onClick={exportClientCosting}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700  mr-2"
          >
            <Download size={18} />
            Download Excel
          </button>

          <button
  onClick={() => setShowReportModal(true)}
  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
>
  <FileSpreadsheet size={18} />
  Generate Report
</button>

         {showReportModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">

    <div className="w-full max-w-4xl rounded-2xl bg-white p-8 shadow-2xl">

      {/* Header */}
      <div className="mb-6 flex items-center justify-between border-b pb-4">
        <h2 className="text-2xl font-bold text-slate-800">
          Employee Costing Report
        </h2>

        <button
          onClick={() => setShowReportModal(false)}
          className="rounded-lg p-2 hover:bg-slate-100"
        >
          ✕
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 gap-6">

        <div>
          <label className="mb-2 block font-medium">
            Client Name
          </label>

          <select className="w-full rounded-lg border p-3">
            <option>Select Client</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block font-medium">
            Client ID
          </label>

          <select className="w-full rounded-lg border p-3">
            <option>Select Client ID</option>
          </select>
        </div>

        

      </div>

      {/* Report Columns */}
      <div className="mt-8">

        <h3 className="mb-4 text-lg font-semibold">
          Report Columns
        </h3>

        <div className="grid grid-cols-2 gap-3">

          {reportColumns.map((column) => (
            <label
              key={column.key}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              <input
                type="checkbox"
                defaultChecked
                className="accent-indigo-600"
              />

              {column.label}
            </label>
          ))}

        </div>

      </div>

      {/* Footer */}
      <div className="mt-8 flex justify-end gap-4">

        <button
          onClick={() => setShowReportModal(false)}
          className="rounded-lg border px-6 py-3"
        >
          Cancel
        </button>

        <button className="rounded-lg bg-indigo-600 px-6 py-3 text-white hover:bg-indigo-700">
          Generate Excel
        </button>

      </div>

    </div>

  </div>
)}
        </div>

        {/* Client Cards */}
        <div className="space-y-5">
          {clientCosting.map((client, index) => (
            <div
              key={index}
              className="rounded-[18px] border border-slate-200 bg-slate-50/40 p-5"
            >
              {/* Top */}
              <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                {/* Client Information */}
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-base font-bold text-slate-900">
                    {client.client}
                  </h3>

                  <span className="rounded-md bg-indigo-100 px-3 py-1 text-sm font-bold text-indigo-700">
                    {client.id}
                  </span>

                  <span className="text-sm text-slate-600">
                    ({client.site})
                  </span>
                </div>

                {/* Stats */}
                <div className="text-left lg:text-right">
                  <div className="text-sm font-semibold text-slate-500">
                    {client.hours}
                  </div>

                  <div className="mt-1 text-base font-bold text-slate-900">
                    {client.amount}
                  </div>
                </div>
              </div>

              {/* Progress */}
              <div className="flex items-center gap-4">
                <span className="w-12 shrink-0 text-xs font-bold text-slate-400">
                  COST
                </span>

                <div className="h-[17px] flex-1 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-slate-400 via-indigo-500 to-indigo-600 transition-all duration-500"
                    style={{
                      width: `${client.progress}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
