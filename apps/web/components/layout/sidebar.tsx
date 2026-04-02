'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import type { User } from 'next-auth'
import {
  LayoutDashboard,
  MessageSquare,
  BookOpen,
  BarChart3,
  Settings,
  Zap,
} from 'lucide-react'

interface SidebarProps {
  user?: User
}

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/conversations', label: 'Conversations', icon: MessageSquare },
  { href: '/dashboard/knowledge-base', label: 'Knowledge Base', icon: BookOpen },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className="w-64 flex flex-col h-full relative"
      style={{
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Subtle top gradient */}
      <div
        className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, rgba(16,185,129,0.05) 0%, transparent 100%)' }}
      />

      {/* Logo */}
      <div className="p-6 relative" style={{ borderBottom: '1px solid var(--border)' }}>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center glow-brand"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
          >
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>BizBot AI</div>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] pulse-dot" />
              <span className="text-xs text-[#10b981]">Live</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item, i) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          const Icon = item.icon

          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                href={item.href}
                className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group"
                style={{
                  color: isActive ? '#10b981' : 'var(--text-secondary)',
                  background: isActive ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-xl"
                    style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon
                  size={16}
                  className="relative z-10 transition-colors duration-200"
                  style={{ color: isActive ? '#10b981' : 'var(--text-muted)' }}
                />
                <span className="relative z-10 font-medium">{item.label}</span>
                {isActive && (
                  <motion.div
                    className="absolute right-3 w-1.5 h-1.5 rounded-full bg-[#10b981]"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                  />
                )}
              </Link>
            </motion.div>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="p-3" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2">
            {user?.image ? (
              <img src={user.image} alt="" className="w-7 h-7 rounded-full ring-2 ring-[#10b981]/20" />
            ) : (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
              >
                {user?.name?.[0] ?? '?'}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-xs font-medium truncate max-w-[100px]" style={{ color: 'var(--text-primary)' }}>
                {user?.name ?? 'User'}
              </div>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  )
}
