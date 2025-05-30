import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '../../utils/cn'

interface MetricCardProps {
  title: string
  value: string | number
  unit?: string
  trend?: {
    value: number
    isPositive: boolean
  }
  description?: string
  className?: string
}

export function MetricCard({
  title,
  value,
  unit,
  trend,
  description,
  className
}: MetricCardProps) {
  const getTrendIcon = () => {
    if (!trend) return null
    
    if (trend.value === 0) {
      return <Minus className="h-4 w-4" />
    }
    
    return trend.isPositive ? (
      <TrendingUp className="h-4 w-4" />
    ) : (
      <TrendingDown className="h-4 w-4" />
    )
  }

  const getTrendColor = () => {
    if (!trend || trend.value === 0) return 'text-gray-500'
    return trend.isPositive ? 'text-green-600' : 'text-red-600'
  }

  return (
    <div className={cn("bg-white rounded-lg shadow p-6", className)}>
      <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
      <dd className="mt-2">
        <div className="flex items-baseline">
          <p className="text-2xl font-semibold text-gray-900">
            {value}
            {unit && <span className="ml-1 text-lg font-normal text-gray-500">{unit}</span>}
          </p>
          {trend && (
            <p className={cn("ml-2 flex items-baseline text-sm font-semibold", getTrendColor())}>
              {getTrendIcon()}
              <span className="ml-0.5">
                {Math.abs(trend.value)}%
              </span>
            </p>
          )}
        </div>
        {description && (
          <p className="mt-1 text-xs text-gray-500">{description}</p>
        )}
      </dd>
    </div>
  )
}