-- Adicionar coluna tipo
ALTER TABLE registro_rotinas ADD COLUMN tipo VARCHAR(20);

-- Adicionar coluna cbo  
ALTER TABLE registro_rotinas ADD COLUMN cbo VARCHAR(20);

-- Adicionar coluna data_proxima_consulta
ALTER TABLE registro_rotinas ADD COLUMN data_proxima_consulta DATE;

-- Adicionar coluna observacoes
ALTER TABLE registro_rotinas ADD COLUMN observacoes TEXT;