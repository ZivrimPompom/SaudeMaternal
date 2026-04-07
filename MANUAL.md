# MANUAL COMPLETO DE OPERAÇÃO - SAÚDE MATERNAL

## 1. VISÃO GERAL DO SISTEMA

O **Saúde Maternal** é um aplicativo web desenvolvido em Next.js para gestão do programa de saúde maternal (similar ao programa Mãe Paulistana). O sistema permite o cadastro e acompanhamento de gestantes, gestações, atendimentos, exames e desfechos gestacionais.

### Tecnologias Utilizadas:
- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Estilização**: Tailwind CSS, Material Symbols
- **Backend/BD**: Supabase (PostgreSQL)
- **Animações**: Framer Motion
- **Gráficos**: Recharts (para dashboard analítico)

### Estrutura de Navegação:
```
/                           -> Dashboard Principal
/login                     -> Página de Login
/pacientes                 -> Cadastro de Pacientes/Gestantes
/gestacoes                 -> Cadastro e Acompanhamento de Gestações
/atendimentos              -> Registro de Consultas
/exames                    -> Registro de Exames e Vacinas
/desfechos                 -> Registro de Desfechos (Parto/Aborto)
/profissionais             -> Cadastro de Profissionais de Saúde
/categorias               -> Categorias Profissionais (CBO)
/unidades                  -> Unidades de Saúde (UBS/Hospital)
/operadores                -> Operadores do Sistema (Admin)
/rotinas                   -> Protocolos e Rotinas do Pré-Natal
/dashboard/overview        -> Dashboard Analítico
```

---

## 2. MÓDULO DE AUTENTICAÇÃO

### 2.1 Login
- **URL**: `/login`
- **Funcionalidade**: Autenticação de operadores do sistema
- **Campos**:
  - CPF (formatado: 000.000.000-00)
  - Senha
- **Validações**:
  - CPF válido (algoritmo de verificação)
  - Operador deve estar ativo
- **Fluxo**:
  1. Usuário insere CPF e senha
  2. Sistema valida credenciais na tabela `operadores`
  3. Se válido e ativo, redireciona para Dashboard Principal
  4. Se bloqueado, exibe mensagem para procurar administrador

### 2.2 Níveis de Acesso
- **Administrador**: Acesso total a todas as funcionalidades, incluindo gestão de operadores
- **Usuário**: Acesso restrito à sua unidade de saúde

---

## 3. MÓDULO DE PACIENTES

### 3.1 Funcionalidade
- **URL**: `/pacientes`
- Gerenciamento do cadastro de gestantes/pacientes

### 3.2 Campos do Formulário
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Nome da Gestante | Texto | Sim | Nome completo em uppercase |
| CPF | Texto | Sim | CPF único (não editável após cadastro) |
| CNS | Texto | Não | Número do Cartão Nacional de Saúde |
| Prontuário | Texto | Não | Número do prontuário local |
| Data de Nascimento | Data | Não | Calcula idade automaticamente |
| Nome da Mãe | Texto | Não | Nome da mãe da gestante |
| Contato | Texto | Não | Telefone com formatação automática |
| E-mail | Texto | Não | Endereço de e-mail |
| Logradouro | Texto | Não | Endereço - rua/avenida |
| Número | Texto | Não | Número do endereço |
| Complemento | Texto | Não | Complemento do endereço |
| Bairro | Texto | Não | Bairro |
| Cidade | Texto | Automático | fixed "SÃO PAULO" |
| UF | Texto | Automático | fixed "SP" |

### 3.3 Filtros Disponíveis
- **Busca**: Por nome, CPF ou prontuário
- **Fase da Vida**: Infância, Adolescência, Idade Adulta, Velhice (calculado pela data de nascimento)

### 3.4 Ações
- **Novo**: Abre formulário para cadastro
- **Editar**: Preenche formulário com dados existentes (CPF bloqueado)
- **Excluir**: Confirmação via modal (exclusão definitiva)
- **Exportar CSV**: Download da lista filtrada

---

## 4. MÓDULO DE GESTAÇÕES

### 4.1 Funcionalidade
- **URL**: `/gestacoes`
- Cadastro e acompanhamento das gestações ativas

### 4.2 Campos do Formulário

