import * as U from './ui.js';
import { themeCharts } from './charts.js';
import dashboard from './pages/dashboard.js';
import accounts from './pages/accounts.js';
import journal from './pages/journal.js';
import payouts from './pages/payouts.js';
import expenses from './pages/expenses.js';
import funding from './pages/funding.js';
import challenge from './pages/challenge.js';
import reports from './pages/reports.js';
import dataPage from './pages/data.js';

const ROUTES = [
  { hash: 'dashboard', label: 'Dashboard', icon: 'dashboard', section: 'Overview', page: dashboard },
  { hash: 'accounts', label: 'Accounts', icon: 'accounts', section: 'Tracking', page: accounts },
  { hash: 'journal', label: 'Trading Journal', icon: 'journal', section: 'Tracking', page: journal },
  { hash: 'payouts', label: 'Payout Tracker', icon: 'payouts', section: 'Tracking', page: payouts },
  { hash: 'expenses', label: 'Expense Tracker', icon: 'expenses', section: 'Tracking', page: expenses },
  { hash: 'funding', label: 'Funding History', icon: 'funding', section: 'Journey', page: funding },
  { hash: 'challenge', label: 'Trading Challenge', icon: 'challenge', section: 'Journey', page: challenge },
  { hash: 'reports', label: 'Reports', icon: 'reports', section: 'Insights', page: reports },
  { hash: 'data', label: 'Data & Backup', icon: 'data', section: 'Insights', page: dataPage },
];

const nav = document.getElementById('nav');
const pageEl = document.getElementById('page');
const sidebar = document.getElementById('sidebar');
document.getElementById('menuBtn').onclick = () => sidebar.classList.toggle('open');

function buildNav() {
  let section = null;
  for (const r of ROUTES) {
    if (r.section !== section) {
      section = r.section;
      nav.append(U.h('div', { class: 'nav-section' }, section));
    }
    nav.append(U.h('a', {
      class: 'nav-item',
      href: '#/' + r.hash,
      'data-hash': r.hash,
      onclick: () => sidebar.classList.remove('open'),
    }, U.icon(r.icon, 17), r.label));
  }
}

let renderToken = 0;

async function route() {
  const hash = (location.hash || '').replace(/^#\/?/, '') || 'dashboard';
  const r = ROUTES.find(x => x.hash === hash) || ROUTES[0];
  document.title = r.label + ' — Prop Journal';
  for (const el of nav.querySelectorAll('.nav-item')) {
    el.classList.toggle('active', el.dataset.hash === r.hash);
  }

  const token = ++renderToken;
  const loader = U.loadingEl();
  const target = U.h('div');
  pageEl.replaceChildren(loader, target);

  try {
    await r.page(target);
    if (token === renderToken) loader.remove();
  } catch (e) {
    console.error(e);
    if (token === renderToken) {
      pageEl.replaceChildren(U.h('div', { class: 'card', style: 'border-color:rgba(242,54,69,0.4)' },
        U.h('div', { class: 'card-title' }, 'Something went wrong'),
        U.h('p', { style: 'color:var(--muted);font-size:13px;margin-top:6px' }, e.message),
      ));
    }
  }
}

themeCharts();
buildNav();
window.addEventListener('hashchange', route);
route();
