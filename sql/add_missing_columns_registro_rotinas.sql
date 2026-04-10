-- Script para adicionar colunas ausentes na tabela registro_rotinas
-- Execute no Supabase SQL Editor

-- Adicionar coluna tipo
ALTER TABLE registro_rotinas ADD COLUMN tipo VARCHAR(20);

-- Adicionar coluna cbo
ALTER TABLE registro_rotinas ADD COLUMN cbo VARCHAR(20);

-- Adicionar coluna data_proxima_consulta
ALTER TABLE registro_rotinas ADD COLUMN data_proxima_consulta DATE;

-- Adicionar coluna observacoes
ALTER TABLE registro_rotinas ADD COLUMN observacoes TEXT;

-- Verificar colunas
SELECT column_name FROM information_schema.columns WHERE table_name = 'registro_rotinas';