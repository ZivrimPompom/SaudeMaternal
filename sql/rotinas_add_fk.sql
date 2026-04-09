-- Criar FK para conectar grupo da tabela rotinas ao grupo da tabela categorias_profissionais
ALTER TABLE rotinas 
ADD CONSTRAINT rotinas_grupo_fkey 
FOREIGN KEY (grupo) 
REFERENCES categorias_profissionais(grupo);