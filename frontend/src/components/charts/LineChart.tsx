import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

interface LineChartProps {
  data: any[]
  lines: {
    dataKey: string
    name: string
    color: string
  }[]
  xDataKey: string
  height?: number
  showGrid?: boolean
  formatYAxis?: (value: any) => string
  formatTooltip?: (value: any) => string
}

export function LineChart({
  data,
  lines,
  xDataKey,
  height = 300,
  showGrid = true,
  formatYAxis,
  formatTooltip
}: LineChartProps) {
  const defaultFormatYAxis = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(0)}M`
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`
    }
    return value.toString()
  }

  const defaultFormatTooltip = (value: number) => {
    return value.toLocaleString('ja-JP')
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />}
        <XAxis 
          dataKey={xDataKey}
          tick={{ fontSize: 12 }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12 }}
          tickLine={false}
          tickFormatter={formatYAxis || defaultFormatYAxis}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #e5e7eb',
            borderRadius: '0.375rem'
          }}
          labelStyle={{ color: '#111827', fontWeight: 600 }}
          formatter={formatTooltip || defaultFormatTooltip}
        />
        <Legend
          verticalAlign="top"
          height={36}
          iconType="line"
        />
        {lines.map((line) => (
          <Line
            key={line.dataKey}
            type="monotone"
            dataKey={line.dataKey}
            name={line.name}
            stroke={line.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6 }}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  )
}