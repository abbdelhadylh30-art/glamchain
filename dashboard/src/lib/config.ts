import config from '../../client-config.json'

export type ClientConfig = typeof config

export function getClientConfig() {
  return config
}

export function getCurrencyConfig() {
  return config.currency
}

export function getUserConfig() {
  return config.user
}

export function getBusinessConfig() {
  return config.business
}

/**
 * Format a number as currency using the client-configured currency.
 * Falls back to USD if config is unavailable.
 */
export function formatCurrency(value: number): string {
  const { locale, code } = getCurrencyConfig()
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: code }).format(value)
  } catch {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
  }
}

/**
 * Format a number with locale-appropriate grouping.
 */
export function formatNumber(value: number): string {
  const { locale } = getCurrencyConfig()
  try {
    return new Intl.NumberFormat(locale).format(value)
  } catch {
    return new Intl.NumberFormat('en-US').format(value)
  }
}

export const statusColors: Record<string, string> = {
  confirmed: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700',
  no_show: 'bg-orange-100 text-orange-700',
}

export const statusLabels: Record<string, string> = {
  confirmed: 'Confirmed',
  pending: 'Pending',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
}
