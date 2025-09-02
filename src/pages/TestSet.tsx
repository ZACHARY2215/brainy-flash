import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle, XCircle, RotateCcw, Target, Trophy, Shuffle, GripVertical } from "lucide-react";


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

interface TestQuestion {
  flashcard: Flashcard;
  userAnswer: string;
  isCorrect: boolean;
  testType: 'identification' | 'multiple-choice' | 'matching';
  options?: string[];
}

type TestType = 'identification' | 'multiple-choice' | 'matching';

const TestSet = () => {
  const { setId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [flashcardSet, setFlashcardSet] = useState<FlashcardSet | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [showAnswer, setShowAnswer] = useState(false);
  const [testResults, setTestResults] = useState<TestQuestion[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [shuffledFlashcards, setShuffledFlashcards] = useState<Flashcard[]>([]);
  const [testType, setTestType] = useState<TestType>('identification');
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [currentOptions, setCurrentOptions] = useState<string[]>([]);
  const [matchingPairs, setMatchingPairs] = useState<{definition: string, term: string, matched: boolean}[]>([]);
  const [availableTerms, setAvailableTerms] = useState<string[]>([]);
  const [draggedTerm, setDraggedTerm] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

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

        const set = {
          ...setData,
          flashcards: flashcardsData || [],
        };

        setFlashcardSet(set);
        
        // Shuffle flashcards for testing
        const shuffled = [...(flashcardsData || [])].sort(() => Math.random() - 0.5);
        setShuffledFlashcards(shuffled);
        
        // Set up matching test data
        const matchingData = shuffled.map(card => ({
          definition: card.description,
          term: card.term,
          matched: false
        }));
        setMatchingPairs(matchingData);
        setAvailableTerms(shuffled.map(card => card.term).sort(() => Math.random() - 0.5));

        // Start a study session for this test
        if (user?.id) {
          const { data: newSession, error: sessionError } = await supabase
            .from('study_sessions')
            .insert({ user_id: user.id, set_id: setId, mode: 'test' })
            .select('id')
            .single();
          if (!sessionError && newSession?.id) {
            setSessionId(newSession.id);
          }
        }
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

  // Generate multiple choice options
  const generateMultipleChoiceOptions = (correctAnswer: string, allTerms: string[]): string[] => {
    const options = [correctAnswer];
    const otherTerms = allTerms.filter(term => term !== correctAnswer);
    
    // Shuffle and take 3 random incorrect options
    const shuffled = otherTerms.sort(() => Math.random() - 0.5);
    options.push(...shuffled.slice(0, 3));
    
    // Shuffle the final options
    return options.sort(() => Math.random() - 0.5);
  };

  // Update options when test type or current card changes
  useEffect(() => {
    if (testType === 'multiple-choice' && shuffledFlashcards.length > 0) {
      const currentFlashcard = shuffledFlashcards[currentQuestionIndex];
      const allTerms = shuffledFlashcards.map(card => card.term);
      const options = generateMultipleChoiceOptions(currentFlashcard.term, allTerms);
      setCurrentOptions(options);
    }
  }, [testType, currentQuestionIndex, shuffledFlashcards]);

  // Drag and drop handlers for matching test
  const handleDragStart = (e: React.DragEvent, term: string) => {
    setDraggedTerm(term);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, definition: string) => {
    e.preventDefault();
    if (!draggedTerm) return;

    // Update matching pairs
    setMatchingPairs(prev => prev.map(pair => 
      pair.definition === definition 
        ? { ...pair, term: draggedTerm, matched: true }
        : pair
    ));

    // Remove term from available terms
    setAvailableTerms(prev => prev.filter(term => term !== draggedTerm));
    setDraggedTerm(null);
  };

  // Mobile tap support for matching
  const handleTermTap = (term: string) => {
    setDraggedTerm(term);
  };
  const handleDefinitionTap = (definition: string) => {
    if (!draggedTerm) return;
    setMatchingPairs(prev => prev.map(pair => 
      pair.definition === definition 
        ? { ...pair, term: draggedTerm, matched: true }
        : pair
    ));
    setAvailableTerms(prev => prev.filter(term => term !== draggedTerm));
    setDraggedTerm(null);
  };

  const removeMatch = (definition: string) => {
    const pair = matchingPairs.find(p => p.definition === definition);
    if (pair && pair.matched) {
      // Add term back to available terms
      setAvailableTerms(prev => [...prev, pair.term].sort(() => Math.random() - 0.5));
      
      // Remove match
      setMatchingPairs(prev => prev.map(p => 
        p.definition === definition 
          ? { ...p, term: '', matched: false }
          : p
      ));
    }
  };

  const handleSubmitAnswer = async () => {
    if (testType === 'matching') {
      // For matching test, check all pairs
      const allMatched = matchingPairs.every(pair => pair.matched);
      if (!allMatched) {
        toast.error("Please match all definitions with their terms");
        return;
      }

      // Check correctness for each pair
      const results = matchingPairs.map(pair => {
        const correctTerm = shuffledFlashcards.find(card => card.description === pair.definition)?.term;
        return {
          flashcard: shuffledFlashcards.find(card => card.description === pair.definition)!,
          userAnswer: pair.term,
          isCorrect: pair.term === correctTerm,
          testType: 'matching' as const
        };
      });

      setTestResults([...testResults, ...results]);
      setIsCompleted(true);
      // Update session with final results
      if (sessionId && user?.id) {
        const totalCards = results.length;
        const correct = results.filter(r => r.isCorrect).length;
        const { error: updateErr } = await supabase
          .from('study_sessions')
          .update({
            cards_studied: totalCards,
            correct_answers: correct,
            completed_at: new Date().toISOString(),
          })
          .eq('id', sessionId)
          .eq('user_id', user.id);
        if (updateErr) {
          console.error('Failed to update study session', updateErr);
        }
      }
      return;
    }

    const currentFlashcard = shuffledFlashcards[currentQuestionIndex];
    let answer = '';
    let isCorrect = false;

    if (testType === 'identification') {
      if (!userAnswer.trim()) return;
      answer = userAnswer.trim();
      isCorrect = answer.toLowerCase() === currentFlashcard.term.toLowerCase();
    } else if (testType === 'multiple-choice') {
      if (!selectedAnswer) return;
      answer = selectedAnswer;
      isCorrect = answer === currentFlashcard.term;
    }

    const questionResult: TestQuestion = {
      flashcard: currentFlashcard,
      userAnswer: answer,
      isCorrect,
      testType,
      options: testType === 'multiple-choice' ? currentOptions : undefined
    };

    setTestResults([...testResults, questionResult]);
    setShowAnswer(true);
    // If last question, update session summary
    if (currentQuestionIndex === shuffledFlashcards.length - 1 && sessionId && user?.id) {
      const totalCards = testResults.length + 1; // including current
      const correct = testResults.filter(q => q.isCorrect).length + (isCorrect ? 1 : 0);
      const { error: updateErr } = await supabase
        .from('study_sessions')
        .update({
          cards_studied: totalCards,
          correct_answers: correct,
          completed_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
        .eq('user_id', user.id);
      if (updateErr) {
        console.error('Failed to update study session', updateErr);
      }
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < shuffledFlashcards.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setUserAnswer("");
      setSelectedAnswer("");
      setShowAnswer(false);
    } else {
      setIsCompleted(true);
    }
  };

  const resetTest = () => {
    setCurrentQuestionIndex(0);
    setUserAnswer("");
    setSelectedAnswer("");
    setShowAnswer(false);
    setTestResults([]);
    setIsCompleted(false);
    // Reshuffle flashcards
    const shuffled = [...(flashcardSet?.flashcards || [])].sort(() => Math.random() - 0.5);
    setShuffledFlashcards(shuffled);
    
    // Reset matching test data
    const matchingData = shuffled.map(card => ({
      definition: card.description,
      term: card.term,
      matched: false
    }));
    setMatchingPairs(matchingData);
    setAvailableTerms(shuffled.map(card => card.term).sort(() => Math.random() - 0.5));
  };

  const progress = testType === 'matching' 
    ? (matchingPairs.filter(pair => pair.matched).length / matchingPairs.length) * 100
    : shuffledFlashcards.length > 0 ? ((currentQuestionIndex + 1) / shuffledFlashcards.length) * 100 : 0;
  const currentFlashcard = shuffledFlashcards[currentQuestionIndex];
  const correctAnswers = testResults.filter(q => q.isCorrect).length;
  const accuracy = testResults.length > 0 ? (correctAnswers / testResults.length) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  if (!flashcardSet || shuffledFlashcards.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">No flashcards found</h2>
            <p className="text-muted-foreground mb-4">This set doesn't have any flashcards to test.</p>
            <Button onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show test completion screen
  if (isCompleted) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-6">
              <Button
                variant="ghost"
                onClick={() => navigate("/dashboard")}
                className="mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>

            <Card className="p-8">
              <CardContent className="space-y-6">
                <div className="flex justify-center">
                  <Trophy className="h-16 w-16 text-yellow-500" />
                </div>
                
                <div>
                  <h1 className="text-3xl font-bold mb-2">🎯 Test Complete!</h1>
                  <p className="text-muted-foreground mb-6">
                    You've completed the test for "{flashcardSet.title}"
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-primary">{testResults.length}</div>
                      <div className="text-sm text-muted-foreground">Questions</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{correctAnswers}</div>
                      <div className="text-sm text-muted-foreground">Correct</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-primary">{Math.round(accuracy)}%</div>
                      <div className="text-sm text-muted-foreground">Accuracy</div>
                    </div>
                  </div>

                  {/* Show results summary */}
                  <div className="text-left bg-muted p-4 rounded-lg mb-6">
                    <h3 className="font-semibold mb-3">Test Results:</h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {testResults.map((result, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span className="truncate flex-1 mr-2">
                            {result.flashcard.term}
                          </span>
                          <span className="flex items-center">
                            {result.isCorrect ? (
                              <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500 mr-1" />
                            )}
                            {result.isCorrect ? "Correct" : "Incorrect"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button onClick={resetTest} variant="outline">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Take Test Again
                  </Button>
                  <Button onClick={() => navigate(`/study/${setId}`)}>
                    <Target className="h-4 w-4 mr-2" />
                    Study Again
                  </Button>
                  <Button onClick={() => navigate("/dashboard")}>
                    Back to Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
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

          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-2">🧪 Test Yourself</h1>
            <p className="text-muted-foreground mb-2">{flashcardSet.title}</p>
            
            {/* Test Type Selection */}
            <div className="flex justify-center gap-4 mb-4">
              <Button
                variant={testType === 'identification' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTestType('identification')}
              >
                Identification
              </Button>
              <Button
                variant={testType === 'multiple-choice' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTestType('multiple-choice')}
              >
                Multiple Choice
              </Button>
              <Button
                variant={testType === 'matching' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTestType('matching')}
              >
                Matching
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground">
              {testType === 'identification' && 'Write the term that matches each definition'}
              {testType === 'multiple-choice' && 'Choose the correct term from the options'}
              {testType === 'matching' && 'Match the definition to the correct term'}
            </p>
          </div>

          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">
                {testType === 'matching' 
                  ? `Progress: ${matchingPairs.filter(pair => pair.matched).length} / ${matchingPairs.length} matched`
                  : `Progress: ${currentQuestionIndex + 1} / ${shuffledFlashcards.length}`
                }
              </span>
              <span className="text-sm text-muted-foreground">
                {testType === 'matching' 
                  ? 'Matching Test'
                  : `Question ${currentQuestionIndex + 1} of ${shuffledFlashcards.length}`
                }
              </span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          <Card className="min-h-[300px]">
            <CardContent className="p-8">
              <div className="text-center space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">Definition</h3>
                  <p className="text-xl">{currentFlashcard.description}</p>
                </div>

                {currentFlashcard.image_url && (
                  <img
                    src={currentFlashcard.image_url}
                    alt="Flashcard"
                    className="max-w-full h-auto mx-auto rounded-lg"
                  />
                )}

                <div className="space-y-4">
                  {testType === 'identification' && (
                    <div>
                      <label htmlFor="answer" className="block text-sm font-medium mb-2">
                        Your Answer:
                      </label>
                      <input
                        id="answer"
                        type="text"
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        placeholder="Type the term here..."
                        className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                        disabled={showAnswer}
                      />
                    </div>
                  )}

                  {testType === 'multiple-choice' && (
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Choose the correct answer:
                      </label>
                      <RadioGroup
                        value={selectedAnswer}
                        onValueChange={setSelectedAnswer}
                        disabled={showAnswer}
                      >
                        {currentOptions.map((option, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <RadioGroupItem value={option} id={`option-${index}`} />
                            <Label htmlFor={`option-${index}`} className="cursor-pointer">
                              {option}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  )}

                  {testType === 'matching' && (
                    <div className="space-y-6">
                      {/* Definitions on the left */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <h4 className="font-medium text-sm text-muted-foreground">Definitions</h4>
                          {matchingPairs.map((pair, index) => (
                            <div
                              key={index}
                              className={`p-3 border-2 border-dashed rounded-lg min-h-[60px] flex items-center ${
                                pair.matched 
                                  ? 'border-blue-500 bg-blue-50' 
                                  : 'border-gray-300 hover:border-primary'
                              }`}
                              onDragOver={handleDragOver}
                              onDrop={(e) => handleDrop(e, pair.definition)}
                              onClick={() => handleDefinitionTap(pair.definition)}
                            >
                              {pair.matched ? (
                                <div className="flex items-center justify-between w-full">
                                  <span className="text-sm">{pair.definition}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-blue-600">{pair.term}</span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => removeMatch(pair.definition)}
                                      className="h-6 w-6 p-0"
                                    >
                                      <XCircle className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">{pair.definition}</span>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Available terms on the right */}
                        <div className="space-y-3">
                          <h4 className="font-medium text-sm text-muted-foreground">Available Terms</h4>
                          <div className="space-y-2">
                            {availableTerms.map((term, index) => (
                              <div
                                key={index}
                                draggable
                                onDragStart={(e) => handleDragStart(e, term)}
                                onClick={() => handleTermTap(term)}
                                className="p-3 bg-primary/10 border border-primary/20 rounded-lg cursor-move hover:bg-primary/20 transition-colors flex items-center gap-2"
                              >
                                <GripVertical className="h-4 w-4 text-primary" />
                                <span className="text-sm font-medium">{term}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {showAnswer && (
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Correct Answer:</span>
                        <span className="font-semibold text-green-600">{currentFlashcard.term}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Your Answer:</span>
                        <span className={`font-semibold ${testResults[testResults.length - 1]?.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                          {userAnswer}
                        </span>
                      </div>
                      <div className="flex items-center justify-center mt-2">
                        {testResults[testResults.length - 1]?.isCorrect ? (
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500 mr-2" />
                        )}
                        <span className={testResults[testResults.length - 1]?.isCorrect ? 'text-green-600' : 'text-red-600'}>
                          {testResults[testResults.length - 1]?.isCorrect ? 'Correct!' : 'Incorrect'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between items-center mt-6">
            <Button
              variant="outline"
              onClick={() => navigate("/dashboard")}
            >
              Exit Test
            </Button>

            <div className="flex gap-2">
              <Button variant="outline" onClick={resetTest}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>

            {testType === 'matching' ? (
              <Button 
                onClick={handleSubmitAnswer} 
                disabled={!matchingPairs.every(pair => pair.matched)}
              >
                Submit Test
                <CheckCircle className="h-4 w-4 ml-2" />
              </Button>
            ) : !showAnswer ? (
              <Button 
                onClick={handleSubmitAnswer} 
                disabled={
                  testType === 'identification' ? !userAnswer.trim() :
                  testType === 'multiple-choice' ? !selectedAnswer : true
                }
              >
                Submit Answer
              </Button>
            ) : (
              <Button onClick={nextQuestion}>
                {currentQuestionIndex < shuffledFlashcards.length - 1 ? 'Next Question' : 'Finish Test'}
                <CheckCircle className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestSet;
