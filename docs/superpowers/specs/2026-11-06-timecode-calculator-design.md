# Calculadora de timecode SMPTE — Diseño

Fecha: 2026-11-06

## Intención

Una calculadora gráfica para hacer cuentas con timecode SMPTE (sumar, restar y otras operaciones útiles) en cualquier frame rate estándar, incluido mezclar material de distintos frame rates en una misma cuenta. Primero se hace un **prototipo web**. Más adelante se convertirá en **app**, así que la lógica de timecode tiene que poder reutilizarse fuera del navegador.

## Objetivos

- Interfaz tipo **cinta / lista**, como el rollo de papel de una sumadora (elegida por el usuario frente a la calculadora clásica y a las pestañas).
- Soportar **todos** los frame rates SMPTE habituales, con drop-frame incluido.
- Mezclar frame rates en una misma cinta. La conversión **conserva la duración real** (segundos), no el número de frames (decidido por el usuario).
- Operaciones: suma, resta, multiplicar/dividir por un número, duración entre IN y OUT, conversión entre frame rates y TC ↔ frames totales ↔ segundos (confirmado por el usuario).
- Entrada rápida de solo dígitos, que se rellena **desde la derecha**: `1000` → `00:00:10:00`. Los **separadores se insertan solos** mientras se escribe; el usuario nunca los teclea (decidido por el usuario).

## Anti-objetivos (lo que la haría fallar aunque funcione)

- **Ambigüedad al interpretar lo tecleado.** Lo que el usuario escribe se rellena siempre desde la derecha, sin excepciones ni adivinanzas. Si la entrada no es predecible, la herramienta falla.
- Que la lógica de timecode quede mezclada con el DOM: impediría el paso a app.

## No-objetivos (por ahora)

- Cuentas de usuario, sincronización o nube.
- Importar EDL/XML.
- Leer timecode de ficheros de vídeo.

## Interfaz

### Cinta (zona principal)

- Arriba, un **selector de fps de la cinta**. El total siempre se muestra en ese fps.
- Cada línea tiene un operador (`+`, `−`, `×`, `÷`), un valor y un fps propio.
  - `+` / `−`: el valor es un timecode. Su fps es por defecto el de la cinta y se puede cambiar por línea. Si difiere del de la cinta, la línea muestra el equivalente convertido (p. ej. `29.97DF→25`).
  - `×` / `÷`: el valor es un número (admite decimales) y se aplica al total acumulado hasta esa línea.
- Abajo, el **total acumulado**, que se actualiza al momento. Debajo, el mismo total en **frames totales** y en **segundos**.
- Las líneas se pueden editar, borrar y reordenar.
- Una línea de entrada al final para añadir la siguiente.
- **Los dígitos tecleados mandan** (decidido por el usuario):
  - Cada línea guarda el TC tal como se tecleó y su fps es **"el de la cinta"** (heredado) o un **fps fijo** elegido para esa línea.
  - Si cambia el fps de la cinta, las líneas heredadas **siguen a la cinta**: los mismos dígitos se leen al nuevo fps. Solo las de fps fijo se convierten por duración real.
  - Si se cambia el fps de una línea ya escrita, su TC **se mantiene** y se lee al nuevo fps (sirve para corregir un fps mal elegido).
  - Por eso lo que se guarda por línea es: operador, dígitos/valor tecleado y fps (`"tape"` o un fps concreto). Los frames se calculan a partir de eso.

### Panel lateral de herramientas

Junto a la cinta, con tres herramientas:

1. **Duración IN/OUT**: dos timecodes y un fps. Da la duración (`OUT − IN`), en TC, frames y segundos. Botón para mandar el resultado a la cinta como una línea `+`.
2. **Convertir fps**: un TC y fps de origen → TC en fps de destino, conservando la duración real.
3. **TC ↔ frames ↔ segundos**: escribes cualquiera de los tres y salen los otros dos, para un fps dado.

## Reglas de timecode

### Frame rates soportados

23.976, 24, 25, 29.97 NDF, 29.97 DF, 30, 48, 50, 59.94 NDF, 59.94 DF, 60.
(La lista exacta es decisión mía; añadir 47.952 o 119.88/120 debe ser trivial.)

