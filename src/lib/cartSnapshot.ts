import {
  resolveCartItems,
  type CartItemInput,
  type CommerceProduct,
  type CommerceUser,
} from "@/lib/commerce"

export function buildAuthoritativeCartSnapshot(
  inputs: CartItemInput[],
  products: CommerceProduct[],
  user: CommerceUser
) {
  return resolveCartItems(inputs, products, user, {
    requirePriced: false,
    requireStock: false,
  })
}
