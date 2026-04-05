# Correção do Scroll - Offset do TopBar

## Problema
Ao clicar em "Visualizar" ou "Adicionar", o scroll posiciona o formulário mas os botões do TopBar ficam escondidos atrás do TopBar fixo.

## Causa
O TopBar é fixo (`pt-16` = 64px) + padding do conteúdo. O offset atual de `-20` não compensa suficientemente.

## Solução
Trocar offset de `-20` para `-100` em todos os 3 pontos de scroll.

---

## Mudança 1: EXAMES - `handleViewPatient` (linha 278)

**Arquivo:** `app/exames/page.tsx`

```ts
// ANTES:
const top = formElement.offsetTop - mainEl.offsetTop - 20;

// DEPOIS:
const top = formElement.offsetTop - mainEl.offsetTop - 100;
```

---

## Mudança 2: EXAMES - Botão "Adicionar" na tabela (linha ~1235)

**Arquivo:** `app/exames/page.tsx`

```tsx
// ANTES:
const top = formElement.offsetTop - mainEl.offsetTop - 20;

// DEPOIS:
const top = formElement.offsetTop - mainEl.offsetTop - 100;
```

---

## Mudança 3: ATENDIMENTOS - Botão "Adicionar" na tabela (linha ~1374)

**Arquivo:** `app/atendimentos/page.tsx`

```tsx
// ANTES:
const top = formElement.offsetTop - mainEl.offsetTop - 20;

// DEPOIS:
const top = formElement.offsetTop - mainEl.offsetTop - 100;
```
