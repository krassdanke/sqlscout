import { describe, expect, it } from 'vitest';
import {
  parseTool,
  playgroundUrlTool,
  referenceTool,
  listTopicsTool,
} from '../src/tools.js';

describe('parseTool', () => {
  it('parses a SELECT and extracts tables', () => {
    const result = parseTool({ sql: 'SELECT id FROM users' });
    expect(result.ok).toBe(true);
    expect(result.statementCount).toBe(1);
    expect(result.statements?.[0].tables).toContain('users');
  });

  it('reports an error for invalid SQL', () => {
    const result = parseTool({ sql: 'SELEC bad' });
    expect(result.ok).toBe(false);
    expect(result.error?.message).toBeTruthy();
  });
});

describe('playgroundUrlTool', () => {
  it('builds a playground URL', () => {
    const { url } = playgroundUrlTool({ sql: 'SELECT 1' });
    expect(url.startsWith('https://sqlscout.app/?q=')).toBe(true);
  });
});

describe('referenceTool', () => {
  it('returns the SELECT entry on exact slug', () => {
    const result = referenceTool({ topic: 'select' });
    expect('slug' in result && result.slug).toBe('select');
  });

  it('returns fuzzy matches when nothing exact', () => {
    const result = referenceTool({ topic: 'nonexistent-xyz' });
    expect('matches' in result).toBe(true);
  });
});

describe('listTopicsTool', () => {
  it('groups topics by category', () => {
    const { categories } = listTopicsTool();
    expect(categories.DML).toBeDefined();
    expect(categories.DML.length).toBeGreaterThan(0);
  });
});
