import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Building2, Filter, Download, ChevronRight } from 'lucide-react'
import { companiesService } from '../services/companies'
import { SearchInput } from '../components/ui/SearchInput'
import { Pagination } from '../components/ui/Pagination'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { cn } from '../utils/cn'

export default function CompaniesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [selectedIndustry, setSelectedIndustry] = useState('')
  const [selectedMarket, setSelectedMarket] = useState('')
  const limit = 20

  // Fetch companies
  const { data: companiesData, isLoading } = useQuery({
    queryKey: ['companies', page, search, selectedIndustry, selectedMarket],
    queryFn: () => companiesService.getCompanies(page, limit, {
      search,
      industry: selectedIndustry,
      market: selectedMarket,
    }),
    keepPreviousData: true,
  })

  // Fetch filter options
  const { data: industries } = useQuery({
    queryKey: ['industries'],
    queryFn: companiesService.getIndustries,
  })

  const { data: markets } = useQuery({
    queryKey: ['markets'],
    queryFn: companiesService.getMarkets,
  })

  const handleSearch = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const handleIndustryChange = (value: string) => {
    setSelectedIndustry(value)
    setPage(1)
  }

  const handleMarketChange = (value: string) => {
    setSelectedMarket(value)
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">企業一覧</h1>
          <p className="mt-1 text-sm text-gray-500">
            EDINETに登録されている企業を検索・閲覧できます
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Download className="h-4 w-4 mr-2" />
            エクスポート
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex items-center mb-4">
          <Filter className="h-5 w-5 text-gray-400 mr-2" />
          <h3 className="text-sm font-medium text-gray-900">フィルター</h3>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SearchInput
            value={search}
            onChange={handleSearch}
            placeholder="企業名・証券コードで検索"
          />
          
          <select
            value={selectedIndustry}
            onChange={(e) => handleIndustryChange(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="">すべての業種</option>
            {industries?.map((industry) => (
              <option key={industry.industryCode} value={industry.industryCode}>
                {industry.industryName}
              </option>
            ))}
          </select>

          <select
            value={selectedMarket}
            onChange={(e) => handleMarketChange(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="">すべての市場</option>
            {markets?.map((market) => (
              <option key={market} value={market}>
                {market}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              setSearch('')
              setSelectedIndustry('')
              setSelectedMarket('')
              setPage(1)
            }}
            className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            クリア
          </button>
        </div>
      </div>

      {/* Companies List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : companiesData?.data.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">企業が見つかりません</h3>
            <p className="mt-1 text-sm text-gray-500">
              検索条件を変更してお試しください
            </p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-gray-200">
              {companiesData?.data.map((company) => (
                <li key={company.id}>
                  <Link
                    to={`/companies/${company.id}`}
                    className="block hover:bg-gray-50 px-4 py-4 sm:px-6"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Building2 className="h-6 w-6 text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {company.companyName}
                          </div>
                          <div className="text-sm text-gray-500">
                            証券コード: {company.securitiesCode}
                            {company.industry && ` | ${company.industry}`}
                            {company.listingMarket && ` | ${company.listingMarket}`}
                          </div>
                        </div>
                      </div>
                      <div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            
            {companiesData && companiesData.pagination.totalPages > 1 && (
              <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                <Pagination
                  currentPage={page}
                  totalPages={companiesData.pagination.totalPages}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}