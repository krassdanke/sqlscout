import { useState } from 'react';
import { DIALECTS, type DialectId, type Dialect } from '@sqlscout/core';

interface Props {
  dialect: Dialect;
  onDialectChange: (id: DialectId) => void;
  onParse: () => void;
  onFormat: () => void;
  onExport: () => void;
  onThemeToggle: () => void;
  theme: 'dark' | 'light';
}

export function TopBar({ dialect, onDialectChange, onParse, onFormat, onExport, onThemeToggle, theme }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <header className="topbar rise" style={{ '--d': '0ms' } as any}>
      <div className="brand">
        <div className="brand__mark">sql<em>scout</em></div>
        <div className="brand__tag">v0.1 · alpha</div>
      </div>

      <div className="topbar__center" style={{ position: 'relative' }}>
        <button className="dialect-picker" type="button" onClick={() => setOpen(o => !o)}>
          <span className="dialect-picker__dot" />
          <span>{dialect.label.toUpperCase()}</span>
          <span className="label-caps" style={{ color: 'var(--ash-dim)' }}>{dialect.version}</span>
          <span className="dialect-picker__chev">▾</span>
        </button>

        {open && (
          <div
            role="listbox"
            style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: '50%', transform: 'translateX(-50%)',
              minWidth: 220, zIndex: 60,
              background: 'var(--ink-3)', border: '1px solid var(--rule)',
              borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow-2)',
              padding: 4,
            }}
          >
            {DIALECTS.map(d => (
              <button
                key={d.id}
                onClick={() => { onDialectChange(d.id); setOpen(false); }}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 8,
                  width: '100%', padding: '6px 10px', textAlign: 'left',
                  background: d.id === dialect.id ? 'var(--accent-faint)' : 'transparent',
                  border: 0, borderRadius: 'var(--r-sm)',
                  color: 'var(--bone)', cursor: 'pointer',
                  fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)',
                }}
              >
                <span>{d.label}</span>
                <span className="label-caps" style={{ color: 'var(--ash-dim)' }}>{d.version}</span>
              </button>
            ))}
          </div>
        )}

        <button className="btn btn--ghost" type="button" onClick={onFormat}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 6h16M4 12h10M4 18h16"/></svg>
          Format
          <span className="btn__kbd">⇧⌥F</span>
        </button>

        <button className="btn btn--accent" type="button" onClick={onParse}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4l14 8-14 8V4z"/></svg>
          Parse
          <span className="btn__kbd">⌘↵</span>
        </button>

        <button className="btn" type="button" onClick={onExport}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16"/></svg>
          Export
        </button>
      </div>

      <div className="topbar__right">
        <button className="icon-btn" title="Toggle theme" onClick={onThemeToggle}>
          {theme === 'dark'
            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"/></svg>
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/></svg>}
        </button>
        <button className="icon-btn" title="Settings">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 0 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 0 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 0 1 4 0v.09c0 .67.4 1.27 1.03 1.51a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.24.63.84 1.03 1.51 1.03H21a2 2 0 0 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1z"/></svg>
        </button>
      </div>
    </header>
  );
}
