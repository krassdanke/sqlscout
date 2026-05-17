import {
  parseSql,
  DIALECT_BY_ID,
  REFERENCE,
  findReference,
  fuzzyReferenceMatches,
} from '@sqlscout/core';
import type { DialectId, ReferenceEntry } from '@sqlscout/core';
import { playgroundUrl } from './url.js';

export interface ParseToolStatement {
  type: string;
  tables: string[];
  columns: string[];
}

export interface ParseToolResult {
  ok: boolean;
  statementCount?: number;
  statements?: ParseToolStatement[];
  error?: { message: string; line?: number; column?: number };
}

function collectTables(fromList: unknown, out: Set<string>): void {
  if (!fromList) return;
  if (Array.isArray(fromList)) {
    for (const item of fromList) collectTables(item, out);
    return;
  }
  if (typeof fromList === 'object') {
    const node = fromList as Record<string, unknown>;
    if (typeof node.table === 'string' && node.table.length > 0) {
      out.add(node.table);
    }
    if (node.join !== undefined) collectTables(node.join, out);
    if (node.expr && typeof node.expr === 'object') {
      const expr = node.expr as Record<string, unknown>;
      if (expr.from) collectTables(expr.from, out);
    }
  }
}

function extractColumns(columns: unknown): string[] {
  if (columns === '*' || columns === undefined || columns === null) {
    return ['*'];
  }
  if (!Array.isArray(columns)) {
    return [];
  }
  return columns.map((col) => {
    if (col && typeof col === 'object') {
      const c = col as Record<string, any>;
      const expr = c.expr;
      if (expr && typeof expr === 'object') {
        if (typeof expr.column === 'string') return expr.column;
        if (expr.type === 'star') return '*';
      }
      if (typeof c.as === 'string' && c.as.length > 0) return c.as;
      return JSON.stringify(col);
    }
    return String(col);
  });
}

function summariseStatement(ast: any): ParseToolStatement {
  const type =
    (ast && typeof ast === 'object' && typeof ast.type === 'string'
      ? ast.type
      : 'unknown');
  if (type !== 'select') {
    return { type, tables: [], columns: [] };
  }
  const tables = new Set<string>();
  collectTables(ast?.from, tables);
  const columns = extractColumns(ast?.columns);
  return { type, tables: Array.from(tables), columns };
}

export function parseTool(input: {
  sql: string;
  dialect?: DialectId;
}): ParseToolResult {
  const dialectId: DialectId = input.dialect ?? 'postgresql';
  const dialect = DIALECT_BY_ID[dialectId] ?? DIALECT_BY_ID.postgresql;
  const result = parseSql(input.sql, dialect);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  const statements = result.statements.map((s) => summariseStatement(s.ast));
  return {
    ok: true,
    statementCount: statements.length,
    statements,
  };
}

export function playgroundUrlTool(input: {
  sql: string;
  dialect?: string;
}): { url: string } {
  return { url: playgroundUrl(input.sql, input.dialect) };
}

export type ReferenceToolResult =
  | ReferenceEntry
  | { matches: ReferenceEntry[] };

export function referenceTool(input: { topic: string }): ReferenceToolResult {
  const hit = findReference(input.topic);
  if (hit) return hit;
  return { matches: fuzzyReferenceMatches(input.topic, 3) };
}

export interface ListTopicsResult {
  categories: Record<string, Array<{ slug: string; name: string }>>;
}

export function listTopicsTool(): ListTopicsResult {
  const categories: Record<string, Array<{ slug: string; name: string }>> = {};
  for (const entry of REFERENCE) {
    if (!categories[entry.category]) categories[entry.category] = [];
    categories[entry.category].push({ slug: entry.slug, name: entry.name });
  }
  return { categories };
}
