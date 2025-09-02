import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Cat, BookOpen, Users, Target, Star, BarChart3, GripVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";

const About = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Cat,
      title: "AI-Powered Generation",
      description: "Automatically create flashcards from your notes using advanced AI technology",
      color: "text-purple-600"
    },
    {
      icon: BookOpen,
      title: "Smart Study Modes",
      description: "Multiple study modes including identification, multiple choice, and matching tests",
      color: "text-green-600"
    },
    {
      icon: Target,
      title: "Progress Tracking",
      description: "Track your learning progress with detailed analytics and performance metrics",
      color: "text-purple-600"
    },
    {
      icon: Star,
      title: "Favorites System",
      description: "Mark your favorite flashcard sets for quick access and organized study sessions",
      color: "text-yellow-600"
    },
    {
      icon: GripVertical,
      title: "Drag & Drop Matching",
      description: "Interactive matching tests with intuitive drag and drop functionality",
      color: "text-orange-600"
    },
    {
      icon: BarChart3,
      title: "Performance Analytics",
      description: "Comprehensive statistics on your study sessions and learning outcomes",
      color: "text-indigo-600"
    }
  ];



  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">About Zoomies</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            A modern, AI-powered flashcard application designed to revolutionize how students learn and retain information.
          </p>
        </div>

        {/* Author Section */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Meet the Creator</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">Z</span>
              </div>
              <h3 className="text-2xl font-bold mb-2">Zachary Ian P. Bautista</h3>
              <p className="text-muted-foreground mb-4">Full-Stack Developer & Learning Technology Enthusiast</p>
            </div>
            <p className="text-lg max-w-2xl mx-auto mb-6">
              Zachary is a passionate developer who believes in the power of technology to enhance education. 
              Zoomies was created so that his girlfriend can have a better way to study instead of paying for expensive flashcard apps.
            </p>
            <div className="bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-lg p-4 mb-6">
              <p className="text-center text-pink-700 font-medium">
                💕 This website is created with love for his girlfriend 💕
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Badge variant="secondary">React</Badge>
              <Badge variant="secondary">TypeScript</Badge>
              <Badge variant="secondary">Supabase</Badge>
              <Badge variant="secondary">Tailwind CSS</Badge>
              <Badge variant="secondary">AI Integration</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Features Section */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center mb-8">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <feature.icon className={`h-8 w-8 ${feature.color} mr-3`} />
                    <h3 className="text-lg font-semibold">{feature.title}</h3>
                  </div>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>



        {/* Mission Statement */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Our Mission</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-lg max-w-3xl mx-auto">
              To make learning more engaging, efficient, and accessible through innovative technology. 
              Zoomies combines the proven effectiveness of spaced repetition with modern AI capabilities 
              to help students master any subject faster and retain knowledge longer.
            </p>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to Start Learning?</h2>
          <p className="text-muted-foreground mb-6">
            Join thousands of students who are already using Zoomies to improve their study habits.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/auth")}>
              Get Started Free
            </Button>
            <Button variant="outline" size="lg" onClick={() => navigate("/dashboard")}>
              View Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
