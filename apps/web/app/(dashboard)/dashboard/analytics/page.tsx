'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MessageSquare, CircleCheck as CheckCircle2, Clock, Star } from 'lucide-react';
import { Topbar } from '@/components/topbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { trpc } from '@/lib/trpc';
import { formatDistanceToNow, format } from 'date-fns';

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`shimmer rounded bg-muted ${className}`} />;
}

const heatmapData = Array.from({ length: 7 }, (_, day) =>
  Array.from({ length: 24 }, (_, hour) => ({
    day,
    hour,
    value: Math.floor(Math.random() * 100),
  }))
).flat();

const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState('7');

  const kpisQuery = trpc.analytics.getKPIs.useQuery();
  const volumeQuery = trpc.analytics.getMessageVolume.useQuery({
    days: Number(dateRange) as 7 | 30 | 90,
  });
  const questionsQuery = trpc.analytics.getTopQuestions.useQuery();
  const outcomesQuery = trpc.analytics.getOutcomes.useQuery();
  const customersQuery = trpc.analytics.getTopCustomers.useQuery();

  const kpis = kpisQuery.data
    ? [
        {
          icon: MessageSquare,
          label: 'Total Messages',
          value: (kpisQuery.data.totalMessages ?? 0).toLocaleString(),
          change: 0,
        },
        {
          icon: CheckCircle2,
          label: 'AI Resolution Rate',
          value: `${kpisQuery.data.aiResolutionRate ?? 0}%`,
          change: 0,
        },
        {
          icon: Clock,
          label: 'Avg Response Time',
          value: `${((kpisQuery.data.avgResponseTimeMs ?? 0) / 1000).toFixed(1)}s`,
          change: 0,
        },
        {
          icon: Star,
          label: 'Customer Satisfaction',
          value: `${kpisQuery.data.customerSatisfaction ?? 0}/5`,
          change: 0,
        },
      ]
    : null;

  const volumeData = volumeQuery.data?.map((d) => ({
    date: format(new Date(d.date), 'MMM d'),
    received: d.received ?? 0,
    ai_replied: d.sent ?? 0,
    escalated: Math.max(0, (d.received ?? 0) - (d.sent ?? 0)),
  })) ?? null;

  const topQuestionsTotal = questionsQuery.data?.reduce((sum, q) => sum + (q.count ?? 0), 0) ?? 1;
  const topQuestions = questionsQuery.data?.map((q) => ({
    question: q.question ?? 'Unknown',
    count: q.count ?? 0,
    percentage: Math.round(((q.count ?? 0) / topQuestionsTotal) * 100),
  })) ?? null;

  const outcomesData = outcomesQuery.data;
  const outcomes = outcomesData
    ? (() => {
        const total = outcomesData.total || 1;
        return [
          {
            name: 'Resolved by AI',
            value: Math.round(((outcomesData.resolvedByAi ?? 0) / total) * 100),
            color: '#10b981',
          },
          {
            name: 'Escalated',
            value: Math.round(((outcomesData.escalated ?? 0) / total) * 100),
            color: '#f59e0b',
          },
          {
            name: 'Abandoned',
            value: Math.round(((outcomesData.abandoned ?? 0) / total) * 100),
            color: '#ef4444',
          },
        ];
      })()
    : null;

  const topCustomers = customersQuery.data?.map((c) => ({
    name: c.name ?? 'Unknown',
    phone: c.phone ?? '',
    messages: c.totalMessages ?? 0,
    orders: c.totalOrders ?? 0,
    lastActive: c.lastMessageAt
      ? formatDistanceToNow(new Date(c.lastMessageAt), { addSuffix: true })
      : 'N/A',
  })) ?? null;

  return (
    <div className="min-h-screen bg-background">
      <Topbar title="Analytics" />

      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold gradient-text">Performance Insights</h2>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis
            ? kpis.map((kpi, index) => (
                <motion.div
                  key={kpi.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="glass border-border">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <p className="text-sm text-muted-foreground">{kpi.label}</p>
                          <p className="text-3xl font-bold">{kpi.value}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-primary/10">
                          <kpi.icon className="w-6 h-6 text-primary" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            : Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="glass border-border">
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-8 w-32" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="glass border-border">
            <CardHeader>
              <CardTitle>Message Volume Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              {volumeData ? (
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={volumeData}>
                    <defs>
                      <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorAI" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorEscalated" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
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
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="received"
                      stroke="#10b981"
                      fillOpacity={1}
                      fill="url(#colorReceived)"
                      strokeWidth={2}
                      name="Received"
                    />
                    <Area
                      type="monotone"
                      dataKey="ai_replied"
                      stroke="#8b5cf6"
                      fillOpacity={1}
                      fill="url(#colorAI)"
                      strokeWidth={2}
                      name="AI Replied"
                    />
                    <Area
                      type="monotone"
                      dataKey="escalated"
                      stroke="#f59e0b"
                      fillOpacity={1}
                      fill="url(#colorEscalated)"
                      strokeWidth={2}
                      name="Escalated"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="space-y-4" style={{ height: 350 }}>
                  <Skeleton className="h-full w-full" />
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="glass border-border">
              <CardHeader>
                <CardTitle>Top Customer Questions</CardTitle>
              </CardHeader>
              <CardContent>
                {topQuestions ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topQuestions} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis type="number" stroke="#888" />
                      <YAxis dataKey="question" type="category" stroke="#888" width={120} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(18, 18, 26, 0.9)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="count" fill="#10b981" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="space-y-4" style={{ height: 300 }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-6 w-24" />
                        <Skeleton className="h-6 flex-1" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="glass border-border">
              <CardHeader>
                <CardTitle>Conversation Outcomes</CardTitle>
              </CardHeader>
              <CardContent>
                {outcomes ? (
                  <>
                    <div className="flex items-center justify-center">
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={outcomes}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ value }) => `${value}%`}
                          >
                            {outcomes.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-3 mt-4">
                      {outcomes.map((outcome, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: outcome.color }} />
                            <span className="text-sm">{outcome.name}</span>
                          </div>
                          <div className="text-sm font-medium">{outcome.value}%</div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-4" style={{ height: 300 }}>
                    <Skeleton className="h-48 w-48 rounded-full" />
                    <div className="w-full space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="glass border-border">
            <CardHeader>
              <CardTitle>Peak Hours Heatmap</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="inline-block min-w-full">
                  <div className="flex gap-1 mb-2">
                    <div className="w-12" />
                    {Array.from({ length: 24 }, (_, i) => (
                      <div key={i} className="w-8 text-xs text-center text-muted-foreground">
                        {i}
                      </div>
                    ))}
                  </div>
                  {days.map((day, dayIndex) => (
                    <div key={day} className="flex gap-1 mb-1">
                      <div className="w-12 text-xs flex items-center text-muted-foreground">
                        {day}
                      </div>
                      {Array.from({ length: 24 }, (_, hourIndex) => {
                        const dataPoint = heatmapData.find(
                          (d) => d.day === dayIndex && d.hour === hourIndex
                        );
                        const intensity = dataPoint ? dataPoint.value / 100 : 0;
                        return (
                          <div
                            key={hourIndex}
                            className="w-8 h-8 rounded"
                            style={{
                              backgroundColor: `rgba(16, 185, 129, ${intensity})`,
                              border: '1px solid rgba(255,255,255,0.1)',
                            }}
                            title={`${day} ${hourIndex}:00 - ${dataPoint?.value || 0} messages`}
                          />
                        );
                      })}
                    </div>
                  ))}
                  <div className="flex items-center gap-4 mt-4">
                    <span className="text-xs text-muted-foreground">Less</span>
                    <div className="flex gap-1">
                      {[0, 0.25, 0.5, 0.75, 1].map((intensity, i) => (
                        <div
                          key={i}
                          className="w-6 h-6 rounded"
                          style={{
                            backgroundColor: `rgba(16, 185, 129, ${intensity})`,
                            border: '1px solid rgba(255,255,255,0.1)',
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">More</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="glass border-border">
            <CardHeader>
              <CardTitle>Top Customers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Name</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Phone</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Messages</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Orders</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Last Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCustomers
                      ? topCustomers.map((customer, index) => (
                          <motion.tr
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.8 + index * 0.05 }}
                            className="border-b border-border hover:bg-accent/50 transition-colors"
                          >
                            <td className="py-3 px-4 font-medium">{customer.name}</td>
                            <td className="py-3 px-4 text-sm text-muted-foreground">{customer.phone}</td>
                            <td className="py-3 px-4 text-right">{customer.messages}</td>
                            <td className="py-3 px-4 text-right">{customer.orders}</td>
                            <td className="py-3 px-4 text-sm text-muted-foreground">{customer.lastActive}</td>
                          </motion.tr>
                        ))
                      : Array.from({ length: 4 }).map((_, i) => (
                          <tr key={i} className="border-b border-border">
                            <td className="py-3 px-4"><Skeleton className="h-5 w-28" /></td>
                            <td className="py-3 px-4"><Skeleton className="h-5 w-32" /></td>
                            <td className="py-3 px-4"><Skeleton className="h-5 w-12 ml-auto" /></td>
                            <td className="py-3 px-4"><Skeleton className="h-5 w-12 ml-auto" /></td>
                            <td className="py-3 px-4"><Skeleton className="h-5 w-24" /></td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
