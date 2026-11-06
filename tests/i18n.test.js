'use strict';
const test = require('node:test');
const assert = require('node:assert');
const I18n = require('../web/src/i18n');

test('idiomas disponibles: español e inglés', () => {
  assert.deepStrictEqual(I18n.LANGS, ['es', 'en']);
});

test('detectLang: idioma del sistema, inglés si no está soportado', () => {
  assert.strictEqual(I18n.detectLang(['es-AR', 'en-US']), 'es');
  assert.strictEqual(I18n.detectLang(['en-GB']), 'en');
  assert.strictEqual(I18n.detectLang(['fr-FR', 'es-ES']), 'es');
  assert.strictEqual(I18n.detectLang(['de-DE']), 'en');
  assert.strictEqual(I18n.detectLang([]), 'en');
  assert.strictEqual(I18n.detectLang(undefined), 'en');
});

test('los dos idiomas tienen exactamente las mismas claves', () => {
  const keys = (o, p = '') => Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v) ? keys(v, p + k + '.') : [p + k]).sort();
  assert.deepStrictEqual(keys(I18n.DICTS.en), keys(I18n.DICTS.es));
});

test('t: traduce, interpola y marca claves inexistentes', () => {
  assert.strictEqual(I18n.t('es', 'tape.title'), 'Cinta');
  assert.strictEqual(I18n.t('en', 'tape.title'), 'Tape');
  assert.strictEqual(I18n.t('en', 'tape.inheritFps', { fps: '25' }), 'Tape (25)');
  assert.strictEqual(I18n.t('es', 'tape.inheritFps', { fps: '25' }), 'Cinta (25)');
  assert.strictEqual(I18n.t('en', 'no.such.key'), 'no.such.key');
});

test('cada código de error de la cinta tiene traducción', () => {
  for (const code of ['divByZero', 'badFactor', 'outOfRange']) {
    for (const lang of I18n.LANGS) assert.ok(I18n.t(lang, 'errors.' + code) !== 'errors.' + code);
  }
});

test('la ayuda tiene secciones con título y contenido en ambos idiomas', () => {
  for (const lang of I18n.LANGS) {
    const h = I18n.DICTS[lang].help;
    assert.ok(Array.isArray(h.sections) && h.sections.length >= 5);
    for (const s of h.sections) assert.ok(s.title && Array.isArray(s.items) && s.items.length);
  }
});

test('preferencias: título y etiqueta del idioma en ambos idiomas', () => {
  assert.strictEqual(I18n.t('es', 'settings.title'), 'Preferencias');
  assert.strictEqual(I18n.t('en', 'settings.title'), 'Settings');
  assert.strictEqual(I18n.t('es', 'lang.label'), 'Idioma');
  assert.strictEqual(I18n.t('en', 'lang.label'), 'Language');
});
