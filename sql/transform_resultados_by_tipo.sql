-- Transformar resultados genéricos em específicos conforme o tipo de resultado da rotina
-- Execute no Supabase SQL Editor

-- Usando CTE para evitar conflito de alias
WITH updated AS (
  SELECT 
    rr.id_registro,
    CASE 
      WHEN rot.tipo_resultado = 'sorologia' THEN
        CASE rr.resultado
          WHEN 'NEGATIVO / NÃO REAGENTE' THEN 'NÃO REAGENTE'
          WHEN 'NEGATIVO / NAO REAGENTE' THEN 'NÃO REAGENTE'
          WHEN 'POSITIVO / REAGENTE' THEN 'REAGENTE'
          WHEN 'POSITIVO / REAGENTE ' THEN 'REAGENTE'
          ELSE rr.resultado
        END
      
      WHEN rot.tipo_resultado = 'microbiologico' THEN
        CASE rr.resultado
          WHEN 'NEGATIVO / NÃO REAGENTE' THEN 'NEGATIVO'
          WHEN 'NEGATIVO / NAO REAGENTE' THEN 'NEGATIVO'
          WHEN 'POSITIVO / REAGENTE' THEN 'POSITIVO'
          WHEN 'POSITIVO / REAGENTE ' THEN 'POSITIVO'
          ELSE rr.resultado
        END
      
      WHEN rot.tipo_resultado IN ('quantitativo', 'analise', 'imagem', 'citologia') THEN
        CASE rr.resultado
          WHEN 'NEGATIVO / NÃO REAGENTE' THEN 'NORMAL'
          WHEN 'NEGATIVO / NAO REAGENTE' THEN 'NORMAL'
          WHEN 'POSITIVO / REAGENTE' THEN 'ALTERADO'
          WHEN 'POSITIVO / REAGENTE ' THEN 'ALTERADO'
          ELSE rr.resultado
        END
      
      ELSE rr.resultado
    END as novo_resultado
  FROM registro_rotinas rr
  JOIN rotinas rot ON rr.id_rotina = rot.id
  WHERE rot.tipo = 'EXAME'
)
UPDATE registro_rotinas
SET resultado = updated.novo_resultado
FROM updated
WHERE registro_rotinas.id_registro = updated.id_registro;

-- Verificar distribuição de resultados por tipo de resultado
SELECT 
  rot.tipo_resultado,
  rr.resultado,
  COUNT(*) as total
FROM registro_rotinas rr
JOIN rotinas rot ON rr.id_rotina = rot.id
WHERE rot.tipo = 'EXAME'
GROUP BY rot.tipo_resultado, rr.resultado
ORDER BY rot.tipo_resultado, rr.resultado;