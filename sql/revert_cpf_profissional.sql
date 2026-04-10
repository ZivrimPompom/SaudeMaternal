-- Reverter cpf_profissional para "NÃO INFORMADO" nos registros que foram atualizados com teste

UPDATE public.registro_rotinas
SET cpf_profissional = 'NÃO INFORMADO'
WHERE cpf_profissional = '08014955803';

-- Verificar quantos registros foram revertidos
SELECT COUNT(*) as total_revertidos 
FROM public.registro_rotinas 
WHERE cpf_profissional = 'NÃO INFORMADO';

-- Ver alguns exemplos dos dados revertidos
SELECT id_registro, sispn, cpf_profissional, id_rotina, data_realizacao
FROM public.registro_rotinas
WHERE cpf_profissional = 'NÃO INFORMADO'
LIMIT 10;
