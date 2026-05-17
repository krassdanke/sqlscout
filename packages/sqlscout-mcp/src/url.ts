export function encodeSql(sql: string): string {
  return encodeURIComponent(sql);
}

export function playgroundUrl(sql: string, dialect?: string): string {
  const base = `https://sqlscout.app/?q=${encodeSql(sql)}`;
  return dialect ? `${base}&dialect=${encodeURIComponent(dialect)}` : base;
}
