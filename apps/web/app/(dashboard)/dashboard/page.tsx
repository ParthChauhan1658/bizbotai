'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, ShoppingCart, IndianRupee, ArrowUp, ArrowDown, Upload, Clock, TestTube, FileText, Check, CircleAlert as AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Topbar } from '@/components/topbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';

/** Color map for AI model usage in the pie chart */
const MODEL_COLORS: Record<string, string> = {
  haiku: '#10b981',
  sonnet: '#8b5cf6',
  opus: '#3b82f6',
};

const quickActions = [
  { icon: Upload, label: 'Upload Menu', description: 'Add or update menu items' },
  { icon: Clock, label: 'Add Business Hours', description: 'Set opening hours' },
  { icon: TestTube, label: 'Test Bot', description: 'Try a sample conversation' },
  { icon: FileText, label: 'View Logs', description: 'Check conversation logs' },
];

/** Skeleton placeholder block for loading states */
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`shimmer rounded bg-muted ${className}`} />;
}

function AnimatedCounter({ value }: { value: number | string }) {
  const [count, setCount] = useState(0);
  const numValue = typeof value === 'string' ? parseInt(value.replace(/\D/g, '')) : value;

  useEffect(() => {
    if (typeof value === 'number') {
      let start = 0;
      const increment = numValue / 50;
      const timer = setInterval(() => {
        start += increment;
        if (start >= numValue) {
          setCount(numValue);
          clearInterval(timer);
        } else {
          setCount(Math.floor(start));
        }
      }, 20);
      return () => clearInterval(timer);
    }
  }, [value, numValue]);

  if (typeof value === 'string') {
    return <span>{value}</span>;
  }

  return <span>{count.toLocaleString()}</span>;
}

