# Validação — identidade Brabu’s

Data de referência: 2026-11-07 (America/Fortaleza).
Branch: `codex/vitrine-identidade-brabus`.
Base: `main` local, `2c5cecb`.

## Baseline antes da implementação

- `npm test`: 102 testes, 102 aprovados, zero falhas.
- `npm run lint -- .`: zero erros, um aviso preexistente de `react-hooks/exhaustive-deps` em `app/admin/integrations/webhooks/[id]/DeliveriesManager.tsx:42` (`fetchDeliveries`).
- `npm run build`: build de produção concluído; resultado final confirmado pelo processo com exit code 0.
- Existe suite automatizada, embora a descrição de testes do `AGENTS.md` ainda diga que não há suite. Usar os comandos reais de `package.json`; não ampliar o escopo para corrigir documentação geral.
- Prévia visual anterior inspecionada: home, catálogo, detalhe, loja e contato. Captura anexada pelo usuário documenta as três imagens de categorias anteriores. Baseline visual autenticado do PDV ainda precisa ser registrado antes de sua alteração.
- `outputs/` já estava não rastreado antes deste trabalho; não adicionar seu conteúdo ao commit.
- Sem alterações de aplicação, banco, autenticação ou produção nesta fase documental.

## Gates

| Gate | Estado | Evidência necessária |
| --- | --- | --- |
| G0 | Aguardando revisão da spec/plano | Aceite do usuário para a especificação concreta |
| G1 | Não iniciado | Testes de política de tema + isolamento + navegação |
| G2 | Não iniciado | Cabeçalho/hero/faixa testados e aceitos visualmente |
| G3 | Não iniciado | Categorias/cards testados e aceitos visualmente |
| G4 | Não iniciado | PDV: marca/paleta, regressões e comparação antes/depois |
| G5 | Não iniciado | Ativos finais, checks e aceite local completo |

## Registro de execução por fase

Ao executar, acrescentar comandos, resultado, commit e caminhos das screenshots. Registrar falhas novas separadamente das preexistentes e manter o gate aberto enquanto houver falha atribuível à alteração.

## Restrições de teste

Não usar credenciais de fixtures em banco real por suposição. O runner existente exige `DATABASE_URL_E2E` com banco terminado em `_e2e` e aplica migrations/seed apenas nessa base. Testes que criam vendas, clientes ou alteram estoque executam somente ali. Ausência desse banco é bloqueio de testes transacionais, não autorização para usar a base de trabalho.
