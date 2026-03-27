-- SUPABASE SCHEMA - SAÚDE MATERNAL
-- Copy and paste this into the Supabase SQL Editor

-- 1. Create the operators table (Operadores)
CREATE TABLE IF NOT EXISTS public.operadores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    cpf TEXT UNIQUE NOT NULL,
    senha TEXT NOT NULL, -- In a real app, this would be hashed
    status TEXT NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Bloqueado')),
    nivel_acesso TEXT NOT NULL DEFAULT 'Usuário' CHECK (nivel_acesso IN ('Usuário', 'Administrador')),
    sigla TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create the patients table (Pacientes) - Essential for Maternal Health
CREATE TABLE IF NOT EXISTS public.pacientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gestante TEXT NOT NULL,
    cpf TEXT UNIQUE NOT NULL,
    nome_mae TEXT DEFAULT 'NÃO INFORMADO',
    prontuario TEXT,
    cns TEXT,
    data_nascimento DATE,
    logradouro TEXT,
    numero TEXT,
    complemento TEXT,
    bairro TEXT,
    contato TEXT,
    email TEXT,
    cidade TEXT DEFAULT 'SÃO PAULO',
    uf TEXT DEFAULT 'SP',
    operador_responsavel TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.operadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;

-- 4. Create basic policies (Allow all for development, should be hardened for production)
-- NOTE: Using "IF NOT EXISTS" style for policies is not directly supported in standard SQL, 
-- so we drop and recreate to ensure they are applied correctly.
DROP POLICY IF EXISTS "Allow all access for development" ON public.operadores;
CREATE POLICY "Allow all access for development" ON public.operadores
    FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access for development" ON public.pacientes;
