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
