-- Popular cpf_profissional na tabela registro_rotinas com valor de teste 08014955803
-- Isso ajuda a validar se o enriquecimento de dados está funcionando corretamente

UPDATE public.registro_rotinas
SET cpf_profissional = '08014955803'
WHERE cpf_profissional IS NULL 
   OR cpf_profissional = 'NÃO INFORMADO'
   OR cpf_profissional = '';

-- Verificar quantos registros foram atualizados
SELECT COUNT(*) as total_atualizados 
FROM public.registro_rotinas 
WHERE cpf_profissional = '08014955803';

-- Ver alguns exemplos dos dados atualizados
SELECT id_registro, sispn, cpf_profissional, id_rotina, data_realizacao
FROM public.registro_rotinas
WHERE cpf_profissional = '08014955803'
LIMIT 10;
