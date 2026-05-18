import {
  CodeActionKind,
  Diagnostic,
  ExecuteCommandParams,
  MarkupKind,
  ProposedFeatures,
  ShowDocumentRequest,
  TextDocumentSyncKind,
  TextDocuments,
  createConnection,
} from 'vscode-languageserver/node.js';
import { TextDocument } from 'vscode-languageserver-textdocument';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { detectSql, SqlMatch } from './detect.js';
import {
  buildCodeActions,
  buildFlowMarkdown,
  buildHoverMarkdown,
  validate,
} from './handlers.js';

const SHOW_FLOW_CMD = 'sqlscout.showFlow';

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments<TextDocument>(TextDocument);

connection.onInitialize(() => ({
  capabilities: {
    textDocumentSync: TextDocumentSyncKind.Incremental,
    hoverProvider: true,
    codeActionProvider: {
      codeActionKinds: [CodeActionKind.QuickFix],
    },
    executeCommandProvider: {
      commands: [SHOW_FLOW_CMD],
    },
  },
}));

function findMatchAtOffset(matches: SqlMatch[], offset: number): SqlMatch | null {
  for (const m of matches) {
    if (offset >= m.start && offset <= m.end) return m;
  }
  return null;
}

function overlaps(match: SqlMatch, startOffset: number, endOffset: number): boolean {
  return match.start <= endOffset && match.end >= startOffset;
}

connection.onHover(({ textDocument, position }) => {
  const doc = documents.get(textDocument.uri);
  if (!doc) return null;
  const text = doc.getText();
  const matches = detectSql(text, doc.languageId);
  const offset = doc.offsetAt(position);
  const match = findMatchAtOffset(matches, offset);
  if (!match) return null;
  return {
    contents: {
      kind: MarkupKind.Markdown,
      value: buildHoverMarkdown(match.sql),
    },
  };
});

connection.onCodeAction(({ textDocument, range }) => {
  const doc = documents.get(textDocument.uri);
  if (!doc) return [];
  const text = doc.getText();
  const matches = detectSql(text, doc.languageId);
  const startOffset = doc.offsetAt(range.start);
  const endOffset = doc.offsetAt(range.end);
  const actions = [];
  for (const m of matches) {
    if (overlaps(m, startOffset, endOffset)) {
      actions.push(...buildCodeActions(textDocument.uri, m));
    }
  }
  return actions;
});

export function writeFlowFile(sql: string): string {
  const hash = crypto.createHash('sha1').update(sql).digest('hex').slice(0, 8);
  const dir = path.join(os.tmpdir(), 'sqlscout');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `flow-${hash}.md`);
  fs.writeFileSync(file, buildFlowMarkdown(sql), 'utf8');
  return file;
}

function fileUri(p: string): string {
  return 'file://' + (p.startsWith('/') ? p : '/' + p).replace(/\\/g, '/');
}

connection.onExecuteCommand(async (params: ExecuteCommandParams) => {
  if (params.command !== SHOW_FLOW_CMD) return null;
  const sql = (params.arguments?.[0] as string) ?? '';
  if (!sql) return null;
  const file = writeFlowFile(sql);
  await connection.sendRequest(ShowDocumentRequest.type, {
    uri: fileUri(file),
    takeFocus: true,
  });
  return null;
});

function rangeFromMatch(doc: TextDocument, m: SqlMatch) {
  return {
    start: doc.positionAt(m.start),
    end: doc.positionAt(m.end),
  };
}

function validateDocument(doc: TextDocument): void {
  const matches = detectSql(doc.getText(), doc.languageId);
  const diags: Diagnostic[] = [];
  for (const m of matches) {
    const matchDiags = validate(m);
    for (const d of matchDiags) {
      diags.push({ ...d, range: rangeFromMatch(doc, m) });
    }
  }
  connection.sendDiagnostics({ uri: doc.uri, diagnostics: diags });
}

documents.onDidChangeContent(({ document }) => {
  validateDocument(document);
});

documents.onDidOpen(({ document }) => {
  validateDocument(document);
});

documents.listen(connection);
connection.listen();
