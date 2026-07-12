import { crudPage } from './_crud.js';
import * as U from '../ui.js';
import * as C from '../calc.js';

const STATUSES = ['Evaluation', 'Funded', 'Passed', 'Failed'];

export default crudPage({
  entity: 'accounts',
  singular: 'account',
  title: 'Accounts',
  subtitle: 'Manage every prop firm account in one place.',
  fields: [
    { key: 'prop_firm', label: 'Prop Firm', required: true, placeholder: 'FTMO, FundedNext, The5ers…' },
    { key: 'account_id', label: 'Account ID', required: true, placeholder: 'e.g. 1052233' },
    { key: 'account_size', label: 'Account Size ($)', type: 'number', placeholder: '100000' },
    { key: 'balance', label: 'Current Balance ($)', type: 'number' },
    { key: 'status', label: 'Status', type: 'select', options: STATUSES },
    { key: 'funding_date', label: 'Funding Date', type: 'date' },
    { key: 'profit', label: 'Profit ($)', type: 'number' },
    { key: 'drawdown', label: 'Drawdown ($)', type: 'number' },
    { key: 'next_payout_date', label: 'Next Payout Date', type: 'date' },
    { key: 'notes', label: 'Notes', type: 'textarea', full: true, placeholder: 'Rules, profit split, reset history…' },
  ],
  columns: [
    { key: 'prop_firm', label: 'Prop Firm', render: r => U.h('span', { class: 'strong' }, r.prop_firm || '—') },
    { key: 'account_id', label: 'Account ID', render: r => U.h('span', { class: 'mono' }, r.account_id || '—') },
    { key: 'account_size', label: 'Size', num: true, render: r => U.fmtCompact(r.account_size) },
    { key: 'balance', label: 'Balance', num: true, render: r => U.fmtMoney(r.balance) },
    { key: 'status', label: 'Status', render: r => U.badge(r.status) },
    { key: 'funding_date', label: 'Funded', render: r => U.fmtDate(r.funding_date) },
    { key: 'profit', label: 'Profit', num: true, render: r => U.pnl(r.profit) },
    {
      key: 'drawdown', label: 'Drawdown', num: true,
      render: r => C.num(r.drawdown)
        ? U.h('span', { class: 'warn' }, U.fmtMoney(-Math.abs(C.num(r.drawdown))))
        : U.h('span', { class: 'dim' }, '—'),
    },
    { key: 'next_payout_date', label: 'Next Payout', render: r => U.fmtDate(r.next_payout_date) },
    { key: 'notes', label: 'Notes', render: r => U.noteCell(r.notes) },
  ],
  summary: rows => {
    const active = rows.filter(a => C.ACTIVE_STATUSES.includes(a.status));
    const profit = C.sum(rows, a => a.profit);
    return [
      U.statCard('Active accounts', String(active.length), `${rows.length} total`),
      U.statCard('Capital under management', U.fmtCompact(C.sum(active, a => a.account_size)), 'active accounts only'),
      U.statCard('Combined profit', U.fmtMoney(profit, { sign: true }), 'across all accounts',
        profit > 0 ? 'pos' : profit < 0 ? 'neg' : ''),
      U.statCard('Funded', String(rows.filter(a => a.status === 'Funded').length),
        `${rows.filter(a => a.status === 'Failed').length} failed`),
    ];
  },
  filters: {
    search: ['prop_firm', 'account_id', 'notes'],
    searchPlaceholder: 'Search firm, ID, notes…',
    selects: [{ key: 'status', label: 'statuses', options: STATUSES }],
  },
  emptyMsg: 'No accounts yet — add your first prop firm account.',
});
