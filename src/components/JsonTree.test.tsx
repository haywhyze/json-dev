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
