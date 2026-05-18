import {
  CodeAction,
  CodeActionKind,
  Diagnostic,
  DiagnosticSeverity,
  Range,
} from 'vscode-languageserver';
import {
  parseSql,
  astToFlow,
  flowToAscii,
  summarizeFlow,
  DIALECT_BY_ID,
} from '@sqlscout/core';
import { playgroundUrl } from './url.js';
import type { SqlMatch } from './detect.js';

const MAX_HOVER_FLOW_LINES = 18;

function collectTables(ast: any, acc: Set<string>): void {
  if (!ast || typeof ast !== 'object') return;
  if (Array.isArray(ast)) {
    for (const item of ast) collectTables(item, acc);
    return;
  }
  if (typeof ast.table === 'string') {
    acc.add(ast.table);
  }
  for (const key of Object.keys(ast)) {
    const v = ast[key];
    if (v && typeof v === 'object') collectTables(v, acc);
  }
}

function topStatementType(ast: any): string {
  if (ast?.with && (ast?.type === 'select' || ast?.select)) return 'SELECT (with CTE)';
  if (typeof ast?.type === 'string') return ast.type.toUpperCase();
  return 'STATEMENT';
}

function clampLines(s: string, max: number): string {
  const lines = s.split('\n');
  if (lines.length <= max) return s;
  return [...lines.slice(0, max), `  … (${lines.length - max} more lines — use **Show flow in tab**)`].join('\n');
}

export function buildHoverMarkdown(sql: string): string {
  const result = parseSql(sql, DIALECT_BY_ID.postgresql);
  const url = playgroundUrl(sql);
  const footer = `\n\n---\n[Open in browser playground](${url})`;

  if (!result.ok) {
    const msg = result.error?.message ?? 'parse error';
    return `**SQL parse error**\n\n\`\`\`\n${msg}\n\`\`\`${footer}`;
  }

  const stmts = result.statements;
  if (stmts.length === 0) {
    return `_(empty SQL)_${footer}`;
  }

  const graph = astToFlow(stmts.map(s => s.ast));
  const summary = summarizeFlow(graph, stmts.length);
  const stmtType = topStatementType(stmts[stmts.length - 1].ast);

  const tables = new Set<string>();
  for (const s of stmts) collectTables(s.ast, tables);

  const out: string[] = [];
  out.push(`**${stmtType}** · ${stmts.length} stmt${stmts.length === 1 ? '' : 's'} · perf **${summary.perfScore}/100**`);

  if (graph.nodes.length > 0) {
    out.push('');
    out.push('```text');
    out.push(clampLines(flowToAscii(graph), MAX_HOVER_FLOW_LINES));
    out.push('```');
  }

  if (tables.size > 0) {
    const list = [...tables].slice(0, 6).join(', ');
    const more = tables.size > 6 ? ` +${tables.size - 6}` : '';
    out.push(`**Tables (${tables.size}):** ${list}${more}`);
  }

  if (summary.warnings.length > 0) {
    out.push('');
    out.push('**Hints:**');
    for (const w of summary.warnings) out.push(`- ${w}`);
  }

  out.push('');
  out.push('_Cmd-. → **Show flow in tab** for full view_');
  out.push(footer.replace(/^\n+/, ''));

  return out.join('\n');
}

