'use client'

import { motion } from 'framer-motion'

const modelStats = [
  { label: 'Claude Haiku', desc: 'Fast replies', pct: 0, color: '#10b981' },
  { label: 'Claude Sonnet', desc: 'Complex queries', pct: 0, color: '#8b5cf6' },
  { label: 'Escalated', desc: 'Human handoff', pct: 0, color: '#f59e0b' },
]

export function RecentActivity() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className="rounded-2xl p-6 h-full"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div className="mb-6">
        <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>AI Performance</h3>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Model routing breakdown</p>
      </div>

      <div className="space-y-5">
        {modelStats.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 + i * 0.1 }}
          >
            <div className="flex justify-between items-center mb-1.5">
              <div>
                <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{item.label}</span>
                <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>{item.desc}</span>
              </div>
              <span className="text-xs font-medium" style={{ color: item.color }}>{item.pct}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: item.color }}
                initial={{ width: 0 }}
                animate={{ width: `${item.pct}%` }}
                transition={{ duration: 1, delay: 0.8 + i * 0.1, ease: 'easeOut' }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick stats */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        {[
          { label: 'KB Articles', value: '15', color: '#10b981' },
          { label: 'Avg Tokens', value: '—', color: '#8b5cf6' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: 'var(--surface-2)' }}>
            <div className="text-lg font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
