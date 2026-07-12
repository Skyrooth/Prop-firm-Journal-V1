// Funding History — every funded account with its payout history.
import { api } from '../api.js';
import * as U from '../ui.js';
import * as C from '../calc.js';

export default async function render(root) {
  const [accounts, payouts] = await Promise.all([api.list('accounts'), api.list('payouts')]);

  const funded = accounts
    .filter(a => a.funding_date || ['Funded', 'Passed'].includes(a.status))
    .sort((a, b) => String(b.funding_date || '').localeCompare(String(a.funding_date || '')));

  const fundedPayouts = key => payouts.filter(p => p.account_id && p.account_id === key);

  const totalReceived = C.sum(
    funded.flatMap(a => fundedPayouts(a.account_id).filter(C.isConfirmedPayout)),
    C.payoutNet,
  );

  const summary = U.h('div', { class: 'stat-grid' },
    U.statCard('Funded accounts', String(funded.filter(a => a.status === 'Funded').length),
      `${funded.length} in funding history`),
    U.statCard('Funded capital', U.fmtCompact(C.sum(funded.filter(a => a.status === 'Funded'), a => a.account_size)),
      'currently funded'),
    U.statCard('Payouts received', U.fmtMoney(totalReceived), 'from funded accounts', totalReceived > 0 ? 'pos' : ''),
  );

  const cards = funded.map(a => {
    const ps = fundedPayouts(a.account_id)
      .sort((x, y) => String(x.payout_date || '').localeCompare(String(y.payout_date || '')));
    const received = C.sum(ps.filter(C.isConfirmedPayout), C.payoutNet);
    const days = a.funding_date
      ? Math.max(0, Math.floor((new Date(C.todayISO()) - new Date(a.funding_date)) / 86400000))
      : null;

    return U.h('div', { class: 'card fund-card' },
      U.h('div', { class: 'fund-head' },
        U.h('div', { class: 'fund-title' },
          U.h('span', { class: 'firm' }, a.prop_firm),
          U.h('span', { class: 'mono' }, a.account_id),
          U.badge(a.status),
        ),
        U.h('div', { class: 'fund-meta' },
          U.h('div', {}, 'Account size', U.h('b', {}, U.fmtCompact(a.account_size))),
          U.h('div', {}, 'Funded on', U.h('b', {}, U.fmtDate(a.funding_date))),
          days != null ? U.h('div', {}, 'Days funded', U.h('b', {}, String(days))) : null,
          U.h('div', {}, 'Payouts received', U.h('b', { class: received > 0 ? 'pos' : '' }, U.fmtMoney(received))),
        ),
      ),
      ps.length
        ? U.h('div', { class: 'fund-body table-scroll' }, U.h('table', { class: 'table' },
            U.h('thead', {}, U.h('tr', {},
              U.h('th', {}, 'Payout Date'),
              U.h('th', { class: 'num' }, 'Amount'),
              U.h('th', {}, 'Status'),
              U.h('th', {}, 'Confirmed'),
              U.h('th', { class: 'num' }, 'Net'),
            )),
            U.h('tbody', {}, ps.map(p => U.h('tr', {},
              U.h('td', {}, U.fmtDate(p.payout_date)),
              U.h('td', { class: 'num' }, U.fmtMoney(p.amount)),
              U.h('td', {}, U.badge(p.status)),
              U.h('td', {}, U.fmtDate(p.confirmation_date)),
              U.h('td', { class: 'num' },
                C.isConfirmedPayout(p)
                  ? U.h('span', { class: 'pos strong' }, U.fmtMoney(C.payoutNet(p)))
                  : U.h('span', { class: 'dim' }, U.fmtMoney(C.payoutNet(p)))),
            )))))
        : U.h('div', { class: 'fund-none' }, 'No payouts logged for this account yet.'),
    );
  });

  root.replaceChildren(U.h('div', {},
    U.pageHeader('Funding History', 'Every funded account and its payout trail.'),
    summary,
    cards.length ? cards : U.emptyState('No funded accounts yet — set an account’s status to “Funded” (or give it a funding date) and it will show up here.'),
  ));
}
