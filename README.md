# Timecode Calc

An SMPTE timecode calculator for video post-production.

- **Tape:** a running list of timecodes you add and subtract, like an adding-machine tape. Multiply or divide the running total by a number.
- **Mixed frame rates:** each line can have its own fps. Lines are converted to the tape's fps keeping their real duration, rounded to the nearest frame.
- **Frame rates:** 23.976, 24, 25, 29.97 (NDF and drop-frame), 30, 48, 50, 59.94 (NDF and drop-frame), 60.
- **Tools:** IN/OUT duration, fps conversion, and TC ↔ frames ↔ seconds.
- **Fast entry:** type digits only and they fill from the right, as in an NLE: `1000` = `00:00:10:00`.
- **Languages:** English and Spanish. The app follows the system language. You can change it in Settings (⚙ button or `⌘,` / `Ctrl+,`).
- **Help:** built-in help with the `?` button or `F1`.

## Usage

- **Web:** open `web/index.html` in a browser. No server is needed.
- **Desktop app (Tauri 2):**
  - `npm install` (once)
  - `npm run dev`: runs the app in development mode
  - `npm run build`: builds the `.app` and `.dmg` for this Mac into `src-tauri/target/release/bundle/`
  - `npm run build -- --target universal-apple-darwin`: universal build (Apple Silicon and Intel). Needs `rustup target add x86_64-apple-darwin aarch64-apple-darwin`

Building the desktop app requires Rust and Node.js.

## Tests

Run `npm test` (or `node --test`). Reference cases live in `tests/fixtures.json` as plain data, so a future native port can check itself against the same values.

## Releases

Pushing a `vX.Y.Z` tag makes GitHub Actions build installers for macOS (universal: Apple Silicon and Intel), Windows and Linux, attached to a draft release:

```
git tag v0.1.0 && git push origin v0.1.0
```

The installers are not code-signed. On macOS, the first time you open the app, right-click it and choose Open.

## Project layout

- `web/src/timecode.js`: SMPTE core: parsing, formatting, drop-frame, fps conversion. Has no DOM dependency.
- `web/src/tape.js`: tape model.
- `web/src/i18n.js`: translations (en, es) and help text. To add a language, copy a `DICTS` block and add its code to `LANGS`. A test fails if any language is missing a key.
- `web/src/ui.js`, `web/src/tools.js`: user interface.
- `src-tauri/`: Tauri desktop app.

---

## En español

Calculadora de timecode SMPTE con una cinta de sumas y restas en varios frame rates (incluido drop-frame) y un panel de herramientas. La interfaz está en español e inglés. Para usarla, abre `web/index.html`, o compila la app de escritorio con `npm install` y `npm run build`.
