'use strict';
const test = require('node:test');
const assert = require('node:assert');
const Tape = require('../web/src/tape');

function build(fps, entries) {
  let t = Tape.createTape(fps);
  for (const e of entries) {
    const parsed = typeof e === 'string' ? Tape.parseEntry(e) : e;
    t = Tape.addLine(t, parsed);
  }
  return t;
}

function deepFreeze(o) {
  Object.freeze(o);
  for (const v of Object.values(o)) if (v && typeof v === 'object' && !Object.isFrozen(v)) deepFreeze(v);
  return o;
}

test('parseEntry: operadores, saneado y entradas vacías', () => {
  assert.deepStrictEqual(Tape.parseEntry('1000'), { op: '+', value: '1000' });
  assert.deepStrictEqual(Tape.parseEntry('-500'), { op: '-', value: '500' });
  assert.deepStrictEqual(Tape.parseEntry('01:00:00:00'), { op: '+', value: '01000000' });
  assert.deepStrictEqual(Tape.parseEntry('01:00:00;00'), { op: '+', value: '01000000' });
  assert.deepStrictEqual(Tape.parseEntry('123456789'), { op: '+', value: '12345678' });
  assert.deepStrictEqual(Tape.parseEntry('*2,5'), { op: '*', value: '2.5' });
  assert.deepStrictEqual(Tape.parseEntry('÷3'), { op: '/', value: '3' });
  assert.strictEqual(Tape.parseEntry(''), null);
  assert.strictEqual(Tape.parseEntry('+'), null);
  assert.strictEqual(Tape.parseEntry('*'), null);
});

test('suma y resta en el mismo fps', () => {
  const r = Tape.computeTape(build('25', ['+1000', '+21312', '-500']));
  assert.strictEqual(r.totalTC, '00:02:18:12');
});

test('línea con otro fps se convierte por duración real', () => {
  const t = build('25', [{ op: '+', value: '100', fps: '29.97DF' }]);
  const r = Tape.computeTape(t);
  assert.strictEqual(r.rows[0].frames, 25);
  assert.ok(r.rows[0].conversion.includes('→'));
  assert.strictEqual(r.totalTC, '00:00:01:00');
});

test('línea heredada sigue a la cinta al cambiar el fps', () => {
  const t = Tape.setTapeFps(build('24', ['+1000000']), '23.976');
  assert.strictEqual(Tape.computeTape(t).totalFrames, 86400);
  assert.strictEqual(t.lines[0].value, '1000000');
});

test('línea con fps fijo se convierte al cambiar el fps de la cinta', () => {
  const t = Tape.setTapeFps(build('24', [{ op: '+', value: '1000000', fps: '24' }]), '23.976');
  assert.strictEqual(Tape.computeTape(t).totalFrames, 86314);
});

test('multiplicar y dividir redondean al frame', () => {
  assert.strictEqual(Tape.computeTape(build('25', ['+1000', '*2.5'])).totalFrames, 625);
  assert.strictEqual(Tape.computeTape(build('25', ['+1000', '/3'])).totalFrames, 83);
});

test('división por cero y factor no válido marcan error sin romper el total', () => {
  const r = Tape.computeTape(build('25', ['+1000', '/0']));
  assert.strictEqual(r.rows[1].error, 'divByZero');
  assert.strictEqual(r.totalFrames, 250);
  const r2 = Tape.computeTape(build('25', ['+1000', { op: '*', value: 'abc' }]));
  assert.strictEqual(r2.rows[1].error, 'badFactor');
  assert.strictEqual(r2.totalFrames, 250);
});

test('total negativo con signo', () => {
  assert.strictEqual(Tape.computeTape(build('25', ['+100', '-1000'])).totalTC, '−00:00:09:00');
});

test('editar, mover y borrar no mutan la cinta original', () => {
  const t = deepFreeze(build('25', ['+100', '+200', '+300']));
  const [a, b, c] = t.lines.map((l) => l.id);
  assert.deepStrictEqual(Tape.moveLine(t, c, -1).lines.map((l) => l.id), [a, c, b]);
  assert.deepStrictEqual(Tape.moveLine(t, a, -1).lines.map((l) => l.id), [a, b, c]);
  assert.deepStrictEqual(Tape.removeLine(t, b).lines.map((l) => l.id), [a, c]);
  const u = Tape.updateLine(t, b, { value: '999', fps: '30' });
  assert.strictEqual(u.lines[1].value, '999');
  assert.strictEqual(u.lines[1].fps, '30');
  assert.strictEqual(t.lines[1].value, '200');
});

test('serializar y deserializar; texto inválido da la cinta por defecto', () => {
  const t = build('29.97DF', ['+100', { op: '+', value: '200', fps: '25' }, '*2']);
  assert.deepStrictEqual(Tape.deserializeTape(Tape.serializeTape(t)), t);
  const def = Tape.createTape();
  assert.deepStrictEqual(Tape.deserializeTape('basura'), def);
  assert.deepStrictEqual(Tape.deserializeTape('{"v":99}'), def);
  assert.deepStrictEqual(Tape.deserializeTape(null), def);
  assert.deepStrictEqual(Tape.deserializeTape('{"v":1,"fps":"17","lines":[]}'), def);
});

test('total en segundos con 3 decimales', () => {
  assert.strictEqual(Tape.computeTape(build('25', ['+32415'])).totalSeconds, '204.600');
});

test('editar en línea conserva el decimal de un factor', () => {
  let t = build('25', ['+1000', '*1.5']);
  const id = t.lines[1].id;
  t = Tape.applyEdit(t, id, '0.5');
  assert.strictEqual(t.lines[1].value, '0.5');
  t = Tape.applyEdit(t, t.lines[0].id, '00:00:20:00');
  assert.strictEqual(t.lines[0].value, '00002000');
  assert.strictEqual(Tape.applyEdit(t, id, ''), t);
});

test('desbordamiento en × marca error y nunca da NaN', () => {
  const r = Tape.computeTape(build('25', ['+1', { op: '*', value: '1e300' }, { op: '*', value: '1e300' }, '*0', '+1000']));
  assert.strictEqual(r.rows[1].error, 'outOfRange');
  assert.ok(Number.isFinite(r.totalFrames));
  assert.strictEqual(r.totalFrames, 250);
});
