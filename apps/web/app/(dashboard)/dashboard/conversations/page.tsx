'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Phone, MoveVertical as MoreVertical, Send, ChevronRight, ChevronLeft, User, Bot, ShoppingBag } from 'lucide-react';
import { Topbar } from '@/components/topbar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/lib/trpc';
import { formatDistanceToNow, format } from 'date-fns';

type FilterValue = 'all' | 'active' | 'escalated' | 'resolved';

type ConversationItem = {
  id: string;
  status: string;
  messageCount: number;
  lastMessageAt: string;
  startedAt: string;
  sentiment: string | null;
  resolvedByAi: boolean | null;
  customerRating: number | null;
  customer: {
    id: string;
    name: string;
    phone: string | null;
    waId: string;
  };
};

function getStatusParam(filter: FilterValue): 'active' | 'closed' | 'handed_off' | undefined {
  switch (filter) {
    case 'active':
      return 'active';
    case 'resolved':
      return 'closed';
    case 'escalated':
      return 'handed_off';
    default:
      return undefined;
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function Shimmer({ className = '' }: { className?: string }) {
  return <div className={`shimmer rounded bg-muted ${className}`} />;
}

function ConversationListSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="p-4 border-b border-border">
          <div className="flex items-start gap-3">
            <Shimmer className="w-10 h-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex justify-between">
                <Shimmer className="h-4 w-28" />
                <Shimmer className="h-3 w-12" />
              </div>
              <Shimmer className="h-3 w-full" />
              <Shimmer className="h-5 w-14" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

function MessagesSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
          <div className="max-w-[70%] space-y-2">
            <Shimmer className={`h-16 ${i % 2 === 0 ? 'w-64' : 'w-48'} rounded-2xl`} />
          </div>
        </div>
      ))}
    </div>
  );
}

function CustomerDetailsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center text-center space-y-3">
        <Shimmer className="w-16 h-16 rounded-full" />
        <Shimmer className="h-4 w-32" />
        <Shimmer className="h-3 w-28" />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between">
          <Shimmer className="h-3 w-24" />
          <Shimmer className="h-3 w-12" />
        </div>
        <div className="flex justify-between">
          <Shimmer className="h-3 w-24" />
          <Shimmer className="h-3 w-12" />
        </div>
        <div className="flex justify-between">
          <Shimmer className="h-3 w-24" />
          <Shimmer className="h-3 w-12" />
        </div>
      </div>
    </div>
  );
}

export default function ConversationsPage() {
  const [selectedConv, setSelectedConv] = useState<ConversationItem | null>(null);
  const [filter, setFilter] = useState<FilterValue>('all');
  const [showDetails, setShowDetails] = useState(true);
  const [message, setMessage] = useState('');
  const [typing, setTyping] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const statusParam = getStatusParam(filter);

  const {
    data: conversationsData,
    isLoading: isConversationsLoading,
  } = trpc.conversations.list.useQuery({
    status: statusParam,
    search: debouncedSearch || undefined,
  });

  const conversations = conversationsData?.items ?? [];

  // Auto-select first conversation when data loads or filter/search changes
  useEffect(() => {
    if (conversations.length > 0) {
      // If no selection, or current selection is not in list, select first
      const currentStillExists = selectedConv && conversations.some((c) => c.id === selectedConv.id);
      if (!currentStillExists) {
        setSelectedConv(conversations[0]!);
      }
    } else {
      setSelectedConv(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationsData]);

  const {
    data: messagesData,
    isLoading: isMessagesLoading,
  } = trpc.conversations.getMessages.useQuery(
    { conversationId: selectedConv?.id ?? '' },
    { enabled: !!selectedConv }
  );

  const {
    data: customerDetails,
    isLoading: isCustomerLoading,
  } = trpc.conversations.getCustomerDetails.useQuery(
    { customerId: selectedConv?.customer.id ?? '' },
    { enabled: !!selectedConv }
  );

  const handleSend = () => {
    if (message.trim()) {
      setMessage('');
      setTyping(true);
      setTimeout(() => setTyping(false), 2000);
    }
  };

  const displayStatus = (status: string) => {
    if (status === 'handed_off') return 'escalated';
    if (status === 'closed') return 'resolved';
    return status;
  };

  const statusVariant = (status: string) => {
    if (status === 'active') return 'default' as const;
    if (status === 'closed') return 'secondary' as const;
    return 'destructive' as const;
  };

  return (
    <div className="min-h-screen bg-background">
      <Topbar title="Conversations" />

      <div className="flex h-[calc(100vh-4rem)]">
        <div className="w-80 border-r border-border bg-card">
          <div className="p-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                className="pl-10"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>

            <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterValue)}>
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="escalated">Escalated</TabsTrigger>
                <TabsTrigger value="resolved">Resolved</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="overflow-y-auto h-[calc(100%-8rem)]">
            {isConversationsLoading ? (
              <ConversationListSkeleton />
            ) : conversations.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                No conversations found
              </div>
            ) : (
              conversations.map((conv) => {
                const initials = getInitials(conv.customer.name);
                const isAi = conv.resolvedByAi !== false;
                const convType = isAi ? 'AI' : 'Human';

                return (
                  <motion.div
                    key={conv.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => setSelectedConv(conv)}
                    className={`p-4 border-b border-border cursor-pointer transition-colors ${
                      selectedConv?.id === conv.id ? 'bg-accent' : 'hover:bg-accent/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <Avatar>
                          <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-violet-500 text-white">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        {conv.status === 'active' && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-card" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium truncate">{conv.customer.name}</p>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate mb-2">
                          {conv.customer.phone ?? conv.customer.waId}
                        </p>
                        <div className="flex items-center justify-between">
                          <Badge variant={convType === 'AI' ? 'default' : 'secondary'} className="text-xs">
                            {convType === 'AI' ? <Bot className="w-3 h-3 mr-1" /> : <User className="w-3 h-3 mr-1" />}
                            {convType}
                          </Badge>
                          <Badge variant={statusVariant(conv.status)} className="text-xs">
                            {displayStatus(conv.status)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          {selectedConv ? (
            <>
              <div className="h-16 border-b border-border bg-card px-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-violet-500 text-white">
                      {getInitials(selectedConv.customer.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{selectedConv.customer.name}</p>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {selectedConv.customer.phone ?? selectedConv.customer.waId}
                      </span>
                      <Badge variant={statusVariant(selectedConv.status)} className="text-xs">
                        {displayStatus(selectedConv.status)}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    Take Over
                  </Button>
                  <Button variant="outline" size="sm">
                    Resolve
                  </Button>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowDetails(!showDetails)}
                  >
                    {showDetails ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-background/50">
                {isMessagesLoading ? (
                  <MessagesSkeleton />
                ) : (messagesData ?? []).length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    No messages yet
                  </div>
                ) : (
                  (messagesData ?? []).map((msg) => {
                    const direction = msg.direction === 'outbound' ? 'outgoing' : 'incoming';

                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                            direction === 'outgoing'
                              ? 'bg-emerald-500 text-white'
                              : 'bg-card border border-border'
                          }`}
                        >
                          <p className="text-sm">{msg.content}</p>
                          <div className="flex items-center justify-between gap-2 mt-2">
                            {msg.aiGenerated && msg.aiModel && (
                              <Badge variant="secondary" className="text-xs">
                                <Bot className="w-3 h-3 mr-1" />
                                {msg.aiModel}
                              </Badge>
                            )}
                            <span
                              className={`text-xs ${
                                direction === 'outgoing' ? 'text-white/70' : 'text-muted-foreground'
                              }`}
                            >
                              {format(new Date(msg.createdAt), 'h:mm a')}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}

                {typing && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div className="bg-card border border-border rounded-2xl px-4 py-3">
                      <div className="flex gap-1">
                        <motion.div
                          className="w-2 h-2 rounded-full bg-muted-foreground"
                          animate={{ y: [0, -8, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                        />
                        <motion.div
                          className="w-2 h-2 rounded-full bg-muted-foreground"
                          animate={{ y: [0, -8, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                        />
                        <motion.div
                          className="w-2 h-2 rounded-full bg-muted-foreground"
                          animate={{ y: [0, -8, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="border-t border-border bg-card p-4">
                <div className="bg-muted/50 p-3 rounded-lg mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">AI is handling this conversation</span>
                  </div>
                  <Button size="sm" variant="outline">
                    Take Over to Reply
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Type a message..."
                    disabled
                    className="flex-1"
                  />
                  <Button onClick={handleSend} disabled size="icon">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              {isConversationsLoading ? (
                <div className="space-y-3 text-center">
                  <Shimmer className="h-6 w-48 mx-auto" />
                  <Shimmer className="h-4 w-32 mx-auto" />
                </div>
              ) : (
                'Select a conversation to view messages'
              )}
            </div>
          )}
        </div>

        <AnimatePresence>
          {showDetails && selectedConv && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l border-border bg-card overflow-hidden"
            >
              <div className="p-6 space-y-6 w-70">
                <Card className="glass border-border">
                  <CardHeader>
                    <CardTitle className="text-sm">Customer Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isCustomerLoading ? (
                      <CustomerDetailsSkeleton />
                    ) : customerDetails ? (
                      <>
                        <div className="flex flex-col items-center text-center">
                          <Avatar className="w-16 h-16 mb-3">
                            <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-violet-500 text-white text-xl">
                              {getInitials(selectedConv.customer.name)}
                            </AvatarFallback>
                          </Avatar>
                          <h3 className="font-medium">{customerDetails.name ?? selectedConv.customer.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {customerDetails.phone ?? selectedConv.customer.waId}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Conversations</span>
                            <span className="font-medium">{customerDetails.stats.totalConversations}</span>
                          </div>

                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Active</span>
                            <span className="font-medium">{customerDetails.stats.activeConversations}</span>
                          </div>

                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Total Orders</span>
                            <span className="font-medium">{customerDetails.stats.totalOrders}</span>
                          </div>

                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Total Spent</span>
                            <span className="font-medium">
                              {Number(customerDetails.stats.totalSpent) > 0
                                ? `₹${Number(customerDetails.stats.totalSpent).toLocaleString('en-IN')}`
                                : '₹0'}
                            </span>
                          </div>
                        </div>

                        <Button variant="outline" className="w-full" size="sm">
                          <ShoppingBag className="w-4 h-4 mr-2" />
                          View Order History
                        </Button>
                      </>
                    ) : (
                      <div className="text-center text-muted-foreground text-sm py-4">
                        Customer details not available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
