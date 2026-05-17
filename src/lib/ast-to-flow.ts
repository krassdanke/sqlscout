/**
 * Convert a single SELECT-style AST (node-sql-parser shape) into a positioned
 * node/edge graph suitable for the prototype flow renderer.
 *
 * Surfaces the *intent* of a query as a vertical execution flow:
 *   tables (and CTEs) → joins → filter → aggregate → projection → order/limit
 */

export type FlowNodeKind = 'table' | 'cte' | 'join' | 'filter' | 'agg' | 'proj' | 'order' | 'raw';

export interface FlowNode {
  id: string;
  kind: FlowNodeKind;
  title: string;
  subtitle?: string;
  body?: string;
  x: number;
  y: number;
}

export interface FlowEdge {
  id: string;
  from: string;
  to: string;
  active?: boolean;
}

export interface FlowGraph {
  nodes: FlowNode[];
  edges: FlowEdge[];
  width: number;
  height: number;
  perfScore: number;
  warnings: string[];
}

const COL_W = 200;
const ROW_H = 130;
const ORIGIN_X = 40;
const ORIGIN_Y = 30;

function unwrap(v: any): string {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (typeof v !== 'object') return String(v);
  if (typeof v.value === 'string' || typeof v.value === 'number') return String(v.value);
  if (v.expr) return unwrap(v.expr);
  if (v.name) return unwrap(v.name);
  if (Array.isArray(v)) return v.map(unwrap).join('.');
  return '';
}

function fnName(n: any): string {
  if (!n) return 'fn';
  if (typeof n === 'string') return n;
  if (Array.isArray(n)) return n.map(unwrap).filter(Boolean).join('.');
  if (n.name) return fnName(n.name);
  return unwrap(n) || 'fn';
}

function colRef(c: any): string {
  if (!c) return '?';
  if (typeof c === 'string') return c;

  if (c.type === 'column_ref') {
    const col = unwrap(c.column);
    return c.table ? `${c.table}.${col}` : col || '*';
  }
  if (c.type === 'binary_expr') return `${colRef(c.left)} ${c.operator} ${colRef(c.right)}`;
  if (c.type === 'unary_expr') return `${c.operator} ${colRef(c.expr)}`;

  if (c.type === 'number' || c.type === 'bool') return String(c.value);
  if (c.type === 'string' || c.type === 'single_quote_string' || c.type === 'double_quote_string') {
    return `'${c.value}'`;
  }
  if (c.type === 'null') return 'NULL';
  if (c.type === 'interval') return `INTERVAL ${colRef(c.expr)}${c.unit ? ' ' + c.unit : ''}`;

  if (c.type === 'aggr_func') {
    const args = c.args?.expr ? colRef(c.args.expr) : '*';
    return `${unwrap(c.name) || c.name}(${args})`;
  }
  if (c.type === 'function') {
    const args = Array.isArray(c.args?.value) ? c.args.value.map(colRef).join(', ') : '';
    return `${fnName(c.name)}(${args})`;
  }
  if (c.type === 'expr_list') {
    if (Array.isArray(c.value)) return c.value.map(colRef).join(', ');
  }
  if (c.type === 'case') return 'CASE …';
  if (c.type === 'cast' && c.expr) return colRef(c.expr);

  if (c.expr) return colRef(c.expr);
  return unwrap(c) || '…';
}

function exprStr(e: any): string {
  return colRef(e);
}

interface BuildCtx {
  nodes: FlowNode[];
  edges: FlowEdge[];
  idSeed: number;
  warnings: string[];
}

function nextId(ctx: BuildCtx, prefix: string): string {
  ctx.idSeed += 1;
  return `${prefix}-${ctx.idSeed}`;
}

function pushEdge(ctx: BuildCtx, from: string, to: string, active = true) {
  ctx.edges.push({ id: `e-${ctx.edges.length}`, from, to, active });
}

