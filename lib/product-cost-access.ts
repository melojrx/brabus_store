export class ProductCostAccessError extends Error {
  constructor() {
    super("Sem permissão para alterar preço de custo.")
    this.name = "ProductCostAccessError"
  }
}

export function protectProductCost<T extends { costPrice: unknown }>(data: T, body: object, canWriteCosts: boolean) {
  const hasCost = Object.hasOwn(body, "costPrice")
  if (hasCost && !canWriteCosts) throw new ProductCostAccessError()
  const { costPrice, ...withoutCost } = data
  return hasCost ? { ...withoutCost, costPrice } : withoutCost
}
