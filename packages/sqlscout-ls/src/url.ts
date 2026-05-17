const UNRESERVED = /[A-Za-z0-9\-._~]/;

export function encodeSql(sql: string): string {
  let out = '';
  for (const ch of sql) {
    if (UNRESERVED.test(ch)) {
      out += ch;
      continue;
    }
    const bytes = new TextEncoder().encode(ch);
    for (const b of bytes) {
      out += '%' + b.toString(16).toUpperCase().padStart(2, '0');
    }
  }
  return out;
}

export function playgroundUrl(sql: string, dialect?: string): string {
  const base = `https://sqlscout.app/?q=${encodeSql(sql)}`;
  return dialect ? `${base}&dialect=${encodeSql(dialect)}` : base;
}
