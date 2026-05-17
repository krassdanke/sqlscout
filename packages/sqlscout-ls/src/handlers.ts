import {
  CodeAction,
  CodeActionKind,
  Diagnostic,
  DiagnosticSeverity,
  Range,
} from 'vscode-languageserver';
import { parseSql, DIALECT_BY_ID } from '@sqlscout/core';
import { playgroundUrl } from './url.js';
import type { SqlMatch } from './detect.js';

function topLevelClauseNames(ast: any): string[] {
  if (!ast || typeof ast !== 'object') return [];
  const clauseKeys = [
    'with',
    'select',
    'from',
    'where',
    'groupby',
    'having',
    'orderby',
    'limit',
    'union',
    'set',
    'values',
    'returning',
  ];
  const found: string[] = [];
  if (typeof ast.type === 'string') {
    found.push(ast.type.toUpperCase());
  }
  for (const key of clauseKeys) {
    const v = ast[key];
    if (v === null || v === undefined) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    found.push(key.toUpperCase());
  }
  return found;
}

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

export function buildHoverMarkdown(sql: string): string {
  const result = parseSql(sql, DIALECT_BY_ID.postgresql);
  const url = playgroundUrl(sql);
  const linkLine = `[Open in SQLScout](${url})`;
  if (!result.ok) {
    const msg = result.error?.message ?? 'parse error';
    return `**SQL parse error:** ${msg}\n\n${linkLine}`;
  }
  const stmtCount = result.statements.length;
  const tables = new Set<string>();
  const clauseSet = new Set<string>();
  for (const stmt of result.statements) {
    collectTables(stmt.ast, tables);
    for (const c of topLevelClauseNames(stmt.ast)) clauseSet.add(c);
  }
  const lines: string[] = [];
  lines.push(`**SQL** — ${stmtCount} statement${stmtCount === 1 ? '' : 's'}`);
  if (clauseSet.size > 0) {
    lines.push(`Clauses: ${[...clauseSet].join(', ')}`);
  }
  lines.push(`Tables: ${tables.size}${tables.size > 0 ? ` (${[...tables].join(', ')})` : ''}`);
  lines.push('');
  lines.push(linkLine);
  return lines.join('\n');
}

export function buildCodeActions(uri: string, match: SqlMatch): CodeAction[] {
  const openAction: CodeAction = {
    title: 'Open in SQLScout',
    kind: CodeActionKind.QuickFix,
    command: {
      title: 'Open in SQLScout',
      command: 'sqlscout.openUrl',
      arguments: [playgroundUrl(match.sql)],
    },
  };
  const extractAction: CodeAction = {
    title: 'Extract to .sql file',
    kind: CodeActionKind.QuickFix,
    command: {
      title: 'Extract to .sql file',
      command: 'sqlscout.extractToFile',
      arguments: [uri, match.sql],
    },
  };
  return [openAction, extractAction];
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
