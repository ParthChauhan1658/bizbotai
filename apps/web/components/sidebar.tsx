'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  MessageSquare,
  BookOpen,
  ChartBar as BarChart3,
  Settings,
  Rocket,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: MessageSquare, label: 'Conversations', href: '/dashboard/conversations' },
  { icon: BookOpen, label: 'Knowledge Base', href: '/dashboard/knowledge-base' },
  { icon: BarChart3, label: 'Analytics', href: '/dashboard/analytics' },
  { icon: Settings, label: 'Settings', href: '/dashboard/settings' },
  { icon: Rocket, label: 'Onboarding', href: '/dashboard/onboarding' },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const { data: session } = useSession()

  useEffect(() => { setMounted(true) }, [])

  const initials = session?.user?.name
    ? session.user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U'

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 240 }}
      className="fixed left-0 top-0 h-screen border-r border-border bg-card z-50"
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between h-16 px-4 border-b border-border">
          {!collapsed && (
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 pulse-glow" />
              <span className="font-bold gradient-text text-lg">BizBot AI</span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
            return (
              <Link key={item.href} href={item.href} className="relative block">
                <motion.div
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                  whileHover={{ x: 4 }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active"
                      className="absolute inset-0 bg-primary/10 rounded-lg border border-primary/20"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                  <item.icon className="w-5 h-5 relative z-10" />
                  {!collapsed && <span className="relative z-10">{item.label}</span>}
                </motion.div>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-border space-y-2">
          <Button
            variant="ghost"
            size={collapsed ? 'icon' : 'default'}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-full justify-start"
          >
            <motion.div
              initial={false}
              animate={{ rotate: mounted && theme === 'dark' ? 0 : 180 }}
              transition={{ duration: 0.3 }}
            >
              {!mounted || theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </motion.div>
            {!collapsed && <span className="ml-2">Toggle Theme</span>}
          </Button>

          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 p-2 rounded-lg bg-accent/50"
            >
              <Avatar className="w-8 h-8">
                <AvatarImage src={session?.user?.image ?? ''} />
                <AvatarFallback className="bg-gradient-to-r from-emerald-500 to-violet-500 text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{session?.user?.name ?? 'User'}</p>
                <p className="text-xs text-muted-foreground truncate">{session?.user?.email ?? ''}</p>
              </div>
              <Button variant="ghost" size="icon" className="shrink-0" onClick={() => signOut({ callbackUrl: '/login' })}>
                <LogOut className="w-4 h-4" />
              </Button>
            </motion.div>
          )}

          {collapsed && (
            <Button variant="ghost" size="icon" className="w-full" onClick={() => signOut({ callbackUrl: '/login' })}>
              <LogOut className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </motion.aside>
  )
}
