-- =============================================
-- RECRIAR TABELA DESFECHOS_E_RN
-- Execute no Supabase SQL Editor
-- =============================================

-- 1. Excluir tabelas antigas
DROP TABLE IF EXISTS recem_nascidos CASCADE;
DROP TABLE IF EXISTS desfechos CASCADE;

-- 2. Criar tabela unificada
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

-- 3. Índice
CREATE INDEX idx_desfechos_e_rn_sispn ON desfechos_e_rn(sispn);

-- 4. Política RLS
ALTER TABLE desfechos_e_rn ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON desfechos_e_rn FOR ALL USING (true) WITH CHECK (true);

SELECT 'Tabela desfechos_e_rn criada com sucesso!' AS status;
