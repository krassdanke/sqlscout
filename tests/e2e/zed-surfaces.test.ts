import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { resolve } from 'node:path';
import { once } from 'node:events';

const REPO = resolve(__dirname, '..', '..');

interface JsonRpcReader {
  readNext(): Promise<any>;
  close(): void;
}

function jsonRpcReader(proc: ChildProcessWithoutNullStreams): JsonRpcReader {
  let buffer = Buffer.alloc(0);
  const queue: any[] = [];
  const waiters: Array<(msg: any) => void> = [];

  proc.stdout.on('data', (chunk: Buffer) => {
    buffer = Buffer.concat([buffer, chunk]);
    while (true) {
      const headerEnd = buffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) return;
      const header = buffer.slice(0, headerEnd).toString('utf8');
      const lenMatch = /Content-Length:\s*(\d+)/i.exec(header);
      if (!lenMatch) {
        buffer = buffer.slice(headerEnd + 4);
        continue;
      }
      const len = Number(lenMatch[1]);
      const total = headerEnd + 4 + len;
      if (buffer.length < total) return;
      const body = buffer.slice(headerEnd + 4, total).toString('utf8');
      buffer = buffer.slice(total);
      let msg: any;
      try {
        msg = JSON.parse(body);
      } catch {
        continue;
      }
      const waiter = waiters.shift();
      if (waiter) waiter(msg);
      else queue.push(msg);
    }
  });

  return {
    readNext: () =>
      new Promise((res) => {
        const next = queue.shift();
        if (next) res(next);
        else waiters.push(res);
      }),
    close: () => proc.kill(),
  };
}

function send(proc: ChildProcessWithoutNullStreams, payload: object) {
  const body = JSON.stringify(payload);
  const header = `Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n`;
  proc.stdin.write(header + body);
}

describe('Zed integration surfaces (e2e)', () => {
  describe('sqlscout-ls LSP', () => {
    let proc: ChildProcessWithoutNullStreams;
    let reader: JsonRpcReader;
    let nextId = 1;

    const request = async (method: string, params: any) => {
      const id = nextId++;
      send(proc, { jsonrpc: '2.0', id, method, params });
      let msg = await reader.readNext();
      while (!('id' in msg) || msg.id !== id) msg = await reader.readNext();
      return msg;
    };

    beforeAll(async () => {
      proc = spawn(process.execPath, [
        resolve(REPO, 'packages/sqlscout-ls/dist/cli.js'),
        '--stdio',
      ]) as ChildProcessWithoutNullStreams;
      proc.stderr.on('data', () => {});
      reader = jsonRpcReader(proc);
      const initResp = await request('initialize', {
        processId: process.pid,
        rootUri: null,
        capabilities: {},
      });
      expect(initResp.result.capabilities).toBeTruthy();
      send(proc, { jsonrpc: '2.0', method: 'initialized', params: {} });
    }, 20000);

    afterAll(() => {
      reader?.close();
    });

    it('returns hover with playground link for SQL template literal', async () => {
      const uri = 'file:///tmp/queries.ts';
      const text = "const q = sql`SELECT id FROM users`;\n";
      send(proc, {
        jsonrpc: '2.0',
        method: 'textDocument/didOpen',
        params: {
          textDocument: {
            uri,
            languageId: 'typescript',
            version: 1,
            text,
          },
        },
      });
      const selectIdx = text.indexOf('SELECT');
      const lines = text.slice(0, selectIdx).split('\n');
      const line = lines.length - 1;
      const character = lines[lines.length - 1].length;
      const hover = await request('textDocument/hover', {
        textDocument: { uri },
        position: { line, character },
      });
      expect(hover.result).toBeTruthy();
      const value = hover.result?.contents?.value ?? '';
      expect(value).toContain('Open in SQLScout');
    }, 10000);
  });

  describe('sqlscout-mcp MCP', () => {
    it('lists tools and resolves playground_url', async () => {
      const proc = spawn(process.execPath, [
        resolve(REPO, 'packages/sqlscout-mcp/dist/cli.js'),
      ]) as ChildProcessWithoutNullStreams;
      proc.stderr.on('data', () => {});

      const messages: any[] = [];
      let buffer = '';
      proc.stdout.on('data', (chunk: Buffer) => {
        buffer += chunk.toString('utf8');
        let nl: number;
        while ((nl = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line) continue;
          try {
            messages.push(JSON.parse(line));
          } catch {}
        }
      });

      const writeLine = (obj: object) =>
        proc.stdin.write(JSON.stringify(obj) + '\n');

      const waitFor = (id: number) =>
        new Promise<any>((res) => {
          const tick = () => {
            const hit = messages.find((m) => m.id === id);
            if (hit) return res(hit);
            setTimeout(tick, 25);
          };
          tick();
        });

      writeLine({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'e2e', version: '0' },
        },
      });
      await waitFor(1);
      writeLine({ jsonrpc: '2.0', method: 'notifications/initialized' });

      writeLine({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
      const list = await waitFor(2);
      const names = (list.result?.tools ?? []).map((t: any) => t.name);
      expect(names).toEqual(
        expect.arrayContaining(['parse', 'playground_url', 'reference', 'list_topics']),
      );

      writeLine({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: { name: 'playground_url', arguments: { sql: 'SELECT 1' } },
      });
      const call = await waitFor(3);
      const text = call.result?.content?.[0]?.text ?? '';
      expect(text).toContain('https://sqlscout.app/?q=');

      proc.kill();
      await once(proc, 'exit');
    }, 20000);
  });
});
