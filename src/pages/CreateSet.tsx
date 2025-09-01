import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Upload, 
  FileText, 
  Sparkles,
  Save,
  X
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { toast } from "sonner";

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
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isCollaborative, setIsCollaborative] = useState(false);
  
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

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const generateWithAI = async () => {
    if (!aiText.trim()) {
      toast.error("Please enter some text to generate flashcards from");
      return;
    }

    setAiLoading(true);
    try {
      const token = (await import("@/integrations/supabase/client")).supabase.auth.getSession();
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/ai/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: aiText,
          delimiter: aiDelimiter,
          count: aiCount,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate flashcards');
      }

      const data = await response.json();
      
      // Add generated flashcards to the manual tab
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
      toast.error("Failed to generate flashcards");
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

    setLoading(true);
    try {
      const token = (await import("@/integrations/supabase/client")).supabase.auth.getSession();
      
      // Create the set
      const setResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/sets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          tags,
          is_public: isPublic,
          is_collaborative: isCollaborative,
        }),
      });

      if (!setResponse.ok) {
        throw new Error('Failed to create set');
      }

      const setData = await setResponse.json();

      // Add flashcards to the set
      const flashcardsResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/flashcards/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          set_id: setData.id,
          flashcards: validFlashcards.map(card => ({
            term: card.term.trim(),
            description: card.description.trim(),
          })),
        }),
      });

      if (!flashcardsResponse.ok) {
        throw new Error('Failed to add flashcards');
      }

      toast.success("Set created successfully!");
      navigate(`/edit-set/${setData.id}`);
      
    } catch (error) {
      console.error('Save error:', error);
      toast.error("Failed to create set");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Create New Set</h1>
            <p className="text-muted-foreground">
              Create a new flashcard set to help you study
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Set Details */}
            <Card>
              <CardHeader>
                <CardTitle>Set Details</CardTitle>
                <CardDescription>
                  Basic information about your flashcard set
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter set title..."
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your set..."
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Tags</Label>
                  <div className="flex flex-wrap gap-2 mt-2 mb-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Add a tag..."
                      onKeyPress={(e) => e.key === 'Enter' && addTag()}
                    />
                    <Button onClick={addTag} variant="outline" size="sm">
                      Add
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Public Set</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow others to find and study this set
                    </p>
                  </div>
                  <Switch
                    checked={isPublic}
                    onCheckedChange={setIsPublic}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Collaborative</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow others to edit this set
                    </p>
                  </div>
                  <Switch
                    checked={isCollaborative}
                    onCheckedChange={setIsCollaborative}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Flashcards */}
            <Card>
              <CardHeader>
                <CardTitle>Flashcards</CardTitle>
                <CardDescription>
                  Add terms and their definitions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                    <TabsTrigger value="ai">AI Generation</TabsTrigger>
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
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        
                        <div>
                          <Label>Term</Label>
                          <Input
                            value={card.term}
                            onChange={(e) => updateFlashcard(card.id, 'term', e.target.value)}
                            placeholder="Enter term..."
                            className="mt-1"
                          />
                        </div>
                        
                        <div>
                          <Label>Description</Label>
                          <Textarea
                            value={card.description}
                            onChange={(e) => updateFlashcard(card.id, 'description', e.target.value)}
                            placeholder="Enter description..."
                            className="mt-1"
                            rows={2}
                          />
                        </div>
                      </div>
                    ))}
                    
                    <Button onClick={addFlashcard} variant="outline" className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Flashcard
                    </Button>
                  </TabsContent>

                  <TabsContent value="ai" className="space-y-4">
                    <div>
                      <Label>Text Content</Label>
                      <Textarea
                        value={aiText}
                        onChange={(e) => setAiText(e.target.value)}
                        placeholder="Paste your text here or upload a document..."
                        className="mt-1"
                        rows={6}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Delimiter</Label>
                        <Input
                          value={aiDelimiter}
                          onChange={(e) => setAiDelimiter(e.target.value)}
                          placeholder=":"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Number of Cards</Label>
                        <Input
                          type="number"
                          value={aiCount}
                          onChange={(e) => setAiCount(parseInt(e.target.value))}
                          min="1"
                          max="50"
                          className="mt-1"
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
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Generate Flashcards
                        </>
                      )}
                    </Button>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
                <CardDescription>
                  How your set will appear
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold">{title || "Untitled Set"}</h3>
                  <p className="text-sm text-muted-foreground">
                    {description || "No description"}
                  </p>
                </div>
                
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                
                <div className="text-sm text-muted-foreground">
                  {flashcards.filter(card => card.term.trim() && card.description.trim()).length} cards
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={saveSet} 
                  disabled={loading || !title.trim()}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Create Set
                    </>
                  )}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => navigate(-1)}
                  className="w-full"
                >
                  Cancel
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateSet;
