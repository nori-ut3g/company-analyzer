// API Response Types
export interface ApiResponse<T> {
  data: T
  message?: string
  error?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Auth Types
export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'user'
  createdAt: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

// Company Types
export interface Company {
  id: number
  securitiesCode: string
  companyName: string
  companyNameEn?: string
  industry?: string
  listingMarket?: string
  fiscalYearEnd?: string
  establishedDate?: string
  capitalStock?: number
  employeeCount?: number
  createdAt: string
  updatedAt: string
}

// Financial Statement Types
export interface FinancialStatement {
  id: number
  companyId: number
  fiscalYear: number
  fiscalPeriod: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'FY'
  reportType: string
  netSales?: number
  operatingIncome?: number
  ordinaryIncome?: number
  netIncome?: number
  totalAssets?: number
  netAssets?: number
  capitalStock?: number
  createdAt: string
}

// Analysis Types
export interface FinancialMetrics {
  roe: number | null
  roa: number | null
  netProfitMargin: number | null
  operatingMargin: number | null
  assetTurnover: number | null
  debtToEquity: number | null
  equityRatio: number | null
  salesGrowth: number | null
  netIncomeGrowth: number | null
  assetGrowth: number | null
  eps: number | null
  bps: number | null
}

export interface AnalysisResult {
  id: number
  companyId: number
  fiscalYear: number
  fiscalPeriod: string
  analysisType: string
  metrics: FinancialMetrics
  insights?: string
  score?: number
  createdAt: string
}

export interface TrendAnalysis {
  metric: string
  trend: 'increasing' | 'decreasing' | 'stable' | 'volatile'
  averageGrowthRate: number | null
  volatility: number | null
  forecast: {
    nextPeriod: number | null
    confidence: number
  }
}

// Report Types
export interface Report {
  id: number
  companyId: number
  companyName: string
  reportType: string
  reportName: string
  fileFormat: 'PDF' | 'HTML' | 'XLSX'
  fileSize?: number
  generatedAt: string
  generatedBy: string
  isPublic: boolean
  downloadCount: number
}

export interface ReportGenerationRequest {
  companyId: number
  reportType: string
  fileFormat: 'PDF' | 'HTML' | 'XLSX'
  fiscalYear: number
  fiscalPeriod: string
  templateOptions?: Record<string, any>
}

// Chart Data Types
export interface ChartDataPoint {
  label: string
  value: number
  [key: string]: any
}

export interface TimeSeriesData {
  date: string
  value: number
  [key: string]: any
}

// Filter Types
export interface CompanyFilters {
  search?: string
  industry?: string
  market?: string
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}

export interface ReportFilters {
  reportType?: string
  fileFormat?: string
  startDate?: string
  endDate?: string
}