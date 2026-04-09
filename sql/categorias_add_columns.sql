-- Adicionar colunas GRUPO e GRAU_INSTRUCAO na tabela categorias_profissionais
ALTER TABLE categorias_profissionais 
ADD COLUMN IF NOT EXISTS grupo VARCHAR(50);

ALTER TABLE categorias_profissionais 
ADD COLUMN IF NOT EXISTS grau_instrucao VARCHAR(50);