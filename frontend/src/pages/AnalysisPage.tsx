import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  RefreshCw,
  Download,
  AlertCircle
} from 'lucide-react'
import { companiesService } from '../services/companies'
import { analysisService } from '../services/analysis'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { SearchInput } from '../components/ui/SearchInput'
import { LineChart } from '../components/charts/LineChart'
import { BarChart } from '../components/charts/BarChart'
import { MetricCard } from '../components/charts/MetricCard'
import { cn } from '../utils/cn'

export default function AnalysisPage() {
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const initialCompanyId = searchParams.get('companyId')
  
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(
    initialCompanyId ? parseInt(initialCompanyId) : null
  )
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedPeriod, setSelectedPeriod] = useState<string>('FY')
  const [companySearch, setCompanySearch] = useState('')

  // Search companies
  const { data: searchResults } = useQuery({
    queryKey: ['companiesSearch', companySearch],
    queryFn: () => companiesService.searchCompanies(companySearch),
    enabled: companySearch.length > 2,
  })

  // Get selected company
  const { data: selectedCompany } = useQuery({
    queryKey: ['company', selectedCompanyId],
    queryFn: () => companiesService.getCompany(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  })

  // Get time series data
  const { data: timeSeriesData, isLoading: isLoadingTimeSeries } = useQuery({
    queryKey: ['timeSeries', selectedCompanyId],
    queryFn: () => analysisService.getTimeSeriesData(
      selectedCompanyId!,
      selectedYear - 5,
      selectedYear
    ),
    enabled: !!selectedCompanyId,
  })

  // Get analysis results
  const { data: analysisResults, isLoading: isLoadingAnalysis } = useQuery({
    queryKey: ['analysis', selectedCompanyId, selectedYear, selectedPeriod],
    queryFn: () => analysisService.getAnalysisResults(selectedCompanyId!, {
      analysisType: 'financial_metrics',
      limit: 1
    }),
    enabled: !!selectedCompanyId,
  })

  // Calculate metrics mutation
  const calculateMetricsMutation = useMutation({
    mutationFn: () => analysisService.calculateMetrics(
      selectedCompanyId!,
      selectedYear,
      selectedPeriod
    ),
    onSuccess: () => {
      // Refetch analysis results
      queryClient.invalidateQueries(['analysis', selectedCompanyId])
    },
  })

  const currentMetrics = analysisResults?.[0]?.metrics

  // Transform time series data for charts
  const chartData = timeSeriesData?.map(item => ({
    period: `${item.fiscalYear} ${item.fiscalPeriod}`,
    売上高: item.metrics?.netSales || 0,
    営業利益: item.metrics?.operatingIncome || 0,
    純利益: item.metrics?.netIncome || 0,
    ROE: item.metrics?.roe || 0,
    ROA: item.metrics?.roa || 0,
  })) || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">財務分析</h1>
        <p className="mt-1 text-sm text-gray-500">
          企業の財務データを分析し、各種指標を計算します
        </p>
      </div>

      {/* Company Selection */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">分析対象企業</h3>
        <div className="space-y-4">
          <div className="relative">
            <SearchInput
              value={companySearch}
              onChange={setCompanySearch}
              placeholder="企業名または証券コードで検索"
            />
            
            {searchResults && searchResults.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md py-1 max-h-60 overflow-auto">
                {searchResults.map((company) => (
                  <button
                    key={company.id}
                    onClick={() => {
                      setSelectedCompanyId(company.id)
                      setCompanySearch('')
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                  >
                    <div className="font-medium">{company.companyName}</div>
                    <div className="text-gray-500">証券コード: {company.securitiesCode}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedCompany && (
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">{selectedCompany.companyName}</p>
                <p className="text-sm text-gray-500">証券コード: {selectedCompany.securitiesCode}</p>
              </div>
              <div className="flex items-center space-x-4">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="block w-32 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  {[...Array(5)].map((_, i) => {
                    const year = new Date().getFullYear() - i
                    return (
                      <option key={year} value={year}>{year}年</option>
                    )
                  })}
                </select>
                
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="block w-32 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="FY">通期</option>
                  <option value="Q1">第1四半期</option>
                  <option value="Q2">第2四半期</option>
                  <option value="Q3">第3四半期</option>
                  <option value="Q4">第4四半期</option>
                </select>
                
                <button
                  onClick={() => calculateMetricsMutation.mutate()}
                  disabled={calculateMetricsMutation.isLoading}
                  className={cn(
                    "inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white",
                    calculateMetricsMutation.isLoading
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  )}
                >
                  <RefreshCw className={cn(
                    "h-4 w-4 mr-2",
                    calculateMetricsMutation.isLoading && "animate-spin"
                  )} />
                  分析を実行
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedCompanyId && (
        <>
          {/* Financial Metrics */}
          {currentMetrics && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">財務指標</h3>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  title="ROE (自己資本利益率)"
                  value={currentMetrics.roe?.toFixed(2) || 'N/A'}
                  unit="%"
                  trend={currentMetrics.roe ? {
                    value: 5.2,
                    isPositive: currentMetrics.roe > 8
                  } : undefined}
                />
                <MetricCard
                  title="ROA (総資産利益率)"
                  value={currentMetrics.roa?.toFixed(2) || 'N/A'}
                  unit="%"
                  trend={currentMetrics.roa ? {
                    value: 3.1,
                    isPositive: currentMetrics.roa > 3
                  } : undefined}
                />
                <MetricCard
                  title="営業利益率"
                  value={currentMetrics.operatingMargin?.toFixed(2) || 'N/A'}
                  unit="%"
                  trend={currentMetrics.operatingMargin ? {
                    value: -1.2,
                    isPositive: currentMetrics.operatingMargin > 10
                  } : undefined}
                />
                <MetricCard
                  title="自己資本比率"
                  value={currentMetrics.equityRatio?.toFixed(2) || 'N/A'}
                  unit="%"
                  trend={currentMetrics.equityRatio ? {
                    value: 2.5,
                    isPositive: currentMetrics.equityRatio > 40
                  } : undefined}
                />
              </div>
            </div>
          )}

          {/* Charts */}
          {chartData.length > 0 && (
            <div className="space-y-6">
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">業績推移</h3>
                <LineChart
                  data={chartData}
                  lines={[
                    { dataKey: '売上高', name: '売上高', color: '#3b82f6' },
                    { dataKey: '営業利益', name: '営業利益', color: '#10b981' },
                    { dataKey: '純利益', name: '純利益', color: '#f59e0b' },
                  ]}
                  xDataKey="period"
                  height={400}
                  formatYAxis={(value) => `${(value / 1000000).toFixed(0)}M円`}
                  formatTooltip={(value) => `${value.toLocaleString('ja-JP')}円`}
                />
              </div>

              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">収益性指標推移</h3>
                <BarChart
                  data={chartData}
                  bars={[
                    { dataKey: 'ROE', name: 'ROE', color: '#8b5cf6' },
                    { dataKey: 'ROA', name: 'ROA', color: '#ec4899' },
                  ]}
                  xDataKey="period"
                  height={300}
                  formatYAxis={(value) => `${value}%`}
                  formatTooltip={(value) => `${value.toFixed(2)}%`}
                />
              </div>
            </div>
          )}

          {/* Loading States */}
          {(isLoadingTimeSeries || isLoadingAnalysis) && (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          )}

          {/* No Data State */}
          {!isLoadingTimeSeries && !isLoadingAnalysis && chartData.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">データがありません</h3>
              <p className="mt-1 text-sm text-gray-500">
                選択した期間のデータが見つかりません
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}