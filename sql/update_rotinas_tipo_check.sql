-- Atualizar a constraint de tipo para incluir CONSULTA
ALTER TABLE rotinas 
DROP CONSTRAINT IF EXISTS rotinas_tipo_check;

ALTER TABLE rotinas 
ADD CONSTRAINT rotinas_tipo_check 
CHECK (tipo IN ('EXAME', 'VACINA', 'MEDICACAO', 'CONSULTA'));