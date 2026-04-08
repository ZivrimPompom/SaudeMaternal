erDiagram
    unidades_saude {
        text cnes PK
        text nome_fantasia
        text logradouro
        text numero
        text complemento
        text bairro
        text municipio
        text uf
        text cep
        text telefone
        timestamptz created_at
        timestamptz updated_at
    }

    operadores {
        uuid id PK
        text nome
        text cpf UK
        text senha
        text status
        text nivel_acesso
        text sigla
        text unidade_cnes FK
        timestamptz created_at
        timestamptz updated_at
    }

    pacientes {
        uuid id PK
        text gestante
        text cpf UK
        text nome_mae
        text prontuario
        text cns
        date data_nascimento
        text logradouro
        text numero
        text complemento
        text bairro
        text contato
        text email
        text cidade
        text uf
        text operador_responsavel
        text unidade_cnes FK
        timestamptz created_at
        timestamptz updated_at
    }

    categorias_profissionais {
        text cbo PK
        text categoria
        timestamptz created_at
        timestamptz updated_at
    }

    profissionais {
        text cpf PK
        text nome
        text cns
        text cbo FK
        text equipe
        text vinculo
        text tipo_vinculo
        int chs
        text situacao
        text unidade_cnes FK
        text unidade_cnes_operador FK
        timestamptz created_at
        timestamptz updated_at
    }

    rotinas {
        uuid id PK
        text tipo
        text descricao
        text trimestre
        text categoria
        text unidade_cnes FK
        timestamptz created_at
        timestamptz updated_at
    }

    gestacoes {
        text sispn PK
        text cpf_paciente FK
        date dum
        date dpp
        date data_abertura
        date data_cadastro
        text operador
        text referencia_tecnica
        text acs
        text equipe
        int idade_cadastro
        text fase_vida_cadastro
        int gestacao_anterior
        int aborto
        int parto
        text sifilis
        text sifilis_tratada
        text hiv
        text hepatite_b
        text hepatite_c
        text classificacao_pn
        text alto_risco_compartilhado
        text unidade_cnes FK
        timestamptz created_at
        timestamptz updated_at
    }

    atendimentos {
        uuid id_atendimento PK
        text sispn FK
        date data_consulta
        text trimestre_consulta
        text cbo
        text cpf
        date data_proxima_consulta
        text observacoes_clinicas
        text cpf_operador
        text unidade_cnes FK
        timestamptz created_at
        timestamptz updated_at
    }

    desfechos {
        uuid id PK
        text sispn FK
        text tipo_desfecho
        date data_desfecho
        text unidade_cnes FK
        timestamptz created_at
        timestamptz updated_at
    }

    recem_nascidos {
        uuid id PK
        uuid id_desfecho FK
        text nome_rn
        text cpf_rn
        date data_nascimento
        date data_consulta_rn
        bool comparecimento
        timestamptz created_at
        timestamptz updated_at
    }

    registro_rotinas {
        uuid id_registro PK
        text sispn FK
        uuid id_rotina FK
        text tipo
        date data_realizacao
        text resultado
        text observacoes
        text trimestre_realizacao
        text cbo
        text cpf_profissional
        text cpf_operador
        text unidade_cnes FK
        timestamptz created_at
        timestamptz updated_at
    }

    unidades_saude ||--o{ operadores : "unidade"
    unidades_saude ||--o{ pacientes : "unidade"
    unidades_saude ||--o{ profissionais : "unidade"
    unidades_saude ||--o{ rotinas : "unidade"
    unidades_saude ||--o{ gestacoes : "unidade"
    unidades_saude ||--o{ atendimentos : "unidade"
    unidades_saude ||--o{ desfechos : "unidade"
    unidades_saude ||--o{ registro_rotinas : "unidade"

    pacientes ||--o{ gestacoes : "cpf_paciente"

    categorias_profissionais ||--o{ profissionais : "cbo"

    gestacoes ||--o{ atendimentos : "sispn"
    gestacoes ||--o{ desfechos : "sispn"
    gestacoes ||--o{ registro_rotinas : "sispn"

    desfechos ||--o{ recem_nascidos : "id_desfecho"

    rotinas ||--o{ registro_rotinas : "id_rotina"