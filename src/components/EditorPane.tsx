import { useEffect, useRef } from 'react';
import Editor, { type Monaco, type OnMount } from '@monaco-editor/react';

interface Props {
  value: string;
  onChange: (next: string) => void;
  dialectLabel: string;
  theme: 'dark' | 'light';
}

export function EditorPane({ value, onChange, dialectLabel, theme }: Props) {
  const monacoRef = useRef<Monaco | null>(null);

  const handleMount: OnMount = (_editor, monaco) => {
    monacoRef.current = monaco;

    monaco.editor.defineTheme('sqlscout-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: 'FF8A4A', fontStyle: 'bold' },
        { token: 'string',  foreground: 'FFD479' },
        { token: 'number',  foreground: '5B9DFF' },
        { token: 'comment', foreground: '4A5263', fontStyle: 'italic' },
        { token: 'operator', foreground: 'B9B3A4' },
        { token: 'identifier', foreground: 'E8E2D2' },
        { token: 'predefined.sql', foreground: 'C7F454' },
      ],
      colors: {
        'editor.background': '#0A0E14',
        'editor.foreground': '#E8E2D2',
        'editor.lineHighlightBackground': '#141B26',
        'editorLineNumber.foreground': '#4A5263',
        'editorLineNumber.activeForeground': '#B9B3A4',
        'editor.selectionBackground': '#FF6B1F2A',
        'editor.inactiveSelectionBackground': '#FF6B1F18',
        'editorCursor.foreground': '#FF6B1F',
        'editorIndentGuide.background1': '#161D27',
        'editorIndentGuide.activeBackground1': '#2A3445',
        'editorWidget.background': '#0F141C',
        'editorWidget.border': '#1E2733',
        'editor.findMatchBackground': '#FF6B1F40',
        'editor.findMatchHighlightBackground': '#FF6B1F20',
      },
    });

    monaco.editor.defineTheme('sqlscout-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: 'DC4B0A', fontStyle: 'bold' },
        { token: 'string',  foreground: '8A5A00' },
        { token: 'number',  foreground: '2563EB' },
        { token: 'comment', foreground: '9298A6', fontStyle: 'italic' },
        { token: 'predefined.sql', foreground: '5B7A1F' },
      ],
      colors: {
        'editor.background': '#FAF7EE',
        'editor.foreground': '#1A1F26',
        'editor.lineHighlightBackground': '#F0EBDD',
        'editorLineNumber.foreground': '#9298A6',
        'editorCursor.foreground': '#DC4B0A',
      },
    });

    monaco.editor.setTheme(theme === 'dark' ? 'sqlscout-dark' : 'sqlscout-light');
  };

  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(theme === 'dark' ? 'sqlscout-dark' : 'sqlscout-light');
    }
  }, [theme]);

  return (
    <section className="panel rise" style={{ '--d': '120ms' } as any}>
      <div className="panel__header">
        <div className="panel__title">editor <span>· untitled.sql</span></div>
        <div className="panel__actions">
          <span className="label-caps" style={{ color: 'var(--ash-dim)' }}>{dialectLabel} · UTF-8 · LF</span>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, background: 'var(--ink-1)' }}>
        <Editor
          height="100%"
          defaultLanguage="sql"
          theme={theme === 'dark' ? 'sqlscout-dark' : 'sqlscout-light'}
          value={value}
          onChange={v => onChange(v ?? '')}
          onMount={handleMount}
          options={{
            fontFamily: 'JetBrains Mono, SF Mono, Menlo, monospace',
            fontSize: 13,
            fontLigatures: true,
            lineNumbersMinChars: 3,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            renderLineHighlight: 'gutter',
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            padding: { top: 12, bottom: 12 },
            tabSize: 2,
            roundedSelection: false,
            renderWhitespace: 'selection',
            guides: { indentation: true },
          }}
        />
      </div>
    </section>
  );
}
