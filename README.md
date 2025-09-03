# 🐱 Zoomies - Smart Flashcards

**Master any subject with AI-powered flashcards!**

Zoomies is a modern, intelligent flashcard application that helps students learn more effectively through AI-generated content, interactive study modes, and comprehensive progress tracking.

![Zoomies Logo](https://img.shields.io/badge/Zoomies-Purple?style=for-the-badge&logo=cat&logoColor=white)

## ✨ Features

- 🤖 **AI-Powered Generation**: Automatically create flashcards from your notes using advanced AI
- 📚 **Multiple Study Modes**: Identification, multiple choice, matching tests, and more
- 📊 **Progress Tracking**: Detailed analytics and performance metrics
- ⭐ **Favorites System**: Organize your favorite flashcard sets
- 🎯 **Interactive Tests**: Drag & drop matching with randomized questions
- 📱 **Mobile Responsive**: Optimized for all devices
- 🔐 **Secure Authentication**: Built with Supabase Auth
- 🎨 **Modern UI**: Beautiful, intuitive interface with dark/light mode

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account (for backend services)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/zoomies-flashcards.git
   cd zoomies-flashcards
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Fill in your environment variables:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173`

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern UI library
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Beautiful, accessible components
- **React Router** - Client-side routing
- **React Query** - Data fetching and caching

### Backend
- **Supabase** - Backend-as-a-Service
- **PostgreSQL** - Database
- **Node.js** - Backend runtime
- **Express** - Web framework

### AI & Tools
- **OpenAI API** - AI flashcard generation
- **Lucide React** - Beautiful icons
- **Sonner** - Toast notifications

## 📁 Project Structure

```
zoomies-flashcards/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # shadcn/ui components
│   │   └── ...
│   ├── pages/              # Page components
│   ├── contexts/           # React contexts
│   ├── hooks/              # Custom hooks
│   ├── lib/                # Utility functions
│   └── integrations/       # External service integrations
├── backend/                # Backend API
├── supabase/               # Database migrations and functions
├── public/                 # Static assets
└── docs/                   # Documentation
```

## 🚀 Deployment

### Option 1: Vercel (Recommended)

1. **Connect your repository to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Configure build settings:
     - Build Command: `npm run build`
     - Output Directory: `dist`
     - Install Command: `npm install`

2. **Set environment variables in Vercel**
   - Go to Project Settings → Environment Variables
   - Add your Supabase credentials:
     ```
     VITE_SUPABASE_URL=your_supabase_url
     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```

3. **Deploy**
   - Push to your main branch
   - Vercel will automatically deploy

### Option 2: Netlify

1. **Connect to Netlify**
   - Go to [netlify.com](https://netlify.com)
   - Connect your GitHub repository
   - Configure build settings:
     - Build Command: `npm run build`
     - Publish Directory: `dist`

2. **Set environment variables**
   - Go to Site Settings → Environment Variables
   - Add your Supabase credentials

3. **Deploy**
   - Push to your main branch
   - Netlify will automatically deploy

### Option 3: Railway

1. **Connect to Railway**
   - Go to [railway.app](https://railway.app)
   - Connect your GitHub repository
   - Railway will auto-detect Vite configuration

2. **Set environment variables**
   - Add your Supabase credentials in Railway dashboard

3. **Deploy**
   - Railway will automatically deploy on push

### Option 4: Self-Hosted

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Serve the built files**
   ```bash
   # Using a simple HTTP server
   npx serve dist
   
   # Or using nginx, Apache, or any web server
   # Point to the 'dist' directory
   ```

## 🗄️ Database Setup

### Supabase Setup

1. **Create a new Supabase project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project

2. **Run database migrations**
   ```bash
   # Install Supabase CLI
   npm install -g supabase
   
   # Link to your project
   supabase link --project-ref your-project-ref
   
   # Run migrations
   supabase db push
   ```

3. **Set up Row Level Security (RLS)**
   - Enable RLS on all tables
   - Configure policies for user data access

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI Configuration (for AI features)
VITE_OPENAI_API_KEY=your_openai_api_key

# App Configuration
VITE_APP_NAME=Zoomies
VITE_APP_VERSION=1.0.0
```

### Supabase Configuration

1. **Authentication**
   - Enable email/password authentication
   - Configure OAuth providers (Google, GitHub, etc.)
   - Set up email templates

2. **Database**
   - Create tables for users, flashcard sets, and cards
   - Set up proper relationships and constraints
   - Configure RLS policies

## 📱 Mobile App

Zoomies is fully responsive and works great on mobile devices. For a native mobile experience, you can:

1. **Use as PWA**
   - The app is PWA-ready
   - Users can install it on their home screen

2. **React Native** (Future)
   - Consider building a React Native version
   - Share components and logic with the web app

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
5. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
6. **Open a Pull Request**

### Development Guidelines

- Follow TypeScript best practices
- Use meaningful commit messages
- Write tests for new features
- Update documentation as needed
- Follow the existing code style

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Zachary Ian P. Bautista**
- Full-Stack Developer & Learning Technology Enthusiast
- Created with 💕 for his girlfriend

## 🙏 Acknowledgments

- [Supabase](https://supabase.com) for the amazing backend platform
- [shadcn/ui](https://ui.shadcn.com) for the beautiful component library
- [Lucide](https://lucide.dev) for the awesome icons
- [Tailwind CSS](https://tailwindcss.com) for the utility-first CSS framework

## 📞 Support

If you have any questions or need help:

- 📧 Email: [your-email@example.com]
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/zoomies-flashcards/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/yourusername/zoomies-flashcards/discussions)

---

**Made with ❤️ by Zachary Ian P. Bautista**

*"This website is created with love for his girlfriend"* 💕
