import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { DIALECTS } from '@sqlscout/core';
import type { DialectId } from '@sqlscout/core';
import {
  parseTool,
  playgroundUrlTool,
  referenceTool,
  listTopicsTool,
} from './tools.js';

const DIALECT_SLUGS = DIALECTS.map((d) => d.id) as [DialectId, ...DialectId[]];

const ParseInput = z.object({
  sql: z.string(),
  dialect: z.enum(DIALECT_SLUGS).optional(),
});

const PlaygroundInput = z.object({
  sql: z.string(),
  dialect: z.string().optional(),
});

const ReferenceInput = z.object({
  topic: z.string(),
});

const ListTopicsInput = z.object({}).optional();

const TOOLS = [
  {
    name: 'parse',
    description:
      'Parse SQL and return AST summary (statements, tables, columns) or error.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        sql: { type: 'string' },
        dialect: { type: 'string', enum: DIALECT_SLUGS },
      },
      required: ['sql'],
    },
  },
  {
    name: 'playground_url',
    description: 'Build a SQLScout playground URL for the given SQL.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        sql: { type: 'string' },
        dialect: { type: 'string' },
      },
      required: ['sql'],
    },
  },
  {
    name: 'reference',
    description:
      'Look up a SQL command reference card by slug; fuzzy matches when no exact hit.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        topic: { type: 'string' },
      },
      required: ['topic'],
    },
  },
  {
    name: 'list_topics',
    description: 'List all SQL reference topics grouped by category.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
];

const server = new Server(
  { name: 'sqlscout-mcp', version: '0.1.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  let result: unknown;
  switch (name) {
    case 'parse': {
      const parsed = ParseInput.parse(args ?? {});
      result = parseTool(parsed);
      break;
    }
    case 'playground_url': {
      const parsed = PlaygroundInput.parse(args ?? {});
      result = playgroundUrlTool(parsed);
      break;
    }
    case 'reference': {
      const parsed = ReferenceInput.parse(args ?? {});
      result = referenceTool(parsed);
      break;
    }
    case 'list_topics': {
      ListTopicsInput.parse(args ?? {});
      result = listTopicsTool();
      break;
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
  };
});

const transport = new StdioServerTransport();
server.connect(transport).catch((err) => {
  console.error(err);
  process.exit(1);
});
