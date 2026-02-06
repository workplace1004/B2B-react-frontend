import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  Plus,
  Search,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Shield,
  Eye,
  X,
  CheckCircle,
  Settings,
  Key,
  Lock,
  Users as UsersIcon,
  Edit,
  Trash2,
} from 'lucide-react';
import api from '../lib/api';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';

type TabType = 'role-based-access' | 'permissions';
type PermissionCategory = 'inventory' | 'orders' | 'customers' | 'reports' | 'settings' | 'users' | 'purchasing' | 'warehouse';
type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'export' | 'import';

interface Role {
  id: string | number;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
  isSystemRole: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface Permission {
  id: string;
  category: PermissionCategory;
  action: PermissionAction;
  name: string;
  description: string;
}

// Custom Dropdown Component
interface CustomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}

function CustomDropdown({ value, onChange, options, placeholder, className = '' }: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [openAbove, setOpenAbove] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Calculate dropdown position when opening or window changes
  useEffect(() => {
    const calculatePosition = () => {
      if (isOpen && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;
        const dropdownHeight = 210; // maxHeight + some margin
        
        // If not enough space below but enough space above, open upward
        if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
          setOpenAbove(true);
        } else {
          setOpenAbove(false);
        }
      }
    };

    calculatePosition();
    
    if (isOpen) {
      window.addEventListener('resize', calculatePosition);
      window.addEventListener('scroll', calculatePosition, true);
      return () => {
        window.removeEventListener('resize', calculatePosition);
        window.removeEventListener('scroll', calculatePosition, true);
      };
    }
  }, [isOpen]);

  const selectedOption = options.find(opt => opt.value === value);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < options.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelect(options[highlightedIndex].value);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`} style={{ zIndex: isOpen ? 10001 : 'auto', position: 'relative' }}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`w-full px-4 py-2 text-[14px] border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white flex items-center justify-between transition-all ${
          isOpen ? 'ring-2 ring-primary-500 border-primary-500' : 'border-gray-300 dark:border-gray-600'
        } hover:border-gray-400 dark:hover:border-gray-500`}
      >
        <span className={selectedOption ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}>
          {selectedOption ? selectedOption.label : placeholder || 'Select...'}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${isOpen && openAbove ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div 
          className={`absolute w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden custom-dropdown-menu ${
            openAbove ? 'mb-1 bottom-full' : 'mt-1 top-full'
          }`}
          style={{
            zIndex: 10001,
            left: 0,
            right: 0,
            minWidth: '100%',
            position: 'absolute',
            maxHeight: '210px',
          }}
        >
          <div className="py-1">
            {options.map((option, index) => {
              const isSelected = option.value === value;
              const isHighlighted = index === highlightedIndex;
              
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onMouseLeave={() => setHighlightedIndex(-1)}
                  className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-all duration-200 relative ${
                    isSelected
                      ? 'bg-primary-600 text-white'
                      : isHighlighted
                        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 shadow-sm'
                        : 'text-gray-900 dark:text-white hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400'
                  }`}
                  style={{
                    transform: isHighlighted ? 'translateX(2px)' : 'translateX(0)',
                  }}
                >
                  {option.label}
                  {isHighlighted && !isSelected && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-600 dark:bg-primary-400 rounded-r" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Users() {
  const [activeTab, setActiveTab] = useState<TabType>('role-based-access');

  const tabs = [
    { id: 'role-based-access' as TabType, label: 'Role-based Access', icon: Shield },
    { id: 'permissions' as TabType, label: 'Permissions', icon: Key },
  ];

  return (
    <div>
      <Breadcrumb currentPage="Users & Roles" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">Users & Roles</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1  text-[14px]">
              Manage role-based access control and permissions
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${activeTab === tab.id
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'role-based-access' && <RoleBasedAccessSection />}
        {activeTab === 'permissions' && <PermissionsSection />}
      </div>
    </div>
  );
}

