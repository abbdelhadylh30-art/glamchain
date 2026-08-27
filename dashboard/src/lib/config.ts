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
 * Uses the configured symbol with Latin (Western) digits so the UI stays
 * readable for English-first staff — ar-* locales render Eastern Arabic
 * numerals + RTL marks, which reads as corrupted text in a data table.
 */
export function formatCurrency(value: number): string {
  const { symbol } = getCurrencyConfig()
  const num = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
  return symbol ? `${symbol} ${num}` : num
}

/**
 * Format a number with locale-appropriate grouping.
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

export const statusColors: Record<string, string> = {
  confirmed: 'bg-[#7d8b6a1f] text-[#5c6b48]',
  pending: 'bg-[#c8a24b26] text-[#8a6d2a]',
  completed: 'bg-[#b3903f1f] text-[#96742c]',
  cancelled: 'bg-[#b4543f1a] text-[#a04c38]',
  no_show: 'bg-[#b3715822] text-[#a05f45]',
}

export const statusLabels: Record<string, string> = {
  confirmed: 'Confirmed',
  pending: 'Pending',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
}
