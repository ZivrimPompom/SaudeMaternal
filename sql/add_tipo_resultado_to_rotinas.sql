-- Adicionar colunas de tipo de resultado na tabela rotinas
ALTER TABLE rotinas ADD COLUMN IF NOT EXISTS tipo_resultado VARCHAR(50);
ALTER TABLE rotinas ADD COLUMN IF NOT EXISTS resultado_sintetico_padrao VARCHAR(50);

-- Popular os dados
UPDATE rotinas SET 
  tipo_resultado = CASE descricao
    WHEN 'ABO / RH' THEN 'valor_tipagem'
    WHEN 'CONSULTA' THEN 'nao_aplicavel'
    WHEN 'GLICEMIA' THEN 'quantitativo'
    WHEN 'HB / HT' THEN 'quantitativo'
    WHEN 'HBSAG' THEN 'sorologia'
    WHEN 'HIV' THEN 'sorologia'
    WHEN 'HTLV' THEN 'sorologia'
    WHEN 'OUTROS' THEN 'variavel'
    WHEN 'PAPANICOLAU' THEN 'citologia'
    WHEN 'STREPTO' THEN 'microbiologico'
    WHEN 'TESTE RAPIDO HIV' THEN 'sorologia'
    WHEN 'TESTE RAPIDO SIFILIS' THEN 'sorologia'
    WHEN 'TESTE RAPIDO VDRL' THEN 'sorologia'
    WHEN 'TOTG' THEN 'quantitativo'
    WHEN 'TOXO IGG' THEN 'sorologia'
    WHEN 'TOXO IGM' THEN 'sorologia'
    WHEN 'URINA I' THEN 'analise_urina'
    WHEN 'UROCULTURA' THEN 'microbiologico'
    WHEN 'US MORFOLOGICO' THEN 'imagem'
    WHEN 'US OBSTETRICO INICIAL' THEN 'imagem'
    WHEN 'USG' THEN 'imagem'
    WHEN 'VDRL' THEN 'sorologia'
    ELSE NULL
  END,
  resultado_sintetico_padrao = CASE descricao
    WHEN 'ABO / RH' THEN 'NA'
    WHEN 'CONSULTA' THEN 'NA'
    WHEN 'GLICEMIA' THEN 'NORMAL/ALTERADO'
    WHEN 'HB / HT' THEN 'NORMAL/ALTERADO'
    WHEN 'HBSAG' THEN 'REAGENTE/NAO REAGENTE'
    WHEN 'HIV' THEN 'REAGENTE/NAO REAGENTE'
    WHEN 'HTLV' THEN 'REAGENTE/NAO REAGENTE'
    WHEN 'OUTROS' THEN 'NA'
    WHEN 'PAPANICOLAU' THEN 'NORMAL/ALTERADO'
    WHEN 'STREPTO' THEN 'POSITIVO/NEGATIVO'
    WHEN 'TESTE RAPIDO HIV' THEN 'REAGENTE/NAO REAGENTE'
    WHEN 'TESTE RAPIDO SIFILIS' THEN 'REAGENTE/NAO REAGENTE'
    WHEN 'TESTE RAPIDO VDRL' THEN 'REAGENTE/NAO REAGENTE'
    WHEN 'TOTG' THEN 'NORMAL/ALTERADO'
    WHEN 'TOXO IGG' THEN 'REAGENTE/NAO REAGENTE'
    WHEN 'TOXO IGM' THEN 'REAGENTE/NAO REAGENTE'
    WHEN 'URINA I' THEN 'NORMAL/ALTERADO'
    WHEN 'UROCULTURA' THEN 'POSITIVO/NEGATIVO'
    WHEN 'US MORFOLOGICO' THEN 'NORMAL/ALTERADO'
    WHEN 'US OBSTETRICO INICIAL' THEN 'NORMAL/ALTERADO'
    WHEN 'USG' THEN 'NORMAL/ALTERADO'
    WHEN 'VDRL' THEN 'REAGENTE/NAO REAGENTE'
    ELSE NULL
  END
WHERE tipo = 'EXAME';

-- Verificar resultado
SELECT descricao, tipo_resultado, resultado_sintetico_padrao 
FROM rotinas 
WHERE tipo = 'EXAME'
ORDER BY descricao;