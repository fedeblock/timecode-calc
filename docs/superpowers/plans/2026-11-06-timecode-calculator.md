# Calculadora de timecode SMPTE — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prototipo web de calculadora de timecode SMPTE con interfaz de cinta, multi-fps (incluido drop-frame), y panel de herramientas (duración IN/OUT, convertir fps, TC↔frames↔segundos).

**Architecture:** Núcleo puro `src/timecode.js` (aritmética SMPTE, sin DOM) + modelo puro de cinta `src/tape.js` (líneas, cálculo, serialización) + interfaz `src/ui.js`/`index.html`/`src/styles.css`. Núcleo y modelo se prueban con `node --test` contra casos en `tests/fixtures.json`, reutilizables por una futura app nativa.

**Tech Stack:** HTML + CSS + JavaScript vanilla, sin dependencias ni build. Tests con `node --test` (Node ≥ 18).

**Spec:** `docs/superpowers/specs/2026-11-06-timecode-calculator-design.md`

## Global Constraints

- Sin frameworks, sin dependencias npm, sin paso de build. `index.html` debe funcionar abierto directamente con doble clic (`file://`).
- Por lo anterior, **no usar ES modules en el navegador** (fallan en `file://`). `src/timecode.js` y `src/tape.js` usan patrón UMD: `if (typeof module !== 'undefined') module.exports = api; else globalThis.Timecode = api;` (resp. `globalThis.Tape`). Tests con `require`. No crear `package.json` con `"type": "module"`.
- `src/timecode.js` y `src/tape.js` no tocan el DOM ni `localStorage`.
- Frame rates (ids exactos, en este orden): `23.976`, `24`, `25`, `29.97`, `29.97DF`, `30`, `48`, `50`, `59.94`, `59.94DF`, `60`. Fraccionarios como fracción exacta: 24000/1001, 30000/1001, 60000/1001.
- Drop-frame: 29.97DF salta frames 00–01, 59.94DF salta 00–03, al inicio de cada minuto salvo minutos múltiplo de 10.
- Formato: NDF `HH:MM:SS:FF`, DF `HH:MM:SS;FF`. Negativos con prefijo `−` (U+2212). Horas sin envolver a 24 h; más de 2 dígitos si hace falta.
- Conversión de fps conserva duración real: `round(frames × fpsDestino / fpsOrigen)`, redondeo al más cercano, mitad lejos de cero.
- Entrada de TC: solo dígitos, máx. 8, se rellenan desde la derecha (`1000` → `00:00:10:00`). Separadores tecleados o pegados se ignoran.
- Fuera de rango se normaliza con acarreo; TC DF inexistente sube al siguiente válido.
- `×`/`÷`: factor decimal (acepta `.` o `,`), resultado redondeado al frame más cercano.
- Segundos con 3 decimales.
- Estética: tema oscuro, timecodes en fuente monoespaciada.
- Idioma de la interfaz: español.

## Review Focus

- **División por cero o factor vacío/no numérico** en una línea `÷`/`×`: la línea se marca con error y se ignora; el total no se rompe ni da `NaN`. → test en Task 2.
- **Enter con la entrada vacía** (o solo un operador): no se añade línea. → test de `parseEntry` en Task 2.
- **Pegar `01:00:00:00` o `01:00:00;00`** en la entrada: se quitan separadores y queda `01:00:00:00`. → test de `parseEntry` en Task 2.
- **`localStorage` corrupto o de otra versión**: arranca con la cinta por defecto, sin excepción. → test de `deserializeTape` en Task 2.
- **Más de 8 dígitos tecleados/pegados**: se conservan los 8 primeros; no se desplaza nada a las horas. → test de `parseEntry` en Task 2 y verificación manual en Task 3.

---

### Task 1: Núcleo de timecode (`src/timecode.js`)

**Files:**
- Create: `src/timecode.js`, `tests/fixtures.json`, `tests/timecode.test.js`, `.gitignore` (contenido: `.superpowers/`)

