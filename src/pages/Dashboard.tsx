import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Search, 
  BookOpen, 
  Clock, 
  Target, 
  TrendingUp,
  Star,
  Users,
  Calendar,
  BarChart3,
  Trash2,
  Play,
  Share2,
  Copy,
  Eye,
  Check,
  User,
  FileText,
  Loader2
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { useToast } from "@/hooks/use-toast";
import ShareSetDialog from "@/components/ShareSetDialog";

interface FlashcardSet {
  id: string;
  title: string;
  description: string;
  tags: string[];
  flashcard_count: number;
  study_sessions_count: number;
  is_favorited: boolean;
  created_at: string;
  updated_at: string;
  creator_username?: string;
  creator_name?: string;
  is_public?: boolean;
}

interface UserStats {
  total_sets: number;
  total_flashcards: number;
  total_sessions: number;
  total_time_minutes: number;
  accuracy_percentage: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sets, setSets] = useState<FlashcardSet[]>([]);
  const [favorites, setFavorites] = useState<FlashcardSet[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [publicSets, setPublicSets] = useState<FlashcardSet[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [favoriteSetIds, setFavoriteSetIds] = useState<Set<string>>(new Set());
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareSetData, setShareSetData] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const { data: setsData, error: setsError } = await supabase
        .from("sets")
        .select(`
          *,
          flashcards(count)
        `)
        .eq("user_id", user?.id)
        .order("updated_at", { ascending: false });

      if (setsError) throw setsError;

      const { data: publicData, error: publicError } = await supabase
        .from("sets")
        .select(`
          *,
          flashcards(count)
        `)
        .eq("is_public", true)
        .neq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (publicError) throw publicError;

      // Fetch user's favorites
      const { data: favoritesData, error: favoritesError } = await supabase
        .from("favorites")
        .select("set_id")
        .eq("user_id", user?.id);

      if (favoritesError) throw favoritesError;

      const favoriteIds = new Set(favoritesData?.map(fav => fav.set_id) || []);
      setFavoriteSetIds(favoriteIds);

      // Transform the data to match our interface
      const transformedSets = (setsData || []).map(set => ({
        id: set.id,
        title: set.title,
        description: set.description || "",
        tags: set.tags || [],
        flashcard_count: 0,
        study_sessions_count: 0,
        is_favorited: favoriteIds.has(set.id),
        created_at: set.created_at,
        updated_at: set.updated_at,
        creator_username: user?.user_metadata?.username || user?.email,
        creator_name: user?.user_metadata?.full_name || user?.email,
        is_public: set.is_public
      }));

      setSets(transformedSets);
      
      // Include user's public sets in the public section
      const transformedPublic = (publicData || []).map(set => ({
        id: set.id,
        title: set.title,
        description: set.description || "",
        tags: set.tags || [],
        flashcard_count: set.flashcards?.[0]?.count || 0,
        study_sessions_count: 0,
        is_favorited: false,
        created_at: set.created_at,
        updated_at: set.updated_at,
        creator_username: 'Community Member',
        creator_name: 'Community Member',
        is_public: true
      }));
      
      // Add user's own public sets to the public section
      const userPublicSets = transformedSets.filter(set => set.is_public).map(set => ({
        ...set,
        creator_username: user?.user_metadata?.username || user?.email || 'You',
        creator_name: user?.user_metadata?.full_name || user?.email || 'You'
      }));
      
      setPublicSets([...userPublicSets, ...transformedPublic]);

      // Filter favorites
      const favoriteSets = transformedSets.filter(set => set.is_favorited);
      setFavorites(favoriteSets);

      // Derive stats and compute per-user accuracy from study_sessions
      const totalFlashcards = transformedSets.reduce((sum, set) => sum + set.flashcard_count, 0);

      // Fetch user's study sessions for accuracy/time aggregation
      const { data: sessionsData, error: sessionsError } = await supabase
        .from("study_sessions")
        .select("cards_studied, correct_answers, total_time_seconds")
        .eq("user_id", user?.id);

      if (sessionsError) throw sessionsError;

      const aggregated = (sessionsData || []).reduce(
        (acc, s) => {
          acc.totalCardsStudied += s.cards_studied || 0;
          acc.totalCorrect += s.correct_answers || 0;
          acc.totalTime += s.total_time_seconds || 0;
          return acc;
        },
        { totalCardsStudied: 0, totalCorrect: 0, totalTime: 0 }
      );

      const accuracy = aggregated.totalCardsStudied > 0
        ? Math.round((aggregated.totalCorrect / aggregated.totalCardsStudied) * 100)
        : 0;

      const computedStats: UserStats = {
        total_sets: transformedSets.length,
        total_flashcards: totalFlashcards,
        total_sessions: transformedSets.reduce((sum, set) => sum + set.study_sessions_count, 0),
        total_time_minutes: Math.round(aggregated.totalTime / 60),
        accuracy_percentage: accuracy,
      };
      setStats(computedStats);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSets = sets.filter(set =>
    set.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    set.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    set.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const recentSets = sets.slice(0, 5);

  const toggleFavorite = async (setId: string) => {
    try {
      const isCurrentlyFavorite = favoriteSetIds.has(setId);
      
      if (isCurrentlyFavorite) {
        // Remove from favorites
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user?.id)
          .eq("set_id", setId);
        
        if (error) throw error;
        
        setFavoriteSetIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(setId);
          return newSet;
        });
      } else {
        // Add to favorites
        const { error } = await supabase
          .from("favorites")
          .insert({
            user_id: user?.id,
            set_id: setId
          });
        
        if (error) throw error;
        
        setFavoriteSetIds(prev => new Set(prev).add(setId));
      }
      
      // Update the sets state
      setSets(prev => prev.map(set => 
        set.id === setId 
          ? { ...set, is_favorited: !isCurrentlyFavorite }
          : set
      ));
      
      // Update favorites list
      if (isCurrentlyFavorite) {
        setFavorites(prev => prev.filter(set => set.id !== setId));
      } else {
        const setToAdd = sets.find(set => set.id === setId);
        if (setToAdd) {
          setFavorites(prev => [...prev, { ...setToAdd, is_favorited: true }]);
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const shareSet = (setId: string, setTitle: string) => {
    setShareSetData({ id: setId, title: setTitle });
    setShareDialogOpen(true);
  };

  const deleteSet = async (setId: string) => {
    if (!confirm('Are you sure you want to delete this set? This action cannot be undone.')) {
      return;
    }
    
    try {
      // Delete flashcards first (due to foreign key constraint)
      const { error: flashcardsError } = await supabase
        .from("flashcards")
        .delete()
        .eq("set_id", setId);
      
      if (flashcardsError) throw flashcardsError;
      
      // Delete the set
      const { error: setError } = await supabase
        .from("sets")
        .delete()
        .eq("id", setId)
        .eq("user_id", user?.id);
      
      if (setError) throw setError;
      
      // Update local state
      setSets(prev => prev.filter(set => set.id !== setId));
      setFavorites(prev => prev.filter(set => set.id !== setId));
      setFavoriteSetIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(setId);
        return newSet;
      });
      
      // Update stats
      if (stats) {
        const deletedSet = sets.find(set => set.id === setId);
        if (deletedSet) {
          setStats(prev => prev ? {
            ...prev,
            total_sets: prev.total_sets - 1,
            total_flashcards: prev.total_flashcards - deletedSet.flashcard_count,
            total_sessions: prev.total_sessions - deletedSet.study_sessions_count
          } : null);
        }
      }
    } catch (error) {
      console.error('Error deleting set:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 pt-24">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Welcome back, {user?.user_metadata?.full_name || user?.email}
            </p>
          </div>
          <Link to="/create-set">
            <Button className="mt-4 sm:mt-0">
              <Plus className="w-4 h-4 mr-2" />
              Create New Set
            </Button>
          </Link>
        </div>


        {/* Stats Cards */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Sets</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_sets}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Cards</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_flashcards}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Study Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.floor(stats.total_time_minutes / 60)}h {stats.total_time_minutes % 60}m
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Accuracy</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.accuracy_percentage}%</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All Sets ({sets.length})</TabsTrigger>
            <TabsTrigger value="favorites">Favorites ({favorites.length})</TabsTrigger>
            <TabsTrigger value="recent">Recent</TabsTrigger>
            <TabsTrigger value="public">Public</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Sets Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSets.map((set) => (
                <Card key={set.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{set.title}</CardTitle>
                        <CardDescription className="mt-2">
                          {set.description || "No description"}
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleFavorite(set.id)}
                        className="p-1 h-auto"
                      >
                        <Star className={`h-4 w-4 ${set.is_favorited ? 'text-yellow-500 fill-current' : 'text-muted-foreground'}`} />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">
                          {set.flashcard_count} cards
                        </Badge>
                        <Badge variant="outline">
                          {set.study_sessions_count} sessions
                        </Badge>
                      </div>
                    </div>
                    
                    {set.tags && set.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {set.tags.slice(0, 3).map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {set.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{set.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <div className="text-xs text-muted-foreground">
                        Updated {new Date(set.updated_at).toLocaleDateString()}
                      </div>
                      <div className="flex space-x-2">
                        <Link to={`/set/${set.id}`}>
                          <Button size="sm" variant="outline">
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        </Link>
                        <Link to={`/edit-set/${set.id}`}>
                          <Button size="sm">
                            Edit
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => shareSet(set.id, set.title)}
                        >
                          <Share2 className="h-4 w-4 mr-2" />
                          Share
                      </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => deleteSet(set.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredSets.length === 0 && (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No sets found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? "Try adjusting your search terms" : "Create your first flashcard set to get started"}
                </p>
                {!searchTerm && (
                  <Link to="/create-set">
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Set
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="favorites" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {favorites.map((set) => (
                <Card key={set.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{set.title}</CardTitle>
                        <CardDescription className="mt-2">
                          {set.description || "No description"}
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleFavorite(set.id)}
                        className="p-1 h-auto"
                      >
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">
                          {set.flashcard_count} cards
                        </Badge>
                        <Badge variant="outline">
                          {set.study_sessions_count} sessions
                        </Badge>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="text-xs text-muted-foreground">
                        Favorited {new Date(set.created_at).toLocaleDateString()}
                      </div>
                      <div className="flex space-x-2">
                        <Link to={`/study/${set.id}`}>
                          <Button size="sm" variant="outline">
                            <Play className="h-3 w-3 mr-1" />
                            Study
                          </Button>
                        </Link>
                        <Link to={`/edit-set/${set.id}`}>
                          <Button size="sm">
                            Edit
                          </Button>
                        </Link>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => deleteSet(set.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {favorites.length === 0 && (
              <div className="text-center py-12">
                <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No favorites yet</h3>
                <p className="text-muted-foreground">
                  Start studying sets to add them to your favorites
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="recent" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentSets.map((set) => (
                <Card key={set.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">{set.title}</CardTitle>
                    <CardDescription className="mt-2">
                      {set.description || "No description"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">
                          {set.flashcard_count} cards
                        </Badge>
                        <Badge variant="outline">
                          {set.study_sessions_count} sessions
                        </Badge>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="text-xs text-muted-foreground">
                        Created {new Date(set.created_at).toLocaleDateString()}
                      </div>
                      <div className="flex space-x-2">
                        <Link to={`/study/${set.id}`}>
                          <Button size="sm" variant="outline">
                            <Play className="h-3 w-3 mr-1" />
                            Study
                          </Button>
                        </Link>
                        <Link to={`/edit-set/${set.id}`}>
                          <Button size="sm">
                            Edit
                          </Button>
                        </Link>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => deleteSet(set.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {recentSets.length === 0 && (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No recent sets</h3>
                <p className="text-muted-foreground">
                  Create your first set to see it here
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="public" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {publicSets.map((set) => (
                <Card key={set.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{set.title}</CardTitle>
                        <CardDescription className="mt-2">
                          {set.description || "No description"}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">
                          {set.flashcard_count} cards
                        </Badge>
                        <Badge variant="outline">
                          Public
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 mb-4 text-sm text-muted-foreground">
                      <User className="w-4 h-4" />
                      <span>By {set.creator_name || set.creator_username}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="text-xs text-muted-foreground">
                        Updated {new Date(set.updated_at).toLocaleDateString()}
                      </div>
                      <div className="flex space-x-2">
                        <Link to={`/set/${set.id}`}>
                          <Button size="sm" variant="outline">
                            <Play className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        </Link>
                        <Link to={`/study/${set.id}`}>
                          <Button size="sm">
                            Study
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => shareSet(set.id, set.title)}
                        >
                          <Share2 className="h-4 w-4 mr-2" />
                          Share
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {publicSets.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No public sets yet</h3>
                <p className="text-muted-foreground">Public sets from the community will appear here</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        {/* Share Dialog */}
        {shareSetData && (
          <ShareSetDialog
            open={shareDialogOpen}
            onOpenChange={setShareDialogOpen}
            setId={shareSetData.id}
            setTitle={shareSetData.title}
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;
