# Configuração do Supabase - Saúde Maternal

Este projeto está preparado para utilizar o Supabase como banco de dados.

## 1. Criar as Tabelas

Você pode criar as tabelas de duas formas:

### Opção A: SQL Editor (Mais fácil)
1. Acesse o painel do Supabase.
2. Vá em **SQL Editor**.
3. Clique em **New Query**.
4. Copie e cole o conteúdo do arquivo `supabase_schema.sql` que está na raiz do projeto.
5. Clique em **Run**.

### Opção B: Migrations (Via Supabase CLI)
Se você estiver usando a CLI do Supabase, o arquivo de migração já está em `supabase/migrations/20260319000000_initial_schema.sql`.

## 2. Tabelas Criadas

- **`operadores`**: Gerencia os perfis de acesso (Nome, CPF, Senha, Status).
- **`pacientes`**: Tabela base para o sistema de saúde maternal (Nome, CPF, Data de Nascimento, etc).

## 3. Conectando ao App

Para conectar o app ao Supabase, você precisará:

1. Instalar o cliente:
   ```bash
   npm install @supabase/supabase-js
   ```

2. Configurar as variáveis de ambiente no arquivo `.env`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=sua-url-aqui
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-aqui
   ```

3. Criar um arquivo de cliente (ex: `lib/supabase.ts`):
   ```typescript
   import { createClient } from '@supabase/supabase-js';

   const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
   const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

   export const supabase = createClient(supabaseUrl, supabaseAnonKey);
   ```

## 4. Segurança (RLS)

As tabelas foram criadas com **Row Level Security (RLS)** habilitado. Por padrão, as políticas criadas permitem acesso total para desenvolvimento. Para produção, você deve restringir o acesso apenas a usuários autenticados.
