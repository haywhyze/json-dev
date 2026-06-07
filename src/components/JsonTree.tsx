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
