import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import Breadcrumb from '../components/Breadcrumb';

export default function Exceptions() {
  const [exceptions] = useState([
    { id: 1, type: 'Exception', message: 'Inventory mismatch detected', location: 'Warehouse A', time: '1 hour ago' },
    { id: 2, type: 'Exception', message: 'Order processing delay', location: 'Order #1234', time: '3 hours ago' },
    { id: 3, type: 'Exception', message: 'Data sync failure', location: 'System', time: '5 hours ago' },
  ]);

  return (
    <div>
      <Breadcrumb currentPage="Exceptions" />
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Exceptions</h1>
        <p className="text-gray-600 dark:text-gray-400">View and manage system exceptions and errors</p>
      </div>

      <div className="space-y-4">
        {exceptions.map((exception) => (
          <div
            key={exception.id}
            className="p-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 flex items-start gap-4"
          >
            <div className="flex-shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{exception.type}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{exception.message}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500">Location: {exception.location}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{exception.time}</p>
            </div>
            <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

