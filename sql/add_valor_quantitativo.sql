-- Adicionar coluna valor_quantitativo na tabela registro_rotinas
ALTER TABLE registro_rotinas ADD COLUMN IF NOT EXISTS valor_quantitativo VARCHAR(50);