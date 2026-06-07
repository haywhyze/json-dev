# JSON Formatter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fast, client-side JSON formatter web app (format, minify, validate with error locations, interactive tree view) in a two-pane layout.

**Architecture:** Next.js App Router on Vercel. Pure, framework-agnostic JSON logic lives in `src/lib/json/*` and is fully unit-tested; thin React client components in `src/components/*` call that logic. The page shell is a static Server Component; the interactive tool is a Client Component. No backend.

**Tech Stack:** Next.js (App Router) + TypeScript, Tailwind CSS, CodeMirror 6 (`@uiw/react-codemirror` + `@codemirror/lang-json` + `@codemirror/lint`), `next-themes`, Vitest + React Testing Library, Playwright. pnpm.

---

## File Structure

| Path | Responsibility |
|---|---|
| `src/lib/json/types.ts` | Shared types: `Indent`, `ValidationStats`, `ValidationResult` |
| `src/lib/json/validate.ts` | `validate(text)`, `offsetToLineCol(text, offset)` — pure parse + stats + error position |
| `src/lib/json/format.ts` | `format(text, indent)`, `minify(text)` — pure pretty-print/compact |
| `src/lib/json/sample.ts` | `SAMPLE_JSON` constant (compact, so Format visibly changes it) |
| `src/components/JsonEditor.tsx` | `'use client'` CodeMirror 6 wrapper (value, onChange, readOnly, lint) |
| `src/components/JsonTree.tsx` | `'use client'` recursive collapsible tree of a parsed value |
| `src/components/Toolbar.tsx` | `'use client'` presentational action bar |
| `src/components/StatusBar.tsx` | presentational validity/stats/error line |
| `src/components/JsonTool.tsx` | `'use client'` container: owns state, wires toolbar → logic → panes |
| `src/components/ThemeProvider.tsx` | `'use client'` next-themes provider |
| `src/components/ThemeToggle.tsx` | `'use client'` light/dark toggle button |
| `src/app/layout.tsx` | Root layout, wraps children in ThemeProvider |
| `src/app/page.tsx` | Static shell: header + `<JsonTool />` |
| `src/app/globals.css` | Tailwind import + dark-mode variant |
| `vitest.config.ts`, `vitest.setup.ts` | Test runner config |
| `playwright.config.ts`, `e2e/format.spec.ts` | Smoke test |

---

## Task 1: Scaffold project & tooling

**Files:**
- Create (generated): Next.js project files in repo root
- Create: `vitest.config.ts`, `vitest.setup.ts`, `playwright.config.ts`
- Modify: `package.json` (scripts)

- [ ] **Step 1: Scaffold Next.js into a temp dir, then merge into the repo root**

The repo root already contains `.git`, `docs/`, `.gitignore`, `.claude/`. Scaffold into a sibling temp dir (skipping install) and copy the generated files in, preserving our git history and spec.

```bash
cd /Users/yusuf/Documents/dev
pnpm create next-app@latest json-dev-tmp \
  --ts --tailwind --eslint --app --src-dir \
  --import-alias "@/*" --use-pnpm --turbopack --skip-install --yes
rm -rf json-dev-tmp/.git
cp -R json-dev-tmp/. json-dev/
rm -rf json-dev-tmp
cd /Users/yusuf/Documents/dev/json-dev
pnpm install
```

Expected: `json-dev` now has `package.json`, `next.config.ts`, `tsconfig.json`, `src/app/`, etc. The Next.js `.gitignore` overwrites ours (it is more complete). `docs/` and git history are untouched.

- [ ] **Step 2: Add runtime and dev dependencies**

```bash
cd /Users/yusuf/Documents/dev/json-dev
pnpm add @uiw/react-codemirror @codemirror/lang-json @codemirror/lint @codemirror/view next-themes
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @playwright/test
pnpm exec playwright install chromium
```

Expected: all packages install without peer-dependency errors.

- [ ] **Step 3: Create the Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    exclude: ["e2e/**", "node_modules/**", ".next/**"],
  },
  resolve: {
    alias: { "@": resolve(__dirname, "./src") },
  },
});
```

Create `vitest.setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: Create the Playwright config**

Create `playwright.config.ts`:

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://localhost:3000" },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

- [ ] **Step 5: Add test scripts to `package.json`**

