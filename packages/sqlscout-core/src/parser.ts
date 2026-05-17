import pkg from 'node-sql-parser';
import type { Dialect } from './dialects.js';

const { Parser } = pkg as { Parser: new () => { astify(sql: string, opts: { database: string }): unknown } };

const parser = new Parser();

export interface ParsedStatement {
  raw: string;
  ast: any;
}

export interface ParseResult {
  ok: boolean;
  statements: ParsedStatement[];
  error?: { message: string; line?: number; column?: number };
}

export function parseSql(sql: string, dialect: Dialect): ParseResult {
  if (!sql.trim()) {
    return { ok: true, statements: [] };
  }
  try {
    const ast = parser.astify(sql, { database: dialect.parserDb });
    const list = Array.isArray(ast) ? ast : [ast];
    return {
      ok: true,
      statements: list.map((node: any) => ({ raw: sql, ast: node })),
    };
  } catch (err: any) {
    return {
      ok: false,
      statements: [],
      error: {
        message: err?.message ?? String(err),
        line: err?.location?.start?.line,
        column: err?.location?.start?.column,
      },
    };
  }
}
