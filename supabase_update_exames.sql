-- Create the exam results table (Registro de Rotinas / Rotinas de Exames e Vacinas)
CREATE TABLE IF NOT EXISTS public.registro_rotinas (
    id_registro UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sispn TEXT NOT NULL REFERENCES public.gestacoes(sispn) ON DELETE CASCADE,
    id_rotina UUID NOT NULL REFERENCES public.rotinas(id) ON DELETE CASCADE,
    data_realizacao DATE NOT NULL,
    resultado TEXT, -- 'POSITIVO', 'NEGATIVO', or custom text
    observacoes TEXT,
    trimestre_realizacao TEXT CHECK (trimestre_realizacao IN ('1º TRIMESTRE', '2º TRIMESTRE', '3º TRIMESTRE')),
    cbo TEXT,
    cpf_profissional TEXT,
    cpf_operador TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.registro_rotinas ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow all access for development" ON public.registro_rotinas
    FOR ALL USING (true) WITH CHECK (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_registro_rotinas_updated_at ON public.registro_rotinas;
CREATE TRIGGER update_registro_rotinas_updated_at
    BEFORE UPDATE ON public.registro_rotinas
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