CREATE POLICY "Allow all access for development" ON public.pacientes
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 5. Helper function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Triggers for updated_at
CREATE TRIGGER update_operadores_updated_at
    BEFORE UPDATE ON public.operadores
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_pacientes_updated_at
    BEFORE UPDATE ON public.pacientes
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- 7. Create the professional categories table (Categorias Profissionais)
CREATE TABLE IF NOT EXISTS public.categorias_profissionais (
    cbo TEXT PRIMARY KEY,
    categoria TEXT NOT NULL,
    -- vinculo TEXT NOT NULL DEFAULT 'INTERMEDIADO' CHECK (vinculo IN ('DIRETO', 'INTERMEDIADO')),
    -- tipo_vinculo TEXT NOT NULL DEFAULT 'CLT' CHECK (tipo_vinculo IN ('CLT', 'ESTATUTARIO', 'AUTÔNOMO')),
    -- chs INTEGER NOT NULL DEFAULT 20 CHECK (chs IN (20, 30, 40)),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Enable Row Level Security (RLS) for the new table
ALTER TABLE public.categorias_profissionais ENABLE ROW LEVEL SECURITY;

-- 9. Create basic policies for the new table
CREATE POLICY "Allow all access for development" ON public.categorias_profissionais
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 10. Trigger for updated_at for the new table
CREATE TRIGGER update_categorias_profissionais_updated_at
    BEFORE UPDATE ON public.categorias_profissionais
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- 11. Create the professionals table (Profissionais)
CREATE TABLE IF NOT EXISTS public.profissionais (
    cpf TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    cns TEXT,
    cbo TEXT REFERENCES public.categorias_profissionais(cbo),
    equipe TEXT NOT NULL DEFAULT 'SEM EQUIPE',
    vinculo TEXT NOT NULL DEFAULT 'INTERMEDIADO' CHECK (vinculo IN ('DIRETO', 'INTERMEDIADO')),
    tipo_vinculo TEXT NOT NULL DEFAULT 'CLT' CHECK (tipo_vinculo IN ('CLT', 'ESTATUTARIO', 'AUTÔNOMO')),
    chs INTEGER NOT NULL DEFAULT 20 CHECK (chs IN (20, 30, 40)),
    situacao TEXT NOT NULL DEFAULT 'ATIVO' CHECK (situacao IN ('ATIVO', 'INATIVO')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 12. Enable Row Level Security (RLS) for the new table
ALTER TABLE public.profissionais ENABLE ROW LEVEL SECURITY;

-- 13. Create basic policies for the new table
CREATE POLICY "Allow all access for development" ON public.profissionais
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 14. Trigger for updated_at for the new table
CREATE TRIGGER update_profissionais_updated_at
    BEFORE UPDATE ON public.profissionais
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- 15. Create the routines table (Rotinas)
CREATE TABLE IF NOT EXISTS public.rotinas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo TEXT NOT NULL CHECK (tipo IN ('EXAME', 'VACINA', 'MEDICACAO')),
    descricao TEXT NOT NULL,
    trimestre TEXT NOT NULL CHECK (trimestre IN ('PRIMEIRO', 'SEGUNDO', 'TERCEIRO')),
    categoria TEXT NOT NULL DEFAULT 'OBRIGATORIO' CHECK (categoria IN ('OBRIGATORIO', 'OPCIONAL', 'EVENTUAL')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 16. Enable Row Level Security (RLS) for the new table
ALTER TABLE public.rotinas ENABLE ROW LEVEL SECURITY;

-- 17. Create basic policies for the new table
CREATE POLICY "Allow all access for development" ON public.rotinas
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 18. Trigger for updated_at for the new table
CREATE TRIGGER update_rotinas_updated_at
    BEFORE UPDATE ON public.rotinas
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- 19. Create the health units table (Unidades de Saúde)
CREATE TABLE IF NOT EXISTS public.unidades_saude (
    cnes TEXT PRIMARY KEY,
    nome_fantasia TEXT NOT NULL,
    logradouro TEXT,
    numero TEXT,
    complemento TEXT,
    bairro TEXT,
    municipio TEXT NOT NULL DEFAULT 'SAO PAULO',
    uf TEXT NOT NULL DEFAULT 'SP',
    cep TEXT,
    telefone TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 20. Enable Row Level Security (RLS) for the new table
ALTER TABLE public.unidades_saude ENABLE ROW LEVEL SECURITY;

-- 21. Create basic policies for the new table
CREATE POLICY "Allow all access for development" ON public.unidades_saude
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 22. Trigger for updated_at for the new table
CREATE TRIGGER update_unidades_saude_updated_at
    BEFORE UPDATE ON public.unidades_saude
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- 23. Create the pregnancies table (Gestações)
CREATE TABLE IF NOT EXISTS public.gestacoes (
    sispn TEXT PRIMARY KEY,
    cpf_paciente TEXT NOT NULL REFERENCES public.pacientes(cpf),
    dum DATE,
    dpp DATE,
    data_abertura DATE,
    data_cadastro DATE,
    operador TEXT NOT NULL DEFAULT 'NÃO INFORMADO',
    referencia_tecnica TEXT NOT NULL DEFAULT 'NÃO INFORMADO',
    acs TEXT NOT NULL DEFAULT 'NÃO INFORMADO',
    equipe TEXT NOT NULL DEFAULT 'NÃO INFORMADO',
    idade_cadastro INTEGER,
    fase_vida_cadastro TEXT,
    gestacao_anterior INTEGER DEFAULT 0,
    aborto INTEGER DEFAULT 0,
    parto INTEGER DEFAULT 0,
    sifilis TEXT CHECK (sifilis IN ('SIM', 'NÃO', 'NÃO SABE')),
    sifilis_tratada TEXT CHECK (sifilis_tratada IN ('SIM', 'NÃO', 'NÃO SABE')),
    hiv TEXT CHECK (hiv IN ('POSITIVO', 'NEGATIVO')),
    hepatite_b TEXT CHECK (hepatite_b IN ('REAGENTE', 'NÃO REAGENTE')),
    hepatite_c TEXT CHECK (hepatite_c IN ('REAGENTE', 'NÃO REAGENTE')),
    classificacao_pn TEXT CHECK (classificacao_pn IN ('HABITUAL', 'RISCO')),
    alto_risco_compartilhado TEXT CHECK (alto_risco_compartilhado IN ('SIM', 'NÃO')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 24. Enable Row Level Security (RLS) for the new table
ALTER TABLE public.gestacoes ENABLE ROW LEVEL SECURITY;

-- 25. Create basic policies for the new table
DROP POLICY IF EXISTS "Allow all access for development" ON public.gestacoes;
CREATE POLICY "Allow all access for development" ON public.gestacoes
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 26. Trigger for updated_at for the new table
DROP TRIGGER IF EXISTS update_gestacoes_updated_at ON public.gestacoes;
CREATE TRIGGER update_gestacoes_updated_at
    BEFORE UPDATE ON public.gestacoes
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- 27. Create the appointments table (Atendimentos)
CREATE TABLE IF NOT EXISTS public.atendimentos (
    id_atendimento UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sispn TEXT NOT NULL REFERENCES public.gestacoes(sispn),
    data_consulta DATE NOT NULL,
    trimestre_consulta TEXT CHECK (trimestre_consulta IN ('1º TRIMESTRE', '2º TRIMESTRE', '3º TRIMESTRE')),
    cbo TEXT NOT NULL,
    cpf TEXT NOT NULL DEFAULT 'NÃO INFORMADO',
    data_proxima_consulta DATE,
    observacoes_clinicas TEXT,
    cpf_operador TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 28. Enable Row Level Security (RLS) for the new table
ALTER TABLE public.atendimentos ENABLE ROW LEVEL SECURITY;

-- 29. Create basic policies for the new table
CREATE POLICY "Allow all access for development" ON public.atendimentos
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 30. Trigger for updated_at for the new table
CREATE TRIGGER update_atendimentos_updated_at
    BEFORE UPDATE ON public.atendimentos
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
