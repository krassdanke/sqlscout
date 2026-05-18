import { describe, expect, it } from 'vitest';
import { DiagnosticSeverity } from 'vscode-languageserver';
import {
  buildCodeActions,
  buildFlowMarkdown,
  buildHoverMarkdown,
  validate,
} from '../src/handlers.js';

describe('buildHoverMarkdown', () => {
  it('shows statement type, perf score, and ASCII flow for SELECT', () => {
    const md = buildHoverMarkdown('SELECT id, name FROM users WHERE active = 1 LIMIT 10');
    expect(md).toMatch(/SELECT/);
    expect(md).toMatch(/perf \*\*\d+\/100\*\*/);
    expect(md).toContain('```text');
    expect(md).toMatch(/TABLE\s+users/);
    expect(md).toContain('Open in browser playground');
  });

  it('lists tables involved', () => {
    const md = buildHoverMarkdown('SELECT * FROM orders JOIN customers ON orders.cust_id = customers.id');
    expect(md).toContain('Tables');
    expect(md).toContain('orders');
    expect(md).toContain('customers');
  });

  it('surfaces performance hints', () => {
    const md = buildHoverMarkdown('SELECT * FROM big_table');
    expect(md).toContain('Hints');
    expect(md.toLowerCase()).toContain('select *');
  });

  it('returns parse error block for invalid SQL', () => {
    const md = buildHoverMarkdown('SELEC bad');
    expect(md).toContain('parse error');
    expect(md).toContain('Open in browser playground');
  });
});

describe('buildFlowMarkdown', () => {
  it('produces a full document with sections', () => {
    const md = buildFlowMarkdown('SELECT a FROM t WHERE x = 1');
    expect(md).toContain('# SQLScout');
    expect(md).toContain('## Execution flow');
    expect(md).toContain('## Source');
    expect(md).toContain('## Performance hints');
    expect(md).toContain('```sql');
    expect(md).toContain('SELECT a FROM t WHERE x = 1');
  });

  it('handles parse errors gracefully', () => {
    const md = buildFlowMarkdown('SELEC bad');
    expect(md).toContain('parse error');
    expect(md).toContain('## Source');
  });
});

describe('buildCodeActions', () => {
  it('returns showFlow, openUrl, and extract actions', () => {
    const actions = buildCodeActions('file:///x.ts', { start: 0, end: 8, sql: 'SELECT 1' });
    expect(actions).toHaveLength(3);
    const titles = actions.map(a => a.title);
    expect(titles[0]).toMatch(/Show flow in tab/);
    expect(titles[1]).toMatch(/browser/);
    expect(titles[2]).toMatch(/Extract/);
    expect(actions[0].command?.command).toBe('sqlscout.showFlow');
    expect(actions[0].command?.arguments?.[0]).toBe('SELECT 1');
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