**Interfaces:**
- Produces (exportado como objeto `Timecode`):
  - `FPS_IDS: string[]` — ids en el orden de Global Constraints.
  - `FPS: Record<string, {id, num, den, nominal, dropFrame: boolean, dropCount: 0|2|4, label: string}>` — p. ej. `'29.97DF': {num:30000, den:1001, nominal:30, dropFrame:true, dropCount:2, label:'29.97 DF'}`.
  - `digitsToFields(digits: string) -> {h, m, s, f}` — digits ya saneados (≤ 8 dígitos); rellena con ceros por la izquierda.
  - `fieldsToFrames(fields, fpsId) -> number` — normaliza con acarreo; en DF sube TC inexistente al siguiente válido.
  - `parseTC(digits: string, fpsId) -> number` — `fieldsToFrames(digitsToFields(digits), fpsId)`.
  - `framesToFields(frames: number, fpsId) -> {negative: boolean, h, m, s, f}`
  - `formatTC(frames: number, fpsId) -> string`
  - `formatDigits(digits: string, fpsId) -> string` — vista "en vivo" mientras se teclea, sin normalizar: `'1000'` → `'00:00:10:00'`, en DF con `;`.
  - `convertFrames(frames: number, fromId, toId) -> number`
  - `framesToSeconds(frames: number, fpsId) -> number`
  - `secondsToFrames(seconds: number, fpsId) -> number` — redondeo al más cercano.
  - `formatSeconds(seconds: number) -> string` — 3 decimales, p. ej. `'204.600'`.

- [ ] **Step 1: Inicializar repo** — `git init` en la raíz del proyecto; crear `.gitignore` con `.superpowers/`.

- [ ] **Step 2: Escribir `tests/fixtures.json`** con exactamente estas secciones y, como mínimo, estos casos:

```json
{
  "parseTC": [
    {"digits": "1000", "fps": "25", "frames": 250},
    {"digits": "5", "fps": "25", "frames": 5},
    {"digits": "1000000", "fps": "25", "frames": 90000},
    {"digits": "30", "fps": "25", "frames": 30},
    {"digits": "7500", "fps": "25", "frames": 1875},
    {"digits": "1000000", "fps": "24", "frames": 86400},
    {"digits": "10002", "fps": "29.97DF", "frames": 1800},
    {"digits": "10000", "fps": "29.97DF", "frames": 1800},
    {"digits": "5929", "fps": "29.97DF", "frames": 1799},
    {"digits": "100000", "fps": "29.97DF", "frames": 17982},
    {"digits": "1000000", "fps": "29.97DF", "frames": 107892},
    {"digits": "1000000", "fps": "29.97", "frames": 108000},
    {"digits": "10004", "fps": "59.94DF", "frames": 3600},
    {"digits": "100000", "fps": "59.94DF", "frames": 35964},
    {"digits": "1000000", "fps": "59.94DF", "frames": 215784}
  ],
  "formatTC": [
    {"frames": 250, "fps": "25", "tc": "00:00:10:00"},
    {"frames": 30, "fps": "25", "tc": "00:00:01:05"},
    {"frames": 1875, "fps": "25", "tc": "00:01:15:00"},
    {"frames": 1800, "fps": "29.97DF", "tc": "00:01:00;02"},
    {"frames": 1799, "fps": "29.97DF", "tc": "00:00:59;29"},
    {"frames": 17982, "fps": "29.97DF", "tc": "00:10:00;00"},
    {"frames": 107892, "fps": "29.97DF", "tc": "01:00:00;00"},
    {"frames": 3600, "fps": "59.94DF", "tc": "00:01:00;04"},
    {"frames": 215784, "fps": "59.94DF", "tc": "01:00:00;00"},
    {"frames": -125, "fps": "25", "tc": "−00:00:05:00"},
    {"frames": 2250000, "fps": "25", "tc": "25:00:00:00"},
    {"frames": 9000000, "fps": "25", "tc": "100:00:00:00"}
  ],
  "convertFrames": [
    {"frames": 25, "from": "25", "to": "29.97DF", "out": 30},
    {"frames": 86400, "from": "24", "to": "23.976", "out": 86314},
    {"frames": 107892, "from": "29.97DF", "to": "29.97", "out": 107892},
    {"frames": -25, "from": "25", "to": "30", "out": -30}
  ],
  "seconds": [
    {"frames": 5115, "fps": "25", "seconds": 204.6, "text": "204.600"},
    {"frames": 30000, "fps": "29.97", "seconds": 1001, "text": "1001.000"}
  ]
}
```

- [ ] **Step 3: Escribir `tests/timecode.test.js`** — por cada sección del fixture, un `test()` que itera los casos y hace `assert.strictEqual` (`seconds`: `framesToSeconds` ≈ con tolerancia 1e-9, `formatSeconds` exacto, y `secondsToFrames(seconds) === frames`). Además:
  - `formatDigits('1000','25') === '00:00:10:00'`, `formatDigits('','29.97DF') === '00:00:00;00'`, `formatDigits('12345678','25') === '12:34:56:78'`.
  - Ida y vuelta: para cada fps y para frames en `[0, 1, 1799, 1800, 17982, 107891, 107892, 123456]`, `parseTC(formatTC(n).replace(/\D/g,''), fps) === n` (solo con n < 100 h).
  - `FPS_IDS` igual al orden de Global Constraints.

