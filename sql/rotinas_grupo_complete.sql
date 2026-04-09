-- Script completo para adicionar grupos na tabela rotinas
-- Execute este script no Supabase

-- 1. Criar tabela de grupos profissionais
CREATE TABLE IF NOT EXISTS grupos_profissionais (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(50) UNIQUE NOT NULL
);

-- 2. Inserir os grupos em ordem alfabética
INSERT INTO grupos_profissionais (nome) VALUES
('ADMINISTRATIVO'),
('ENFERMAGEM'),
('MEDICO'),
('OUTROS DE NIVEL SUPERIOR'),
('SAUDE BUCAL'),
('TACS/ACS')
ON CONFLICT (nome) DO NOTHING;

-- 3. Adicionar colunas na tabela rotinas
ALTER TABLE rotinas 
ADD COLUMN IF NOT EXISTS quantidade INTEGER DEFAULT 1;

ALTER TABLE rotinas 
ADD COLUMN IF NOT EXISTS grupo VARCHAR(50);

-- 4. Criar FK para conectar grupo da tabela rotinas ao grupo da tabela grupos_profissionais
ALTER TABLE rotinas 
ADD CONSTRAINT rotinas_grupo_fkey 
FOREIGN KEY (grupo) 
REFERENCES grupos_profissionais(nome);