// Data & Backup — Excel import/export, JSON backup/restore, clear all.
import { api } from '../api.js';
import * as U from '../ui.js';
import * as C from '../calc.js';

const SHEETS = {
  accounts: {
    name: 'Accounts',
    headers: {
      prop_firm: 'Prop Firm', account_id: 'Account ID', account_size: 'Account Size',
      balance: 'Balance', status: 'Status', funding_date: 'Funding Date', profit: 'Profit',
      drawdown: 'Drawdown', next_payout_date: 'Next Payout Date', notes: 'Notes',
    },
  },
  trades: {
    name: 'Trades',
    headers: {
      date: 'Date', symbol: 'Symbol', direction: 'Buy/Sell', lot_size: 'Lot Size',
      entry_price: 'Entry Price', exit_price: 'Exit Price', pnl: 'Profit/Loss', notes: 'Notes',
    },
  },
  payouts: {
    name: 'Payouts',
    headers: {
      prop_firm: 'Prop Firm', account_id: 'Account ID', payout_date: 'Payout Date',
      amount: 'Amount', status: 'Status', confirmation_date: 'Confirmation Date', net_payout: 'Net Payout',
    },
  },
  expenses: {
    name: 'Expenses',
    headers: { date: 'Date', description: 'Description', prop_firm: 'Prop Firm', amount: 'Amount', category: 'Category' },
  },
};

const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const toISO = d => {
  if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0) {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function pickFile(accept) {
  return new Promise(resolve => {
    const inp = U.h('input', { type: 'file', accept, style: 'display:none' });
    inp.onchange = () => { resolve(inp.files[0] || null); inp.remove(); };
    document.body.append(inp);
    inp.click();
  });
}

function downloadBlob(blob, filename) {
  const a = U.h('a', { href: URL.createObjectURL(blob), download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

function exportExcel(data) {
  const wb = XLSX.utils.book_new();
  for (const [table, cfg] of Object.entries(SHEETS)) {
    const rows = data[table].map(r =>
      Object.fromEntries(Object.entries(cfg.headers).map(([k, label]) => [label, r[k]])));
    const ws = XLSX.utils.json_to_sheet(rows, { header: Object.values(cfg.headers) });
    XLSX.utils.book_append_sheet(wb, ws, cfg.name);
  }
  XLSX.writeFile(wb, `prop-journal-${C.todayISO()}.xlsx`);
}

async function importExcel(file) {
  const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true });
  const payload = {};
  let found = 0;
  for (const [table, cfg] of Object.entries(SHEETS)) {
    const sheetName = wb.SheetNames.find(n => norm(n) === norm(cfg.name));
    if (!sheetName) continue;
    const raw = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: null });
    const map = {};
    for (const [k, label] of Object.entries(cfg.headers)) { map[norm(label)] = k; map[norm(k)] = k; }
    const rows = raw.map(r => {
      const out = {};
      for (const [col, v] of Object.entries(r)) {
        const key = map[norm(col)];
        if (!key || v == null || v === '') continue;
        out[key] = v instanceof Date ? toISO(v) : v;
      }
      return out;
    }).filter(r => Object.keys(r).length);
    if (rows.length) { payload[table] = rows; found += rows.length; }
  }
  if (!found) throw new Error('No matching sheets found — expected sheets named Accounts, Trades, Payouts, Expenses.');
  return api.import(payload);
}

