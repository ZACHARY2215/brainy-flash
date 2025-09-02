import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Zap, CheckCircle, Star, Target, GripVertical, BarChart3, Shuffle, Palette, Smartphone } from "lucide-react";
import { useNavigate } from "react-router-dom";

const WhatsNew = () => {
  const navigate = useNavigate();

  const recentUpdates = [
    {
      icon: Zap,
      title: "Public Set Details Page",
      description: "View a set's full list of terms and definitions publicly, with quick actions to study with flashcards or take a test.",
      date: "Latest",
      color: "text-green-700",
      bgColor: "bg-green-50",
      borderColor: "border-green-200"
    },
    {
      icon: Target,
      title: "Public Sets in Dashboard",
      description: "New Dashboard tab showcasing public community sets. Quickly preview, view, and study them.",
      date: "Latest",
      color: "text-teal-700",
      bgColor: "bg-teal-50",
      borderColor: "border-teal-200"
    },
    {
      icon: BarChart3,
      title: "Per-Account Accuracy",
      description: "Accuracy is now tracked per user using study sessions for more meaningful stats.",
      date: "Latest",
      color: "text-indigo-700",
      bgColor: "bg-indigo-50",
      borderColor: "border-indigo-200"
    },
    {
      icon: Smartphone,
      title: "Mobile Matching Support",
      description: "Matching test now supports tap-to-match on iOS and Android (drag & drop still works on desktop).",
      date: "Latest",
      color: "text-blue-700",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200"
    },
    {
      icon: CheckCircle,
      title: "Profile on Mobile Navbar",
      description: "Profile and Sign Out are now visible and accessible in the mobile menu.",
      date: "Latest",
      color: "text-emerald-700",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200"
    },
    {
      icon: Zap,
      title: "Vercel SPA Refresh Fix + New Link Thumbnail",
      description: "Fixed 404 on refresh via SPA rewrite and updated Open Graph/Twitter image. Place your image at public/og-image.png.",
      date: "Latest",
      color: "text-fuchsia-700",
      bgColor: "bg-fuchsia-50",
      borderColor: "border-fuchsia-200"
    },
    {
      icon: GripVertical,
      title: "Drag & Drop Matching Test",
      description: "New interactive matching test mode with intuitive drag and drop functionality",
      date: "Latest",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200"
    },
    {
      icon: Star,
      title: "Favorites System",
      description: "Mark your favorite flashcard sets for quick access and organized study sessions",
      date: "Latest",
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200"
    },
    {
      icon: BarChart3,
      title: "Enhanced Progress Tracking",
      description: "Comprehensive statistics on your study sessions and learning outcomes",
      date: "Latest",
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      borderColor: "border-indigo-200"
    },
    {
      icon: Palette,
      title: "Improved User Interface",
      description: "Better visual feedback and cleaner design for enhanced user experience",
      date: "Latest",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200"
    },
    {
      icon: Shuffle,
      title: "Randomized Question Order",
      description: "All test types now feature randomized questions for more challenging practice",
      date: "Latest",
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200"
    },
    {
      icon: Smartphone,
      title: "Mobile Responsiveness",
      description: "Enhanced mobile experience with improved touch interactions and layouts",
      date: "Latest",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200"
    }
  ];

  const upcomingFeatures = [
    "🎯 Spaced repetition algorithm for optimal learning",
    "📊 Advanced analytics and performance insights",
    "👥 Study groups and collaborative features",
    "🔔 Smart notifications and study reminders",
    "📱 Offline mode for studying without internet",
    "🎨 Custom themes and personalization options",
    "📈 Learning streaks and achievement badges",
    "🔍 Advanced search and filtering capabilities"
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
          <div className="flex items-center justify-center mb-4">
            <Zap className="h-8 w-8 text-yellow-500 mr-3" />
            <h1 className="text-4xl font-bold">What's New</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Stay up to date with the latest features and improvements in Zoomies
          </p>
        </div>

        {/* Latest Updates */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-8 text-center">Latest Updates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentUpdates.map((update, index) => (
              <Card key={index} className={`hover:shadow-md transition-shadow ${update.borderColor} border-2`}>
                <CardHeader className={`${update.bgColor} rounded-t-lg`}>
                  <div className="flex items-center justify-between">
                    <update.icon className={`h-6 w-6 ${update.color}`} />
                    <Badge variant="secondary" className="text-xs">
                      {update.date}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{update.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-muted-foreground text-sm">{update.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Feature Highlights */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center">
              <Target className="h-6 w-6 mr-2 text-green-500" />
              Key Improvements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3 text-green-600">Enhanced Study Experience</h3>
                <ul className="space-y-2">
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Interactive drag and drop matching tests</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Favorites system for better organization</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Randomized questions for varied practice</span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-3 text-blue-600">Better User Interface</h3>
                <ul className="space-y-2">
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Improved visual feedback and animations</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Mobile-responsive design improvements</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Enhanced progress tracking and analytics</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Features */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center">
              <Star className="h-6 w-6 mr-2 text-purple-500" />
              Coming Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">
              We're constantly working on new features to improve your learning experience. Here's what's coming next:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingFeatures.map((feature, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Feedback Section */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-2xl text-center">We Value Your Feedback</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-6">
              Help us make Zoomies even better by sharing your thoughts and suggestions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => navigate("/dashboard")}>
                Try New Features
              </Button>
              <Button variant="outline" size="lg" onClick={() => navigate("/about")}>
                Learn More About Us
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Version Info */}
        <div className="text-center text-muted-foreground">
          <p className="text-sm">
            Zoomies v2.0 • Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default WhatsNew;
