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
 * Format a number as currency using the client-configured symbol with
 * Latin (Western) digits — ar-* locales render Eastern Arabic numerals.
 */
export function formatCurrency(value: number): string {
  const { symbol } = getCurrencyConfig()
  const num = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
  return symbol ? `${symbol} ${num}` : num
}

/**
 * Format a number with Latin-digit grouping.
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
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
