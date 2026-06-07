"use client";

import CodeMirror from "@uiw/react-codemirror";
import { json, jsonParseLinter } from "@codemirror/lang-json";
import { lintGutter, linter } from "@codemirror/lint";
import { EditorView } from "@codemirror/view";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import type { Extension } from "@codemirror/state";

interface JsonEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  lint?: boolean;
}

export function JsonEditor({
  value,
  onChange,
  readOnly = false,
  lint = false,
}: JsonEditorProps) {
  const { resolvedTheme } = useTheme();
  // Avoid an SSR/client hydration mismatch: next-themes resolves the theme only
  // on the client, so render "light" until mounted, then reflect the real theme.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const extensions: Extension[] = [json(), EditorView.lineWrapping];
  if (lint) {
    extensions.push(linter(jsonParseLinter()), lintGutter());
  }
  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      extensions={extensions}
      theme={mounted && resolvedTheme === "dark" ? "dark" : "light"}
      height="100%"
      style={{ height: "100%", fontSize: "13px" }}
      basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: !readOnly }}
    />
  );
}
