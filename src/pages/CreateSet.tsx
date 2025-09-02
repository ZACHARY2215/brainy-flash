import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Upload, Type, Brain } from "lucide-react";

interface Flashcard {
  id: string;
  term: string;
  description: string;
  image_url?: string;
}

const CreateSet = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("manual");

  // Set details
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  // Manual flashcards
  const [flashcards, setFlashcards] = useState<Flashcard[]>([
    { id: "1", term: "", description: "" }
  ]);

  // AI generation
  const [aiText, setAiText] = useState("");
  const [aiDelimiter, setAiDelimiter] = useState(":");
  const [aiCount, setAiCount] = useState(10);
  const [aiLoading, setAiLoading] = useState(false);

  const addFlashcard = () => {
    const newId = (flashcards.length + 1).toString();
    setFlashcards([...flashcards, { id: newId, term: "", description: "" }]);
  };

  const removeFlashcard = (id: string) => {
    if (flashcards.length > 1) {
      setFlashcards(flashcards.filter(card => card.id !== id));
    }
  };

  const updateFlashcard = (id: string, field: keyof Flashcard, value: string) => {
    setFlashcards(flashcards.map(card => 
      card.id === id ? { ...card, [field]: value } : card
    ));
  };

  const parseTextToFlashcards = (text: string, delimiter: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    const parsedCards: Flashcard[] = [];
    
    lines.forEach((line, index) => {
      if (line.includes(delimiter)) {
        const parts = line.split(delimiter);
        if (parts.length >= 2) {
          parsedCards.push({
            id: (flashcards.length + index + 1).toString(),
            term: parts[0].trim(),
            description: parts.slice(1).join(delimiter).trim()
          });
        }
      }
    });
    
    return parsedCards;
  };

  const generateWithAI = async () => {
    if (!aiText.trim()) {
      toast.error("Please enter some text to generate flashcards from");
      return;
    }

    setAiLoading(true);
    try {
      // First try to parse manually with delimiter
      const parsedCards = parseTextToFlashcards(aiText, aiDelimiter);
      
      if (parsedCards.length >= 3) {
        // If we have enough parsed cards, use them
        setFlashcards([...flashcards, ...parsedCards.slice(0, aiCount)]);
        setActiveTab("manual");
        toast.success(`Parsed ${parsedCards.length} flashcards from your text!`);
        return;
      }

      // Otherwise, use AI generation
      const { data, error } = await supabase.functions.invoke('generate-flashcards', {
        body: {
          text: aiText,
          delimiter: aiDelimiter,
          count: aiCount,
        },
      });

      if (error) throw error;

      const newFlashcards = data.flashcards.map((card: any, index: number) => ({
        id: (flashcards.length + index + 1).toString(),
        term: card.term,
        description: card.description,
      }));

      setFlashcards([...flashcards, ...newFlashcards]);
      setActiveTab("manual");
      toast.success(`Generated ${data.flashcards.length} flashcards!`);

    } catch (error) {
      console.error('AI generation error:', error);
      toast.error("Failed to generate flashcards. Try using a different format.");
    } finally {
      setAiLoading(false);
    }
  };

  const saveSet = async () => {
    if (!title.trim()) {
      toast.error("Please enter a title for your set");
      return;
    }

    const validFlashcards = flashcards.filter(card => 
      card.term.trim() && card.description.trim()
    );

    if (validFlashcards.length === 0) {
      toast.error("Please add at least one flashcard");
      return;
    }

    if (!user) {
      toast.error("Please sign in to create sets");
      return;
    }

    setLoading(true);
    try {
      // Create the set
      const { data: setData, error: setError } = await supabase
        .from('sets')
        .insert({
          title: title.trim(),
          description: description.trim(),
          is_public: isPublic,
          user_id: user.id,
        })
        .select()
        .single();

      if (setError) throw setError;

      // Add flashcards to the set
      const flashcardsToInsert = validFlashcards.map(card => ({
        set_id: setData.id,
        term: card.term.trim(),
        description: card.description.trim(),
        image_url: card.image_url,
      }));

      const { error: flashcardsError } = await supabase
        .from('flashcards')
        .insert(flashcardsToInsert);

      if (flashcardsError) throw flashcardsError;

      toast.success("Set created successfully!");
      navigate(`/study/${setData.id}`);

    } catch (error) {
      console.error('Save error:', error);
      toast.error("Failed to create set");
    } finally {
      setLoading(false);
    }
  };

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

          <h1 className="text-3xl font-bold mb-2">Create New Set</h1>
          <p className="text-muted-foreground">
            Create flashcards manually or generate them with AI
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          {/* Set Details */}
          <Card>
            <CardHeader>
              <CardTitle>Set Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter set title..."
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your set..."
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_public"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
                <Label htmlFor="is_public">Make this set public</Label>
              </div>
            </CardContent>
          </Card>

          {/* Flashcards */}
          <Card>
            <CardHeader>
              <CardTitle>Create Flashcards</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="manual">
                    <Type className="h-4 w-4 mr-2" />
                    Manual
                  </TabsTrigger>
                  <TabsTrigger value="text">
                    <Upload className="h-4 w-4 mr-2" />
                    Text Paste
                  </TabsTrigger>
                  <TabsTrigger value="ai">
                    <Brain className="h-4 w-4 mr-2" />
                    AI Generate
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="manual" className="space-y-4">
                  {flashcards.map((card) => (
                    <div key={card.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">Card {card.id}</h4>
                        {flashcards.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFlashcard(card.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Term</Label>
                          <Input
                            value={card.term}
                            onChange={(e) => updateFlashcard(card.id, 'term', e.target.value)}
                            placeholder="Enter term..."
                          />
                        </div>
                        <div>
                          <Label>Description</Label>
                          <Textarea
                            value={card.description}
                            onChange={(e) => updateFlashcard(card.id, 'description', e.target.value)}
                            placeholder="Enter description..."
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <Button onClick={addFlashcard} variant="outline" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Flashcard
                  </Button>
                </TabsContent>

                <TabsContent value="text" className="space-y-4">
                  <div>
                    <Label>Paste Text with Delimiter</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Paste text where each line contains "term{aiDelimiter} description"
                    </p>
                    <Textarea
                      value={aiText}
                      onChange={(e) => setAiText(e.target.value)}
                      placeholder={`Example:\nMitochondria: The powerhouse of the cell\nDNA: Deoxyribonucleic acid\nRNA: Ribonucleic acid`}
                      rows={8}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Delimiter</Label>
                      <Select value={aiDelimiter} onValueChange={setAiDelimiter}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value=":">Colon (:)</SelectItem>
                          <SelectItem value=" - ">Dash ( - )</SelectItem>
                          <SelectItem value=" | ">Pipe ( | )</SelectItem>
                          <SelectItem value="\t">Tab</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Max Cards</Label>
                      <Input
                        type="number"
                        value={aiCount}
                        onChange={(e) => setAiCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                        min="1"
                        max="50"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={generateWithAI}
                    disabled={aiLoading || !aiText.trim()}
                    className="w-full"
                  >
                    {aiLoading ? "Processing..." : "Parse Flashcards"}
                  </Button>
                </TabsContent>

                <TabsContent value="ai" className="space-y-4">
                  <div>
                    <Label>Study Material</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Paste any text and AI will generate flashcards automatically
                    </p>
                    <Textarea
                      value={aiText}
                      onChange={(e) => setAiText(e.target.value)}
                      placeholder="Paste your study material here (notes, textbook content, etc.)"
                      rows={8}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Output Format</Label>
                      <Select value={aiDelimiter} onValueChange={setAiDelimiter}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value=":">Term: Definition</SelectItem>
                          <SelectItem value=" - ">Term - Definition</SelectItem>
                          <SelectItem value=" | ">Term | Definition</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Number of Cards</Label>
                      <Input
                        type="number"
                        value={aiCount}
                        onChange={(e) => setAiCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                        min="1"
                        max="50"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={generateWithAI}
                    disabled={aiLoading || !aiText.trim()}
                    className="w-full"
                  >
                    {aiLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Generating with AI...
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4 mr-2" />
                        Generate with AI
                      </>
                    )}
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button onClick={saveSet} disabled={loading}>
              {loading ? "Creating..." : "Create Set"}
            </Button>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateSet;
