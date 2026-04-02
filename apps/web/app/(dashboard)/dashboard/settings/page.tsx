'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Save,
  Copy,
  Check,
  RefreshCw,
  Zap,
  CreditCard,
  Download,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { trpc } from '@/lib/trpc';
import { Topbar } from '@/components/topbar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const defaultBusinessHours = days.map((day, i) => ({
  day,
  enabled: i < 6,
  open: '09:00',
  close: '18:00',
}));

type BusinessHoursEntry = {
  day: string;
  enabled: boolean;
  open: string;
  close: string;
};

export default function SettingsPage() {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  // --- Form state for General tab ---
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('restaurant');
  const [city, setCity] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [timezone, setTimezone] = useState('asia-kolkata');

  // --- Form state for AI Config tab ---
  const [defaultLanguage, setDefaultLanguage] = useState('auto');
  const [maxResponseLength, setMaxResponseLength] = useState([500]);
  const [systemPrompt, setSystemPrompt] = useState('');

  // --- Form state for Business Hours ---
  const [businessHours, setBusinessHours] = useState<BusinessHoursEntry[]>(defaultBusinessHours);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(true);
  const [autoReplyMessage, setAutoReplyMessage] = useState(
    'Thank you for contacting us! We are currently closed. Our business hours are Monday to Saturday, 9 AM to 6 PM. We\'ll respond to your message as soon as we\'re back.'
  );
  const [subscribingPlan, setSubscribingPlan] = useState<'starter' | 'growth' | 'pro' | null>(null);

  // --- tRPC queries ---
  const utils = trpc.useUtils();
  const { data: business, isLoading: isLoadingBusiness } = trpc.settings.getBusiness.useQuery();
  const { data: waStatus, isLoading: isLoadingWa } = trpc.settings.getWhatsAppStatus.useQuery();

  const updateMutation = trpc.settings.updateBusiness.useMutation({
    onSuccess: () => {
      toast({
        title: 'Settings saved',
        description: 'Your changes have been saved successfully',
      });
      utils.settings.getBusiness.invalidate();
    },
    onError: (error) => {
      toast({
        title: 'Error saving settings',
        description: error.message ?? 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // --- Initialize form state from API data ---
  useEffect(() => {
    if (!business) return;
    setBusinessName(business.name ?? '');
    setBusinessType(business.businessType ?? 'restaurant');
    setCity(business.city ?? '');
    setOwnerName(business.ownerName ?? '');
    setDefaultLanguage(business.defaultLanguage ?? 'auto');
    setMaxResponseLength([business.maxTokensPerReply ?? 500]);
    setSystemPrompt(business.systemPrompt ?? '');
    setAutoReplyMessage(business.autoReplyOutsideHours ?? autoReplyMessage);

    // Parse businessHours JSON if available
    if (business.businessHours && typeof business.businessHours === 'object') {
      const bh = business.businessHours as Record<string, unknown>;
      // If it looks like our array format
      if (Array.isArray(bh)) {
        setBusinessHours(
          bh.map((entry: Record<string, unknown>) => ({
            day: String(entry.day ?? ''),
            enabled: Boolean(entry.enabled),
            open: String(entry.open ?? '09:00'),
            close: String(entry.close ?? '18:00'),
          }))
        );
      } else if (bh['schedule'] && Array.isArray(bh['schedule'])) {
        setBusinessHours(
          (bh['schedule'] as Record<string, unknown>[]).map((entry) => ({
            day: String(entry.day ?? ''),
            enabled: Boolean(entry.enabled),
            open: String(entry.open ?? '09:00'),
            close: String(entry.close ?? '18:00'),
          }))
        );
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business]);

  // --- Handlers ---
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: 'Copied to clipboard',
      description: 'Webhook URL copied successfully',
    });
  };

  const handleSaveGeneral = () => {
    updateMutation.mutate({
      name: businessName,
      ownerName,
      city,
      businessType: businessType as 'restaurant' | 'clinic' | 'salon' | 'ecommerce' | 'other',
    });
  };

  const handleSaveAiConfig = () => {
    updateMutation.mutate({
      defaultLanguage,
      maxTokensPerReply: maxResponseLength[0],
      systemPrompt,
      businessHours: businessHours as unknown as Record<string, unknown>,
      autoReplyOutsideHours: autoReplyMessage,
    });
  };

  const handleUpgradePlan = async (planToUpgrade: 'starter' | 'growth' | 'pro') => {
    try {
      setSubscribingPlan(planToUpgrade);

      const res = await fetch('/api/billing/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planToUpgrade }),
      });

      const data = await res.json().catch(() => ({} as { error?: string; checkoutUrl?: string }));
      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to start subscription');
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      toast({
        title: 'Subscription created',
        description: 'Subscription is created. Plan will activate after successful payment.',
      });
    } catch (err: any) {
      toast({
        title: 'Upgrade failed',
        description: err.message ?? 'Could not start billing subscription',
        variant: 'destructive',
      });
    } finally {
      setSubscribingPlan(null);
    }
  };

  // --- Billing computations ---
  const plan = business?.plan ?? 'starter';
  const monthlyMessageLimit = business?.monthlyMessageLimit ?? 1000;
  const messagesUsedThisMonth = business?.messagesUsedThisMonth ?? 0;
  const usagePercentage = monthlyMessageLimit > 0
    ? Math.min((messagesUsedThisMonth / monthlyMessageLimit) * 100, 100)
    : 0;

  const planDisplayName = plan.charAt(0).toUpperCase() + plan.slice(1);
  const planPrice = plan === 'growth' ? '2,999' : plan === 'enterprise' ? '9,999' : '999';

  // --- Skeleton block helper ---
  const FieldSkeleton = () => (
    <div className="space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Topbar title="Settings" />

      <div className="p-6">
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full max-w-2xl">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
            <TabsTrigger value="ai">AI Config</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <Card className="glass border-border">
                <CardHeader>
                  <CardTitle>Business Information</CardTitle>
                  <CardDescription>
                    Update your business details and preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoadingBusiness ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FieldSkeleton />
                      <FieldSkeleton />
                      <FieldSkeleton />
                      <FieldSkeleton />
                      <div className="md:col-span-2">
                        <FieldSkeleton />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Business Name</label>
                        <Input
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                          placeholder="Enter business name"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Business Type</label>
                        <Select value={businessType} onValueChange={setBusinessType}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="restaurant">Restaurant</SelectItem>
                            <SelectItem value="clinic">Clinic</SelectItem>
                            <SelectItem value="salon">Salon</SelectItem>
                            <SelectItem value="ecommerce">Ecommerce</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">City</label>
                        <Input
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="Enter city"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Owner Name</label>
                        <Input
                          value={ownerName}
                          onChange={(e) => setOwnerName(e.target.value)}
                          placeholder="Enter owner name"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="text-sm font-medium mb-2 block">Timezone</label>
                        <Select value={timezone} onValueChange={setTimezone}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="asia-kolkata">Asia/Kolkata (IST)</SelectItem>
                            <SelectItem value="asia-dubai">Asia/Dubai (GST)</SelectItem>
                            <SelectItem value="utc">UTC</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button
                      onClick={handleSaveGeneral}
                      disabled={updateMutation.isPending || isLoadingBusiness}
                      className="bg-gradient-to-r from-emerald-500 to-violet-500"
                    >
                      {updateMutation.isPending ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="whatsapp">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <Card className="glass border-border">
                <CardHeader>
                  <CardTitle>WhatsApp Configuration</CardTitle>
                  <CardDescription>
                    Manage your WhatsApp Business API connection
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {isLoadingWa ? (
                    <div className="space-y-4">
                      <Skeleton className="h-16 w-full rounded-lg" />
                      <FieldSkeleton />
                      <FieldSkeleton />
                    </div>
                  ) : (
                    <>
                      <div
                        className={`flex items-center justify-between p-4 rounded-lg border ${
                          waStatus?.waConnected
                            ? 'bg-emerald-500/10 border-emerald-500/20'
                            : 'bg-red-500/10 border-red-500/20'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              waStatus?.waConnected ? 'bg-emerald-500 pulse-glow' : 'bg-red-500'
                            }`}
                          />
                          <div>
                            <p className="font-medium">
                              {waStatus?.waConnected ? 'WhatsApp Connected' : 'WhatsApp Disconnected'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {waStatus?.lastMessageAt
                                ? `Last message: ${formatDistanceToNow(new Date(waStatus.lastMessageAt), { addSuffix: true })}`
                                : 'No messages yet'}
                            </p>
                          </div>
                        </div>
                        <Badge className={waStatus?.waConnected ? 'bg-emerald-500' : 'bg-red-500'}>
                          {waStatus?.waConnected ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Phone Number</label>
                        <Input
                          value={waStatus?.waPhoneNumberId ?? 'Not configured'}
                          disabled
                          className="bg-muted"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="text-sm font-medium mb-2 block">Webhook URL</label>
                    <div className="flex gap-2">
                      <Input
                        value={`https://api.bizbot.ai/webhook/${business?.slug ?? '...'}`}
                        readOnly
                        className="bg-muted"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          handleCopy(`https://api.bizbot.ai/webhook/${business?.slug ?? ''}`)
                        }
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Use this URL in your WhatsApp Business API webhook settings
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Reconnect WhatsApp
                    </Button>
                    <Button variant="outline" className="flex-1">
                      Test Connection
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="ai">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <Card className="glass border-border">
                <CardHeader>
                  <CardTitle>AI Model Routing</CardTitle>
                  <CardDescription>
                    Configure which models handle different types of queries
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    {[
                      { name: 'Haiku', desc: 'Simple queries (menu, hours, location)', enabled: true },
                      { name: 'Sonnet', desc: 'Complex queries (recommendations, comparisons)', enabled: true },
                      { name: 'Opus', desc: 'Escalations and sensitive issues', enabled: false },
                    ].map((model) => (
                      <div
                        key={model.name}
                        className="flex items-start justify-between p-4 rounded-lg border border-border hover:border-primary/20 transition-all"
                      >
                        <div className="flex-1">
                          <h4 className="font-medium mb-1">{model.name}</h4>
                          <p className="text-sm text-muted-foreground">{model.desc}</p>
                        </div>
                        <Switch defaultChecked={model.enabled} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="glass border-border">
                <CardHeader>
                  <CardTitle>Language & Response Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoadingBusiness ? (
                    <div className="space-y-4">
                      <FieldSkeleton />
                      <FieldSkeleton />
                      <FieldSkeleton />
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Language Preference</label>
                        <Select value={defaultLanguage} onValueChange={setDefaultLanguage}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">Auto-detect</SelectItem>
                            <SelectItem value="hindi">Hindi</SelectItem>
                            <SelectItem value="english">English</SelectItem>
                            <SelectItem value="hinglish">Hinglish</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Max Response Length: {maxResponseLength[0]} tokens
                        </label>
                        <Slider
                          value={maxResponseLength}
                          onValueChange={setMaxResponseLength}
                          max={4096}
                          min={50}
                          step={50}
                          className="my-4"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 flex items-center gap-2">
                          System Prompt Override
                          <Badge variant="secondary" className="text-xs">Advanced</Badge>
                        </label>
                        <Textarea
                          value={systemPrompt}
                          onChange={(e) => setSystemPrompt(e.target.value)}
                          placeholder="Enter custom system prompt (optional)"
                          className="min-h-[100px]"
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="glass border-border">
                <CardHeader>
                  <CardTitle>Business Hours & Auto-Reply</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {isLoadingBusiness ? (
                    <div className="space-y-3">
                      {days.map((day) => (
                        <Skeleton key={day} className="h-10 w-full" />
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        {businessHours.map((schedule, index) => (
                          <div key={schedule.day} className="flex items-center gap-4">
                            <div className="w-28">
                              <p className="text-sm font-medium">{schedule.day}</p>
                            </div>
                            <Switch
                              checked={schedule.enabled}
                              onCheckedChange={(checked) => {
                                const updated = [...businessHours];
                                updated[index]!.enabled = checked;
                                setBusinessHours(updated);
                              }}
                            />
                            {schedule.enabled && (
                              <>
                                <Input
                                  type="time"
                                  value={schedule.open}
                                  onChange={(e) => {
                                    const updated = [...businessHours];
                                    updated[index]!.open = e.target.value;
                                    setBusinessHours(updated);
                                  }}
                                  className="w-32"
                                />
                                <span className="text-muted-foreground">to</span>
                                <Input
                                  type="time"
                                  value={schedule.close}
                                  onChange={(e) => {
                                    const updated = [...businessHours];
                                    updated[index]!.close = e.target.value;
                                    setBusinessHours(updated);
                                  }}
                                  className="w-32"
                                />
                              </>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="pt-4 border-t border-border space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Auto-reply outside hours</p>
                            <p className="text-sm text-muted-foreground">
                              Send automatic response when business is closed
                            </p>
                          </div>
                          <Switch
                            checked={autoReplyEnabled}
                            onCheckedChange={setAutoReplyEnabled}
                          />
                        </div>

                        {autoReplyEnabled && (
                          <div>
                            <label className="text-sm font-medium mb-2 block">Auto-reply Message</label>
                            <Textarea
                              value={autoReplyMessage}
                              onChange={(e) => setAutoReplyMessage(e.target.value)}
                              className="min-h-[100px]"
                            />
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  <div className="flex justify-end">
                    <Button
                      onClick={handleSaveAiConfig}
                      disabled={updateMutation.isPending || isLoadingBusiness}
                      className="bg-gradient-to-r from-emerald-500 to-violet-500"
                    >
                      {updateMutation.isPending ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save AI Configuration
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="notifications">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <Card className="glass border-border">
                <CardHeader>
                  <CardTitle>Notification Settings</CardTitle>
                  <CardDescription>
                    Configure how you receive alerts and updates
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Email notifications for escalations</p>
                      <p className="text-sm text-muted-foreground">
                        Get notified when AI escalates a conversation
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Email Address</label>
                    <Input type="email" defaultValue="admin@bizbot.ai" placeholder="your@email.com" />
                  </div>

                  <div className="border-t border-border pt-6">
                    <label className="text-sm font-medium mb-2 block">Slack Webhook URL (Optional)</label>
                    <Input placeholder="https://hooks.slack.com/services/..." />
                    <p className="text-xs text-muted-foreground mt-1">
                      Receive notifications in your Slack workspace
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={() =>
                        toast({
                          title: 'Settings saved',
                          description: 'Your changes have been saved successfully',
                        })
                      }
                      className="bg-gradient-to-r from-emerald-500 to-violet-500"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save Notification Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="billing">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <Card className="glass border-border">
                <CardHeader>
                  {isLoadingBusiness ? (
                    <>
                      <Skeleton className="h-6 w-40" />
                      <Skeleton className="h-4 w-56 mt-2" />
                    </>
                  ) : (
                    <>
                      <CardTitle>Current Plan</CardTitle>
                      <CardDescription>
                        {planDisplayName} Plan - &#8377;{planPrice}/month
                      </CardDescription>
                    </>
                  )}
                </CardHeader>
                <CardContent className="space-y-6">
                  {isLoadingBusiness ? (
                    <div className="space-y-4">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-2 w-full rounded-full" />
                      <div className="grid grid-cols-3 gap-4 pt-4">
                        <Skeleton className="h-20 rounded-lg" />
                        <Skeleton className="h-20 rounded-lg" />
                        <Skeleton className="h-20 rounded-lg" />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Messages Used</span>
                          <span className="text-sm text-muted-foreground">
                            {messagesUsedThisMonth.toLocaleString()} / {monthlyMessageLimit.toLocaleString()}
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-violet-500 transition-all"
                            style={{ width: `${usagePercentage}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {usagePercentage.toFixed(1)}% of monthly limit used
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-4 pt-4">
                        {[
                          { label: 'Messages', value: `${monthlyMessageLimit.toLocaleString()}/mo` },
                          { label: 'AI Models', value: plan === 'starter' ? 'Haiku + Sonnet' : 'All Models' },
                          { label: 'Support', value: plan === 'starter' ? 'Email' : 'Priority' },
                        ].map((item) => (
                          <div key={item.label} className="text-center p-4 rounded-lg bg-muted/50">
                            <p className="text-sm text-muted-foreground mb-1">{item.label}</p>
                            <p className="font-medium">{item.value}</p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="glass border-border border-primary/20">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>Upgrade to Growth Plan</CardTitle>
                      <CardDescription>Get more conversations and advanced features</CardDescription>
                    </div>
                    <Badge className="bg-gradient-to-r from-emerald-500 to-violet-500">
                      Recommended
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold gradient-text">&#8377;2,999</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>

                  <ul className="space-y-2">
                    {[
                      '5,000 conversations/month',
                      'All AI models (Haiku, Sonnet, Opus)',
                      'Priority support',
                      'Custom branding',
                      'Advanced analytics',
                    ].map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full bg-gradient-to-r from-emerald-500 to-violet-500 hover:opacity-90"
                    onClick={() => handleUpgradePlan('growth')}
                    disabled={subscribingPlan !== null}
                  >
                    {subscribingPlan ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4 mr-2" />
                    )}
                    {subscribingPlan ? 'Starting...' : 'Upgrade Now'}
                  </Button>
                </CardContent>
              </Card>

              <Card className="glass border-border">
                <CardHeader>
                  <CardTitle>Billing History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { date: 'Jan 1, 2024', amount: '₹999', status: 'Paid' },
                      { date: 'Dec 1, 2023', amount: '₹999', status: 'Paid' },
                      { date: 'Nov 1, 2023', amount: '₹999', status: 'Paid' },
                    ].map((invoice, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/20 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-lg bg-muted">
                            <CreditCard className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-medium">{invoice.date}</p>
                            <p className="text-sm text-muted-foreground">{invoice.amount}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{invoice.status}</Badge>
                          <Button variant="ghost" size="icon">
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
