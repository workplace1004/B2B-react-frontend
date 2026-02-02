import { Shield } from 'lucide-react';
import Breadcrumb from '../components/Breadcrumb';

export default function Security() {
  return (
    <div>
      <Breadcrumb currentPage="Security" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Security</h1>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-12 h-12 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Security Settings</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
            2FA / SSO
          </p>
        </div>
      </div>
    </div>
  );
}

