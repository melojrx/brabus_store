# Vendedor: entrada pelo PDV e acesso exclusivo à dashboard

**Data:** 2026-09-07  
**Status:** aprovado para revisão da especificação

## Objetivo

Garantir que a dashboard administrativa seja exclusiva de usuários com perfil `ADMIN` e que usuários com perfil `SELLER` iniciem sempre no PDV após autenticação.

## Escopo

- O vendedor é encaminhado para `/admin/pdv` depois de um login bem-sucedido, mesmo quando existir um destino anterior na URL.
- O administrador que entra pelo login normal abre a dashboard em `/admin`.
- A rota `/admin`, sua página de dashboard e a API `/api/admin/dashboard` aceitam apenas `ADMIN`.
- Um vendedor que tentar abrir `/admin` é redirecionado ao PDV.
- O menu e os atalhos internos do vendedor não oferecem a dashboard e apontam diretamente ao PDV.
- O retorno informado na URL de login só é usado quando for uma rota interna válida e quando não for substituído pelo destino obrigatório do vendedor.

## Fora de escopo

- Redesenhar todas as permissões disponíveis ao vendedor nas demais áreas administrativas.
- Alterar perfis, campos de usuários, esquema Prisma ou dados de produção.
- Alterar regras de venda, estoque, títulos, checkout ou clientes.

## Arquitetura e fluxo

O controle atual de equipe (`ADMIN` ou `SELLER`) permanece para PDV e demais áreas já autorizadas. Uma regra específica de administrador será centralizada e reutilizada para as superfícies da dashboard.

1. O login por credenciais cria a sessão normalmente.
2. O destino pós-login é resolvido pelo perfil autenticado:
   - `SELLER`: `/admin/pdv`, incondicionalmente.
   - `ADMIN`: `/admin` no login normal; um destino administrativo interno explícito e válido pode ser preservado.
   - `CUSTOMER`: mantém o destino interno válido, como conta ou checkout; sem destino, retorna à loja.
3. A camada de rota intercepta o acesso do vendedor a `/admin` e o redireciona para `/admin/pdv`.
4. A página server-side da dashboard mantém a defesa por perfil e redireciona vendedor ao PDV como contingência.
5. A API da dashboard só devolve indicadores para `ADMIN`; vendedor autenticado recebe acesso negado e não recebe dados.

## Segurança

- O bloqueio da dashboard é aplicado no servidor e na API, não apenas pela navegação visual.
- O parâmetro `callbackUrl` é tratado como caminho interno relativo. Valores externos, inválidos ou de páginas de autenticação não serão usados como destino pós-login.
- A prioridade do destino de vendedor é absoluta: mesmo um `callbackUrl` válido não substitui o PDV.
- Usuários sem sessão continuam seguindo o fluxo de autenticação já existente.

## Experiência de uso

- O vendedor não vê a opção “Dashboard” no menu administrativo.
- O botão de acesso administrativo em sua conta abre diretamente o PDV.
- Caso use uma URL salva da dashboard, é levado ao PDV sem tela de erro.
- Administradores continuam usando a dashboard como ponto inicial de trabalho.

## Respostas da API

| Situação | `/api/admin/dashboard` |
| --- | --- |
| Sem sessão | Não autenticado, sem dados |
| `SELLER` autenticado | Acesso negado, sem dados |
| `ADMIN` autenticado | Resposta atual da dashboard |

## Validação

- Teste unitário da resolução do destino pós-login para `ADMIN`, `SELLER` e `CUSTOMER`, inclusive URLs inválidas.
- Teste de autorização da API para confirmar que apenas `ADMIN` obtém dados da dashboard.
- Teste de navegação para confirmar que vendedor em `/admin` chega ao PDV e administrador mantém acesso à dashboard.
- Teste autenticado de interface para confirmar que o menu do vendedor não exibe “Dashboard” e que o login abre o PDV.
- Gates do projeto: testes automatizados, lint e build.

## Critérios de aceite

1. Um vendedor autenticado não consegue visualizar nem consultar dados da dashboard.
2. Todo login de vendedor abre `/admin/pdv`.
3. Um administrador autenticado continua acessando normalmente a dashboard e seus dados.
4. Login e retorno de clientes para checkout e conta permanecem funcionais.
5. Não há alteração de esquema ou dado de negócio.
