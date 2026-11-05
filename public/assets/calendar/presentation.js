export const gameTypes = ['livestream', 'version_update', 'banner'];
const typeNames = {livestream:'前瞻', version_update:'版本更新', banner:'卡池'};
export function availableTypes(meta = {}) {
  return gameTypes.filter(type => meta.date_summary?.[type]?.label ||
    meta.source_records?.[type]?.length || (type === 'banner' && meta.supplemental_banners?.length));
}
export function orderedGames(games, metadata) {
  return [...games].sort(([a], [b]) =>
    availableTypes(metadata[b]).length - availableTypes(metadata[a]).length ||
    Number((metadata[b]?.event_count || 0) > 0) - Number((metadata[a]?.event_count || 0) > 0));
}
export function coverageLabel(meta) {
  return availableTypes(meta).map(type => typeNames[type]).join(' · ') || '暂无日程记录';
}
