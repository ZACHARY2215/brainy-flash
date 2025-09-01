import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Upload, 
  FileText, 
  Sparkles, 
  Search, 
  Share2, 
  Users, 
  Target, 
  BookOpen,
  Zap
} from "lucide-react"

const features = [
  {
    icon: Upload,
    title: "File Upload & AI Generation",
    description: "Upload PDFs, DOCX, or TXT files and let AI automatically generate flashcards from your content.",
    gradient: "bg-gradient-primary"
  },
  {
    icon: FileText,
    title: "Text to Flashcards",
    description: "Paste any text and use smart delimiters to instantly create study sets from your notes.",
    gradient: "bg-gradient-success"
  },
  {
    icon: Target,
    title: "Multiple Study Modes",
    description: "Master content with flashcard flipping, multiple-choice tests, and written practice modes.",
    gradient: "bg-gradient-warning"
  },
  {
    icon: Search,
    title: "Smart Search & Organization",
    description: "Find any flashcard or set instantly with powerful search by title, subject, or tags.",
    gradient: "bg-gradient-primary"
  },
  {
    icon: Share2,
    title: "Share & Collaborate",
    description: "Share study sets with public/private links and enable collaborative editing for group study.",
    gradient: "bg-gradient-success"
  },
  {
    icon: BookOpen,
    title: "Progress Tracking",
    description: "Monitor your learning with detailed analytics on accuracy, completion rates, and study streaks.",
    gradient: "bg-gradient-warning"
  }
]

export const Features = () => {
  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything You Need to Excel
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Powerful features designed to make studying more effective, engaging, and collaborative.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {features.map((feature, index) => (
            <Card key={index} className="group hover:shadow-floating transition-smooth duration-300 border-0 bg-gradient-card">
              <div className="p-6">
                <div className={`w-12 h-12 rounded-lg ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-smooth`}>
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-3 text-foreground">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </Card>
          ))}
        </div>

        {/* AI Features highlight */}
        <div className="bg-gradient-hero rounded-2xl p-8 md:p-12 text-center text-white">
          <div className="max-w-3xl mx-auto">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <Zap className="h-8 w-8 text-white" />
              </div>
            </div>
            <h3 className="text-2xl md:text-3xl font-bold mb-4">
              Powered by Advanced AI
            </h3>
            <p className="text-lg md:text-xl text-white/90 mb-8 leading-relaxed">
              Our AI doesn't just create flashcards—it understands context, generates relevant examples, 
              and creates smart multiple-choice distractors to enhance your learning experience.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-white text-primary hover:bg-white/90 px-8 py-4 font-semibold shadow-floating transition-smooth"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                Try AI Generation
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-white/30 text-white hover:bg-white/10 px-8 py-4 font-semibold transition-smooth"
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}