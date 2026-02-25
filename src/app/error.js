'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }) {
  useEffect(() => {
    // Log error to error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center">
        <div className="mx-auto bg-red-100 dark:bg-red-900/30 w-16 h-16 rounded-full flex items-center justify-center mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-red-600 dark:text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          Something went wrong
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          We&apos;re sorry, but an unexpected error occurred. Please try again.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition duration-200 shadow-md hover:shadow-lg"
          >
            Try again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-3 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-800 dark:text-white rounded-lg font-medium transition duration-200"
          >
            Go home
          </button>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-6 text-left">
            <summary className="cursor-pointer text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
              Error details (development only)
            </summary>
            <pre className="mt-2 p-3 bg-gray-100 dark:bg-slate-900 rounded-lg text-xs overflow-auto text-red-600 dark:text-red-400">
              {error?.toString()}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
