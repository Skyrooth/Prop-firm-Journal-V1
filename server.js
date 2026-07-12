const path = require('path');
const express = require('express');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5599;

app.use(express.json({ limit: '120mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Vendor libraries served straight from node_modules (fully offline)
const VENDOR = {
  '/vendor/chart.umd.js': ['chart.js', 'dist', 'chart.umd.js'],
  '/vendor/xlsx.full.min.js': ['xlsx', 'dist', 'xlsx.full.min.js'],
};
for (const [route, parts] of Object.entries(VENDOR)) {
  app.get(route, (_req, res) => res.sendFile(path.join(__dirname, 'node_modules', ...parts)));
}

const TABLES = {
  accounts: {
    cols: ['prop_firm', 'account_id', 'account_size', 'balance', 'status', 'funding_date',
      'profit', 'drawdown', 'next_payout_date', 'notes'],
    orderBy: 'id DESC',
  },
  trades: {
    cols: ['date', 'symbol', 'direction', 'lot_size', 'entry_price', 'exit_price',
      'pnl', 'screenshot', 'notes'],
    orderBy: 'date DESC, id DESC',
  },
  payouts: {
    cols: ['prop_firm', 'account_id', 'payout_date', 'amount', 'status', 'certificate',
      'confirmation_date', 'net_payout'],
    orderBy: "COALESCE(payout_date,'') DESC, id DESC",
  },
  expenses: {
    cols: ['date', 'description', 'prop_firm', 'amount', 'category'],
    orderBy: "COALESCE(date,'') DESC, id DESC",
  },
};

// Columns that are NOT NULL in the schema: an empty form field (null) falls back to 0
// so inserts/updates never trip the constraint.
const NUM_DEFAULTS = {
  accounts: { account_size: 0, balance: 0, profit: 0, drawdown: 0 },
  trades: { pnl: 0 },
  payouts: { amount: 0, net_payout: 0 },
  expenses: { amount: 0 },
};

function pickCols(body, cols, table) {
  const out = {};
  const defaults = NUM_DEFAULTS[table] || {};
  for (const c of cols) {
    if (!(c in body)) continue;
    let v = body[c];
    if (v === '' || v === undefined) v = null;
    if (typeof v === 'boolean') v = v ? 1 : 0;
    else if (v !== null && typeof v === 'object') v = JSON.stringify(v);
    if (v === null && c in defaults) v = defaults[c];
    out[c] = v;
  }
  return out;
}

function insertRow(name, row, keepId) {
  const t = TABLES[name];
  const vals = pickCols(row || {}, t.cols, name);
  if (keepId && row && row.id != null) vals.id = row.id;
  const keys = Object.keys(vals);
  if (!keys.length) return false;
  db.prepare(`INSERT INTO ${name} (${keys.join(',')}) VALUES (${keys.map(k => '@' + k).join(',')})`).run(vals);
  return true;
}

function countAll() {
  return Object.fromEntries(Object.keys(TABLES).map(n =>
    [n, db.prepare(`SELECT COUNT(*) AS c FROM ${n}`).get().c]));
}

// ---- Generic CRUD for the four tables ----
for (const [name, t] of Object.entries(TABLES)) {
  app.get(`/api/${name}`, (_req, res) => {
    res.json(db.prepare(`SELECT * FROM ${name} ORDER BY ${t.orderBy}`).all());
  });

  app.post(`/api/${name}`, (req, res) => {
    const vals = pickCols(req.body || {}, t.cols, name);
    const keys = Object.keys(vals);
    if (!keys.length) return res.status(400).json({ error: 'No valid fields supplied' });
    const info = db.prepare(`INSERT INTO ${name} (${keys.join(',')}) VALUES (${keys.map(k => '@' + k).join(',')})`).run(vals);
    res.json(db.prepare(`SELECT * FROM ${name} WHERE id = ?`).get(info.lastInsertRowid));
  });

  app.put(`/api/${name}/:id`, (req, res) => {
    const vals = pickCols(req.body || {}, t.cols, name);
    const keys = Object.keys(vals);
    if (!keys.length) return res.status(400).json({ error: 'No valid fields supplied' });
    const info = db.prepare(`UPDATE ${name} SET ${keys.map(k => `${k} = @${k}`).join(', ')} WHERE id = @id`)
      .run({ ...vals, id: req.params.id });
    if (!info.changes) return res.status(404).json({ error: 'Record not found' });
    res.json(db.prepare(`SELECT * FROM ${name} WHERE id = ?`).get(req.params.id));
  });

  app.delete(`/api/${name}/:id`, (req, res) => {
    const info = db.prepare(`DELETE FROM ${name} WHERE id = ?`).run(req.params.id);
    res.json({ ok: true, deleted: info.changes });
  });
}

// ---- Settings ----
app.get('/api/settings', (_req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  res.json(Object.fromEntries(rows.map(r => [r.key, r.value])));
});

app.put('/api/settings', (req, res) => {
  const up = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  const tx = db.transaction(obj => {
    for (const [k, v] of Object.entries(obj)) up.run(k, String(v));
  });
  tx(req.body || {});
  const rows = db.prepare('SELECT key, value FROM settings').all();
  res.json(Object.fromEntries(rows.map(r => [r.key, r.value])));
});

// ---- Backup / Restore / Import ----
app.get('/api/backup', (_req, res) => {
  const out = { app: 'prop-journal', version: 1, exported_at: new Date().toISOString() };
  out.settings = Object.fromEntries(db.prepare('SELECT key, value FROM settings').all().map(r => [r.key, r.value]));
  for (const name of Object.keys(TABLES)) out[name] = db.prepare(`SELECT * FROM ${name}`).all();
  res.json(out);
});

// Full restore: wipes the four tables and re-inserts (ids preserved).
app.post('/api/restore', (req, res) => {
  const data = req.body || {};
  const tx = db.transaction(() => {
    for (const name of Object.keys(TABLES)) {
      db.prepare(`DELETE FROM ${name}`).run();
      const rows = Array.isArray(data[name]) ? data[name] : [];
      for (const row of rows) insertRow(name, row, true);
    }
    if (data.settings && typeof data.settings === 'object') {
      const up = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
      for (const [k, v] of Object.entries(data.settings)) up.run(k, String(v));
    }
  });
  tx();
  res.json({ ok: true, counts: countAll() });
});

// Additive import (from Excel): appends rows, never deletes.
app.post('/api/import', (req, res) => {
  const data = req.body || {};
  const added = {};
  const tx = db.transaction(() => {
    for (const name of Object.keys(TABLES)) {
      const rows = Array.isArray(data[name]) ? data[name] : [];
      added[name] = 0;
      for (const row of rows) { if (insertRow(name, row, false)) added[name]++; }
    }
  });
  tx();
  res.json({ ok: true, added });
});

app.use('/api', (_req, res) => res.status(404).json({ error: 'Unknown API endpoint' }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Server error' });
});

app.listen(PORT, () => {
  console.log(`Prop Journal running at http://localhost:${PORT}`);
  const os = require('os');
  for (const list of Object.values(os.networkInterfaces())) {
    for (const n of list) {
      if (n.family === 'IPv4' && !n.internal) {
        console.log(`  From your phone (same Wi-Fi): http://${n.address}:${PORT}`);
      }
    }
  }
});
