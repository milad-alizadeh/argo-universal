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

// The plain-text answers Paper gives: "OK" from tools such as finish_working_on_nodes, and get_jsx's markup.
const PLAIN_ANSWERS = new Set(['OK']);
const JSON_START = /^\s*[[{"]/;
const JSX_START = /^\s*(?:\(\s*)?<[a-z]/;

function plainAnswer(body: string): string {
  if (PLAIN_ANSWERS.has(body.trim())) return body.trim();
  if (JSX_START.test(body)) return body;
  throw new Error(`Unrecognised plain-text answer: ${body.slice(0, 200)}`);
}

function jsonBody(body: string | undefined): unknown {
  if (body === undefined) return null;
  return JSON_START.test(body) ? JSON.parse(body) : plainAnswer(body);
}

function imageOf(
  result: ToolResult,
): ToolResult['content'][number] | undefined {
  const images = result.content.filter(
    (part): boolean => part.type === 'image',
  );
  if (images.length > 1)
    throw new Error(`Expected one image, got ${images.length}.`);
  return images[0];
}

// Paper answers with a file header and at most one body.
function headerAndBody(
  result: ToolResult,
): [string | undefined, string | undefined] {
  const [header, body, ...extra] = texts(result);
  if (extra.length > 0)
    throw new Error(
      `Expected a header and one body, got ${extra.length} more text parts.`,
    );
  return [header, body];
}

function payloadOf(result: ToolResult, fileId: string): unknown {
  if (result.isError) throw new Error(texts(result).join('\n'));
  const [header, body] = headerAndBody(result);
  assertSameFile(header, fileId);
  return imageOf(result) ?? jsonBody(body);
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

async function payloadFrom(
  client: Client,
  fileId: string,
  call: { tool: string; args: Record<string, unknown> },
): Promise<unknown> {
  const result = await callTool(client, call.tool, { fileId, ...call.args });
  try {
    return payloadOf(result, fileId);
  } catch (error) {
    throw new Error(`Paper ${call.tool} answered unexpectedly.`, {
      cause: error,
    });
  }
}

const READ_ATTEMPTS = 3;

// Paper times out now and then on one read of a long run; reads change nothing, so they are asked again.
async function retried(read: () => Promise<unknown>): Promise<unknown> {
  for (let attempt = 1; attempt < READ_ATTEMPTS; attempt += 1) {
    try {
      return await read();
    } catch {
      // The last attempt below reports the error.
    }
  }
  return read();
}

function portFor(client: Client, fileId: string): PaperPort {
  return {
    call: (tool, args): Promise<unknown> => {
      const ask = (): Promise<unknown> =>
        payloadFrom(client, fileId, { tool, args });
      return tool.startsWith('get_') ? retried(ask) : ask();
    },
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
