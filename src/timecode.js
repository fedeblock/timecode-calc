/*
 * Núcleo de timecode SMPTE. Sin DOM: reutilizable en navegador (globalThis.Timecode)
 * y en Node (module.exports).
 */
(function () {
  'use strict';

  const FPS_IDS = ['23.976', '24', '25', '29.97', '29.97DF', '30', '48', '50', '59.94', '59.94DF', '60'];

  function def(id, num, den, nominal, dropCount, label) {
    return { id, num, den, nominal, dropFrame: dropCount > 0, dropCount, label };
  }

  const FPS = {
    '23.976': def('23.976', 24000, 1001, 24, 0, '23.976'),
    '24': def('24', 24, 1, 24, 0, '24'),
    '25': def('25', 25, 1, 25, 0, '25'),
    '29.97': def('29.97', 30000, 1001, 30, 0, '29.97 NDF'),
    '29.97DF': def('29.97DF', 30000, 1001, 30, 2, '29.97 DF'),
    '30': def('30', 30, 1, 30, 0, '30'),
    '48': def('48', 48, 1, 48, 0, '48'),
    '50': def('50', 50, 1, 50, 0, '50'),
    '59.94': def('59.94', 60000, 1001, 60, 0, '59.94 NDF'),
    '59.94DF': def('59.94DF', 60000, 1001, 60, 4, '59.94 DF'),
    '60': def('60', 60, 1, 60, 0, '60'),
  };

  const MINUS = '−';

  function getFps(fpsId) {
    const f = FPS[fpsId];
    if (!f) throw new Error('fps desconocido: ' + fpsId);
    return f;
  }

  /** Redondeo al entero más cercano, mitad lejos de cero. */
  function signedRound(x) {
    return x < 0 ? -Math.round(-x) : Math.round(x);
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  /** Dígitos (≤ 8) rellenados desde la derecha → campos HH MM SS FF. */
  function digitsToFields(digits) {
    const d = String(digits || '').replace(/\D/g, '').slice(0, 8).padStart(8, '0');
    return {
      h: Number(d.slice(0, 2)),
      m: Number(d.slice(2, 4)),
      s: Number(d.slice(4, 6)),
      f: Number(d.slice(6, 8)),
    };
  }

  /** Campos → frames. Normaliza con acarreo; en DF sube un TC inexistente al siguiente válido. */
  function fieldsToFrames(fields, fpsId) {
    const fps = getFps(fpsId);
    const nom = fps.nominal;
    // Normalizar con base nominal (acarreo de f→s→m→h).
    let total = ((fields.h * 60 + fields.m) * 60 + fields.s) * nom + fields.f;
    if (!fps.dropFrame) return total;

    let f = total % nom;
    let secs = Math.floor(total / nom);
    const s = secs % 60;
    const totalMin = Math.floor(secs / 60);
    const d = fps.dropCount;
    if (f < d && s === 0 && totalMin % 10 !== 0) f = d;
    return (totalMin * 60 + s) * nom + f - d * (totalMin - Math.floor(totalMin / 10));
  }

  function parseTC(digits, fpsId) {
    return fieldsToFrames(digitsToFields(digits), fpsId);
  }

  function framesToFields(frames, fpsId) {
    const fps = getFps(fpsId);
    const nom = fps.nominal;
    const negative = frames < 0;
    let n = Math.abs(frames);
    if (fps.dropFrame) {
      const d = fps.dropCount;
      const fpm = nom * 60 - d;
      const fp10m = nom * 600 - 9 * d;
      const tenMin = Math.floor(n / fp10m);
      const rem = n % fp10m;
      n += 9 * d * tenMin + (rem > d ? d * Math.floor((rem - d) / fpm) : 0);
    }
    const f = n % nom;
    const totalSecs = Math.floor(n / nom);
    return {
      negative,
      h: Math.floor(totalSecs / 3600),
      m: Math.floor(totalSecs / 60) % 60,
      s: totalSecs % 60,
      f,
    };
  }

  function joinFields(h, m, s, f, dropFrame) {
    return pad2(h) + ':' + pad2(m) + ':' + pad2(s) + (dropFrame ? ';' : ':') + pad2(f);
  }

  function formatTC(frames, fpsId) {
    const fps = getFps(fpsId);
    const x = framesToFields(frames, fpsId);
    return (x.negative && frames !== 0 ? MINUS : '') + joinFields(x.h, x.m, x.s, x.f, fps.dropFrame);
  }

  /** Vista en vivo mientras se teclea: sin normalizar. */
  function formatDigits(digits, fpsId) {
    const fps = getFps(fpsId);
    const x = digitsToFields(digits);
    return joinFields(x.h, x.m, x.s, x.f, fps.dropFrame);
  }

  /** Conversión conservando duración real, redondeo al frame más cercano. */
  function convertFrames(frames, fromId, toId) {
    if (fromId === toId) return frames;
    const a = getFps(fromId), b = getFps(toId);
    return signedRound((frames * b.num * a.den) / (b.den * a.num));
  }

  function framesToSeconds(frames, fpsId) {
    const fps = getFps(fpsId);
    return (frames * fps.den) / fps.num;
  }

  function secondsToFrames(seconds, fpsId) {
    const fps = getFps(fpsId);
    return signedRound((seconds * fps.num) / fps.den);
  }

  function formatSeconds(seconds) {
    return Number(seconds).toFixed(3);
  }

  const api = {
    FPS_IDS, FPS, signedRound,
    digitsToFields, fieldsToFrames, parseTC,
    framesToFields, formatTC, formatDigits,
    convertFrames, framesToSeconds, secondsToFrames, formatSeconds,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else globalThis.Timecode = api;
})();
