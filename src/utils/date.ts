export function localDate(date = new Date()): string {
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export function localTime(date = new Date()) { return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` }
function calendarDate(year: number, monthIndex: number, day: number) {
  const date = new Date()
  date.setFullYear(year, monthIndex, day); date.setHours(12, 0, 0, 0)
  return date
}
export function monthRange(month: number, year: number) {
  return { start: localDate(calendarDate(year, month - 1, 1)), end: localDate(calendarDate(year, month, 0)) }
}
export function weekRange(date = new Date()) {
  const start = new Date(date); start.setDate(start.getDate() - (start.getDay() + 6) % 7)
  const end = new Date(start); end.setDate(end.getDate() + 6)
  return { start: localDate(start), end: localDate(end) }
}
export function displayDate(date: string, options?: Intl.DateTimeFormatOptions) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('id-ID', options || { day: 'numeric', month: 'long', year: 'numeric' })
}
export function dateLabel(date: string) {
  if (date === localDate()) return 'Hari ini'
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
  if (date === localDate(yesterday)) return 'Kemarin'
  return displayDate(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}
export function monthLabel(month: number, year: number) {
  return calendarDate(year, month - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
}
