# Timecode Calc

Calculadora de timecode SMPTE: cinta de sumas/restas multi-fps (incluido drop-frame 29.97/59.94), × y ÷, duración IN/OUT, conversión de fps y TC ↔ frames ↔ segundos.

En español e inglés (detecta el idioma del sistema; se cambia en Preferencias: botón ⚙ o `⌘,` / `Ctrl+,`). Ayuda integrada con el botón `?` o `F1`.

## Uso

- **Web:** abre `web/index.html` en el navegador (no necesita servidor).
- **App de escritorio (Tauri 2):**
  - `npm install` (una vez)
  - `npm run dev` — abre la app en modo desarrollo
  - `npm run build` — genera `.app` y `.dmg` en `src-tauri/target/release/bundle/`

## Tests

`npm test` (o `node --test`). Los casos de referencia están en `tests/fixtures.json`.

## Versiones

Al subir una etiqueta `vX.Y.Z`, GitHub Actions genera instaladores de macOS (Apple Silicon e Intel), Windows y Linux en una versión borrador:

```
git tag v0.1.0 && git push origin v0.1.0
```

Los instaladores no están firmados: en macOS, la primera vez abre la app con clic derecho → Abrir.

## Estructura

- `web/src/timecode.js` — núcleo SMPTE (sin DOM, reutilizable)
- `web/src/tape.js` — modelo de la cinta
- `web/src/i18n.js` — traducciones (es, en) y textos de la ayuda; para añadir un idioma, copia un bloque de `DICTS` y añádelo a `LANGS`
- `web/src/ui.js`, `web/src/tools.js` — interfaz
- `src-tauri/` — app nativa Tauri
