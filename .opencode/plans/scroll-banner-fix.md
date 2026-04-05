# Correção do Scroll - Banner Completo ao Visualizar/Adicionar

## Problema
Ao clicar em "Visualizar" ou "Adicionar" na tabela de pacientes, o PatientBanner fica cortado pela metade após o scroll.

## Causa Raiz
O `DashboardLayout` usa `overflow-y-auto` no elemento `<main>`, então:
- `window.scrollTo()` não funciona (scroll é interno ao `main`)
- `scrollIntoView()` não funciona corretamente (não considera o container com overflow)

## Solução
Usar `mainEl.scrollTo()` calculando o offset relativo ao container `main`:
```ts
const mainEl = document.querySelector('main');
const top = formElement.offsetTop - mainEl.offsetTop - 20;
mainEl.scrollTo({ top, behavior: 'smooth' });
```

---

## Mudança 1: EXAMES - `handleViewPatient` (linha 278)

**Arquivo:** `app/exames/page.tsx`

```ts
// ANTES (linha 284-290):
    // Scroll to history table after a short delay
    setTimeout(() => {
      const historyElement = document.getElementById('history-table');
      if (historyElement) {
        historyElement.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);

// DEPOIS:
    // Scroll to form container after animation completes to show full banner
    setTimeout(() => {
      const formElement = document.getElementById('launch-section');
      if (formElement) {
        const mainEl = document.querySelector('main');
        if (mainEl) {
          const top = formElement.offsetTop - mainEl.offsetTop - 20;
          mainEl.scrollTo({ top, behavior: 'smooth' });
        }
      }
    }, 350);
```

---

## Mudança 2: EXAMES - Botão "Adicionar" na tabela (linha ~1235-1241)

**Arquivo:** `app/exames/page.tsx`

```tsx
// ANTES (dentro do onClick do botão add):
                              setIsViewingHistory(false);
                              setIsFormOpen(true); 
                              window.scrollTo({ top: 0, behavior: 'smooth' });

// DEPOIS:
                              setIsViewingHistory(false);
                              setIsFormOpen(true); 
                              setTimeout(() => {
                                const formElement = document.getElementById('launch-section');
                                if (formElement) {
                                  const mainEl = document.querySelector('main');
                                  if (mainEl) {
                                    const top = formElement.offsetTop - mainEl.offsetTop - 20;
                                    mainEl.scrollTo({ top, behavior: 'smooth' });
                                  }
                                }
                              }, 350);
```

---

## Mudança 3: ATENDIMENTOS - Botão "Adicionar" na tabela (linha ~1374-1380)

**Arquivo:** `app/atendimentos/page.tsx`

```tsx
// ANTES (dentro do onClick do botão add):
                              setIsViewingHistory(false);
                              setIsFormOpen(true); 
                              window.scrollTo({ top: 0, behavior: 'smooth' });

// DEPOIS:
                              setIsViewingHistory(false);
                              setIsFormOpen(true); 
                              setTimeout(() => {
                                const formElement = document.getElementById('launch-section');
                                if (formElement) {
                                  const mainEl = document.querySelector('main');
                                  if (mainEl) {
                                    const top = formElement.offsetTop - mainEl.offsetTop - 20;
                                    mainEl.scrollTo({ top, behavior: 'smooth' });
                                  }
                                }
                              }, 350);
```

---

## Resumo

| Arquivo | Função/Local | Antes | Depois |
|---------|-------------|-------|--------|
| exames/page.tsx | handleViewPatient | scrollIntoView(history-table, 100ms) | mainEl.scrollTo(launch-section, 350ms) |
| exames/page.tsx | Botão Adicionar | window.scrollTo(top:0) | mainEl.scrollTo(launch-section, 350ms) |
| atendimentos/page.tsx | Botão Adicionar | window.scrollTo(top:0) | mainEl.scrollTo(launch-section, 350ms) |
