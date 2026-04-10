-- Migrar atendimentos para registro_rotinas
-- Execute no Supabase SQL Editor

-- 1. Criar rotina CONSULTA se não existir
INSERT INTO rotinas (descricao, tipo, trimestre, categoria)
SELECT 'CONSULTA', 'CONSULTA', 'TODOS', 'OBRIGATORIO'
WHERE NOT EXISTS (SELECT 1 FROM rotinas WHERE tipo = 'CONSULTA' LIMIT 1);

-- 2. Migrar atendimentos
INSERT INTO registro_rotinas (
  sispn, id_rotina, data_realizacao, trimestre_realizacao,
  resultado, tipo, cpf_profissional, cbo, unidade_cnes,
  cpf_operador, data_proxima_consulta, observacoes
)
SELECT 
  a.sispn, r.id, a.data_consulta,
  CASE 
    WHEN a.trimestre_consulta = '1º TRIMESTRE' THEN 'PRIMEIRO'
    WHEN a.trimestre_consulta = '2º TRIMESTRE' THEN 'SEGUNDO'
    WHEN a.trimestre_consulta = '3º TRIMESTRE' THEN 'TERCEIRO'
    ELSE a.trimestre_consulta
  END,
  '-', 'CONSULTA', a.cpf, a.cbo, a.unidade_cnes,
  a.cpf_operador, a.data_proxima_consulta, a.observacoes_clinicas
FROM atendimentos a
CROSS JOIN (SELECT id FROM rotinas WHERE tipo = 'CONSULTA' LIMIT 1) r;

-- Verificar resultado
SELECT 
  'Atendimentos' as tabela, COUNT(*) as total FROM atendimentos
UNION ALL
SELECT 
  'Registro Rotinas (CONSULTA)', COUNT(*) FROM registro_rotinas WHERE tipo = 'CONSULTA';