// Trading Challenge — the $500 → $1,000,000 journey.
// Capital = start + confirmed net payouts − expenses; milestones complete automatically.
import { api } from '../api.js';
import * as U from '../ui.js';
import * as C from '../calc.js';
import * as CH from '../charts.js';

export default async function render(root) {
  const data = await api.all();
  const ch = C.challengeState(data.settings, data.payouts, data.expenses);

  const settingsBtn = U.h('button', { class: 'btn', onclick: openSettings }, U.icon('settings', 15), 'Settings');

  const pctLabel = (ch.overall * 100).toFixed(ch.overall < 0.1 ? 2 : 1) + '%';
  const toGo = ch.nextMilestone ? ch.nextMilestone.amount - ch.current : 0;

  const hero = U.h('div', { class: 'hero' },
    U.h('div', { class: 'hero-top' },
      U.h('div', {},
        U.h('div', { class: 'h-label' }, `Challenge · ${U.fmtCompact(ch.start)} → ${U.fmtCompact(ch.target)}`),
        U.h('div', { class: 'h-value' }, U.fmtMoney(ch.current)),
        U.h('div', { class: 'h-sub' },
          ch.current >= ch.target
            ? '🏆 Target reached — challenge complete!'
            : ch.nextMilestone
              ? `Next milestone ${U.fmtCompact(ch.nextMilestone.amount)} — ${U.fmtMoney(toGo)} to go`
              : 'Set a target in settings'),
      ),
      settingsBtn,
    ),
    U.h('div', { class: 'progress', title: pctLabel },
      U.h('div', { class: 'progress-fill' + (ch.overall >= 1 ? ' done' : ''), style: `width:${Math.max(0.5, ch.overall * 100)}%` })),
    U.h('div', { class: 'h-sub', style: 'margin:8px 0 0;display:flex;justify-content:space-between' },
      U.h('span', {}, `Started at ${U.fmtCompact(ch.start)}`),
      U.h('span', {}, `${pctLabel} of the way to ${U.fmtCompact(ch.target)}`)),
  );

  // Growth chart
  const growth = CH.chartCard('Capital Growth', 'Start capital + confirmed net payouts − expenses', 240);

  // Milestones
  const current = ch.milestones.find(m => !m.done);
  const msRows = ch.milestones.map(m => {
    const state = m.done ? 'done' : m === current ? 'current' : 'locked';
    return U.h('div', { class: 'ms-row' + (state === 'current' ? ' current' : '') },
      U.h('div', { class: 'ms-ico ' + state },
        state === 'done' ? U.icon('check', 15) : state === 'current' ? U.icon('flag', 14) : U.icon('lock', 13)),
      U.h('div', { class: 'ms-amount' + (state === 'locked' ? ' locked' : '') }, U.fmtCompact(m.amount)),
      U.h('div', { class: 'progress' },
        U.h('div', { class: 'progress-fill' + (m.done ? ' done' : ''), style: `width:${Math.max(m.pct > 0 ? 1 : 0, m.pct * 100)}%` })),
      U.h('div', { class: 'ms-status' + (m.done ? ' done' : '') },
        m.done
          ? (m.date ? `Reached · ${U.fmtDate(m.date)}` : 'Reached ✓')
          : state === 'current'
            ? `${(m.pct * 100).toFixed(0)}% · ${U.fmtMoney(m.amount - ch.current)} to go`
            : '—'),
    );
  });

  const msCard = U.h('div', { class: 'card', style: 'padding:6px 0' },
    U.h('div', { class: 'card-title', style: 'padding:12px 16px 6px' }, 'Milestones'),
    msRows,
  );

  root.replaceChildren(U.h('div', {},
    U.pageHeader('Trading Challenge', 'From a small stake to a seven-figure account — tracked automatically.'),
    hero,
    U.h('div', { class: 'stack' }, growth.el, msCard),
  ));

  if (ch.timeline.length) {
    const labels = ['Start', ...ch.timeline.map(t => U.fmtDate(t.date))];
    const values = [ch.start, ...ch.timeline.map(t => t.value)];
    CH.makeChart(growth.canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Capital',
          data: values,
          borderColor: CH.PALETTE.green,
          backgroundColor: 'rgba(10,169,129,0.10)',
          fill: true,
          stepped: false,
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
    CH.chartEmpty(growth.canvas, 'Confirmed payouts and expenses will draw this curve');
  }

  function openSettings() {
    const { el, getValues } = U.buildForm([
      { key: 'challenge_start_capital', label: 'Start Capital ($)', type: 'number', required: true },
      { key: 'challenge_target', label: 'Target ($)', type: 'number', required: true },
    ], {
      challenge_start_capital: ch.start,
      challenge_target: ch.target,
    });
    const save = U.h('button', { class: 'btn btn-primary' }, 'Save');
    save.onclick = async () => {
      const vals = getValues();
      if (!vals) return U.toast('Please fill in both fields', 'err');
      save.disabled = true;
      try {
        await api.saveSettings(vals);
        m.close();
        U.toast('Challenge settings saved');
        render(root);
      } catch (e) {
        U.toast(e.message, 'err');
        save.disabled = false;
      }
    };
    const m = U.openModal({
      title: 'Challenge Settings',
      body: el,
      footer: [U.h('button', { class: 'btn', onclick: () => m.close() }, 'Cancel'), save],
    });
  }
}
