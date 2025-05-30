import { AnalysisResult, FinancialMetrics, TrendAnalysis, TimeSeriesData } from '../types'
import api from './api'

const USE_MOCK = true // 開発用モックを使用

const mockAnalysisData = {
  analysisResults: [
    {
      id: 1,
      companyId: 1,
      analysisType: 'comprehensive',
      score: 82.5,
      interpretation: '財務状況は良好です。ROEは14.8%と業界平均を上回っており、収益性が高いことがわかります。',
      recommendations: ['キャッシュフロー管理の最適化', '成長投資の継続'],
      createdAt: '2024-01-15T10:00:00Z',
      periodEnd: '2023-12-31T00:00:00Z'
    },
    {
      id: 2,
      companyId: 1,
      analysisType: 'profitability',
      score: 78.2,
      interpretation: '利益率は安定しており、事業効率が向上しています。',
      recommendations: ['コスト削減施策の継続'],
      createdAt: '2024-01-10T10:00:00Z',
      periodEnd: '2023-09-30T00:00:00Z'
    }
  ],
  financialMetrics: {
    companyId: 1,
    fiscalYear: 2023,
    fiscalPeriod: 'FY',
    roe: 14.8,
    roa: 7.2,
    grossProfitMargin: 23.5,
    operatingProfitMargin: 12.3,
    netProfitMargin: 8.7,
    currentRatio: 1.45,
    quickRatio: 1.12,
    debtToEquityRatio: 0.68,
    interestCoverageRatio: 8.5,
    totalAssetTurnover: 0.82,
    inventoryTurnover: 6.2,
    receivablesTurnover: 9.8,
    payablesTurnover: 7.3,
    workingCapitalRatio: 15.2,
    eps: 245.6,
    bps: 1658.9,
    per: 18.4,
    pbr: 2.1,
    dividendYield: 2.8,
    payoutRatio: 32.5
  },
  timeSeriesData: [
    { year: 2020, quarter: 'FY', netSales: 28500000000, operatingIncome: 3200000000, netIncome: 2100000000, totalAssets: 42000000000, netAssets: 18500000000 },
    { year: 2021, quarter: 'FY', netSales: 29800000000, operatingIncome: 3450000000, netIncome: 2280000000, totalAssets: 43500000000, netAssets: 19200000000 },
    { year: 2022, quarter: 'FY', netSales: 30200000000, operatingIncome: 3620000000, netIncome: 2350000000, totalAssets: 44200000000, netAssets: 19800000000 },
    { year: 2023, quarter: 'FY', netSales: 31000000000, operatingIncome: 3810000000, netIncome: 2690000000, totalAssets: 45800000000, netAssets: 20500000000 }
  ],
  trendAnalysis: [
    {
      metric: 'revenue',
      trend: 'increasing',
      growthRate: 8.7,
      confidence: 0.85,
      analysis: '売上高は過去3年間で安定的に成長しており、今後も継続的な成長が期待されます。',
      prediction: { nextPeriod: 33100000000, confidenceInterval: [31500000000, 34700000000] }
    },
    {
      metric: 'profit',
      trend: 'increasing',
      growthRate: 14.5,
      confidence: 0.78,
      analysis: '利益は売上を上回る成長率を示しており、効率的な経営が行われています。',
      prediction: { nextPeriod: 3080000000, confidenceInterval: [2850000000, 3310000000] }
    }
  ]
}

export const analysisService = {
  // Get analysis results for a company
  getAnalysisResults: async (
    companyId: number,
    params?: {
      analysisType?: string
      startDate?: string
      endDate?: string
      limit?: number
    }
  ): Promise<AnalysisResult[]> => {
    if (USE_MOCK) {
      const limit = params?.limit || 10
      return mockAnalysisData.analysisResults.slice(0, limit)
    }
    const response = await api.get<{ analysis_results: AnalysisResult[] }>(
      `/analysis/${companyId}`,
      params
    )
    return response.analysis_results
  },

  // Request new analysis
  requestAnalysis: async (
    companyId: number,
    analysisType: string = 'comprehensive',
    periodEnd?: string
  ): Promise<{ jobId: string; estimatedCompletion: string }> => {
    const response = await api.post<{
      analysis_job_id: string
      estimated_completion: string
    }>(`/analysis/${companyId}/analyze`, {
      analysis_type: analysisType,
      period_end: periodEnd
    })
    return {
      jobId: response.analysis_job_id,
      estimatedCompletion: response.estimated_completion
    }
  },

  // Calculate financial metrics
  calculateMetrics: async (
    companyId: number,
    fiscalYear: number,
    fiscalPeriod: string
  ): Promise<FinancialMetrics> => {
    if (USE_MOCK) {
      return mockAnalysisData.financialMetrics
    }
    const response = await api.post<{ metrics: FinancialMetrics }>(
      `/analysis/calculate/${companyId}`,
      { fiscalYear, fiscalPeriod }
    )
    return response.metrics
  },

  // Get time series data
  getTimeSeriesData: async (
    companyId: number,
    startYear?: number,
    endYear?: number
  ): Promise<TimeSeriesData[]> => {
    if (USE_MOCK) {
      return mockAnalysisData.timeSeriesData
    }
    const response = await api.get<{ data: TimeSeriesData[] }>(
      `/analysis/time-series/${companyId}`,
      { startYear, endYear }
    )
    return response.data
  },

  // Analyze trends
  analyzeTrends: async (
    companyId: number,
    metrics: string[],
    periods: number = 12
  ): Promise<TrendAnalysis[]> => {
    if (USE_MOCK) {
      return mockAnalysisData.trendAnalysis
    }
    const response = await api.post<{ analysis: TrendAnalysis[] }>(
      `/analysis/trends/${companyId}`,
      { metrics, periods }
    )
    return response.analysis
  },

  // Compare companies
  compareCompanies: async (
    companyIds: number[],
    fiscalYear: number,
    fiscalPeriod: string
  ) => {
    return api.post('/analysis/compare', {
      companyIds,
      fiscalYear,
      fiscalPeriod
    })
  },

  // Get peer comparison
  getPeerComparison: async (
    companyIds: number[],
    metric: string,
    startYear?: number,
    endYear?: number
  ) => {
    return api.post('/analysis/peer-comparison', {
      companyIds,
      metric,
      startYear,
      endYear
    })
  },

  // Get industry average
  getIndustryAverage: async (
    industryCode: string,
    fiscalYear: number,
    fiscalPeriod: string
  ): Promise<FinancialMetrics> => {
    if (USE_MOCK) {
      return {
        ...mockAnalysisData.financialMetrics,
        roe: 12.5,
        roa: 6.8,
        grossProfitMargin: 22.1,
        operatingProfitMargin: 11.5,
        netProfitMargin: 8.2
      }
    }
    const response = await api.get<{ metrics: FinancialMetrics }>(
      '/analysis/industry-average',
      { industryCode, fiscalYear, fiscalPeriod }
    )
    return response.metrics
  },

  // Get analysis types
  getAnalysisTypes: async () => {
    return api.get('/analysis/meta/types')
  },

  // Get job status
  getJobStatus: async (jobId: string) => {
    return api.get(`/analysis/jobs/${jobId}/status`)
  },
}