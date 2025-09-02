import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { ArrowLeft, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";

interface Flashcard {
  id: string;
  term: string;
  description: string;
  image_url?: string;
}

interface FlashcardSet {
  id: string;
  title: string;
  description: string;
  flashcards: Flashcard[];
}

const StudySet = () => {
  const { setId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [flashcardSet, setFlashcardSet] = useState<FlashcardSet | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studiedCards, setStudiedCards] = useState<number[]>([]);

  useEffect(() => {
    if (!setId) return;

    const fetchSet = async () => {
      try {
        const { data: setData, error: setError } = await supabase
          .from("sets")
          .select("*")
          .eq("id", setId)
          .single();

        if (setError) throw setError;

        const { data: flashcardsData, error: flashcardsError } = await supabase
          .from("flashcards")
          .select("*")
          .eq("set_id", setId)
          .order("created_at");

        if (flashcardsError) throw flashcardsError;

        setFlashcardSet({
          ...setData,
          flashcards: flashcardsData || [],
        });
      } catch (error) {
        console.error("Error fetching set:", error);
        toast.error("Failed to load flashcard set");
        navigate("/dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchSet();
  }, [setId, navigate]);

  const nextCard = () => {
    if (!flashcardSet) return;
    
    if (!studiedCards.includes(currentCardIndex)) {
      setStudiedCards([...studiedCards, currentCardIndex]);
    }
    
    if (currentCardIndex < flashcardSet.flashcards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setIsFlipped(false);
    }
  };

  const prevCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
      setIsFlipped(false);
    }
  };

  const resetStudy = () => {
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setStudiedCards([]);
  };

  const progress = flashcardSet ? (studiedCards.length / flashcardSet.flashcards.length) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!flashcardSet || flashcardSet.flashcards.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No flashcards found</h2>
          <p className="text-muted-foreground mb-4">This set doesn't have any flashcards yet.</p>
          <Button onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const currentCard = flashcardSet.flashcards[currentCardIndex];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>

          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-2">{flashcardSet.title}</h1>
            {flashcardSet.description && (
              <p className="text-muted-foreground">{flashcardSet.description}</p>
            )}
          </div>

          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">
                Progress: {studiedCards.length} / {flashcardSet.flashcards.length}
              </span>
              <span className="text-sm text-muted-foreground">
                Card {currentCardIndex + 1} of {flashcardSet.flashcards.length}
              </span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          <Card className="min-h-[300px] cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
            <CardContent className="p-8 flex items-center justify-center text-center">
              <div className="w-full">
                {!isFlipped ? (
                  <div>
                    <h3 className="text-lg font-medium text-muted-foreground mb-2">Term</h3>
                    <p className="text-2xl font-semibold">{currentCard.term}</p>
                    {currentCard.image_url && (
                      <img
                        src={currentCard.image_url}
                        alt="Flashcard"
                        className="mt-4 max-w-full h-auto mx-auto rounded-lg"
                      />
                    )}
                    <p className="text-sm text-muted-foreground mt-4">
                      Click to reveal answer
                    </p>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-lg font-medium text-muted-foreground mb-2">Definition</h3>
                    <p className="text-xl">{currentCard.description}</p>
                    <p className="text-sm text-muted-foreground mt-4">
                      Click to show term
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between items-center mt-6">
            <Button
              variant="outline"
              onClick={prevCard}
              disabled={currentCardIndex === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            <div className="flex gap-2">
              <Button variant="outline" onClick={resetStudy}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>

            <Button
              onClick={nextCard}
              disabled={currentCardIndex === flashcardSet.flashcards.length - 1}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          {currentCardIndex === flashcardSet.flashcards.length - 1 && isFlipped && (
            <div className="text-center mt-8">
              <h3 className="text-xl font-semibold mb-2">🎉 Congratulations!</h3>
              <p className="text-muted-foreground mb-4">
                You've completed this flashcard set!
              </p>
              <Button onClick={resetStudy}>Study Again</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudySet;