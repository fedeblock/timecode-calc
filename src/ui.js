/* Interfaz de la cinta. Depende de globalThis.Timecode y globalThis.Tape. */
(function () {
  'use strict';

  const TC = globalThis.Timecode;
  const T = globalThis.Tape;
  const STORAGE_KEY = 'tc-calc.tape';
  const OP_SYMBOL = { '+': '+', '-': '−', '*': '×', '/': '÷' };
  const OP_CLASS = { '+': 'plus', '-': 'minus', '*': 'mul', '/': 'mul' };
  const OP_CHARS = '+-−*×xX/÷';

  const $ = (sel) => document.querySelector(sel);
  const el = (tag, props = {}, children = []) => {
    const n = document.createElement(tag);
    Object.assign(n, props);
    for (const c of children) n.append(c);
    return n;
  };

  let tape = load();

  function load() {
    try { return T.deserializeTape(localStorage.getItem(STORAGE_KEY)); } catch (e) { return T.createTape(); }
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, T.serializeTape(tape)); } catch (e) { /* sin almacenamiento */ }
  }
  function commit(next) {
    tape = next;
    save();
    render();
  }

  /** Sanea lo tecleado: operador inicial opcional + dígitos (máx. 8) o factor decimal. */
  function sanitizeEntry(raw) {
    let s = raw.replace(/^\s+/, '');
    let op = '';
    if (s && OP_CHARS.includes(s[0])) { op = s[0]; s = s.slice(1); }
    const parsedOp = op ? T.parseEntry(op + '1').op : '+';
    if (parsedOp === '+' || parsedOp === '-') return op + s.replace(/\D/g, '').slice(0, 8);
    return op + s.replace(/[^0-9.,]/g, '');
  }

  function previewText(text) {
    const p = T.parseEntry(text);
    if (!p) return '';
    if (p.op === '+' || p.op === '-') return OP_SYMBOL[p.op] + ' ' + TC.formatDigits(p.value, tape.fps);
    return OP_SYMBOL[p.op] + ' ' + p.value;
  }

  function fpsOptions(select, selected, includeTape) {
    select.innerHTML = '';
    if (includeTape) select.append(el('option', { value: 'tape', textContent: 'Cinta (' + TC.FPS[tape.fps].label + ')' }));
    for (const id of TC.FPS_IDS) select.append(el('option', { value: id, textContent: TC.FPS[id].label }));
    select.value = selected;
  }

  function startEdit(row, line, valueEl) {
    const input = el('input', { className: 'value-edit', value: line.value, spellcheck: false });
    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      const p = ok ? T.parseEntry(line.op + sanitizeEntry(input.value)) : null;
      if (p) commit(T.updateLine(tape, line.id, { value: p.value }));
      else render();
    };
    input.addEventListener('input', () => {
      const clean = sanitizeEntry(line.op + input.value).slice(1);
      if (clean !== input.value) input.value = clean;
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') finish(true);
      else if (e.key === 'Escape') finish(false);
    });
    input.addEventListener('blur', () => finish(true));
    valueEl.replaceWith(input);
    input.focus();
    input.select();
  }

  function renderRows(result) {
    const list = $('#rows');
    list.innerHTML = '';
    if (!tape.lines.length) {
      list.append(el('li', { className: 'empty', textContent: 'La cinta está vacía. Escribe un timecode abajo y pulsa Enter.' }));
      return;
    }
    tape.lines.forEach((line, i) => {
      const r = result.rows[i];
      const li = el('li', { className: 'row' + (r.error ? ' has-error' : '') });
      const value = el('span', { className: 'value tc', textContent: r.display, title: 'Doble clic para editar' });
      value.addEventListener('dblclick', () => startEdit(li, line, value));

      const meta = el('div', { className: 'meta' });
      if (line.op === '+' || line.op === '-') {
        const sel = el('select', { title: 'fps de esta línea' });
        fpsOptions(sel, line.fps, true);
        sel.addEventListener('change', () => commit(T.updateLine(tape, line.id, { fps: sel.value })));
        meta.append(sel);
      }
      if (r.conversion) meta.append(el('span', { className: 'conv tc', textContent: r.conversion }));
      if (r.error) meta.append(el('span', { className: 'err', textContent: r.error }));

      const btn = (txt, title, fn, disabled) => {
        const b = el('button', { type: 'button', textContent: txt, title, disabled: !!disabled });
        b.addEventListener('click', fn);
        return b;
      };
      const actions = el('div', { className: 'actions' }, [
        btn('↑', 'Subir', () => commit(T.moveLine(tape, line.id, -1)), i === 0),
        btn('↓', 'Bajar', () => commit(T.moveLine(tape, line.id, 1)), i === tape.lines.length - 1),
        btn('✕', 'Borrar', () => commit(T.removeLine(tape, line.id))),
      ]);

      li.append(el('span', { className: 'op ' + OP_CLASS[line.op], textContent: OP_SYMBOL[line.op] }), value, meta, actions);
      list.append(li);
    });
  }

  function render() {
    fpsOptions($('#tape-fps'), tape.fps, false);
    const result = T.computeTape(tape);
    renderRows(result);
    $('#total-tc').textContent = result.totalTC;
    $('#total-sub').textContent = result.totalFrames + ' frames · ' + result.totalSeconds + ' s';
    $('#entry-preview').textContent = previewText($('#entry').value);
  }

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.remove('show'), 1400);
  }

  function init() {
    const entry = $('#entry');
    entry.addEventListener('input', () => {
      const clean = sanitizeEntry(entry.value);
      if (clean !== entry.value) entry.value = clean;
      $('#entry-preview').textContent = previewText(entry.value);
    });
    entry.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const p = T.parseEntry(entry.value);
        if (!p) return;
        entry.value = '';
        commit(T.addLine(tape, p));
        const rows = $('#rows');
        rows.scrollTop = rows.scrollHeight;
      } else if (e.key === 'Escape') {
        entry.value = '';
        $('#entry-preview').textContent = '';
      }
    });

    $('#tape-fps').addEventListener('change', (e) => commit(T.setTapeFps(tape, e.target.value)));

    $('#copy').addEventListener('click', async () => {
      const text = T.computeTape(tape).totalTC;
      try { await navigator.clipboard.writeText(text); toast('Copiado'); } catch (e) { toast('No se pudo copiar'); }
    });
    $('#clear').addEventListener('click', () => commit({ ...tape, lines: [] }));

    render();
    entry.focus();
  }

  globalThis.App = {
    getTape: () => tape,
    addLineFromTool: ({ op, value, fps }) => commit(T.addLine(tape, { op, value, fps })),
  };

  init();
})();
