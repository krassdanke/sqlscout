import { describe, expect, it } from 'vitest';
import { DiagnosticSeverity } from 'vscode-languageserver';
import { buildHoverMarkdown, validate } from '../src/handlers.js';

describe('buildHoverMarkdown', () => {
  it('returns markdown with statement summary and SQLScout link for valid SQL', () => {
    const md = buildHoverMarkdown('SELECT 1');
    expect(md).toContain('Open in SQLScout');
    expect(md).toMatch(/statement/);
  });

  it('returns parse error message for invalid SQL', () => {
    const md = buildHoverMarkdown('SELEC bad');
    expect(md.toLowerCase()).toContain('parse');
    expect(md).toContain('Open in SQLScout');
  });
});

describe('validate', () => {
  it('returns Error diagnostic for invalid SQL', () => {
    const diags = validate({ start: 0, end: 7, sql: 'SELEC 1' });
    expect(diags).toHaveLength(1);
    expect(diags[0].severity).toBe(DiagnosticSeverity.Error);
  });

  it('returns Hint diagnostic for positional GROUP BY', () => {
    const sql = 'SELECT a FROM t GROUP BY 1';
    const diags = validate({ start: 0, end: sql.length, sql });
    expect(diags.length).toBeGreaterThanOrEqual(1);
    const hint = diags.find(d => d.severity === DiagnosticSeverity.Hint);
    expect(hint).toBeDefined();
    expect(hint!.message).toContain('positional');
  });
});
