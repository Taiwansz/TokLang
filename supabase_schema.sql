-- ==========================================
-- TOKLANG DATABASE SCHEMA (SUPABASE)
-- Execute este script no editor SQL do Supabase.
-- ==========================================

-- 1. Tabela de Perfis de Usuário (Profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  last TEXT,
  plan TEXT DEFAULT 'starter',
  api_key TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS (Row Level Security) na tabela profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para profiles
CREATE POLICY "Permitir leitura de seu próprio perfil" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Permitir atualização de seu próprio perfil" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);


-- 2. Tabela de Histórico de Compressões (History)
CREATE TABLE IF NOT EXISTS public.history (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  original_text TEXT NOT NULL,
  compressed_text TEXT NOT NULL,
  tokens_before INTEGER,
  tokens_after INTEGER,
  savings_pct INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS na tabela history
ALTER TABLE public.history ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para history
CREATE POLICY "Permitir inserção pelo proprietário" ON public.history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Permitir leitura de seu próprio histórico" ON public.history
  FOR SELECT USING (auth.uid() = user_id);


-- 3. Trigger para Sincronização Automática com auth.users
-- Cria ou atualiza a tabela profiles quando um novo usuário se cadastra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, last, plan, api_key)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'last', ''),
    COALESCE(new.raw_user_meta_data->>'plan', 'starter'),
    COALESCE(new.raw_user_meta_data->>'apiKey', 'tl_live_' || translate(encode(decode(replace(gen_random_uuid()::text, '-', ''), 'hex'), 'base64'), '+/=', '___'))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Disparar a trigger no INSERT
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- Trigger para Sincronizar Atualizações de Perfil e Chave de API (UPDATE)
-- Atualiza profiles quando o usuário rotaciona chaves ou edita seu nome
CREATE OR REPLACE FUNCTION public.handle_update_user()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET 
    name = COALESCE(new.raw_user_meta_data->>'name', name),
    last = COALESCE(new.raw_user_meta_data->>'last', last),
    plan = COALESCE(new.raw_user_meta_data->>'plan', plan),
    api_key = COALESCE(new.raw_user_meta_data->>'apiKey', api_key)
  WHERE id = new.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Disparar a trigger no UPDATE de auth.users
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE OF raw_user_meta_data ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_update_user();


-- 4. Tabela de Vocabulário Customizado (Vocabulary)
CREATE TABLE IF NOT EXISTS public.vocabulary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  term VARCHAR(100) NOT NULL,
  definition TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  -- Evitar termos duplicados para o mesmo usuário
  UNIQUE(user_id, term)
);

-- Habilitar RLS na tabela vocabulary
ALTER TABLE public.vocabulary ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para vocabulary
CREATE POLICY "Permitir leitura de seu próprio vocabulário" ON public.vocabulary
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Permitir inserção de seu próprio vocabulário" ON public.vocabulary
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Permitir atualização de seu próprio vocabulário" ON public.vocabulary
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Permitir exclusão de seu próprio vocabulário" ON public.vocabulary
  FOR DELETE USING (auth.uid() = user_id);

-- Índices de performance
CREATE INDEX IF NOT EXISTS vocabulary_user_id_idx ON public.vocabulary(user_id);
CREATE INDEX IF NOT EXISTS vocabulary_term_idx ON public.vocabulary(term);
