import { useState } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Cat, Menu, X, User, Settings, LogOut } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/contexts/AuthContext"

export const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  // Show navbar on all pages except auth page
  if (location.pathname === "/auth") {
    return null
  }

  const handleSignOut = async () => {
    await signOut()
    navigate("/")
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-700 rounded-lg flex items-center justify-center">
                <Cat className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-foreground">Zoomies</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {user && (
              <Link to="/dashboard" className="text-foreground hover:text-primary transition-smooth">
                Dashboard
              </Link>
            )}
            <Link to="/whats-new" className="text-foreground hover:text-primary transition-smooth">
              What's New?
            </Link>
            <Link to="/about" className="text-foreground hover:text-primary transition-smooth">
              About
            </Link>
            {!user && (
              <>
                <a href="#features" className="text-foreground hover:text-primary transition-smooth">
                  Features
                </a>
                <a href="#study" className="text-foreground hover:text-primary transition-smooth">
                  Study Modes
                </a>
                <a href="#pricing" className="text-foreground hover:text-primary transition-smooth">
                  Pricing
                </a>
              </>
            )}
          </div>

          {/* Auth buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {!user ? (
              <>
                <Link to="/auth">
                  <Button variant="outline" className="transition-smooth">
                    Sign In
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button className="bg-gradient-primary text-white border-0 hover:opacity-90 transition-smooth">
                    Get Started
                  </Button>
                </Link>
              </>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                    <Settings className="h-4 w-4 mr-2" />
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col space-y-4">
              {user && (
                <Link to="/dashboard" className="text-foreground hover:text-primary transition-smooth">
                  Dashboard
                </Link>
              )}
              <Link to="/whats-new" className="text-foreground hover:text-primary transition-smooth">
                What's New?
              </Link>
              <Link to="/about" className="text-foreground hover:text-primary transition-smooth">
                About
              </Link>
              {!user && (
                <>
                  <a href="#features" className="text-foreground hover:text-primary transition-smooth">
                    Features
                  </a>
                  <a href="#study" className="text-foreground hover:text-primary transition-smooth">
                    Study Modes
                  </a>
                  <a href="#pricing" className="text-foreground hover:text-primary transition-smooth">
                    Pricing
                  </a>
                  <div className="flex flex-col space-y-2 pt-4 border-t border-border">
                    <Link to="/auth">
                      <Button variant="outline" className="w-full">
                        Sign In
                      </Button>
                    </Link>
                    <Link to="/auth">
                      <Button className="w-full bg-gradient-primary text-white border-0">
                        Get Started
                      </Button>
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}