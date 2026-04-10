-- Adicionar campos de consulta (data_proxima_consulta e observacoes) à tabela registro_rotinas
-- Execute no Supabase SQL Editor

ALTER TABLE public.registro_rotinas 
ADD COLUMN IF NOT EXISTS data_proxima_consulta DATE,
ADD COLUMN IF NOT EXISTS observacoes TEXT;