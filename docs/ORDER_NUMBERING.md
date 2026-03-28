# Numeracao Publica de Pedidos
## Brabu's Performance Store

---

**Objetivo:** padronizar um codigo publico de pedido que seja legivel para cliente, atendimento, PDV e operacao sem expor o `id` tecnico.

---

## 1. Problema

O `Order.id` atual e um identificador tecnico (`cuid`) adequado para persistencia e integracoes, mas inadequado para uso humano.

Impactos diretos:

- dificulta localizar pedidos por telefone, WhatsApp ou balcao;
- torna a conferencia operacional mais lenta;
- piora a leitura no admin, na conta do cliente e no checkout de sucesso;
- mistura o identificador tecnico com o identificador que deveria ser operacional.

---

## 2. Decisao adotada

O pedido passa a ter dois identificadores:

- `id`: identificador tecnico interno, mantido para relacoes, APIs internas e integracoes como Stripe;
- `orderNumber`: codigo publico legivel exibido para cliente e operacao.

Formato aprovado:

- `ON-YYMMDD-NNNN` para pedidos online
- `PDV-YYMMDD-NNNN` para pedidos do PDV
- `LG-YYMMDD-NNNN` para pedidos legados/backfill

Exemplos:

- `ON-260328-0007`
- `PDV-260328-0019`
- `LG-260317-0003`

Regras:

- o prefixo representa o canal do pedido;
- a data usa o timezone operacional `America/Fortaleza`;
- o sequencial e diario por canal;
- o `id` tecnico nao deve ser exibido na interface quando houver `orderNumber`.

---

## 3. Desenho tecnico

### 3.1 Schema

Adicionar em `Order`:

- `orderNumber String? @unique`

Adicionar a tabela auxiliar:

- `OrderNumberCounter`
- chave unica composta por `dateKey + channel`
- campo `lastValue` para controlar o ultimo sequencial emitido naquele dia e canal

### 3.2 Servico de geracao

Servico dedicado em `lib/order-number-service.ts`:

- recebe `channel` e `createdAt`;
- resolve o `dateKey` no timezone operacional;
- faz `upsert` atomico no contador do dia/canal;
- devolve `orderNumber` no formato final.

O `upsert` acontece dentro da mesma transacao da criacao do pedido. Assim:

- se a criacao do pedido falhar, o contador tambem faz rollback;
- duas criacoes concorrentes nao reutilizam o mesmo numero;
- o codigo publico nasce junto com o pedido.

### 3.3 Pontos de criacao

O `orderNumber` precisa ser gerado em todo fluxo que cria pedido:

- checkout online com Stripe;
- checkout online com pagamento manual;
- PDV administrativo;
- backfill dos pedidos antigos.

### 3.4 Pontos de exibicao

O `orderNumber` deve substituir o `cuid` nos pontos visuais:

- admin de pedidos: listagem e detalhe;
- area do cliente: historico, detalhe e cards de pedidos recentes;
- checkout de sucesso e mensagem de WhatsApp;
- qualquer futura comunicacao operacional de pedido.

---

## 4. Migracao e retrocompatibilidade

Migracao estrutural:

- adicionar coluna `orderNumber`;
- criar tabela `order_number_counters`.

Backfill:

- script `npm run orders:backfill-number`;
- processa apenas pedidos sem `orderNumber`;
- respeita `createdAt` original e `channel` do pedido.

Fallback visual:

- enquanto existirem pedidos antigos sem backfill, a interface usa um identificador curto derivado do `id`.

---

## 5. Decisoes complementares

- `client_reference_id` do Stripe continua usando `Order.id` tecnico para nao quebrar o webhook atual.
- `metadata.orderNumber` pode ser enviada ao Stripe apenas como apoio operacional.
- o codigo publico nao deve depender de categoria do produto, porque um pedido pode conter itens de varias categorias.
- o codigo publico nao substitui a chave tecnica do banco.

---

## 6. Estado da implementacao

Entregue:

- schema com `orderNumber` e contador diario por canal;
- servico dedicado de geracao;
- integracao nos fluxos de checkout e PDV;
- troca dos pontos principais de exibicao;
- script de backfill documentado.

Pendente operacional:

- rodar a migration no ambiente alvo;
- executar o backfill dos pedidos historicos;
- validar manualmente o fluxo completo com novos pedidos em `ONLINE` e `PDV`.