#### Identificação da Gestante
- **Nome da Paciente**: Busca em lista suspensa (busca por nome/CPF na tabela pacientes)
- **CPF**: Exibido automaticamente ao selecionar paciente
- **SISPN**: Número do sistema (único, não editável após cadastro)

#### Datas e Prazos
| Campo | Tipo | Descrição |
|-------|------|-----------|
| DUM | Data | Data da Última Menstruação (calcula DPP automaticamente) |
| DPP | Data | Data Provável do Parto (280 dias após DUM, calculado automaticamente) |
| Data Abertura | Data | Data de abertura do registro |
| Data Cadastro | Data | Data de cadastro no sistema |

#### Responsáveis e Equipe
- **Referência Técnica**: Busca de enfermeiros (CBO 2235)
- **ACS**: Agente de Saúde (CBO 515105)
- **Equipe**: Automático ao selecionar profissional

#### Histórico Obstétrico
| Campo | Tipo | Padrão |
|-------|------|--------|
| Gestação Anterior | Número | 0 |
| Aborto | Número | 0 |
| Parto | Número | 0 |

#### Exames Admissionais
| Campo | Opções |
|-------|--------|
| Sífilis | SIM, NÃO, NÃO SABE |
| Sífilis Tratada | SIM, NÃO, NÃO SABE |
| HIV | POSITIVO, NEGATIVO |
| Hepatite B | REAGENTE, NÃO REAGENTE |
| Hepatite C | REAGENTE, NÃO REAGENTE |

#### Classificação
| Campo | Opções |
|-------|--------|
| Classificação PN | HABITUAL, RISCO |
| Alto Risco Compartilhado | SIM, NÃO |

### 4.3 Indicadores Calculados
- **Semanas Atuais**: Calculado a partir da DUM
- **Captação**: PRECOCE (até 12 semanas) ou TARDIA (após 12 semanas)
- **Status**: ATIVA ou VENCIDA (baseado na DPP)

### 4.4 Filtros Disponíveis
- **DPP**: Por mês/ano
- **Captação**: Precoce ou Tardia
- **Equipe**: Filtrar por equipe de saúde
- **Referência**: Filtrar por enfermeiro responsável
- **ACS**: Filtrar por agente de saúde
- **Status**: ATIVA ou VENCIDA

---

## 5. MÓDULO DE ATENDIMENTOS

### 5.1 Funcionalidade
- **URL**: `/atendimentos`
- Registro de consultas e atendimentos durante o pré-natal

### 5.2 Estrutura de Lançamento
O sistema permite lançamento em formato de planilha (múltiplas linhas):
- **Data Consulta**: Data do atendimento
- **Trimestre**: Calculado automaticamente pela DUM da gestação
- **Profissional**: Selecionado da lista de profissionais ativos
- **Próxima Consulta**: Data da próxima consulta agendada
- **Observações**: Campo textual para observações clínicas

### 5.3 Validações
- Não permite atendimento em gestações VENCIDAS
- Data da consulta deve estar dentro do período gestacional (0-280 dias)

### 5.4 Indicadores por Gestante
- **Total de Atendimentos**: Contagem de consultas
- **Último Atendimento**: Data da última consulta
- **Próxima Consulta**: Data agendada
- **Alertas**: 
  - "SEM CONSULTAS" se nenhuma consulta registrada
  - "X/Y CONSULTAS" se abaixo do mínimo (3 no 1º trim, 6 no 2º, 9 no 3º)

### 5.5 Filtros Disponíveis
- **DPP**: Por mês/ano de DPP
- **Trimestre**: 1º, 2º, 3º Trimestre
- **Categoria**: Médico, Enfermeiro, Dentista, etc.
- **Equipe**: Filtrar por equipe

---

## 6. MÓDULO DE EXAMES

### 6.1 Funcionalidade
- **URL**: `/exames`
- Registro de exames e procedimentos do pré-natal

### 6.2 Estrutura
Semelhante ao módulo de atendimentos, permite múltiplos registros por gestante:
- **Rotina**: Selecionar da lista de rotinas cadastradas
- **Data Realização**: Data do exame/procedimento
- **Resultado**: Campo de texto (ex: "NEGATIVO / NÃO REAGENTE")
- **Profissional**: Responsável pelo procedimento

