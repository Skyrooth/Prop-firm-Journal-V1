import { crudPage } from './_crud.js';
import * as U from '../ui.js';
import * as C from '../calc.js';

const CATEGORIES = ['Challenge Fee', 'Reset Fee', 'Activation Fee', 'Data / Platform', 'VPS / Tools', 'Education', 'Other'];

export default crudPage({
  entity: 'expenses',
  singular: 'expense',
  title: 'Expense Tracker',
  subtitle: 'Every dollar spent chasing funding — fees, resets, tools.',
  fields: [
    { key: 'date', label: 'Date', type: 'date', required: true, default: C.todayISO },
    { key: 'description', label: 'Description', required: true, placeholder: '100K Challenge fee' },
    { key: 'prop_firm', label: 'Prop Firm', placeholder: 'optional' },
    { key: 'amount', label: 'Amount ($)', type: 'number', required: true },
    { key: 'category', label: 'Category', type: 'select', options: CATEGORIES },
  ],
  columns: [
    { key: 'date', label: 'Date', render: r => U.fmtDate(r.date) },
    { key: 'description', label: 'Description', render: r => U.h('span', { class: 'strong' }, r.description || '—') },
    { key: 'prop_firm', label: 'Prop Firm' },
    { key: 'category', label: 'Category', render: r => U.badge(r.category, 'b-neutral') },
    { key: 'amount', label: 'Amount', num: true, render: r => U.h('span', { class: 'neg' }, U.fmtMoney(-Math.abs(C.num(r.amount)))) },
  ],
  summary: rows => {
    const total = C.sum(rows, e => e.amount);
    const thisMonth = C.sum(rows.filter(e => C.monthKey(e.date) === C.monthKey(C.todayISO())), e => e.amount);
    const byCat = C.groupSum(rows, e => e.category || 'Other', e => e.amount);
    const top = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0];
    return [
      U.statCard('Total spent', U.fmtMoney(total), `${rows.length} entries`, total > 0 ? 'neg' : ''),
      U.statCard('This month', U.fmtMoney(thisMonth), C.fmtMonth(C.monthKey(C.todayISO()))),
      U.statCard('Top category', top ? top[0] : '—', top ? U.fmtMoney(top[1]) : 'no expenses yet'),
      U.statCard('Avg per month', (() => {
        const months = new Set(rows.map(e => C.monthKey(e.date)).filter(Boolean));
        return months.size ? U.fmtMoney(total / months.size) : '—';
      })(), 'months with expenses'),
    ];
  },
  filters: {
    search: ['description', 'prop_firm'],
    searchPlaceholder: 'Search description or firm…',
    month: 'date',
    selects: [{ key: 'category', label: 'categories', options: CATEGORIES }],
  },
  emptyMsg: 'No expenses yet — log challenge fees, resets, and tools here.',
});