export default async function render(root) {
  const data = await api.all();

  const counts = U.h('div', { class: 'stat-grid' },
    U.statCard('Accounts', String(data.accounts.length)),
    U.statCard('Trades', String(data.trades.length)),
    U.statCard('Payouts', String(data.payouts.length)),
    U.statCard('Expenses', String(data.expenses.length)),
  );

  const busy = (btn, fn) => async () => {
    btn.disabled = true;
    try { await fn(); } catch (e) { U.toast(e.message, 'err'); }
    btn.disabled = false;
  };

  // --- Excel export ---
  const exportBtn = U.h('button', { class: 'btn btn-primary' }, U.icon('download', 15), 'Export .xlsx');
  exportBtn.onclick = busy(exportBtn, async () => {
    exportExcel(await api.all());
    U.toast('Excel workbook exported');
  });

  // --- Excel import ---
  const importBtn = U.h('button', { class: 'btn' }, U.icon('upload', 15), 'Import .xlsx');
  importBtn.onclick = busy(importBtn, async () => {
    const file = await pickFile('.xlsx,.xls');
    if (!file) return;
    const res = await importExcel(file);
    const parts = Object.entries(res.added).filter(([, n]) => n > 0).map(([t, n]) => `${n} ${t}`);
    U.toast('Imported ' + (parts.join(', ') || 'nothing new'));
    render(root);
  });

  // --- JSON backup ---
  const backupBtn = U.h('button', { class: 'btn btn-primary' }, U.icon('download', 15), 'Download backup');
  backupBtn.onclick = busy(backupBtn, async () => {
    const dump = await api.backup();
    downloadBlob(new Blob([JSON.stringify(dump)], { type: 'application/json' }),
      `prop-journal-backup-${C.todayISO()}.json`);
    U.toast('Backup downloaded');
  });

  // --- JSON restore ---
  const restoreBtn = U.h('button', { class: 'btn' }, U.icon('upload', 15), 'Restore backup');
  restoreBtn.onclick = busy(restoreBtn, async () => {
    const file = await pickFile('.json,application/json');
    if (!file) return;
    let dump;
    try { dump = JSON.parse(await file.text()); }
    catch { throw new Error('That file is not valid JSON.'); }
    if (dump.app !== 'prop-journal') throw new Error('That file does not look like a Prop Journal backup.');
    const ok = await U.confirmDlg(
      'Restoring replaces ALL current data with the backup contents. This cannot be undone.',
      { okText: 'Restore', tone: 'danger' });
    if (!ok) return;
    const res = await api.restore(dump);
    U.toast(`Restored — ${res.counts.accounts} accounts, ${res.counts.trades} trades, ${res.counts.payouts} payouts, ${res.counts.expenses} expenses`);
    render(root);
  });

  // --- Clear all ---
  const clearBtn = U.h('button', { class: 'btn btn-danger' }, U.icon('trash', 15), 'Clear all data');
  clearBtn.onclick = busy(clearBtn, async () => {
    const ok = await U.confirmDlg('Delete ALL accounts, trades, payouts and expenses? Download a backup first if you might need this data again.',
      { okText: 'Delete everything' });
    if (!ok) return;
    await api.restore({ accounts: [], trades: [], payouts: [], expenses: [] });
    U.toast('All data cleared');
    render(root);
  });

  const card = (title, desc, btn, danger = false) => U.h('div', { class: 'card data-card' + (danger ? ' danger-zone' : '') },
    U.h('div', { class: 'card-title' }, title),
    U.h('p', {}, desc),
    btn,
  );

  root.replaceChildren(U.h('div', {},
    U.pageHeader('Data & Backup', 'Your journal lives in a local SQLite file — export or back it up any time.'),
    counts,
    U.h('div', { class: 'data-grid' },
      card('Export to Excel', 'One workbook with Accounts, Trades, Payouts and Expenses sheets. Screenshots and certificates are not included in Excel — use the JSON backup for a full copy.', exportBtn),
      card('Import from Excel', 'Reads the same sheet layout as the export and appends the rows to your journal (nothing is deleted). Tip: export first to get a ready-made template.', importBtn),
      card('Backup (JSON)', 'A complete snapshot: every record, all settings, plus embedded screenshots and certificates. Keep a copy somewhere safe.', backupBtn),
      card('Restore from backup', 'Loads a backup file and replaces everything currently in the app with it.', restoreBtn),
    ),
    card('Danger zone', 'Wipe the journal and start fresh. Settings for the challenge are kept.', clearBtn, true),
  ));
}