- [ ] **Step 4: Ejecutar y ver que falla** — `node --test tests/` → FAIL (`Cannot find module '../src/timecode'`).

- [ ] **Step 5: Implementar `src/timecode.js`** con el patrón UMD de Global Constraints. Algoritmo DF (frames → campos), con `d = dropCount`, `fpm = nominal*60 - d`, `fp10m = nominal*600 - 9*d`:

```js
const tenMin = Math.floor(n / fp10m), rem = n % fp10m;
n += 9 * d * tenMin + (rem > d ? d * Math.floor((rem - d) / fpm) : 0);
// luego NDF normal con base nominal
```

Campos → frames DF: normalizar primero con base `nominal`; si `f < d && s === 0 && m % 10 !== 0` entonces `f = d`; `totalMin = h*60+m`; `frames = (h*3600+m*60+s)*nominal + f - d*(totalMin - Math.floor(totalMin/10))`. `convertFrames` en enteros: `frames*toNum*fromDen / (toDen*fromNum)`, redondeando el valor absoluto y aplicando el signo.

- [ ] **Step 6: Ejecutar y ver que pasa** — `node --test tests/` → todos PASS.

- [ ] **Step 7: Commit** — `git add .gitignore src/timecode.js tests/ && git commit -m "feat: núcleo de timecode SMPTE con drop-frame y conversión de fps"`

---

### Task 2: Modelo de cinta (`src/tape.js`)

**Files:**
- Create: `src/tape.js`, `tests/tape.test.js`

**Interfaces:**
- Consumes: `Timecode.parseTC`, `convertFrames`, `formatTC`, `framesToSeconds`, `formatSeconds`, `FPS` (Task 1). En Node: `require('./timecode')`; en navegador: `globalThis.Timecode`.
- Produces (objeto `Tape`):
  - Tipos: `Line = {id: string, op: '+'|'-'|'*'|'/', value: string, fps: 'tape' | fpsId}`; `TapeState = {fps: fpsId, lines: Line[]}`.
  - `DEFAULT_FPS = '25'`; `createTape(fps = DEFAULT_FPS) -> TapeState`.
  - `parseEntry(text: string) -> {op, value} | null` — operador inicial `+ - * / × ÷ x` (por defecto `+`; `×`/`x`→`*`, `÷`→`/`); para `+`/`-` el valor son solo los dígitos (máx. 8, se descartan los sobrantes por la derecha); para `*`/`/` el valor es el número decimal con `,` cambiada a `.`. Devuelve `null` si no queda valor.
  - `addLine(tape, {op, value, fps = 'tape'}) -> TapeState` (genera `id` único).
  - `updateLine(tape, id, patch) -> TapeState`, `removeLine(tape, id) -> TapeState`, `moveLine(tape, id, delta: -1|1) -> TapeState`, `setTapeFps(tape, fpsId) -> TapeState`. Todas puras (no mutan).
  - `computeTape(tape) -> {rows: Row[], totalFrames, totalTC, totalSeconds: string}` con `Row = {id, op, lineFps (resuelto), frames: number|null (aporte ya en fps de la cinta), display: string, conversion: string|null, runningFrames, error: string|null}`.
  - `serializeTape(tape) -> string` (`{"v":1,"fps":…,"lines":[…]}`); `deserializeTape(text) -> TapeState` (cinta por defecto si el texto es inválido, de otra versión, o tiene fps desconocido).

Reglas de `computeTape`:
- `+`/`-`: fps de la línea = `line.fps === 'tape' ? tape.fps : line.fps`. `frames = parseTC(value, lineFps)`; si `lineFps !== tape.fps`, `frames = convertFrames(frames, lineFps, tape.fps)` (cada línea se redondea por separado). `display = formatTC(parseTC(value, lineFps), lineFps)` (normalizado en su propio fps). `conversion = '<FPS[lineFps].label>→<FPS[tape.fps].label>  <formatTC(frames, tape.fps)>'` o `null`.
- `*`/`/`: factor `Number(value)`; si no es finito, o es 0 en `/`: `error = 'Factor no válido'` / `'División por cero'`, y el running no cambia. Si no, `running = signedRound(running * factor)` (o `/ factor`). `display = '× 2'`, etc.
- Los dígitos tecleados mandan: cambiar `tape.fps` o `line.fps` nunca reescribe `line.value`.

