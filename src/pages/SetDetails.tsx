import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, BookOpen, User, Calendar, Star, Play, Target, Clock, TrendingUp, BarChart3 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface FlashcardWithProgress {
  id: string;
  term: string;
  description: string;
  image_url?: string;
  correct_count?: number;
  incorrect_count?: number;
  difficulty_rating?: string;
}

interface SetDetails {
  id: string;
  title: string;
  description: string;
  tags: string[];
  is_public: boolean;
  created_at: string;
  updated_at: string;
  user_id: string;
  creator_username?: string;
  creator_name?: string;
  flashcards: FlashcardWithProgress[];
}

interface StudyStats {
  total_sessions: number;
  total_time_minutes: number;
  accuracy_percentage: number;
  cards_mastered: number;
}

const SetDetails = () => {
  const { setId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [setDetails, setSetDetails] = useState<SetDetails | null>(null);
  const [studyStats, setStudyStats] = useState<StudyStats | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);

  useEffect(() => {
    if (!setId) return;
    fetchSetDetails();
  }, [setId, user]);

  const fetchSetDetails = async () => {
    try {
      const { data: setData, error: setError } = await supabase
        .from('sets')
        .select('*')
        .eq('id', setId)
        .single();

      if (setError) {
        if (setError.code === 'PGRST116') {
          setErrorMessage('Set not found');
        } else {
          throw setError;
        }
        return;
      }

      // Check access permissions
      const hasAccess = setData.is_public || setData.user_id === user?.id;
      
      if (!hasAccess && user) {
        // Check if user is a collaborator
        const { data: collaboration } = await supabase
          .from('collaborators')
          .select('permission')
          .eq('set_id', setId)
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (!collaboration) {
          setErrorMessage('You do not have permission to view this set');
          return;
        }
      }

      if (!hasAccess && !user) {
        setErrorMessage('This set is private. Please sign in to view it.');
        return;
      }

      // Fetch flashcards
      const { data: flashcardsData, error: flashcardsError } = await supabase
        .from('flashcards')
        .select('*')
        .eq('set_id', setId)
        .order('created_at');

      if (flashcardsError) throw flashcardsError;

      // Get creator info
      let creatorInfo = { username: 'Anonymous', full_name: 'Anonymous User' };
      if (setData.user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, full_name')
          .eq('user_id', setData.user_id)
          .maybeSingle();
        
        if (profile) {
          creatorInfo = profile;
        }
      }

      setSetDetails({
        ...setData,
        flashcards: flashcardsData || [],
        creator_username: creatorInfo.username,
        creator_name: creatorInfo.full_name
      });

      // Check if favorited and fetch study stats
      if (user) {
        const { data: favorite } = await supabase
          .from('favorites')
          .select('id')
          .eq('user_id', user.id)
          .eq('set_id', setId)
          .maybeSingle();
        
        setIsFavorited(!!favorite);

        // Fetch study stats
        const { data: sessions } = await supabase
          .from('study_sessions')
          .select('cards_studied, correct_answers, total_time_seconds')
          .eq('user_id', user.id)
          .eq('set_id', setId);

        if (sessions && sessions.length > 0) {
          const totalSessions = sessions.length;
          const totalTime = sessions.reduce((sum, s) => sum + (s.total_time_seconds || 0), 0);
          const totalCards = sessions.reduce((sum, s) => sum + (s.cards_studied || 0), 0);
          const totalCorrect = sessions.reduce((sum, s) => sum + (s.correct_answers || 0), 0);
          
          setStudyStats({
            total_sessions: totalSessions,
            total_time_minutes: Math.round(totalTime / 60),
            accuracy_percentage: totalCards > 0 ? Math.round((totalCorrect / totalCards) * 100) : 0,
            cards_mastered: 0 // Will be calculated based on individual card progress
          });
        }
      }
    } catch (error) {
      console.error('Error fetching set details:', error);
      setErrorMessage('Failed to load set details');
    } finally {
      setLoading(false);
    }
  };

  const handleStudy = () => {
    if (user) {
      navigate(`/study/${setId}`);
    } else {
      navigate(`/auth?redirect=/study/${setId}`);
    }
  };

  const handleTest = () => {
    if (user) {
      navigate(`/test/${setId}`);
    } else {
      navigate(`/auth?redirect=/test/${setId}`);
    }
  };

  const toggleFavorite = async () => {
    if (!user) {
      navigate(`/auth?redirect=/set/${setId}`);
      return;
    }

    try {
      if (isFavorited) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('set_id', setId);
        
        if (error) throw error;
        setIsFavorited(false);
        toast.success('Removed from favorites');
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert({
            user_id: user.id,
            set_id: setId
          });
        
        if (error) throw error;
        setIsFavorited(true);
        toast.success('Added to favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorites');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading set...</p>
        </div>
      </div>
    );
  }

  if (errorMessage || !setDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-6xl mb-4">📚</div>
          <h1 className="text-2xl font-bold mb-2">Set Not Found</h1>
          <p className="text-muted-foreground mb-6">{errorMessage}</p>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{setDetails.title}</h1>
              <p className="text-muted-foreground mb-4">{setDetails.description}</p>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>Created by {setDetails.creator_username || setDetails.creator_name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(setDetails.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  <span>{setDetails.flashcards.length} cards</span>
                </div>
              </div>
              
              {setDetails.tags && setDetails.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {setDetails.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex gap-2 ml-4">
              {user && (
                <Button
                  variant="outline"
                  onClick={toggleFavorite}
                  className="flex items-center gap-2"
                >
                  <Star className={`h-4 w-4 ${isFavorited ? 'text-yellow-500 fill-current' : ''}`} />
                  {isFavorited ? 'Favorited' : 'Favorite'}
                </Button>
              )}
              <Button onClick={handleStudy} className="flex items-center gap-2">
                <Play className="h-4 w-4" />
                {user ? 'Study' : 'Sign in to Study'}
              </Button>
              <Button variant="outline" onClick={handleTest}>
                <Target className="h-4 w-4 mr-2" />
                Test
              </Button>
            </div>
          </div>
        </div>

        {/* Study Stats */}
        {studyStats && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Sessions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{studyStats.total_sessions}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Study Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Math.floor(studyStats.total_time_minutes / 60)}h {studyStats.total_time_minutes % 60}m
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Accuracy
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{studyStats.accuracy_percentage}%</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Mastered
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{studyStats.cards_mastered}</div>
                </CardContent>
              </Card>
            </div>
            <Separator className="mb-8" />
          </>
        )}

        {/* Flashcards Preview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {setDetails.flashcards.map((card, index) => (
            <Card key={card.id} className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Card {index + 1}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-1">Term</h4>
                  <p className="text-base">{card.term}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-1">Definition</h4>
                  <p className="text-base">{card.description}</p>
                </div>
                {card.image_url && (
                  <div>
                    <img
                      src={card.image_url}
                      alt={card.term}
                      className="w-full h-32 object-cover rounded-md"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Call to Action */}
        <div className="mt-12 text-center">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-8">
              <h3 className="text-xl font-semibold mb-2">Ready to Study?</h3>
              <p className="text-muted-foreground mb-6">
                {user 
                  ? "Start studying this set to improve your knowledge!"
                  : "Sign in to study this set and track your progress!"
                }
              </p>
              <div className="flex gap-3 justify-center">
                <Button size="lg" onClick={handleStudy}>
                  <Play className="h-5 w-5 mr-2" />
                  {user ? 'Start Studying' : 'Sign in to Study'}
                </Button>
                <Button size="lg" variant="outline" onClick={handleTest}>
                  <Target className="h-5 w-5 mr-2" />
                  Test Yourself
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SetDetails;