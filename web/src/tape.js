/*
 * Modelo de la cinta. Puro (sin DOM ni localStorage).
 * Navegador: globalThis.Tape (requiere globalThis.Timecode). Node: module.exports.
 */
(function () {
  'use strict';

  const TC = typeof module !== 'undefined' && module.exports ? require('./timecode') : globalThis.Timecode;

  const DEFAULT_FPS = '25';
  const OPS = ['+', '-', '*', '/'];
  const OP_ALIASES = { '+': '+', '-': '-', '−': '-', '*': '*', '×': '*', x: '*', X: '*', '/': '/', '÷': '/' };
  const VERSION = 1;

  let counter = 0;
  function newId() {
    counter += 1;
    return Date.now().toString(36) + '-' + counter.toString(36);
  }

  function createTape(fps = DEFAULT_FPS) {
    return { fps, lines: [] };
  }

  /** Texto de la entrada → {op, value} o null si no queda valor. */
  function parseEntry(text) {
    let s = String(text == null ? '' : text).trim();
    let op = '+';
    if (s && OP_ALIASES[s[0]]) {
      op = OP_ALIASES[s[0]];
      s = s.slice(1);
    }
    let value;
    if (op === '+' || op === '-') {
      value = s.replace(/\D/g, '').slice(0, 8);
    } else {
      value = s.replace(/,/g, '.').replace(/[^0-9.]/g, '');
    }
    return value ? { op, value } : null;
  }

  function addLine(tape, { op, value, fps = 'tape' }) {
    return { ...tape, lines: [...tape.lines, { id: newId(), op, value, fps }] };
  }

  function updateLine(tape, id, patch) {
    return { ...tape, lines: tape.lines.map((l) => (l.id === id ? { ...l, ...patch, id } : l)) };
  }

  /** Edición en línea: interpreta el texto con el operador de la línea. Sin valor → cinta igual. */
  function applyEdit(tape, id, raw) {
    const line = tape.lines.find((l) => l.id === id);
    if (!line) return tape;
    const p = parseEntry(line.op + String(raw == null ? '' : raw));
    return p ? updateLine(tape, id, { value: p.value }) : tape;
  }

  function removeLine(tape, id) {
    return { ...tape, lines: tape.lines.filter((l) => l.id !== id) };
  }

  function moveLine(tape, id, delta) {
    const i = tape.lines.findIndex((l) => l.id === id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= tape.lines.length) return tape;
    const lines = [...tape.lines];
    [lines[i], lines[j]] = [lines[j], lines[i]];
    return { ...tape, lines };
  }

  function setTapeFps(tape, fps) {
    return { ...tape, fps };
  }

  function computeTape(tape) {
    let running = 0;
    const rows = tape.lines.map((line) => {
      const row = { id: line.id, op: line.op, lineFps: null, frames: null, display: '', conversion: null, runningFrames: 0, error: null };
      if (line.op === '+' || line.op === '-') {
        const lineFps = line.fps === 'tape' ? tape.fps : line.fps;
        const own = TC.parseTC(line.value, lineFps);
        let frames = own;
        row.lineFps = lineFps;
        row.display = TC.formatTC(own, lineFps);
        if (lineFps !== tape.fps) {
          frames = TC.convertFrames(own, lineFps, tape.fps);
          row.conversion = TC.FPS[lineFps].label + '→' + TC.FPS[tape.fps].label + '  ' + TC.formatTC(frames, tape.fps);
        }
        row.frames = frames;
        running += line.op === '+' ? frames : -frames;
      } else {
        const factor = line.value === '' ? NaN : Number(line.value);
        row.display = (line.op === '*' ? '× ' : '÷ ') + line.value;
        if (!Number.isFinite(factor)) row.error = 'badFactor';
        else if (line.op === '/' && factor === 0) row.error = 'divByZero';
        else {
          const next = TC.signedRound(line.op === '*' ? running * factor : running / factor);
          if (!Number.isFinite(next) || Math.abs(next) > Number.MAX_SAFE_INTEGER) row.error = 'outOfRange';
          else running = next;
        }
        if (running === 0) running = 0; // evita -0
      }
      row.runningFrames = running;
      return row;
    });
    return {
      rows,
      totalFrames: running,
      totalTC: TC.formatTC(running, tape.fps),
      totalSeconds: TC.formatSeconds(TC.framesToSeconds(running, tape.fps)),
    };
  }

  function serializeTape(tape) {
    return JSON.stringify({ v: VERSION, fps: tape.fps, lines: tape.lines });
  }

  function validLine(l) {
    return l && typeof l.id === 'string' && OPS.includes(l.op) && typeof l.value === 'string' &&
      (l.fps === 'tape' || Object.prototype.hasOwnProperty.call(TC.FPS, l.fps));
  }

  function deserializeTape(text) {
    try {
      const o = JSON.parse(text);
      if (!o || o.v !== VERSION || !Object.prototype.hasOwnProperty.call(TC.FPS, o.fps) || !Array.isArray(o.lines)) {
        return createTape();
      }
      return {
        fps: o.fps,
        lines: o.lines.filter(validLine).map((l) => ({ id: l.id, op: l.op, value: l.value, fps: l.fps })),
      };
    } catch (e) {
      return createTape();
    }
  }

  const api = {
    DEFAULT_FPS, createTape, parseEntry, addLine, updateLine, applyEdit, removeLine, moveLine, setTapeFps,
    computeTape, serializeTape, deserializeTape,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else globalThis.Tape = api;
})();
