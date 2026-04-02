'use client';

import { useState } from 'react';
import { Search, Bell, Zap, X, MessageSquare, AlertTriangle, ShoppingCart } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';

interface TopbarProps {
  title: string;
}

export function Topbar({ title }: TopbarProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const router = useRouter();

  // Get recent escalations as notifications
  const recentConversations = trpc.dashboard.getRecentConversations.useQuery(undefined, {
    retry: false,
  });

  const escalated = (recentConversations.data ?? []).filter(
    (c) => c.status === 'handed_off'
  );
  const notifCount = escalated.length;

  return (
    <div className="h-16 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
      <div className="flex items-center justify-between h-full px-6">
        <h1 className="text-2xl font-bold gradient-text">{title}</h1>

        <div className="flex items-center gap-4">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="w-64 pl-10 bg-background/50"
            />
          </div>

          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell className="w-5 h-5" />
              {notifCount > 0 && (
                <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 bg-emerald-500">
                  {notifCount}
                </Badge>
              )}
            </Button>

            {showNotifications && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowNotifications(false)}
                />
                <div className="absolute right-0 top-12 w-80 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                  <div className="flex items-center justify-between p-3 border-b border-border">
                    <span className="font-semibold text-sm">Notifications</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-6 h-6"
                      onClick={() => setShowNotifications(false)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifCount === 0 ? (
                      <div className="p-6 text-center text-sm text-muted-foreground">
                        No new notifications
                      </div>
                    ) : (
                      escalated.map((conv) => (
                        <button
                          key={conv.id}
                          className="w-full flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors text-left border-b border-border last:border-0"
                          onClick={() => {
                            setShowNotifications(false);
                            router.push('/dashboard/conversations');
                          }}
                        >
                          <div className="p-1.5 rounded-full bg-orange-500/10 mt-0.5">
                            <AlertTriangle className="w-4 h-4 text-orange-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {conv.customerName} needs help
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {conv.lastMessage ?? 'Conversation escalated'}
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <Button
            className="bg-gradient-to-r from-emerald-500 to-violet-500 hover:opacity-90"
            onClick={() => router.push('/dashboard/settings?tab=billing')}
          >
            <Zap className="w-4 h-4 mr-2" />
            Upgrade Plan
          </Button>
        </div>
      </div>
    </div>
  );
}
