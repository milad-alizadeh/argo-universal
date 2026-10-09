import { homedir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { z } from 'zod';

// The one seam to Paper: a tool name and arguments in, the tool's JSON payload out.
export interface PaperPort {
  call: (tool: string, args: Record<string, unknown>) => Promise<unknown>;
  close: () => Promise<void>;
}

const textContentSchema = z.object({
  type: z.literal('text'),
  text: z.string(),
});
const imageContentSchema = z.object({
  type: z.literal('image'),
  data: z.string(),
  mimeType: z.string(),
});
const toolResultSchema = z.object({
  isError: z.boolean().optional(),
  content: z.array(z.union([textContentSchema, imageContentSchema])),
});
type ToolResult = z.infer<typeof toolResultSchema>;
// Paper prefixes every file-scoped payload with a header naming the file.
const fileHeaderSchema = z.object({ file: z.object({ id: z.string() }) });

const paperBinary = join(homedir(), '.paper', 'bin', 'paper');
// Large reads, such as styles for a thousand layers, can outlast the SDK's 60-second default.
const TOOL_TIMEOUT_MS = 300_000;

function texts(result: ToolResult): string[] {
  return result.content.flatMap((part): string[] =>
    part.type === 'text' ? [part.text] : [],
  );
}

function assertSameFile(header: string | undefined, fileId: string): void {
  const answered = fileHeaderSchema.parse(JSON.parse(header ?? '{}')).file.id;
  if (answered !== fileId)
    throw new Error(`Paper answered for file ${answered}, not ${fileId}.`);
}

// A few tools answer in plain text, such as finish_working_on_nodes with "OK".
const JSON_START = /^\s*[[{"]/;

function jsonBody(body: string | undefined): unknown {
  if (body === undefined) return null;
  return JSON_START.test(body) ? JSON.parse(body) : body;
}

function payloadOf(result: ToolResult, fileId: string): unknown {
  const [header, body] = texts(result);
  if (result.isError) throw new Error(texts(result).join('\n'));
  assertSameFile(header, fileId);
  const image = result.content.find((part): boolean => part.type === 'image');
  return image ?? jsonBody(body);
}

async function callTool(
  client: Client,
  tool: string,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const request = { name: tool, arguments: args };
  const options = { timeout: TOOL_TIMEOUT_MS };
  return toolResultSchema.parse(
    await client.callTool(request, undefined, options),
  );
}

function portFor(client: Client, fileId: string): PaperPort {
  return {
    call: async (tool, args): Promise<unknown> =>
      payloadOf(await callTool(client, tool, { fileId, ...args }), fileId),
    close: async (): Promise<void> => client.close(),
  };
}

export async function connectPaper(fileId: string): Promise<PaperPort> {
  const client = new Client({ name: 'paper-drift', version: '1.0.0' });
  await client.connect(
    new StdioClientTransport({ command: paperBinary, args: ['mcp'] }),
  );
  return portFor(client, fileId);
}
