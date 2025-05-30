import { Company, PaginatedResponse, CompanyFilters, FinancialStatement } from '../types'
import api from './api'
import { mockCompanies } from '../mocks/mockServer'

const USE_MOCK = true // 開発用モックを使用

export const companiesService = {
  // Get paginated list of companies
  getCompanies: async (
    page: number = 1, 
    limit: number = 20, 
    filters?: CompanyFilters
  ): Promise<PaginatedResponse<Company>> => {
    if (USE_MOCK) {
      const start = (page - 1) * limit
      const end = start + limit
      const filtered = filters?.search 
        ? mockCompanies.filter(c => 
            c.companyName.toLowerCase().includes(filters.search!.toLowerCase()) ||
            c.securitiesCode.includes(filters.search!)
          )
        : mockCompanies
      
      return {
        data: filtered.slice(start, end),
        pagination: {
          page,
          limit,
          total: filtered.length,
          totalPages: Math.ceil(filtered.length / limit)
        }
      }
    }
    const params = {
      page,
      limit,
      ...filters
    }
    return api.get<PaginatedResponse<Company>>('/companies', params)
  },

  // Get single company by ID
  getCompany: async (companyId: number): Promise<Company> => {
    if (USE_MOCK) {
      const company = mockCompanies.find(c => c.id === companyId)
      if (!company) throw new Error('Company not found')
      return company
    }
    return api.get<Company>(`/companies/${companyId}`)
  },

  // Search companies
  searchCompanies: async (query: string, filters?: CompanyFilters): Promise<Company[]> => {
    const response = await api.post<{ results: Company[] }>('/companies/search', {
      query,
      filters
    })
    return response.results
  },

  // Get company financial statements
  getFinancialStatements: async (
    companyId: number,
    params?: {
      periodType?: 'annual' | 'quarterly'
      startDate?: string
      endDate?: string
      consolidated?: boolean
    }
  ): Promise<FinancialStatement[]> => {
    if (USE_MOCK) {
      return [
        {
          id: 1,
          companyId,
          fiscalYear: 2023,
          fiscalPeriod: 'FY',
          reportType: 'Annual Report',
          netSales: 31000000000,
          operatingIncome: 2800000000,
          ordinaryIncome: 2900000000,
          netIncome: 2400000000,
          totalAssets: 50000000000,
          netAssets: 28000000000,
          capitalStock: 6350000000,
          createdAt: '2024-01-01T00:00:00Z'
        },
        {
          id: 2,
          companyId,
          fiscalYear: 2022,
          fiscalPeriod: 'FY',
          reportType: 'Annual Report',
          netSales: 29500000000,
          operatingIncome: 2500000000,
          ordinaryIncome: 2600000000,
          netIncome: 2100000000,
          totalAssets: 47000000000,
          netAssets: 26000000000,
          capitalStock: 6350000000,
          createdAt: '2023-01-01T00:00:00Z'
        }
      ]
    }
    const response = await api.get<{ financial_statements: FinancialStatement[] }>(
      `/companies/${companyId}/financials`,
      params
    )
    return response.financial_statements
  },

  // Get company stock prices
  getStockPrices: async (
    companyId: number,
    params?: {
      startDate?: string
      endDate?: string
      limit?: number
    }
  ) => {
    return api.get(`/companies/${companyId}/stock-prices`, params)
  },

  // Get available industries
  getIndustries: async (): Promise<Array<{ industryCode: string; industryName: string }>> => {
    return api.get('/companies/meta/industries')
  },

  // Get available markets
  getMarkets: async (): Promise<string[]> => {
    return api.get('/companies/meta/markets')
  },
}