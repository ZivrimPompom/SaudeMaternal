-- FIX TRIGGERS AND SCHEMA FOR UNIT ASSOCIATION
-- This script ensures all triggers handle "already exists" and all tables have the unidade_cnes column.

-- 1. Helper function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 2. Ensure triggers are created safely
DROP TRIGGER IF EXISTS update_unidades_saude_updated_at ON public.unidades_saude;
CREATE TRIGGER update_unidades_saude_updated_at BEFORE UPDATE ON public.unidades_saude FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_operadores_updated_at ON public.operadores;
CREATE TRIGGER update_operadores_updated_at BEFORE UPDATE ON public.operadores FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_pacientes_updated_at ON public.pacientes;
CREATE TRIGGER update_pacientes_updated_at BEFORE UPDATE ON public.pacientes FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_categorias_profissionais_updated_at ON public.categorias_profissionais;
CREATE TRIGGER update_categorias_profissionais_updated_at BEFORE UPDATE ON public.categorias_profissionais FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_profissionais_updated_at ON public.profissionais;
CREATE TRIGGER update_profissionais_updated_at BEFORE UPDATE ON public.profissionais FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_rotinas_updated_at ON public.rotinas;
CREATE TRIGGER update_rotinas_updated_at BEFORE UPDATE ON public.rotinas FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_gestacoes_updated_at ON public.gestacoes;
CREATE TRIGGER update_gestacoes_updated_at BEFORE UPDATE ON public.gestacoes FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_atendimentos_updated_at ON public.atendimentos;
CREATE TRIGGER update_atendimentos_updated_at BEFORE UPDATE ON public.atendimentos FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_registro_rotinas_updated_at ON public.registro_rotinas;
CREATE TRIGGER update_registro_rotinas_updated_at BEFORE UPDATE ON public.registro_rotinas FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 3. Ensure all tables have unidade_cnes (if not already present)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pacientes' AND column_name='unidade_cnes') THEN
        ALTER TABLE public.pacientes ADD COLUMN unidade_cnes TEXT REFERENCES public.unidades_saude(cnes);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profissionais' AND column_name='unidade_cnes') THEN
        ALTER TABLE public.profissionais ADD COLUMN unidade_cnes TEXT REFERENCES public.unidades_saude(cnes);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profissionais' AND column_name='unidade_cnes_operador') THEN
        ALTER TABLE public.profissionais ADD COLUMN unidade_cnes_operador TEXT REFERENCES public.unidades_saude(cnes);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rotinas' AND column_name='unidade_cnes') THEN
        ALTER TABLE public.rotinas ADD COLUMN unidade_cnes TEXT REFERENCES public.unidades_saude(cnes);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gestacoes' AND column_name='unidade_cnes') THEN
        ALTER TABLE public.gestacoes ADD COLUMN unidade_cnes TEXT REFERENCES public.unidades_saude(cnes);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='atendimentos' AND column_name='unidade_cnes') THEN
        ALTER TABLE public.atendimentos ADD COLUMN unidade_cnes TEXT REFERENCES public.unidades_saude(cnes);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='registro_rotinas' AND column_name='unidade_cnes') THEN
        ALTER TABLE public.registro_rotinas ADD COLUMN unidade_cnes TEXT REFERENCES public.unidades_saude(cnes);
    END IF;
END $$;
