// Pure calculation helpers — every automatic number in the app comes from here.

export const num = v => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

export const sum = (arr, fn) => arr.reduce((s, x) => s + num(fn(x)), 0);

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const monthKey = d => (d || '').slice(0, 7);
export const yearOf = d => (d || '').slice(0, 4);

export function isoWeekKey(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d)) return '';
  const day = (d.getDay() + 6) % 7; // Monday = 0
  const thursday = new Date(d);
  thursday.setDate(d.getDate() - day + 3);
  const jan1 = new Date(thursday.getFullYear(), 0, 1);
  const week = Math.ceil(((thursday - jan1) / 86400000 + 1) / 7);
  return `${thursday.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function groupSum(rows, keyFn, valFn) {
  const m = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    if (!k) continue;
    m.set(k, (m.get(k) || 0) + num(valFn(r)));
  }
  return m;
}

export const fmtMonth = m => {
  const [y, mo] = (m || '').split('-');
  if (!y || !mo) return m || '';
  return new Date(+y, +mo - 1, 1).toLocaleDateString('en-US', { month: 'short' }) + " '" + y.slice(2);
};

/* ---------------- Domain rules ---------------- */
export const ACTIVE_STATUSES = ['Evaluation', 'Funded'];
export const isConfirmedPayout = p => (p.status || '').toLowerCase() === 'confirmed';
export const isPendingPayout = p => (p.status || '').toLowerCase() === 'pending';
// Net amount actually received for a payout; falls back to gross amount.
export const payoutNet = p => {
  const n = num(p.net_payout);
  return n !== 0 ? n : num(p.amount);
};
export const payoutDate = p => p.confirmation_date || p.payout_date || '';

export function winStats(trades) {
  const closed = trades.filter(t => t.pnl !== null && t.pnl !== undefined && t.pnl !== '');
  const wins = closed.filter(t => num(t.pnl) > 0).length;
  const losses = closed.filter(t => num(t.pnl) < 0).length;
  return {
    total: closed.length,
    wins,
    losses,
    be: closed.length - wins - losses,
    winRate: closed.length ? (wins / closed.length) * 100 : 0,
    pnl: sum(closed, t => t.pnl),
  };
}

export function dashboardStats({ accounts, trades, payouts, expenses }) {
  const active = accounts.filter(a => ACTIVE_STATUSES.includes(a.status));
  const confirmed = payouts.filter(isConfirmedPayout);
  const pending = payouts.filter(isPendingPayout);
  const totalPayout = sum(confirmed, payoutNet);
  const totalExpense = sum(expenses, e => e.amount);
  const ws = winStats(trades);
  const statusCounts = {};
  for (const a of accounts) {
    const s = a.status || 'Evaluation';
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  }
  return {
    totalCapital: sum(active, a => a.account_size),
    totalProfit: ws.pnl,
    totalPayout,
    totalExpense,
    netProfit: totalPayout - totalExpense,
    // Return on the money spent chasing funding; null until there is an expense to measure against.
    roi: totalExpense > 0 ? ((totalPayout - totalExpense) / totalExpense) * 100 : null,
    confirmedCount: confirmed.length,
    activeAccounts: active.length,
    passed: accounts.filter(a => a.status === 'Passed' || a.status === 'Funded').length,
    failed: accounts.filter(a => a.status === 'Failed').length,
    pendingCount: pending.length,
    pendingAmount: sum(pending, p => p.amount),
    winRate: ws.winRate,
    wins: ws.wins,
    losses: ws.losses,
    tradeCount: ws.total,
    statusCounts,
  };
}

export function journalSummary(trades) {
  const today = todayISO();
  const wk = isoWeekKey(today);
  const mo = monthKey(today);
  return {
    day: winStats(trades.filter(t => t.date === today)),
    week: winStats(trades.filter(t => isoWeekKey(t.date) === wk)),
    month: winStats(trades.filter(t => monthKey(t.date) === mo)),
    all: winStats(trades),
  };
}

/* ---------------- Challenge $500 → $1M ---------------- */
const MILESTONES = [1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000];

// Personal capital = start capital + confirmed net payouts − expenses, over time.
export function challengeState(settings, payouts, expenses) {
  const start = num(settings.challenge_start_capital) || 500;
  const target = num(settings.challenge_target) || 1000000;

  const events = [
    ...payouts.filter(isConfirmedPayout).map(p => ({ date: payoutDate(p) || '', amt: payoutNet(p) })),
    ...expenses.map(e => ({ date: e.date || '', amt: -num(e.amount) })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  let cur = start;
  const timeline = [];
  for (const ev of events) {
    cur += ev.amt;
    timeline.push({ date: ev.date, value: cur });
  }
  const current = cur;

  const list = MILESTONES.filter(m => m > start && m < target);
  if (target > start) list.push(target);
  list.sort((a, b) => a - b);

  let prev = start;
  const milestones = list.map(amount => {
    const done = current >= amount;
    const reached = timeline.find(t => t.value >= amount);
    const pct = done ? 1 : Math.max(0, Math.min(1, (current - prev) / (amount - prev)));
    const ms = { amount, prev, done, date: done && reached ? reached.date : null, pct };
    prev = amount;
    return ms;
  });

  return {
    start, target, current, timeline, milestones,
    overall: Math.max(0, Math.min(1, (current - start) / (target - start))),
    nextMilestone: milestones.find(m => !m.done) || null,
  };
}

/* ---------------- Monthly aggregates for reports ---------------- */
export function monthlyPerformance({ trades, payouts, expenses }) {
  const tp = groupSum(trades, t => monthKey(t.date), t => t.pnl);
  const po = groupSum(payouts.filter(isConfirmedPayout), p => monthKey(payoutDate(p)), payoutNet);
  const ex = groupSum(expenses, e => monthKey(e.date), e => e.amount);
  const months = new Set([...tp.keys(), ...po.keys(), ...ex.keys()]);
  return [...months].sort().map(m => ({
    month: m,
    trading: tp.get(m) || 0,
    payout: po.get(m) || 0,
    expense: ex.get(m) || 0,
    net: (po.get(m) || 0) - (ex.get(m) || 0),
  }));
}

export function monthlyWinRate(trades) {
  const byMonth = new Map();
  for (const t of trades) {
    const m = monthKey(t.date);
    if (!m) continue;
    if (!byMonth.has(m)) byMonth.set(m, []);
    byMonth.get(m).push(t);
  }
  return [...byMonth.keys()].sort().map(m => ({ month: m, ...winStats(byMonth.get(m)) }));
}
