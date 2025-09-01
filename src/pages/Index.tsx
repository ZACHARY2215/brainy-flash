import { Navbar } from "@/components/Navbar"
import { Hero } from "@/components/Hero"
import { Features } from "@/components/Features"
import { StudyModes } from "@/components/StudyModes"

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <StudyModes />
      </main>
      
      {/* Supabase integration notice */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-muted-foreground mb-6">
              To enable full functionality including user authentication, flashcard storage, 
              AI generation, and file uploads, you'll need to connect this app to Supabase.
            </p>
            <div className="p-6 bg-primary/10 rounded-lg border border-primary/20">
              <p className="text-sm text-muted-foreground">
                💡 Click the green <strong>Supabase</strong> button in the top right to activate 
                authentication, database storage, and AI-powered features.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
