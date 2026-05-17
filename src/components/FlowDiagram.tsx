import { useMemo } from 'react';
import type { FlowGraph, FlowNode } from '@sqlscout/core';

interface Props {
  graph: FlowGraph;
  parseError?: string | null;
}

const NODE_W = 220;
const NODE_H = 88;

export function FlowDiagram({ graph, parseError }: Props) {
  const { nodes, edges, width, height } = graph;
  const nodeById = useMemo(() => Object.fromEntries(nodes.map(n => [n.id, n])), [nodes]);

  return (
    <section className="panel panel--marked rise" style={{ '--d': '180ms' } as any}>
      <div className="panel__header">
        <div className="panel__title">execution flow <span>· vertical layout</span></div>
        <div className="panel__actions">
          <button className="icon-btn" title="Fit to view">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>
          </button>
        </div>
      </div>

      <div className="flow">
        {parseError && (
          <div style={{
            position: 'absolute', top: 12, left: 12, right: 12, zIndex: 20,
            background: 'rgba(255,77,109,0.10)', border: '1px solid rgba(255,77,109,0.30)',
            borderRadius: 'var(--r-md)', padding: '8px 12px',
            color: 'var(--rose)', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)',
          }}>
            <strong style={{ marginRight: 8 }}>parse error</strong>{parseError}
          </div>
        )}

        {nodes.length === 0 && !parseError && (
          <EmptyState />
        )}

        <div className="flow__canvas" style={{
          position: 'relative', width, height,
          transform: 'scale(0.9)', transformOrigin: 'top left',
        }}>
          <svg className="flow__svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
              </marker>
            </defs>
            {edges.map(e => {
              const a = nodeById[e.from], b = nodeById[e.to];
              if (!a || !b) return null;
              const x1 = a.x + NODE_W / 2;
              const y1 = a.y + NODE_H;
              const x2 = b.x + NODE_W / 2;
              const y2 = b.y;
              const midY = (y1 + y2) / 2;
              return (
                <path
                  key={e.id}
                  className={`flow__edge${e.active ? ' flow__edge--active' : ''}`}
                  d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                />
              );
            })}
          </svg>

          {nodes.map(n => <NodeBox key={n.id} node={n} />)}
        </div>

        <div className="legend">
          <div className="legend__row"><span className="legend__sw" style={{ background: 'var(--node-table)' }} />table</div>
          <div className="legend__row"><span className="legend__sw" style={{ background: 'var(--node-cte)' }} />cte</div>
          <div className="legend__row"><span className="legend__sw" style={{ background: 'var(--node-join)' }} />join</div>
          <div className="legend__row"><span className="legend__sw" style={{ background: 'var(--node-filter)' }} />filter</div>
          <div className="legend__row"><span className="legend__sw" style={{ background: 'var(--node-agg)' }} />aggregate</div>
          <div className="legend__row"><span className="legend__sw" style={{ background: 'var(--node-proj)' }} />projection</div>
        </div>

        {graph.warnings.length > 0 && (
          <div style={{
            position: 'absolute', top: 12, right: 12, maxWidth: 260, zIndex: 10,
            background: 'rgba(255,179,71,0.08)', border: '1px solid rgba(255,179,71,0.25)',
            borderRadius: 'var(--r-md)', padding: 8,
            fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--amber)',
          }}>
            <div className="label-caps" style={{ color: 'var(--amber)', marginBottom: 4 }}>perf hints</div>
            {graph.warnings.map((w, i) => <div key={i}>· {w}</div>)}
          </div>
        )}
      </div>
    </section>
  );
}

function NodeBox({ node }: { node: FlowNode }) {
  return (
    <div
      className={`node node--${node.kind}`}
      style={{ left: node.x, top: node.y, width: NODE_W, minHeight: NODE_H }}
    >
      {node.kind !== 'table' && node.kind !== 'cte' && <span className="node__pin node__pin--in" />}
      {node.kind !== 'order' && node.kind !== 'proj' && node.kind !== 'raw' && <span className="node__pin node__pin--out" />}
      <div className="node__head">
        <div className="node__kind">{node.subtitle ?? node.kind}</div>
      </div>
      <div className="node__body" style={{ paddingTop: 4 }}>
        <div className="node__title" style={{ marginBottom: node.body ? 4 : 0 }}>{node.title}</div>
        {node.body && <code style={{ display: 'block', whiteSpace: 'pre-wrap' }}>{node.body}</code>}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
      color: 'var(--ash-dim)', textAlign: 'center', padding: 24,
    }}>
      <div>
        <div className="numerals" style={{ fontSize: 64, color: 'var(--ash-faint)', lineHeight: 1 }}>∅</div>
        <div className="label-caps" style={{ marginTop: 8 }}>no query parsed yet</div>
        <div style={{ fontSize: 'var(--fs-xs)', marginTop: 6 }}>type SQL on the left or load a sample.</div>
      </div>
    </div>
  );
}