### 6.3 Tipos de Rotina
- **Tipo**: EXAME, VACINA, MEDICACAO
- **Trimestre**: PRIMEIRO, SEGUNDO, TERCEIRO
- **Categoria**: OBRIGATORIO, OPCIONAL, EVENTUAL

### 6.4 Indicadores
- **Resultados Positivos**: Destaca gestações com resultados alterados
- **Último Resultado**: Data do exame mais recente
- **Total de Exames**: Contagem de registros

---

## 7. MÓDULO DE DESFECHOS

### 7.1 Funcionalidade
- **URL**: `/desfechos`
- Registro do encerramento da gestação (parto, aborto, óbito, etc.)

### 7.2 Tipos de Desfecho
- PARTO
- ABORTO
- MUDOU-SE
- ÓBITO
- CONVÊNIO MÉDICO
- OUTROS

### 7.3 Dados do Recém-Nascido (para Parto)
- Nome do RN
- CPF do RN
- Data de Nascimento (copia a data do desfecho)
- Data da Consulta do RN
- Comparecimento (sim/não)

### 7.4 Status do RN
- **EM DIA**: Consulta realizada até 10 dias após nascimento
- **ATRASADO**: Consulta não realizada após 10 dias do nascimento

---

## 8. MÓDULO DE CADASTROS ADMINISTRATIVOS

### 8.1 Operadores (Admin apenas)
- **URL**: `/operadores`
- Gerenciamento de usuários do sistema
- Campos: Nome, CPF, Senha, Status (Ativo/Bloqueado), Nível de Acesso (Administrador/Usuário), Unidade

### 8.2 Unidades de Saúde
- **URL**: `/unidades`
- Cadastro de UBS e estabelecimentos de saúde
- Campos: CNES, Nome Fantasia, Endereço, Telefone

### 8.3 Categorias Profissionais
- **URL**: `/categorias`
- Cadastro de categorias por CBO (Código Brasileiro de Ocupações)
- Ex: 2235 - Enfermeiro, 2251 - Médico Clínico

### 8.4 Profissionais
- **URL**: `/profissionais`
- Cadastro de profissionais de saúde
- Campos: Nome, CPF, CNS, CBO, Equipe, Vínculo, CHS (20/30/40h), Situação

### 8.5 Rotinas/Protocolos
- **URL**: `/rotinas`
- Cadastro de exames e procedimentos do pré-natal
- Campos: Tipo (Exame/Vacina/Medicação), Descrição, Trimestre, Categoria

---

## 9. DASHBOARD ANALÍTICO

### 9.1 Visão Geral
- **URL**: `/dashboard/overview`
- Painel de indicadores e gráficos

### 9.2 Estatísticas Principais
- Total de Gestações
- Total de Pacientes
- Total de Atendimentos
- Total de Exames Realizados

### 9.3 Gráficos Disponíveis
1. **Produtividade Mensal**: Gráfico de área comparando atendimentos x exames por mês
2. **Classificação de Risco**: Gráfico de pizza (HABITUAL vs RISCO)
3. **Gestações por Trimestre**: Gráfico de barras

### 9.4 Filtros Globais
- **Unidade**: Filtrar por unidade de saúde (bloqueado para não-administradores)
- **Rotina**: Filtrar por tipo de rotina
- **Trimestre**: Filtrar por período gestacional
- **Risco**: Filtrar por classificação (HABITUAL/RISCO)

### 9.5 Meta de Cobertura
- Indicador visual de progresso percentual

---

## 10. BANCO DE DADOS (SUPABASE)

### 10.1 Tabelas Principais

| Tabela | Descrição | Chave Primária |
|--------|-----------|----------------|
| `operadores` | Usuários do sistema | id (UUID) |
| `unidades_saude` | Estabelecimentos de saúde | cnes |
| `pacientes` | Cadastro de gestantes | cpf |
| `categorias_profissionais` | Categorias CBO | cbo |
| `profissionais` | Profissionais de saúde | cpf |
| `rotinas` | Protocolos do pré-natal | id |
| `gestacoes` | Registros de gestações | sispn |
| `atendimentos` | Consultas realizadas | id_atendimento |
| `desfechos_e_rn` | Encerramento de gestações | id |

### 10.2 Relacionamentos
- Pacientes 1:N Gestações (via cpf)
- Gestações 1:N Atendimentos (via sispn)
- Gestações 1:N Exames (via sispn)
- Gestações 1:1 Desfechos (via sispn)
- Profissionais N:1 Categorias (via cbo)