- [ ] **Step 1: Escribir `tests/tape.test.js`** con estos tests:
  - `parseEntry`: `'1000'`→`{op:'+',value:'1000'}`; `'-500'`→`{op:'-',value:'500'}`; `'01:00:00:00'`→`{op:'+',value:'01000000'}`; `'01:00:00;00'` igual; `'123456789'`→value `'12345678'`; `'*2,5'`→`{op:'*',value:'2.5'}`; `'÷3'`→`{op:'/',value:'3'}`; `''`, `'+'`, `'*'` → `null`.
  - Suma mismo fps: cinta 25 con `+1000`, `+21312`, `-500` → `totalTC === '00:02:18:12'`.
  - Mixto: cinta 25, línea `+100` (1 s) con `fps:'29.97DF'` → fila `frames === 25`, `conversion` contiene `'→'`, `totalTC === '00:00:01:00'`.
  - Heredado sigue a la cinta: cinta 24 con línea `+1000000` fps `'tape'`; `setTapeFps(…,'23.976')` → `totalFrames === 86400` y `line.value` sin cambiar.
  - Fijo se convierte: misma línea con `fps:'24'` y cinta `'23.976'` → `totalFrames === 86314`.
  - `×`/`÷`: cinta 25, `+1000`, `*2.5` → `totalFrames === 625`; `+1000`, `/3` → `totalFrames === 83`.
  - División por cero: `+1000`, `/0` → fila con `error === 'División por cero'`, `totalFrames === 250`. `*abc` → `error === 'Factor no válido'`.
  - Negativo: `+100`, `-1000` → `totalTC === '−00:00:09:00'`.
  - `moveLine`/`removeLine`/`updateLine` cambian orden/contenido sin mutar la entrada (comprobar con `Object.freeze` profundo de la cinta original).
  - `deserializeTape(serializeTape(t))` deep-equal a `t`; `deserializeTape('basura')`, `deserializeTape('{"v":99}')`, `deserializeTape(null)` → `createTape()`; fps desconocido → `createTape()`.
  - `totalSeconds`: cinta 25 con `+32415` (00:03:24:15, 5115 frames) → `totalSeconds === '204.600'`.

- [ ] **Step 2: Ejecutar y ver que falla** — `node --test tests/` → FAIL en `tape.test.js` (`Cannot find module`).

- [ ] **Step 3: Implementar `src/tape.js`** con las interfaces y reglas de arriba (UMD, `globalThis.Tape`). Ids con contador + `Date.now()` en base 36.

- [ ] **Step 4: Ejecutar y ver que pasa** — `node --test tests/` → todo PASS (Task 1 incluido).

- [ ] **Step 5: Commit** — `git add src/tape.js tests/tape.test.js && git commit -m "feat: modelo de cinta con fps heredado/fijo y serialización"`

---

### Task 3: Interfaz de la cinta (`index.html`, `src/styles.css`, `src/ui.js`)

**Files:**
- Create: `index.html`, `src/styles.css`, `src/ui.js`

**Interfaces:**
- Consumes: `Timecode` y `Tape` (Tasks 1 y 2), cargados con `<script src="src/timecode.js">`, `<script src="src/tape.js">`, `<script src="src/ui.js">` en ese orden, sin `type="module"`.
- Produces: `index.html` con dos columnas: `<main id="tape">` (izquierda, ancha) y `<aside id="tools">` vacío (lo llena Task 4). `ui.js` expone `globalThis.App = {getTape(), addLineFromTool({op, value, fps})}` para Task 4.

Comportamiento:
- Cabecera de la cinta: `<select id="tape-fps">` con `FPS_IDS` (texto `FPS[id].label`).
- Lista de filas: operador, `display`, selector de fps de la línea (primera opción `"Cinta (25)"` = `'tape'`, luego todos los fps), `conversion` en texto atenuado, `error` en rojo, botones ↑ ↓ ✕. Doble clic en el valor → se edita en sitio con la misma entrada en vivo; Enter guarda, Esc cancela.
- Entrada al final: `<input id="entry">`. Mientras se escribe se muestra debajo la vista en vivo: para `+`/`-`, operador + `formatDigits(value, tape.fps)`; para `*`/`/`, el factor. Si `parseEntry` devuelve `null`, Enter no hace nada. Esc limpia. La entrada impide escribir más de 8 dígitos en modo TC.
- Total abajo, grande: `totalTC`; debajo `"<totalFrames> frames · <totalSeconds> s"`. Botón "Copiar" → `navigator.clipboard.writeText(totalTC)` con aviso breve "Copiado".
- Botón "Vaciar cinta".
- Cada cambio: `localStorage.setItem('tc-calc.tape', serializeTape(tape))` y re-render. Al arrancar: `deserializeTape(localStorage.getItem('tc-calc.tape'))`, en `try/catch` (sin `localStorage` → cinta por defecto).
- Tema oscuro; timecodes con `font-family: ui-monospace, "SF Mono", Menlo, monospace` y `font-variant-numeric: tabular-nums`.

