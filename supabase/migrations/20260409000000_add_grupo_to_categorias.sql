-- Migration: Add grupo column to categorias_profissionais
-- Date: 2026-04-09

-- Add grupo column if it doesn't exist
ALTER TABLE public.categorias_profissionais
ADD COLUMN IF NOT EXISTS grupo VARCHAR(50);

-- Add grau_instrucao column if it doesn't exist  
ALTER TABLE public.categorias_profissionais
ADD COLUMN IF NOT EXISTS grau_instrucao VARCHAR(50);

-- Create index on grupo for better query performance
CREATE INDEX IF NOT EXISTS idx_categorias_profissionais_grupo ON public.categorias_profissionais(grupo);