---

## 11. COMPONENTES REUTILIZÁVEIS

### 11.1 DashboardLayout
- Layout base com sidebar e topbar
- Gerencia estado de autenticação
- Responsivo (funciona em mobile e desktop)

### 11.2 Sidebar
- Menu de navegação responsivo
- Itens expansíveis (submenus)
- Controle de acesso por nível (Admin vs Usuário)

### 11.3 SearchInput
- Campo de busca global
- Filtra dados em tempo real

### 11.4 Pagination
- Controles de paginação
- Exibe total de registros

### 11.5 RecordsSummary
- Exibe total de registros vs registros filtrados

### 11.6 PatientBanner
- Exibe informações resumidas da gestante
- Used em formulários de atendimento/exames

---

## 12. CONTEXTOS (STATE MANAGEMENT)

### 12.1 AuthContext
- Gerencia autenticação do usuário
- Métodos: signInWithCpf, signOut
- Armazena usuário no localStorage

### 12.2 SearchContext
- Gerencia estado de busca global
- Controla abertura/fechamento de formulários
- Gerencia exportação CSV
- Trigger de refresh de dados

### 12.3 ThemeContext
- Gerencia tema claro/escuro

---

## 13. FLUXOS DE OPERAÇÃO

### 13.1 Fluxo de Cadastro de Gestante
1. Acessar `/pacientes`
2. Clicar em "Nova Paciente"
3. Preencher dados cadastrais
4. Salvar

### 13.2 Fluxo de Acompanhamento
1. Acessar `/gestacoes`
2. Selecionar gestante (buscar por nome/CPF)
3. Preencher dados da gestação (DUM, RT, ACS)
4. Salvar gestação

### 13.3 Registro de Atendimento
1. Acessar `/atendimentos`
2. Buscar gestante (apenas gestações ATIVAS)
3. Selecionar gestante
4. Preencher dados da consulta (data, profissional)
5. Adicionar linha se necessário (múltiplos atendimentos)
6. Salvar

### 13.4 Registro de Desfecho
1. Acessar `/desfechos`
2. Selecionar gestante (busca em gestações)
3. Informar tipo de desfecho e data
4. Se parto, informar dados do RN
5. Salvar

---

## 14. CONFIGURAÇÕES E VARIÁVEIS AMBIENTE

Para o sistema funcionar com banco de dados real, configurar:
```
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon_key]
```

Se não configurado, o sistema usa dados mock para demonstração.

---

## 15. IMPORT/EXPORT

### 15.1 Exportação CSV
Todas as páginas possuem botão de exportação CSV:
- Pacientes: `/pacientes.csv`
- Gestações: `/gestacoes.csv`
- Atendimentos: `/atendimentos.csv`
- Profissionais: `/profissionais.csv`
- Rotinas: `/rotinas.csv`

---

## 16. TABELAS DO SISTEMA

### Resumo das Funcionalidades por Página

| Página | Funcionalidade | Principais Campos | Filtros |
|--------|----------------|-------------------|----------|
| Login | Autenticação | CPF, Senha | - |
| Pacientes | Cadastro de Gestantes | Nome, CPF, CNS, Prontuário, Endereço | Busca, Fase da Vida |
| Gestações | Acompanhamento | DUM, DPP, SISPN, Equipe | Status, DPP, Captação, Equipe, RT, ACS |
| Atendimentos | Registro de Consultas | Data, Trimestre, Profissional | DPP, Trimestre, Categoria, Equipe |
| Exames | Registro de Exames | Rotina, Data, Resultado | Tipo, Trimestre |
| Desfechos | Encerramento | Tipo, Data, RN | Tipo |
| Profissionais | Cadastro | Nome, CPF, CBO, Equipe | CBO, Equipe, Situação |
| Operadores | Gestão de Usuários | Nome, CPF, Nível, Unidade | Nível, Status |
| Unidades | Estabelecimentos | CNES, Nome, Endereço | - |
| Categorias | CBO | Código, Descrição | - |
| Rotinas | Protocolos | Tipo, Descrição, Trimestre | Tipo |
| Dashboard | Análise | Gráficos e Indicadores | Unidade, Trimestre, Risco |