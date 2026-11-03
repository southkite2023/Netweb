// Reapply the reviewed, stable-ID registry after a catalog refresh.
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
export function applyTitles(catalog, metadata, registry) {
  const entries = new Map(registry.entries.map(e => [e.id, e]));
  if (entries.size !== registry.entries.length) throw Error('Duplicate anime title ID');
  const oldNames = new Map(catalog.anime);
  catalog.anime = catalog.anime.map(([id]) => {
    const e = entries.get(id), m = metadata[id];
    if (!e || e.native_title !== m.original || !e.title || !['official','community','original'].includes(e.source_kind)) throw Error(`Unreviewed anime title: ${id}`);
    if (e.source_kind !== 'original' && !e.source_url?.startsWith('https://')) throw Error(`Missing title evidence: ${id}`);
    if (e.source_kind === 'original' && e.title !== m.original) throw Error(`Invented fallback: ${id}`);
    m.translation_note = e.source_kind === 'official' ? '已核实原作官方中文出版名（简体显示）；不等于动画大陆授权定名' : e.source_kind === 'community' ? '有来源的社区通行中文名，非官方认证' : '本轮未核实可靠中文译名，保留原名';
    m.title_source_url = e.source_url;
    m.title_source_kind = e.source_kind;
    m.title_checked_on = e.checked_on;
    // Unverified old guesses must not remain searchable aliases.
    m.aliases = (m.aliases || []).filter(a => a === e.title || a === m.original || !/[\u3400-\u9fff]/u.test(a));
    return [id, e.title];
  });
  return oldNames;
}
export async function main(root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')) {
  const dir = path.join(root, 'public/assets/calendar');
  const {catalog, metadata} = await import(pathToFileURL(path.join(dir,'catalog.js')));
  const read = name => JSON.parse(fs.readFileSync(path.join(dir,'data',name),'utf8'));
  const write = (name,value) => fs.writeFileSync(path.join(dir,'data',name),JSON.stringify(value,null,2)+'\n');
  applyTitles(catalog, metadata, read('anime-titles.json'));
  const names = new Map(catalog.anime);
  fs.writeFileSync(path.join(dir,'catalog.js'), 'export const catalog = '+JSON.stringify(catalog,null,2)+';\n\nexport const metadata = '+JSON.stringify(metadata,null,2)+';\n');
  const subscriptions=read('subscriptions.json');
  for(const [id,name] of names) if(metadata[id].anilist_id) subscriptions.anime[metadata[id].anilist_id]=name;
  write('subscriptions.json',subscriptions);
  const verification=read('verification.json');
  for(const r of verification.records) if(names.has(r.id)) r.name=names.get(r.id);
  write('verification.json',verification);
  const events=read('events.json');
  for(const e of events.events) {
    const name=names.get(e.anime?.series_id);
    if(!name) continue;
    const suffix=e.title.slice(e.title.indexOf(' · '));
    if(e.title!==name+suffix){e.title=name+suffix;e.revision+=1;e.updated_at=new Date().toISOString().replace(/\.\d{3}Z$/,'Z');}
  }
  write('events.json',events);
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) await main();
