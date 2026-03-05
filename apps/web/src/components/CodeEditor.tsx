import { useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import type { editor as MonacoEditor } from "monaco-editor";

interface CodeEditorProps {
  code: string;
  language: string;
  onChange: (value: string) => void;
  jumpToLine?: number | null;
}

export const CodeEditor = ({ code, language, onChange, jumpToLine }: CodeEditorProps): JSX.Element => {
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    if (!editorRef.current || !jumpToLine) {
      return;
    }
    editorRef.current.revealLineInCenter(jumpToLine);
    editorRef.current.setPosition({ lineNumber: jumpToLine, column: 1 });
    editorRef.current.focus();
  }, [jumpToLine]);

  return (
    <div className="h-[70vh] overflow-hidden rounded-xl border border-border">
      <Editor
        height="70vh"
        language={language}
        value={code}
        onChange={(value) => onChange(value ?? "")}
        onMount={(editor) => {
          editorRef.current = editor;
        }}
        theme="vs-light"
        options={{
          fontSize: 14,
          minimap: { enabled: false },
          automaticLayout: true,
          scrollBeyondLastLine: false
        }}
      />
    </div>
  );
};
