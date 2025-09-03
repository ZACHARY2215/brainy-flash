import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, BookOpen, User, Calendar, Star, Play } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface PreviewSet {
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
  flashcards: Array<{
    id: string;
    term: string;
    description: string;
    image_url?: string;
  }>;
}

const SetPreview = () => {
  const { setId, token } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [previewSet, setPreviewSet] = useState<PreviewSet | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!setId && !token) {
      setError('Invalid preview link');
      setLoading(false);
      return;
    }

    const fetchSet = async () => {
      try {
        let setData, flashcardsData;

        if (token) {
          // Fetch via shared link  
          const { data: sharedData, error: sharedError } = await supabase
            .from('shared_links')
            .select('set_id')
            .eq('share_token', token)
            .eq('is_active', true)
            .single();

          if (sharedError) throw new Error('Share link not found or expired');
          
          const { data: set, error: setError } = await supabase
            .from('sets')
            .select(`
              *,
              profiles (username, full_name)
            `)
            .eq('id', sharedData.set_id)
            .single();

          if (setError) throw setError;
          setData = set;
          
          const { data: cards, error: cardsError } = await supabase
            .from('flashcards')
            .select('*')
            .eq('set_id', sharedData.set_id)
            .order('created_at');

          if (cardsError) throw cardsError;
          flashcardsData = cards;
        } else {
          // Fetch public set directly
          const { data: set, error: setError } = await supabase
            .from('sets')
            .select(`
              *,
              profiles (username, full_name)
            `)
            .eq('id', setId)
            .eq('is_public', true)
            .single();

          if (setError) throw new Error('Set not found or not public');
          
          setData = set;
          
          const { data: cards, error: cardsError } = await supabase
            .from('flashcards')
            .select('*')
            .eq('set_id', setId)
            .order('created_at');

          if (cardsError) throw cardsError;
          flashcardsData = cards;
        }

        setPreviewSet({
          ...setData,
          flashcards: flashcardsData || [],
          creator_username: setData.profiles?.username || 'Anonymous',
          creator_name: setData.profiles?.full_name || 'Anonymous User'
        });
      } catch (error) {
        console.error('Error fetching set:', error);
        setError(error instanceof Error ? error.message : 'Failed to load set');
      } finally {
        setLoading(false);
      }
    };

    fetchSet();
  }, [setId, token]);

  const handleStudy = () => {
    if (user) {
      navigate(`/study/${previewSet?.id}`);
    } else {
      navigate(`/auth?redirect=/study/${previewSet?.id}`);
    }
  };

  const handleSaveToLibrary = async () => {
    if (!user || !previewSet) return;

    try {
      const { error } = await supabase
        .from('favorites')
        .insert({
          user_id: user.id,
          set_id: previewSet.id
        });

      if (error) throw error;
      toast.success('Set saved to your library!');
    } catch (error) {
      console.error('Error saving set:', error);
      toast.error('Failed to save set');
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

  if (error || !previewSet) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-6xl mb-4">📚</div>
          <h1 className="text-2xl font-bold mb-2">Set Not Found</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
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
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
          
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{previewSet.title}</h1>
              <p className="text-muted-foreground mb-4">{previewSet.description}</p>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>Created by {previewSet.creator_username || previewSet.creator_name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(previewSet.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  <span>{previewSet.flashcards.length} cards</span>
                </div>
              </div>
              
              {previewSet.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {previewSet.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex gap-2 ml-4">
              <Button onClick={handleStudy} className="flex items-center gap-2">
                <Play className="h-4 w-4" />
                {user ? 'Study Now' : 'Sign in to Study'}
              </Button>
              {user && (
                <Button variant="outline" onClick={handleSaveToLibrary}>
                  <Star className="h-4 w-4 mr-2" />
                  Save
                </Button>
              )}
            </div>
          </div>
        </div>

        <Separator className="mb-8" />

        {/* Flashcards Preview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {previewSet.flashcards.map((card, index) => (
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
              <Button size="lg" onClick={handleStudy}>
                <Play className="h-5 w-5 mr-2" />
                {user ? 'Start Studying' : 'Sign in to Study'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SetPreview;