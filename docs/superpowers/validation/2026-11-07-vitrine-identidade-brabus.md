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
| G0 | Spec aprovada; plano sem aceite separado explícito | Revisão do plano pelo usuário antes de implementar a aplicação |
| G1 | Não iniciado | Testes de política de tema + isolamento + navegação |
| G2 | Não iniciado | Cabeçalho/hero/faixa testados e aceitos visualmente |
| G3 | Não iniciado | Categorias/cards testados e aceitos visualmente |
| G4 | Não iniciado | PDV: marca/paleta, regressões e comparação antes/depois |
| G5 | Não iniciado | Ativos finais, checks e aceite local completo |

## Registro de execução por fase

Ao executar, acrescentar comandos, resultado, commit e caminhos das screenshots. Registrar falhas novas separadamente das preexistentes e manter o gate aberto enquanto houver falha atribuível à alteração.

## Restrições de teste

Não usar credenciais de fixtures em banco real por suposição. O runner existente exige `DATABASE_URL_E2E` com banco terminado em `_e2e` e aplica migrations/seed apenas nessa base. Testes que criam vendas, clientes ou alteram estoque executam somente ali. Ausência desse banco é bloqueio de testes transacionais, não autorização para usar a base de trabalho.

## Preparação dos ativos autorizada posteriormente

- Seis ativos selecionados em `public/brand/`, cada um com PNG e WebP; fontes/prompts em `docs/brand/2026-11-07-vitrine-assets-production.md`.
- Logo horizontal e emblema com alpha real; compacto fiel ao original, opaco, porque as duas tentativas de extração ficaram com resíduos.
- Categorias de roupas e bonés derivadas das referências; suplementos com editorial genérico provisório, sem rótulos. Aceite visual pendente.
- Decodificação e dimensões dos seis pares PNG/WebP conferidas; alpha preservado nos dois logos transparentes.
- Após preparar ativos: `npm test` com 102/102 aprovados; `npm run lint -- .` com zero erros e mesmo aviso preexistente; `npm run build` com exit code 0; `git diff --check` sem problemas.
- Nenhum consumidor/layout/fluxo da aplicação foi alterado. Preparação de imagens não conclui G1–G5.
