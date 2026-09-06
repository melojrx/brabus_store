# Máscara monetária no recebimento de títulos

## Objetivo

Padronizar o campo de valor em **Registrar recebimento**, na aba **Títulos** do cliente, com a máscara de reais já usada pelo PDV e pelos formulários de produto.

## Comportamento

- O operador digita apenas os algarismos e o campo apresenta o resultado em reais, por exemplo `1234` como `R$ 12,34`.
- O valor enviado à API é convertido da representação mascarada para número decimal por `parseCurrencyInputValue`.
- Campo vazio ou sem algarismos continua sendo enviado como vazio e é recusado pela validação existente do servidor.
- A alteração não muda a distribuição FIFO, os limites pelo saldo em aberto, a idempotência ou os métodos de recebimento.

## Implementação

- `CustomerDetailClient` reutiliza `maskCurrencyInput` ao editar e `parseCurrencyInputValue` ao montar a requisição.
- Um teste de unidade cobre a conversão de uma entrada monetária mascarada para o valor numérico esperado no payload.

## Fora de escopo

- Não haverá mudança de schema, API, cálculo financeiro ou formato de valores já registrados.
