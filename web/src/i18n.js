/*
 * Traducciones (es, en). Sin DOM. Navegador: globalThis.I18n. Node: module.exports.
 * En los textos de ayuda, `así` se muestra como código.
 */
(function () {
  'use strict';

  const LANGS = ['es', 'en'];

  const DICTS = {
    es: {
      appTitle: 'Calculadora de timecode',
      lang: { label: 'Idioma', es: 'Español', en: 'English' },
      settings: { button: 'Preferencias', title: 'Preferencias', close: 'Cerrar' },
      tape: {
        title: 'Cinta',
        fps: 'fps de la cinta',
        rowsLabel: 'Líneas de la cinta',
        entryPlaceholder: 'Teclea un TC (1000 = 10 s) · + − × ÷ al inicio para la operación',
        entryLabel: 'Nueva línea',
        empty: 'La cinta está vacía. Escribe un timecode abajo y pulsa Enter.',
        editHint: 'Doble clic, Enter o F2 para editar',
        lineFps: 'fps de esta línea',
        inheritFps: 'Cinta ({fps})',
        up: 'Subir',
        down: 'Bajar',
        remove: 'Borrar',
        total: 'Total',
        frames: 'frames',
        copy: 'Copiar',
        copied: 'Copiado',
        copyFailed: 'No se pudo copiar',
        clear: 'Vaciar cinta',
      },
      errors: {
        divByZero: 'División por cero',
        badFactor: 'Factor no válido',
        outOfRange: 'Resultado fuera de rango',
      },
      tools: {
        duration: 'Duración IN/OUT',
        addToTape: 'Añadir a la cinta',
        tooLong: 'Una línea de la cinta admite hasta 99 h',
        convert: 'Convertir fps',
        from: 'De',
        to: 'A',
        framesAt: '{frames} frames a {fps}',
        units: 'TC ↔ frames ↔ segundos',
        frames: 'Frames',
        seconds: 'Segundos',
      },
      help: {
        button: 'Ayuda',
        title: 'Ayuda',
        close: 'Cerrar',
        sections: [
          {
            title: 'Teclear un timecode',
            items: [
              'Escribe solo dígitos: se rellenan desde la derecha, como en un editor de vídeo. `1000` = `00:00:10:00`, `1000000` = `01:00:00:00`.',
              'Los separadores aparecen solos. Si pegas `01:00:00:00`, se aceptan los dígitos.',
              'Máximo 8 dígitos (hasta 99 horas por línea).',
              'Los valores fuera de rango se normalizan: `00:00:00:30` a 25 fps = `00:00:01:05`.',
              'Pulsa Enter para añadir la línea a la cinta.',
            ],
          },
          {
            title: 'Operaciones',
            items: [
              'Empieza con `+` o `-` para sumar o restar un timecode (sin signo se suma).',
              'Empieza con `*` o `/` para multiplicar o dividir el total acumulado hasta esa línea por un número: `*2`, `/3`, `*1,5`.',
              'Los resultados se redondean al frame más cercano. Los totales negativos se muestran con signo y pasar de 24 h no vuelve a cero.',
              'Una línea con un error (división por cero, número no válido) aparece en rojo y no afecta al total.',
            ],
          },
          {
            title: 'Frame rates',
            items: [
              'El fps de la cinta define en qué formato se muestra el total.',
              'Cada línea usa por defecto el fps de la cinta o un fps propio que eliges en su selector.',
              'Si una línea tiene otro fps, se convierte conservando la duración real (segundos) y se redondea al frame más cercano. Junto a ella se ve el valor convertido.',
              'Cambiar un fps nunca cambia los dígitos que tecleaste: solo cómo se leen.',
            ],
          },
          {
            title: 'Drop-frame',
            items: [
              '29.97 DF y 59.94 DF numeran los frames para que el timecode siga al reloj real.',
              'Se saltan números de frame (no imágenes): `00` y `01` en 29.97 DF, `00` a `03` en 59.94 DF, al inicio de cada minuto salvo los múltiplos de 10.',
              'Se muestran con `;` antes de los frames: `01:00:00;00`. Un timecode que no existe, como `00:01:00;00`, pasa al siguiente válido.',
            ],
          },
          {
            title: 'Herramientas',
            items: [
              'Duración IN/OUT: calcula OUT − IN. Con «Añadir a la cinta» lo llevas a la cinta.',
              'Convertir fps: traduce un timecode de un fps a otro conservando la duración real.',
              'TC ↔ frames ↔ segundos: escribe en cualquiera de los tres campos y se calculan los otros dos.',
            ],
          },
          {
            title: 'Teclado',
            items: [
              '`Enter`: añadir la línea · `Esc`: limpiar la entrada.',
              '`Enter` o `F2` sobre una línea: editarla · `Esc`: cancelar.',
              '`Tab`: moverse entre controles · `F1`: abrir esta ayuda · `⌘,` o `Ctrl+,`: preferencias (idioma).',
            ],
          },
        ],
      },
    },
    en: {
      appTitle: 'Timecode calculator',
      lang: { label: 'Language', es: 'Español', en: 'English' },
      settings: { button: 'Settings', title: 'Settings', close: 'Close' },
      tape: {
        title: 'Tape',
        fps: 'Tape fps',
        rowsLabel: 'Tape lines',
        entryPlaceholder: 'Type a TC (1000 = 10 s) · start with + − × ÷ for the operation',
        entryLabel: 'New line',
        empty: 'The tape is empty. Type a timecode below and press Enter.',
        editHint: 'Double-click, Enter or F2 to edit',
        lineFps: 'fps for this line',
        inheritFps: 'Tape ({fps})',
        up: 'Move up',
        down: 'Move down',
        remove: 'Delete',
        total: 'Total',
        frames: 'frames',
        copy: 'Copy',
        copied: 'Copied',
        copyFailed: 'Could not copy',
        clear: 'Clear tape',
      },
      errors: {
        divByZero: 'Division by zero',
        badFactor: 'Invalid factor',
        outOfRange: 'Result out of range',
      },
      tools: {
        duration: 'IN/OUT duration',
        addToTape: 'Add to tape',
        tooLong: 'A tape line holds up to 99 h',
        convert: 'Convert fps',
        from: 'From',
        to: 'To',
        framesAt: '{frames} frames at {fps}',
        units: 'TC ↔ frames ↔ seconds',
        frames: 'Frames',
        seconds: 'Seconds',
      },
      help: {
        button: 'Help',
        title: 'Help',
        close: 'Close',
        sections: [
          {
            title: 'Typing a timecode',
            items: [
              'Type digits only: they fill from the right, like in an editing app. `1000` = `00:00:10:00`, `1000000` = `01:00:00:00`.',
              'Separators appear on their own. If you paste `01:00:00:00`, the digits are kept.',
              'Up to 8 digits (up to 99 hours per line).',
              'Out-of-range values are normalized: `00:00:00:30` at 25 fps = `00:00:01:05`.',
              'Press Enter to add the line to the tape.',
            ],
          },
          {
            title: 'Operations',
            items: [
              'Start with `+` or `-` to add or subtract a timecode (no sign adds).',
              'Start with `*` or `/` to multiply or divide the running total up to that line by a number: `*2`, `/3`, `*1.5`.',
              'Results are rounded to the nearest frame. Negative totals show a sign, and going past 24 h does not wrap.',
              'A line with an error (division by zero, invalid number) shows in red and does not affect the total.',
            ],
          },
          {
            title: 'Frame rates',
            items: [
              'The tape fps sets the format of the total.',
              'Each line uses the tape fps by default, or its own fps chosen in its selector.',
              'If a line has a different fps, it is converted keeping its real duration (seconds) and rounded to the nearest frame. The converted value is shown next to it.',
              'Changing an fps never changes the digits you typed, only how they are read.',
            ],
          },
          {
            title: 'Drop-frame',
            items: [
              '29.97 DF and 59.94 DF number frames so the timecode tracks real clock time.',
              'Frame numbers are skipped (no pictures are dropped): `00` and `01` in 29.97 DF, `00` to `03` in 59.94 DF, at the start of every minute except multiples of 10.',
              'They show `;` before the frames: `01:00:00;00`. A timecode that does not exist, such as `00:01:00;00`, moves to the next valid one.',
            ],
          },
          {
            title: 'Tools',
            items: [
              'IN/OUT duration: computes OUT − IN. “Add to tape” sends it to the tape.',
              'Convert fps: translates a timecode from one fps to another, keeping its real duration.',
              'TC ↔ frames ↔ seconds: type in any of the three fields and the other two are calculated.',
            ],
          },
          {
            title: 'Keyboard',
            items: [
              '`Enter`: add the line · `Esc`: clear the entry.',
              '`Enter` or `F2` on a line: edit it · `Esc`: cancel.',
              '`Tab`: move between controls · `F1`: open this help · `⌘,` or `Ctrl+,`: settings (language).',
            ],
          },
        ],
      },
    },
  };

  /** Primer idioma soportado de la lista del sistema; inglés si ninguno. */
  function detectLang(languages) {
    for (const l of languages || []) {
      const base = String(l).toLowerCase().split('-')[0];
      if (LANGS.includes(base)) return base;
    }
    return 'en';
  }

  function lookup(lang, key) {
    let v = DICTS[lang] || DICTS.en;
    for (const part of key.split('.')) {
      if (v == null || typeof v !== 'object') return undefined;
      v = v[part];
    }
    return v;
  }

  /** Traduce `key`; sustituye {nombre} por params.nombre. Clave inexistente → la propia clave. */
  function t(lang, key, params) {
    const v = lookup(lang, key);
    if (typeof v !== 'string') return key;
    return params ? v.replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m)) : v;
  }

  const api = { LANGS, DICTS, detectLang, t, lookup };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else globalThis.I18n = api;
})();