export function buildFlowMarkdown(sql: string): string {
  const result = parseSql(sql, DIALECT_BY_ID.postgresql);
  const url = playgroundUrl(sql);

  if (!result.ok) {
    const msg = result.error?.message ?? 'parse error';
    return [
      '# SQLScout — parse error',
      '',
      '```text',
      msg,
      '```',
      '',
      '## Source',
      '',
      '```sql',
      sql,
      '```',
      '',
      `[Open in browser playground](${url})`,
      '',
    ].join('\n');
  }

  const stmts = result.statements;
  const graph = astToFlow(stmts.map(s => s.ast));
  const summary = summarizeFlow(graph, stmts.length);
  const stmtType = topStatementType(stmts[stmts.length - 1].ast);

  const tables = new Set<string>();
  for (const s of stmts) collectTables(s.ast, tables);

  const out: string[] = [];
  out.push(`# SQLScout — ${stmtType}`);
  out.push('');
  out.push(`**Statements:** ${stmts.length} · **Perf score:** ${summary.perfScore}/100 · **Dialect:** PostgreSQL`);
  out.push('');
  out.push('## Execution flow');
  out.push('');
  out.push('```text');
  out.push(graph.nodes.length === 0 ? '(no flow — non-SELECT)' : flowToAscii(graph));
  out.push('```');
  out.push('');

  if (tables.size > 0) {
    out.push(`## Tables (${tables.size})`);
    out.push('');
    for (const t of tables) out.push(`- \`${t}\``);
    out.push('');
  }

  if (summary.ctes.length > 0) {
    out.push(`## CTEs (${summary.ctes.length})`);
    out.push('');
    for (const c of summary.ctes) out.push(`- \`${c}\``);
    out.push('');
  }

  if (summary.warnings.length > 0) {
    out.push('## Performance hints');
    out.push('');
    for (const w of summary.warnings) out.push(`- ${w}`);
    out.push('');
  } else {
    out.push('## Performance hints');
    out.push('');
    out.push('_No issues detected._');
    out.push('');
  }

  out.push('## Source');
  out.push('');
  out.push('```sql');
  out.push(sql);
  out.push('```');
  out.push('');
  out.push('---');
  out.push('');
  out.push(`[Open interactive playground in browser](${url})`);
  out.push('');

  return out.join('\n');
}

export function buildCodeActions(uri: string, match: SqlMatch): CodeAction[] {
  const showFlow: CodeAction = {
    title: 'SQLScout: Show flow in tab',
    kind: CodeActionKind.QuickFix,
    command: {
      title: 'SQLScout: Show flow in tab',
      command: 'sqlscout.showFlow',
      arguments: [match.sql],
    },
  };
  const openBrowser: CodeAction = {
    title: 'SQLScout: Open in browser playground',
    kind: CodeActionKind.QuickFix,
    command: {
      title: 'SQLScout: Open in browser playground',
      command: 'sqlscout.openUrl',
      arguments: [playgroundUrl(match.sql)],
    },
  };
  const extract: CodeAction = {
    title: 'SQLScout: Extract to .sql file',
    kind: CodeActionKind.QuickFix,
    command: {
      title: 'SQLScout: Extract to .sql file',
      command: 'sqlscout.extractToFile',
      arguments: [uri, match.sql],
    },
  };
  return [showFlow, openBrowser, extract];
}

function hasPositionalGroupBy(ast: any): boolean {
  if (!ast || typeof ast !== 'object') return false;
  const gb = ast.groupby;
  if (!gb) return false;
  const items: any[] = Array.isArray(gb) ? gb : Array.isArray(gb.columns) ? gb.columns : [];
  for (const item of items) {
    if (!item) continue;
    if (item.type === 'number') return true;
    const raw = (item.value !== undefined ? item.value : item.raw);
    if (typeof raw === 'number') return true;
    if (typeof raw === 'string' && /^\d+$/.test(raw.trim())) return true;
  }
  return false;
}

export function validate(match: SqlMatch): Diagnostic[] {
  const fullRange: Range = {
    start: { line: 0, character: match.start },
    end: { line: 0, character: match.end },
  };
  const result = parseSql(match.sql, DIALECT_BY_ID.postgresql);
  if (!result.ok) {
    return [
      {
        severity: DiagnosticSeverity.Error,
        range: fullRange,
        message: result.error?.message ?? 'SQL parse error',
        source: 'sqlscout',
      },
    ];
  }
  const diags: Diagnostic[] = [];
  for (const stmt of result.statements) {
    if (hasPositionalGroupBy(stmt.ast)) {
      diags.push({
        severity: DiagnosticSeverity.Hint,
        range: fullRange,
        message: 'GROUP BY positional reference — fragile to column re-ordering',
        source: 'sqlscout',
      });
      break;
    }
  }
  return diags;
}
