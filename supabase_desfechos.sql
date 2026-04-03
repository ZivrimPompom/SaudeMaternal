-- 1. Create the outcomes table (Desfechos)
CREATE TABLE IF NOT EXISTS public.desfechos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sispn TEXT NOT NULL REFERENCES public.gestacoes(sispn) ON DELETE CASCADE,
    tipo_desfecho TEXT NOT NULL CHECK (tipo_desfecho IN ('PARTO', 'ABORTO', 'MUDOU-SE', 'ÓBITO', 'CONVÊNIO MÉDICO', 'OUTROS')),
    data_desfecho DATE NOT NULL,
    unidade_cnes TEXT REFERENCES public.unidades_saude(cnes),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create the newborns table (Recém-nascidos)
CREATE TABLE IF NOT EXISTS public.recem_nascidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_desfecho UUID NOT NULL REFERENCES public.desfechos(id) ON DELETE CASCADE,
    nome_rn TEXT,
    cpf_rn TEXT,
    data_nascimento DATE NOT NULL,
    data_consulta_rn DATE,
    comparecimento BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.desfechos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recem_nascidos ENABLE ROW LEVEL SECURITY;

-- 4. Create basic policies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'desfechos' AND policyname = 'Allow all access for development'
    ) THEN
        CREATE POLICY "Allow all access for development" ON public.desfechos FOR ALL USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'recem_nascidos' AND policyname = 'Allow all access for development'
    ) THEN
        CREATE POLICY "Allow all access for development" ON public.recem_nascidos FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 5. Triggers for updated_at
DROP TRIGGER IF EXISTS update_desfechos_updated_at ON public.desfechos;
CREATE TRIGGER update_desfechos_updated_at BEFORE UPDATE ON public.desfechos FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_recem_nascidos_updated_at ON public.recem_nascidos;
CREATE TRIGGER update_recem_nascidos_updated_at BEFORE UPDATE ON public.recem_nascidos FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
