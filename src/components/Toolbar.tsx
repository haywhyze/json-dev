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
      <button type="button" className={primary} onClick={props.onFormat}>Format</button>
      <button type="button" className={btn} onClick={props.onMinify}>Minify</button>
      <button type="button" className={btn} onClick={props.onValidate}>Validate</button>

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

      <button type="button" className={btn} onClick={props.onCopy}>Copy</button>
      <button type="button" className={btn} onClick={props.onDownload}>Download</button>
      <button type="button" className={btn} onClick={props.onClear}>Clear</button>
      <button type="button" className={btn} onClick={props.onSample}>Sample</button>
    </div>
  );
}
