# Atualização do telefone e WhatsApp da loja

**Data:** 2026-09-17
**Status:** Aprovada e implementada na branch `fix/update-store-phone`.

## Objetivo

Usar o novo contato da loja `(85) 92100-2688` em toda a aplicação, com número internacional `5585921002688` para WhatsApp. Não alterar telefones de clientes, vendedores ou fornecedores.

## Decisão

Manter `StoreSettings.whatsapp` como fonte de verdade editável pelo administrador. Atualizar os consumidores ainda fixos em `components/Footer.tsx`, `app/contato/page.tsx` e `app/loja/page.tsx` para usar essa configuração. Preservar os consumidores já dinâmicos, incluindo botão flutuante, catálogo e fluxos de checkout.

Centralizar o novo fallback seguindo o padrão de constantes existente; atualizar o default Prisma e o seed. Formatar o contato brasileiro para exibição sem duplicar o número literal nos componentes. Reutilizar `lib/whatsapp.ts` para normalização e construção de links, preservando mensagens contextuais.

## Persistência e segurança dos dados

Adicionar uma migration nova para alterar o default da coluna `store_settings.whatsapp` e substituir somente o número antigo da loja (`5585997839040` ou `85997839040`, inclusive versões formatadas equivalentes após remover pontuação). Não substituir valores personalizados, vazios ou pertencentes a outros cadastros. Não reescrever migrations históricas.

Não executar seed em produção. Não alterar chaves Pix, credenciais, pedidos, estoque ou outros campos de configuração. O deploy aplica a migration pelo fluxo existente; os testes devem demonstrar preservação de números personalizados e demais campos.

## Documentação e testes

Atualizar referências atuais ao contato da loja em `docs/PRD.md` e `docs/prompt-ecommerce-v2.md`. Preservar planos históricos, que descrevem o estado anterior.

Cobrir em testes unitários o novo número normalizado, sua apresentação e os links com mensagens. Testar a migration em banco isolado: número antigo convertido, personalizado preservado e default novo aplicado. Validar com Playwright rodapé, contato, loja e destinos WhatsApp do catálogo/botão flutuante, incluindo a leitura dinâmica da configuração.

## Critérios de aceite

- Com a configuração atualizada, os textos exibem `(85) 92100-2688` e os links WhatsApp usam `5585921002688`.
- O administrador continua podendo alterar o contato; as superfícies citadas refletem a configuração em vez de um literal.
- Não há referência ativa ao contato antigo no código da aplicação, defaults ou seed; migrations e documentação históricas podem preservá-lo.
- Nenhum telefone de pessoa ou chave Pix é modificado.
- Testes unitários, E2E em banco `_e2e`, lint, typecheck e build aprovados antes da integração.

## Entrega

Implementar em branch própria, com revisão de diff e de código antes do merge. Registrar commits com a identidade Junior Melo <jrmeloafrf@gmail.com>, sem alterar configuração global do Git. Confirmar push antes de disparar produção. Após deploy, conferir os contatos públicos e links sem enviar mensagens pelo WhatsApp.
