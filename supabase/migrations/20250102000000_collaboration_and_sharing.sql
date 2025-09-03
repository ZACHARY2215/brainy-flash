-- Add collaboration and sharing features

-- Create collaborators table
CREATE TABLE IF NOT EXISTS public.collaborators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  set_id UUID NOT NULL REFERENCES public.sets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (permission IN ('viewer', 'editor', 'owner')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(set_id, user_id)
);

-- Enable RLS
ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;

-- Create policies for collaborators
CREATE POLICY "Users can view collaborators for sets they own or collaborate on" 
ON public.collaborators 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM sets 
    WHERE sets.id = collaborators.set_id 
    AND (sets.user_id = auth.uid() OR 
         EXISTS (SELECT 1 FROM collaborators c2 WHERE c2.set_id = sets.id AND c2.user_id = auth.uid()))
  )
);

CREATE POLICY "Set owners can manage collaborators" 
ON public.collaborators 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM sets 
    WHERE sets.id = collaborators.set_id 
    AND sets.user_id = auth.uid()
  )
  
);

-- Create shared_links table for shareable links
CREATE TABLE IF NOT EXISTS public.shared_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  set_id UUID NOT NULL REFERENCES public.sets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_token TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shared_links ENABLE ROW LEVEL SECURITY;

-- Create policies for shared_links
CREATE POLICY "Users can view their own shared links" 
ON public.shared_links 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own shared links" 
ON public.shared_links 
FOR ALL 
USING (user_id = auth.uid());

-- Create study_progress table for tracking individual card progress
CREATE TABLE IF NOT EXISTS public.study_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flashcard_id UUID NOT NULL REFERENCES public.flashcards(id) ON DELETE CASCADE,
  correct_count INTEGER DEFAULT 0,
  incorrect_count INTEGER DEFAULT 0,
  difficulty_rating TEXT CHECK (difficulty_rating IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
  last_studied TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, flashcard_id)
);

-- Enable RLS
ALTER TABLE public.study_progress ENABLE ROW LEVEL SECURITY;

-- Create policies for study_progress
CREATE POLICY "Users can view their own study progress" 
ON public.study_progress 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own study progress" 
ON public.study_progress 
FOR ALL 
USING (user_id = auth.uid());

-- Add AI review notes to flashcards table
ALTER TABLE public.flashcards 
ADD COLUMN IF NOT EXISTS ai_review_notes TEXT,
ADD COLUMN IF NOT EXISTS difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'intermediate';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_collaborators_set_id ON public.collaborators(set_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_user_id ON public.collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_links_token ON public.shared_links(share_token);
CREATE INDEX IF NOT EXISTS idx_shared_links_set_id ON public.shared_links(set_id);
CREATE INDEX IF NOT EXISTS idx_study_progress_user_flashcard ON public.study_progress(user_id, flashcard_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_collaborators_updated_at
BEFORE UPDATE ON public.collaborators
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shared_links_updated_at
BEFORE UPDATE ON public.shared_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_study_progress_updated_at
BEFORE UPDATE ON public.study_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate share token
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(16), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has access to set
CREATE OR REPLACE FUNCTION user_has_access(set_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM sets s
    WHERE s.id = set_uuid
    AND (s.user_id = user_uuid OR s.is_public = true OR 
         EXISTS (SELECT 1 FROM collaborators c WHERE c.set_id = s.id AND c.user_id = user_uuid))
  );
END;
$$ LANGUAGE plpgsql;
