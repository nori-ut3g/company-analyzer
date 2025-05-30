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