import { crudPage } from './_crud.js';
import { api } from '../api.js';
import * as U from '../ui.js';
import * as C from '../calc.js';

const STATUSES = ['Pending', 'Confirmed', 'Rejected'];

export default crudPage({
  entity: 'payouts',
  singular: 'payout',
  title: 'Payout Tracker',
  subtitle: 'Track every payout from request to money in the bank.',
  loadExtra: () => api.list('accounts'),
  fields: accounts => [
    { key: 'prop_firm', label: 'Prop Firm', required: true, list: accounts.map(a => a.prop_firm) },
    { key: 'account_id', label: 'Account ID', required: true, list: accounts.map(a => a.account_id) },
    { key: 'payout_date', label: 'Payout Date (requested)', type: 'date', default: C.todayISO },
    { key: 'amount', label: 'Amount ($)', type: 'number', required: true },
    { key: 'status', label: 'Status', type: 'select', options: STATUSES },
    { key: 'confirmation_date', label: 'Confirmation Date', type: 'date' },
    { key: 'net_payout', label: 'Net Payout ($)', type: 'number', placeholder: 'after profit split & fees' },
    { key: 'certificate', label: 'Certificate', type: 'image', full: true },
  ],
  columns: [
    { key: 'prop_firm', label: 'Prop Firm', render: r => U.h('span', { class: 'strong' }, r.prop_firm || '—') },
    { key: 'account_id', label: 'Account ID', render: r => U.h('span', { class: 'mono' }, r.account_id || '—') },
    { key: 'payout_date', label: 'Payout Date', render: r => U.fmtDate(r.payout_date) },
    { key: 'amount', label: 'Amount', num: true, render: r => U.fmtMoney(r.amount) },
    { key: 'status', label: 'Status', render: r => U.badge(r.status) },
    { key: 'certificate', label: 'Certificate', render: r => U.thumb(r.certificate) },
    { key: 'confirmation_date', label: 'Confirmed', render: r => U.fmtDate(r.confirmation_date) },
    {
      key: 'net_payout', label: 'Net Payout', num: true,
      render: r => C.isConfirmedPayout(r)
        ? U.h('span', { class: 'pos strong' }, U.fmtMoney(C.payoutNet(r)))
        : U.h('span', { class: 'dim' }, U.fmtMoney(C.payoutNet(r))),
    },
  ],
  summary: rows => {
    const confirmed = rows.filter(C.isConfirmedPayout);
    const pending = rows.filter(C.isPendingPayout);
    const thisMonth = confirmed.filter(p => C.monthKey(C.payoutDate(p)) === C.monthKey(C.todayISO()));
    const best = confirmed.reduce((mx, p) => Math.max(mx, C.payoutNet(p)), 0);
    return [
      U.statCard('Total received', U.fmtMoney(C.sum(confirmed, C.payoutNet)),
        `${confirmed.length} confirmed payouts`, 'pos'),
      U.statCard('Pending', U.fmtMoney(C.sum(pending, p => p.amount)),
        `${pending.length} waiting for confirmation`),
      U.statCard('This month', U.fmtMoney(C.sum(thisMonth, C.payoutNet)), 'confirmed net'),
      U.statCard('Best payout', best ? U.fmtMoney(best) : '—', 'single largest net'),
    ];
  },
  filters: {
    search: ['prop_firm', 'account_id'],
    searchPlaceholder: 'Search firm or account…',
    month: 'payout_date',
    selects: [{ key: 'status', label: 'statuses', options: STATUSES }],
  },
  emptyMsg: 'No payouts yet — request one from your prop firm, then log it here.',
});
