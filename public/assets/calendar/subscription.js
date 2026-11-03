export function subscriptionUrl(chosen,metadata){
 const games=[],anime=[],missing=[]
 for(const [id,c] of chosen){
  if(c.kind==='anime'){if(metadata[id]?.anilist_id)anime.push(metadata[id].anilist_id);else missing.push(id)}
  else games.push([id,[...new Set(c.types)].sort(),c.format,c.duration,...(c.boundaries?[c.boundaries]:[])])
 }
 if(missing.length)return {url:null,missing}
 if(!games.length&&!anime.length)return {url:null,missing:[]}
 games.sort((a,b)=>a[0].localeCompare(b[0]));anime.sort((a,b)=>a-b)
 const payload=JSON.stringify([1,games,anime]);const bytes=new TextEncoder().encode(payload)
 const encoded=btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')
 return {url:'https://yuashie.cn/api/calendar/v1/selection.ics?s='+encoded,missing:[]}
}

export function selectionPayload(chosen,metadata){
 const result=subscriptionUrl(chosen,metadata)
 if(result.missing.length)return {selection:null,missing:result.missing}
 return {selection:result.url?new URL(result.url).searchParams.get('s'):btoa('[1,[],[]]').replace(/=+$/,''),missing:[]}
}
export function restoreSelection(encoded,metadata){
 const [v,games,anime]=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(encoded.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0))))
 if(v!==1)throw Error('不支持的日历设置')
 const chosen=new Map(games.map(([id,types,format,duration,boundaries])=>[id,{kind:'games',types,format,duration,...(boundaries?{boundaries}:{})}]))
 for(const anilist of anime){const id=Object.keys(metadata).find(id=>metadata[id].anilist_id===anilist);if(!id)throw Error('日历中有暂不能显示的动漫，请稍后重试');chosen.set(id,{kind:'anime'})}
 return chosen
}
