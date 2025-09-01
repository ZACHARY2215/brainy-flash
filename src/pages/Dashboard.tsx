import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
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
  BarChart3
} from "lucide-react";
import { Navbar } from "@/components/Navbar";

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
  const [sets, setSets] = useState<FlashcardSet[]>([]);
  const [favorites, setFavorites] = useState<FlashcardSet[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = (await import("@/integrations/supabase/client")).supabase.auth.getSession();
      
      // Fetch user's sets
      const setsResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/sets?user_id=${user?.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const setsData = await setsResponse.json();
      setSets(setsData);

      // Fetch favorites
      const favoritesResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/sets/user/favorites`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const favoritesData = await favoritesResponse.json();
      setFavorites(favoritesData);

      // Fetch user stats
      const statsResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const statsData = await statsResponse.json();
      setStats(statsData);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
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
      
      <div className="container mx-auto px-4 py-8">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
                <CardTitle className="text-sm font-medium">Total Flashcards</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
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
                <div className="text-2xl font-bold">{stats.total_time_minutes}m</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Accuracy</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
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
                      {set.is_favorited && (
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      )}
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
                        <Link to={`/study/${set.id}`}>
                          <Button size="sm" variant="outline">
                            Study
                          </Button>
                        </Link>
                        <Link to={`/edit-set/${set.id}`}>
                          <Button size="sm">
                            Edit
                          </Button>
                        </Link>
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
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
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
                        Favorited {new Date(set.favorited_at).toLocaleDateString()}
                      </div>
                      <div className="flex space-x-2">
                        <Link to={`/study/${set.id}`}>
                          <Button size="sm" variant="outline">
                            Study
                          </Button>
                        </Link>
                        <Link to={`/edit-set/${set.id}`}>
                          <Button size="sm">
                            Edit
                          </Button>
                        </Link>
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
                            Study
                          </Button>
                        </Link>
                        <Link to={`/edit-set/${set.id}`}>
                          <Button size="sm">
                            Edit
                          </Button>
                        </Link>
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
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
