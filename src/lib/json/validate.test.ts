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

  it("reports the error line for a multi-line missing comma", () => {
    const r = validate('{\n  "a": 1\n  "b": 2\n}'); // missing comma; error on line 3
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.line).toBe(3);
  });

  it("rejects an unterminated string", () => {
    expect(validate('"abc').ok).toBe(false);
  });

  it("accepts large/precise numbers", () => {
    const r = validate("123456789012345678901234567890");
    expect(r.ok).toBe(true);
  });
});
