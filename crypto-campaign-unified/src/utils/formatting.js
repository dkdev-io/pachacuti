/**
 * Formatting utilities for display values
 */

/**
 * Format balance for display
 * @param {string|number} balance - Balance value
 * @param {number} decimals - Number of decimal places (default: 4)
 * @returns {string} Formatted balance
 */
export const formatBalance = (balance, decimals = 4) => {
  if (balance === null || balance === undefined) return '0.0000'
  
  const num = typeof balance === 'string' ? parseFloat(balance) : balance
  if (isNaN(num)) return '0.0000'
  
  return num.toFixed(decimals)
}

/**
 * Format transaction hash for display
 * @param {string} hash - Transaction hash
 * @returns {string} Formatted hash
 */
export const formatTxHash = (hash) => {
  if (!hash) return ''
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`
}

/**
 * Format address for display
 * @param {string} address - Ethereum address
 * @param {number} startChars - Characters to show at start (default: 6)
 * @param {number} endChars - Characters to show at end (default: 4)
 * @returns {string} Formatted address
 */
export const formatAddress = (address, startChars = 6, endChars = 4) => {
  if (!address) return ''
  if (address.length <= startChars + endChars) return address
  
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`
}

/**
 * Format currency amount
 * @param {number|string} amount - Amount to format
 * @param {string} currency - Currency symbol (default: 'USD')
 * @param {number} decimals - Decimal places (default: 2)
 * @returns {string} Formatted amount
 */
export const formatCurrency = (amount, currency = 'USD', decimals = 2) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return `${currency} 0.00`
  
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(num)
  }
  
  return `${num.toFixed(decimals)} ${currency}`
}

/**
 * Format percentage
 * @param {number} value - Value to format as percentage
 * @param {number} decimals - Decimal places (default: 1)
 * @returns {string} Formatted percentage
 */
export const formatPercentage = (value, decimals = 1) => {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '0.0%'
  
  return `${num.toFixed(decimals)}%`
}

/**
 * Format date for display
 * @param {string|Date} date - Date to format
 * @param {string} format - Format type ('short', 'long', 'relative')
 * @returns {string} Formatted date
 */
export const formatDate = (date, format = 'short') => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  if (isNaN(dateObj.getTime())) return 'Invalid date'
  
  const now = new Date()
  const diffMs = now.getTime() - dateObj.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (format === 'relative') {
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
    return `${Math.floor(diffDays / 365)} years ago`
  }
  
  const options = format === 'long' ? {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  } : {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }
  
  return dateObj.toLocaleDateString('en-US', options)
}

/**
 * Format file size
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * Format duration in milliseconds
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration
 */
export const formatDuration = (ms) => {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) return `${days}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length (default: 100)
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text
  
  return text.slice(0, maxLength - 3) + '...'
}

/**
 * Format number with thousands separators
 * @param {number|string} number - Number to format
 * @returns {string} Formatted number
 */
export const formatNumber = (number) => {
  const num = typeof number === 'string' ? parseFloat(number) : number
  if (isNaN(num)) return '0'
  
  return new Intl.NumberFormat('en-US').format(num)
}