/**
 * Format tonnage value with appropriate suffix (K, M, B).
 */
export function formatTonnage(tons: number): string {
  if (tons >= 1_000_000_000) {
    return `${(tons / 1_000_000_000).toFixed(1)}B tons`
  }
  if (tons >= 1_000_000) {
    return `${(tons / 1_000_000).toFixed(1)}M tons`
  }
  if (tons >= 1_000) {
    return `${(tons / 1_000).toFixed(1)}K tons`
  }
  return `${tons.toFixed(0)} tons`
}

/**
 * Format distance in km with appropriate precision.
 */
export function formatDistance(km: number): string {
  if (km >= 1000) {
    return `${(km / 1000).toFixed(1)}K km`
  }
  if (km >= 10) {
    return `${km.toFixed(0)} km`
  }
  return `${km.toFixed(1)} km`
}

/**
 * Format a number as a percentage string.
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`
}

/**
 * Format a large count with comma separators.
 */
export function formatCount(count: number): string {
  return count.toLocaleString('en-US')
}
