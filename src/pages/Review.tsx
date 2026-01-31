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
  const { data: reviewsData, isLoading } = useQuery({
    queryKey: ['reviews', 'dashboard'],
    queryFn: async () => {
      const response = await api.get('/analytics/reviews');
      return response.data;
    },
  });

  // Review Trend Chart Configuration
  const getReviewTrendChartConfig = () => {
    const reviewTrends = reviewsData?.reviewTrends || [];
    const maxValue = Math.max(...reviewTrends, 1);
    
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
        max: maxValue > 1000 ? maxValue * 1.1 : 1000,
        tickAmount: 5,
        labels: {
          formatter: (value: number) => value > 1000 ? `${(value / 1000).toFixed(1)}K` : value.toString(),
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
          formatter: (val: number) => val > 1000 ? `${(val / 1000).toFixed(1)}K` : val.toString(),
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

    // Use last 12 months of data
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const data = reviewTrends.length > 0 ? reviewTrends.slice(-12) : Array(12).fill(0);
    const categories = monthNames.slice(-data.length);

    return {
      ...baseConfig,
      series: [
        {
          name: 'Reviews',
          data: data,
        },
      ],
      xaxis: {
        categories: categories,
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
  };

  // Review Sources Chart (Horizontal Stacked Bar)
  const getReviewSourcesChartConfig = () => {
    const sourceBreakdown = reviewsData?.sourceBreakdown || {};
    const total = Object.values(sourceBreakdown).reduce((sum: number, val: number) => sum + val, 0) as number;
    
    // Convert to percentages
    const sources = Object.entries(sourceBreakdown).map(([name, count]) => ({
      name,
      percentage: total > 0 ? ((count as number) / total) * 100 : 0,
    })).sort((a, b) => b.percentage - a.percentage);

    return {
      series: sources.map(s => ({ name: s.name, data: [s.percentage] })),
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
            return `${val.toFixed(1)}%`;
          },
        },
        x: { show: false },
        marker: { show: false },
      },
    };
  };

  // Use real data from API
  const recentReviews = reviewsData?.recentReviews || [];
  const topRatedProducts = reviewsData?.topRatedProducts || [];

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
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reviews</h1>
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
                {reviewsData?.totalReviewsChange !== undefined && (
                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                    reviewsData.totalReviewsChange >= 0
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {reviewsData.totalReviewsChange >= 0 ? '+' : ''}{reviewsData.totalReviewsChange.toFixed(1)}%
                  </span>
                )}
              </div>
              <div className="p-4">
                <h6 className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Reviews</h6>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-0">
                  {reviewsData?.totalReviews?.toLocaleString() || '0'}
                </h4>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 pb-0 border-0 flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                {reviewsData?.totalReviewsChange !== undefined && (
                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                    reviewsData.totalReviewsChange >= 0
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {reviewsData.totalReviewsChange >= 0 ? '+' : ''}{reviewsData.totalReviewsChange.toFixed(1)}%
                  </span>
                )}
              </div>
              <div className="p-4">
                <h6 className="text-sm text-gray-600 dark:text-gray-400 mb-1">New Reviews (Month)</h6>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-0">
                  {reviewsData?.newReviewsThisMonth?.toLocaleString() || '0'}
                </h4>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 pb-0 border-0 flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 flex items-center justify-center">
                  <Star className="w-5 h-5" />
                </div>
                {reviewsData?.avgRatingChange !== undefined && reviewsData.avgRatingChange !== 0 && (
                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                    reviewsData.avgRatingChange >= 0
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {reviewsData.avgRatingChange >= 0 ? '+' : ''}{reviewsData.avgRatingChange.toFixed(1)}%
                  </span>
                )}
              </div>
              <div className="p-4">
                <h6 className="text-sm text-gray-600 dark:text-gray-400 mb-1">Average Rating</h6>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-0">
                  {reviewsData?.avgRating?.toFixed(1) || '0.0'} / 5
                </h4>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 pb-0 border-0 flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                {reviewsData?.positiveRatioChange !== undefined && reviewsData.positiveRatioChange !== 0 && (
                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                    reviewsData.positiveRatioChange >= 0
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {reviewsData.positiveRatioChange >= 0 ? '+' : ''}{reviewsData.positiveRatioChange.toFixed(1)}%
                  </span>
                )}
              </div>
              <div className="p-4">
                <h6 className="text-sm text-gray-600 dark:text-gray-400 mb-1">Positive Review Ratio</h6>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-0">
                  {reviewsData?.positiveRatio?.toFixed(0) || '0'}%
                </h4>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 pb-0 border-0 flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5" />
                </div>
                {reviewsData?.responseRateChange !== undefined && reviewsData.responseRateChange !== 0 && (
                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                    reviewsData.responseRateChange >= 0
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {reviewsData.responseRateChange >= 0 ? '+' : ''}{reviewsData.responseRateChange.toFixed(1)}%
                  </span>
                )}
              </div>
              <div className="p-4">
                <h6 className="text-sm text-gray-600 dark:text-gray-400 mb-1">Response Rate</h6>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-0">
                  {reviewsData?.responseRate?.toFixed(0) || '0'}%
                </h4>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 pb-0 border-0 flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="p-4">
                <h6 className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Reviews</h6>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-0">
                  {reviewsData?.totalReviews?.toLocaleString() || '0'}
                </h4>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-5">
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
            {reviewsData?.sourceBreakdown && Object.keys(reviewsData.sourceBreakdown).length > 0 ? (
              <>
                <div className="my-1">
                  <Chart type="bar" height={95} series={getReviewSourcesChartConfig().series} options={getReviewSourcesChartConfig()} />
                </div>
                <div className="space-y-1 mt-4">
                  {Object.entries(reviewsData.sourceBreakdown)
                    .map(([name, count]) => {
                      const total = Object.values(reviewsData.sourceBreakdown).reduce((sum: number, val: number) => sum + val, 0) as number;
                      const percentage = total > 0 ? ((count as number) / total) * 100 : 0;
                      return { name, percentage, count: count as number };
                    })
                    .sort((a, b) => b.percentage - a.percentage)
                    .slice(0, 5)
                    .map((item, idx) => {
                      const opacityMap = ['opacity-10', 'opacity-25', 'opacity-50', 'opacity-75', 'opacity-100'];
                      return (
                        <div key={idx} className="flex items-center justify-between py-1">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 bg-primary ${opacityMap[idx] || 'opacity-100'} rounded`}></div>
                            <span className="text-sm text-gray-900 dark:text-white">{item.name}</span>
                          </div>
                          <strong className="text-gray-900 dark:text-white font-semibold text-sm">{item.percentage.toFixed(1)}%</strong>
                        </div>
                      );
                    })}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">No review sources data</div>
            )}
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
              <h2 className="text-5xl font-semibold text-gray-900 dark:text-white mb-0 leading-none">
                {reviewsData?.avgRating?.toFixed(1) || '0.0'}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-0 mt-1">
                {reviewsData?.totalReviews || 0} Review{reviewsData?.totalReviews !== 1 ? 's' : ''}
              </p>
            </div>
            {reviewsData?.ratingDistribution ? (
              [5, 4, 3, 2, 1].map((stars) => {
                const count = reviewsData.ratingDistribution[stars] || 0;
                const total = reviewsData.totalReviews || 1;
                const percentage = (count / total) * 100;
                const colorMap: Record<number, string> = {
                  5: 'bg-primary',
                  4: 'bg-yellow-500',
                  3: 'bg-green-500',
                  2: 'bg-blue-500',
                  1: 'bg-red-500',
                };
                return (
                  <div key={stars} className="flex items-center gap-3 mb-2">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3 h-3 ${
                            star <= stars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className={`h-full ${colorMap[stars]} rounded-full`} style={{ width: `${percentage}%` }}></div>
                    </div>
                    <div className="text-sm text-gray-900 dark:text-white font-semibold min-w-[40px] text-right">
                      {percentage.toFixed(1)}%
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">No rating data</div>
            )}
          </div>
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-5">
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

