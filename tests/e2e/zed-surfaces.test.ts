import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { resolve } from 'node:path';
import { once } from 'node:events';
import * as fs from 'node:fs';

const REPO = resolve(__dirname, '..', '..');

interface JsonRpcReader {
  waitFor(predicate: (msg: any) => boolean, timeoutMs?: number): Promise<any>;
  close(): void;
}

function jsonRpcReader(proc: ChildProcessWithoutNullStreams): JsonRpcReader {
  let buffer = Buffer.alloc(0);
  const queue: any[] = [];
  const waiters: Array<{
    predicate: (msg: any) => boolean;
    resolve: (msg: any) => void;
  }> = [];

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
      const waiterIdx = waiters.findIndex(w => w.predicate(msg));
      if (waiterIdx >= 0) {
        const [w] = waiters.splice(waiterIdx, 1);
        w.resolve(msg);
      } else {
        queue.push(msg);
      }
    }
  });

  return {
    waitFor: (predicate, timeoutMs = 10000) =>
      new Promise((resolveFn, rejectFn) => {
        const idx = queue.findIndex(predicate);
        if (idx >= 0) {
          const [m] = queue.splice(idx, 1);
          resolveFn(m);
          return;
        }
        const entry = { predicate, resolve: resolveFn };
        waiters.push(entry);
        setTimeout(() => {
          const i = waiters.indexOf(entry);
          if (i >= 0) {
            waiters.splice(i, 1);
            rejectFn(new Error('waitFor timeout'));
          }
        }, timeoutMs);
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
      return reader.waitFor((m) => m.id === id && !m.method);
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
        capabilities: { window: { showDocument: { support: true } } },
      });
      expect(initResp.result.capabilities).toBeTruthy();
      expect(initResp.result.capabilities.executeCommandProvider?.commands).toContain('sqlscout.showFlow');
      send(proc, { jsonrpc: '2.0', method: 'initialized', params: {} });
    }, 20000);

    afterAll(() => {
      reader?.close();
    });

    it('returns hover with ASCII flow, perf score, and browser link', async () => {
      const uri = 'file:///tmp/queries.ts';
      const text = "const q = sql`SELECT id, name FROM users WHERE active = 1 LIMIT 10`;\n";
      send(proc, {
        jsonrpc: '2.0',
        method: 'textDocument/didOpen',
        params: {
          textDocument: { uri, languageId: 'typescript', version: 1, text },
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
      expect(value).toMatch(/perf \*\*\d+\/100\*\*/);
      expect(value).toContain('```text');
      expect(value).toMatch(/TABLE\s+users/);
      expect(value).toContain('Open in browser playground');
    }, 10000);

    it('executes sqlscout.showFlow → writes markdown file → requests window/showDocument', async () => {
      const sql = 'SELECT id, total FROM orders WHERE status = \'paid\'';
      const id = nextId++;
      send(proc, {
        jsonrpc: '2.0',
        id,
        method: 'workspace/executeCommand',
        params: { command: 'sqlscout.showFlow', arguments: [sql] },
      });

      const showDocReq = await reader.waitFor(
        (m) => m.method === 'window/showDocument',
      );
      expect(showDocReq.params.uri).toMatch(/^file:\/\/.+\/sqlscout\/flow-[a-f0-9]+\.md$/);
      expect(showDocReq.params.takeFocus).toBe(true);

      const filePath = showDocReq.params.uri.replace(/^file:\/\//, '');
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).toContain('# SQLScout');
      expect(content).toContain('## Execution flow');
      expect(content).toContain('## Source');
      expect(content).toContain(sql);

      send(proc, { jsonrpc: '2.0', id: showDocReq.id, result: { success: true } });
      await reader.waitFor((m) => m.id === id && !m.method);
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
