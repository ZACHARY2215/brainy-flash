import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

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
  is_public: boolean;
  flashcards: Flashcard[];
}

const EditSet = () => {
  const { setId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [flashcardSet, setFlashcardSet] = useState<FlashcardSet | null>(null);

  useEffect(() => {
    if (!setId || !user) return;

    const fetchSet = async () => {
      try {
        const { data: setData, error: setError } = await supabase
          .from("sets")
          .select("*")
          .eq("id", setId)
          .eq("user_id", user.id)
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
  }, [setId, user, navigate]);

  const updateSetDetails = (field: string, value: string | boolean) => {
    if (!flashcardSet) return;
    setFlashcardSet({
      ...flashcardSet,
      [field]: value,
    });
  };

  const updateFlashcard = (index: number, field: string, value: string) => {
    if (!flashcardSet) return;
    const updatedFlashcards = [...flashcardSet.flashcards];
    updatedFlashcards[index] = {
      ...updatedFlashcards[index],
      [field]: value,
    };
    setFlashcardSet({
      ...flashcardSet,
      flashcards: updatedFlashcards,
    });
  };

  const addFlashcard = () => {
    if (!flashcardSet) return;
    const newFlashcard: Flashcard = {
      id: `temp-${Date.now()}`,
      term: "",
      description: "",
    };
    setFlashcardSet({
      ...flashcardSet,
      flashcards: [...flashcardSet.flashcards, newFlashcard],
    });
  };

  const removeFlashcard = (index: number) => {
    if (!flashcardSet) return;
    const updatedFlashcards = flashcardSet.flashcards.filter((_, i) => i !== index);
    setFlashcardSet({
      ...flashcardSet,
      flashcards: updatedFlashcards,
    });
  };

  const saveChanges = async () => {
    if (!flashcardSet || !user) return;

    setSaving(true);
    try {
      // Update set details
      const { error: setError } = await supabase
        .from("sets")
        .update({
          title: flashcardSet.title,
          description: flashcardSet.description,
          is_public: flashcardSet.is_public,
        })
        .eq("id", setId);

      if (setError) throw setError;

      // Delete existing flashcards
      const { error: deleteError } = await supabase
        .from("flashcards")
        .delete()
        .eq("set_id", setId);

      if (deleteError) throw deleteError;

      // Insert updated flashcards
      if (flashcardSet.flashcards.length > 0) {
        const flashcardsToInsert = flashcardSet.flashcards
          .filter(card => card.term.trim() && card.description.trim())
          .map(card => ({
            set_id: setId,
            term: card.term,
            description: card.description,
            image_url: card.image_url,
          }));

        if (flashcardsToInsert.length > 0) {
          const { error: insertError } = await supabase
            .from("flashcards")
            .insert(flashcardsToInsert);

          if (insertError) throw insertError;
        }
      }

      toast.success("Changes saved successfully!");
      navigate("/dashboard");
    } catch (error) {
      console.error("Error saving changes:", error);
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!flashcardSet) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Set not found</div>
      </div>
    );
  }

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

          <Card>
            <CardHeader>
              <CardTitle>Edit Flashcard Set</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={flashcardSet.title}
                  onChange={(e) => updateSetDetails("title", e.target.value)}
                  placeholder="Enter set title"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={flashcardSet.description || ""}
                  onChange={(e) => updateSetDetails("description", e.target.value)}
                  placeholder="Enter set description"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_public"
                  checked={flashcardSet.is_public}
                  onChange={(e) => updateSetDetails("is_public", e.target.checked)}
                />
                <label htmlFor="is_public" className="text-sm font-medium">
                  Make this set public
                </label>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Flashcards</h2>
            <Button onClick={addFlashcard} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Card
            </Button>
          </div>

          {flashcardSet.flashcards.map((card, index) => (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Term</label>
                    <Input
                      value={card.term}
                      onChange={(e) => updateFlashcard(index, "term", e.target.value)}
                      placeholder="Enter term"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      value={card.description}
                      onChange={(e) => updateFlashcard(index, "description", e.target.value)}
                      placeholder="Enter description"
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removeFlashcard(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 flex gap-4">
          <Button onClick={saveChanges} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditSet;