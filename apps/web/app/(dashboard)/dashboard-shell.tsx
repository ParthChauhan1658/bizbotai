'use client'

import { SessionProvider } from 'next-auth/react'
import { Sidebar } from '@/components/sidebar'
import { TRPCProvider } from '@/components/providers/trpc-provider'
import { motion } from 'framer-motion'

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <TRPCProvider>
        <div className="min-h-screen dot-grid">
          <Sidebar />
          <motion.main
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="ml-[240px] min-h-screen"
          >
            {children}
          </motion.main>
        </div>
      </TRPCProvider>
    </SessionProvider>
  )
}
