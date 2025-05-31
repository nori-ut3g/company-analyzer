import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, AuthTokens } from '../types'
import { authService } from '../services/auth'
import { apiClient } from '../services/api'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  register: (email: string, password: string, name: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const tokens = authService.getTokens()
      if (tokens?.accessToken) {
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${tokens.accessToken}`
        const userData = await authService.getCurrentUser()
        setUser(userData)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      authService.clearTokens()
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const { user, tokens } = await authService.login(email, password)
      authService.setTokens(tokens)
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${tokens.accessToken}`
      setUser(user)
      navigate('/dashboard')
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  }

  const logout = () => {
    authService.logout()
    setUser(null)
    delete apiClient.defaults.headers.common['Authorization']
    navigate('/login')
  }

  const register = async (email: string, password: string, name: string) => {
    try {
      const { user, tokens } = await authService.register(email, password, name)
      authService.setTokens(tokens)
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${tokens.accessToken}`
      setUser(user)
      navigate('/dashboard')
    } catch (error) {
      console.error('Registration failed:', error)
      throw error
    }
  }

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    register,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}