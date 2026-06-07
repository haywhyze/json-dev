export type Indent = 2 | 4 | "tab";

export interface ValidationStats {
  keys: number;
  bytes: number;
  depth: number;
}

export type ValidationResult =
  | { ok: true; value: unknown; stats: ValidationStats }
  | { ok: false; error: { line: number; col: number; message: string } };