function buildSelectGraph(ast: any, ctx: BuildCtx): { lastNodeId: string | null; topY: number } {
  let row = 0;
  const cteIds: string[] = [];

  const withList = Array.isArray(ast?.with) ? ast.with : [];
  withList.forEach((cte: any, i: number) => {
    const id = nextId(ctx, 'cte');
    ctx.nodes.push({
      id, kind: 'cte',
      title: unwrap(cte.name) || `cte_${i + 1}`,
      subtitle: 'CTE',
      body: cte.stmt?.where ? `filter ${exprStr(cte.stmt.where)}` : 'subquery',
      x: ORIGIN_X + i * COL_W,
      y: ORIGIN_Y + row * ROW_H,
    });
    cteIds.push(id);
  });
  if (withList.length > 0) row += 1;

  const tables: string[] = [];
  const joinSpecs: { table: string; on: string; jtype: string }[] = [];
  const fromList: any[] = Array.isArray(ast?.from) ? ast.from : [];

  fromList.forEach((f, i) => {
    const name = f.as || f.table || unwrap(f.expr?.name) || `t_${i + 1}`;
    if (i === 0) {
      tables.push(name);
    } else if (f.join) {
      tables.push(name);
      joinSpecs.push({
        table: name,
        on: f.on ? exprStr(f.on) : '',
        jtype: f.join,
      });
    } else {
      tables.push(name);
    }
  });

  const tableIds: string[] = tables.map((name, i) => {
    const id = nextId(ctx, 'tbl');
    ctx.nodes.push({
      id, kind: 'table',
      title: name,
      subtitle: 'TABLE',
      x: ORIGIN_X + i * COL_W,
      y: ORIGIN_Y + row * ROW_H,
    });
    return id;
  });
  if (tableIds.length > 0) row += 1;

  cteIds.forEach((cteId, idx) => {
    const cteName = unwrap(withList[idx].name);
    const consumerIdx = tables.findIndex(t => t === cteName);
    const target = consumerIdx >= 0 ? tableIds[consumerIdx] : tableIds[0];
    if (target) pushEdge(ctx, cteId, target, true);
  });

  let cursor: string | null = tableIds[0] ?? null;

  if (joinSpecs.length > 0) {
    const id = nextId(ctx, 'join');
    const title = joinSpecs.map(j => `${j.jtype.replace(' JOIN', '').toLowerCase()} ${j.table}`).join(' · ');
    const body = joinSpecs.filter(j => j.on).map(j => `on ${j.on}`).join('\n');
    ctx.nodes.push({
      id, kind: 'join',
      title,
      subtitle: `${joinSpecs.length}× join`,
      body,
      x: ORIGIN_X + Math.floor((tableIds.length - 1) / 2) * COL_W,
      y: ORIGIN_Y + row * ROW_H,
    });
    tableIds.forEach(t => pushEdge(ctx, t, id, true));
    cursor = id;
    row += 1;
  }

  if (ast?.where) {
    const id = nextId(ctx, 'flt');
    ctx.nodes.push({
      id, kind: 'filter',
      title: exprStr(ast.where),
      subtitle: 'WHERE',
      x: ORIGIN_X + Math.floor((tableIds.length - 1) / 2) * COL_W,
      y: ORIGIN_Y + row * ROW_H,
    });
    if (cursor) pushEdge(ctx, cursor, id, true);
    cursor = id;
    row += 1;
  }

  const groupCols = ast?.groupby?.columns ?? (Array.isArray(ast?.groupby) ? ast.groupby : null);
  if (groupCols && groupCols.length) {
    const keys = groupCols.map(colRef).join(', ');
    const id = nextId(ctx, 'agg');
    ctx.nodes.push({
      id, kind: 'agg',
      title: `by ${keys}`,
      subtitle: 'GROUP BY',
      body: ast.having ? `having ${exprStr(ast.having)}` : undefined,
      x: ORIGIN_X + Math.floor((tableIds.length - 1) / 2) * COL_W,
      y: ORIGIN_Y + row * ROW_H,
    });
    if (cursor) pushEdge(ctx, cursor, id, true);
    cursor = id;
    row += 1;
  }

  const cols: any[] = Array.isArray(ast?.columns) ? ast.columns : [];
  if (cols.length > 0) {
    const labels = cols.map((c: any) => {
      if (c.as) return unwrap(c.as);
      return c.expr ? colRef(c.expr) : colRef(c);
    });
    const head = labels.slice(0, 6).join(', ');
    const id = nextId(ctx, 'proj');
    ctx.nodes.push({
      id, kind: 'proj',
      title: cols.length > 6 ? `${head}, +${cols.length - 6} more` : head,
      subtitle: `SELECT · ${cols.length} cols`,
      x: ORIGIN_X + Math.floor((tableIds.length - 1) / 2) * COL_W,
      y: ORIGIN_Y + row * ROW_H,
    });
    if (cursor) pushEdge(ctx, cursor, id, true);
    cursor = id;
    row += 1;
  }

  if (ast?.orderby || (ast?.limit?.value && ast.limit.value.length)) {
    const orderTxt = Array.isArray(ast.orderby)
      ? ast.orderby.map((o: any) => `${colRef(o.expr)} ${o.type ?? 'asc'}`).join(', ')
      : '';
    const limitTxt = ast.limit?.value?.length
      ? `limit ${ast.limit.value.map((v: any) => unwrap(v)).join(', ')}`
      : '';
    const id = nextId(ctx, 'ord');
    ctx.nodes.push({
      id, kind: 'order',
      title: [orderTxt, limitTxt].filter(Boolean).join(' · ') || 'order',
      subtitle: ast.orderby ? 'ORDER BY' : 'LIMIT',
      x: ORIGIN_X + Math.floor((tableIds.length - 1) / 2) * COL_W,
      y: ORIGIN_Y + row * ROW_H,
    });
    if (cursor) pushEdge(ctx, cursor, id, true);
    cursor = id;
    row += 1;
  }

  return { lastNodeId: cursor, topY: row };
}

