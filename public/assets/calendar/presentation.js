export const gameTypes = ['livestream', 'version_update', 'banner'];
export function verifiedTypeCount(meta = {}) {
  return gameTypes.filter(type => meta.coverage_types?.[type] === 'verified').length;
}
export function availableTypeCount(meta = {}) {
 return gameTypes.filter(type=>meta.source_records?.[type]?.length||meta.coverage_types?.[type]==='verified').length;
}
export function orderedGames(games, metadata) {
  return [...games].sort(([a], [b]) =>
    availableTypeCount(metadata[b]) - availableTypeCount(metadata[a]) ||
    Number((metadata[b]?.event_count || 0) > 0) - Number((metadata[a]?.event_count || 0) > 0));
}
export function coverageLabel(meta) {
  const count = availableTypeCount(meta);
  if(count>verifiedTypeCount(meta))return (count===3?'三类日期已列出':`${count}/3 类日期已列出`)+' · 含来源未确认';
  if(!count && gameTypes.some(type => meta.coverage_types?.[type] === 'partial')) return '已知部分日期 · 查看缺项原因';
  return count === 3 ? '三类日期已收录' : count ? `${count}/3 类已收录 · 查看缺项原因` : '未收录日期 · 查看原因';
}
