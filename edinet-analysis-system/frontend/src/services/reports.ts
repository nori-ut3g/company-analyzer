import { Report, ReportGenerationRequest, ReportFilters } from '../types'
import api, { apiClient } from './api'

const USE_MOCK = true // 開発用モックを使用

const mockReportsData = {
  reports: [
    {
      id: 1,
      companyId: 1,
      title: 'トヨタ自動車株式会社 2023年度 財務分析レポート',
      reportType: 'financial_analysis',
      fileFormat: 'pdf',
      filePath: '/reports/toyota_financial_2023.pdf',
      fileSize: 2845760,
      status: 'completed',
      createdAt: '2024-01-15T10:00:00Z',
      completedAt: '2024-01-15T10:05:32Z',
      fiscalYear: 2023,
      fiscalPeriod: 'FY'
    },
    {
      id: 2,
      companyId: 1,
      title: 'トヨタ自動車株式会社 業界比較レポート',
      reportType: 'industry_comparison',
      fileFormat: 'pdf',
      filePath: '/reports/toyota_industry_comparison.pdf',
      fileSize: 1923840,
      status: 'completed',
      createdAt: '2024-01-10T15:30:00Z',
      completedAt: '2024-01-10T15:33:28Z',
      fiscalYear: 2023,
      fiscalPeriod: 'FY'
    },
    {
      id: 3,
      companyId: 1,
      title: 'トヨタ自動車株式会社 リスク分析レポート',
      reportType: 'risk_analysis',
      fileFormat: 'pdf',
      filePath: '/reports/toyota_risk_analysis.pdf',
      fileSize: 1654720,
      status: 'processing',
      createdAt: '2024-01-16T09:15:00Z',
      completedAt: null,
      fiscalYear: 2023,
      fiscalPeriod: 'FY'
    }
  ],
  reportTypes: [
    { type: 'financial_analysis', name: '財務分析レポート', description: '包括的な財務指標分析' },
    { type: 'industry_comparison', name: '業界比較レポート', description: '同業他社との比較分析' },
    { type: 'risk_analysis', name: 'リスク分析レポート', description: 'ビジネスリスクの評価' },
    { type: 'esg_analysis', name: 'ESG分析レポート', description: '環境・社会・ガバナンスの評価' },
    { type: 'valuation', name: '企業価値評価レポート', description: '株式価値算定分析' }
  ]
}

export const reportsService = {
  // Get reports for a company
  getReports: async (
    companyId: number,
    filters?: ReportFilters
  ): Promise<Report[]> => {
    if (USE_MOCK) {
      return mockReportsData.reports.filter(report => report.companyId === companyId)
    }
    const response = await api.get<{ reports: Report[] }>(
      `/reports/${companyId}`,
      filters
    )
    return response.reports
  },

  // Generate new report
  generateReport: async (
    request: ReportGenerationRequest
  ): Promise<{ jobId: string; estimatedCompletion: string }> => {
    if (USE_MOCK) {
      return {
        jobId: 'mock-job-' + Date.now(),
        estimatedCompletion: new Date(Date.now() + 5 * 60 * 1000).toISOString()
      }
    }
    const response = await api.post<{
      job_id: string
      estimated_completion: string
    }>(`/reports/${request.companyId}/generate`, {
      report_type: request.reportType,
      file_format: request.fileFormat,
      period_end: `${request.fiscalYear}-12-31`,
      template_options: request.templateOptions
    })
    return {
      jobId: response.job_id,
      estimatedCompletion: response.estimated_completion
    }
  },

  // Download report
  downloadReport: async (reportId: number): Promise<Blob> => {
    if (USE_MOCK) {
      // Create a mock PDF blob
      const pdfContent = '%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000074 00000 n \n0000000120 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n179\n%%EOF'
      return new Blob([pdfContent], { type: 'application/pdf' })
    }
    const response = await apiClient.get(`/reports/download/${reportId}`, {
      responseType: 'blob'
    })
    return response.data
  },

  // Get report history
  getReportHistory: async (companyId: number): Promise<Report[]> => {
    if (USE_MOCK) {
      return mockReportsData.reports.filter(report => report.companyId === companyId)
    }
    const response = await api.get<{ reports: Report[] }>(
      `/reports/history/${companyId}`
    )
    return response.reports
  },

  // Delete report
  deleteReport: async (reportId: number): Promise<void> => {
    await api.delete(`/reports/${reportId}`)
  },

  // Get job status
  getJobStatus: async (jobId: string) => {
    return api.get(`/reports/jobs/${jobId}/status`)
  },

  // Get available report types
  getReportTypes: async () => {
    if (USE_MOCK) {
      return mockReportsData.reportTypes
    }
    return api.get('/reports/meta/types')
  },

  // Helper function to trigger download
  downloadFile: (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  },
}