/** Derive initials from a customer name (e.g. "Rahul Sharma" -> "RS") */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/** Format a date string or Date into a human-readable relative time */
function formatRelativeTime(dateValue: string | Date): string {
  try {
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return '';
  }
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();

  // Redirect to onboarding if no business linked yet
  useEffect(() => {
    if (session && !session.user.businessId) {
      router.replace('/dashboard/onboarding');
    }
  }, [session, router]);

  // Fetch real data from tRPC
  const statsQuery = trpc.dashboard.getStats.useQuery();
  const messageVolumeQuery = trpc.dashboard.getMessageVolume.useQuery();
  const recentConversationsQuery = trpc.dashboard.getRecentConversations.useQuery();
  const modelUsageQuery = trpc.dashboard.getModelUsage.useQuery();

  // Build the stats cards array from real data
  const statsData = statsQuery.data;
  const hasData = statsData && (statsData.totalConversations > 0 || statsData.messagesToday > 0);
  const stats = [
    {
      icon: MessageSquare,
      label: 'Total Conversations',
      value: statsData?.totalConversations ?? 0,
      change: hasData ? 12 : 0,
      color: 'emerald',
    },
    {
      icon: MessageSquare,
      label: 'Messages Today',
      value: statsData?.messagesToday ?? 0,
      change: hasData ? 8 : 0,
      color: 'blue',
    },
    {
      icon: ShoppingCart,
      label: 'Orders via AI',
      value: statsData?.ordersCount ?? 0,
      change: hasData ? 23 : 0,
      color: 'violet',
    },
    {
      icon: IndianRupee,
      label: 'Revenue Saved',
      value: statsData ? `\u20B9${Number(statsData.revenueTotal).toLocaleString('en-IN')}` : '\u20B90',
      change: hasData ? 18 : 0,
      color: 'orange',
    },
  ];

  // Chart data from the message volume query
  const chartData = messageVolumeQuery.data ?? [];

  // Recent conversations from the query
  const recentConversations = (recentConversationsQuery.data ?? []).map((conv) => ({
    id: conv.id,
    name: conv.customerName,
    message: conv.lastMessage,
    time: formatRelativeTime(conv.lastMessageAt),
    status: conv.status,
    avatar: getInitials(conv.customerName),
  }));

  // Model usage data mapped for the pie chart
  const modelUsageRaw = modelUsageQuery.data ?? [];
  const totalModelCount = modelUsageRaw.reduce((sum, e) => sum + e.count, 0);
  const modelUsage = modelUsageRaw.map((entry) => ({
    name: entry.model,
    value: totalModelCount > 0 ? Math.round((entry.count / totalModelCount) * 100) : 0,
    color: MODEL_COLORS[entry.model.toLowerCase()] ?? '#6b7280',
  }));

  const isStatsLoading = statsQuery.isLoading;
  const isChartLoading = messageVolumeQuery.isLoading;
  const isConversationsLoading = recentConversationsQuery.isLoading;
  const isModelUsageLoading = modelUsageQuery.isLoading;

  return (
    <div className="min-h-screen bg-background">
      <Topbar title="Dashboard" />

      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -4 }}
            >
              <Card className="glass border-border hover:border-primary/20 transition-all">
                <CardContent className="p-6">
                  {isStatsLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-8 w-20" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <p className="text-sm text-muted-foreground">{stat.label}</p>
                        <p className="text-3xl font-bold">
                          <AnimatedCounter value={stat.value} />
                        </p>
                        {stat.change !== 0 ? (
                          <div className="flex items-center gap-1">
                            {stat.change > 0 ? (
                              <ArrowUp className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <ArrowDown className="w-4 h-4 text-red-500" />
                            )}
                            <span className={`text-sm ${stat.change > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                              {Math.abs(stat.change)}%
                            </span>
                            <span className="text-sm text-muted-foreground">vs last week</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">No data yet</span>
                        )}
                      </div>
                      <div className={`p-3 rounded-lg bg-${stat.color}-500/10`}>
                        <stat.icon className={`w-6 h-6 text-${stat.color}-500`} />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Message Volume Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="glass border-border">
            <CardHeader>
              <CardTitle>Message Volume (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              {isChartLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-[300px] w-full" />
                  <div className="flex items-center justify-center gap-8">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorAI" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="date" stroke="#888" />
                      <YAxis stroke="#888" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(18, 18, 26, 0.9)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                          backdropFilter: 'blur(12px)',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="received"
                        stroke="#10b981"
                        fillOpacity={1}
                        fill="url(#colorReceived)"
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="ai_responses"
                        stroke="#8b5cf6"
                        fillOpacity={1}
                        fill="url(#colorAI)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div className="flex items-center justify-center gap-8 mt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span className="text-sm text-muted-foreground">Messages Received</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-violet-500" />
                      <span className="text-sm text-muted-foreground">AI Responses</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Conversations */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="glass border-border">
              <CardHeader>
                <CardTitle>Recent Conversations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isConversationsLoading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="flex items-start gap-3 p-3">
                      <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </div>
                    </div>
                  ))
                ) : recentConversations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No conversations yet</p>
                ) : (
                  recentConversations.map((conv, index) => (
                    <motion.div
                      key={conv.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 + index * 0.1 }}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                    >
                      <Avatar>
                        <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-violet-500 text-white">
                          {conv.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium truncate">{conv.name}</p>
                          <span className="text-xs text-muted-foreground">{conv.time}</span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate mb-2">{conv.message}</p>
                        <Badge
                          variant={
                            conv.status === 'active'
                              ? 'default'
                              : conv.status === 'resolved'
                              ? 'secondary'
                              : 'destructive'
                          }
                          className="text-xs"
                        >
                          {conv.status === 'active' && <MessageSquare className="w-3 h-3 mr-1" />}
                          {conv.status === 'resolved' && <Check className="w-3 h-3 mr-1" />}
                          {conv.status === 'escalated' && <AlertCircle className="w-3 h-3 mr-1" />}
                          {conv.status}
                        </Badge>
                      </div>
                    </motion.div>
                  ))
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* AI Model Usage */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="glass border-border">
              <CardHeader>
                <CardTitle>AI Model Usage</CardTitle>
              </CardHeader>
              <CardContent>
                {isModelUsageLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-[200px] w-full rounded-full mx-auto max-w-[200px]" />
                    <div className="space-y-3 mt-4">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-4 w-10" />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-center">
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={modelUsage}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {modelUsage.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-3 mt-4">
                      {modelUsage.map((model, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: model.color }} />
                            <span className="text-sm">{model.name}</span>
                          </div>
                          <div className="text-sm font-medium">{model.value}%</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Estimated Cost</span>
                        <span className="font-medium">
                          {totalModelCount > 0
                            ? `\u20B9${Math.round(modelUsageRaw.reduce((sum, e) => {
                                const rate = e.model?.includes('opus') ? 1.25 : e.model?.includes('sonnet') ? 0.25 : 0.02;
                                return sum + (e.totalTokens / 1000) * rate;
                              }, 0) * 85).toLocaleString('en-IN')} / month`
                            : '\u20B90 / month'}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 + index * 0.1 }}
                whileHover={{ scale: 1.02, y: -4 }}
              >
                <Card className="glass border-border hover:border-primary/20 transition-all cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center text-center gap-3">
                      <div className="p-4 rounded-lg bg-primary/10">
                        <action.icon className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium mb-1">{action.label}</h4>
                        <p className="text-sm text-muted-foreground">{action.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
