-- Atualizar registros com tipo NULL para EXAME
UPDATE registro_rotinas 
SET tipo = 'EXAME'
WHERE tipo IS NULL OR tipo = '';

-- Verificar resultado
SELECT tipo, COUNT(*) as total 
FROM registro_rotinas 
GROUP BY tipo 
ORDER BY tipo;