function scoreAst(ast: any, warnings: string[]): number {
  let s = 100;
  const cols = Array.isArray(ast?.columns) ? ast.columns : [];
  const starOnly = cols.length === 1 && unwrap(cols[0]?.expr?.column) === '*';
  if (starOnly) { s -= 15; warnings.push('SELECT * — narrow your projection.'); }
  if (!ast?.where) { s -= 10; warnings.push('No WHERE clause — full table scan likely.'); }
  if (!ast?.limit?.value?.length && !ast?.groupby) {
    s -= 5; warnings.push('No LIMIT — consider capping ad-hoc queries.');
  }
  const fromCount = Array.isArray(ast?.from) ? ast.from.length : 0;
  if (fromCount >= 4) { s -= 8; warnings.push(`${fromCount}-way join — check index coverage.`); }
  return Math.max(0, Math.min(100, s));
}

export function astToFlow(statements: any[]): FlowGraph {
  const ctx: BuildCtx = { nodes: [], edges: [], idSeed: 0, warnings: [] };

  const target = [...statements].reverse().find(
    (n: any) => n?.type === 'select' || n?.with,
  ) ?? statements[statements.length - 1];

  if (!target) {
    return { nodes: [], edges: [], width: 600, height: 400, perfScore: 0, warnings: ['No statements parsed.'] };
  }

  if (target.type !== 'select') {
    ctx.nodes.push({
      id: 'raw-1', kind: 'raw',
      title: (target.type ?? 'STATEMENT').toString().toUpperCase(),
      subtitle: 'preview only',
      body: 'Flow view supports SELECT-shaped queries today.',
      x: ORIGIN_X, y: ORIGIN_Y,
    });
    return { nodes: ctx.nodes, edges: ctx.edges, width: 600, height: 400, perfScore: 80, warnings: [] };
  }

  buildSelectGraph(target, ctx);
  const perf = scoreAst(target, ctx.warnings);

  const maxX = Math.max(...ctx.nodes.map(n => n.x), 400) + COL_W;
  const maxY = Math.max(...ctx.nodes.map(n => n.y), 200) + ROW_H;

  return {
    nodes: ctx.nodes,
    edges: ctx.edges,
    width: maxX,
    height: maxY,
    perfScore: perf,
    warnings: ctx.warnings,
  };
}
