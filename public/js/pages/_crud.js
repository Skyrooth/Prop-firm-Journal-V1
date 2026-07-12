// Generic CRUD page: header + summary cards + filter bar + table + add/edit modal.
import { api } from '../api.js';
import * as U from '../ui.js';
import { fmtMonth } from '../calc.js';

export function crudPage(cfg) {
  return async function render(root) {
    let rows = await api.list(cfg.entity);
    const extra = cfg.loadExtra ? await cfg.loadExtra() : null;
    const state = { search: '', month: 'all', selects: {} };

    const addBtn = U.h('button', { class: 'btn btn-primary', onclick: () => openForm(null) },
      U.icon('plus', 15), 'Add ' + cfg.singular);
    const headerEl = U.pageHeader(cfg.title, cfg.subtitle, [addBtn]);
    const summaryEl = U.h('div', { class: 'stat-grid' });
    const tableWrap = U.h('div');

    let monthSel = null;
    const filtersEl = buildFilters();

    const container = U.h('div', {}, headerEl, cfg.summary ? summaryEl : null, filtersEl, tableWrap);
    root.replaceChildren(container);
    draw();

    function columns() {
      return typeof cfg.columns === 'function' ? cfg.columns(extra) : cfg.columns;
    }

    function fields() {
      return typeof cfg.fields === 'function' ? cfg.fields(extra) : cfg.fields;
    }

    function filtered() {
      let out = rows;
      const f = cfg.filters || {};
      if (f.month && state.month !== 'all') out = out.filter(r => (r[f.month] || '').startsWith(state.month));
      for (const s of f.selects || []) {
        const v = state.selects[s.key];
        if (v && v !== 'all') out = out.filter(r => (r[s.key] || '') === v);
      }
      if (state.search && f.search) {
        const q = state.search.toLowerCase();
        out = out.filter(r => f.search.some(k => String(r[k] ?? '').toLowerCase().includes(q)));
      }
      return out;
    }

    function buildFilters() {
      const f = cfg.filters;
      if (!f) return null;
      const bar = U.h('div', { class: 'filter-bar' });
      if (f.search) {
        const inp = U.h('input', { class: 'input search', placeholder: f.searchPlaceholder || 'Search…' });
        inp.oninput = () => { state.search = inp.value; drawTable(); };
        bar.append(inp);
      }
      if (f.month) {
        monthSel = U.h('select', { class: 'input slim' });
        monthSel.onchange = () => { state.month = monthSel.value; drawTable(); };
        bar.append(monthSel);
      }
      for (const s of f.selects || []) {
        const sel = U.h('select', { class: 'input slim' },
          U.h('option', { value: 'all' }, 'All ' + s.label),
          s.options.map(o => U.h('option', { value: o }, o)));
        sel.onchange = () => { state.selects[s.key] = sel.value; drawTable(); };
        bar.append(sel);
      }
      return bar;
    }

    function updateMonthOptions() {
      if (!monthSel) return;
      const keep = monthSel.value || 'all';
      const months = [...new Set(rows.map(r => (r[cfg.filters.month] || '').slice(0, 7)).filter(Boolean))]
        .sort().reverse();
      monthSel.replaceChildren(
        U.h('option', { value: 'all' }, 'All months'),
        ...months.map(m => U.h('option', { value: m }, fmtMonth(m))),
      );
      monthSel.value = [...monthSel.options].some(o => o.value === keep) ? keep : 'all';
      state.month = monthSel.value;
    }

    function drawTable() {
      tableWrap.replaceChildren(U.dataTable({
        columns: columns(),
        rows: filtered(),
        onEdit: openForm,
        onDelete: del,
        empty: cfg.emptyMsg,
      }));
    }

    function draw() {
      if (cfg.summary) summaryEl.replaceChildren(...cfg.summary(rows, extra));
      updateMonthOptions();
      drawTable();
    }

    async function reload() {
      rows = await api.list(cfg.entity);
      draw();
    }

    function openForm(row) {
      const { el, getValues } = U.buildForm(fields(), row || {});
      const save = U.h('button', { class: 'btn btn-primary' }, row ? 'Save changes' : 'Add ' + cfg.singular);
      save.onclick = async () => {
        const vals = getValues();
        if (!vals) return U.toast('Please fill in the required fields', 'err');
        save.disabled = true;
        try {
          if (row) await api.update(cfg.entity, row.id, vals);
          else await api.create(cfg.entity, vals);
          m.close();
          U.toast(cfg.singular[0].toUpperCase() + cfg.singular.slice(1) + (row ? ' updated' : ' added'));
          await reload();
        } catch (e) {
          U.toast(e.message, 'err');
          save.disabled = false;
        }
      };
      const m = U.openModal({
        title: (row ? 'Edit ' : 'New ') + cfg.singular,
        body: el,
        footer: [U.h('button', { class: 'btn', onclick: () => m.close() }, 'Cancel'), save],
        wide: true,
      });
    }

    async function del(row) {
      const msg = cfg.deleteMsg ? cfg.deleteMsg(row) : `Delete this ${cfg.singular}? This cannot be undone.`;
      if (!await U.confirmDlg(msg)) return;
      try {
        await api.remove(cfg.entity, row.id);
        U.toast(cfg.singular[0].toUpperCase() + cfg.singular.slice(1) + ' deleted');
        await reload();
      } catch (e) {
        U.toast(e.message, 'err');
      }
    }
  };
}
