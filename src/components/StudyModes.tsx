import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Flashcard } from "@/components/ui/flashcard"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { RotateCcw, CheckCircle, XCircle, ArrowRight } from "lucide-react"

// Sample flashcard data
const sampleCards = [
  { id: 1, front: "Photosynthesis", back: "The process by which plants convert sunlight, carbon dioxide, and water into glucose and oxygen" },
  { id: 2, front: "Mitochondria", back: "The powerhouse of the cell, responsible for producing ATP through cellular respiration" },
  { id: 3, front: "DNA", back: "Deoxyribonucleic acid - the molecule that contains genetic instructions for all living organisms" },
]

interface StudyModesProps {
  className?: string
}

export const StudyModes = ({ className }: StudyModesProps) => {
  const [currentMode, setCurrentMode] = useState<"flashcards" | "multiple" | "written">("flashcards")
  const [currentCard, setCurrentCard] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [userAnswer, setUserAnswer] = useState("")
  const [showResult, setShowResult] = useState(false)
  const [correctAnswers, setCorrectAnswers] = useState(0)

  const handleNext = () => {
    if (currentCard < sampleCards.length - 1) {
      setCurrentCard(prev => prev + 1)
      setIsFlipped(false)
      setUserAnswer("")
      setShowResult(false)
    }
  }

  const handlePrevious = () => {
    if (currentCard > 0) {
      setCurrentCard(prev => prev - 1)
      setIsFlipped(false)
      setUserAnswer("")
      setShowResult(false)
    }
  }

  const handleWrittenSubmit = () => {
    setShowResult(true)
    const isCorrect = userAnswer.toLowerCase().trim() === sampleCards[currentCard].back.toLowerCase().trim()
    if (isCorrect) {
      setCorrectAnswers(prev => prev + 1)
    }
  }

  const progress = ((currentCard + 1) / sampleCards.length) * 100

  return (
    <section className={`py-16 bg-background ${className}`}>
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Study Your Way</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Choose from multiple study modes to optimize your learning
          </p>
          
          {/* Mode selector */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <Button
              variant={currentMode === "flashcards" ? "default" : "outline"}
              onClick={() => setCurrentMode("flashcards")}
              className="transition-smooth"
            >
              Flashcards
            </Button>
            <Button
              variant={currentMode === "multiple" ? "default" : "outline"}
              onClick={() => setCurrentMode("multiple")}
              className="transition-smooth"
            >
              Multiple Choice
            </Button>
            <Button
              variant={currentMode === "written" ? "default" : "outline"}
              onClick={() => setCurrentMode("written")}
              className="transition-smooth"
            >
              Written Practice
            </Button>
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">
                Card {currentCard + 1} of {sampleCards.length}
              </span>
              <Badge variant="secondary">
                {correctAnswers}/{currentCard + (showResult ? 1 : 0)} correct
              </Badge>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Study mode content */}
          {currentMode === "flashcards" && (
            <div className="space-y-6">
              <Flashcard
                front={sampleCards[currentCard].front}
                back={sampleCards[currentCard].back}
                isFlipped={isFlipped}
                onFlip={() => setIsFlipped(!isFlipped)}
                className="mx-auto max-w-md"
              />
            </div>
          )}

          {currentMode === "multiple" && (
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4 text-center">
                What is {sampleCards[currentCard].front}?
              </h3>
              <div className="space-y-3">
                {[
                  sampleCards[currentCard].back,
                  "A type of protein found in muscles",
                  "A chemical reaction in the stomach", 
                  "The outer layer of plant cells"
                ].sort(() => Math.random() - 0.5).map((option, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="w-full text-left justify-start p-4 h-auto"
                    onClick={() => {
                      if (option === sampleCards[currentCard].back) {
                        setCorrectAnswers(prev => prev + 1)
                      }
                      handleNext()
                    }}
                  >
                    <span className="mr-3 font-semibold">
                      {String.fromCharCode(65 + index)}.
                    </span>
                    {option}
                  </Button>
                ))}
              </div>
            </Card>
          )}

          {currentMode === "written" && (
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4 text-center">
                Define: {sampleCards[currentCard].front}
              </h3>
              <div className="space-y-4">
                <Input
                  placeholder="Type your answer here..."
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  className="w-full"
                  disabled={showResult}
                />
                
                {showResult && (
                  <div className="p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      {userAnswer.toLowerCase().includes(sampleCards[currentCard].back.toLowerCase().substring(0, 10)) ? (
                        <CheckCircle className="h-5 w-5 text-success" />
                      ) : (
                        <XCircle className="h-5 w-5 text-destructive" />
                      )}
                      <span className="font-semibold">
                        {userAnswer.toLowerCase().includes(sampleCards[currentCard].back.toLowerCase().substring(0, 10)) 
                          ? "Correct!" 
                          : "Not quite right"
                        }
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">Correct answer:</p>
                    <p className="text-sm">{sampleCards[currentCard].back}</p>
                  </div>
                )}

                <Button
                  onClick={showResult ? handleNext : handleWrittenSubmit}
                  disabled={!userAnswer.trim()}
                  className="w-full"
                >
                  {showResult ? (
                    <>
                      Next Card <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  ) : (
                    "Submit Answer"
                  )}
                </Button>
              </div>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex justify-between items-center mt-6">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentCard === 0}
            >
              Previous
            </Button>
            
            <Button
              variant="outline"
              onClick={() => {
                setCurrentCard(0)
                setIsFlipped(false)
                setCorrectAnswers(0)
                setUserAnswer("")
                setShowResult(false)
              }}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Restart
            </Button>

            <Button
              onClick={handleNext}
              disabled={currentCard === sampleCards.length - 1}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}