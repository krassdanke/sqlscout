import type { FlowGraph, FlowNode } from './ast-to-flow.js';

const KIND_LABEL: Record<FlowNode['kind'], string> = {
  table: 'TABLE',
  cte: 'CTE',
  join: 'JOIN',
  filter: 'WHERE',
  agg: 'GROUP BY',
  proj: 'SELECT',
  order: 'ORDER',
  raw: 'STMT',
};

function indent(s: string, n: number): string {
  const pad = ' '.repeat(n);
  return s.split('\n').map(l => pad + l).join('\n');
}

export function flowToAscii(graph: FlowGraph): string {
  if (graph.nodes.length === 0) return '_(empty flow)_';

  const byY = new Map<number, FlowNode[]>();
  for (const n of graph.nodes) {
    const bucket = byY.get(n.y) ?? [];
    bucket.push(n);
    byY.set(n.y, bucket);
  }
  const levels = [...byY.entries()].sort((a, b) => a[0] - b[0]).map(([, ns]) => ns);

  const out: string[] = [];
  levels.forEach((level, idx) => {
    level.forEach(node => {
      const tag = KIND_LABEL[node.kind] ?? node.kind.toUpperCase();
      const title = node.title || '(unnamed)';
      out.push(`  ${tag.padEnd(8)} ${title}`);
      if (node.body) {
        out.push(indent(node.body, 11));
      }
    });
    if (idx < levels.length - 1) {
      out.push('     ↓');
    }
  });

  return out.join('\n');
}

export interface FlowSummary {
  statementCount: number;
  tables: string[];
  ctes: string[];
  hasJoins: boolean;
  hasFilter: boolean;
  hasAgg: boolean;
  hasOrder: boolean;
  projectionCols: number;
  perfScore: number;
  warnings: string[];
}

export function summarizeFlow(graph: FlowGraph, statementCount: number): FlowSummary {
  const tables: string[] = [];
  const ctes: string[] = [];
  let hasJoins = false;
  let hasFilter = false;
  let hasAgg = false;
  let hasOrder = false;
  let projectionCols = 0;

  for (const n of graph.nodes) {
    if (n.kind === 'table') tables.push(n.title);
    else if (n.kind === 'cte') ctes.push(n.title);
    else if (n.kind === 'join') hasJoins = true;
    else if (n.kind === 'filter') hasFilter = true;
    else if (n.kind === 'agg') hasAgg = true;
    else if (n.kind === 'order') hasOrder = true;
    else if (n.kind === 'proj') {
      const match = n.subtitle?.match(/(\d+)\s*cols?/);
      if (match) projectionCols = parseInt(match[1], 10);
    }
  }

  return {
    statementCount,
    tables,
    ctes,
    hasJoins,
    hasFilter,
    hasAgg,
    hasOrder,
    projectionCols,
    perfScore: graph.perfScore,
    warnings: graph.warnings,
  };
}
