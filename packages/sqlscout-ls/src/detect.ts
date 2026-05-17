export interface SqlMatch {
  start: number;
  end: number;
  sql: string;
}

const SQL_STARTERS = /^\s*(SELECT|INSERT|UPDATE|DELETE|WITH)\b/i;

function detectJs(text: string): SqlMatch[] {
  const matches: SqlMatch[] = [];
  const re = /\bsql\s*`([\s\S]*?)`/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const contentStart = m.index + m[0].indexOf('`') + 1;
    const contentEnd = contentStart + m[1].length;
    matches.push({ start: contentStart, end: contentEnd, sql: m[1] });
  }
  return matches;
}

function detectPython(text: string): SqlMatch[] {
  const matches: SqlMatch[] = [];
  const re = /("""|''')([\s\S]*?)\1/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const contentStart = m.index + m[1].length;
    const contentEnd = contentStart + m[2].length;
    const before = text.slice(0, m.index);
    const lines = before.split('\n');
    const currentLine = lines[lines.length - 1] ?? '';
    const prevLine = lines.length >= 2 ? lines[lines.length - 2] ?? '' : '';
    const hasSqlComment = /#\s*sql\b/i.test(prevLine) || /#\s*sql\b/i.test(currentLine);
    const assignMatch = /([A-Za-z_][A-Za-z0-9_]*)\s*=\s*$/.exec(currentLine);
    const isSqlIdent = assignMatch && /sql|query/i.test(assignMatch[1]);
    if (hasSqlComment || isSqlIdent) {
      matches.push({ start: contentStart, end: contentEnd, sql: m[2] });
    }
  }
  return matches;
}

function detectRust(text: string): SqlMatch[] {
  const matches: SqlMatch[] = [];
  const macroRe = /\bsqlx::(?:query|query_as)!\s*\(\s*"((?:[^"\\]|\\.)*)"/g;
  let m: RegExpExecArray | null;
  while ((m = macroRe.exec(text)) !== null) {
    const quoteIdx = m[0].lastIndexOf('"', m[0].length - m[1].length - 2);
    const contentStart = m.index + quoteIdx + 1;
    const contentEnd = contentStart + m[1].length;
    matches.push({ start: contentStart, end: contentEnd, sql: unescapeRust(m[1]) });
  }
  const formatRe = /\bformat!\s*\(\s*"((?:[^"\\]|\\.)*)"/g;
  while ((m = formatRe.exec(text)) !== null) {
    const raw = unescapeRust(m[1]);
    if (SQL_STARTERS.test(raw)) {
      const quoteIdx = m[0].lastIndexOf('"', m[0].length - m[1].length - 2);
      const contentStart = m.index + quoteIdx + 1;
      const contentEnd = contentStart + m[1].length;
      matches.push({ start: contentStart, end: contentEnd, sql: raw });
    }
  }
  return matches;
}

function unescapeRust(s: string): string {
  return s.replace(/\\(.)/g, (_, c) => {
    if (c === 'n') return '\n';
    if (c === 't') return '\t';
    if (c === 'r') return '\r';
    return c;
  });
}

function detectGo(text: string): SqlMatch[] {
  const matches: SqlMatch[] = [];
  const re = /`([^`]*)`/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const body = m[1];
    if (SQL_STARTERS.test(body)) {
      const contentStart = m.index + 1;
      const contentEnd = contentStart + body.length;
      matches.push({ start: contentStart, end: contentEnd, sql: body });
    }
  }
  return matches;
}

export function detectSql(text: string, languageId: string): SqlMatch[] {
  switch (languageId) {
    case 'sql':
      return [{ start: 0, end: text.length, sql: text }];
    case 'typescript':
    case 'typescriptreact':
    case 'javascript':
    case 'javascriptreact':
      return detectJs(text);
    case 'python':
      return detectPython(text);
    case 'rust':
      return detectRust(text);
    case 'go':
      return detectGo(text);
    default:
      return [];
  }
}
