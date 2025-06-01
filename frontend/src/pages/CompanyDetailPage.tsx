import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { 
  Building2, 
  TrendingUp, 
  FileText, 
  Calendar,
  Users,
  DollarSign,
  ArrowLeft,
  Download
} from 'lucide-react'
import { companiesService } from '../services/companies'
import { analysisService } from '../services/analysis'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { cn } from '../utils/cn'
import { format } from 'date-fns'

export default function CompanyDetailPage() {
  const { companyId } = useParams<{ companyId: string }>()
  const id = parseInt(companyId || '0')

  // Fetch company details
  const { data: company, isLoading: isLoadingCompany, error: companyError } = useQuery({
    queryKey: ['company', id],
    queryFn: () => companiesService.getCompany(id),
    enabled: !!id,
  })

  // Fetch financial statements
  const { data: financialStatements } = useQuery({
    queryKey: ['financialStatements', id],
    queryFn: () => companiesService.getFinancialStatements(id),
    enabled: !!id,
  })

  // Fetch analysis results
  const { data: analysisResults } = useQuery({
    queryKey: ['analysisResults', id],
    queryFn: () => analysisService.getAnalysisResults(id, { limit: 5 }),
    enabled: !!id,
  })

  if (isLoadingCompany) {
    return <LoadingSpinner fullScreen />
  }

  if (companyError) {
    console.error('Company fetch error:', companyError)
    return (
      <div className="text-center py-12">
        <Building2 className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">エラーが発生しました</h3>
        <p className="mt-1 text-sm text-gray-500">{(companyError as Error).message}</p>
        <div className="mt-6">
          <Link
            to="/companies"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            企業一覧に戻る
          </Link>
        </div>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="text-center py-12">
        <Building2 className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">企業が見つかりません</h3>
        <div className="mt-6">
          <Link
            to="/companies"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            企業一覧に戻る
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow-sm rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <Link
            to="/companies"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            企業一覧に戻る
          </Link>
          
          <div className="flex items-start justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                  <Building2 className="h-10 w-10 text-blue-600" />
                </div>
              </div>
              <div className="ml-4">
                <h1 className="text-2xl font-bold text-gray-900">{company.companyName}</h1>
                <p className="text-sm text-gray-500">
                  証券コード: {company.securitiesCode}
                  {company.industry && ` | ${company.industry}`}
                  {company.listingMarket && ` | ${company.listingMarket}`}
                </p>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <Link
                to={`/analysis?companyId=${id}`}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                分析を実行
              </Link>
              <Link
                to={`/reports?companyId=${id}`}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <FileText className="h-4 w-4 mr-2" />
                レポート生成
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Company Info */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">企業情報</h3>
        </div>
        <div className="px-4 py-5 sm:p-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            {company.establishedDate && (
              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  設立年月日
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {format(new Date(company.establishedDate), 'yyyy年MM月dd日')}
                </dd>
              </div>
            )}
            
            {company.capitalStock && (
              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <DollarSign className="h-4 w-4 mr-2" />
                  資本金
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {(company.capitalStock / 1000000).toLocaleString('ja-JP')} 百万円
                </dd>
              </div>
            )}
            
            {company.employeeCount && (
              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  従業員数
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {company.employeeCount.toLocaleString('ja-JP')} 人
                </dd>
              </div>
            )}
            
            {company.fiscalYearEnd && (
              <div>
                <dt className="text-sm font-medium text-gray-500">決算期</dt>
                <dd className="mt-1 text-sm text-gray-900">{company.fiscalYearEnd}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Financial Statements */}
      {financialStatements && financialStatements.length > 0 && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">最新の財務データ</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    期間
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    売上高
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    営業利益
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    純利益
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    総資産
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    純資産
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {financialStatements.slice(0, 5).map((statement) => (
                  <tr key={statement.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {statement.fiscalYear}年 {statement.fiscalPeriod}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {statement.netSales ? 
                        `${(statement.netSales / 1000000).toLocaleString('ja-JP')} 百万円` : 
                        '-'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {statement.operatingIncome ? 
                        `${(statement.operatingIncome / 1000000).toLocaleString('ja-JP')} 百万円` : 
                        '-'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {statement.netIncome ? 
                        `${(statement.netIncome / 1000000).toLocaleString('ja-JP')} 百万円` : 
                        '-'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {statement.totalAssets ? 
                        `${(statement.totalAssets / 1000000).toLocaleString('ja-JP')} 百万円` : 
                        '-'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {statement.netAssets ? 
                        `${(statement.netAssets / 1000000).toLocaleString('ja-JP')} 百万円` : 
                        '-'
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {analysisResults && analysisResults.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-gray-900">最近の分析結果</h3>
            <Link
              to={`/analysis?companyId=${id}`}
              className="text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              すべて見る →
            </Link>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <div className="space-y-4">
              {analysisResults.map((result) => (
                <div key={result.id} className="border-l-4 border-blue-400 pl-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {result.analysisType} - {result.fiscalYear}年 {result.fiscalPeriod}
                      </p>
                      <p className="text-sm text-gray-500">
                        {format(new Date(result.createdAt), 'yyyy年MM月dd日 HH:mm')}
                      </p>
                    </div>
                    {result.score && (
                      <div className="text-2xl font-bold text-blue-600">
                        {result.score}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}