- [ ] **Step 1: Implementar** `index.html`, `src/styles.css`, `src/ui.js` según lo anterior.

- [ ] **Step 2: Verificar los tests del núcleo** — `node --test tests/` → todo PASS.

- [ ] **Step 3: Verificación manual en el navegador** (abrir `index.html` directamente, `file://`). Cada punto debe cumplirse:
  - Cinta 25: teclear `1000` → vista en vivo `00:00:10:00`; Enter → fila `+ 00:00:10:00`; total `00:00:10:00`, `250 frames · 10.000 s`.
  - Teclear `-500` Enter → total `00:00:05:00`.
  - Pegar `01:00:00:00` → vista `+ 01:00:00:00`. Teclear `123456789` → solo quedan 8 dígitos.
  - Cambiar el fps de una fila a `29.97 DF` → aparece el texto de conversión con `→`; el total cambia.
  - `/0` → fila en rojo "División por cero"; el total no cambia.
  - Recargar la página → la cinta sigue igual. Borrar a mano `tc-calc.tape` con un valor basura en DevTools y recargar → cinta vacía sin errores en consola.
  - ↑ ↓ ✕ y la edición con doble clic funcionan; Copiar pone el total en el portapapeles.
  - No hay errores en la consola.

- [ ] **Step 4: Commit** — `git add index.html src/styles.css src/ui.js && git commit -m "feat: interfaz de cinta"`

---

### Task 4: Panel de herramientas (`src/tools.js`)

**Files:**
- Create: `src/tools.js`
- Modify: `index.html` (añadir `<script src="src/tools.js">` después de `ui.js`), `src/styles.css`

**Interfaces:**
- Consumes: `Timecode` (Task 1), `App.getTape()`, `App.addLineFromTool({op, value, fps})` (Task 3). Las entradas de TC usan el mismo saneado que la cinta: `Tape.parseEntry` y quedarse con `.value`, o directamente quitar los no-dígitos y limitar a 8.
- Produces: tres secciones dentro de `<aside id="tools">`, cada una con su propio selector de fps (por defecto el de la cinta al cargar).

Herramientas:
1. **Duración IN/OUT**: entradas IN y OUT (vista en vivo con `formatDigits`). Resultado `formatTC(parseTC(out)-parseTC(in), fps)`, frames y segundos. Botón "Añadir a la cinta" → `App.addLineFromTool({op: dur < 0 ? '-' : '+', value: <dígitos de formatTC(|dur|, fps)>, fps})`.
2. **Convertir fps**: TC + fps origen + fps destino → `formatTC(convertFrames(parseTC(tc, from), from, to), to)`.
3. **TC ↔ frames ↔ segundos**: tres campos; al editar uno se recalculan los otros dos con `parseTC`/`formatTC`, `framesToSeconds`/`secondsToFrames`, `formatSeconds`. Los frames aceptan solo enteros; los segundos, decimales con `.` o `,`.

- [ ] **Step 1: Implementar** `src/tools.js` y los estilos.

- [ ] **Step 2: Verificación manual en el navegador:**
  - Duración a 25: IN `1000000`, OUT `1032415` → `00:03:24:15`, `5115 frames · 204.600 s`. "Añadir a la cinta" añade `+ 00:03:24:15` con fps fijo 25.
  - IN mayor que OUT → resultado negativo con `−`.
  - Convertir: `100` de 25 a 29.97 DF → `00:00:01;00`. `1000000` de 24 a 23.976 → `00:59:56:10` (86314 frames a base 24).
  - TC↔frames a 29.97 DF: TC `1000000` → frames `17982`; frames `1800` → TC `00:01:00;02`; segundos `1001` a 29.97 → frames `30000`.
  - No hay errores en la consola.

- [ ] **Step 3: Commit** — `git add index.html src/tools.js src/styles.css && git commit -m "feat: panel de herramientas"`
