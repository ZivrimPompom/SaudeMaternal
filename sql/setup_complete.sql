-- =============================================
-- SCRIPT COMPLETO - LIMPEZA E CRIAÇÃO DE TABELAS
-- Execute no Supabase SQL Editor
-- =============================================

-- =============================================
-- PARTE 1: EXCLUIR TABELAS ANTIGAS
-- =============================================

DROP TABLE IF EXISTS recem_nascidos CASCADE;
DROP TABLE IF EXISTS desfechos CASCADE;
DROP TABLE IF EXISTS registro_rotinas CASCADE;
DROP TABLE IF EXISTS atendimentos CASCADE;
DROP TABLE IF EXISTS gestacoes CASCADE;
DROP TABLE IF EXISTS pacientes CASCADE;
DROP TABLE IF EXISTS profissionais CASCADE;
DROP TABLE IF EXISTS categorias_profissionais CASCADE;
DROP TABLE IF EXISTS unidades_saude CASCADE;
DROP TABLE IF EXISTS rotinas CASCADE;
DROP TABLE IF EXISTS operadores CASCADE;

-- =============================================
-- PARTE 2: CRIAR TABELAS
-- =============================================

-- 1. UNIDADES DE SAÚDE
CREATE TABLE unidades_saude (
  id SERIAL PRIMARY KEY,
  cnes VARCHAR(20) UNIQUE NOT NULL,
  nome_fantasia VARCHAR(255) NOT NULL,
  telefone VARCHAR(20),
  logradouro VARCHAR(255),
  numero VARCHAR(20),
  complemento VARCHAR(100),
  bairro VARCHAR(100),
  municipio VARCHAR(100) DEFAULT 'SAO PAULO',
  uf VARCHAR(2) DEFAULT 'SP',
  cep VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. OPERADORES
CREATE TABLE operadores (
  id SERIAL PRIMARY KEY,
  cpf VARCHAR(14) UNIQUE NOT NULL,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  nivel_acesso VARCHAR(50) DEFAULT 'Operador',
  unidade_cnes VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (unidade_cnes) REFERENCES unidades_saude(cnes)
);

-- 3. CATEGORIAS PROFISSIONAIS
CREATE TABLE categorias_profissionais (
  id SERIAL PRIMARY KEY,
  cbo VARCHAR(20) UNIQUE NOT NULL,
  categoria VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. PROFISSIONAIS
CREATE TABLE profissionais (
  id SERIAL PRIMARY KEY,
  cpf VARCHAR(14) UNIQUE NOT NULL,
  nome VARCHAR(255) NOT NULL,
  cns VARCHAR(20),
  cbo VARCHAR(20) NOT NULL,
  unidade_cnes VARCHAR(20),
  equipe VARCHAR(100) DEFAULT 'SEM EQUIPE',
  situacao VARCHAR(20) DEFAULT 'ATIVO',
  vinculo VARCHAR(20) DEFAULT 'INTERMEDIADO',
  tipo_vinculo VARCHAR(20) DEFAULT 'CLT',
  chs INTEGER DEFAULT 20,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cbo) REFERENCES categorias_profissionais(cbo),
  FOREIGN KEY (unidade_cnes) REFERENCES unidades_saude(cnes)
);

-- 5. PACIENTES (GESTANTES)
CREATE TABLE pacientes (
  id SERIAL PRIMARY KEY,
  cpf VARCHAR(14) UNIQUE NOT NULL,
  gestante VARCHAR(255) NOT NULL,
  data_nascimento DATE,
  cns VARCHAR(20),
  nome_mae VARCHAR(255),
  logradouro VARCHAR(255),
  numero VARCHAR(20),
  complemento VARCHAR(100),
  bairro VARCHAR(100),
  municipio VARCHAR(100),
  uf VARCHAR(2),
  cep VARCHAR(20),
  contato VARCHAR(20),
  prontuario VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. GESTAÇÕES
CREATE TABLE gestacoes (
  id SERIAL PRIMARY KEY,
  sispn VARCHAR(50) UNIQUE NOT NULL,
  cpf_paciente VARCHAR(14) NOT NULL,
  dum DATE,
  dpp DATE,
  data_abertura DATE,
  data_cadastro DATE,
  referencia_tecnica VARCHAR(14),
  acs VARCHAR(14),
  equipe VARCHAR(100) DEFAULT 'SEM EQUIPE',
  gestacao_anterior INTEGER,
  aborto INTEGER DEFAULT 0,
  parto INTEGER DEFAULT 0,
  sifilis BOOLEAN DEFAULT FALSE,
  sifilis_tratada BOOLEAN DEFAULT FALSE,
  hiv BOOLEAN DEFAULT FALSE,
  hepatite_b BOOLEAN DEFAULT FALSE,
  hepatite_c BOOLEAN DEFAULT FALSE,
  classificacao_pn VARCHAR(50) DEFAULT 'HABITUAL',
  alto_risco_compartilhado TEXT,
  unidade_cnes VARCHAR(20),
  operador VARCHAR(14),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cpf_paciente) REFERENCES pacientes(cpf),
  FOREIGN KEY (referencia_tecnica) REFERENCES profissionais(cpf),
  FOREIGN KEY (acs) REFERENCES profissionais(cpf),
  FOREIGN KEY (unidade_cnes) REFERENCES unidades_saude(cnes),
  FOREIGN KEY (operador) REFERENCES operadores(cpf)
);

-- 7. ROTINAS (EXAMES E VACINAS)
CREATE TABLE rotinas (
  id SERIAL PRIMARY KEY,
  descricao VARCHAR(255) NOT NULL,
  tipo VARCHAR(20) NOT NULL,
  trimestre VARCHAR(20) NOT NULL,
  categoria VARCHAR(20) DEFAULT 'OBRIGATORIO',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. ATENDIMENTOS
CREATE TABLE atendimentos (
  id SERIAL PRIMARY KEY,
  sispn VARCHAR(50) NOT NULL,
  cpf_profissional VARCHAR(14) NOT NULL,
  cbo VARCHAR(20) NOT NULL,
  data_consulta DATE NOT NULL,
  trimestre_consulta VARCHAR(20) NOT NULL,
  data_proxima_consulta DATE,
  observacoes_clinicas TEXT,
  unidade_cnes VARCHAR(20),
  operador VARCHAR(14),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sispn) REFERENCES gestacoes(sispn),
  FOREIGN KEY (cpf_profissional) REFERENCES profissionais(cpf),
  FOREIGN KEY (cbo) REFERENCES categorias_profissionais(cbo),
  FOREIGN KEY (unidade_cnes) REFERENCES unidades_saude(cnes)
);

-- 9. REGISTRO DE ROTINAS (EXAMES/VACINAS)
CREATE TABLE registro_rotinas (
  id SERIAL PRIMARY KEY,
  sispn VARCHAR(50) NOT NULL,
  id_rotina INTEGER NOT NULL,
  data_realizacao DATE NOT NULL,
  trimestre_realizacao VARCHAR(20) NOT NULL,
  resultado VARCHAR(255),
  tipo VARCHAR(20),
  cpf_profissional VARCHAR(14),
  unidade_cnes VARCHAR(20),
  operador VARCHAR(14),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sispn) REFERENCES gestacoes(sispn),
  FOREIGN KEY (id_rotina) REFERENCES rotinas(id),
  FOREIGN KEY (cpf_profissional) REFERENCES profissionais(cpf),
  FOREIGN KEY (unidade_cnes) REFERENCES unidades_saude(cnes)
);

