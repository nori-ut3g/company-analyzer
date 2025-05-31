import axios, { AxiosInstance } from 'axios'

const DATA_INGESTION_BASE_URL = '/api' // Use proxy instead of direct URL

// Create axios instance for data ingestion service
export const dataIngestionClient: AxiosInstance = axios.create({
  baseURL: DATA_INGESTION_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // Don't send cookies for CORS
})

// Add error logging
dataIngestionClient.interceptors.response.use(
  (response) => {
    console.log('API Success:', response.config.url, response.status)
    return response
  },
  (error) => {
    console.error('API Error:', error.config?.url, error.message)
    if (error.response) {
      console.error('Response status:', error.response.status)
      console.error('Response data:', error.response.data)
    }
    return Promise.reject(error)
  }
)

// Generic API functions for data ingestion
export const dataIngestionApi = {
  get: <T>(url: string, params?: any) => 
    dataIngestionClient.get<T>(url, { params }).then(res => res.data),
  
  post: <T>(url: string, data?: any) => 
    dataIngestionClient.post<T>(url, data).then(res => res.data),
  
  put: <T>(url: string, data?: any) => 
    dataIngestionClient.put<T>(url, data).then(res => res.data),
  
  delete: <T>(url: string) => 
    dataIngestionClient.delete<T>(url).then(res => res.data),
  
  patch: <T>(url: string, data?: any) => 
    dataIngestionClient.patch<T>(url, data).then(res => res.data),
}

export default dataIngestionApi