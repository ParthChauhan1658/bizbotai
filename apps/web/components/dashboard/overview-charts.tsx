'use client'

import { motion } from 'framer-motion'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useTheme } from 'next-themes'

const emptyData = [
  { day: 'Mon', messages: 0, responses: 0 },
  { day: 'Tue', messages: 0, responses: 0 },
  { day: 'Wed', messages: 0, responses: 0 },
  { day: 'Thu', messages: 0, responses: 0 },
  { day: 'Fri', messages: 0, responses: 0 },
  { day: 'Sat', messages: 0, responses: 0 },
  { day: 'Sun', messages: 0, responses: 0 },
]

export function OverviewCharts() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const gridColor = isDark ? '#1e293b' : '#f1f5f9'
  const textColor = isDark ? '#475569' : '#94a3b8'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="rounded-2xl p-6 h-full"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Message Volume</h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Last 7 days</p>
        </div>
        <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#10b981]" />
            Received
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#8b5cf6]" />
            Sent
          </div>
        </div>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={emptyData}>
            <defs>
              <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorResponses" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: textColor }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: textColor }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: isDark ? '#0f172a' : '#ffffff',
                border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
                borderRadius: '12px',
                color: isDark ? '#f1f5f9' : '#0f172a',
                fontSize: '12px',
              }}
            />
            <Area type="monotone" dataKey="messages" stroke="#10b981" strokeWidth={2} fill="url(#colorMessages)" />
            <Area type="monotone" dataKey="responses" stroke="#8b5cf6" strokeWidth={2} fill="url(#colorResponses)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 p-3 rounded-xl text-center" style={{ background: 'var(--surface-2)' }}>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Send a WhatsApp message to your bot — data will appear here live
        </p>
      </div>
    </motion.div>
  )
}
