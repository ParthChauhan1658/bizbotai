'use client'

import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { useEffect, useRef } from 'react'

interface StatCardProps {
  label: string
  value: string | number
  subtext: string
  icon: string
  color: string
  delay?: number
  trend?: 'up' | 'down' | 'neutral'
}

function AnimatedNumber({ value }: { value: number }) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (v) => Math.round(v).toLocaleString())
  const ref = useRef(false)

  useEffect(() => {
    if (!ref.current) {
      ref.current = true
      animate(count, value, { duration: 1.5, ease: 'easeOut' })
    }
  }, [count, value])

  return <motion.span>{rounded}</motion.span>
}

export function StatCard({ label, value, subtext, icon, color, delay = 0, trend }: StatCardProps) {
  const isNumber = typeof value === 'number'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="relative rounded-2xl p-6 overflow-hidden cursor-default"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      {/* Background gradient */}
      <div
        className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${color}15 0%, transparent 70%)`, transform: 'translate(30%, -30%)' }}
      />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
              {label}
            </p>
            <div className="text-3xl font-bold" style={{ color }}>
              {isNumber ? <AnimatedNumber value={value} /> : value}
            </div>
          </div>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: `${color}15` }}
          >
            {icon}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {trend === 'up' && <span style={{ color: '#10b981' }} className="text-xs">↑</span>}
          {trend === 'down' && <span style={{ color: '#ef4444' }} className="text-xs">↓</span>}
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{subtext}</span>
        </div>
      </div>
    </motion.div>
  )
}
