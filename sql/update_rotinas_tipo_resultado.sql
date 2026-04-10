-- Adicionar coluna tipo_resultado na tabela rotinas
ALTER TABLE rotinas ADD COLUMN IF NOT EXISTS tipo_resultado VARCHAR(20);

-- Atualizar com os valores corretos baseado na descricao
UPDATE rotinas SET tipo_resultado = 
  CASE 
    WHEN descricao IN ('HBSAG', 'HIV', 'HTLV', 'TESTE RAPIDO HIV', 'TESTE RAPIDO SIFILIS', 'TESTE RAPIDO VDRL', 'VDRL', 'TOXO IGG', 'TOXO IGM') THEN 'sorologia'
    WHEN descricao = 'PAPANICOLAU' THEN 'citologia'
    WHEN descricao = 'URINA I' THEN 'analise'
    WHEN descricao IN ('STREPTO', 'UROCULTURA') THEN 'microbiologico'
    WHEN descricao IN ('GLICEMIA', 'HB / HT', 'TOTG') THEN 'quantitativo'
    WHEN descricao IN ('USG', 'US MORFOLOGICO', 'US OBSTETRICO INICIAL') THEN 'imagem'
    WHEN descricao = 'ABO / RH' THEN 'tipagem'
    WHEN descricao = 'CONSULTA' THEN 'n/a'
    ELSE 'variavel'
  END
WHERE tipo = 'EXAME';

-- Verificar resultado
SELECT descricao, tipo_resultado FROM rotinas WHERE tipo = 'EXAME' ORDER BY descricao;