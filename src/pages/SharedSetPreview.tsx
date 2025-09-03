import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BookOpen, 
  Clock, 
  User, 
  Share2, 
  Play,
  ExternalLink,
  Copy,
  Check
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { useToast } from "@/hooks/use-toast";

interface Flashcard {
  id: string;
  term: string;
  description: string;
  ai_review_notes?: string;
}

interface SharedSet {
  id: string;
  title: string;
  description: string;
  tags: string[];
  creator_username: string;
  creator_name: string;
  flashcard_count: number;
  created_at: string;
  updated_at: string;
  flashcards: Flashcard[];
  user_access: string;
  is_shared: boolean;
}

const SharedSetPreview = () => {
  const { token } = useParams<{ token: string }>();
  const [set, setSet] = useState<SharedSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (token) {
      fetchSharedSet();
    }
  }, [token]);

  const fetchSharedSet = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/sharing/shared/${token}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('This shared link is no longer available or has expired.');
        } else {
          setError('Failed to load the shared set.');
        }
        return;
      }
      
      const data = await response.json();
      setSet(data);
    } catch (error) {
      console.error('Error fetching shared set:', error);
      setError('Failed to load the shared set.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast({
        title: "Link copied!",
        description: "The link has been copied to your clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareToSocial = (platform: string) => {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(set?.title || 'Check out this flashcard set!');
    
    let shareUrl = '';
    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${title}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
        break;
      case 'email':
        shareUrl = `mailto:?subject=${title}&body=Check out this flashcard set: ${url}`;
        break;
      default:
        return;
    }
    
    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 pt-24">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !set) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 pt-24">
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-4">Set Not Available</h1>
            <p className="text-muted-foreground mb-6">
              {error || 'The shared set could not be loaded.'}
            </p>
            <Link to="/">
              <Button>
                <BookOpen className="w-4 h-4 mr-2" />
                Browse Other Sets
              </Button>
            </Link>
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
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="text-sm">
                  <Share2 className="w-3 h-3 mr-1" />
                  Shared Set
                </Badge>
                {set.user_access === 'owner' && (
                  <Badge variant="default" className="text-sm">
                    <User className="w-3 h-3 mr-1" />
                    Owner
                  </Badge>
                )}
                {set.user_access === 'editor' && (
                  <Badge variant="outline" className="text-sm">
                    <User className="w-3 h-3 mr-1" />
                    Editor
                  </Badge>
                )}
                {set.user_access === 'viewer' && (
                  <Badge variant="outline" className="text-sm">
                    <User className="w-3 h-3 mr-1" />
                    Viewer
                  </Badge>
                )}
              </div>
              
              <h1 className="text-3xl font-bold mb-2">{set.title}</h1>
              <p className="text-muted-foreground text-lg mb-4">
                {set.description || "No description provided"}
              </p>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span>Created by {set.creator_name || set.creator_username}</span>
                </div>
                <div className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4" />
                  <span>{set.flashcard_count} cards</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>Updated {new Date(set.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 mt-4 sm:mt-0">
              <Button onClick={copyToClipboard} variant="outline">
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link
                  </>
                )}
              </Button>
              
              {set.user_access === 'owner' || set.user_access === 'editor' ? (
                <Link to={`/study/${set.id}`}>
                  <Button>
                    <Play className="w-4 h-4 mr-2" />
                    Study Set
                  </Button>
                </Link>
              ) : (
                <Link to={`/set/${set.id}`}>
                  <Button>
                    <BookOpen className="w-4 h-4 mr-2" />
                    View Set
                  </Button>
                </Link>
              )}
            </div>
          </div>
          
          {/* Tags */}
          {set.tags && set.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {set.tags.map((tag, index) => (
                <Badge key={index} variant="outline" className="text-sm">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          
          {/* Share Options */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-medium mb-3">Share this set:</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => shareToSocial('facebook')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Facebook
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => shareToSocial('twitter')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Twitter
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => shareToSocial('linkedin')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                LinkedIn
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => shareToSocial('email')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Email
              </Button>
            </div>
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="cards" className="space-y-4">
          <TabsList>
            <TabsTrigger value="cards">Flashcards ({set.flashcard_count})</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="cards" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {set.flashcards.map((card, index) => (
                <Card key={card.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Card {index + 1}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">Term</h4>
                      <p className="text-base">{card.term}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">Description</h4>
                      <p className="text-base">{card.description}</p>
                    </div>
                    {card.ai_review_notes && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-1">AI Review Notes</h4>
                        <p className="text-sm text-muted-foreground">{card.ai_review_notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-6">
              <h3 className="text-lg font-medium mb-4">Study Preview</h3>
              <p className="text-muted-foreground mb-4">
                This is a preview of the shared flashcard set. To study the full set and track your progress, 
                you'll need to sign in or create an account.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/auth">
                  <Button>
                    <User className="w-4 h-4 mr-2" />
                    Sign In to Study
                  </Button>
                </Link>
                <Link to="/">
                  <Button variant="outline">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Browse More Sets
                  </Button>
                </Link>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SharedSetPreview;
