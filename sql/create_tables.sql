-- =============================================
-- CRIAÇÃO DE TABELAS COMPATÍVEIS COM O PROJETO
-- Execute após o script de limpeza
-- =============================================

-- =============================================
-- 1. UNIDADES DE SAÚDE
-- =============================================
CREATE TABLE IF NOT EXISTS unidades_saude (
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

-- =============================================
-- 2. CATEGORIAS PROFISSIONAIS
-- =============================================
CREATE TABLE IF NOT EXISTS categorias_profissionais (
  id SERIAL PRIMARY KEY,
  cbo VARCHAR(20) UNIQUE NOT NULL,
  categoria VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 3. OPERADORES
-- =============================================
CREATE TABLE IF NOT EXISTS operadores (
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

-- =============================================
-- 4. PROFISSIONAIS
-- =============================================
CREATE TABLE IF NOT EXISTS profissionais (
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

-- =============================================
-- 5. PACIENTES (GESTANTES)
-- =============================================
CREATE TABLE IF NOT EXISTS pacientes (
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

-- =============================================
-- 6. GESTAÇÕES
-- =============================================
CREATE TABLE IF NOT EXISTS gestacoes (
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

-- =============================================
-- 7. ROTINAS (EXAMES E VACINAS)
-- =============================================
CREATE TABLE IF NOT EXISTS rotinas (
  id SERIAL PRIMARY KEY,
  descricao VARCHAR(255) NOT NULL,
  tipo VARCHAR(20) NOT NULL, -- EXAME, VACINA, CONSULTA
  trimestre VARCHAR(20) NOT NULL, -- 1º TRIMESTRE, 2º TRIMESTRE, 3º TRIMESTRE
  categoria VARCHAR(20) DEFAULT 'OBRIGATORIO', -- OBRIGATORIO, OPCIONAL, RECOMENDADO
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 8. ATENDIMENTOS
-- =============================================
CREATE TABLE IF NOT EXISTS atendimentos (
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

-- =============================================
-- 9. REGISTRO DE ROTINAS (EXAMES/VACINAS)
-- =============================================
CREATE TABLE IF NOT EXISTS registro_rotinas (
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

-- =============================================
-- 10. DESFECHOS
-- =============================================
CREATE TABLE IF NOT EXISTS desfechos (
  id SERIAL PRIMARY KEY,
  sispn VARCHAR(50) NOT NULL,
  tipo_desfecho VARCHAR(50) NOT NULL, -- PARTO, ABORTO, MUDOU-SE, ÓBITO, CONVÊNIO MÉDICO, OUTROS
  data_desfecho DATE NOT NULL,
  unidade_cnes VARCHAR(20),
  operador VARCHAR(14),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sispn) REFERENCES gestacoes(sispn),
  FOREIGN KEY (unidade_cnes) REFERENCES unidades_saude(cnes)
);

-- =============================================
-- 11. RECÉM-NASCIDOS
-- =============================================
CREATE TABLE IF NOT EXISTS recem_nascidos (
  id SERIAL PRIMARY KEY,
  id_desfecho INTEGER NOT NULL,
  nome_rn VARCHAR(255),
  cpf_rn VARCHAR(14),
  data_nascimento DATE,
  data_consulta_rn DATE,
  comparecimento BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_desfecho) REFERENCES desfechos(id) ON DELETE CASCADE
);

-- =============================================
-- ÍNDICES PARA PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_gestacoes_sispn ON gestacoes(sispn);
CREATE INDEX IF NOT EXISTS idx_gestacoes_cpf ON gestacoes(cpf_paciente);
CREATE INDEX IF NOT EXISTS idx_atendimentos_sispn ON atendimentos(sispn);
CREATE INDEX IF NOT EXISTS idx_registro_rotinas_sispn ON registro_rotinas(sispn);
CREATE INDEX IF NOT EXISTS idx_desfechos_sispn ON desfechos(sispn);
CREATE INDEX IF NOT EXISTS idx_recem_nascidos_desfecho ON recem_nascidos(id_desfecho);
CREATE INDEX IF NOT EXISTS idx_pacientes_cpf ON pacientes(cpf);

-- =============================================
-- POLÍTICAS RLS (Row Level Security)
-- =============================================
ALTER TABLE unidades_saude ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_profissionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE operadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE profissionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE gestacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE rotinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE atendimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE registro_rotinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE desfechos ENABLE ROW LEVEL SECURITY;
ALTER TABLE recem_nascidos ENABLE ROW LEVEL SECURITY;

-- Permitir acesso total para desenvolvimento (ajuste conforme necessário)
CREATE POLICY "Allow all" ON unidades_saude FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON categorias_profissionais FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON operadores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON profissionais FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON pacientes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON gestacoes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON rotinas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON atendimentos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON registro_rotinas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON desfechos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON recem_nascidos FOR ALL USING (true) WITH CHECK (true);

SELECT 'Tabelas criadas com sucesso!' AS status;
