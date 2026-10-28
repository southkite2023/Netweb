/* Cache only the Astracct PWA shell; exclude API and user data. */
const ROOT='/assets/astracct/';
const CACHE='astracct-shell-20261028-v8';
const SHELL=[ROOT,ROOT+'index.html',ROOT+'styles.css',ROOT+'app.js',ROOT+'manifest.json',ROOT+'icon.svg',ROOT+'icon-192.png',ROOT+'icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(Promise.all([
  caches.keys().then(names=>Promise.all(names.filter(n=>n.startsWith('astracct-shell-')&&n!==CACHE).map(n=>caches.delete(n)))),
  self.clients.claim(),
])));
self.addEventListener('fetch',event=>{
  const u=new URL(event.request.url);
  if(event.request.method!=='GET'||u.origin!==self.location.origin||!u.pathname.startsWith(ROOT))return;
  if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).catch(()=>caches.match(ROOT+'index.html')));return;}
  if(!SHELL.includes(u.pathname))return;
  // Revalidate online so an old shell cannot pin app.js/styles after a release.
  event.respondWith(fetch(event.request, {cache:'no-cache'}).then(async response=>{
    if(response.ok){const cache=await caches.open(CACHE);await cache.put(event.request,response.clone());}
    return response;
  }).catch(()=>caches.match(event.request)));
});
