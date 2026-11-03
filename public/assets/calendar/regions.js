// Server identity belongs to each subscription ID, never to the UI language.
export const gameRegions = ['cn', 'global', 'jp'];
export const regionLabels = {cn:'国服', global:'国际服', jp:'日服'};
export function regionForLanguage(language) {
  const lang = String(language || '').toLowerCase().split(/[-_]/)[0];
  return lang === 'en' ? 'global' : lang === 'ja' ? 'jp' : 'cn';
}
export function gamesForRegion(games, metadata, region, scope = 'all', focus = []) {
  if (!gameRegions.includes(region)) return [];
  return games.filter(([id]) => metadata[id]?.server === region &&
    (region !== 'cn' || scope !== 'gameg' || focus.includes(id)));
}
// Same-origin parent <html lang> changes immediately when the main site language changes.
// A manual region choice lasts until the language actually changes again.
export function followSiteLanguage(win, onRegion) {
  let parentRoot;
  try { if(win.parent !== win) parentRoot=win.parent.document.documentElement; } catch { /* Standalone fallback. */ }
  let previous;
  const sync = () => {
    let language = parentRoot?.lang;
    if(!language) {
      try { language=win.localStorage.getItem('preferred-language'); } catch { /* Storage may be denied. */ }
      language ||= win.document.documentElement.lang;
    }
    const region=regionForLanguage(language);
    if(region!==previous){previous=region;onRegion(region);}
  };
  const observer = parentRoot ? new win.MutationObserver(sync) : null;
  observer?.observe(parentRoot,{attributes:true,attributeFilter:['lang']});
  const storage = event => { if(event.key==='preferred-language'||event.key===null) sync(); };
  win.addEventListener('storage',storage);
  sync();
  return () => { observer?.disconnect();win.removeEventListener('storage',storage); };
}
