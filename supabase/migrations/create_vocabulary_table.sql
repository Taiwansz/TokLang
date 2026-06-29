-- Migration: Create Custom Vocabulary Table
-- Target: Supabase / PostgreSQL

CREATE TABLE IF NOT EXISTS public.vocabulary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    term VARCHAR(100) NOT NULL,
    definition TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    -- Avoid duplicate terms for the same user
    UNIQUE(user_id, term)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.vocabulary ENABLE ROW LEVEL SECURITY;

-- Set up policies for security
CREATE POLICY "Users can view their own vocabulary"
    ON public.vocabulary
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own vocabulary"
    ON public.vocabulary
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vocabulary"
    ON public.vocabulary
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vocabulary"
    ON public.vocabulary
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS vocabulary_user_id_idx ON public.vocabulary(user_id);
CREATE INDEX IF NOT EXISTS vocabulary_term_idx ON public.vocabulary(term);
