-- Script para migrar atendimentos para registro_rotinas
-- Execute no Supabase SQL Editor

-- 1. Primeiro, verificar se existe uma rotina do tipo CONSULTA, se não existir, criar
INSERT INTO rotinas (descricao, tipo, trimestre, categoria)
SELECT 'CONSULTA', 'CONSULTA', 'TODOS', 'OBRIGATORIO'
WHERE NOT EXISTS (SELECT 1 FROM rotinas WHERE tipo = 'CONSULTA' LIMIT 1);

-- 2. Inserir todos os atendimentos como registro_rotinas
INSERT INTO registro_rotinas (
  sispn,
  id_rotina,
  data_realizacao,
  trimestre_realizacao,
  resultado,
  tipo,
  cpf_profissional,
  cbo,
  unidade_cnes,
  operador,
  data_proxima_consulta,
  observacoes
)
SELECT 
  a.sispn,
  r.id,
  a.data_consulta,
  CASE 
    WHEN a.trimestre_consulta = '1º TRIMESTRE' THEN 'PRIMEIRO'
    WHEN a.trimestre_consulta = '2º TRIMESTRE' THEN 'SEGUNDO'
    WHEN a.trimestre_consulta = '3º TRIMESTRE' THEN 'TERCEIRO'
    ELSE a.trimestre_consulta
  END,
  '-',
  'CONSULTA',
  a.cpf_profissional,
  a.cbo,
  a.unidade_cnes,
  a.operador,
  a.data_proxima_consulta,
  a.observacoes_clinicas
FROM atendimentos a
CROSS JOIN (SELECT id FROM rotinas WHERE tipo = 'CONSULTA' LIMIT 1) r;

-- Verificar quantidade de registros migrados
SELECT 
  'Registros em atendimentos' as tabela,
  COUNT(*) as quantidade
FROM atendimentos
UNION ALL
SELECT 
  'Registros em registro_rotinas (CONSULTA)' as tabela,
  COUNT(*) as quantidade
FROM registro_rotinas
WHERE tipo = 'CONSULTA';