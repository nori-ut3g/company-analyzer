import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios'
import { authService } from './auth'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const tokens = authService.getTokens()
    if (tokens?.accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${tokens.accessToken}`
    }
    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const tokens = authService.getTokens()
        if (tokens?.refreshToken) {
          const newTokens = await authService.refreshToken(tokens.refreshToken)
          authService.setTokens(newTokens)
          
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`
          }
          
          return apiClient(originalRequest)
        }
      } catch (refreshError) {
        authService.logout()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

// Generic API functions
export const api = {
  get: <T>(url: string, params?: any) => 
    apiClient.get<T>(url, { params }).then(res => res.data),
  
  post: <T>(url: string, data?: any) => 
    apiClient.post<T>(url, data).then(res => res.data),
  
  put: <T>(url: string, data?: any) => 
    apiClient.put<T>(url, data).then(res => res.data),
  
  delete: <T>(url: string) => 
    apiClient.delete<T>(url).then(res => res.data),
  
  patch: <T>(url: string, data?: any) => 
    apiClient.patch<T>(url, data).then(res => res.data),
}

export default api