# Fuentes Extraídas — Cuaderno "Arquitectura de Computadores" (NotebookLM)

> Extraído del cuaderno de NotebookLM de la asignatura **Arquitectura de Computadores** (39 fuentes: `4-memorias.pdf`, `memorias_problemas.pdf`, exámenes `2025-01-07`, `2025-06-13`, `2026-01-07`, `2026-06-15`, `Intro 80C552.pdf`, `3_interrupciones.pdf`, `Convertidor AD.pdf`, `Timer 2.pdf`, etc.).

## Mapa Temático de Niveles del Juego

1. **Nivel 1 (Foco inicial solicitado) — Mapas de Memoria, Buses y Decodificación de Direcciones**
   - Fuentes: `4-memorias.pdf`, `memorias_problemas.pdf`, `2025-01-07`, `2025-06-13`, `2026-01-07`.
   - Microprocesadores y buses:
     - **Intel 8085** (8 bits): `A15..A0` (64 kB, `0000h–FFFFh`), `D7..D0`, `IO/M` (`0` = Memoria, `1` = E/S), `/RD`, `/WR`, vector de reset en `0000h`.
     - **80C51 / 80C552** (Harvard): `/PSEN` (lectura memoria de programa externa), `/RD` y `/WR` (lectura/escritura XRAM), `ALE`, `/EA`.
     - **Extensiones en exámenes avanzados**: buses de 20 bits (1 MB) o buses de datos de 16 bits con paginación `BS` / `P`.
   - Integrados estándar de la asignatura:
     - **`74138` / `74AHCT138`** (3 a 8): entradas `A0, A1, A2` (pines 1–3), habilitadores `/E1` (pin 4, activo bajo), `/E2` (pin 5, activo bajo), `E3` (pin 6, activo alto), salidas `/Y0../Y7` activas en bajo (`0`).
     - **`74139`** (2 a 4): entradas `A0, A1`, habilitador `/E` activo en bajo, salidas `/Y0../Y3` activas en bajo.
     - **Puertas lógicas y polaridad negativa:**
       - `AND`: funciona como **OR lógico en señales activas en bajo** (`/CS = /Y0 AND /Y1` se activa a `0` si `/Y0 = 0` O `/Y1 = 0`).
       - `OR`: funciona como **AND lógico en señales activas en bajo** (`/CS = /Y AND A13` solo vale `0` si `/Y = 0` Y `A13 = 0`).
       - `NOT`: inversión de líneas de dirección o señales de control.
     - **Memorias:** `UVPROM` / `PROM` (solo lectura: `/CS`, `/OE` o `/RD`), `SRAM` (lectura/escritura: `/CS`, `/OE` o `/RD`, `/WE` o `/WR`), `Flash`.
   - Conceptos clave evaluados: decodificación completa vs parcial (zonas imagen / espejos), detección de solapamientos, zonas vacías, ancho de bus de datos (`×4`, `×8`, `×16`).

2. **Nivel 2 — Introducción a Procesadores, Puertos E/S y 80C552**
   - Fuentes: `1a_introduccion_general.pdf`, `AdC - Teoria 01.03`, `Intro 80C552.pdf`.
3. **Nivel 3 — Desarrollo SW, Diagramas de Flujo y Autómatas FSM (Ensamblador 80C552)**
   - Fuentes: `2_desarrollo_software`, `AdC - Teoria 02.05`, `DesarrolloSW_EJ2_Presentacion.pdf`, `juego instrucciones.pdf`.
4. **Nivel 4 — Sistema de Interrupciones (`IEN0/1`, `IP0/1`, ISR, Pila, `RETI`)**
   - Fuentes: `3_interrupciones.pdf`, `AdC - Teoria 03.02`, `2-ejercicios_interrupciones`.
5. **Nivel 5 — Periféricos Integrados (`ADCON`, `PWM0/PWMP`, `Timer 2`, Práctica Dron Submarino)**
   - Fuentes: `Sistemas digitales-tema6_Perifericos_2019.pdf`, `Convertidor AD.pdf`, `Timer 2.pdf`, `Practica_Final_2026-2027`.

## Ejercicios Reales de Examen de Referencia (Nivel 1)

### Referencia A — Examen `2025-01-07` (Ejercicio 3 — Intel 8085)
- CPU Intel 8 bits, `A15..A0`, `D7..D0`, `IO/M`, `/RD`, `/WR`, Reset `0000h`.
- `0000h–3FFFh` (16 kB): UVPROM (`2 × 16k×4` en paralelo), `/CS = /Y0 AND /Y1`.
- `4000h–5FFFh` (8 kB): SRAM 0 (`8k×8`), `/CS = /Y2`.
- `6000h–7FFFh` (8 kB): SRAM 1 (`8k×8`), `/CS = /Y3`.
- `8000h–BFFFh` (16 kB lógicos, 8 kB físicos en espejo): SRAM 2 (`8k×8`), `/CS = /Y4 AND /Y5` (`A000h–BFFFh` imagen de `8000h–9FFFh`).
- `C000h–FFFFh`: VACÍO.
- `74138`: `A0=A13`, `A1=A14`, `A2=A15`, `/E1=IO/M`, `/E2=GND`, `E3=VCC`.

### Referencia B — Examen `2026-01-07` (Ejercicio 3 — Bus 16 bits + Paginación `BS`)
- `74AHCT138` principal con `A0=A14, A1=A15, A2=BS`, puertas `AND`/`OR`/`NOT` y segundo `74AHCT138` en cascada para 4 periféricos en `E000h–FFFFh`.
