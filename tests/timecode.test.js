'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fx = require('./fixtures.json');
const TC = require('../src/timecode');

test('FPS_IDS en el orden acordado', () => {
  assert.deepStrictEqual(TC.FPS_IDS,
    ['23.976', '24', '25', '29.97', '29.97DF', '30', '48', '50', '59.94', '59.94DF', '60']);
});

test('parseTC (fixtures)', () => {
  for (const c of fx.parseTC) {
    assert.strictEqual(TC.parseTC(c.digits, c.fps), c.frames, `${c.digits} @ ${c.fps}`);
  }
});

test('formatTC (fixtures)', () => {
  for (const c of fx.formatTC) {
    assert.strictEqual(TC.formatTC(c.frames, c.fps), c.tc, `${c.frames} @ ${c.fps}`);
  }
});

test('convertFrames (fixtures)', () => {
  for (const c of fx.convertFrames) {
    assert.strictEqual(TC.convertFrames(c.frames, c.from, c.to), c.out, `${c.frames} ${c.from}→${c.to}`);
  }
});

test('segundos (fixtures)', () => {
  for (const c of fx.seconds) {
    assert.ok(Math.abs(TC.framesToSeconds(c.frames, c.fps) - c.seconds) < 1e-9);
    assert.strictEqual(TC.formatSeconds(c.seconds), c.text);
    assert.strictEqual(TC.secondsToFrames(c.seconds, c.fps), c.frames);
  }
});

test('formatDigits: vista en vivo desde la derecha', () => {
  assert.strictEqual(TC.formatDigits('1000', '25'), '00:00:10:00');
  assert.strictEqual(TC.formatDigits('', '29.97DF'), '00:00:00;00');
  assert.strictEqual(TC.formatDigits('12345678', '25'), '12:34:56:78');
});

test('ida y vuelta formatTC → parseTC en todos los fps', () => {
  for (const fps of TC.FPS_IDS) {
    for (const n of [0, 1, 1799, 1800, 17982, 107891, 107892, 123456]) {
      const digits = TC.formatTC(n, fps).replace(/\D/g, '');
      assert.strictEqual(TC.parseTC(digits, fps), n, `${n} @ ${fps}`);
    }
  }
});

test('framesToDigits: dígitos tecleables o null si pasa de 99 h', () => {
  assert.strictEqual(TC.framesToDigits(1800, '29.97DF'), '00010002');
  assert.strictEqual(TC.framesToDigits(-250, '25'), '00001000');
  assert.strictEqual(TC.framesToDigits(10000000, '25'), null);
});
