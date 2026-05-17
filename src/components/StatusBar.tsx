interface Props {
  ok: boolean;
  errorMsg?: string;
  statements: number;
  nodes: number;
  edges: number;
  perfScore: number;
  dialectLabel: string;
  cursorLine: number;
  cursorCol: number;
}

export function StatusBar({ ok, errorMsg, statements, nodes, edges, perfScore, dialectLabel, cursorLine, cursorCol }: Props) {
  const scoreColor =
    perfScore >= 80 ? 'var(--lime)' :
    perfScore >= 60 ? 'var(--amber)' :
                      'var(--rose)';

  return (
    <footer className="statusbar rise" style={{ '--d': '240ms' } as any}>
      <div className="statusbar__group">
        <div className="statusbar__item">
          <span className={ok ? 'dot dot--ok' : 'dot dot--err'} />
          <strong>{ok ? 'parsed' : 'error'}</strong>
          {ok
            ? <span>· {statements} statement{statements === 1 ? '' : 's'}</span>
            : <span style={{ color: 'var(--rose)' }}>· {errorMsg}</span>}
        </div>
        <div className="statusbar__item"><span>cursor</span> <strong>L {cursorLine}, C {cursorCol}</strong></div>
        <div className="statusbar__item"><span>parser</span> <strong>{dialectLabel}</strong></div>
      </div>

      <div className="statusbar__group">
        <div className="statusbar__item">
          <span>performance</span>
          <span className="score"><span className="score__n" style={{ color: scoreColor }}>{perfScore}</span><span className="score__d">/100</span></span>
        </div>
        <div className="statusbar__item"><span>nodes</span> <strong>{nodes}</strong></div>
        <div className="statusbar__item"><span>edges</span> <strong>{edges}</strong></div>
        <div className="statusbar__item" style={{ color: 'var(--accent)' }}>⌘P  command palette</div>
      </div>
    </footer>
  );
}
