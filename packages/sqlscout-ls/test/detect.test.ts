import { describe, expect, it } from 'vitest';
import { detectSql } from '../src/detect.js';
import { encodeSql, playgroundUrl } from '../src/url.js';

describe('detectSql — TypeScript', () => {
  it('extracts sql-tagged template literal', () => {
    const text = "const q = sql`SELECT 1`;\n";
    const matches = detectSql(text, 'typescript');
    expect(matches).toHaveLength(1);
    expect(matches[0].sql).toBe('SELECT 1');
  });

  it('ignores regular string literals', () => {
    const text = 'const q = "SELECT 1";';
    const matches = detectSql(text, 'typescript');
    expect(matches).toHaveLength(0);
  });
});

describe('detectSql — JavaScript', () => {
  it('extracts sql-tagged template literal', () => {
    const text = "const q = sql`SELECT * FROM users`;";
    const matches = detectSql(text, 'javascript');
    expect(matches).toHaveLength(1);
    expect(matches[0].sql).toBe('SELECT * FROM users');
  });

  it('ignores plain backtick template literal without sql tag', () => {
    const text = "const q = `hello world`;";
    const matches = detectSql(text, 'javascript');
    expect(matches).toHaveLength(0);
  });
});

describe('detectSql — Python', () => {
  it('extracts triple-quoted string with # sql hint above', () => {
    const text = '# sql\nq = """SELECT 1"""\n';
    const matches = detectSql(text, 'python');
    expect(matches).toHaveLength(1);
    expect(matches[0].sql).toBe('SELECT 1');
  });

  it('ignores triple-quoted docstring without sql hint', () => {
    const text = 'def f():\n    """Just a docstring."""\n    pass\n';
    const matches = detectSql(text, 'python');
    expect(matches).toHaveLength(0);
  });
});

describe('detectSql — Rust', () => {
  it('extracts sqlx::query! macro string', () => {
    const text = 'let r = sqlx::query!("SELECT 1").fetch_one(&pool).await?;';
    const matches = detectSql(text, 'rust');
    expect(matches).toHaveLength(1);
    expect(matches[0].sql).toBe('SELECT 1');
  });

  it('ignores plain string literal', () => {
    const text = 'let s = "hello world";';
    const matches = detectSql(text, 'rust');
    expect(matches).toHaveLength(0);
  });
});

describe('detectSql — Go', () => {
  it('extracts backtick raw string starting with SELECT', () => {
    const text = "q := `SELECT * FROM users`\n";
    const matches = detectSql(text, 'go');
    expect(matches).toHaveLength(1);
    expect(matches[0].sql).toBe('SELECT * FROM users');
  });

  it('ignores backtick string that is not SQL', () => {
    const text = "msg := `hello world`\n";
    const matches = detectSql(text, 'go');
    expect(matches).toHaveLength(0);
  });
});

describe('detectSql — sql files', () => {
  it('returns whole document for sql languageId', () => {
    const text = 'SELECT 1;';
    const matches = detectSql(text, 'sql');
    expect(matches).toHaveLength(1);
    expect(matches[0].sql).toBe(text);
  });
});

describe('detectSql — unknown', () => {
  it('returns empty array', () => {
    expect(detectSql('SELECT 1', 'cobol')).toEqual([]);
  });
});

describe('playgroundUrl', () => {
  it('encodes SELECT 1 correctly', () => {
    expect(encodeSql('SELECT 1')).toBe('SELECT%201');
    expect(playgroundUrl('SELECT 1')).toBe('https://sqlscout.app/?q=SELECT%201');
  });

  it('appends dialect when supplied', () => {
    expect(playgroundUrl('SELECT 1', 'postgresql')).toBe(
      'https://sqlscout.app/?q=SELECT%201&dialect=postgresql',
    );
  });
});
