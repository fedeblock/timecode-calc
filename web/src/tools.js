/* Panel de herramientas: duración IN/OUT, convertir fps, TC ↔ frames ↔ segundos. */
(function () {
  'use strict';

  const TC = globalThis.Timecode;
  const App = globalThis.App;
  const root = document.querySelector('#tools');

  const el = (tag, props = {}, children = []) => {
    const n = document.createElement(tag);
    Object.assign(n, props);
    for (const c of children) n.append(c);
    return n;
  };

  const digitsOnly = (s) => String(s).replace(/\D/g, '').slice(0, 8);

  function fpsSelect(value) {
    const s = el('select');
    for (const id of TC.FPS_IDS) s.append(el('option', { value: id, textContent: TC.FPS[id].label }));
    s.value = value;
    return s;
  }

  function field(label, control, live) {
    const f = el('label', { className: 'field' }, [el('span', { textContent: label }), control]);
    if (live) f.append(live);
    return f;
  }

  /** Campo de TC: solo dígitos (máx. 8) y vista en vivo con separadores. */
  function tcField(label, getFps, onChange) {
    const input = el('input', { inputMode: 'numeric', autocomplete: 'off', spellcheck: false, placeholder: '00:00:00:00' });
    const live = el('div', { className: 'live tc' });
    const update = () => { live.textContent = input.value ? TC.formatDigits(input.value, getFps()) : ''; };
    input.addEventListener('input', () => {
      const clean = digitsOnly(input.value);
      if (clean !== input.value) input.value = clean;
      update();
      onChange();
    });
    return { input, live, update, node: field(label, input, live) };
  }

  function section(title, children) {
    return el('section', { className: 'panel tool' }, [el('h2', { textContent: title }), ...children]);
  }

  const defaultFps = App.getTape().fps;

  // 1. Duración IN/OUT
  (function durationTool() {
    const fps = fpsSelect(defaultFps);
    const out = el('div', { className: 'result' });
    let lastDur = null;
    const recalc = () => {
      inF.update(); outF.update();
      out.innerHTML = '';
      if (!inF.input.value || !outF.input.value) { lastDur = null; return; }
      const f = fps.value;
      lastDur = TC.parseTC(outF.input.value, f) - TC.parseTC(inF.input.value, f);
      const digits = TC.framesToDigits(lastDur, f);
      const add = el('button', {
        type: 'button', textContent: 'Añadir a la cinta', disabled: digits === null,
        title: digits === null ? 'Una línea de la cinta admite hasta 99 h' : '',
      });
      add.addEventListener('click', () => {
        App.addLineFromTool({ op: lastDur < 0 ? '-' : '+', value: digits, fps: f });
      });
      out.append(
        el('div', { className: 'tc-big', textContent: TC.formatTC(lastDur, f) }),
        el('div', { className: 'sub', textContent: lastDur + ' frames · ' + TC.formatSeconds(TC.framesToSeconds(lastDur, f)) + ' s' }),
        add,
      );
    };
    const inF = tcField('IN', () => fps.value, recalc);
    const outF = tcField('OUT', () => fps.value, recalc);
    fps.addEventListener('change', recalc);
    root.append(section('Duración IN/OUT', [field('fps', fps), inF.node, outF.node, out]));
  })();

  // 2. Convertir fps
  (function convertTool() {
    const from = fpsSelect(defaultFps);
    const to = fpsSelect(defaultFps === '29.97DF' ? '25' : '29.97DF');
    const out = el('div', { className: 'result' });
    const recalc = () => {
      tc.update();
      out.innerHTML = '';
      if (!tc.input.value) return;
      const frames = TC.convertFrames(TC.parseTC(tc.input.value, from.value), from.value, to.value);
      out.append(
        el('div', { className: 'tc-big', textContent: TC.formatTC(frames, to.value) }),
        el('div', { className: 'sub', textContent: frames + ' frames a ' + TC.FPS[to.value].label }),
      );
    };
    const tc = tcField('TC', () => from.value, recalc);
    from.addEventListener('change', recalc);
    to.addEventListener('change', recalc);
    root.append(section('Convertir fps', [field('De', from), field('A', to), tc.node, out]));
  })();

  // 3. TC ↔ frames ↔ segundos
  (function unitsTool() {
    const fps = fpsSelect(defaultFps);
    const framesIn = el('input', { inputMode: 'numeric', autocomplete: 'off', placeholder: '0' });
    const secondsIn = el('input', { inputMode: 'decimal', autocomplete: 'off', placeholder: '0.000' });
    let source = 'tc';

    const fill = (frames, except) => {
      if (except !== 'tc') {
        const digits = TC.framesToDigits(frames, fps.value);
        tc.input.value = digits === null ? '' : digits;
        if (digits === null) { tc.live.textContent = TC.formatTC(frames, fps.value); }
        else tc.update();
      } else tc.update();
      if (except !== 'frames') framesIn.value = String(frames);
      if (except !== 'seconds') secondsIn.value = TC.formatSeconds(TC.framesToSeconds(frames, fps.value));
    };
    const recalc = () => {
      const f = fps.value;
      if (source === 'tc') {
        if (!tc.input.value) { framesIn.value = ''; secondsIn.value = ''; tc.update(); return; }
        fill(TC.parseTC(tc.input.value, f), 'tc');
      } else if (source === 'frames') {
        const n = parseInt(framesIn.value, 10);
        if (Number.isNaN(n)) { tc.input.value = ''; secondsIn.value = ''; tc.update(); return; }
        fill(n, 'frames');
      } else {
        const s = Number(secondsIn.value.replace(',', '.'));
        if (secondsIn.value === '' || !Number.isFinite(s)) { tc.input.value = ''; framesIn.value = ''; tc.update(); return; }
        fill(TC.secondsToFrames(s, f), 'seconds');
      }
    };
    const tc = tcField('TC', () => fps.value, () => { source = 'tc'; recalc(); });
    framesIn.addEventListener('input', () => {
      const clean = framesIn.value.replace(/\D/g, '');
      if (clean !== framesIn.value) framesIn.value = clean;
      source = 'frames';
      recalc();
    });
    secondsIn.addEventListener('input', () => {
      const clean = secondsIn.value.replace(/[^0-9.,]/g, '');
      if (clean !== secondsIn.value) secondsIn.value = clean;
      source = 'seconds';
      recalc();
    });
    fps.addEventListener('change', recalc);
    root.append(section('TC ↔ frames ↔ segundos', [
      field('fps', fps), tc.node, field('Frames', framesIn), field('Segundos', secondsIn),
    ]));
  })();
})();