- Los rates fraccionarios se representan como fracciones exactas (24000/1001, 30000/1001, 60000/1001) para no acumular error de coma flotante.
- **Drop-frame**: algoritmo SMPTE estándar. En 29.97 DF se saltan los números de frame 00 y 01 al principio de cada minuto, salvo en los minutos múltiplos de 10; en 59.94 DF se saltan 00–03.
- Formato visual: NDF `HH:MM:SS:FF`, DF `HH:MM:SS;FF` (punto y coma antes de los frames).

### Modelo interno

- Para calcular, todo valor se resuelve a **frames enteros + fps** y las operaciones se hacen en frames (lo que se guarda es lo tecleado; ver Cinta).
- **Cambiar de fps** (por duración real): `frames_destino = round(frames_origen × fps_destino / fps_origen)` con fracciones exactas, redondeando al frame más cercano (decidido por el usuario).
- `×` / `÷`: resultado redondeado al frame más cercano (decisión mía).

### Entrada

- Solo se aceptan dígitos, hasta 8. Se rellenan desde la derecha: `5` → `00:00:00:05`, `1000` → `00:00:10:00`, `1000000` → `01:00:00:00`.
- Los separadores aparecen solos mientras se escribe. Si el usuario teclea `:`, `;` o `.`, se ignoran (decisión mía).
- Campos que se pasan del rango (p. ej. `00:00:00:30` a 25 fps, o `00:00:75:00`) **se normalizan llevando el excedente** al campo siguiente, y el resultado normalizado se muestra (decisión mía).
- En DF, un timecode que no existe (p. ej. `00:01:00;00` en 29.97 DF) se lleva al siguiente válido (`00:01:00;02`) (decisión mía, comportamiento habitual en editores).

### Resultados

- Los resultados negativos se muestran con signo (`−00:00:05:00`) (decisión mía).
- Pasar de 24 h **no da la vuelta**: las horas siguen subiendo (`25:00:00:00`) (decisión mía; una calculadora de duraciones no debe envolver).

### Teclado

- `Enter` añade la línea.
- `+`, `-`, `*`, `/` al principio de la entrada fijan el operador de la línea.
- `Esc` limpia la entrada. Se puede llegar a todo con el teclado (decisión mía).

## Construcción (decisiones mías)

- HTML + CSS + JavaScript sin frameworks ni build. Se abre `index.html` y funciona.
- **Núcleo de timecode** en un módulo ES aparte (`src/timecode.js`), sin DOM: parseo, formato, drop-frame, conversión de fps y aritmética. Es lo que se reutilizará en la app.
- Tests del núcleo con `node --test` (sin dependencias), con casos conocidos de drop-frame (p. ej. 29.97 DF `00:10:00;00` = 17982 frames; `01:00:00;00` = 107892 frames).
- Los casos de test del núcleo viven como datos en `tests/fixtures.json` (drop-frame, conversiones con redondeo, normalización de entrada, aritmética). Así se reutilizan tal cual si la app futura es nativa (Swift/Kotlin) y no JavaScript (decisión mía).
- Las líneas con otro fps se redondean al convertirse, cada una por separado, de modo que el total coincide con la suma de los valores convertidos que muestra cada línea (decisión mía).
- Los campos numéricos (`×`/`÷` y segundos) sí aceptan punto decimal. Los segundos se muestran con 3 decimales. Las horas pueden tener más de 2 dígitos (decisiones mías).
- La cinta se guarda en `localStorage` para que no se pierda al recargar.
- Botón para copiar el total al portapapeles.
- Estética: tema oscuro, tipografía monoespaciada para los timecodes, al estilo de las herramientas de edición.

## Lo que queda a criterio de quien lo construya

- Diseño visual concreto (colores, espaciado, tipografía) dentro de "oscuro, monoespaciado, herramienta profesional".
- Cómo se edita o reordena una línea (arrastrar, botones ↑↓, etc.).
- Estructura de archivos más allá de separar el núcleo de la interfaz.

## Nota

El directorio del proyecto no es un repositorio git, así que este documento no está commiteado.
