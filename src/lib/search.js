export function searchEntries(entries, query, { category = 'all', favorites = [] } = {}) {
  const terms = String(query).normalize('NFKC').toLocaleLowerCase().trim().split(/\s+/).filter(Boolean)
  return entries.filter(entry => {
    if (category === 'saved' && !favorites.includes(entry.path)) return false
    if (category !== 'all' && category !== 'saved' && entry.category !== category) return false
    const haystack = [entry.title, entry.description, entry.path, entry.keywords].join(' ').normalize('NFKC').toLocaleLowerCase()
    return terms.every(term => haystack.includes(term))
  })
}
