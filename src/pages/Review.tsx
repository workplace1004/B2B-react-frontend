import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import api from '../lib/api';
import { Star, MessageSquare, TrendingUp, Users, MessageCircle, BarChart3, Search, MoreVertical } from 'lucide-react';
import Chart from 'react-apexcharts';
import { SkeletonStatsCard } from '../components/Skeleton';

export default function Review() {
  const [reviewTimeRange, setReviewTimeRange] = useState<'today' | 'week' | 'month'>('month');
  const [recentReviewSearch, setRecentReviewSearch] = useState('');
  const [topRatedSearch, setTopRatedSearch] = useState('');

  // Fetch review data
  const { isLoading } = useQuery({
    queryKey: ['reviews', 'dashboard'],
    queryFn: async () => {
      const response = await api.get('/analytics/reviews');
      return response.data;
    },
  });

  // Review Trend Chart Configuration
  const getReviewTrendChartConfig = () => {
    const baseConfig = {
      chart: {
        height: 270,
        type: 'area' as const,
        zoom: { enabled: false },
        toolbar: { show: false },
      },
      colors: ['#5955D1'], // Primary purple color
      fill: {
        type: ['gradient'],
        gradient: {
          shade: 'light',
          type: 'vertical',
          shadeIntensity: 0.1,
          gradientToColors: ['#5955D1'], // Primary purple color
          inverseColors: false,
          opacityFrom: 0.4, // Increased opacity for better visibility
          opacityTo: 0.05, // Increased opacity for better visibility
          stops: [20, 100],
        },
      },
      dataLabels: { enabled: false },
      stroke: {
        width: [3],
        curve: 'smooth' as const,
        dashArray: [0, 5],
        colors: ['#5955D1'], // Primary purple color for the line
      },
      markers: {
        size: 0,
        colors: ['#FFFFFF'],
        strokeColors: '#17a2b8',
        strokeWidth: 2,
        hover: { size: 6 },
      },
      yaxis: {
        min: 0,
        max: 8000,
        tickAmount: 5,
        labels: {
          formatter: (value: number) => `${(value / 100).toFixed(0)}K`,
          style: {
            colors: 'var(--bs-body-color)',
            fontSize: '13px',
            fontWeight: '500',
            fontFamily: 'var(--bs-body-font-family)',
          },
        },
      },
      grid: {
        borderColor: 'var(--bs-border-color)',
        strokeDashArray: 5,
        xaxis: { lines: { show: false } },
        yaxis: { lines: { show: true } },
      },
      tooltip: {
        y: {
          formatter: (val: number) => `${val}K`,
        },
      },
      legend: {
        show: true,
        position: 'bottom' as const,
        horizontalAlign: 'center' as const,
        markers: {
          size: 5,
          shape: 'circle' as const,
          radius: 10,
          width: 10,
          height: 10,
        },
        labels: {
          colors: 'var(--bs-heading-color)',
          fontFamily: 'var(--bs-body-font-family)',
          fontSize: '13px',
        },
      },
    };

    if (reviewTimeRange === 'today') {
      return {
        ...baseConfig,
        series: [
          {
            name: 'Reviews',
            data: [1500, 4200, 4500, 5500, 3800, 5200, 7800, 6000, 5000, 4200, 7000, 7950],
          },
        ],
        xaxis: {
          categories: ['2 AM', '4 AM', '6 AM', '8 AM', '10 AM', '12 PM', '2 PM', '4 PM', '6 PM', '8 PM', '10 PM', '12 AM'],
          axisBorder: { color: 'var(--bs-border-color)' },
          axisTicks: { show: false },
          labels: {
            style: {
              colors: 'var(--bs-body-color)',
              fontSize: '13px',
              fontWeight: '500',
              fontFamily: 'var(--bs-body-font-family)',
            },
          },
        },
      };
    } else if (reviewTimeRange === 'week') {
      return {
        ...baseConfig,
        series: [
          {
            name: 'Reviews',
            data: [1500, 4000, 4200, 6200, 5000, 4200, 7000],
          },
        ],
        xaxis: {
          categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          axisBorder: { color: 'var(--bs-border-color)' },
          axisTicks: { show: false },
          labels: {
            style: {
              colors: 'var(--bs-body-color)',
              fontSize: '13px',
              fontWeight: '500',
              fontFamily: 'var(--bs-body-font-family)',
            },
          },
        },
      };
    } else {
      return {
        ...baseConfig,
        series: [
          {
            name: 'Reviews',
            data: [1500, 4000, 4200, 5500, 4000, 5200, 7800, 6200, 5000, 4200, 7000, 7950],
          },
        ],
        xaxis: {
          categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
          axisBorder: { color: 'var(--bs-border-color)' },
          axisTicks: { show: false },
          labels: {
            style: {
              colors: 'var(--bs-body-color)',
              fontSize: '13px',
              fontWeight: '500',
              fontFamily: 'var(--bs-body-font-family)',
            },
          },
        },
      };
    }
  };

  // Review Sources Chart (Horizontal Stacked Bar)
  const reviewSourcesChartConfig = {
    series: [
      { name: 'Website', data: [30] },
      { name: 'Google', data: [25] },
      { name: 'App Store', data: [20] },
      { name: 'Play Store', data: [15] },
      { name: 'Social Media', data: [10] },
    ],
    chart: {
      type: 'bar' as const,
      height: 95,
      stacked: true,
      stackType: '100%' as const,
      toolbar: { show: false },
      animations: { enabled: true },
    },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: '100%',
        borderRadius: 0,
      },
    },
    dataLabels: { enabled: false },
    stroke: {
      width: 0,
      colors: ['#ffffff'],
    },
    xaxis: {
      labels: { show: false },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: { show: false },
    },
    grid: {
      show: false,
      padding: {
        top: -15,
        bottom: -15,
        left: -15,
        right: 0,
      },
    },
    legend: { show: false },
    fill: {
      opacity: 1,
      colors: [
        'rgba(89, 85, 209, 0.1)',
        'rgba(89, 85, 209, 0.25)',
        'rgba(89, 85, 209, 0.50)',
        'rgba(89, 85, 209, 0.75)',
        'rgba(89, 85, 209, 1)',
      ],
    },
    tooltip: {
      enabled: true,
      y: {
        formatter: (val: number) => {
          return `${val}%`;
        },
      },
      x: { show: false },
      marker: { show: false },
    },
  };

  // Sample data
  const recentReviews = [
    { customer: 'Emily Parker', rating: 5, review: 'Amazing experience!', date: 'Nov 20, 2025', status: 'Responded' },
    { customer: 'Emma Johnson', rating: 5, review: 'Good service but could improve support.', date: 'Nov 19, 2025', status: 'Pending' },
    { customer: 'Sarah Williams', rating: 4, review: 'Loved the product, highly recommend!', date: 'Nov 18, 2025', status: 'Responded' },
    { customer: 'Chris Adams', rating: 5, review: 'Delivery was late.', date: 'Nov 16, 2025', status: 'Resolved' },
    { customer: 'Olivia Brown', rating: 4, review: 'Average experience.', date: 'Nov 15, 2025', status: 'Responded' },
    { customer: 'Michael Chen', rating: 5, review: 'Excellent quality and fast shipping!', date: 'Nov 14, 2025', status: 'Responded' },
    { customer: 'David Wilson', rating: 3, review: 'Could be better.', date: 'Nov 13, 2025', status: 'Pending' },
  ];

  const topRatedProducts = [
    { product: 'Professional Sports Fitness Gear', rating: 4.8, totalReviews: 2860 },
    { product: 'Modern Wooden Office Chair', rating: 4.7, totalReviews: 1940 },
    { product: 'Organic Beauty Skincare Set', rating: 4.6, totalReviews: 3130 },
    { product: 'Smart Home Electronics Kit', rating: 4.4, totalReviews: 890 },
    { product: 'Trendy Travel Luggage Bag', rating: 4.9, totalReviews: 3292 },
    { product: 'Wireless Bluetooth Earbuds', rating: 4.5, totalReviews: 2150 },
    { product: 'Premium Coffee Maker Machine', rating: 4.3, totalReviews: 1750 },
  ];

  const filteredRecentReviews = recentReviews.filter((review) =>
    review.customer.toLowerCase().includes(recentReviewSearch.toLowerCase()) ||
    review.review.toLowerCase().includes(recentReviewSearch.toLowerCase())
  );

  const filteredTopRated = topRatedProducts.filter((product) =>
    product.product.toLowerCase().includes(topRatedSearch.toLowerCase())
  );

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; text: string }> = {
      Responded: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
      Pending: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400' },
      Resolved: { bg: 'bg-primary/10 dark:bg-primary/20', text: 'text-primary dark:text-primary' },
    };
    const style = statusMap[status] || statusMap.Pending;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <nav className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            <a href="/dashboard" className="hover:text-primary">Home</a> / Reviews
          </nav>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reviews</h1>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonStatsCard key={i} />)
        ) : (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 pb-0 border-0 flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded">
                  +12.8%
                </span>
              </div>
              <div className="p-4">
                <h6 className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Reviews</h6>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-0">18,420</h4>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 pb-0 border-0 flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded">
                  +5.3%
                </span>
              </div>
              <div className="p-4">
                <h6 className="text-sm text-gray-600 dark:text-gray-400 mb-1">New Reviews (Month)</h6>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-0">1,240</h4>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 pb-0 border-0 flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 flex items-center justify-center">
                  <Star className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded">
                  +2.1%
                </span>
              </div>
              <div className="p-4">
                <h6 className="text-sm text-gray-600 dark:text-gray-400 mb-1">Average Rating</h6>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-0">4.3 / 5</h4>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 pb-0 border-0 flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded">
                  +3.9%
                </span>
              </div>
              <div className="p-4">
                <h6 className="text-sm text-gray-600 dark:text-gray-400 mb-1">Positive Review Ratio</h6>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-0">88%</h4>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 pb-0 border-0 flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded">
                  -4.2%
                </span>
              </div>
              <div className="p-4">
                <h6 className="text-sm text-gray-600 dark:text-gray-400 mb-1">Response Rate</h6>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-0">72%</h4>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 pb-0 border-0 flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded">
                  +1.4%
                </span>
              </div>
              <div className="p-4">
                <h6 className="text-sm text-gray-600 dark:text-gray-400 mb-1">Star Distribution</h6>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-0">18,420</h4>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Review Trends Chart - 6/12 */}
        <div className="lg:col-span-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 pb-0 border-0 flex flex-wrap gap-3 items-center justify-between">
            <h6 className="text-sm font-semibold text-gray-900 dark:text-white mb-0">Review Trends</h6>
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-full p-1">
              <button
                onClick={() => setReviewTimeRange('today')}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  reviewTimeRange === 'today'
                    ? 'bg-primary text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setReviewTimeRange('week')}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  reviewTimeRange === 'week'
                    ? 'bg-primary text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setReviewTimeRange('month')}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  reviewTimeRange === 'month'
                    ? 'bg-primary text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Month
              </button>
            </div>
          </div>
          <div className="p-4 p-1">
            <Chart type="area" height={270} series={getReviewTrendChartConfig().series} options={getReviewTrendChartConfig()} />
          </div>
        </div>

        {/* Review Sources Breakdown - 3/12 */}
        <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 pb-0 border-0 flex items-center justify-between">
            <h6 className="text-sm font-semibold text-gray-900 dark:text-white mb-0">Review Sources Breakdown</h6>
            <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
              <MoreVertical className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          <div className="p-4 pt-0">
            <div className="my-1">
              <Chart type="bar" height={95} series={reviewSourcesChartConfig.series} options={reviewSourcesChartConfig} />
            </div>
            <div className="space-y-1 mt-4">
              {[
                { label: 'Website', value: '41%', opacity: 'opacity-10' },
                { label: 'Google', value: '32%', opacity: 'opacity-25' },
                { label: 'App Store', value: '16%', opacity: 'opacity-50' },
                { label: 'Play Store', value: '9%', opacity: 'opacity-75' },
                { label: 'Social Media', value: '2%', opacity: 'opacity-100' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 bg-primary ${item.opacity} rounded`}></div>
                    <span className="text-sm text-gray-900 dark:text-white">{item.label}</span>
                  </div>
                  <strong className="text-gray-900 dark:text-white font-semibold text-sm">{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Rating Distribution - 3/12 */}
        <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 pb-0 border-0 flex flex-wrap gap-2 items-center justify-between">
            <h6 className="text-sm font-semibold text-gray-900 dark:text-white mb-0">Rating Distribution</h6>
            <span className="text-xs text-gray-600 dark:text-gray-400">Star wise breakdown</span>
          </div>
          <div className="p-4">
            <div className="text-center mb-4">
              <h2 className="text-5xl font-semibold text-gray-900 dark:text-white mb-0 leading-none">4.5</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-0 mt-1">120 Review</p>
            </div>
            {[
              { stars: 5, percentage: 69.8, color: 'bg-primary' },
              { stars: 4, percentage: 18.5, color: 'bg-yellow-500' },
              { stars: 3, percentage: 5.5, color: 'bg-green-500' },
              { stars: 2, percentage: 3.1, color: 'bg-blue-500' },
              { stars: 1, percentage: 3.1, color: 'bg-red-500' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 mb-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-3 h-3 ${
                        star <= item.stars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.percentage}%` }}></div>
                </div>
                <div className="text-sm text-gray-900 dark:text-white font-semibold min-w-[40px] text-right">
                  {item.percentage}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Reviews - 7/12 */}
        <div className="lg:col-span-7 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 pb-0 border-0 flex flex-wrap gap-2 items-center justify-between">
            <h6 className="text-sm font-semibold text-gray-900 dark:text-white mb-0">Recent Reviews</h6>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search"
                value={recentReviewSearch}
                onChange={(e) => setRecentReviewSearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
          <div className="p-4 pt-2 pb-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-300 font-semibold min-w-[200px]">Customer</th>
                  <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-300 font-semibold min-w-[125px]">Rating</th>
                  <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-300 font-semibold min-w-[200px]">Review</th>
                  <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-300 font-semibold min-w-[125px]">Date</th>
                  <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-300 font-semibold min-w-[100px]">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecentReviews.map((review, idx) => (
                  <tr key={idx} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-xs">
                          {review.customer.charAt(0)}
                        </div>
                        <span className="text-gray-900 dark:text-white">{review.customer}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{renderStars(review.rating)}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">"{review.review}"</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{review.date}</td>
                    <td className="px-4 py-3">{getStatusBadge(review.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Rated Products - 5/12 */}
        <div className="lg:col-span-5 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 pb-0 border-0 flex flex-wrap gap-2 items-center justify-between">
            <h6 className="text-sm font-semibold text-gray-900 dark:text-white mb-0">Top Rated Products</h6>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search"
                value={topRatedSearch}
                onChange={(e) => setTopRatedSearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
          <div className="p-4 pt-2 pb-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-300 font-semibold min-w-[300px]">Product</th>
                  <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-300 font-semibold min-w-[100px]">Rating</th>
                  <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-300 font-semibold min-w-[150px]">Total Reviews</th>
                </tr>
              </thead>
              <tbody>
                {filteredTopRated.map((product, idx) => (
                  <tr key={idx} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-xs">
                          {product.product.charAt(0)}
                        </div>
                        <span className="text-gray-900 dark:text-white">{product.product}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <strong className="text-gray-900 dark:text-white">
                        {product.rating} <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 inline" />
                      </strong>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{product.totalReviews.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