// Role-based Access Section
function RoleBasedAccessSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Fetch users to calculate user counts per role
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users', 'roles'],
    queryFn: async () => {
      try {
        const response = await api.get('/users?skip=0&take=1000');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Load roles from localStorage
  const [roles, setRoles] = useState<Role[]>(() => {
    const saved = localStorage.getItem('user-roles');
    if (saved) {
      return JSON.parse(saved);
    }
    // Default roles
    return [
      {
        id: 1,
        name: 'Admin',
        description: 'Full system access with all permissions',
        permissions: ['*'],
        userCount: 0,
        isSystemRole: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 2,
        name: 'Manager',
        description: 'Management access with most permissions',
        permissions: [
          'inventory:view', 'inventory:create', 'inventory:edit', 'inventory:export',
          'orders:view', 'orders:create', 'orders:edit', 'orders:export',
          'customers:view', 'customers:create', 'customers:edit',
          'reports:view', 'reports:export',
        ],
        userCount: 0,
        isSystemRole: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 3,
        name: 'User',
        description: 'Standard user with limited permissions',
        permissions: [
          'inventory:view', 'inventory:export',
          'orders:view', 'orders:create',
          'customers:view',
        ],
        userCount: 0,
        isSystemRole: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 4,
        name: 'Viewer',
        description: 'Read-only access',
        permissions: [
          'inventory:view',
          'orders:view',
          'customers:view',
          'reports:view',
        ],
        userCount: 0,
        isSystemRole: false,
        createdAt: new Date().toISOString(),
      },
    ];
  });

  // Save roles to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('user-roles', JSON.stringify(roles));
  }, [roles]);

  // Update user counts based on actual users
  useEffect(() => {
    if (usersData && Array.isArray(usersData)) {
      const roleUserCounts = new Map<string, number>();
      usersData.forEach((user: any) => {
        const roleName = user.role || 'User';
        roleUserCounts.set(roleName, (roleUserCounts.get(roleName) || 0) + 1);
      });

      setRoles(prevRoles =>
        prevRoles.map(role => ({
          ...role,
          userCount: roleUserCounts.get(role.name) || 0,
        }))
      );
    }
  }, [usersData]);

  // Filter roles
  const filteredRoles = useMemo(() => {
    let filtered = roles;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((role) =>
        role.name.toLowerCase().includes(query) ||
        role.description.toLowerCase().includes(query)
      );
    }

    // Sort by name
    return filtered.sort((a, b) => {
      // System roles first
      if (a.isSystemRole && !b.isSystemRole) return -1;
      if (!a.isSystemRole && b.isSystemRole) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [roles, searchQuery]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredRoles.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRoles = filteredRoles.slice(startIndex, endIndex);

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const total = filteredRoles.length;
    const systemRoles = filteredRoles.filter((role) => role.isSystemRole);
    const customRoles = filteredRoles.filter((role) => !role.isSystemRole);
    const totalUsers = filteredRoles.reduce((sum, role) => sum + role.userCount, 0);

    return {
      total,
      systemRoles: systemRoles.length,
      customRoles: customRoles.length,
      totalUsers,
    };
  }, [filteredRoles]);

  const handleCreateRole = (roleData: any) => {
    const newRole: Role = {
      id: Date.now(),
      ...roleData,
      userCount: 0,
      isSystemRole: false,
      createdAt: new Date().toISOString(),
    };
    setRoles([...roles, newRole]);
    setShowCreateModal(false);
    toast.success('Role created successfully!');
  };

  const handleUpdateRole = (roleId: string | number, updates: any) => {
    setRoles(roles.map((role) =>
      role.id === roleId
        ? { ...role, ...updates, updatedAt: new Date().toISOString() }
        : role
    ));
    toast.success('Role updated successfully!');
  };

  const handleDeleteRole = (roleId: string | number) => {
    const role = roles.find((r) => r.id === roleId);
    if (role?.isSystemRole) {
      toast.error('Cannot delete system roles');
      return;
    }
    if (role?.userCount && role.userCount > 0) {
      toast.error('Cannot delete role with assigned users');
      return;
    }
    setRoles(roles.filter((role) => role.id !== roleId));
    toast.success('Role deleted successfully!');
  };

  if (usersLoading) {
    return <SkeletonPage />;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Roles</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.total}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">System Roles</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.systemRoles}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Custom Roles</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.customRoles}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Settings className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Users</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.totalUsers}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <UsersIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex-1 relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by role name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 text-[14px] ::placeholder-[12px] pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex text-[14px] items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Role
          </button>
        </div>
      </div>

      {/* Roles Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Role Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Permissions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Users
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredRoles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <Shield className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">No roles found</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                        Create your first role to get started
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRoles.map((role) => (
                  <tr
                    key={role.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                    onClick={() => setSelectedRole(role)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-gray-400" />
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {role.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400 max-w-md truncate">
                        {role.description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {role.permissions.includes('*') ? 'All Permissions' : `${role.permissions.length} permissions`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <UsersIcon className="w-4 h-4 text-gray-400" />
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {role.userCount}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        role.isSystemRole
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                        {role.isSystemRole ? 'System' : 'Custom'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRole(role);
                          }}
                          className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {!role.isSystemRole && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRole(role.id);
                            }}
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {filteredRoles.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing <span className="font-medium text-gray-900 dark:text-white">{startIndex + 1}</span> to{' '}
              <span className="font-medium text-gray-900 dark:text-white">
                {Math.min(endIndex, filteredRoles.length)}
              </span>{' '}
              of <span className="font-medium text-gray-900 dark:text-white">{filteredRoles.length}</span> results
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Items per page:</span>
                <CustomDropdown
                  value={itemsPerPage.toString()}
                  onChange={(value) => {
                    setItemsPerPage(Number(value));
                    setCurrentPage(1);
                  }}
                  options={[
                    { value: '5', label: '5' },
                    { value: '10', label: '10' },
                    { value: '25', label: '25' },
                    { value: '50', label: '50' },
                  ]}
                  className="min-w-[80px]"
                />
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white"
                  title="First page"
                >
                  &lt;&lt;
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-1 text-gray-900 dark:text-white"
                  title="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1.5 text-sm border rounded transition-colors ${
                        currentPage === pageNum
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-1 text-gray-900 dark:text-white"
                  title="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white"
                  title="Last page"
                >
                  &gt;&gt;
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Role Modal */}
      {showCreateModal && (
        <CreateRoleModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateRole}
        />
      )}

      {/* Role Details Modal */}
      {selectedRole && (
        <RoleDetailsModal
          role={selectedRole}
          onClose={() => setSelectedRole(null)}
          onUpdate={handleUpdateRole}
          onDelete={handleDeleteRole}
        />
      )}
    </div>
  );
}

