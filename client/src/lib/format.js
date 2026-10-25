export function formatDate(value, options = { dateStyle: 'medium' }) {
  if (!value) return 'Date unavailable'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'
  return new Intl.DateTimeFormat('en-IN', options).format(date)
}

export function formatDateTime(value) {
  return formatDate(value, { dateStyle: 'medium', timeStyle: 'short' })
}

export function formatRelativeTime(value, now = Date.now()) {
  if (!value) return 'Date unavailable'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'

  const elapsedSeconds = Math.round((date.getTime() - now) / 1000)
  const units = [
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
    ['second', 1]
  ]
  const relative = new Intl.RelativeTimeFormat('en-IN', { numeric: 'auto' })
  const [unit, size] = units.find(([, seconds]) => Math.abs(elapsedSeconds) >= seconds) || units[units.length - 1]
  return relative.format(Math.round(elapsedSeconds / size), unit)
}
