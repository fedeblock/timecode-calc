/* Interfaz de la cinta, idioma y ayuda. Depende de globalThis.I18n, Timecode y Tape. */
(function () {
  'use strict';

  const TC = globalThis.Timecode;
  const T = globalThis.Tape;
  const I18n = globalThis.I18n;
  const STORAGE_KEY = 'tc-calc.tape';
  const LANG_KEY = 'tc-calc.lang';
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
  let lang = loadLang();
  const langListeners = [];
  const t = (key, params) => I18n.t(lang, key, params);

  function loadLang() {
    let stored = null;
    try { stored = localStorage.getItem(LANG_KEY); } catch (e) { /* sin almacenamiento */ }
    return I18n.LANGS.includes(stored) ? stored : I18n.detectLang(navigator.languages || [navigator.language]);
  }

  function setLang(next) {
    lang = next;
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* sin almacenamiento */ }
    applyStatic();
    render();
    renderHelp();
    for (const fn of langListeners) fn();
  }

  /** Textos fijos del HTML marcados con data-i18n*. */
  function applyStatic() {
    document.documentElement.lang = lang;
    document.title = t('appTitle');
    for (const n of document.querySelectorAll('[data-i18n]')) n.textContent = t(n.dataset.i18n);
    for (const n of document.querySelectorAll('[data-i18n-placeholder]')) n.placeholder = t(n.dataset.i18nPlaceholder);
    for (const n of document.querySelectorAll('[data-i18n-aria-label]')) n.setAttribute('aria-label', t(n.dataset.i18nAriaLabel));
    for (const n of document.querySelectorAll('[data-i18n-title]')) n.title = t(n.dataset.i18nTitle);
    const sel = $('#lang');
    sel.innerHTML = '';
    for (const l of I18n.LANGS) sel.append(el('option', { value: l, textContent: t('lang.' + l) }));
    sel.value = lang;
  }

  /** Texto con `código` → nodos (sin HTML). */
  function richText(text) {
    return text.split('`').map((part, i) => (i % 2 ? el('code', { textContent: part }) : document.createTextNode(part)));
  }

  function renderHelp() {
    const body = $('#help-body');
    body.innerHTML = '';
    for (const sec of I18n.lookup(lang, 'help.sections')) {
      body.append(el('section', {}, [
        el('h3', { textContent: sec.title }),
        el('ul', {}, sec.items.map((item) => el('li', {}, richText(item)))),
      ]));
    }
  }

  function openHelp() {
    const d = $('#help');
    if (!d.open) d.showModal();
  }

  function load() {
    try { return T.deserializeTape(localStorage.getItem(STORAGE_KEY)); } catch (e) { return T.createTape(); }
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, T.serializeTape(tape)); } catch (e) { /* sin almacenamiento */ }
  }
  /** focus: {id, role} del control a re-enfocar tras el re-render, o 'entry'. */
  function commit(next, focus) {
    tape = next;
    save();
    render();
    restoreFocus(focus);
  }

  function restoreFocus(focus) {
    if (!focus) return;
    if (focus === 'entry') { $('#entry').focus(); return; }
    const target = document.querySelector('[data-id="' + CSS.escape(focus.id) + '"][data-role="' + focus.role + '"]');
    if (target && !target.disabled) target.focus();
    else if (target) document.querySelector('[data-id="' + CSS.escape(focus.id) + '"][data-role="value"]').focus();
    else $('#entry').focus();
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
    if (includeTape) select.append(el('option', { value: 'tape', textContent: t('tape.inheritFps', { fps: TC.FPS[tape.fps].label }) }));
    for (const id of TC.FPS_IDS) select.append(el('option', { value: id, textContent: TC.FPS[id].label }));
    select.value = selected;
  }

  function startEdit(row, line, valueEl) {
    const input = el('input', { className: 'value-edit', value: line.value, spellcheck: false });
    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      const next = ok ? T.applyEdit(tape, line.id, input.value) : tape;
      const focus = { id: line.id, role: 'value' };
      if (next !== tape) commit(next, focus);
      else { render(); restoreFocus(focus); }
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
    input.addEventListener('keydown', (e) => e.stopPropagation());
    valueEl.replaceWith(input);
    input.focus();
    input.select();
  }

  function renderRows(result) {
    const list = $('#rows');
    list.innerHTML = '';
    if (!tape.lines.length) {
      list.append(el('li', { className: 'empty', textContent: t('tape.empty') }));
      return;
    }
    tape.lines.forEach((line, i) => {
      const r = result.rows[i];
      const li = el('li', { className: 'row' + (r.error ? ' has-error' : '') });
      const value = el('span', { className: 'value tc', textContent: r.display, tabIndex: 0, title: t('tape.editHint') });
      value.dataset.id = line.id;
      value.dataset.role = 'value';
      value.addEventListener('dblclick', () => startEdit(li, line, value));
      value.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === 'F2') { e.preventDefault(); startEdit(li, line, value); }
      });

      const meta = el('div', { className: 'meta' });
      if (line.op === '+' || line.op === '-') {
        const sel = el('select', { title: t('tape.lineFps') });
        fpsOptions(sel, line.fps, true);
        sel.dataset.id = line.id;
        sel.dataset.role = 'fps';
        sel.addEventListener('change', () => commit(T.updateLine(tape, line.id, { fps: sel.value }), { id: line.id, role: 'fps' }));
        meta.append(sel);
      }
      if (r.conversion) meta.append(el('span', { className: 'conv tc', textContent: r.conversion }));
      if (r.error) meta.append(el('span', { className: 'err', textContent: t('errors.' + r.error) }));

      const btn = (txt, title, fn, disabled, role) => {
        const b = el('button', { type: 'button', textContent: txt, title, disabled: !!disabled });
        b.dataset.id = line.id;
        b.dataset.role = role;
        b.addEventListener('click', fn);
        return b;
      };
      const actions = el('div', { className: 'actions' }, [
        btn('↑', t('tape.up'), () => commit(T.moveLine(tape, line.id, -1), { id: line.id, role: 'up' }), i === 0, 'up'),
        btn('↓', t('tape.down'), () => commit(T.moveLine(tape, line.id, 1), { id: line.id, role: 'down' }), i === tape.lines.length - 1, 'down'),
        btn('✕', t('tape.remove'), () => {
          const next = tape.lines[i + 1] || tape.lines[i - 1];
          commit(T.removeLine(tape, line.id), next ? { id: next.id, role: 'remove' } : 'entry');
        }, false, 'remove'),
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
    $('#total-sub').textContent = result.totalFrames + ' ' + t('tape.frames') + ' · ' + result.totalSeconds + ' s';
    $('#entry-preview').textContent = previewText($('#entry').value);
  }

  /** Portapapeles nativo dentro de Tauri; API web en el navegador. */
  function copyText(text) {
    const tauriClip = globalThis.__TAURI__ && globalThis.__TAURI__.clipboardManager;
    if (tauriClip) return tauriClip.writeText(text);
    return navigator.clipboard.writeText(text);
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
        commit(T.addLine(tape, p), 'entry');
        const rows = $('#rows');
        rows.scrollTop = rows.scrollHeight;
      } else if (e.key === 'Escape') {
        entry.value = '';
        $('#entry-preview').textContent = '';
      }
    });

    $('#tape-fps').addEventListener('change', (e) => { commit(T.setTapeFps(tape, e.target.value)); $('#tape-fps').focus(); });

    $('#copy').addEventListener('click', async () => {
      const text = T.computeTape(tape).totalTC;
      try { await copyText(text); toast(t('tape.copied')); } catch (e) { toast(t('tape.copyFailed')); }
    });
    $('#clear').addEventListener('click', () => commit({ ...tape, lines: [] }, 'entry'));

    $('#lang').addEventListener('change', (e) => { setLang(e.target.value); $('#lang').focus(); });
    $('#help-open').addEventListener('click', openHelp);
    $('#help-close').addEventListener('click', () => $('#help').close());
    $('#help').addEventListener('click', (e) => { if (e.target === e.currentTarget) e.currentTarget.close(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'F1') { e.preventDefault(); openHelp(); }
    });

    applyStatic();
    renderHelp();
    render();
    entry.focus();
  }

  globalThis.App = {
    getTape: () => tape,
    addLineFromTool: ({ op, value, fps }) => commit(T.addLine(tape, { op, value, fps })),
    t,
    onLangChange: (fn) => langListeners.push(fn),
  };

  init();
})();
