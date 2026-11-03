const root = document.documentElement;
const system = matchMedia('(prefers-color-scheme: dark)');
function storedTheme() { try { return localStorage.getItem('theme'); } catch { return null; } }
function parentTheme() { try { return window.parent !== window ? window.parent.document.documentElement.dataset.theme : null; } catch { return null; } }
function applyTheme(value) {
 const theme = ['light','dark'].includes(value) ? value : system.matches ? 'dark' : 'light';
 root.dataset.theme = theme;
 const toggle = document.querySelector('#theme-toggle');
 if(toggle){toggle.textContent=theme==='dark'?'☀ 浅色':'☾ 深色';toggle.setAttribute('aria-label',theme==='dark'?'切换到浅色模式':'切换到深色模式');toggle.setAttribute('aria-pressed',String(theme==='dark'));}
}
function syncTheme() { applyTheme(parentTheme() || storedTheme()); }
syncTheme();
document.querySelector('#theme-toggle').onclick = () => {
 const theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
 applyTheme(theme);
 try { localStorage.setItem('theme',theme); } catch { /* Theme remains usable without storage. */ }
 if(window.parent !== window) window.parent.postMessage({type:'calendar-theme',theme},location.origin);
};
try { if(window.parent !== window) new MutationObserver(syncTheme).observe(window.parent.document.documentElement,{attributes:true,attributeFilter:['data-theme']}); } catch { /* Standalone or cross-origin embedding. */ }
window.addEventListener('storage',event=>{if(event.key==='theme'||event.key===null)syncTheme();});
system.addEventListener('change',syncTheme);
