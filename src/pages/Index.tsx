import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { Brain, BookOpen, Zap, Users } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Brain className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              FlashGenius
            </h1>
          </div>
          <Button onClick={() => navigate("/auth")}>
            Get Started
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center space-y-8">
          <h2 className="text-5xl font-bold text-gray-900 dark:text-white">
            Master Any Subject with
            <span className="text-blue-600"> AI-Powered </span>
            Flashcards
          </h2>
          
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Create, study, and share flashcards effortlessly. Generate cards from your notes 
            with AI, practice with interactive study modes, and track your progress.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => navigate("/auth")}
              className="text-lg px-8 py-3"
            >
              Start Learning Free
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => navigate("/auth")}
              className="text-lg px-8 py-3"
            >
              Sign In
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <Brain className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">AI-Powered Generation</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Paste your notes and let AI automatically create flashcards for you
            </p>
          </div>

          <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <BookOpen className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Smart Study Modes</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Multiple ways to study with progress tracking and spaced repetition
            </p>
          </div>

          <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <Users className="h-12 w-12 text-purple-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Share & Collaborate</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Share your sets publicly or collaborate with classmates
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-24 text-center p-8 bg-blue-600 rounded-lg text-white">
          <h3 className="text-3xl font-bold mb-4">Ready to boost your learning?</h3>
          <p className="text-xl mb-6">Join thousands of students already using FlashGenius</p>
          <Button 
            variant="secondary" 
            size="lg"
            onClick={() => navigate("/auth")}
            className="text-lg px-8 py-3"
          >
            Get Started Now
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 text-center text-gray-600 dark:text-gray-400">
        <p>&copy; 2024 FlashGenius. Built with ❤️ for learners everywhere.</p>
      </footer>
    </div>
  );
};

export default Index;
