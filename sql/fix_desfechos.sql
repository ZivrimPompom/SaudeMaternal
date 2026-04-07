-- =============================================
-- EXCLUIR TABELAS ANTIGAS E CRIAR NOVA UNIFICADA
-- Execute no Supabase SQL Editor
-- =============================================

-- 1. Excluir tabelas antigas
DROP TABLE IF EXISTS recem_nascidos CASCADE;
DROP TABLE IF EXISTS desfechos CASCADE;

-- =============================================
-- 2. CRIAR TABELA UNIFICADA DESFECHOS_E_RN
-- =============================================
CREATE TABLE desfechos_e_rn (
  id SERIAL PRIMARY KEY,
  sispn VARCHAR(50) NOT NULL,
  tipo_desfecho VARCHAR(50) NOT NULL, -- PARTO, ABORTO, MUDOU-SE, ÓBITO, CONVÊNIO MÉDICO, OUTROS
  data_desfecho DATE NOT NULL,
  -- Dados do RN (para casos de PARTO)
  nome_rn VARCHAR(255),
  cpf_rn VARCHAR(14),
  data_consulta_rn DATE,
  comparecimento BOOLEAN DEFAULT FALSE,
  -- Metadados
  unidade_cnes VARCHAR(20),
  operador VARCHAR(14),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sispn) REFERENCES gestacoes(sispn)
);

-- =============================================
-- ÍNDICE
-- =============================================
CREATE INDEX idx_desfechos_e_rn_sispn ON desfechos_e_rn(sispn);

-- =============================================
-- POLÍTICA RLS
-- =============================================
ALTER TABLE desfechos_e_rn ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON desfechos_e_rn FOR ALL USING (true) WITH CHECK (true);

SELECT 'Tabela desfechos_e_rn criada com sucesso!' AS status;
