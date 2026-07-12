// Chart.js theming + helpers. Palette validated for the dark surface (#141a24):
// CVD separation, lightness band and contrast all pass.
import { h } from './ui.js';

export const PALETTE = {
  blue: '#4f8cff',
  green: '#0aa981',
  red: '#f23645',
  amber: '#c98200',
  purple: '#9b78e5',
};

export const STATUS_COLORS = {
  Evaluation: PALETTE.blue,
  Funded: PALETTE.green,
  Passed: PALETTE.purple,
  Failed: PALETTE.red,
};

export function themeCharts() {
  const C = window.Chart;
  if (!C) return;
  C.defaults.color = '#9aa4bb';
  C.defaults.borderColor = 'rgba(148,163,190,0.08)';
  C.defaults.font.family = "'Inter','Segoe UI',system-ui,sans-serif";
  C.defaults.font.size = 11;
  C.defaults.maintainAspectRatio = false;
  C.defaults.plugins.legend.labels.usePointStyle = true;
  C.defaults.plugins.legend.labels.pointStyle = 'circle';
  C.defaults.plugins.legend.labels.boxWidth = 6;
  C.defaults.plugins.legend.labels.boxHeight = 6;
  C.defaults.plugins.legend.labels.padding = 16;
  Object.assign(C.defaults.plugins.tooltip, {
    backgroundColor: '#1c2434',
    borderColor: 'rgba(148,163,190,0.18)',
    borderWidth: 1,
    titleColor: '#dce3f0',
    bodyColor: '#9aa4bb',
    padding: 10,
    cornerRadius: 8,
    boxPadding: 4,
  });
  C.defaults.elements.bar.borderRadius = 4;
  C.defaults.elements.bar.borderSkipped = 'start';
  C.defaults.elements.line.borderWidth = 2;
  C.defaults.elements.line.tension = 0.3;
  C.defaults.elements.point.radius = 0;
  C.defaults.elements.point.hoverRadius = 4;
  C.defaults.interaction = { mode: 'index', intersect: false };
}

export const moneyTick = v => {
  const a = Math.abs(v);
  const s = v < 0 ? '-$' : '$';
  if (a >= 1e6) return s + +(a / 1e6).toFixed(1) + 'M';
  if (a >= 1e3) return s + +(a / 1e3).toFixed(1) + 'K';
  return s + Math.round(a);
};

export const moneyTip = v =>
  (v < 0 ? '-$' : '$') + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function moneyScale() {
  return {
    ticks: { callback: moneyTick, maxTicksLimit: 6 },
    grid: { color: 'rgba(148,163,190,0.07)' },
    border: { display: false },
  };
}

export function xScale() {
  return {
    grid: { display: false },
    border: { display: false },
  };
}

export function chartCard(title, subtitle, height = 260) {
  const canvas = document.createElement('canvas');
  const el = h('div', { class: 'card chart-card' },
    h('div', { class: 'chart-head' },
      h('div', {},
        h('div', { class: 'card-title' }, title),
        subtitle ? h('div', { class: 'card-sub' }, subtitle) : null,
      ),
    ),
    h('div', { class: 'chart-box', style: `height:${height}px` }, canvas),
  );
  return { el, canvas };
}

export function makeChart(canvas, config) {
  const prev = window.Chart.getChart(canvas);
  if (prev) prev.destroy();
  return new window.Chart(canvas, config);
}

export function chartEmpty(canvas, msg = 'No data yet') {
  canvas.parentElement.replaceChildren(h('div', { class: 'chart-none' }, msg));
}
