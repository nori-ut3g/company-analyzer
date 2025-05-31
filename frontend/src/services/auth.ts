import { User, AuthTokens } from '../types'
import api from './api'
import { mockAuth } from '../mocks/mockServer'

const TOKEN_KEY = 'edinet_auth_tokens'
const USE_MOCK = true // 開発用モックを使用

interface LoginResponse {
  user: User
  tokens: AuthTokens
}

interface RegisterResponse {
  user: User
  tokens: AuthTokens
}

export const authService = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    if (USE_MOCK) {
      return mockAuth.login(email, password)
    }
    const response = await api.post<LoginResponse>('/auth/login', { email, password })
    return response
  },

  register: async (email: string, password: string, name: string): Promise<RegisterResponse> => {
    const response = await api.post<RegisterResponse>('/auth/register', { 
      email, 
      password, 
      name 
    })
    return response
  },

  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      authService.clearTokens()
    }
  },

  refreshToken: async (refreshToken: string): Promise<AuthTokens> => {
    const response = await api.post<AuthTokens>('/auth/refresh', { refreshToken })
    return response
  },

  getCurrentUser: async (): Promise<User> => {
    if (USE_MOCK) {
      return {
        id: '1',
        email: 'demo@example.com',
        name: 'デモユーザー',
        role: 'user',
        createdAt: new Date().toISOString()
      }
    }
    const response = await api.get<User>('/auth/me')
    return response
  },

  // Token management
  getTokens: (): AuthTokens | null => {
    const tokensStr = localStorage.getItem(TOKEN_KEY)
    if (!tokensStr) return null
    
    try {
      return JSON.parse(tokensStr)
    } catch {
      return null
    }
  },

  setTokens: (tokens: AuthTokens): void => {
    localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens))
  },

  clearTokens: (): void => {
    localStorage.removeItem(TOKEN_KEY)
  },

  isAuthenticated: (): boolean => {
    const tokens = authService.getTokens()
    return !!tokens?.accessToken
  },
}