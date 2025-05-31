import { useQuery } from '@tanstack/react-query'
import { 
  TrendingUp, 
  TrendingDown, 
  Building2, 
  FileText,
  Activity,
  DollarSign
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '../utils/cn'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { companiesService } from '../services/companies'
import { reportsService } from '../services/reports'

interface StatCard {
  title: string
  value: string | number
  icon: React.ElementType
  trend?: {
    value: number
    isPositive: boolean
  }
  link?: string
}

export default function DashboardPage() {
  // Fetch recent companies
  const { data: companiesData } = useQuery({
    queryKey: ['companies', 'recent'],
    queryFn: () => companiesService.getCompanies(1, 5),
  })

  // Fetch recent reports (using a dummy company ID for now)
  const { data: recentReports } = useQuery({
    queryKey: ['reports', 'recent'],
    queryFn: () => reportsService.getReportHistory(1),
    enabled: false, // Disable for now
  })

  const stats: StatCard[] = [
    {
      title: '登録企業数',
      value: companiesData?.pagination.total || 0,
      icon: Building2,
      link: '/companies'
    },
    {
      title: '生成レポート数',
      value: recentReports?.length || 0,
      icon: FileText,
      link: '/reports'
    },
    {
      title: '今月の分析数',
      value: 42,
      icon: Activity,
      trend: {
        value: 12,
        isPositive: true
      }
    },
    {
      title: '平均ROE',
      value: '8.5%',
      icon: DollarSign,
      trend: {
        value: -2.3,
        isPositive: false
      }
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
        <p className="mt-1 text-sm text-gray-500">
          EDINET分析システムの概要
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className="relative overflow-hidden rounded-lg bg-white px-4 pb-12 pt-5 shadow sm:px-6 sm:pt-6"
          >
            <dt>
              <div className="absolute rounded-md bg-blue-500 p-3">
                <stat.icon className="h-6 w-6 text-white" aria-hidden="true" />
              </div>
              <p className="ml-16 truncate text-sm font-medium text-gray-500">
                {stat.title}
              </p>
            </dt>
            <dd className="ml-16 flex items-baseline pb-6 sm:pb-7">
              <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
              {stat.trend && (
                <p
                  className={cn(
                    stat.trend.isPositive ? 'text-green-600' : 'text-red-600',
                    'ml-2 flex items-baseline text-sm font-semibold'
                  )}
                >
                  {stat.trend.isPositive ? (
                    <TrendingUp className="h-4 w-4 flex-shrink-0 self-center" />
                  ) : (
                    <TrendingDown className="h-4 w-4 flex-shrink-0 self-center" />
                  )}
                  <span className="ml-1">{Math.abs(stat.trend.value)}%</span>
                </p>
              )}
              {stat.link && (
                <div className="absolute inset-x-0 bottom-0 bg-gray-50 px-4 py-4 sm:px-6">
                  <Link
                    to={stat.link}
                    className="text-sm font-medium text-blue-600 hover:text-blue-500"
                  >
                    詳細を見る →
                  </Link>
                </div>
              )}
            </dd>
          </div>
        ))}
      </div>

      {/* Recent Companies */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            最近追加された企業
          </h3>
        </div>
        <div className="px-4 py-5 sm:p-6">
          {companiesData ? (
            <div className="space-y-3">
              {companiesData.data.map((company) => (
                <div
                  key={company.id}
                  className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                >
                  <div>
                    <Link
                      to={`/companies/${company.id}`}
                      className="text-sm font-medium text-gray-900 hover:text-blue-600"
                    >
                      {company.companyName}
                    </Link>
                    <p className="text-sm text-gray-500">
                      証券コード: {company.securitiesCode}
                    </p>
                  </div>
                  <div className="text-sm text-gray-500">
                    {company.industry || '業種未設定'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          )}
        </div>
        <div className="bg-gray-50 px-4 py-3 sm:px-6">
          <Link
            to="/companies"
            className="text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            すべての企業を見る →
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            クイックアクション
          </h3>
        </div>
        <div className="px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              to="/companies"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
            >
              <div className="flex-shrink-0">
                <Building2 className="h-6 w-6 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">企業を検索</p>
                <p className="text-sm text-gray-500">企業情報を検索・閲覧</p>
              </div>
            </Link>

            <Link
              to="/analysis"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
            >
              <div className="flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">分析を実行</p>
                <p className="text-sm text-gray-500">財務分析を開始</p>
              </div>
            </Link>

            <Link
              to="/reports"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
            >
              <div className="flex-shrink-0">
                <FileText className="h-6 w-6 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">レポート生成</p>
                <p className="text-sm text-gray-500">分析レポートを作成</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}