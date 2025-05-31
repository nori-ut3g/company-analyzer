import { Company, PaginatedResponse, CompanyFilters, FinancialStatement } from '../types'
import api from './api'
import { mockCompanies } from '../mocks/mockServer'

const USE_MOCK = false // 実際のEDINETデータを使用

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
    // Use API gateway
    const params = {
      page,
      limit,
      search: filters?.search,
      industry: filters?.industry,
      market: filters?.market
    }
    const response = await api.get<{
      companies: any[], 
      pagination: {
        page: number,
        limit: number,
        total: number,
        totalPages: number
      }
    }>('/companies', params)
    
    // Transform the data to match Company interface
    const transformedCompanies: Company[] = response.companies.map((company: any) => ({
      id: company.company_id,
      companyName: company.company_name || `Company ${company.company_id}`,
      securitiesCode: company.securities_code || '',
      industry: company.industry_name || 'Unknown',
      listingMarket: company.listing_market || '',
      edinetCode: company.edinet_code || '',
      latestFiscalYear: new Date().getFullYear(),
      financialRecordsCount: 0
    }))
    
    return {
      data: transformedCompanies,
      pagination: response.pagination
    }
  },

  // Get single company by ID
  getCompany: async (companyId: number): Promise<Company> => {
    if (USE_MOCK) {
      const company = mockCompanies.find(c => c.id === companyId)
      if (!company) throw new Error('Company not found')
      return company
    }
    // Use API gateway to get company details
    const response = await api.get<{
      companies: any[]
    }>(`/companies?page=1&limit=1&search=${companyId}`)
    
    const company = response.companies.find((c: any) => c.company_id === companyId)
    if (!company) throw new Error('Company not found')
    
    return {
      id: company.company_id,
      companyName: company.company_name || `Company ${company.company_id}`,
      securitiesCode: company.securities_code || '',
      industry: company.industry_name || 'Unknown',
      listingMarket: company.listing_market || '',
      edinetCode: company.edinet_code || '',
      latestFiscalYear: new Date().getFullYear(),
      financialRecordsCount: 0
    }
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
    // Use API gateway
    const queryParams = {
      fiscalYear: params?.startDate ? new Date(params.startDate).getFullYear() : undefined,
      fiscalPeriod: params?.periodType === 'annual' ? 'FY' : undefined
    }
    
    const response = await api.get<any[]>(
      `/companies/${companyId}/financial-data`,
      queryParams
    )
    
    // Transform the data to match FinancialStatement interface
    return response.map((item: any) => ({
      id: item.id,
      companyId: item.company_id,
      fiscalYear: item.fiscal_year,
      fiscalPeriod: item.fiscal_period,
      reportType: 'Annual Report',
      netSales: item.net_sales,
      operatingIncome: item.operating_income,
      ordinaryIncome: item.ordinary_income,
      netIncome: item.net_income,
      totalAssets: item.total_assets,
      netAssets: item.net_assets,
      capitalStock: item.equity_capital,
      createdAt: item.created_at
    }))
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