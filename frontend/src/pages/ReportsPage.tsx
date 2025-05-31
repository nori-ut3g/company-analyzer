import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  FileText, 
  Download, 
  Plus, 
  Calendar,
  Filter,
  Trash2,
  Eye
} from 'lucide-react'
import { format } from 'date-fns'
import { companiesService } from '../services/companies'
import { reportsService } from '../services/reports'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { SearchInput } from '../components/ui/SearchInput'
import { cn } from '../utils/cn'

export default function ReportsPage() {
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const initialCompanyId = searchParams.get('companyId')
  
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(
    initialCompanyId ? parseInt(initialCompanyId) : null
  )
  const [companySearch, setCompanySearch] = useState('')
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  
  // Report generation form state
  const [reportType, setReportType] = useState('comprehensive')
  const [fileFormat, setFileFormat] = useState<'PDF' | 'HTML' | 'XLSX'>('PDF')
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear())
  const [fiscalPeriod, setFiscalPeriod] = useState('FY')

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

  // Get reports
  const { data: reports, isLoading: isLoadingReports } = useQuery({
    queryKey: ['reports', selectedCompanyId],
    queryFn: () => reportsService.getReports(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  })

  // Get report types
  const { data: reportTypes } = useQuery({
    queryKey: ['reportTypes'],
    queryFn: reportsService.getReportTypes,
  })

  // Generate report mutation
  const generateReportMutation = useMutation({
    mutationFn: () => reportsService.generateReport({
      companyId: selectedCompanyId!,
      reportType,
      fileFormat,
      fiscalYear,
      fiscalPeriod,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['reports', selectedCompanyId])
      setShowGenerateModal(false)
    },
  })

  // Download report mutation
  const downloadReportMutation = useMutation({
    mutationFn: async (report: any) => {
      const blob = await reportsService.downloadReport(report.id)
      const filename = `${selectedCompany?.companyName}_${report.reportType}_${format(new Date(report.generatedAt), 'yyyyMMdd')}.${report.fileFormat.toLowerCase()}`
      reportsService.downloadFile(blob, filename)
    },
  })

  // Delete report mutation
  const deleteReportMutation = useMutation({
    mutationFn: (reportId: number) => reportsService.deleteReport(reportId),
    onSuccess: () => {
      queryClient.invalidateQueries(['reports', selectedCompanyId])
    },
  })

  const getFileFormatIcon = (format: string) => {
    switch (format) {
      case 'PDF':
        return '📄'
      case 'HTML':
        return '🌐'
      case 'XLSX':
        return '📊'
      default:
        return '📄'
    }
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">レポート管理</h1>
          <p className="mt-1 text-sm text-gray-500">
            財務分析レポートの生成・管理
          </p>
        </div>
      </div>

      {/* Company Selection */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">対象企業</h3>
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
              <button
                onClick={() => setShowGenerateModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                新規レポート生成
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Reports List */}
      {selectedCompanyId && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              生成済みレポート
            </h3>
          </div>
          
          {isLoadingReports ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : reports && reports.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      レポート名
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      種別
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      形式
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      生成日時
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      サイズ
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">アクション</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reports.map((report) => (
                    <tr key={report.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-2xl mr-3">{getFileFormatIcon(report.fileFormat)}</span>
                          <div className="text-sm font-medium text-gray-900">
                            {report.reportName}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {report.reportType}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {report.fileFormat}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(report.generatedAt), 'yyyy/MM/dd HH:mm')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {report.fileSize ? `${(report.fileSize / 1024).toFixed(1)} KB` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => downloadReportMutation.mutate(report)}
                            disabled={downloadReportMutation.isLoading}
                            className="text-blue-600 hover:text-blue-900"
                            title="ダウンロード"
                          >
                            <Download className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => deleteReportMutation.mutate(report.id)}
                            disabled={deleteReportMutation.isLoading}
                            className="text-red-600 hover:text-red-900"
                            title="削除"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">レポートがありません</h3>
              <p className="mt-1 text-sm text-gray-500">
                新規レポートを生成してください
              </p>
            </div>
          )}
        </div>
      )}

      {/* Generate Report Modal */}
      {showGenerateModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setShowGenerateModal(false)}></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  新規レポート生成
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">レポート種別</label>
                    <select
                      value={reportType}
                      onChange={(e) => setReportType(e.target.value)}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                      {reportTypes?.map((type: any) => (
                        <option key={type.type} value={type.type}>
                          {type.name} - {type.description}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">ファイル形式</label>
                    <select
                      value={fileFormat}
                      onChange={(e) => setFileFormat(e.target.value as 'PDF' | 'HTML' | 'XLSX')}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                      <option value="PDF">PDF</option>
                      <option value="HTML">HTML</option>
                      <option value="XLSX">Excel</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">年度</label>
                      <select
                        value={fiscalYear}
                        onChange={(e) => setFiscalYear(parseInt(e.target.value))}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                      >
                        {[...Array(5)].map((_, i) => {
                          const year = new Date().getFullYear() - i
                          return (
                            <option key={year} value={year}>{year}年</option>
                          )
                        })}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">期間</label>
                      <select
                        value={fiscalPeriod}
                        onChange={(e) => setFiscalPeriod(e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                      >
                        <option value="FY">通期</option>
                        <option value="Q1">第1四半期</option>
                        <option value="Q2">第2四半期</option>
                        <option value="Q3">第3四半期</option>
                        <option value="Q4">第4四半期</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={() => generateReportMutation.mutate()}
                  disabled={generateReportMutation.isLoading}
                  className={cn(
                    "w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white sm:ml-3 sm:w-auto sm:text-sm",
                    generateReportMutation.isLoading
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  )}
                >
                  {generateReportMutation.isLoading ? '生成中...' : '生成'}
                </button>
                <button
                  onClick={() => setShowGenerateModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}