// Create Role Modal
interface CreateRoleModalProps {
  onClose: () => void;
  onCreate: (roleData: any) => void;
}

function CreateRoleModal({ onClose, onCreate }: CreateRoleModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // Available permissions
  const allPermissions = [
    { id: 'inventory:view', name: 'View Inventory', category: 'inventory' },
    { id: 'inventory:create', name: 'Create Inventory', category: 'inventory' },
    { id: 'inventory:edit', name: 'Edit Inventory', category: 'inventory' },
    { id: 'inventory:delete', name: 'Delete Inventory', category: 'inventory' },
    { id: 'inventory:export', name: 'Export Inventory', category: 'inventory' },
    { id: 'orders:view', name: 'View Orders', category: 'orders' },
    { id: 'orders:create', name: 'Create Orders', category: 'orders' },
    { id: 'orders:edit', name: 'Edit Orders', category: 'orders' },
    { id: 'orders:delete', name: 'Delete Orders', category: 'orders' },
    { id: 'orders:export', name: 'Export Orders', category: 'orders' },
    { id: 'customers:view', name: 'View Customers', category: 'customers' },
    { id: 'customers:create', name: 'Create Customers', category: 'customers' },
    { id: 'customers:edit', name: 'Edit Customers', category: 'customers' },
    { id: 'customers:delete', name: 'Delete Customers', category: 'customers' },
    { id: 'reports:view', name: 'View Reports', category: 'reports' },
    { id: 'reports:export', name: 'Export Reports', category: 'reports' },
    { id: 'settings:view', name: 'View Settings', category: 'settings' },
    { id: 'settings:edit', name: 'Edit Settings', category: 'settings' },
    { id: 'users:view', name: 'View Users', category: 'users' },
    { id: 'users:create', name: 'Create Users', category: 'users' },
    { id: 'users:edit', name: 'Edit Users', category: 'users' },
    { id: 'users:delete', name: 'Delete Users', category: 'users' },
    { id: 'purchasing:view', name: 'View Purchasing', category: 'purchasing' },
    { id: 'purchasing:create', name: 'Create Purchasing', category: 'purchasing' },
    { id: 'purchasing:edit', name: 'Edit Purchasing', category: 'purchasing' },
    { id: 'warehouse:view', name: 'View Warehouse', category: 'warehouse' },
    { id: 'warehouse:edit', name: 'Edit Warehouse', category: 'warehouse' },
  ];

  const permissionsByCategory = useMemo(() => {
    const grouped: Record<string, typeof allPermissions> = {};
    allPermissions.forEach((perm) => {
      if (!grouped[perm.category]) {
        grouped[perm.category] = [];
      }
      grouped[perm.category].push(perm);
    });
    return grouped;
  }, []);

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter a role name');
      return;
    }
    onCreate({
      name: name.trim(),
      description: description.trim(),
      permissions: selectedPermissions,
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-gray-900 dark:text-white">Create New Role</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Role Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Sales Manager"
              className="w-full text-[14px] ::placeholder-[12px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the role's purpose and responsibilities..."
              rows={3}
              className="w-full px-3 text-[14px] ::placeholder-[12px] py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
              Permissions
            </label>
            <div className="space-y-4 max-h-[300px] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              {Object.entries(permissionsByCategory).map(([category, permissions]) => (
                <div key={category} className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white capitalize">
                    {category}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {permissions.map((permission) => (
                      <label
                        key={permission.id}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPermissions.includes(permission.id)}
                          onChange={() => togglePermission(permission.id)}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {permission.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Selected: {selectedPermissions.length} permissions
            </p>
          </div>

          <div className="flex text-[14px] items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Create Role
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Role Details Modal
interface RoleDetailsModalProps {
  role: Role;
  onClose: () => void;
  onUpdate: (roleId: string | number, updates: any) => void;
  onDelete: (roleId: string | number) => void;
}

function RoleDetailsModal({ role, onClose, onUpdate, onDelete }: RoleDetailsModalProps) {
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(role.permissions);

  // Available permissions
  const allPermissions = [
    { id: 'inventory:view', name: 'View Inventory', category: 'inventory' },
    { id: 'inventory:create', name: 'Create Inventory', category: 'inventory' },
    { id: 'inventory:edit', name: 'Edit Inventory', category: 'inventory' },
    { id: 'inventory:delete', name: 'Delete Inventory', category: 'inventory' },
    { id: 'inventory:export', name: 'Export Inventory', category: 'inventory' },
    { id: 'orders:view', name: 'View Orders', category: 'orders' },
    { id: 'orders:create', name: 'Create Orders', category: 'orders' },
    { id: 'orders:edit', name: 'Edit Orders', category: 'orders' },
    { id: 'orders:delete', name: 'Delete Orders', category: 'orders' },
    { id: 'orders:export', name: 'Export Orders', category: 'orders' },
    { id: 'customers:view', name: 'View Customers', category: 'customers' },
    { id: 'customers:create', name: 'Create Customers', category: 'customers' },
    { id: 'customers:edit', name: 'Edit Customers', category: 'customers' },
    { id: 'customers:delete', name: 'Delete Customers', category: 'customers' },
    { id: 'reports:view', name: 'View Reports', category: 'reports' },
    { id: 'reports:export', name: 'Export Reports', category: 'reports' },
    { id: 'settings:view', name: 'View Settings', category: 'settings' },
    { id: 'settings:edit', name: 'Edit Settings', category: 'settings' },
    { id: 'users:view', name: 'View Users', category: 'users' },
    { id: 'users:create', name: 'Create Users', category: 'users' },
    { id: 'users:edit', name: 'Edit Users', category: 'users' },
    { id: 'users:delete', name: 'Delete Users', category: 'users' },
    { id: 'purchasing:view', name: 'View Purchasing', category: 'purchasing' },
    { id: 'purchasing:create', name: 'Create Purchasing', category: 'purchasing' },
    { id: 'purchasing:edit', name: 'Edit Purchasing', category: 'purchasing' },
    { id: 'warehouse:view', name: 'View Warehouse', category: 'warehouse' },
    { id: 'warehouse:edit', name: 'Edit Warehouse', category: 'warehouse' },
  ];

  const permissionsByCategory = useMemo(() => {
    const grouped: Record<string, typeof allPermissions> = {};
    allPermissions.forEach((perm) => {
      if (!grouped[perm.category]) {
        grouped[perm.category] = [];
      }
      grouped[perm.category].push(perm);
    });
    return grouped;
  }, []);

  const togglePermission = (permissionId: string) => {
    if (role.isSystemRole && role.name === 'Admin') {
      toast.error('Cannot modify Admin role permissions');
      return;
    }
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleSave = () => {
    if (role.isSystemRole && role.name === 'Admin') {
      toast.error('Cannot modify Admin role');
      return;
    }
    onUpdate(role.id, {
      name: name.trim(),
      description: description.trim(),
      permissions: selectedPermissions,
    });
    onClose();
  };

  const handleDelete = () => {
    if (role.isSystemRole) {
      toast.error('Cannot delete system roles');
      return;
    }
    if (role.userCount > 0) {
      toast.error('Cannot delete role with assigned users');
      return;
    }
    onDelete(role.id);
    onClose();
  };

  const isReadOnly = role.isSystemRole && role.name === 'Admin';

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Role Details</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{role.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Role Information */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Role Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isReadOnly}
                className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isReadOnly}
                rows={3}
                className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
            </div>
          </div>

          {/* Permissions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
              Permissions
            </label>
            <div className="space-y-4 max-h-[300px] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              {Object.entries(permissionsByCategory).map(([category, permissions]) => (
                <div key={category} className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white capitalize">
                    {category}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {permissions.map((permission) => {
                      const isChecked = selectedPermissions.includes(permission.id) || selectedPermissions.includes('*');
                      return (
                        <label
                          key={permission.id}
                          className={`flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 ${isReadOnly ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => togglePermission(permission.id)}
                            disabled={isReadOnly || selectedPermissions.includes('*')}
                            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {permission.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Selected: {selectedPermissions.includes('*') ? 'All Permissions' : `${selectedPermissions.length} permissions`}
            </p>
          </div>

          {/* Metadata */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Type</span>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                role.isSystemRole
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
              }`}>
                {role.isSystemRole ? 'System' : 'Custom'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Users Assigned</span>
              <span className="text-gray-900 dark:text-white">{role.userCount}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Created At</span>
              <span className="text-gray-900 dark:text-white">
                {new Date(role.createdAt).toLocaleString()}
              </span>
            </div>
            {role.updatedAt && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Updated At</span>
                <span className="text-gray-900 dark:text-white">
                  {new Date(role.updatedAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            {!role.isSystemRole && (
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-red-600 dark:text-red-400 bg-white dark:bg-gray-700 border border-red-300 dark:border-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                Delete
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            {!isReadOnly && (
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Save Changes
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Permissions Section
function PermissionsSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Available permissions
  const allPermissions: Permission[] = [
    { id: 'inventory:view', category: 'inventory', action: 'view', name: 'View Inventory', description: 'View inventory items and stock levels' },
    { id: 'inventory:create', category: 'inventory', action: 'create', name: 'Create Inventory', description: 'Create new inventory items' },
    { id: 'inventory:edit', category: 'inventory', action: 'edit', name: 'Edit Inventory', description: 'Edit existing inventory items' },
    { id: 'inventory:delete', category: 'inventory', action: 'delete', name: 'Delete Inventory', description: 'Delete inventory items' },
    { id: 'inventory:export', category: 'inventory', action: 'export', name: 'Export Inventory', description: 'Export inventory data' },
    { id: 'orders:view', category: 'orders', action: 'view', name: 'View Orders', description: 'View orders and order details' },
    { id: 'orders:create', category: 'orders', action: 'create', name: 'Create Orders', description: 'Create new orders' },
    { id: 'orders:edit', category: 'orders', action: 'edit', name: 'Edit Orders', description: 'Edit existing orders' },
    { id: 'orders:delete', category: 'orders', action: 'delete', name: 'Delete Orders', description: 'Delete orders' },
    { id: 'orders:export', category: 'orders', action: 'export', name: 'Export Orders', description: 'Export order data' },
    { id: 'customers:view', category: 'customers', action: 'view', name: 'View Customers', description: 'View customer information' },
    { id: 'customers:create', category: 'customers', action: 'create', name: 'Create Customers', description: 'Create new customers' },
    { id: 'customers:edit', category: 'customers', action: 'edit', name: 'Edit Customers', description: 'Edit customer information' },
    { id: 'customers:delete', category: 'customers', action: 'delete', name: 'Delete Customers', description: 'Delete customers' },
    { id: 'reports:view', category: 'reports', action: 'view', name: 'View Reports', description: 'View reports and analytics' },
    { id: 'reports:export', category: 'reports', action: 'export', name: 'Export Reports', description: 'Export reports' },
    { id: 'settings:view', category: 'settings', action: 'view', name: 'View Settings', description: 'View system settings' },
    { id: 'settings:edit', category: 'settings', action: 'edit', name: 'Edit Settings', description: 'Edit system settings' },
    { id: 'users:view', category: 'users', action: 'view', name: 'View Users', description: 'View user accounts' },
    { id: 'users:create', category: 'users', action: 'create', name: 'Create Users', description: 'Create new user accounts' },
    { id: 'users:edit', category: 'users', action: 'edit', name: 'Edit Users', description: 'Edit user accounts' },
    { id: 'users:delete', category: 'users', action: 'delete', name: 'Delete Users', description: 'Delete user accounts' },
    { id: 'purchasing:view', category: 'purchasing', action: 'view', name: 'View Purchasing', description: 'View purchase orders' },
    { id: 'purchasing:create', category: 'purchasing', action: 'create', name: 'Create Purchasing', description: 'Create purchase orders' },
    { id: 'purchasing:edit', category: 'purchasing', action: 'edit', name: 'Edit Purchasing', description: 'Edit purchase orders' },
    { id: 'warehouse:view', category: 'warehouse', action: 'view', name: 'View Warehouse', description: 'View warehouse information' },
    { id: 'warehouse:edit', category: 'warehouse', action: 'edit', name: 'Edit Warehouse', description: 'Edit warehouse information' },
  ];

  // Filter permissions
  const filteredPermissions = useMemo(() => {
    let filtered = allPermissions;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((perm) =>
        perm.name.toLowerCase().includes(query) ||
        perm.description.toLowerCase().includes(query) ||
        perm.id.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((perm) => perm.category === categoryFilter);
    }

    // Sort by category, then by action
    return filtered.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.action.localeCompare(b.action);
    });
  }, [searchQuery, categoryFilter]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredPermissions.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPermissions = filteredPermissions.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const total = allPermissions.length;
    const byCategory = new Map<PermissionCategory, number>();
    allPermissions.forEach((perm) => {
      byCategory.set(perm.category, (byCategory.get(perm.category) || 0) + 1);
    });

    return {
      total,
      byCategory: Object.fromEntries(byCategory),
    };
  }, []);

  const getCategoryColor = (category: PermissionCategory) => {
    switch (category) {
      case 'inventory':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'orders':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'customers':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'reports':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'settings':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'users':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'purchasing':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400';
      case 'warehouse':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getActionIcon = (action: PermissionAction) => {
    switch (action) {
      case 'view':
        return Eye;
      case 'create':
        return Plus;
      case 'edit':
        return Edit;
      case 'delete':
        return Trash2;
      case 'export':
        return X;
      case 'import':
        return Plus;
      default:
        return Key;
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Permissions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.total}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Key className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Inventory</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.byCategory.inventory || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Lock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Orders</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.byCategory.orders || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <Lock className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Customers</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.byCategory.customers || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Lock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex-1 relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by permission name, description, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-[14px] ::placeholder-[12px] pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <div className="min-w-[240px]">
              <CustomDropdown
                value={categoryFilter}
                onChange={setCategoryFilter}
                options={[
                  { value: 'all', label: 'All Categories' },
                  { value: 'inventory', label: 'Inventory' },
                  { value: 'orders', label: 'Orders' },
                  { value: 'customers', label: 'Customers' },
                  { value: 'reports', label: 'Reports' },
                  { value: 'settings', label: 'Settings' },
                  { value: 'users', label: 'Users' },
                  { value: 'purchasing', label: 'Purchasing' },
                  { value: 'warehouse', label: 'Warehouse' },
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Permissions Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Permission ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Description
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredPermissions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <Key className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">No permissions found</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                        Try adjusting your filters
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedPermissions.map((permission) => {
                  const ActionIcon = getActionIcon(permission.action);
                  return (
                    <tr
                      key={permission.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-mono text-gray-900 dark:text-white">
                          {permission.id}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <ActionIcon className="w-4 h-4 text-gray-400" />
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {permission.name}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(permission.category)}`}>
                          {permission.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                          {permission.action}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
                          {permission.description}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {filteredPermissions.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing <span className="font-medium text-gray-900 dark:text-white">{startIndex + 1}</span> to{' '}
              <span className="font-medium text-gray-900 dark:text-white">
                {Math.min(endIndex, filteredPermissions.length)}
              </span>{' '}
              of <span className="font-medium text-gray-900 dark:text-white">{filteredPermissions.length}</span> results
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Items per page:</span>
                <CustomDropdown
                  value={itemsPerPage.toString()}
                  onChange={(value) => {
                    setItemsPerPage(Number(value));
                    setCurrentPage(1);
                  }}
                  options={[
                    { value: '5', label: '5' },
                    { value: '10', label: '10' },
                    { value: '25', label: '25' },
                    { value: '50', label: '50' },
                  ]}
                  className="min-w-[80px]"
                />
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white"
                  title="First page"
                >
                  &lt;&lt;
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-1 text-gray-900 dark:text-white"
                  title="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1.5 text-sm border rounded transition-colors ${
                        currentPage === pageNum
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-1 text-gray-900 dark:text-white"
                  title="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white"
                  title="Last page"
                >
                  &gt;&gt;
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
