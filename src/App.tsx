import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Pages
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import CreateSet from "./pages/CreateSet";
import EditSet from "./pages/EditSet";
import StudySet from "./pages/StudySet";
import TestSet from "./pages/TestSet";
import Profile from "./pages/Profile";
import AuthPage from "./pages/AuthPage";
import About from "./pages/About";
import WhatsNew from "./pages/WhatsNew";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="brainy-flash-theme">
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/about" element={<About />} />
              <Route path="/whats-new" element={<WhatsNew />} />
              
              {/* Protected Routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              
              <Route path="/create-set" element={
                <ProtectedRoute>
                  <CreateSet />
                </ProtectedRoute>
              } />
              
              <Route path="/edit-set/:setId" element={
                <ProtectedRoute>
                  <EditSet />
                </ProtectedRoute>
              } />
              
              <Route path="/study/:setId" element={
                <ProtectedRoute>
                  <StudySet />
                </ProtectedRoute>
              } />
              
              <Route path="/test/:setId" element={
                <ProtectedRoute>
                  <TestSet />
                </ProtectedRoute>
              } />
              
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />
              
              {/* Public Routes */}
              <Route path="/set/:setId" element={<StudySet />} />
              
              {/* Catch-all route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
