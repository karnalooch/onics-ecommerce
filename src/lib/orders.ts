export function resolveEstimatedDeliveryDays(
  incoming: number | null | undefined,
  current: number | null | undefined
) {
  return incoming === undefined ? current ?? null : incoming
}
