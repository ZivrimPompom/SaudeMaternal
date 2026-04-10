-- Verificar schema atual da tabela registro_rotinas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'registro_rotinas'
ORDER BY ordinal_position;

-- Verificar schema da tabela rotinas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'rotinas'
ORDER BY ordinal_position;