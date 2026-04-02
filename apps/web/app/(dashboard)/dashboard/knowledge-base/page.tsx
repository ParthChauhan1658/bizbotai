'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, CreditCard as Edit, Trash2, BookOpen, Clock, Target, RefreshCw } from 'lucide-react';
import { Topbar } from '@/components/topbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { trpc } from '@/lib/trpc';

// Content types stored in the database
const contentTypes = ['faq', 'menu', 'catalog', 'policy', 'custom', 'system'] as const;
type ContentType = (typeof contentTypes)[number];

// Display labels for each content type
const contentTypeLabels: Record<ContentType, string> = {
  menu: 'Menu',
  faq: 'FAQ',
  policy: 'Policies',
  custom: 'Custom',
  catalog: 'Catalog',
  system: 'System',
};

// Badge colors for each content type
const contentTypeColors: Record<ContentType, string> = {
  menu: 'bg-emerald-500',
  faq: 'bg-orange-500',
  policy: 'bg-violet-500',
  custom: 'bg-pink-500',
  catalog: 'bg-cyan-500',
  system: 'bg-blue-500',
};

/** Format a relative time string from a date (e.g. "2d ago") */
function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return 'Never';
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMins > 0) return `${diffMins}m ago`;
  return 'Just now';
}

export default function KnowledgeBasePage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditDrawer, setShowEditDrawer] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<{
    id: string;
    title: string;
    content: string;
    contentType: ContentType;
    isActive: boolean;
  } | null>(null);
  const [newArticle, setNewArticle] = useState({ title: '', contentType: 'faq' as ContentType, content: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const utils = trpc.useUtils();

  // --- Queries ---
  const articlesQuery = trpc.knowledgeBase.list.useQuery();
  const statsQuery = trpc.knowledgeBase.getStats.useQuery();

  // --- Mutations ---
  const createMutation = trpc.knowledgeBase.create.useMutation({
    onSuccess: () => {
      utils.knowledgeBase.list.invalidate();
      utils.knowledgeBase.getStats.invalidate();
      setNewArticle({ title: '', contentType: 'faq', content: '' });
      setShowAddModal(false);
      toast({ title: 'Article added', description: 'Knowledge base updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message || 'Failed to create article', variant: 'destructive' });
    },
  });

  const updateMutation = trpc.knowledgeBase.update.useMutation({
    onSuccess: () => {
      utils.knowledgeBase.list.invalidate();
      utils.knowledgeBase.getStats.invalidate();
      setShowEditDrawer(false);
      setSelectedArticle(null);
      toast({ title: 'Article updated', description: 'Changes saved successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message || 'Failed to update article', variant: 'destructive' });
    },
  });

  const deleteMutation = trpc.knowledgeBase.delete.useMutation({
    onSuccess: () => {
      utils.knowledgeBase.list.invalidate();
      utils.knowledgeBase.getStats.invalidate();
      toast({ title: 'Article deleted', description: 'Knowledge base updated' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message || 'Failed to delete article', variant: 'destructive' });
    },
  });

  // --- Handlers ---
  const handleAddArticle = () => {
    if (!newArticle.title || !newArticle.content) {
      toast({ title: 'Error', description: 'Please fill in all fields', variant: 'destructive' });
      return;
    }
    createMutation.mutate({
      title: newArticle.title,
      content: newArticle.content,
      contentType: newArticle.contentType,
    });
  };

  const handleEditArticle = () => {
    if (!selectedArticle) return;
    updateMutation.mutate({
      id: selectedArticle.id,
      title: selectedArticle.title,
      content: selectedArticle.content,
      contentType: selectedArticle.contentType,
    });
  };

  const handleDeleteArticle = (id: string) => {
    deleteMutation.mutate({ id });
  };

  const toggleArticleStatus = (id: string, currentIsActive: boolean) => {
    updateMutation.mutate({ id, isActive: !currentIsActive });
  };

  // --- Derived data ---
  const articles = articlesQuery.data ?? [];
  const filteredArticles = articles.filter(
    (a) =>
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = statsQuery.data;
  const isLoading = articlesQuery.isLoading;

  return (
    <div className="min-h-screen bg-background">
      <Topbar title="Knowledge Base" />

      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-emerald-500 to-violet-500 hover:opacity-90">
                <Plus className="w-4 h-4 mr-2" />
                Add Article
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Add New Article</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Title</label>
                  <Input
                    value={newArticle.title}
                    onChange={(e) => setNewArticle({ ...newArticle, title: e.target.value })}
                    placeholder="Article title"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Category</label>
                  <Select
                    value={newArticle.contentType}
                    onValueChange={(value) => setNewArticle({ ...newArticle, contentType: value as ContentType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {contentTypes.map((ct) => (
                        <SelectItem key={ct} value={ct}>
                          {contentTypeLabels[ct]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Content</label>
                  <Textarea
                    value={newArticle.content}
                    onChange={(e) => setNewArticle({ ...newArticle, content: e.target.value })}
                    placeholder="Enter article content..."
                    className="min-h-[200px]"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {newArticle.content.length} characters
                  </p>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddArticle} disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Saving...' : 'Save Article'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="glass border-border">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-emerald-500/10">
                    <BookOpen className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Articles</p>
                    {statsQuery.isLoading ? (
                      <Skeleton className="h-8 w-12 mt-1" />
                    ) : (
                      <p className="text-2xl font-bold">{stats?.totalArticles ?? 0}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="glass border-border">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-blue-500/10">
                    <Clock className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last Updated</p>
                    {statsQuery.isLoading ? (
                      <Skeleton className="h-8 w-16 mt-1" />
                    ) : (
                      <p className="text-2xl font-bold">{formatRelativeTime(stats?.lastUpdated)}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="glass border-border">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-violet-500/10">
                    <Target className="w-5 h-5 text-violet-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">With Embeddings</p>
                    {statsQuery.isLoading ? (
                      <Skeleton className="h-8 w-12 mt-1" />
                    ) : (
                      <p className="text-2xl font-bold">{stats?.withEmbedding ?? 0}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Article List */}
        {isLoading ? (
          // Loading skeleton grid
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="glass border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-12" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-10" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredArticles.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-16"
          >
            <div className="p-6 rounded-full bg-muted/50 mb-4">
              <BookOpen className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No articles yet</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Add your menu, business hours, or FAQs to make your AI smarter.
            </p>
            <Button onClick={() => setShowAddModal(true)} className="bg-gradient-to-r from-emerald-500 to-violet-500">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Article
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredArticles.map((article, index) => {
              const ct = article.contentType as ContentType;
              return (
                <motion.div
                  key={article.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -4 }}
                >
                  <Card className="glass border-border hover:border-primary/20 transition-all h-full">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base line-clamp-2">{article.title}</CardTitle>
                        <Badge className={`${contentTypeColors[ct] ?? 'bg-gray-500'} text-white shrink-0`}>
                          {contentTypeLabels[ct] ?? ct}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground line-clamp-3">{article.content}</p>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{article.content.length} characters</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Active</span>
                          <Switch
                            checked={article.isActive}
                            onCheckedChange={() => toggleArticleStatus(article.id, article.isActive)}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setSelectedArticle({
                              id: article.id,
                              title: article.title,
                              content: article.content,
                              contentType: article.contentType as ContentType,
                              isActive: article.isActive,
                            });
                            setShowEditDrawer(true);
                          }}
                        >
                          <Edit className="w-3 h-3 mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteArticle(article.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Drawer */}
      <Sheet open={showEditDrawer} onOpenChange={setShowEditDrawer}>
        <SheetContent className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Edit Article</SheetTitle>
          </SheetHeader>

          {selectedArticle && (
            <div className="space-y-4 pt-6">
              <div>
                <label className="text-sm font-medium mb-2 block">Title</label>
                <Input
                  value={selectedArticle.title}
                  onChange={(e) =>
                    setSelectedArticle({ ...selectedArticle, title: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Category</label>
                <Select
                  value={selectedArticle.contentType}
                  onValueChange={(value) =>
                    setSelectedArticle({ ...selectedArticle, contentType: value as ContentType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {contentTypes.map((ct) => (
                      <SelectItem key={ct} value={ct}>
                        {contentTypeLabels[ct]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Content</label>
                <Textarea
                  value={selectedArticle.content}
                  onChange={(e) =>
                    setSelectedArticle({ ...selectedArticle, content: e.target.value })
                  }
                  className="min-h-[300px]"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedArticle.content.length} characters
                </p>
              </div>

              <Button variant="outline" className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Re-generate Embedding
              </Button>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowEditDrawer(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleEditArticle} className="flex-1" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
