export const CART_ITEM_QUANTITY_MAX = 10000

export function isValidCartItemQuantity(quantity: number) {
  return (
    Number.isSafeInteger(quantity) &&
    quantity >= 1 &&
    quantity <= CART_ITEM_QUANTITY_MAX
  )
}

export function resolveMergedCartQuantity(
  currentQuantity: number,
  incomingQuantity: number
) {
  if (
    !Number.isSafeInteger(currentQuantity) ||
    currentQuantity < 0 ||
    !isValidCartItemQuantity(incomingQuantity)
  ) {
    return null
  }

  const nextQuantity = currentQuantity + incomingQuantity
  return isValidCartItemQuantity(nextQuantity) ? nextQuantity : null
}