In `package.json`, add these to the `"scripts"` object (keep the existing `dev`/`build`/`start`/`lint`):

```json
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
```

- [ ] **Step 6: Verify the toolchain runs**

Run: `pnpm test`
Expected: Vitest starts and reports "No test files found" (exit 0) — config is valid.

Run: `pnpm build`
Expected: Next.js build succeeds (default scaffold page).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with test tooling"
```

---

## Task 2: JSON types + `validate` (TDD)

**Files:**
- Create: `src/lib/json/types.ts`
- Create: `src/lib/json/validate.ts`
- Test: `src/lib/json/validate.test.ts`

- [ ] **Step 1: Create the shared types**

Create `src/lib/json/types.ts`:

```ts
export type Indent = 2 | 4 | "tab";

export interface ValidationStats {
  keys: number;
  bytes: number;
  depth: number;
}

export type ValidationResult =
  | { ok: true; value: unknown; stats: ValidationStats }
  | { ok: false; error: { line: number; col: number; message: string } };
```

- [ ] **Step 2: Write the failing tests**

Create `src/lib/json/validate.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { validate, offsetToLineCol } from "./validate";

describe("offsetToLineCol", () => {
  it("maps an offset on the first line", () => {
    expect(offsetToLineCol("hello", 2)).toEqual({ line: 1, col: 3 });
  });

  it("maps an offset after newlines", () => {
    // "a\nbc\nd" -> offset 5 is the 'd' on line 3
    expect(offsetToLineCol("a\nbc\nd", 5)).toEqual({ line: 3, col: 1 });
  });
});

describe("validate", () => {
  it("rejects empty input", () => {
    const r = validate("   ");
    expect(r.ok).toBe(false);
  });

  it("accepts valid JSON and returns the parsed value", () => {
    const r = validate('{"a":1}');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual({ a: 1 });
  });

  it("computes stats: keys, depth, bytes", () => {
    const r = validate('{"a":{"b":1},"c":[1,2]}');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.stats.keys).toBe(3); // a, b, c
      expect(r.stats.depth).toBe(2); // object -> nested object/array
      expect(r.stats.bytes).toBeGreaterThan(0);
    }
  });

  it("rejects invalid JSON with a 1-based position", () => {
    const r = validate("{ bad }");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.line).toBeGreaterThanOrEqual(1);
      expect(r.error.col).toBeGreaterThanOrEqual(1);
      expect(r.error.message.length).toBeGreaterThan(0);
    }
  });

  it("rejects trailing commas", () => {
    expect(validate('{"a":1,}').ok).toBe(false);
  });

  it("counts unicode bytes, not characters", () => {
    const r = validate('"é"'); // é is 2 UTF-8 bytes plus 2 quotes
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.stats.bytes).toBe(4);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm test src/lib/json/validate.test.ts`
Expected: FAIL — `validate` / `offsetToLineCol` not defined.

- [ ] **Step 4: Implement `validate.ts`**

Create `src/lib/json/validate.ts`:

```ts
import type { ValidationResult, ValidationStats } from "./types";

export function offsetToLineCol(
  text: string,
  offset: number,
): { line: number; col: number } {
  let line = 1;
  let col = 1;
  const end = Math.min(offset, text.length);
  for (let i = 0; i < end; i++) {
    if (text[i] === "\n") {
      line++;
      col = 1;
    } else {
      col++;
    }
  }
  return { line, col };
}

function cleanMessage(message: string): string {
  // Drop the trailing "in JSON at position ..." / "(line .. column ..)" noise.
  return message
    .replace(/\s*in JSON at position \d+.*$/i, "")
    .replace(/\s*\(line \d+ column \d+\)\s*$/i, "")
    .trim();
}

function toErrorPosition(
  text: string,
  error: Error,
): { line: number; col: number; message: string } {
  const message = error.message;
  const lineCol = message.match(/line (\d+) column (\d+)/i);
  if (lineCol) {
    return {
      line: Number(lineCol[1]),
      col: Number(lineCol[2]),
      message: cleanMessage(message),
    };
  }
  const pos = message.match(/position (\d+)/i);
  if (pos) {
    const { line, col } = offsetToLineCol(text, Number(pos[1]));
    return { line, col, message: cleanMessage(message) };
  }
  return { line: 1, col: 1, message: cleanMessage(message) };
}

function countKeys(value: unknown): number {
  if (Array.isArray(value)) {
    return value.reduce<number>((n, v) => n + countKeys(v), 0);
  }
  if (value !== null && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj);
    return keys.length + keys.reduce<number>((n, k) => n + countKeys(obj[k]), 0);
  }
  return 0;
}

