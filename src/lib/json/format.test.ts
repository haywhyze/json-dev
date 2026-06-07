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
