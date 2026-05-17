import {
  CodeActionKind,
  Diagnostic,
  MarkupKind,
  ProposedFeatures,
  TextDocumentSyncKind,
  TextDocuments,
  createConnection,
} from 'vscode-languageserver/node.js';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { detectSql, SqlMatch } from './detect.js';
import { buildCodeActions, buildHoverMarkdown, validate } from './handlers.js';

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments<TextDocument>(TextDocument);

connection.onInitialize(() => ({
  capabilities: {
    textDocumentSync: TextDocumentSyncKind.Incremental,
    hoverProvider: true,
    codeActionProvider: {
      codeActionKinds: [CodeActionKind.QuickFix],
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
