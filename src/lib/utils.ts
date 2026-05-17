export function formatRelative(date: Date | string): string {
  const d = new Date(date as string)
  const now = new Date()
  const days = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (days === 0) return "aujourd'hui"
  if (days === 1) return 'hier'
  if (days < 7) return `il y a ${days} j`
  if (days < 30) return `il y a ${Math.floor(days / 7)} sem`
  return `il y a ${Math.floor(days / 30)} mois`
}
