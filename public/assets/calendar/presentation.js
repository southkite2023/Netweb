export const gameTypes = ['livestream', 'version_update', 'banner'];
export function verifiedTypeCount(meta = {}) {
  return gameTypes.filter(type => meta.coverage_types?.[type] === 'verified').length;
}
export function orderedGames(games, metadata) {
  return [...games].sort(([a], [b]) =>
    verifiedTypeCount(metadata[b]) - verifiedTypeCount(metadata[a]) ||
    Number((metadata[b]?.event_count || 0) > 0) - Number((metadata[a]?.event_count || 0) > 0));
}
export function coverageLabel(meta) {
  const count = verifiedTypeCount(meta);
  if(!count && gameTypes.some(type => meta.coverage_types?.[type] === 'partial')) return '已知部分日期 · 尚有缺项';
  return count === 3 ? '三类日期已核实' : count ? `${count}/3 类已核实 · 缺项后续补充` : '尚缺三类日期';
}
