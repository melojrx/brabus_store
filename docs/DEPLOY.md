# Deploy em Homelab

A Brabus Store é publicada pelo Docker Swarm no Homelab. Cada promoção usa uma
imagem GHCR por digest imutável; tags como `latest` não fazem parte do fluxo.

## Fluxo de release

```text
push em main
  -> validação em runner hospedado pelo GitHub
  -> publicação de imagem GHCR por digest
  -> runner privado homelab-brabustore-deploy
  -> migration compatível
  -> rollout Swarm start-first
  -> health interno e público
```

O job de deploy só roda em `push` para `main`, após o job de imagem concluir
com sucesso. A concorrência `deploy-brabustore-production` enfileira releases;
um deploy da UrbanLive ou de outro projeto não participa dela nem altera este
stack.

O runner da Brabus executa apenas o wrapper root-owned
`/usr/local/sbin/deploy-brabustore-release`. Ele exige o checkout esperado e
uma referência completa no formato
`ghcr.io/melojrx/brabus_store@sha256:<64-hex>`, cria um release em
`/srv/brabustore/releases/sha256-<digest>` e chama o controlador versionado.
O Homelab não faz `git pull` nem builda imagens para uma promoção.

## Componentes do Homelab

| Item | Papel |
| --- | --- |
| `deploy/swarm/brabustore.yml` | Web, PostgreSQL, migration e scheduler |
| `deploy/swarm/brabustore-edge.yml` | Tunnel Cloudflare dedicado |
| `scripts/homelab/deploy-stack.sh` | Validação, migration, rollout, health e rollback do web |
| `ops/homelab-runner/deploy-brabustore` | Fonte do wrapper restrito instalado no Homelab |
| `/srv/brabustore/brabustore.env` | Configuração operacional não versionada |
| Docker Swarm secrets | Segredos de produção não versionados |

O PostgreSQL não publica porta externa. Dados e uploads persistem apenas nos
volumes nomeados da Brabus no Homelab. Nunca copie dados da VPS de volta para o
Homelab: este é o banco primário.

## Verificação pós-release

```bash
curl --fail --silent --show-error https://brabustore.com.br/api/health
ssh melojr@100.93.170.120 \
  'sudo docker service inspect brabustore_web --format "{{.Spec.TaskTemplate.ContainerSpec.Image}}"'
```

Confirme que a imagem retornada é exatamente o digest publicado pelo workflow.
O controlador também executa a migration antes de atualizar o web e restaura a
imagem anterior do web se o healthcheck falhar.

A espera da migration considera somente tarefas com o `ForceUpdate` da
tentativa atual. Tarefas antigas rejeitadas ou concluídas não devem interromper
nem aprovar uma nova promoção. Depois de queda de energia, confirme primeiro a
saúde dos serviços; retome o job de deploy pelo GitHub Actions quando a execução
interrompida tiver terminado.

## Operação somente PDV

Enquanto a loja operar somente com vendas presenciais,
`/srv/brabustore/brabustore.env` deve conter:

```env
ONLINE_SALES_ENABLED=false
```

O valor ausente, vazio ou diferente de `true` mantém checkout e Mercado Pago
bloqueados de forma reversível, sem afetar catálogo, WhatsApp, PDV, pedidos ou
dados existentes. Uma reativação exige `ONLINE_SALES_ENABLED=true`,
credenciais/webhook válidos e validação completa de pagamento e estoque.

## VPS: somente recuperação temporária

A VPS não recebe mais deploy por GitHub Actions. O runtime e os volumes antigos
continuam preservados apenas para recuperação até que a validação automatizada,
o backup verificável e o desligamento controlado sejam registrados. Não execute
`deploy.sh`, `git reset`, build ou recriação da Brabus na VPS como parte de um
release normal.

O desligamento definitivo da aplicação na VPS requer evidência de backup
restaurável, persistência confirmada no Homelab e ao menos uma promoção
automatizada bem-sucedida. Não remova volumes da VPS durante esse processo.
