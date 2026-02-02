import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import Breadcrumb from '../components/Breadcrumb';

export default function Alerts() {
  const [alerts] = useState([
    { id: 1, type: 'warning', title: 'Low Stock Alert', message: 'Product XYZ is running low', time: '2 hours ago' },
    { id: 2, type: 'error', title: 'Order Failed', message: 'Order #1234 failed to process', time: '5 hours ago' },
    { id: 3, type: 'success', title: 'Order Completed', message: 'Order #1235 has been completed', time: '1 day ago' },
    { id: 4, type: 'info', title: 'New Customer', message: 'New customer registered', time: '2 days ago' },
  ]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />;
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />;
      default:
        return <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800';
      case 'success':
        return 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800';
      default:
        return 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800';
    }
  };

  return (
    <div>
      <Breadcrumb currentPage="Alerts" />
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Alerts</h1>
        <p className="text-gray-600 dark:text-gray-400">View and manage system alerts and notifications</p>
      </div>

      <div className="space-y-4">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`p-4 rounded-lg border ${getBgColor(alert.type)} flex items-start gap-4`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {getIcon(alert.type)}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{alert.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{alert.message}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500">{alert.time}</p>
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

