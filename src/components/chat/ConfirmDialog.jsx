"use client";

import { X } from 'lucide-react';

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  options,
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">{title}</h3>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {/* Message */}
        <div className="px-6 py-4">
          <p className="text-gray-600 dark:text-gray-300">{message}</p>
        </div>

        {/* Options */}
        {options && options.length > 0 && (
          <div className="px-6 py-4 flex flex-col gap-2">
            {options.map((option, index) => (
              <button
                key={index}
                onClick={() => onConfirm(option.value)}
                className={`w-full px-4 py-2.5 rounded-lg font-medium transition-colors ${
                  option.variant === 'danger'
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : option.variant === 'secondary'
                    ? 'bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-800 dark:text-white'
                    : 'bg-indigo-500 hover:bg-indigo-600 text-white'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        {/* Cancel */}
        {!options || options.length === 0 ? (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700">
            <button
              onClick={onCancel}
              className="w-full px-4 py-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-800 dark:text-white rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
