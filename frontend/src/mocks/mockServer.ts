// Mock API server for development
export const mockAuth = {
  login: async (email: string, password: string) => {
    if (email === 'demo@example.com' && password === 'password123') {
      return {
        user: {
          id: '1',
          email: 'demo@example.com',
          name: 'デモユーザー',
          role: 'user' as const,
          createdAt: new Date().toISOString()
        },
        tokens: {
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token'
        }
      }
    }
    throw new Error('Invalid credentials')
  }
}

export const mockCompanies = [
  {
    id: 1,
    securitiesCode: '7203',
    companyName: 'トヨタ自動車株式会社',
    industry: '輸送用機器',
    listingMarket: '東証プライム',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 2,
    securitiesCode: '6758',
    companyName: 'ソニーグループ株式会社',
    industry: '電気機器',
    listingMarket: '東証プライム',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 3,
    securitiesCode: '9984',
    companyName: 'ソフトバンクグループ株式会社',
    industry: '情報・通信業',
    listingMarket: '東証プライム',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
]

export const mockTimeSeriesData = [
  {
    id: 1,
    companyId: 1,
    fiscalYear: 2024,
    fiscalPeriod: 'FY',
    metrics: {
      netSales: 37500000,
      operatingIncome: 2800000,
      netIncome: 2450000,
      totalAssets: 65800000,
      netAssets: 28400000,
      roe: 8.6,
      roa: 3.7,
      operatingMargin: 7.5,
      netProfitMargin: 6.5
    }
  },
  {
    id: 2,
    companyId: 1,
    fiscalYear: 2023,
    fiscalPeriod: 'FY',
    metrics: {
      netSales: 35600000,
      operatingIncome: 2650000,
      netIncome: 2300000,
      totalAssets: 63200000,
      netAssets: 27100000,
      roe: 8.5,
      roa: 3.6,
      operatingMargin: 7.4,
      netProfitMargin: 6.5
    }
  },
  {
    id: 3,
    companyId: 1,
    fiscalYear: 2022,
    fiscalPeriod: 'FY',
    metrics: {
      netSales: 31380000,
      operatingIncome: 2400000,
      netIncome: 2050000,
      totalAssets: 60500000,
      netAssets: 25800000,
      roe: 7.9,
      roa: 3.4,
      operatingMargin: 7.6,
      netProfitMargin: 6.5
    }
  }
]

export const mockAnalysisResults = [
  {
    id: 1,
    companyId: 1,
    analysisType: 'financial_metrics',
    metrics: {
      netSales: 37500000,
      operatingIncome: 2800000,
      netIncome: 2450000,
      totalAssets: 65800000,
      netAssets: 28400000,
      roe: 8.6,
      roa: 3.7,
      operatingMargin: 7.5,
      netProfitMargin: 6.5,
      debtToEquityRatio: 1.32,
      currentRatio: 1.24,
      quickRatio: 0.98
    },
    insights: [
      '売上高は前年比5.3%増加し、堅調な成長を維持',
      'ROEは8.6%で業界平均を上回る良好な水準',
      '営業利益率は7.5%で効率的な経営を実現'
    ],
    createdAt: '2024-01-15T00:00:00Z'
  }
]