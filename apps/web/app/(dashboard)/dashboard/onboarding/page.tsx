'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Building2,
  Utensils,
  Stethoscope,
  Scissors,
  ShoppingBag,
  Smartphone,
  Upload,
  FileText,
  Sparkles,
  PartyPopper,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useToast } from '@/hooks/use-toast';
import { trpc } from '@/lib/trpc';

const businessTypes = [
  { id: 'restaurant', icon: Utensils, label: 'Restaurant', color: 'emerald' },
  { id: 'clinic', icon: Stethoscope, label: 'Clinic', color: 'blue' },
  { id: 'salon', icon: Scissors, label: 'Salon', color: 'violet' },
  { id: 'retail', icon: ShoppingBag, label: 'Retail', color: 'orange' },
  { id: 'other', icon: Building2, label: 'Other', color: 'gray' },
] as const;

const templates = [
  {
    id: 'restaurant',
    label: 'Restaurant Menu',
    description: 'Pre-filled menu items and pricing',
    articles: 3,
  },
  {
    id: 'clinic',
    label: 'Clinic FAQ',
    description: 'Common medical queries and answers',
    articles: 5,
  },
  {
    id: 'salon',
    label: 'Salon Services',
    description: 'Service list with prices',
    articles: 4,
  },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessInfo, setBusinessInfo] = useState({
    name: '',
    type: '' as string,
    city: '',
    ownerName: '',
  });
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [waAccessToken, setWaAccessToken] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [manualContent, setManualContent] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const router = useRouter();
  const { update: updateSession } = useSession();
  const { toast } = useToast();

  // tRPC mutations
  const createBusiness = trpc.onboarding.createBusiness.useMutation();
  const saveWhatsApp = trpc.onboarding.saveWhatsApp.useMutation();
  const saveKnowledge = trpc.onboarding.saveKnowledge.useMutation();
  const completeOnboarding = trpc.onboarding.complete.useMutation();

  const progress = (step / 4) * 100;
  const isSaving = createBusiness.isPending || saveWhatsApp.isPending || saveKnowledge.isPending || completeOnboarding.isPending;

  const handleNext = async () => {
    // Step 1: Create business
    if (step === 1) {
      if (!businessInfo.name || !businessInfo.type || !businessInfo.city || !businessInfo.ownerName) {
        toast({
          title: 'Required fields',
          description: 'Please fill in all business information',
          variant: 'destructive',
        });
        return;
      }

      try {
        const result = await createBusiness.mutateAsync({
          name: businessInfo.name,
          businessType: businessInfo.type as 'restaurant' | 'clinic' | 'salon' | 'retail' | 'other',
          city: businessInfo.city,
          ownerName: businessInfo.ownerName,
        });
        setBusinessId(result.businessId);
        // Trigger session refresh so businessId is picked up
        await updateSession();
        toast({ title: 'Business created!', description: 'Now let\'s connect your WhatsApp' });
        setStep(2);
      } catch (err: any) {
        toast({
          title: 'Error',
          description: err.message ?? 'Failed to create business',
          variant: 'destructive',
        });
      }
      return;
    }

    // Step 2: Save WhatsApp phone
    if (step === 2) {
      if (!phoneVerified) {
        toast({
          title: 'Verification required',
          description: 'Please verify your WhatsApp connection',
          variant: 'destructive',
        });
        return;
      }

      if (businessId && phoneNumber) {
        try {
          await saveWhatsApp.mutateAsync({ businessId, phoneNumber });
        } catch {
          // Non-critical, continue anyway
        }
      }
      setStep(3);
      return;
    }

    // Step 3: Save knowledge base
    if (step === 3) {
      if (businessId && manualContent.trim()) {
        try {
          await saveKnowledge.mutateAsync({
            businessId,
            articles: [{ title: 'Business Info', content: manualContent, contentType: 'custom' }],
          });
        } catch {
          // Non-critical, continue anyway
        }
      }
      setStep(4);
      return;
    }
  };

  const handleBack = () => {
    if (step > 1 && step !== 2) {
      // Don't go back to step 1 after business is created
      setStep(step - 1);
    } else if (step === 2) {
      // Business already created, can't go back
      toast({ title: 'Business already created', description: 'You can update info in Settings later' });
    }
  };

  const handleVerifyPhone = async () => {
    if (!phoneNumber || !phoneNumberId || !waAccessToken) {
      toast({
        title: 'Credentials required',
        description: 'Please enter phone number, phone number ID, and access token',
        variant: 'destructive',
      });
      return;
    }

    if (!businessId) {
      toast({
        title: 'Business not ready',
        description: 'Please complete step 1 first',
        variant: 'destructive',
      })
      return
    }

    setVerifying(true);

    try {
      const res = await fetch('/api/onboarding/verify-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          phoneNumberId,
          accessToken: waAccessToken,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Verification failed' }))
        throw new Error(err.error ?? 'Verification failed')
      }

      setPhoneVerified(true);
      toast({
        title: 'Connection verified!',
        description: 'WhatsApp Business API connected successfully',
      });
    } catch (err: any) {
      setPhoneVerified(false)
      toast({
        title: 'Verification failed',
        description: err.message ?? 'Could not verify Meta credentials',
        variant: 'destructive',
      })
    } finally {
      setVerifying(false)
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles(files.map((f) => f.name));
    toast({
      title: 'Files uploaded',
      description: `${files.length} file(s) uploaded successfully`,
    });
  };

  const handleFinish = async () => {
    if (businessId) {
      try {
        await completeOnboarding.mutateAsync({ businessId });
        await updateSession();
      } catch {
        // Non-critical
      }
    }
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    s <= step
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  {s < step ? <Check className="w-5 h-5" /> : s}
                </div>
                {s < 4 && (
                  <div className={`h-0.5 flex-1 mx-2 ${s < step ? 'bg-primary' : 'bg-border'}`} />
                )}
              </div>
            ))}
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-violet-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="glass border-border">
                <CardContent className="p-8 space-y-6">
                  <div>
                    <h2 className="text-3xl font-bold gradient-text mb-2">Business Information</h2>
                    <p className="text-muted-foreground">Tell us about your business to get started</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Business Name</label>
                    <Input
                      value={businessInfo.name}
                      onChange={(e) => setBusinessInfo({ ...businessInfo, name: e.target.value })}
                      placeholder="Enter your business name"
                      className="h-12"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-3 block">Business Type</label>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {businessTypes.map((type) => (
                        <motion.div
                          key={type.id}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Card
                            className={`cursor-pointer transition-all ${
                              businessInfo.type === type.id
                                ? 'border-primary bg-primary/10'
                                : 'border-border hover:border-primary/50'
                            }`}
                            onClick={() => setBusinessInfo({ ...businessInfo, type: type.id })}
                          >
                            <CardContent className="p-6 flex flex-col items-center gap-2">
                              <type.icon className="w-8 h-8" />
                              <p className="text-sm font-medium text-center">{type.label}</p>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">City</label>
                      <Input
                        value={businessInfo.city}
                        onChange={(e) => setBusinessInfo({ ...businessInfo, city: e.target.value })}
                        placeholder="e.g., Mumbai"
                        className="h-12"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Owner Name</label>
                      <Input
                        value={businessInfo.ownerName}
                        onChange={(e) => setBusinessInfo({ ...businessInfo, ownerName: e.target.value })}
                        placeholder="Your name"
                        className="h-12"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      onClick={handleNext}
                      size="lg"
                      className="bg-gradient-to-r from-emerald-500 to-violet-500"
                      disabled={isSaving}
                    >
                      {createBusiness.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          Continue
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="glass border-border">
                <CardContent className="p-8 space-y-6">
                  <div>
                    <h2 className="text-3xl font-bold gradient-text mb-2">Connect WhatsApp</h2>
                    <p className="text-muted-foreground">Link your WhatsApp Business API account</p>
                  </div>

                  <div className="space-y-4">
                    <div className="p-6 rounded-lg bg-muted/50 space-y-3">
                      <h3 className="font-semibold flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">
                          1
                        </div>
                        Set up Meta Business API
                      </h3>
                      <p className="text-sm text-muted-foreground ml-8">
                        Go to{' '}
                        <a href="https://business.facebook.com" className="text-primary hover:underline">
                          business.facebook.com
                        </a>{' '}
                        and create a WhatsApp Business API account
                      </p>
                    </div>

                    <div className="p-6 rounded-lg bg-muted/50 space-y-3">
                      <h3 className="font-semibold flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">
                          2
                        </div>
                        Configure Webhook
                      </h3>
                      <p className="text-sm text-muted-foreground ml-8">
                        Copy this webhook URL and add it to your WhatsApp API settings:
                      </p>
                      <div className="ml-8 flex gap-2">
                        <Input value="https://api.bizbot.ai/webhook/new" readOnly className="bg-background" />
                        <Button variant="outline" size="icon">
                          <Check className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="p-6 rounded-lg bg-muted/50 space-y-3">
                      <h3 className="font-semibold flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">
                          3
                        </div>
                        Enter Phone Number
                      </h3>
                      <div className="ml-8 space-y-3">
                        <Input
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="h-12 bg-background"
                          disabled={phoneVerified}
                        />
                        <Input
                          value={phoneNumberId}
                          onChange={(e) => setPhoneNumberId(e.target.value)}
                          placeholder="WhatsApp Phone Number ID"
                          className="h-12 bg-background"
                          disabled={phoneVerified}
                        />
                        <Input
                          value={waAccessToken}
                          onChange={(e) => setWaAccessToken(e.target.value)}
                          placeholder="Meta temporary/permanent access token"
                          className="h-12 bg-background"
                          type="password"
                          disabled={phoneVerified}
                        />
                        {phoneVerified ? (
                          <div className="flex items-center gap-2 text-emerald-500">
                            <Check className="w-5 h-5" />
                            <span className="font-medium">Connection verified successfully!</span>
                          </div>
                        ) : (
                          <Button
                            onClick={handleVerifyPhone}
                            disabled={verifying}
                            variant="outline"
                            className="w-full"
                          >
                            <Smartphone className="w-4 h-4 mr-2" />
                            {verifying ? 'Verifying...' : 'Verify Connection'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between gap-2 pt-4">
                    <Button onClick={handleBack} variant="outline" size="lg">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button
                      onClick={handleNext}
                      size="lg"
                      className="bg-gradient-to-r from-emerald-500 to-violet-500"
                      disabled={isSaving}
                    >
                      Continue
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="glass border-border">
                <CardContent className="p-8 space-y-6">
                  <div>
                    <h2 className="text-3xl font-bold gradient-text mb-2">Upload Knowledge</h2>
                    <p className="text-muted-foreground">Add content to train your AI assistant</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {templates.map((template) => (
                      <motion.div key={template.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Card
                          className={`cursor-pointer transition-all ${
                            selectedTemplate === template.id
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => setSelectedTemplate(template.id)}
                        >
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-3">
                              <FileText className="w-8 h-8 text-primary" />
                              <Badge variant="secondary">{template.articles} articles</Badge>
                            </div>
                            <h3 className="font-semibold mb-1">{template.label}</h3>
                            <p className="text-sm text-muted-foreground">{template.description}</p>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-card text-muted-foreground">OR</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-3 block">Upload Files (PDF, TXT, CSV)</label>
                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-all">
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.txt,.csv"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="file-upload"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="font-medium mb-1">Click to upload or drag and drop</p>
                        <p className="text-sm text-muted-foreground">PDF, TXT, or CSV files</p>
                      </label>
                    </div>
                    {uploadedFiles.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {uploadedFiles.map((file, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <Check className="w-4 h-4 text-emerald-500" />
                            <span>{file}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Or Enter Content Manually</label>
                    <Textarea
                      value={manualContent}
                      onChange={(e) => setManualContent(e.target.value)}
                      placeholder="Paste your menu, FAQ, or business information here..."
                      className="min-h-[150px]"
                    />
                  </div>

                  <div className="flex justify-between gap-2 pt-4">
                    <Button onClick={handleBack} variant="outline" size="lg">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button
                      onClick={handleNext}
                      size="lg"
                      className="bg-gradient-to-r from-emerald-500 to-violet-500"
                      disabled={isSaving}
                    >
                      {saveKnowledge.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          Continue
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="glass border-border">
                <CardContent className="p-12 text-center space-y-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1, rotate: 360 }}
                    transition={{ delay: 0.2, type: 'spring' }}
                    className="w-24 h-24 mx-auto bg-gradient-to-r from-emerald-500 to-violet-500 rounded-full flex items-center justify-center"
                  >
                    <PartyPopper className="w-12 h-12 text-white" />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <h2 className="text-4xl font-bold gradient-text mb-4">Your bot is live!</h2>
                    <p className="text-xl text-muted-foreground mb-8">
                      Congratulations! Your AI assistant is ready to handle customer conversations.
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto"
                  >
                    <div className="p-6 rounded-lg bg-muted/50">
                      <Building2 className="w-8 h-8 mx-auto mb-3 text-emerald-500" />
                      <p className="font-medium mb-1">{businessInfo.name}</p>
                      <p className="text-sm text-muted-foreground">Business Name</p>
                    </div>

                    <div className="p-6 rounded-lg bg-muted/50">
                      <Check className="w-8 h-8 mx-auto mb-3 text-emerald-500" />
                      <p className="font-medium mb-1">Connected</p>
                      <p className="text-sm text-muted-foreground">WhatsApp</p>
                    </div>

                    <div className="p-6 rounded-lg bg-muted/50">
                      <FileText className="w-8 h-8 mx-auto mb-3 text-emerald-500" />
                      <p className="font-medium mb-1">{uploadedFiles.length + (selectedTemplate ? 3 : 0)} Articles</p>
                      <p className="text-sm text-muted-foreground">Knowledge Base</p>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="flex gap-4 justify-center pt-4"
                  >
                    <Button size="lg" variant="outline">
                      <Smartphone className="w-4 h-4 mr-2" />
                      Send Test Message
                    </Button>
                    <Button
                      onClick={handleFinish}
                      size="lg"
                      className="bg-gradient-to-r from-emerald-500 to-violet-500 hover:opacity-90"
                      disabled={completeOnboarding.isPending}
                    >
                      {completeOnboarding.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-2" />
                      )}
                      Open Dashboard
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
