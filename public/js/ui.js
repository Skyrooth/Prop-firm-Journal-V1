// DOM helpers, formatting, and shared UI components.

export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v);
  }
  for (const c of kids.flat(9)) {
    if (c == null || c === false || c === '') continue;
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return el;
}

/* ---------------- Icons (stroke style, lucide-inspired) ---------------- */
const ICONS = {
  dashboard: '<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="5" rx="2"/><rect x="13" y="12" width="8" height="9" rx="2"/><rect x="3" y="15" width="8" height="6" rx="2"/>',
  accounts: '<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>',
  journal: '<path d="M12 6c-2-1.6-4.5-2.2-8-2.2v14.4c3.5 0 6 .6 8 2.2 2-1.6 4.5-2.2 8-2.2V3.8c-3.5 0-6 .6-8 2.2Z"/><path d="M12 6v14.4"/>',
  payouts: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
  expenses: '<path d="M5 2v20l2-1.2L9 22l2-1.2L13 22l2-1.2L17 22l2-1.2V2l-2 1.2L15 2l-2 1.2L11 2 9 3.2 7 2 5 3.2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
  funding: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2.5"/>',
  challenge: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
  reports: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M8 16v-5M13 16V8M18 16v-8"/>',
  data: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  trash: '<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  settings: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3"/><path d="M2 14h4M10 8h4M18 16h4"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5M12 3v12"/>',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6L18.5 5a2 2 0 0 0-1.8-1H7.3a2 2 0 0 0-1.8 1Z"/>',
  calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 9h18"/>',
};

export function icon(name, size = 18) {
  const span = h('span', { class: 'ico', style: 'display:inline-flex;align-items:center' });
  span.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;
  return span;
}

/* ---------------- Formatting ---------------- */
export function fmtMoney(n, { sign = false } = {}) {
  n = parseFloat(n) || 0;
  const prefix = n < 0 ? '-' : sign && n > 0 ? '+' : '';
  return prefix + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtCompact(n) {
  n = parseFloat(n) || 0;
  const a = Math.abs(n);
  const s = n < 0 ? '-' : '';
  if (a >= 1e6) return `${s}$${+(a / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${s}$${+(a / 1e3).toFixed(1)}K`;
  return `${s}$${+a.toFixed(0)}`;
}

export function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(String(d).length === 10 ? d + 'T00:00:00' : d);
  if (isNaN(dt)) return String(d);
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function pnl(v) {
  if (v == null || v === '') return h('span', { class: 'dim' }, '—');
  const n = parseFloat(v) || 0;
  return h('span', { class: n > 0 ? 'pos' : n < 0 ? 'neg' : 'dim' }, fmtMoney(n, { sign: true }));
}

const BADGE_MAP = {
  evaluation: 'b-blue', funded: 'b-green', passed: 'b-purple', failed: 'b-red',
  pending: 'b-amber', confirmed: 'b-green', rejected: 'b-red',
  buy: 'b-green', sell: 'b-red',
};

export function badge(text, cls) {
  if (!text) return h('span', { class: 'dim' }, '—');
  return h('span', { class: 'badge ' + (cls || BADGE_MAP[String(text).toLowerCase()] || 'b-neutral') }, text);
}

export function noteCell(text) {
  if (!text) return h('span', { class: 'dim' }, '—');
  return h('span', { class: 'note', title: text }, text);
}

export function thumb(src) {
  if (!src) return h('span', { class: 'dim' }, '—');
  return h('img', { class: 'thumb', src, onclick: () => lightbox(src) });
}

export function lightbox(src) {
  const box = h('div', { class: 'lightbox', onclick: () => box.remove() }, h('img', { src }));
  document.getElementById('overlays').append(box);
}

/* ---------------- Small components ---------------- */
export function pageHeader(title, subtitle, actions = []) {
  return h('div', { class: 'page-head' },
    h('div', {}, h('h1', {}, title), subtitle ? h('div', { class: 'subtitle' }, subtitle) : null),
    actions.length ? h('div', { class: 'page-actions' }, actions) : null,
  );
}

export function statCard(label, value, sub, tone = '') {
  return h('div', { class: 'stat' },
    h('div', { class: 'label' }, label),
    h('div', { class: 'value ' + tone }, value),
    sub ? h('div', { class: 'sub' }, sub) : null,
  );
}

export function emptyState(msg, iconName = 'inbox') {
  return h('div', { class: 'empty card' },
    h('div', { class: 'empty-icon' }, icon(iconName, 30)),
    h('div', {}, msg),
  );
}

export function toast(msg, type = 'ok') {
  const t = h('div', { class: 'toast ' + type }, msg);
  document.getElementById('toasts').append(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 350); }, 2800);
}

/* ---------------- Modal ---------------- */
export function openModal({ title, body, footer, wide = false }) {
  const overlay = h('div', { class: 'overlay' });
  const closeBtn = h('button', { class: 'btn-icon', onclick: () => close() }, icon('close', 17));
  const modal = h('div', { class: 'modal' + (wide ? ' wide' : '') },
    h('div', { class: 'modal-head' }, h('div', { class: 'modal-title' }, title), closeBtn),
    h('div', { class: 'modal-body' }, body),
    footer ? h('div', { class: 'modal-foot' }, footer) : null,
  );
  overlay.append(modal);
  overlay.addEventListener('mousedown', e => { if (e.target === overlay) close(); });
  const esc = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', esc);
  document.getElementById('overlays').append(overlay);
  function close() { overlay.remove(); document.removeEventListener('keydown', esc); }
  return { close, el: modal };
}

