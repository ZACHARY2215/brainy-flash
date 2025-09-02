import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, BookOpenCheck, Target } from "lucide-react";

interface Flashcard {
  id: string;
  term: string;
  description: string;
}

interface FlashcardSet {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  flashcards: Flashcard[];
}

const SetDetails = () => {
  const { setId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [flashcardSet, setFlashcardSet] = useState<FlashcardSet | null>(null);

  useEffect(() => {
    if (!setId) return;

    const fetchSet = async () => {
      try {
        const { data: setData, error: setError } = await supabase
          .from("sets")
          .select("id, title, description, is_public")
          .eq("id", setId)
          .single();

        if (setError) throw setError;

        const { data: flashcardsData, error: flashcardsError } = await supabase
          .from("flashcards")
          .select("id, term, description")
          .eq("set_id", setId)
          .order("created_at");

        if (flashcardsError) throw flashcardsError;

        setFlashcardSet({
          id: setData.id,
          title: setData.title,
          description: setData.description,
          is_public: setData.is_public,
          flashcards: flashcardsData || [],
        });
      } catch (error) {
        console.error("Error fetching set details:", error);
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    fetchSet();
  }, [setId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 pt-24">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  if (!flashcardSet) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 pt-24">
          <div className="text-center">Set not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold mb-2">{flashcardSet.title}</h1>
            {flashcardSet.description && (
              <p className="text-muted-foreground max-w-2xl mx-auto">{flashcardSet.description}</p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
            <Button onClick={() => navigate(`/study/${flashcardSet.id}`)}>
              <BookOpenCheck className="h-4 w-4 mr-2" />
              Study with Flashcards
            </Button>
            <Button onClick={() => navigate(`/test/${flashcardSet.id}`)} variant="outline">
              <Target className="h-4 w-4 mr-2" />
              Test Yourself
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            {flashcardSet.flashcards.length === 0 ? (
              <div className="text-center text-muted-foreground">No terms available for this set.</div>
            ) : (
              <div className="divide-y">
                {flashcardSet.flashcards.map((card) => (
                  <div key={card.id} className="py-4">
                    <div className="font-semibold text-lg">{card.term}</div>
                    <div className="text-muted-foreground mt-1">{card.description}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SetDetails;


