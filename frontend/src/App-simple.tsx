import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { LoadingSpinner } from './components/ui/LoadingSpinner'

// Simple test component
const TestPage = () => (
  <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
    <h1>Frontend Test Page</h1>
    <p>✅ React is working</p>
    <p>✅ Routing is working</p>
    <p>🔗 Backend connection test coming next...</p>
  </div>
)

// Lazy load pages
const CompaniesPage = lazy(() => import('./pages/CompaniesPage'))

function App() {
  return (
    <Router>
      <Suspense fallback={<LoadingSpinner fullScreen />}>
        <Routes>
          <Route path="/" element={<TestPage />} />
          <Route path="/companies" element={<CompaniesPage />} />
        </Routes>
      </Suspense>
    </Router>
  )
}

export default App