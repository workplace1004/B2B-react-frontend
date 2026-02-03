import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Wallet, TrendingUp, TrendingDown, DollarSign, ShoppingCart, ChevronDown } from 'lucide-react';
import api from '../lib/api';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';
import Chart from 'react-apexcharts';

type PeriodType = 'month' | 'quarter' | 'year';
type ViewType = 'overview' | 'budget' | 'commitments' | 'scenario';

// Custom Dropdown Component
interface CustomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}

function CustomDropdown({ value, onChange, options, className = '' }: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium flex items-center justify-between cursor-pointer transition-colors ${
          isOpen
            ? 'border-primary-500 ring-2 ring-primary-500/20'
            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
        }`}
      >
        <span>{selectedOption?.label || value}</span>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${
            isOpen ? 'transform rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                option.value === value
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


interface CommitmentData {
  productId: number;
  productName: string;
  sku: string;
  committedQty: number; // PO quantity
  receivedQty: number; // Received quantity
  salesQty: number; // Sales quantity
  committedAmount: number;
  receivedAmount: number;
  salesAmount: number;
  openToBuy: number; // Available budget for new purchases
}

interface ScenarioResult {
  purchaseAmount: number;
  newTotalCommitments: number;
  newOpenToBuy: number;
  impactOnBudget: number;
  projectedInventoryValue: number;
  warnings: string[];
}

export default function OpenToBuy() {
  const [activeView, setActiveView] = useState<ViewType>('overview');
  const [period, setPeriod] = useState<PeriodType>('month');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('current');
  const [scenarioAmount, setScenarioAmount] = useState<string>('');
  const [scenarioProduct, setScenarioProduct] = useState<string>('');

  // Fetch orders (sales data)
  const { data: ordersData, isLoading: isLoadingOrders } = useQuery({
    queryKey: ['orders', 'otb'],
    queryFn: async () => {
      try {
        const response = await api.get('/orders?skip=0&take=1000');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch products for scenario planning
  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products', 'otb'],
    queryFn: async () => {
      try {
        const response = await api.get('/products?skip=0&take=1000');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch inventory for value calculations
  const { data: inventoryData, isLoading: isLoadingInventory } = useQuery({
    queryKey: ['inventory', 'otb'],
    queryFn: async () => {
      try {
        const response = await api.get('/inventory');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const orders = ordersData || [];
  const products = productsData || [];
  const inventory = inventoryData || [];

  // Calculate date range based on period
  const dateRange = useMemo(() => {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    if (selectedPeriod === 'current') {
      if (period === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      } else if (period === 'quarter') {
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        endDate = new Date(now.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59);
      } else {
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      }
    } else if (selectedPeriod === 'last') {
      if (period === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      } else if (period === 'quarter') {
        const quarter = Math.floor(now.getMonth() / 3);
        const lastQuarter = quarter === 0 ? 3 : quarter - 1;
        const lastQuarterYear = quarter === 0 ? now.getFullYear() - 1 : now.getFullYear();
        startDate = new Date(lastQuarterYear, lastQuarter * 3, 1);
        endDate = new Date(lastQuarterYear, (lastQuarter + 1) * 3, 0, 23, 59, 59);
      } else {
        startDate = new Date(now.getFullYear() - 1, 0, 1);
        endDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
      }
    }

    return { startDate, endDate };
  }, [period, selectedPeriod]);

  // Calculate Budget vs Actual
  const budgetData = useMemo(() => {
    const filteredOrders = orders.filter((order: any) => {
      const orderDate = new Date(order.orderDate || order.createdAt);
      return orderDate >= dateRange.startDate && orderDate <= dateRange.endDate;
    });

    // Calculate actual sales
    const actualSales = filteredOrders.reduce((sum: number, order: any) => {
      return sum + parseFloat(order.totalAmount || 0);
    }, 0);

    // Calculate budget (use historical average * 1.2 as budget target)
    // In a real system, this would come from a budget table
    const historicalOrders = orders.filter((order: any) => {
      const orderDate = new Date(order.orderDate || order.createdAt);
      const historicalStart = new Date(dateRange.startDate);
      historicalStart.setFullYear(historicalStart.getFullYear() - 1);
      const historicalEnd = new Date(dateRange.endDate);
      historicalEnd.setFullYear(historicalEnd.getFullYear() - 1);
      return orderDate >= historicalStart && orderDate <= historicalEnd;
    });

    const historicalSales = historicalOrders.reduce((sum: number, order: any) => {
      return sum + parseFloat(order.totalAmount || 0);
    }, 0);

    const budget = historicalSales * 1.2; // 20% growth target
    const variance = actualSales - budget;
    const variancePercent = budget > 0 ? (variance / budget) * 100 : 0;

    const periodLabel = selectedPeriod === 'current' ? 'Current' : 'Last';
    const periodName = period === 'month' 
      ? `${periodLabel} Month` 
      : period === 'quarter' 
      ? `${periodLabel} Quarter` 
      : `${periodLabel} Year`;

    return {
      period: periodName,
      budget,
      actual: actualSales,
      variance,
      variancePercent,
    };
  }, [orders, dateRange, period, selectedPeriod]);

  // Calculate Commitments vs Receipts vs Sales
  const commitmentData = useMemo(() => {
    const filteredOrders = orders.filter((order: any) => {
      const orderDate = new Date(order.orderDate || order.createdAt);
      return orderDate >= dateRange.startDate && orderDate <= dateRange.endDate;
    });

    // Group by product
    const productMap: Record<number, CommitmentData> = {};

    // Process orders as commitments (POs) and sales
    filteredOrders.forEach((order: any) => {
      // Treat orders as both commitments (if status is CONFIRMED/PROCESSING) and sales (if FULFILLED/DELIVERED)
      const isCommitment = ['CONFIRMED', 'PROCESSING', 'PARTIALLY_FULFILLED'].includes(order.status);
      const isReceived = ['FULFILLED', 'DELIVERED', 'SHIPPED'].includes(order.status);
      const isSale = ['FULFILLED', 'DELIVERED'].includes(order.status);

      order.orderLines?.forEach((line: any) => {
        const productId = line.productId;
        const product = products.find((p: any) => p.id === productId);
        
        if (!productMap[productId]) {
          productMap[productId] = {
            productId,
            productName: product?.name || 'Unknown Product',
            sku: product?.sku || 'N/A',
            committedQty: 0,
            receivedQty: 0,
            salesQty: 0,
            committedAmount: 0,
            receivedAmount: 0,
            salesAmount: 0,
            openToBuy: 0,
          };
        }

        const qty = line.quantity || 0;
        const amount = parseFloat(line.totalPrice || 0);

        if (isCommitment) {
          productMap[productId].committedQty += qty;
          productMap[productId].committedAmount += amount;
        }

        if (isReceived) {
          productMap[productId].receivedQty += qty;
          productMap[productId].receivedAmount += amount;
        }

        if (isSale) {
          productMap[productId].salesQty += qty;
          productMap[productId].salesAmount += amount;
        }
      });
    });

    // Calculate Open-to-Buy (Budget - Commitments)
    const totalBudget = budgetData.budget;
    const totalCommitments = Object.values(productMap).reduce((sum, item) => sum + item.committedAmount, 0);

    Object.values(productMap).forEach((item) => {
      item.openToBuy = totalBudget > 0 
        ? (totalBudget - totalCommitments) * (item.committedAmount / totalCommitments || 0)
        : 0;
    });

    return Object.values(productMap);
  }, [orders, products, dateRange, budgetData]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalCommitments = commitmentData.reduce((sum, item) => sum + item.committedAmount, 0);
    const totalReceived = commitmentData.reduce((sum, item) => sum + item.receivedAmount, 0);
    const totalSales = commitmentData.reduce((sum, item) => sum + item.salesAmount, 0);
    const totalOpenToBuy = budgetData.budget - totalCommitments;

    return {
      budget: budgetData.budget,
      actual: budgetData.actual,
      variance: budgetData.variance,
      variancePercent: budgetData.variancePercent,
      commitments: totalCommitments,
      received: totalReceived,
      sales: totalSales,
      openToBuy: Math.max(totalOpenToBuy, 0),
    };
  }, [budgetData, commitmentData]);

  // Scenario Planning
  const scenarioResult = useMemo((): ScenarioResult | null => {
    if (!scenarioAmount || parseFloat(scenarioAmount) <= 0) {
      return null;
    }

    const purchaseAmount = parseFloat(scenarioAmount);
    const newTotalCommitments = summaryStats.commitments + purchaseAmount;
    const newOpenToBuy = summaryStats.budget - newTotalCommitments;
    const impactOnBudget = (purchaseAmount / summaryStats.budget) * 100;

    // Calculate projected inventory value
    const currentInventoryValue = inventory.reduce((sum: number, item: any) => {
      const product = products.find((p: any) => p.id === item.productId);
      const unitCost = parseFloat(product?.basePrice || 0);
      return sum + (item.quantity || 0) * unitCost;
    }, 0);

    // Estimate new inventory value (assuming average cost)
    const projectedInventoryValue = currentInventoryValue + (purchaseAmount * 0.8); // 80% becomes inventory

    const warnings: string[] = [];
    if (newOpenToBuy < 0) {
      warnings.push('Purchase exceeds available budget');
    }
    if (newTotalCommitments > summaryStats.budget * 1.1) {
      warnings.push('Total commitments exceed budget by more than 10%');
    }
    if (impactOnBudget > 50) {
      warnings.push('This purchase represents more than 50% of remaining budget');
    }

    return {
      purchaseAmount,
      newTotalCommitments,
      newOpenToBuy,
      impactOnBudget,
      projectedInventoryValue,
      warnings,
    };
  }, [scenarioAmount, summaryStats, inventory, products]);

  // Chart data for Budget vs Actual
  const budgetChartOptions = useMemo(() => {
    return {
      chart: {
        type: 'bar' as const,
        toolbar: { show: false },
        height: 350,
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '60%',
        },
      },
      dataLabels: {
        enabled: true,
        formatter: (val: number) => `$${val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      },
      xaxis: {
        categories: ['Budget', 'Actual'],
      },
      yaxis: {
        labels: {
          formatter: (val: number) => `$${val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
        },
      },
      colors: ['#3B82F6', summaryStats.variance >= 0 ? '#10B981' : '#EF4444'],
      tooltip: {
        y: {
          formatter: (val: number) => `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        },
      },
    };
  }, [summaryStats]);

  const budgetChartSeries = useMemo(() => {
    return [
      {
        name: 'Amount',
        data: [summaryStats.budget, summaryStats.actual],
      },
    ];
  }, [summaryStats]);

  // Chart data for Commitments vs Receipts vs Sales
  const commitmentsChartOptions = useMemo(() => {
    return {
      chart: {
        type: 'bar' as const,
        toolbar: { show: false },
        height: 350,
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '60%',
        },
      },
      dataLabels: {
        enabled: true,
        formatter: (val: number) => `$${val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      },
      xaxis: {
        categories: ['Commitments', 'Received', 'Sales'],
      },
      yaxis: {
        labels: {
          formatter: (val: number) => `$${val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
        },
      },
      colors: ['#F59E0B', '#3B82F6', '#10B981'],
      tooltip: {
        y: {
          formatter: (val: number) => `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        },
      },
    };
  }, []);

  const commitmentsChartSeries = useMemo(() => {
    return [
      {
        name: 'Amount',
        data: [summaryStats.commitments, summaryStats.received, summaryStats.sales],
      },
    ];
  }, [summaryStats]);

  const isLoading = isLoadingOrders || isLoadingProducts || isLoadingInventory;

  if (isLoading) {
    return <SkeletonPage />;
  }

  return (
    <div>
      <Breadcrumb currentPage="Open-to-Buy (OTB)" />
      
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Open-to-Buy (OTB)</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Budget vs actual, Commitments vs receipts vs sales, Scenario planning
            </p>
          </div>
          <div className="flex items-center gap-3">
            <CustomDropdown
              value={period}
              onChange={(value) => setPeriod(value as PeriodType)}
              options={[
                { value: 'month', label: 'Monthly' },
                { value: 'quarter', label: 'Quarterly' },
                { value: 'year', label: 'Yearly' },
              ]}
              className="w-[140px]"
            />
            <CustomDropdown
              value={selectedPeriod}
              onChange={setSelectedPeriod}
              options={[
                { value: 'current', label: 'Current Period' },
                { value: 'last', label: 'Last Period' },
              ]}
              className="w-[160px]"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Budget</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${summaryStats.budget.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <Wallet className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Actual Sales</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${summaryStats.actual.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className={`text-xs mt-1 ${summaryStats.variance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {summaryStats.variance >= 0 ? '+' : ''}{summaryStats.variancePercent.toFixed(1)}%
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              {summaryStats.variance >= 0 ? (
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              ) : (
                <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
              )}
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Commitments</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${summaryStats.commitments.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Open-to-Buy</p>
              <p className={`text-2xl font-bold ${summaryStats.openToBuy >= 0 ? 'text-primary-600 dark:text-primary-400' : 'text-red-600 dark:text-red-400'}`}>
                ${summaryStats.openToBuy.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            {(['overview', 'budget', 'commitments', 'scenario'] as ViewType[]).map((view) => (
              <button
                key={view}
                onClick={() => setActiveView(view)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors capitalize ${
                  activeView === view
                    ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {view === 'overview' ? 'Overview' : view === 'budget' ? 'Budget vs Actual' : view === 'commitments' ? 'Commitments' : 'Scenario Planning'}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeView === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Budget vs Actual</h3>
                  <Chart
                    options={budgetChartOptions}
                    series={budgetChartSeries}
                    type="bar"
                    height={350}
                  />
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Commitments vs Receipts vs Sales</h3>
                  <Chart
                    options={commitmentsChartOptions}
                    series={commitmentsChartSeries}
                    type="bar"
                    height={350}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Budget vs Actual Tab */}
          {activeView === 'budget' && (
            <div className="space-y-6">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Budget vs Actual - {budgetData.period}
                </h3>
                <Chart
                  options={budgetChartOptions}
                  series={budgetChartSeries}
                  type="bar"
                  height={350}
                />
                <div className="mt-6 grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Budget</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      ${budgetData.budget.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Actual</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      ${budgetData.actual.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Variance</p>
                    <p className={`text-xl font-bold ${budgetData.variance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {budgetData.variance >= 0 ? '+' : ''}${budgetData.variance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className={`text-sm ${budgetData.variancePercent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      ({budgetData.variancePercent >= 0 ? '+' : ''}{budgetData.variancePercent.toFixed(1)}%)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Commitments Tab */}
          {activeView === 'commitments' && (
            <div className="space-y-6">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Commitments vs Receipts vs Sales
                </h3>
                <Chart
                  options={commitmentsChartOptions}
                  series={commitmentsChartSeries}
                  type="bar"
                  height={350}
                />
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                        Product / SKU
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                        Committed Qty
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                        Received Qty
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                        Sales Qty
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                        Committed Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                        Received Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                        Sales Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                        Open-to-Buy
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {commitmentData.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                          No commitment data available for the selected period
                        </td>
                      </tr>
                    ) : (
                      commitmentData.map((item) => (
                        <tr key={item.productId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {item.productName}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              SKU: {item.sku}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {item.committedQty}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {item.receivedQty}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {item.salesQty}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            ${item.committedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            ${item.receivedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            ${item.salesAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-600 dark:text-primary-400">
                            ${item.openToBuy.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Scenario Planning Tab */}
          {activeView === 'scenario' && (
            <div className="space-y-6">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Scenario Planning: "If we buy X, what happens?"
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  Enter a purchase amount to see the impact on your budget, commitments, and inventory.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Purchase Amount ($)
                    </label>
                    <input
                      type="number"
                      value={scenarioAmount}
                      onChange={(e) => setScenarioAmount(e.target.value)}
                      placeholder="Enter purchase amount"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Product (Optional)
                    </label>
                    <input
                      type="text"
                      value={scenarioProduct}
                      onChange={(e) => setScenarioProduct(e.target.value)}
                      placeholder="Product name or SKU"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {scenarioResult && (
                  <div className="mt-6 space-y-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">Scenario Results</h4>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Purchase Amount</p>
                          <p className="text-lg font-bold text-gray-900 dark:text-white">
                            ${scenarioResult.purchaseAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">New Total Commitments</p>
                          <p className="text-lg font-bold text-gray-900 dark:text-white">
                            ${scenarioResult.newTotalCommitments.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">New Open-to-Buy</p>
                          <p className={`text-lg font-bold ${scenarioResult.newOpenToBuy >= 0 ? 'text-primary-600 dark:text-primary-400' : 'text-red-600 dark:text-red-400'}`}>
                            ${scenarioResult.newOpenToBuy.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Impact on Budget</p>
                          <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {scenarioResult.impactOnBudget.toFixed(1)}%
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Projected Inventory Value</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">
                          ${scenarioResult.projectedInventoryValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>

                      {scenarioResult.warnings.length > 0 && (
                        <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                          <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-400 mb-2">⚠️ Warnings</p>
                          <ul className="list-disc list-inside space-y-1">
                            {scenarioResult.warnings.map((warning, index) => (
                              <li key={index} className="text-sm text-yellow-700 dark:text-yellow-300">
                                {warning}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}