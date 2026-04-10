-- Transformar resultados genéricos em específicos conforme o tipo de exame
-- Execute no Supabase SQL Editor

UPDATE registro_rotinas r SET resultado = 
  CASE 
    -- Sorologia (sifilis, hiv, vdrl, toxo, hbsag, htlv): REAGENTE ou NAO REAGENTE
    WHEN rot.descricao IN ('TESTE RAPIDO SIFILIS', 'TESTE RAPIDO HIV', 'TESTE RAPIDO VDRL', 'HBSAG', 'HIV', 'HTLV', 'VDRL', 'TOXO IGG', 'TOXO IGM') THEN
      CASE r.resultado
        WHEN 'NEGATIVO / NÃO REAGENTE' THEN 'NÃO REAGENTE'
        WHEN 'NEGATIVO / NAO REAGENTE' THEN 'NÃO REAGENTE'
        WHEN 'POSITIVO / REAGENTE' THEN 'REAGENTE'
        WHEN 'POSITIVO / REAGENTE ' THEN 'REAGENTE'
        ELSE r.resultado
      END
    
    -- Microbiologico (strepto, urocultura): POSITIVO ou NEGATIVO
    WHEN rot.descricao IN ('STREPTO', 'UROCULTURA') THEN
      CASE r.resultado
        WHEN 'NEGATIVO / NÃO REAGENTE' THEN 'NEGATIVO'
        WHEN 'NEGATIVO / NAO REAGENTE' THEN 'NEGATIVO'
        WHEN 'POSITIVO / REAGENTE' THEN 'POSITIVO'
        WHEN 'POSITIVO / REAGENTE ' THEN 'POSITIVO'
        ELSE r.resultado
      END
    
    -- Quantitativo / Analise / Imagem (glicemia, hb/ht, totg, urina, usg): NORMAL ou ALTERADO
    WHEN rot.descricao IN ('GLICEMIA', 'HB / HT', 'TOTG', 'URINA I', 'USG', 'US MORFOLOGICO', 'US OBSTETRICO INICIAL') THEN
      CASE r.resultado
        WHEN 'NEGATIVO / NÃO REAGENTE' THEN 'NORMAL'
        WHEN 'NEGATIVO / NAO REAGENTE' THEN 'NORMAL'
        WHEN 'POSITIVO / REAGENTE' THEN 'ALTERADO'
        WHEN 'POSITIVO / REAGENTE ' THEN 'ALTERADO'
        ELSE r.resultado
      END
    
    -- Citologia (papanicolau): NORMAL ou ALTERADO
    WHEN rot.descricao = 'PAPANICOLAU' THEN
      CASE r.resultado
        WHEN 'NEGATIVO / NÃO REAGENTE' THEN 'NORMAL'
        WHEN 'NEGATIVO / NAO REAGENTE' THEN 'NORMAL'
        WHEN 'POSITIVO / REAGENTE' THEN 'ALTERADO'
        WHEN 'POSITIVO / REAGENTE ' THEN 'ALTERADO'
        ELSE r.resultado
      END
    
    -- Valor tipagem (ABO/RH): NA
    WHEN rot.descricao = 'ABO / RH' THEN
      CASE r.resultado
        WHEN 'NEGATIVO / NÃO REAGENTE' THEN 'NA'
        WHEN 'NEGATIVO / NAO REAGENTE' THEN 'NA'
        WHEN 'POSITIVO / REAGENTE' THEN 'NA'
        ELSE r.resultado
      END
    
    ELSE r.resultado
  END
FROM registro_rotinas r
JOIN rotinas rot ON r.id_rotina = rot.id;

-- Verificar distribuição de resultados por tipo de exame
SELECT 
  rot.descricao as exame,
  r.resultado,
  COUNT(*) as total
FROM registro_rotinas r
JOIN rotinas rot ON r.id_rotina = rot.id
WHERE rot.tipo = 'EXAME'
GROUP BY rot.descricao, r.resultado
ORDER BY rot.descricao, r.resultado;