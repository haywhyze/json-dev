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
    const text = output || input;
    if (text) void navigator.clipboard.writeText(text);
  }

  function handleDownload() {
    const text = output || input;
    if (!text) return;
    const blob = new Blob([text], { type: "application/json" });
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
            <button type="button" className={tabBtn(view === "formatted")} onClick={() => setView("formatted")}>
              Formatted
            </button>
            <button type="button" className={tabBtn(view === "tree")} onClick={() => setView("tree")}>
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
