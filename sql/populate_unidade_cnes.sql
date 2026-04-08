-- Script para popular unidade_cnes nos registros existentes
-- baseando-se no cpf_operador de cada registro

-- Atualizar pacientes
UPDATE pacientes p
SET unidade_cnes = o.unidade_cnes
FROM operadores o
WHERE p.cpf_operador = o.cpf
AND p.unidade_cnes IS NULL;

-- Atualizar gestacoes
UPDATE gestacoes g
SET unidade_cnes = o.unidade_cnes
FROM operadores o
WHERE g.cpf_operador = o.cpf
AND g.unidade_cnes IS NULL;

-- Atualizar atendimentos
UPDATE atendimentos a
SET unidade_cnes = o.unidade_cnes
FROM operadores o
WHERE a.cpf_operador = o.cpf
AND a.unidade_cnes IS NULL;

-- Atualizar desfechos_e_rn
UPDATE desfechos_e_rn d
SET unidade_cnes = o.unidade_cnes
FROM operadores o
WHERE d.cpf_operador = o.cpf
AND d.unidade_cnes IS NULL;

-- Atualizar registro_rotinas
UPDATE registro_rotinas r
SET unidade_cnes = o.unidade_cnes
FROM operadores o
WHERE r.cpf_operador = o.cpf
AND r.unidade_cnes IS NULL;

-- Atualizar profissionais
UPDATE profissionais p
SET unidade_cnes_operador = o.unidade_cnes
FROM operadores o
WHERE p.cpf_operador = o.cpf
AND p.unidade_cnes_operador IS NULL;

-- Confirmar registros atualizados
SELECT 'Pacientes atualizados:' AS tabela, COUNT(*) AS quantidade FROM pacientes WHERE unidade_cnes IS NOT NULL
UNION ALL
SELECT 'Gestacoes atualizadas:', COUNT(*) FROM gestacoes WHERE unidade_cnes IS NOT NULL
UNION ALL
SELECT 'Atendimentos atualizados:', COUNT(*) FROM atendimentos WHERE unidade_cnes IS NOT NULL
UNION ALL
SELECT 'Desfechos atualizados:', COUNT(*) FROM desfechos_e_rn WHERE unidade_cnes IS NOT NULL
UNION ALL
SELECT 'Registro_rotinas atualizados:', COUNT(*) FROM registro_rotinas WHERE unidade_cnes IS NOT NULL
UNION ALL
SELECT 'Profissionais atualizados:', COUNT(*) FROM profissionais WHERE unidade_cnes_operador IS NOT NULL;
