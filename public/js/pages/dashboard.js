import { api } from '../api.js';
import * as U from '../ui.js';
import * as C from '../calc.js';
import * as CH from '../charts.js';

function miniStat(label, value, color) {
  return U.h('div', { class: 'mini-stat' },
    U.h('span', { class: 'm-dot', style: `background:${color}` }),
    U.h('span', { class: 'm-label' }, label),
    U.h('span', { class: 'm-value' }, value),
  );
}

export default async function render(root) {
  const data = await api.all();
  const s = C.dashboardStats(data);
  const tone = v => (v > 0 ? 'pos' : v < 0 ? 'neg' : '');

  const kpis = U.h('div', { class: 'stat-grid' },
    U.statCard('Total Capital', U.fmtCompact(s.totalCapital), 'active account sizes'),
    U.statCard('Total Profit', U.fmtMoney(s.totalProfit, { sign: true }), 'trading P/L · all time', tone(s.totalProfit)),
    U.statCard('Net Profit', U.fmtMoney(s.netProfit, { sign: true }), 'payouts − expenses', tone(s.netProfit)),
    U.statCard('Total Payout', U.fmtMoney(s.totalPayout), `${s.confirmedCount} confirmed`, s.totalPayout > 0 ? 'pos' : ''),
    U.statCard('Total Expense', U.fmtMoney(s.totalExpense), `${data.expenses.length} entries`, s.totalExpense > 0 ? 'neg' : ''),
    U.statCard('Win Rate', s.winRate.toFixed(1) + '%', `${s.wins}W · ${s.losses}L of ${s.tradeCount} trades`),
  );

  const minis = U.h('div', { class: 'mini-grid' },
    miniStat('Active Accounts', String(s.activeAccounts), CH.PALETTE.blue),
    miniStat('Passed Challenges', String(s.passed), CH.PALETTE.green),
    miniStat('Failed Challenges', String(s.failed), CH.PALETTE.red),
    miniStat('Pending Payouts', s.pendingCount ? `${s.pendingCount} · ${U.fmtCompact(s.pendingAmount)}` : '0', CH.PALETTE.amber),
  );

  const eq = CH.chartCard('Equity Curve', 'Cumulative trading P/L', 250);
  const st = CH.chartCard('Accounts by Status', `${data.accounts.length} accounts`, 250);

  // Recent trades
  const recentRows = data.trades.slice(0, 6);
  const recent = U.h('div', { class: 'card' },
    U.h('div', { class: 'card-title' }, 'Recent Trades'),
    recentRows.length
      ? U.h('div', { class: 'table-scroll' }, U.h('table', { class: 'table' },
          U.h('tbody', {}, recentRows.map(t => U.h('tr', {},
            U.h('td', {}, U.fmtDate(t.date)),
            U.h('td', {}, U.h('span', { class: 'strong' }, t.symbol)),
            U.h('td', {}, U.badge(t.direction)),
            U.h('td', { class: 'num' }, U.pnl(t.pnl)),
          )))))
      : U.h('div', { class: 'fund-none' }, 'No trades yet — log your first trade in the journal.'),
  );

  // Upcoming payouts: scheduled account payout dates + pending payout requests
  const today = C.todayISO();
  const upcoming = [
    ...data.accounts
      .filter(a => a.next_payout_date && a.next_payout_date >= today && C.ACTIVE_STATUSES.includes(a.status))
      .map(a => ({ date: a.next_payout_date, text: `${a.prop_firm} · ${a.account_id}`, badge: 'Scheduled', cls: 'b-blue' })),
    ...data.payouts
      .filter(C.isPendingPayout)
      .map(p => ({ date: p.payout_date || '—', text: `${p.prop_firm} · ${U.fmtMoney(p.amount)}`, badge: 'Pending', cls: 'b-amber' })),
  ].sort((a, b) => String(a.date).localeCompare(String(b.date))).slice(0, 7);

  const upcomingCard = U.h('div', { class: 'card' },
    U.h('div', { class: 'card-title' }, 'Upcoming Payouts'),
    upcoming.length
      ? U.h('div', {}, upcoming.map(u => U.h('div', { class: 'up-item' },
          U.h('span', { class: 'up-date' }, U.fmtDate(u.date)),
          U.h('span', { class: 'up-main' }, u.text),
          U.badge(u.badge, u.cls),
        )))
      : U.h('div', { class: 'fund-none' }, 'Nothing scheduled — set “Next Payout Date” on funded accounts.'),
  );

  const container = U.h('div', {},
    U.pageHeader('Dashboard', new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })),
    kpis,
    minis,
    U.h('div', { class: 'grid-2-1' }, eq.el, st.el),
    U.h('div', { class: 'grid-2-1' }, recent, upcomingCard),
  );
  root.replaceChildren(container);

  // ---- Charts (created after mount) ----
  const closed = [...data.trades].filter(t => t.date).sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
  if (closed.length) {
    let cum = 0;
    const points = closed.map(t => ({ x: U.fmtDate(t.date), y: (cum += C.num(t.pnl)) }));
    CH.makeChart(eq.canvas, {
      type: 'line',
      data: {
        labels: points.map(p => p.x),
        datasets: [{
          label: 'Equity',
          data: points.map(p => p.y),
          borderColor: CH.PALETTE.blue,
          backgroundColor: 'rgba(79,140,255,0.10)',
          fill: true,
        }],
      },
      options: {
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ' ' + CH.moneyTip(ctx.parsed.y) } },
        },
        scales: { x: { ...CH.xScale(), ticks: { maxTicksLimit: 8 } }, y: CH.moneyScale() },
      },
    });
  } else {
    CH.chartEmpty(eq.canvas, 'Log trades to see your equity curve');
  }

  const statuses = Object.keys(s.statusCounts);
  if (statuses.length) {
    CH.makeChart(st.canvas, {
      type: 'doughnut',
      data: {
        labels: statuses,
        datasets: [{
          data: statuses.map(k => s.statusCounts[k]),
          backgroundColor: statuses.map(k => CH.STATUS_COLORS[k] || '#68738c'),
          borderColor: '#141a24',
          borderWidth: 2,
        }],
      },
      options: {
        cutout: '68%',
        plugins: { legend: { position: 'bottom' } },
        interaction: { mode: 'nearest', intersect: true },
      },
    });
  } else {
    CH.chartEmpty(st.canvas, 'Add accounts to see the breakdown');
  }
}
