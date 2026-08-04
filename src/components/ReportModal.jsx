{showReportModal && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
     <div className="w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl">

  {/* Header */}
  <div className="flex items-center justify-between border-b p-6">
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

//       {/* Filters */}

//         <div className="max-h-[65vh] overflow-y-auto p-6">

//         <div>
//           <label className="mb-2 block text-sm font-semibold">
//             Client Name
//           </label>

//           <select className="w-full rounded-lg border p-3">
//             <option>All Clients</option>
//           </select>
//         </div>

//         <div>
//           <label className="mb-2 block text-sm font-semibold">
//             Client ID
//           </label>

//           <select className="w-full rounded-lg border p-3">
//             <option>All Client IDs</option>
//           </select>
//         </div>

//         

       </div>

       {/* ===== THIS IS WHERE THE CHECKBOXES GO ===== */}

       <div className="mt-8">

         <h3 className="mb-4 text-lg font-bold">
           Report Columns
        </h3>

         <div className="grid grid-cols-2 gap-3">
           {reportColumns.map((column) => (
             <label
               key={column.key}
               className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
             >
               <input
                 type="checkbox"
                 defaultChecked
                 className="h-4 w-4 accent-indigo-600"
               />

               <span className="text-sm font-medium text-slate-700">
                 {column.label}
               </span>
             </label>
           ))}
         </div>

      </div>

       {/* Footer */}

       <div className="mt-8 flex justify-end gap-3">

        <button
          onClick={() => setShowReportModal(false)}
           className="rounded-lg border px-5 py-3"
         >
           Cancel
         </button>

      <button className="rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white">
        Generate Excel
        </button>

      </div>

   </div>
  </div>
 )}