-- 10. DESFECHOS (UNIFICADO COM RN)
CREATE TABLE desfechos_e_rn (
  id SERIAL PRIMARY KEY,
  sispn VARCHAR(50) NOT NULL,
  tipo_desfecho VARCHAR(50) NOT NULL,
  data_desfecho DATE NOT NULL,
  nome_rn VARCHAR(255),
  cpf_rn VARCHAR(14),
  data_nascimento DATE,
  data_consulta_rn DATE,
  comparecimento BOOLEAN DEFAULT FALSE,
  unidade_cnes VARCHAR(20),
  cpf_operador VARCHAR(14),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sispn) REFERENCES gestacoes(sispn),
  FOREIGN KEY (unidade_cnes) REFERENCES unidades_saude(cnes)
);

-- =============================================
-- PARTE 3: ÍNDICES
-- =============================================
CREATE INDEX idx_gestacoes_sispn ON gestacoes(sispn);
CREATE INDEX idx_gestacoes_cpf ON gestacoes(cpf_paciente);
CREATE INDEX idx_atendimentos_sispn ON atendimentos(sispn);
CREATE INDEX idx_registro_rotinas_sispn ON registro_rotinas(sispn);
CREATE INDEX idx_desfechos_e_rn_sispn ON desfechos_e_rn(sispn);
CREATE INDEX idx_pacientes_cpf ON pacientes(cpf);

-- =============================================
-- PARTE 4: POLÍTICAS RLS
-- =============================================
ALTER TABLE unidades_saude ENABLE ROW LEVEL SECURITY;
ALTER TABLE operadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_profissionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE profissionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE gestacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE rotinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE atendimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE registro_rotinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE desfechos_e_rn ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON desfechos_e_rn FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- CONFIRMAÇÃO
-- =============================================
SELECT 'Todas as tabelas criadas com sucesso!' AS status;
