/* Astracct iOS PWA v1: local manual balances only; never store API credentials. */
'use strict';
const KEY = 'astracct.pwa.manual.v1';
const PRIVACY = 'astracct.pwa.private.v1';
const LABELS = { ai: 'AI 订阅', cloud: '云服务器', nodes: '节点订阅' };
const UNITS = new Set(['CNY', 'USD', 'JPY', 'EUR', 'GB', 'GiB', '次']);
const $ = id => document.getElementById(id);
let accounts = [];
let filter = 'all';
let editing = null;
let hidden = false;
let installPrompt = null;
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

function normalize(input) {
  if (!input || typeof input !== 'object' || !Object.hasOwn(LABELS, input.category)) throw Error('余额种类无效');
  const name = String(input.name || '').trim();
  const amount = String(input.amount ?? '').trim();
  const unit = String(input.unit || '');
  const note = String(input.note || '').trim();
  if (!name || name.length > 60 || !/^-?(0|[1-9][0-9]*)(\.[0-9]{1,12})?$/.test(amount) || amount.length > 30 ||
      !UNITS.has(unit) || note.length > 90) throw Error('账户名称、余额格式或单位不正确');
  return { id: typeof input.id === 'string' && /^[\w-]{1,80}$/.test(input.id) ? input.id : crypto.randomUUID(),
    category: input.category, name, amount, unit, note,
    at: Number.isFinite(input.at) && input.at > 0 && input.at < Date.now() + 3600000 ? input.at : Date.now() };
}
function notify(message) {
  $('status').textContent = message;
  $('status').classList.add('show');
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => $('status').classList.remove('show'), 3300);
}
function persist(next) {
  try { localStorage.setItem(KEY, JSON.stringify(next)); accounts = next; render(); return true; }
  catch (_) { notify('浏览器存储不可用，请检查隐私模式或可用空间'); return false; }
}
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const list = JSON.parse(raw);
      if (!Array.isArray(list) || list.length > 100) throw Error('数据格式错误');
      accounts = list.map(normalize);
    }
    hidden = localStorage.getItem(PRIVACY) === '1';
  } catch (_) { accounts = []; notify('本机记录读取异常，已停止读取；请先保留原始浏览器数据'); }
}
function node(tag, text, cls) {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = text;
  if (cls) el.className = cls;
  return el;
}
function render() {
  $('count').textContent = String(accounts.length);
  $('kinds').textContent = String(new Set(accounts.map(a => a.category)).size);
  const latest = accounts.reduce((n, a) => Math.max(n, a.at), 0);
  $('updated').textContent = latest ? new Date(latest).toLocaleDateString('zh-CN') : '—';
  $('privacy').textContent = hidden ? '显示金额' : '隐藏金额';
  $('privacy').setAttribute('aria-pressed', String(hidden));
  document.querySelectorAll('#filters button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === filter)));
  const grid = $('cards');
  grid.replaceChildren();
  const visible = accounts.filter(a => filter === 'all' || a.category === filter);
  if (!visible.length) {
    const empty = node('div', accounts.length ? '该种类暂无账户' : '还没有余额账户。点击「添加余额账户」开始记录。', 'empty');
    grid.append(empty);
    return;
  }
  for (const a of visible) {
    const card = node('article', undefined, 'card ' + a.category);
    const kind = node('span', LABELS[a.category], 'kind');
    const name = node('h3', a.name);
    const balance = node('strong', hidden ? '••••••' : a.amount, 'balance');
    balance.append(node('small', a.unit));
    const note = node('p', a.note || '手动记录 · 非实时查询', 'card-note');
    const bottom = node('div', undefined, 'card-bottom');
    bottom.append(node('span', '更新于 ' + new Date(a.at).toLocaleString('zh-CN')));
    const actions = node('div', undefined, 'row');
    const edit = node('button', '编辑', 'link');
    const remove = node('button', '删除', 'link');
    edit.type = remove.type = 'button';
    edit.addEventListener('click', () => openEditor(a.id));
    remove.addEventListener('click', () => {
      if (confirm('删除「' + a.name + '」的本机记录？')) persist(accounts.filter(item => item.id !== a.id));
    });
    actions.append(edit, remove); bottom.append(actions);
    card.append(kind, name, balance, note, bottom); grid.append(card);
  }
}
function openEditor(id = null) {
  const item = accounts.find(a => a.id === id);
  editing = item?.id ?? null;
  $('formTitle').textContent = item ? '编辑余额账户' : '添加余额账户';
  $('form').reset();
  $('category').value = item?.category ?? 'ai';
  $('name').value = item?.name ?? '';
  $('amount').value = item?.amount ?? '';
  $('unit').value = item?.unit ?? 'CNY';
  $('note').value = item?.note ?? '';
  $('editDialog').showModal();
}
function close(id) { $(id).close(); }
$('form').addEventListener('submit', event => {
  event.preventDefault();
  try {
    const item = normalize({id: editing, category: $('category').value, name: $('name').value, amount: $('amount').value,
      unit: $('unit').value, note: $('note').value, at: Date.now()});
    const next = editing ? accounts.map(a => a.id === editing ? item : a) : [...accounts, item];
    if (next.length > 100) return notify('最多保存 100 个账户');
    if (persist(next)) { close('editDialog'); notify('账户已保存在本机'); }
  } catch (e) { notify(e.message || '表单无效'); }
});
$('new').addEventListener('click', () => openEditor());
$('filters').addEventListener('click', event => {
  const selected = event.target.closest('button[data-filter]');
  if (!selected) return;
  filter = selected.dataset.filter; render();
});
$('privacy').addEventListener('click', () => {
  hidden = !hidden;
  try { localStorage.setItem(PRIVACY, hidden ? '1' : '0'); } catch (_) {}
  render();
});
$('export').addEventListener('click', () => {
  const data = new Blob([JSON.stringify({version: 1, type: 'astracct-manual', accounts}, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(data);
  const a = document.createElement('a'); a.href = url; a.download = 'astracct-backup.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$('import').addEventListener('click', () => $('file').click());
$('file').addEventListener('change', async event => {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  if (file.size > 262144) return notify('备份文件超过 256 KB');
  try {
    const raw = JSON.parse(await file.text());
    if (raw.version !== 1 || raw.type !== 'astracct-manual' || !Array.isArray(raw.accounts) || raw.accounts.length > 100) throw Error('仅支持星账 PWA 导出的 JSON 备份');
    const incoming = raw.accounts.map(normalize);
    if (new Set(incoming.map(a => a.id)).size !== incoming.length) throw Error('重复的账户标识');
    if (confirm('导入后会覆盖本机 ' + accounts.length + ' 条记录。是否继续？') && persist(incoming)) {
      filter = 'all'; render(); notify('备份导入完成');
    }
  } catch (e) { notify(e.message || '导入失败'); }
});
document.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', () => close(btn.dataset.close)));
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; });
const showInstall = async () => {
  if (standalone()) return;
  if (installPrompt) { await installPrompt.prompt(); installPrompt = null; }
  else $('installDialog').showModal();
};
$('install').addEventListener('click', showInstall);
window.addEventListener('appinstalled', () => { $('install').hidden = true; notify('星账已安装'); });
load(); render();
if (standalone()) $('install').hidden = true;
else if (new URLSearchParams(location.search).get('install') === '1') {
  history.replaceState(null, '', location.pathname);
  setTimeout(showInstall, 200);
}
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js', {scope: './'}).catch(() => {});
