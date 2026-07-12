// Thin fetch wrapper around the local REST API.
async function j(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) {
    let msg = res.statusText;
    try { msg = (await res.json()).error || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  return res.json();
}

const json = body => ({
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const api = {
  list: table => j(`/api/${table}`),
  create: (table, body) => j(`/api/${table}`, { method: 'POST', ...json(body) }),
  update: (table, id, body) => j(`/api/${table}/${id}`, { method: 'PUT', ...json(body) }),
  remove: (table, id) => j(`/api/${table}/${id}`, { method: 'DELETE' }),

  settings: () => j('/api/settings'),
  saveSettings: obj => j('/api/settings', { method: 'PUT', ...json(obj) }),

  backup: () => j('/api/backup'),
  restore: data => j('/api/restore', { method: 'POST', ...json(data) }),
  import: data => j('/api/import', { method: 'POST', ...json(data) }),

  async all() {
    const [accounts, trades, payouts, expenses, settings] = await Promise.all([
      api.list('accounts'), api.list('trades'), api.list('payouts'),
      api.list('expenses'), api.settings(),
    ]);
    return { accounts, trades, payouts, expenses, settings };
  },
};
