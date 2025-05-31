import { useState, useEffect } from 'react'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setLoading(true)
        
        // Direct API call to test connection
        const response = await fetch('http://localhost:3005/api/ingestion/companies?page=1&limit=10')
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        
        if (data.success) {
          setCompanies(data.data.companies)
        } else {
          throw new Error('API returned success: false')
        }
      } catch (err) {
        console.error('Error fetching companies:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchCompanies()
  }, [])

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <LoadingSpinner />
        <p>Loading companies from backend...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h2>❌ Backend Connection Error</h2>
        <p>Error: {error}</p>
        <p>Make sure the data-ingestion service is running on port 3005</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>✅ Companies from Backend API</h1>
      <p>Successfully connected to data-ingestion service!</p>
      <p>Total companies found: {companies.length}</p>
      
      <div style={{ marginTop: '20px' }}>
        <h2>Sample Companies:</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {companies.slice(0, 5).map((company, index) => (
            <li 
              key={company.id} 
              style={{ 
                padding: '10px', 
                border: '1px solid #ccc', 
                margin: '5px 0',
                borderRadius: '4px',
                backgroundColor: '#f9f9f9'
              }}
            >
              <strong>#{index + 1}</strong> {company.company_name}
              {company.securities_code && (
                <span style={{ color: '#666' }}> (Code: {company.securities_code})</span>
              )}
              <br />
              <small style={{ color: '#888' }}>
                ID: {company.id} | Records: {company.financial_records_count} | 
                Latest Year: {company.latest_year}
              </small>
            </li>
          ))}
        </ul>
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <a href="/" style={{ color: '#0066cc' }}>← Back to Test Page</a>
      </div>
    </div>
  )
}