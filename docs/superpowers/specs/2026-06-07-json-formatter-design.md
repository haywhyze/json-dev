# JSON Formatter — v1 (Core Editor) Design

**Date:** 2026-06-07
**Status:** Approved (design phase)
**North star:** https://jsonformatter.org/ — a full JSON toolkit. This spec covers **v1 only**: the core editor. Later phases (converters, codegen, compare, accounts, sharing) are tracked in the backlog at the end.

## 1. Goal

Build a fast, clean, fully client-side JSON formatter web app. A user pastes or types JSON and can format/beautify, minify, validate (with precise error locations), and explore it as an interactive tree — all in a two-pane (input → output) layout.

## 2. Scope

### In scope (v1)
- **Format / Beautify** — parse and pretty-print with selectable indent (2 spaces, 4 spaces, or tab).
- **Minify / Compact** — collapse to a single line.
- **Validate** — parse and report `Valid ✓` (with stats) or a precise `line:col — message` on error.
- **Tree viewer** — interactive collapsible tree of the parsed JSON in the output pane. Toggle between **Formatted text ⇄ Tree**.
- **Syntax highlighting + inline lint** — CodeMirror JSON mode with error markers in the gutter.
- **Utilities** — Copy output, Download `.json`, Clear input, Load sample.
- **Theme** — light/dark, system-aware with a manual toggle.

### Out of scope (v1) — north-star backlog
Converters (JSON ↔ CSV / XML / YAML / TSV), code generators (JSON → TypeScript / Go / Python types), compare/diff, sorter, JSONPath query, accounts/login, saved + shared URLs, public/private sharing, file upload. The architecture leaves clean room for all of these as new `lib/` modules and routes.

## 3. Stack

- **Framework:** Next.js (App Router) + TypeScript.
- **Styling:** Tailwind CSS.
- **Editor:** CodeMirror 6 via `@uiw/react-codemirror`, with `@codemirror/lang-json` and `@codemirror/lint` (`jsonParseLinter`) for gutter error markers.
- **Package manager:** pnpm.
- **Testing:** Vitest + React Testing Library (unit) and Playwright (one smoke test).
- **Deploy:** Vercel, zero-config.
- **Rendering:** The page shell is a static Server Component; the interactive tool is a Client Component. No backend in v1.

## 4. Architecture

Strict separation between **pure logic** (framework-agnostic, fully unit-tested) and **UI** (thin React components that call the logic).

### Pure logic — `src/lib/json/`
- `format.ts`
  - `format(text: string, indent: Indent): string` — parse then pretty-print. `Indent` = `2 | 4 | 'tab'`.
  - `minify(text: string): string` — parse then stringify with no whitespace.
  - Both throw or surface errors through `validate` (see below); formatting an invalid string does not mutate input.
- `validate.ts`
  - `validate(text: string): ValidationResult`
  - `ValidationResult = { ok: true; stats: { keys: number; bytes: number; depth: number } } | { ok: false; error: { line: number; col: number; message: string } }`.
  - Error line/col derived from the `JSON.parse` failure position (mapped to line/col) and/or CodeMirror's linter for the gutter.

### UI — `src/components/`
- `JsonEditor.tsx` — `'use client'`. CodeMirror 6 wrapper. Props: `value`, `onChange`, `readOnly`, `lint` (enable JSON linter). Owns the JSON language extension, theme, and lint gutter.
- `JsonTree.tsx` — recursive collapsible tree rendering a parsed JS value. Handles objects, arrays, primitives, null. Collapsible nodes, key/value coloring, array indices, counts on collapsed nodes.
- `Toolbar.tsx` — presentational. Buttons: Format, Minify, Validate; indent selector; Copy, Download, Clear, Load Sample; theme toggle. Emits events to the container.
- `StatusBar.tsx` — presentational. Shows validity, stats, or `line:col — message`.
- `JsonTool.tsx` — `'use client'` container. Owns state: `input` text, `indent`, `viewMode` (`formatted | tree`), `validation` result, `output` text. Wires toolbar actions to `lib/json` calls and the two panes.

### Page — `src/app/`
- `page.tsx` — static Server Component shell (header/title/footer) that renders `<JsonTool />`.
- `layout.tsx` — root layout, Tailwind globals, theme provider.

## 5. Layout

Two-pane (input → output):

```
┌─────────────────────────── Toolbar ───────────────────────────┐
│ Format  Minify  Validate │ Indent:[2▾] │ Copy  Download  Clear  Sample  🌓 │
├───────────────────────────────┬───────────────────────────────┤
│  INPUT (editable)              │  OUTPUT                        │
│  CodeMirror, raw paste/type    │  Formatted ⇄ Tree              │
│                                │  (read-only editor / tree)     │
├───────────────────────────────┴───────────────────────────────┤
│ Status: ● Valid JSON · 12 keys · 1.4 KB   /   ✕ line 4:13 — Unexpected token │
└────────────────────────────────────────────────────────────────┘
```

- Responsive: side-by-side on desktop; stacked (input above output) on narrow screens.
- The Formatted ⇄ Tree toggle lives on the output pane header.

## 6. Behavior & error handling

- **Format/Minify** act on the current input; result goes to the output pane. On parse failure, input is untouched, the status bar shows the error, and the output pane keeps the last good result.
- **Validate** updates the status bar (valid + stats, or `line:col — message`) and places a gutter marker on the input editor.
- **Live linting:** the input editor shows JSON lint markers in the gutter as you type (via CodeMirror's `jsonParseLinter`).
- **Empty input:** neutral idle state — no error, empty output, status bar muted.
- **Large input:** format/validate run synchronously in v1; acceptable for typical sizes. (Worker offloading is a backlog item if needed.)

## 7. Testing

- **Vitest** unit tests for `lib/json/format.ts` and `lib/json/validate.ts`:
  - empty input, whitespace-only input
  - invalid JSON (unexpected token, unterminated string, trailing comma rejected)
  - deeply nested structures
  - unicode and escaped characters
  - large/precise numbers
  - `format` is idempotent (formatting formatted output yields the same string)
  - `minify` round-trips (minify(format(x)) parses to the same value)
  - error `line:col` correctness on a known-bad input
- **Playwright** smoke test: load page → paste JSON → click Format → output pane shows pretty-printed JSON.

## 8. Project tooling

- TypeScript strict mode.
- ESLint + Prettier.
- Tailwind configured with a dark mode class strategy.
- Scripts: `dev`, `build`, `start`, `lint`, `test`, `test:e2e`.

## 9. Build sequence (high level)

1. Scaffold Next.js + Tailwind + TypeScript; configure pnpm, ESLint, Prettier.
2. Implement and unit-test `lib/json/format.ts` and `lib/json/validate.ts` (TDD).
3. Build `JsonEditor.tsx` (CodeMirror wrapper with JSON lang + lint).
4. Build `JsonTool.tsx` container + `Toolbar.tsx` + `StatusBar.tsx`; wire Format/Minify/Validate/indent.
5. Build `JsonTree.tsx` and the Formatted ⇄ Tree toggle.
6. Utilities: copy, download, clear, sample; theme toggle.
7. Responsive layout polish.
8. Playwright smoke test; final pass.
9. Deploy to Vercel.

## 10. North-star backlog (post-v1, ordered roughly)

1. Converters: JSON ↔ CSV, XML, YAML, TSV.
2. Code generators: JSON → TypeScript, Go, Python, etc.
3. JSON compare/diff.
4. Sorter and JSONPath query.
5. File upload / load-from-URL.
6. Accounts, saved links, public/private sharing (introduces a backend + database).
