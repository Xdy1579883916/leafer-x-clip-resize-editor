export function toFixed(v: number | string, digits = 2): number {
  const multiplier = 10 ** digits
  return Math.round(Number(v) * multiplier) / multiplier
}
