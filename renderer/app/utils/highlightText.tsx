export function highlightText(text: string | undefined, query: string) {
  if (!text) return null

  const keyword = query.trim()
  if (!keyword) return text

  const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escapedKeyword})`, 'ig'))

  return parts.map((part, index) =>
    part.toLowerCase() === keyword.toLowerCase() ? (
      <mark key={`${part}-${index}`} className="rounded bg-blue-100 px-0.5 text-blue-700">
        {part}
      </mark>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    )
  )
}
