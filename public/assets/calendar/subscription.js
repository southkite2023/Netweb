export function subscriptionUrl(chosen,metadata){
 const games=[],anime=[],missing=[]
 for(const [id,c] of chosen){
  if(c.kind==='anime'){if(metadata[id]?.anilist_id)anime.push(metadata[id].anilist_id);else missing.push(id)}
  else games.push([id,[...new Set(c.types)].sort(),c.format,c.duration])
 }
 if(missing.length)return {url:null,missing}
 if(!games.length&&!anime.length)return {url:null,missing:[]}
 games.sort((a,b)=>a[0].localeCompare(b[0]));anime.sort((a,b)=>a-b)
 const payload=JSON.stringify([1,games,anime]);const bytes=new TextEncoder().encode(payload)
 const encoded=btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')
 return {url:'https://yuashie.cn/api/calendar/v1/selection.ics?s='+encoded,missing:[]}
}
