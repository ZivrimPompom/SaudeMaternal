-- =============================================
-- LIMPEZA DE TODAS AS TABELAS DO PROJETO
-- Execute este script no Supabase SQL Editor
-- =============================================

-- Desabilitar verificações de chave estrangeira temporariamente
SET CONSTRAINTS ALL DISABLED;

-- Limpar tabelas em ordem (filhas primeiro)
TRUNCATE TABLE desfechos_e_rn RESTART IDENTITY CASCADE;
TRUNCATE TABLE registro_rotinas RESTART IDENTITY CASCADE;
TRUNCATE TABLE atendimentos RESTART IDENTITY CASCADE;
TRUNCATE TABLE gestacoes RESTART IDENTITY CASCADE;
TRUNCATE TABLE pacientes RESTART IDENTITY CASCADE;
TRUNCATE TABLE profissionais RESTART IDENTITY CASCADE;
TRUNCATE TABLE categorias_profissionais RESTART IDENTITY CASCADE;
TRUNCATE TABLE unidades_saude RESTART IDENTITY CASCADE;
TRUNCATE TABLE rotinas RESTART IDENTITY CASCADE;
TRUNCATE TABLE operadores RESTART IDENTITY CASCADE;

-- Reabilitar verificações
SET CONSTRAINTS ALL ENABLED;

-- Confirmar limpeza
SELECT 'Tabelas limpiadas com sucesso!' AS status;
