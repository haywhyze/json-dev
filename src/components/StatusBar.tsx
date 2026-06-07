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
