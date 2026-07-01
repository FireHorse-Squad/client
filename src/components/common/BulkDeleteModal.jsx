import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function BulkDeleteModal({ open, onClose, onConfirm, deleting, selectedCount, itemName = "records" }) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
                <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                        <AlertTriangle size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">
                        Delete Selected {itemName}?
                    </h3>
                    <p className="text-slate-500">
                        You are about to delete <strong>{selectedCount}</strong> {itemName}.
                        This action cannot be undone.
                    </p>
                </div>
                <div className="flex gap-3 p-6 pt-0">
                    <button
                        onClick={onClose}
                        disabled={deleting}
                        className="flex-1 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={deleting}
                        className="flex-1 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                        {deleting ? 'Deleting...' : `Delete ${selectedCount} ${itemName}`}
                    </button>
                </div>
            </div>
        </div>
    );
}
