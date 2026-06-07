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
