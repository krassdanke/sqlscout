import { useCallback, useEffect, useMemo, useState } from 'react';
import { TopBar } from './components/TopBar';
import { CommandExplorer } from './components/CommandExplorer';
import { EditorPane } from './components/EditorPane';
import { FlowDiagram } from './components/FlowDiagram';
import { StatusBar } from './components/StatusBar';
import { DIALECT_BY_ID, type DialectId } from './lib/dialects';
import { parseSql } from './lib/parser';
import { astToFlow, type FlowGraph } from './lib/ast-to-flow';
import { SAMPLES, type Sample } from './lib/samples';

const EMPTY_GRAPH: FlowGraph = { nodes: [], edges: [], width: 600, height: 400, perfScore: 0, warnings: [] };

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [dialectId, setDialectId] = useState<DialectId>('postgresql');
  const [sql, setSql] = useState<string>(SAMPLES[0].sql);
  const [graph, setGraph] = useState<FlowGraph>(EMPTY_GRAPH);
  const [parseError, setParseError] = useState<string | null>(null);
  const [statementCount, setStatementCount] = useState(0);

  const dialect = DIALECT_BY_ID[dialectId];

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const runParse = useCallback((source: string) => {
    const result = parseSql(source, dialect);
    if (!result.ok) {
      setParseError(result.error?.message ?? 'unknown parse error');
      setStatementCount(0);
      setGraph(EMPTY_GRAPH);
      return;
    }
    setParseError(null);
    setStatementCount(result.statements.length);
    setGraph(astToFlow(result.statements.map(s => s.ast)));
  }, [dialect]);

  // Auto-parse on debounce
  useEffect(() => {
    const t = setTimeout(() => runParse(sql), 250);
    return () => clearTimeout(t);
  }, [sql, runParse]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'Enter') { e.preventDefault(); runParse(sql); }
      if (mod && e.shiftKey && e.altKey && e.key.toLowerCase() === 'f') { e.preventDefault(); handleFormat(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sql, runParse]);

  const handleFormat = useCallback(() => {
    // Naive formatter: uppercase top-level keywords; deeper formatting is post-MVP.
    const KW = /\b(select|from|where|group by|order by|having|limit|join|inner join|left join|right join|full outer join|cross join|on|with|recursive|union|union all|insert|update|delete|values|case|when|then|else|end|as|and|or|not|null|is|between|in|like|distinct|create|alter|drop|truncate|table|view|index|begin|commit|rollback|over|partition by|interval|date_trunc|now|count|sum|avg|min|max|coalesce|cast)\b/gi;
    setSql(prev => prev.replace(KW, m => m.toUpperCase()));
  }, []);

  const handleExport = useCallback(() => {
    const out = JSON.stringify({ dialect: dialect.id, nodes: graph.nodes, edges: graph.edges }, null, 2);
    const blob = new Blob([out], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'sqlscout-flow.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [graph, dialect.id]);

  const handleLoadSample = useCallback((s: Sample) => {
    setSql(s.sql);
    if (s.dialect !== 'any') setDialectId(s.dialect);
  }, []);

  const handleInsertSql = useCallback((snippet: string) => {
    setSql(prev => (prev.trimEnd() + '\n\n' + snippet + '\n'));
  }, []);

  const cursor = useMemo(() => {
    const lines = sql.split('\n');
    return { line: lines.length, col: (lines[lines.length - 1]?.length ?? 0) + 1 };
  }, [sql]);

  return (
    <>
      <div className="app-bg" aria-hidden />
      <div className="app">
        <TopBar
          dialect={dialect}
          onDialectChange={setDialectId}
          onParse={() => runParse(sql)}
          onFormat={handleFormat}
          onExport={handleExport}
          onThemeToggle={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
          theme={theme}
        />

        <main className="main">
          <CommandExplorer dialect={dialectId} onInsertSql={handleInsertSql} onLoadSample={handleLoadSample} />
          <EditorPane value={sql} onChange={setSql} dialectLabel={dialect.label} theme={theme} />
          <FlowDiagram graph={graph} parseError={parseError} />
        </main>

        <StatusBar
          ok={!parseError}
          errorMsg={parseError ?? undefined}
          statements={statementCount}
          nodes={graph.nodes.length}
          edges={graph.edges.length}
          perfScore={graph.perfScore}
          dialectLabel={`${dialect.label.toLowerCase()} · ${dialect.version}`}
          cursorLine={cursor.line}
          cursorCol={cursor.col}
        />
      </div>
    </>
  );
}