function computeDepth(value: unknown): number {
  if (Array.isArray(value)) {
    return 1 + value.reduce<number>((m, v) => Math.max(m, computeDepth(v)), 0);
  }
  if (value !== null && typeof value === "object") {
    const vals = Object.values(value as Record<string, unknown>);
    return 1 + vals.reduce<number>((m, v) => Math.max(m, computeDepth(v)), 0);
  }
  return 0;
}

function computeStats(text: string, value: unknown): ValidationStats {
  return {
    keys: countKeys(value),
    depth: computeDepth(value),
    bytes: new TextEncoder().encode(text).length,
  };
}

export function validate(text: string): ValidationResult {
  if (text.trim() === "") {
    return { ok: false, error: { line: 1, col: 1, message: "Empty input" } };
  }
  try {
    const value = JSON.parse(text);
    return { ok: true, value, stats: computeStats(text, value) };
  } catch (e) {
    return { ok: false, error: toErrorPosition(text, e as Error) };
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm test src/lib/json/validate.test.ts`
Expected: PASS (all cases).

- [ ] **Step 6: Commit**

```bash
git add src/lib/json/types.ts src/lib/json/validate.ts src/lib/json/validate.test.ts
git commit -m "feat: add JSON validate with stats and error position"
```

---

## Task 3: `format` + `minify` (TDD)

**Files:**
- Create: `src/lib/json/format.ts`
- Test: `src/lib/json/format.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/json/format.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { format, minify } from "./format";

describe("format", () => {
  it("pretty-prints with 2-space indent", () => {
    expect(format('{"a":1}', 2)).toBe('{\n  "a": 1\n}');
  });

  it("pretty-prints with 4-space indent", () => {
    expect(format('{"a":1}', 4)).toBe('{\n    "a": 1\n}');
  });

  it("pretty-prints with tab indent", () => {
    expect(format('{"a":1}', "tab")).toBe('{\n\t"a": 1\n}');
  });

  it("is idempotent", () => {
    const once = format('{"a":[1,2],"b":{"c":3}}', 2);
    expect(format(once, 2)).toBe(once);
  });

  it("throws on invalid JSON", () => {
    expect(() => format("{bad}", 2)).toThrow();
  });
});

describe("minify", () => {
  it("removes all insignificant whitespace", () => {
    expect(minify('{\n  "a": 1\n}')).toBe('{"a":1}');
  });

  it("round-trips with format", () => {
    const src = '{"a":[1,2],"b":{"c":3}}';
    expect(minify(format(src, 4))).toBe(src);
  });

  it("throws on invalid JSON", () => {
    expect(() => minify("nope")).toThrow();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test src/lib/json/format.test.ts`
Expected: FAIL — `format` / `minify` not defined.

- [ ] **Step 3: Implement `format.ts`**

Create `src/lib/json/format.ts`:

```ts
import type { Indent } from "./types";

function indentArg(indent: Indent): string | number {
  return indent === "tab" ? "\t" : indent;
}

export function format(text: string, indent: Indent): string {
  const value = JSON.parse(text);
  return JSON.stringify(value, null, indentArg(indent));
}

export function minify(text: string): string {
  const value = JSON.parse(text);
  return JSON.stringify(value);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test src/lib/json/format.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/json/format.ts src/lib/json/format.test.ts
git commit -m "feat: add JSON format and minify"
```

---

## Task 4: Sample data + `JsonEditor` component

**Files:**
- Create: `src/lib/json/sample.ts`
- Create: `src/components/JsonEditor.tsx`

- [ ] **Step 1: Create the sample constant**

Create `src/lib/json/sample.ts` (compact on purpose, so "Format" visibly changes it):

```ts
export const SAMPLE_JSON =
  '{"name":"json-formatter","version":"1.0.0","private":true,"keywords":["json","formatter","viewer"],"settings":{"indent":2,"theme":"system"},"active":true,"nullable":null}';
```

- [ ] **Step 2: Create the CodeMirror wrapper**

Create `src/components/JsonEditor.tsx`:

```tsx
"use client";

import CodeMirror from "@uiw/react-codemirror";
import { json, jsonParseLinter } from "@codemirror/lang-json";
import { lintGutter, linter } from "@codemirror/lint";
import { EditorView } from "@codemirror/view";
import { useTheme } from "next-themes";
import type { Extension } from "@codemirror/state";

interface JsonEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  lint?: boolean;
}

export function JsonEditor({
  value,
  onChange,
  readOnly = false,
  lint = false,
}: JsonEditorProps) {
  const { resolvedTheme } = useTheme();
  const extensions: Extension[] = [json(), EditorView.lineWrapping];
  if (lint) {
    extensions.push(linter(jsonParseLinter()), lintGutter());
  }
  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      extensions={extensions}
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      height="100%"
      style={{ height: "100%", fontSize: "13px" }}
      basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: !readOnly }}
    />
  );
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no type errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/json/sample.ts src/components/JsonEditor.tsx
git commit -m "feat: add JSON CodeMirror editor and sample data"
```

---

## Task 5: `Toolbar` + `StatusBar`

**Files:**
- Create: `src/components/Toolbar.tsx`
- Create: `src/components/StatusBar.tsx`

- [ ] **Step 1: Create the Toolbar**

Create `src/components/Toolbar.tsx`:

```tsx
"use client";

import type { Indent } from "@/lib/json/types";

interface ToolbarProps {
  indent: Indent;
  onIndentChange: (indent: Indent) => void;
  onFormat: () => void;
  onMinify: () => void;
  onValidate: () => void;
  onCopy: () => void;
  onDownload: () => void;
  onClear: () => void;
  onSample: () => void;
}

const btn =
  "rounded px-2.5 py-1 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800";
const primary =
  "rounded bg-sky-600 px-2.5 py-1 text-sm font-medium text-white hover:bg-sky-500";

export function Toolbar(props: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-zinc-200 px-2 py-1.5 dark:border-zinc-800">
      <button className={primary} onClick={props.onFormat}>Format</button>
      <button className={btn} onClick={props.onMinify}>Minify</button>
      <button className={btn} onClick={props.onValidate}>Validate</button>

      <span className="mx-1 h-5 w-px bg-zinc-200 dark:bg-zinc-700" />

      <label className="flex items-center gap-1 text-sm">
        Indent:
        <select
          className="rounded border border-zinc-300 bg-transparent px-1 py-0.5 dark:border-zinc-700"
          value={props.indent}
          onChange={(e) =>
            props.onIndentChange(
              e.target.value === "tab" ? "tab" : (Number(e.target.value) as Indent),
            )
          }
        >
          <option value={2}>2 spaces</option>
          <option value={4}>4 spaces</option>
          <option value="tab">Tab</option>
        </select>
      </label>

      <span className="mx-1 h-5 w-px bg-zinc-200 dark:bg-zinc-700" />

      <button className={btn} onClick={props.onCopy}>Copy</button>
      <button className={btn} onClick={props.onDownload}>Download</button>
      <button className={btn} onClick={props.onClear}>Clear</button>
      <button className={btn} onClick={props.onSample}>Sample</button>
    </div>
  );
}
```

- [ ] **Step 2: Create the StatusBar**

Create `src/components/StatusBar.tsx`:

```tsx
import type { ValidationResult } from "@/lib/json/types";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function StatusBar({ result }: { result: ValidationResult | null }) {
  if (result === null) {
    return (
      <div className="border-t border-zinc-200 px-3 py-1 text-sm text-zinc-500 dark:border-zinc-800">
        Ready
      </div>
    );
  }
  if (result.ok) {
    return (
      <div className="border-t border-zinc-200 px-3 py-1 text-sm text-emerald-600 dark:border-zinc-800 dark:text-emerald-400">
        ● Valid JSON · {result.stats.keys} keys · depth {result.stats.depth} ·{" "}
        {formatBytes(result.stats.bytes)}
      </div>
    );
  }
  return (
    <div className="border-t border-zinc-200 px-3 py-1 text-sm text-red-600 dark:border-zinc-800 dark:text-red-400">
      ✕ line {result.error.line}:{result.error.col} — {result.error.message}
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no type errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/Toolbar.tsx src/components/StatusBar.tsx
git commit -m "feat: add toolbar and status bar"
```

---

## Task 6: `JsonTool` container

**Files:**
- Create: `src/components/JsonTool.tsx`

(`JsonTree` does not exist yet — Task 7 adds it. This task renders only the "Formatted" view; the Tree toggle button is wired but renders a placeholder until Task 7.)

- [ ] **Step 1: Create the container**

Create `src/components/JsonTool.tsx`:

```tsx
"use client";

import { useState } from "react";
import { JsonEditor } from "./JsonEditor";
import { Toolbar } from "./Toolbar";
import { StatusBar } from "./StatusBar";
import { format, minify } from "@/lib/json/format";
import { validate } from "@/lib/json/validate";
import { SAMPLE_JSON } from "@/lib/json/sample";
import type { Indent, ValidationResult } from "@/lib/json/types";

type ViewMode = "formatted" | "tree";

export function JsonTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [indent, setIndent] = useState<Indent>(2);
  const [view, setView] = useState<ViewMode>("formatted");
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [parsed, setParsed] = useState<unknown>(null);

  function runValidate(): ValidationResult {
    const r = validate(input);
    setResult(r);
    setParsed(r.ok ? r.value : null);
    return r;
  }

  function handleFormat() {
    const r = runValidate();
    if (r.ok) setOutput(format(input, indent));
  }

  function handleMinify() {
    const r = runValidate();
    if (r.ok) setOutput(minify(input));
  }

  function handleCopy() {
    if (output) void navigator.clipboard.writeText(output);
  }

  function handleDownload() {
    const blob = new Blob([output || input], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "data.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleClear() {
    setInput("");
    setOutput("");
    setResult(null);
    setParsed(null);
  }

  const tabBtn = (active: boolean) =>
    `rounded px-2 py-0.5 text-sm ${active ? "bg-zinc-200 font-semibold dark:bg-zinc-700" : "text-zinc-500"}`;

  return (
    <div className="flex h-full flex-col">
      <Toolbar
        indent={indent}
        onIndentChange={setIndent}
        onFormat={handleFormat}
        onMinify={handleMinify}
        onValidate={runValidate}
        onCopy={handleCopy}
        onDownload={handleDownload}
        onClear={handleClear}
        onSample={() => setInput(SAMPLE_JSON)}
      />
      <div className="grid flex-1 grid-cols-1 gap-px overflow-hidden bg-zinc-200 dark:bg-zinc-800 md:grid-cols-2">
        <div className="min-h-0 overflow-auto bg-white dark:bg-zinc-950">
          <JsonEditor value={input} onChange={setInput} lint />
        </div>
        <div className="flex min-h-0 flex-col overflow-hidden bg-white dark:bg-zinc-950">
          <div className="flex gap-1 border-b border-zinc-200 p-1 dark:border-zinc-800">
            <button className={tabBtn(view === "formatted")} onClick={() => setView("formatted")}>
              Formatted
            </button>
            <button className={tabBtn(view === "tree")} onClick={() => setView("tree")}>
              Tree
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {view === "formatted" ? (
              <JsonEditor value={output} readOnly />
            ) : (
              <div className="p-3 text-sm text-zinc-500">Tree view coming in Task 7.</div>
            )}
          </div>
        </div>
      </div>
      <StatusBar result={result} />
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/JsonTool.tsx
git commit -m "feat: add JsonTool container wiring format/minify/validate"
```

---

## Task 7: `JsonTree` + view toggle (TDD render test)

**Files:**
- Create: `src/components/JsonTree.tsx`
- Test: `src/components/JsonTree.test.tsx`
- Modify: `src/components/JsonTool.tsx` (replace the Tree placeholder)

- [ ] **Step 1: Write the failing render test**

Create `src/components/JsonTree.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { JsonTree } from "./JsonTree";

describe("JsonTree", () => {
  it("renders object keys and primitive values", () => {
    render(<JsonTree data={{ name: "ada", age: 36, admin: true, extra: null }} />);
    expect(screen.getByText(/"name"/)).toBeInTheDocument();
    expect(screen.getByText(/"ada"/)).toBeInTheDocument();
    expect(screen.getByText("36")).toBeInTheDocument();
    expect(screen.getByText("true")).toBeInTheDocument();
    expect(screen.getByText("null")).toBeInTheDocument();
  });

  it("renders array items", () => {
    render(<JsonTree data={[10, 20]} />);
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test src/components/JsonTree.test.tsx`
Expected: FAIL — `JsonTree` not defined.

- [ ] **Step 3: Implement `JsonTree.tsx`**

Create `src/components/JsonTree.tsx`:

```tsx
"use client";

import { useState } from "react";

export function JsonTree({ data }: { data: unknown }) {
  if (data === null || typeof data !== "object") {
    return (
      <div className="p-3 font-mono text-sm">
        <ValueLeaf value={data} />
      </div>
    );
  }
  return (
    <div className="p-3 font-mono text-sm">
      <TreeNode name={null} value={data} />
    </div>
  );
}

function TreeNode({ name, value }: { name: string | null; value: unknown }) {
  const [open, setOpen] = useState(true);
  const isContainer = value !== null && typeof value === "object";

  if (!isContainer) {
    return (
      <div className="pl-4">
        {name !== null && <span className="text-sky-600 dark:text-sky-400">&quot;{name}&quot;: </span>}
        <ValueLeaf value={value} />
      </div>
    );
  }

  const isArray = Array.isArray(value);
  const entries: [string, unknown][] = isArray
    ? (value as unknown[]).map((v, i) => [String(i), v])
    : Object.entries(value as Record<string, unknown>);
  const open0 = isArray ? "[" : "{";
  const close0 = isArray ? "]" : "}";

  return (
    <div className="pl-4">
      <button className="text-left" onClick={() => setOpen(!open)}>
        <span className="select-none text-zinc-400">{open ? "▾" : "▸"} </span>
        {name !== null && <span className="text-sky-600 dark:text-sky-400">&quot;{name}&quot;: </span>}
        <span className="text-zinc-500">
          {open0}
          {!open && `…${entries.length}${close0}`}
        </span>
      </button>
      {open && (
        <div>
          {entries.map(([k, v]) => (
            <TreeNode key={k} name={k} value={v} />
          ))}
          <div className="pl-4 text-zinc-500">{close0}</div>
        </div>
      )}
    </div>
  );
}

function ValueLeaf({ value }: { value: unknown }) {
  if (typeof value === "string")
    return <span className="text-emerald-600 dark:text-emerald-400">&quot;{value}&quot;</span>;
  if (typeof value === "number")
    return <span className="text-amber-600 dark:text-amber-400">{value}</span>;
  if (typeof value === "boolean")
    return <span className="text-purple-600 dark:text-purple-400">{String(value)}</span>;
  if (value === null) return <span className="text-zinc-400">null</span>;
  return <span>{String(value)}</span>;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test src/components/JsonTree.test.tsx`
Expected: PASS.

- [ ] **Step 5: Wire `JsonTree` into the container**

In `src/components/JsonTool.tsx`, add the import near the other component imports:

```tsx
import { JsonTree } from "./JsonTree";
```

Then replace this placeholder block:

```tsx
            ) : (
              <div className="p-3 text-sm text-zinc-500">Tree view coming in Task 7.</div>
            )}
```

with:

```tsx
            ) : (
              <JsonTree data={parsed} />
            )}
```

- [ ] **Step 6: Verify tests + types still pass**

Run: `pnpm test && pnpm exec tsc --noEmit`
Expected: all tests PASS, no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/JsonTree.tsx src/components/JsonTree.test.tsx src/components/JsonTool.tsx
git commit -m "feat: add interactive JSON tree view and toggle"
```

---

## Task 8: Theme + page shell + dark-mode CSS

**Files:**
- Create: `src/components/ThemeProvider.tsx`
- Create: `src/components/ThemeToggle.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Create the ThemeProvider**

Create `src/components/ThemeProvider.tsx`:

```tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </NextThemesProvider>
  );
}
```

- [ ] **Step 2: Create the ThemeToggle**

Create `src/components/ThemeToggle.tsx`:

```tsx
"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <span className="w-6" aria-hidden />;
  return (
    <button
      className="rounded px-2 py-1 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
      aria-label="Toggle theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {resolvedTheme === "dark" ? "🌞" : "🌙"}
    </button>
  );
}
```

- [ ] **Step 3: Wrap the app in the ThemeProvider**

Replace `src/app/layout.tsx` with (keep the existing font setup if present; this is the minimal correct version):

```tsx
import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "JSON Formatter",
  description: "Format, validate, and explore JSON.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-white text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Build the page shell**

Replace `src/app/page.tsx` with:

```tsx
import { JsonTool } from "@/components/JsonTool";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Home() {
  return (
    <main className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
        <h1 className="text-lg font-semibold">JSON Formatter</h1>
        <ThemeToggle />
      </header>
      <div className="min-h-0 flex-1 overflow-hidden">
        <JsonTool />
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Enable the dark-mode class variant in CSS**

`src/app/globals.css` (Tailwind v4, the create-next-app default) begins with `@import "tailwindcss";`. Immediately after that line, add:

```css
@custom-variant dark (&:where(.dark, .dark *));
```

> If the project instead has a `tailwind.config.ts` (Tailwind v3), skip the CSS line above and set `darkMode: "class"` in that config's top-level object.

- [ ] **Step 6: Run the app and verify manually**

Run: `pnpm dev`
Open http://localhost:3000 and verify:
- Click **Sample**, then **Format** → right pane shows pretty-printed JSON.
- Switch to **Tree** → collapsible tree renders; clicking ▾ collapses a node.
- Break the JSON (delete a brace) → status bar shows `✕ line:col — …` and a gutter marker appears.
- Toggle the theme button → UI and editor switch light/dark.

- [ ] **Step 7: Verify build + tests**

Run: `pnpm exec tsc --noEmit && pnpm test && pnpm build`
Expected: no type errors, tests pass, production build succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/components/ThemeProvider.tsx src/components/ThemeToggle.tsx src/app/layout.tsx src/app/page.tsx src/app/globals.css
git commit -m "feat: add theming, page shell, and dark mode"
```

---

## Task 9: Playwright smoke test

**Files:**
- Create: `e2e/format.spec.ts`

- [ ] **Step 1: Write the smoke test**

Create `e2e/format.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("loads sample and formats it", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Sample" }).click();
  await page.getByRole("button", { name: "Format" }).click();

  // The output pane (read-only editor) should contain pretty-printed JSON.
  await expect(page.getByText('"name": "json-formatter"')).toBeVisible();

  // Status bar reports valid JSON.
  await expect(page.getByText(/Valid JSON/)).toBeVisible();
});
```

- [ ] **Step 2: Run the smoke test**

Run: `pnpm test:e2e`
Expected: PASS (Playwright boots `pnpm dev`, runs the flow).

- [ ] **Step 3: Commit**

```bash
git add e2e/format.spec.ts playwright.config.ts
git commit -m "test: add Playwright smoke test for format flow"
```

---

## Task 10: Deploy to Vercel

**Files:** none (deploy step)

- [ ] **Step 1: Final verification**

Run: `pnpm exec tsc --noEmit && pnpm test && pnpm build`
Expected: clean.

- [ ] **Step 2: Deploy**

Use the `vercel:deploy` skill, or:

```bash
pnpm dlx vercel@latest        # preview
pnpm dlx vercel@latest --prod # production
```

Expected: a live preview URL, then a production URL. No env vars or backend required.

- [ ] **Step 3: Commit any Vercel config produced**

```bash
git add -A
git commit -m "chore: vercel deploy config" || echo "nothing to commit"
```

---

## Self-Review Notes

- **Spec coverage:** Format/Minify/Validate (Tasks 2,3,6), tree viewer + toggle (Task 7), syntax highlight + inline lint (Task 4 `lint` prop), copy/download/clear/sample (Tasks 5,6), two-pane responsive layout (Task 6 `md:grid-cols-2`), error handling — input never cleared, gutter marker, `line:col` status, last-good output retained (Tasks 2,6,8), theme (Task 8), testing — Vitest units + RTL + Playwright smoke (Tasks 2,3,7,9). All spec sections map to a task.
- **Types:** `Indent`, `ValidationResult`, `ValidationStats` defined once in `types.ts` and consumed consistently; `validate` returns `{ok:true, value, stats}` and the container reads `r.value`/`r.stats`; `format`/`minify` signatures match call sites.
- **No placeholders:** every code step contains complete code; the only intentional temporary stub (Task 6 Tree placeholder) is explicitly replaced in Task 7 Step 5.
