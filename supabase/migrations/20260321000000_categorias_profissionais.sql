-- Migration: Create Categorias Profissionais table
-- Date: 2026-03-21

-- 1. Create the professional categories table (Categorias Profissionais)
CREATE TABLE IF NOT EXISTS public.categorias_profissionais (
    cbo TEXT PRIMARY KEY,
    categoria TEXT NOT NULL,
    -- vinculo TEXT NOT NULL DEFAULT 'INTERMEDIADO' CHECK (vinculo IN ('DIRETO', 'INTERMEDIADO')),
    -- tipo_vinculo TEXT NOT NULL DEFAULT 'CLT' CHECK (tipo_vinculo IN ('CLT', 'ESTATUTARIO', 'AUTÔNOMO')),
    -- chs INTEGER NOT NULL DEFAULT 20 CHECK (chs IN (20, 30, 40)),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.categorias_profissionais ENABLE ROW LEVEL SECURITY;

-- 3. Create basic policies
CREATE POLICY "Allow all access for development" ON public.categorias_profissionais
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 4. Trigger for updated_at
CREATE TRIGGER update_categorias_profissionais_updated_at
    BEFORE UPDATE ON public.categorias_profissionais
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
