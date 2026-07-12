import { crudPage } from './_crud.js';
import * as U from '../ui.js';
import * as C from '../calc.js';

export default crudPage({
  entity: 'trades',
  singular: 'trade',
  title: 'Trading Journal',
  subtitle: 'Log every trade — daily, weekly and monthly stats are calculated automatically.',
  fields: [
    { key: 'date', label: 'Date', type: 'date', required: true, default: C.todayISO },
    { key: 'symbol', label: 'Symbol', required: true, placeholder: 'XAUUSD, EURUSD, NAS100…', transform: v => v.toUpperCase() },
    { key: 'direction', label: 'Buy / Sell', type: 'select', options: ['Buy', 'Sell'] },
    { key: 'lot_size', label: 'Lot Size', type: 'number', placeholder: '0.50' },
    { key: 'entry_price', label: 'Entry Price', type: 'number' },
    { key: 'exit_price', label: 'Exit Price', type: 'number' },
    { key: 'pnl', label: 'Profit / Loss ($)', type: 'number', required: true, placeholder: 'e.g. 250 or -120' },
    { key: 'screenshot', label: 'Screenshot', type: 'image', full: true },
    { key: 'notes', label: 'Notes', type: 'textarea', full: true, placeholder: 'Setup, execution, mistakes, emotions…' },
  ],
  columns: [
    { key: 'date', label: 'Date', render: r => U.fmtDate(r.date) },
    { key: 'symbol', label: 'Symbol', render: r => U.h('span', { class: 'strong' }, r.symbol || '—') },
    { key: 'direction', label: 'Side', render: r => U.badge(r.direction) },
    { key: 'lot_size', label: 'Lots', num: true },
    { key: 'entry_price', label: 'Entry', num: true },
    { key: 'exit_price', label: 'Exit', num: true },
    { key: 'pnl', label: 'P / L', num: true, render: r => U.pnl(r.pnl) },
    { key: 'screenshot', label: 'Chart', render: r => U.thumb(r.screenshot) },
    { key: 'notes', label: 'Notes', render: r => U.noteCell(r.notes) },
  ],
  summary: rows => {
    const s = C.journalSummary(rows);
    const card = (label, st) => U.statCard(
      label,
      U.fmtMoney(st.pnl, { sign: true }),
      st.total ? `${st.total} trades · ${st.winRate.toFixed(0)}% win` : 'no trades',
      st.pnl > 0 ? 'pos' : st.pnl < 0 ? 'neg' : '',
    );
    return [
      card('Today', s.day),
      card('This week', s.week),
      card('This month', s.month),
      card('All time', s.all),
      U.statCard('Win rate (all)', s.all.winRate.toFixed(1) + '%',
        `${s.all.wins}W · ${s.all.losses}L` + (s.all.be ? ` · ${s.all.be}BE` : '')),
    ];
  },
  filters: {
    search: ['symbol', 'notes'],
    searchPlaceholder: 'Search symbol or notes…',
    month: 'date',
    selects: [{ key: 'direction', label: 'sides', options: ['Buy', 'Sell'] }],
  },
  emptyMsg: 'No trades logged yet — add your first trade.',
});
