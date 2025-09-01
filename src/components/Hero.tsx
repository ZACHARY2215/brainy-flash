import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import heroImage from "@/assets/hero-flashcards.jpg"
import { Brain, Sparkles, Users, Target } from "lucide-react"

export const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-hero overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          {/* Main heading */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
              Master Any Subject with
              <span className="block bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                Smart Flashcards
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-white/80 mb-8 leading-relaxed">
              Create, study, and share flashcards powered by AI. Transform your learning experience with intelligent study tools.
            </p>
          </div>

          {/* Hero image */}
          <div className="mb-12">
            <img 
              src={heroImage} 
              alt="Digital flashcards for learning" 
              className="mx-auto rounded-2xl shadow-floating max-w-full h-auto"
            />
          </div>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button 
              size="lg" 
              className="bg-white text-primary hover:bg-white/90 px-8 py-4 text-lg font-semibold shadow-floating transition-smooth"
            >
              <Brain className="mr-2 h-5 w-5" />
              Start Learning Free
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-white/30 text-white hover:bg-white/10 px-8 py-4 text-lg font-semibold transition-smooth"
            >
              Watch Demo
            </Button>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card className="bg-white/10 backdrop-blur border-white/20 p-6 text-white transition-smooth hover:bg-white/20">
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">AI-Powered</h3>
                <p className="text-white/80 text-sm">
                  Generate flashcards from documents, PDFs, and text with advanced AI
                </p>
              </div>
            </Card>

            <Card className="bg-white/10 backdrop-blur border-white/20 p-6 text-white transition-smooth hover:bg-white/20">
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Smart Study</h3>
                <p className="text-white/80 text-sm">
                  Multiple study modes including flashcards, tests, and written practice
                </p>
              </div>
            </Card>

            <Card className="bg-white/10 backdrop-blur border-white/20 p-6 text-white transition-smooth hover:bg-white/20">
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Collaborate</h3>
                <p className="text-white/80 text-sm">
                  Share study sets and collaborate with classmates and study groups
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}