// Reports — monthly charts for profit, expenses, payouts, net and win rate.
import { api } from '../api.js';
import * as U from '../ui.js';
import * as C from '../calc.js';
import * as CH from '../charts.js';

export default async function render(root) {
  const data = await api.all();
  let charts = [];

  const years = [...new Set([
    ...data.trades.map(t => C.yearOf(t.date)),
    ...data.payouts.map(p => C.yearOf(C.payoutDate(p))),
    ...data.expenses.map(e => C.yearOf(e.date)),
  ].filter(y => y && y.length === 4))].sort().reverse();

  let year = 'all';
  const yearSel = U.h('select', { class: 'input slim' },
    U.h('option', { value: 'all' }, 'All time'),
    years.map(y => U.h('option', { value: y }, y)));
  yearSel.onchange = () => { year = yearSel.value; draw(); };

  const body = U.h('div');
  root.replaceChildren(U.h('div', {},
    U.pageHeader('Reports', 'Profit, expenses, payouts and monthly performance at a glance.', [yearSel]),
    body,
  ));
  draw();

  function draw() {
    charts.forEach(c => c.destroy());
    charts = [];

    const inYear = d => year === 'all' || C.yearOf(d) === year;
    const trades = data.trades.filter(t => inYear(t.date));
    const payouts = data.payouts.filter(p => inYear(C.payoutDate(p)));
    const expenses = data.expenses.filter(e => inYear(e.date));

    const perf = C.monthlyPerformance({ trades, payouts, expenses });
    const wr = C.monthlyWinRate(trades);
    const months = perf.map(p => C.fmtMonth(p.month));

    const totPayout = C.sum(payouts.filter(C.isConfirmedPayout), C.payoutNet);
    const totExpense = C.sum(expenses, e => e.amount);
    const ws = C.winStats(trades);

    const kpis = U.h('div', { class: 'stat-grid' },
      U.statCard('Trading Profit', U.fmtMoney(ws.pnl, { sign: true }), `${ws.total} trades`,
        ws.pnl > 0 ? 'pos' : ws.pnl < 0 ? 'neg' : ''),
      U.statCard('Payouts', U.fmtMoney(totPayout), 'confirmed net', totPayout > 0 ? 'pos' : ''),
      U.statCard('Expenses', U.fmtMoney(totExpense), `${expenses.length} entries`, totExpense > 0 ? 'neg' : ''),
      U.statCard('Net Profit', U.fmtMoney(totPayout - totExpense, { sign: true }), 'payouts − expenses',
        totPayout - totExpense > 0 ? 'pos' : totPayout - totExpense < 0 ? 'neg' : ''),
    );

    const c1 = CH.chartCard('Monthly Trading Profit', 'Sum of journal P/L per month', 240);
    const c2 = CH.chartCard('Cumulative Net Profit', 'Running total of payouts − expenses', 240);
    const c3 = CH.chartCard('Payouts by Month', 'Confirmed net payouts', 240);
    const c4 = CH.chartCard('Expenses by Month', 'All categories', 240);
    const c5 = CH.chartCard('Expenses by Category', '', 240);
    const c6 = CH.chartCard('Win Rate by Month', '% of trades closed in profit', 240);
    const c7 = CH.chartCard('Monthly Performance', 'Payouts vs expenses, with resulting net', 280);

    body.replaceChildren(
      kpis,
      U.h('div', { class: 'grid-2' }, c1.el, c2.el),
      U.h('div', { class: 'grid-2' }, c3.el, c4.el),
      U.h('div', { class: 'grid-2' }, c5.el, c6.el),
      c7.el,
    );

    const money = { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${CH.moneyTip(ctx.parsed.y ?? ctx.parsed.x)}` } };

    if (!perf.length) {
      [c1, c2, c3, c4, c7].forEach(c => CH.chartEmpty(c.canvas, 'No data for this period'));
    } else {
      charts.push(CH.makeChart(c1.canvas, {
        type: 'bar',
        data: {
          labels: months,
          datasets: [{
            label: 'Trading P/L',
            data: perf.map(p => p.trading),
            backgroundColor: perf.map(p => (p.trading >= 0 ? CH.PALETTE.green : CH.PALETTE.red)),
          }],
        },
        options: { plugins: { legend: { display: false }, tooltip: money }, scales: { x: CH.xScale(), y: CH.moneyScale() } },
      }));

      let cum = 0;
      charts.push(CH.makeChart(c2.canvas, {
        type: 'line',
        data: {
          labels: months,
          datasets: [{
            label: 'Net profit',
            data: perf.map(p => (cum += p.net)),
            borderColor: CH.PALETTE.blue,
            backgroundColor: 'rgba(79,140,255,0.10)',
            fill: true,
          }],
        },
        options: { plugins: { legend: { display: false }, tooltip: money }, scales: { x: CH.xScale(), y: CH.moneyScale() } },
      }));

      charts.push(CH.makeChart(c3.canvas, {
        type: 'bar',
        data: { labels: months, datasets: [{ label: 'Payouts', data: perf.map(p => p.payout), backgroundColor: CH.PALETTE.green }] },
        options: { plugins: { legend: { display: false }, tooltip: money }, scales: { x: CH.xScale(), y: CH.moneyScale() } },
      }));

      charts.push(CH.makeChart(c4.canvas, {
        type: 'bar',
        data: { labels: months, datasets: [{ label: 'Expenses', data: perf.map(p => p.expense), backgroundColor: CH.PALETTE.red }] },
        options: { plugins: { legend: { display: false }, tooltip: money }, scales: { x: CH.xScale(), y: CH.moneyScale() } },
      }));

      charts.push(CH.makeChart(c7.canvas, {
        type: 'bar',
        data: {
          labels: months,
          datasets: [
            { label: 'Payouts', data: perf.map(p => p.payout), backgroundColor: CH.PALETTE.green },
            { label: 'Expenses', data: perf.map(p => -p.expense), backgroundColor: CH.PALETTE.red },
            { label: 'Net', data: perf.map(p => p.net), type: 'line', borderColor: CH.PALETTE.blue, backgroundColor: CH.PALETTE.blue, pointRadius: 3 },
          ],
        },
        options: { plugins: { tooltip: money }, scales: { x: CH.xScale(), y: CH.moneyScale() } },
      }));
    }

    const byCat = [...C.groupSum(expenses, e => e.category || 'Other', e => e.amount).entries()]
      .sort((a, b) => b[1] - a[1]);
    if (byCat.length) {
      charts.push(CH.makeChart(c5.canvas, {
        type: 'bar',
        data: {
          labels: byCat.map(x => x[0]),
          datasets: [{ label: 'Spent', data: byCat.map(x => x[1]), backgroundColor: CH.PALETTE.amber }],
        },
        options: {
          indexAxis: 'y',
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ' ' + CH.moneyTip(ctx.parsed.x) } } },
          scales: { x: { ...CH.moneyScale(), position: 'bottom' }, y: CH.xScale() },
          interaction: { mode: 'nearest', intersect: false },
        },
      }));
    } else {
      CH.chartEmpty(c5.canvas, 'No expenses for this period');
    }

    if (wr.length) {
      charts.push(CH.makeChart(c6.canvas, {
        type: 'line',
        data: {
          labels: wr.map(x => C.fmtMonth(x.month)),
          datasets: [{
            label: 'Win rate',
            data: wr.map(x => x.winRate),
            borderColor: CH.PALETTE.purple,
            backgroundColor: 'rgba(155,120,229,0.10)',
            fill: true,
            pointRadius: 3,
          }],
        },
        options: {
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y.toFixed(1)}%` } } },
          scales: {
            x: CH.xScale(),
            y: { min: 0, max: 100, ticks: { callback: v => v + '%', maxTicksLimit: 6 }, grid: { color: 'rgba(148,163,190,0.07)' }, border: { display: false } },
          },
        },
      }));
    } else {
      CH.chartEmpty(c6.canvas, 'No trades for this period');
    }
  }
}
