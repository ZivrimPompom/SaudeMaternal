-- Atualizar todos os registros da tabela rotinas para grupo = ENFERMAGEM
UPDATE rotinas 
SET grupo = 'ENFERMAGEM' 
WHERE grupo IS NULL OR grupo = '';