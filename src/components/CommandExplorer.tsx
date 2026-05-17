import { useMemo, useState } from 'react';
import { CATEGORIES, COMMANDS, type SqlCommand } from '../data/commands';
import { SAMPLES, type Sample } from '../lib/samples';
import type { DialectId } from '../lib/dialects';

type Tab = 'commands' | 'samples' | 'docs';

interface Props {
  dialect: DialectId;
  onInsertSql: (sql: string) => void;
  onLoadSample: (sample: Sample) => void;
}

export function CommandExplorer({ dialect, onInsertSql, onLoadSample }: Props) {
  const [tab, setTab] = useState<Tab>('commands');
  const [filter, setFilter] = useState('');
  const [activeId, setActiveId] = useState<string | null>('select');

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return COMMANDS;
    return COMMANDS.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.summary.toLowerCase().includes(q) ||
      c.id.includes(q),
    );
  }, [filter]);

  const activeCmd = COMMANDS.find(c => c.id === activeId) ?? null;
  const dialectNote = activeCmd?.notes?.[dialect];
  const unsupported = activeCmd?.unsupported?.includes(dialect);

  return (
    <section className="panel panel--marked rise" style={{ '--d': '60ms' } as any}>
      <div className="panel__header">
        <div className="panel__title">command explorer <span>· {dialect}</span></div>
      </div>

      <div className="explorer-tabs">
        <button className="explorer-tab" data-active={tab === 'commands'} onClick={() => setTab('commands')}>Commands</button>
        <button className="explorer-tab" data-active={tab === 'samples'} onClick={() => setTab('samples')}>Samples</button>
        <button className="explorer-tab" data-active={tab === 'docs'} onClick={() => setTab('docs')}>Docs</button>
      </div>

      {tab === 'commands' && (
        <>
          <div className="explorer-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ash)" strokeWidth="1.6"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
            <input
              placeholder="filter commands…"
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
            <span className="explorer-search__kbd">⌘K</span>
          </div>

          <div className="panel__body">
            {CATEGORIES.map(cat => {
              const items = filtered.filter(c => c.category === cat.id);
              if (items.length === 0) return null;
              return (
                <div key={cat.id} className="explorer-group">
                  <div className="explorer-group__head">
                    <div className="explorer-group__title">{cat.label}</div>
                    <div className="explorer-group__count">{String(items.length).padStart(2, '0')}</div>
                  </div>
                  {items.map(cmd => {
                    const u = cmd.unsupported?.includes(dialect);
                    return (
                      <div
                        key={cmd.id}
                        className="cmd"
                        data-active={cmd.id === activeId}
                        onClick={() => setActiveId(cmd.id)}
                        onDoubleClick={() => onInsertSql(cmd.example)}
                        title="Click to inspect · double-click to insert example"
                      >
                        <div className="cmd__icon">{cmd.name[0]}</div>
                        <div className="cmd__name">{cmd.name}</div>
                        <div className="cmd__meta" style={{ color: u ? 'var(--rose)' : undefined }}>
                          {u ? 'unsupported' : (cmd.notes?.[dialect] ? 'note' : '')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {activeCmd && (
            <CommandDetail cmd={activeCmd} unsupported={!!unsupported} dialectNote={dialectNote} onInsert={onInsertSql} />
          )}
        </>
      )}

      {tab === 'samples' && (
        <div className="panel__body" style={{ padding: 12 }}>
          {SAMPLES.map(s => (
            <button
              key={s.id}
              onClick={() => onLoadSample(s)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                background: 'var(--ink-2)', border: '1px solid var(--rule)',
                borderRadius: 'var(--r-md)', padding: 12, marginBottom: 8,
                color: 'var(--bone)', cursor: 'pointer', fontFamily: 'var(--font-ui)',
              }}
            >
              <div style={{ fontWeight: 500, fontSize: 'var(--fs-md)' }}>{s.title}</div>
              <div className="label-caps" style={{ marginTop: 4 }}>{s.dialect}</div>
              <pre style={{
                margin: '8px 0 0', padding: 8, background: 'var(--ink-1)',
                border: '1px solid var(--rule-soft)', borderRadius: 'var(--r-sm)',
                fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--bone-dim)',
                maxHeight: 90, overflow: 'hidden', whiteSpace: 'pre',
              }}>{s.sql.split('\n').slice(0, 5).join('\n')}</pre>
            </button>
          ))}
        </div>
      )}

      {tab === 'docs' && (
        <div className="panel__body" style={{ padding: 16, color: 'var(--bone-dim)' }}>
          <p style={{ marginTop: 0 }}>
            SQLScout parses SQL with <code style={{ color: 'var(--bone)' }}>node-sql-parser</code> and
            renders an execution-flow map of <code style={{ color: 'var(--bone)' }}>SELECT</code> queries.
            Pick a dialect, paste SQL, and inspect the graph.
          </p>
          <p>
            The <em>Command Explorer</em> on the left is a reference for SQL constructs across 13 dialects,
            with notes flagging differences (e.g. <code style={{ color: 'var(--bone)' }}>FULL OUTER JOIN</code> on MySQL).
          </p>
          <p className="label-caps">shortcuts</p>
          <ul style={{ paddingLeft: 18, lineHeight: 1.8 }}>
            <li><code>⌘↵</code> parse</li>
            <li><code>⇧⌥F</code> format</li>
            <li><code>⌘K</code> filter commands</li>
            <li><kbd>double-click</kbd> a command to insert its example</li>
          </ul>
        </div>
      )}
    </section>
  );
}

function CommandDetail({
  cmd, unsupported, dialectNote, onInsert,
}: {
  cmd: SqlCommand;
  unsupported: boolean;
  dialectNote: string | undefined;
  onInsert: (sql: string) => void;
}) {
  return (
    <div style={{
      flex: '0 0 auto', borderTop: '1px solid var(--rule)',
      background: 'var(--ink-2)', padding: 12, maxHeight: '40%', overflow: 'auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-md)', color: 'var(--bone)' }}>{cmd.name}</div>
        <button
          className="btn"
          style={{ height: 24, fontSize: 'var(--fs-xs)', padding: '0 8px' }}
          onClick={() => onInsert(cmd.example)}
        >insert example</button>
      </div>
      <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--bone-dim)', marginBottom: 8 }}>{cmd.summary}</div>

      {unsupported && (
        <div style={{
          background: 'rgba(255,77,109,0.10)', color: 'var(--rose)',
          border: '1px solid rgba(255,77,109,0.25)', borderRadius: 'var(--r-sm)',
          padding: '6px 8px', fontSize: 'var(--fs-xs)', marginBottom: 8,
          fontFamily: 'var(--font-mono)',
        }}>
          Not supported in current dialect.
        </div>
      )}
      {dialectNote && (
        <div style={{
          background: 'var(--accent-faint)', color: 'var(--accent-soft)',
          border: '1px solid var(--accent-dim)', borderRadius: 'var(--r-sm)',
          padding: '6px 8px', fontSize: 'var(--fs-xs)', marginBottom: 8,
          fontFamily: 'var(--font-mono)',
        }}>
          dialect note · {dialectNote}
        </div>
      )}

      <div className="label-caps" style={{ marginBottom: 4 }}>syntax</div>
      <pre style={{
        margin: 0, padding: 8, background: 'var(--ink-1)',
        border: '1px solid var(--rule-soft)', borderRadius: 'var(--r-sm)',
        fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--bone)',
        whiteSpace: 'pre',
      }}>{cmd.syntax}</pre>

      <div className="label-caps" style={{ margin: '10px 0 4px' }}>example</div>
      <pre style={{
        margin: 0, padding: 8, background: 'var(--ink-1)',
        border: '1px solid var(--rule-soft)', borderRadius: 'var(--r-sm)',
        fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--bone)',
        whiteSpace: 'pre-wrap',
      }}>{cmd.example}</pre>
    </div>
  );
}
