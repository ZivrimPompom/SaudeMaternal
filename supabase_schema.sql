-- SUPABASE SCHEMA - SAÚDE MATERNAL
-- Copy and paste this into the Supabase SQL Editor

-- 1. Create the operators table (Operadores)
CREATE TABLE IF NOT EXISTS public.operadores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    cpf TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL, -- In a real app, this would be hashed
    status TEXT NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Bloqueado')),
    initials TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create the patients table (Pacientes) - Essential for Maternal Health
CREATE TABLE IF NOT EXISTS public.pacientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    cpf TEXT UNIQUE,
    birth_date DATE,
    phone TEXT,
    email TEXT,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.operadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;

-- 4. Create basic policies (Allow all for development, should be hardened for production)
CREATE POLICY "Allow all access for development" ON public.operadores
    FOR ALL
    USING (true)
    WITH CHECK (true);

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
