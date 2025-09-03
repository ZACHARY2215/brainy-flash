-- Create shared_links table for shareable flashcard sets
CREATE TABLE public.shared_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  set_id UUID NOT NULL REFERENCES public.sets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_token TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shared_links ENABLE ROW LEVEL SECURITY;

-- Create policies for shared_links
CREATE POLICY "Users can manage their own shared links" 
  ON public.shared_links 
  FOR ALL 
  USING (user_id = auth.uid());

CREATE POLICY "Anyone can view active shared links by token" 
  ON public.shared_links 
  FOR SELECT 
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_shared_links_updated_at
  BEFORE UPDATE ON public.shared_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for performance
CREATE INDEX idx_shared_links_token ON public.shared_links(share_token);
CREATE INDEX idx_shared_links_set_id ON public.shared_links(set_id);

-- Add collaboration table for edit permissions
CREATE TABLE public.collaborators (
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
CREATE POLICY "Set owners can manage collaborators" 
  ON public.collaborators 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.sets 
    WHERE sets.id = collaborators.set_id 
    AND sets.user_id = auth.uid()
  ));

CREATE POLICY "Users can view collaborators for sets they own or collaborate on" 
  ON public.collaborators 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.sets 
    WHERE sets.id = collaborators.set_id 
    AND (sets.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.collaborators c2 
      WHERE c2.set_id = sets.id AND c2.user_id = auth.uid()
    ))
  ));

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_collaborators_updated_at
  BEFORE UPDATE ON public.collaborators
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update sets table RLS policies to include collaborator access
DROP POLICY IF EXISTS "Users can update their own sets" ON public.sets;
DROP POLICY IF EXISTS "Users can delete their own sets" ON public.sets;

CREATE POLICY "Users can update sets they own or have editor access to" 
  ON public.sets 
  FOR UPDATE 
  USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.collaborators 
      WHERE collaborators.set_id = sets.id 
      AND collaborators.user_id = auth.uid() 
      AND collaborators.permission IN ('editor', 'owner')
    )
  );

CREATE POLICY "Users can delete sets they own" 
  ON public.sets 
  FOR DELETE 
  USING (user_id = auth.uid());

-- Update flashcards RLS policies to include collaborator access
DROP POLICY IF EXISTS "Users can create flashcards for their sets" ON public.flashcards;
DROP POLICY IF EXISTS "Users can update flashcards in their sets" ON public.flashcards;
DROP POLICY IF EXISTS "Users can delete flashcards from their sets" ON public.flashcards;
DROP POLICY IF EXISTS "Users can view flashcards from their sets or public sets" ON public.flashcards;

CREATE POLICY "Users can create flashcards for sets they own or have editor access to" 
  ON public.flashcards 
  FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.sets 
    WHERE sets.id = flashcards.set_id 
    AND (sets.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.collaborators 
      WHERE collaborators.set_id = sets.id 
      AND collaborators.user_id = auth.uid() 
      AND collaborators.permission IN ('editor', 'owner')
    ))
  ));

CREATE POLICY "Users can update flashcards in sets they own or have editor access to" 
  ON public.flashcards 
  FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM public.sets 
    WHERE sets.id = flashcards.set_id 
    AND (sets.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.collaborators 
      WHERE collaborators.set_id = sets.id 
      AND collaborators.user_id = auth.uid() 
      AND collaborators.permission IN ('editor', 'owner')
    ))
  ));

CREATE POLICY "Users can delete flashcards from sets they own or have editor access to" 
  ON public.flashcards 
  FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM public.sets 
    WHERE sets.id = flashcards.set_id 
    AND (sets.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.collaborators 
      WHERE collaborators.set_id = sets.id 
      AND collaborators.user_id = auth.uid() 
      AND collaborators.permission IN ('editor', 'owner')
    ))
  ));

CREATE POLICY "Users can view flashcards from accessible sets" 
  ON public.flashcards 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.sets 
    WHERE sets.id = flashcards.set_id 
    AND (
      sets.user_id = auth.uid() 
      OR sets.is_public = true 
      OR EXISTS (
        SELECT 1 FROM public.collaborators 
        WHERE collaborators.set_id = sets.id 
        AND collaborators.user_id = auth.uid()
      )
    )
  ));