export function confirmDlg(message, { okText = 'Delete', tone = 'danger' } = {}) {
  return new Promise(resolve => {
    const ok = h('button', { class: 'btn btn-' + tone, onclick: () => { m.close(); resolve(true); } }, okText);
    const cancel = h('button', { class: 'btn', onclick: () => { m.close(); resolve(false); } }, 'Cancel');
    const m = openModal({
      title: 'Are you sure?',
      body: h('p', { class: 'confirm-msg' }, message),
      footer: [cancel, ok],
    });
  });
}

/* ---------------- Image field ---------------- */
async function resizeImage(fileObj, maxDim = 1600, quality = 0.82) {
  const dataUrl = await new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = rej;
    fr.readAsDataURL(fileObj);
  });
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = dataUrl;
  });
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  if (scale === 1 && fileObj.size < 400 * 1024) return dataUrl;
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * scale);
  c.height = Math.round(img.height * scale);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', quality);
}

function imageField(initial) {
  let value = initial || null;
  const file = h('input', { type: 'file', accept: 'image/*', style: 'display:none' });
  const drop = h('div', { class: 'img-drop', onclick: () => file.click() });
  const removeBtn = h('button', { type: 'button', class: 'btn' }, 'Remove');
  const chooseBtn = h('button', { type: 'button', class: 'btn' }, icon('image', 15), 'Choose image');

  function render() {
    drop.replaceChildren(value ? h('img', { src: value }) : 'Click to add');
    removeBtn.style.display = value ? '' : 'none';
  }
  file.onchange = async () => {
    const f = file.files[0];
    if (!f) return;
    try { value = await resizeImage(f); render(); }
    catch { toast('Could not read that image', 'err'); }
    file.value = '';
  };
  chooseBtn.onclick = () => file.click();
  removeBtn.onclick = () => { value = null; render(); };
  render();

  const el = h('div', { class: 'img-field' }, drop, h('div', { class: 'img-btns' }, chooseBtn, removeBtn), file);
  return { el, get value() { return value; } };
}

/* ---------------- Form builder ---------------- */
export function buildForm(fields, values = {}) {
  const inputs = {};
  const grid = h('div', { class: 'form-grid' });

  for (const f of fields) {
    const wrap = h('div', { class: 'field' + (f.full ? ' span2' : '') });
    wrap.append(h('label', {}, f.label + (f.required ? ' *' : '')));
    const val = values[f.key] ?? (typeof f.default === 'function' ? f.default() : f.default) ?? '';

    if (f.type === 'image') {
      const img = imageField(val || null);
      wrap.append(img.el);
      inputs[f.key] = { get: () => img.value, f, el: img.el };
      grid.append(wrap);
      continue;
    }

    let input;
    if (f.type === 'select') {
      input = h('select', { class: 'input' }, (f.options || []).map(o => h('option', { value: o }, o)));
      if (val && ![...input.options].some(o => o.value === String(val))) {
        input.append(h('option', { value: val }, val));
      }
      input.value = val || f.options?.[0] || '';
    } else if (f.type === 'textarea') {
      input = h('textarea', { class: 'input', rows: f.rows || 3, placeholder: f.placeholder || '' });
      input.value = val ?? '';
    } else {
      input = h('input', { class: 'input', type: f.type || 'text', placeholder: f.placeholder || '' });
      if (f.type === 'number') input.step = 'any';
      input.value = val ?? '';
      if (f.list?.length) {
        const dlId = 'dl_' + f.key + '_' + Math.random().toString(36).slice(2, 7);
        wrap.append(h('datalist', { id: dlId }, [...new Set(f.list.filter(Boolean))].map(v => h('option', { value: v }))));
        input.setAttribute('list', dlId);
      }
    }

    inputs[f.key] = { get: () => input.value, f, el: input };
    wrap.append(input);
    grid.append(wrap);
  }

  function getValues() {
    const out = {};
    let ok = true;
    for (const [k, { get, f, el }] of Object.entries(inputs)) {
      let v = get();
      if (typeof v === 'string') v = v.trim();
      if (f.type === 'number') v = v === '' || v == null ? null : parseFloat(v);
      if (f.transform && v != null && v !== '') v = f.transform(v);
      const missing = v === '' || v == null || (typeof v === 'number' && isNaN(v));
      if (f.required && missing) { ok = false; el.classList?.add('invalid'); }
      else el.classList?.remove('invalid');
      out[k] = v === '' ? null : v;
    }
    return ok ? out : null;
  }

  return { el: grid, getValues };
}

/* ---------------- Data table ---------------- */
export function dataTable({ columns, rows, onEdit, onDelete, empty }) {
  if (!rows.length) return emptyState(empty || 'No records yet — click “Add” above to create the first one.');
  const hasActions = onEdit || onDelete;
  const table = h('table', { class: 'table' },
    h('thead', {}, h('tr', {},
      columns.map(c => h('th', { class: c.num ? 'num' : '' }, c.label)),
      hasActions ? h('th', { class: 'actions-col' }) : null,
    )),
    h('tbody', {}, rows.map(r => h('tr', {},
      columns.map(c => {
        const raw = c.render ? c.render(r) : r[c.key];
        const v = raw == null || raw === '' ? h('span', { class: 'dim' }, '—') : raw;
        return h('td', { class: c.num ? 'num' : '' }, v);
      }),
      hasActions ? h('td', { class: 'row-actions' },
        onEdit ? h('button', { class: 'btn-icon', title: 'Edit', onclick: () => onEdit(r) }, icon('edit', 15)) : null,
        onDelete ? h('button', { class: 'btn-icon danger', title: 'Delete', onclick: () => onDelete(r) }, icon('trash', 15)) : null,
      ) : null,
    ))),
  );
  return h('div', { class: 'table-scroll card' }, table);
}

export function loadingEl() {
  return h('div', { class: 'loading' }, h('div', {}, h('div', { class: 'spinner' }), 'Loading…'));
}
