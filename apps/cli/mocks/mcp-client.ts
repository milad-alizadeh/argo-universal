import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import {
  StdioClientTransport,
  type StdioServerParameters,
} from '@modelcontextprotocol/sdk/client/stdio.js';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { onTestFinished } from 'vitest';
import { z } from 'zod';

const entry = fileURLToPath(new URL('../bin/argo.mjs', import.meta.url));

export async function connectMcp(
  home: string,
  token?: string,
): Promise<Client> {
  const client = new Client({ name: 'argo-test', version: '1.0.0' });

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [entry, 'mcp'],
    env: clientEnvironment(home, token),
    stderr: 'pipe',
  });

  onTestFinished(() => client.close());
  await client.connect(transport);

  return client;
}

function clientEnvironment(
  home: string,
  token: string | undefined,
): NonNullable<StdioServerParameters['env']> {
  const env: NonNullable<StdioServerParameters['env']> = { ARGO_HOME: home };

  if (token !== undefined) env.ARGO_TOKEN = token;

  return env;
}

export function callMcp(
  client: Client,
  arguments_: Record<string, Json>,
): ReturnType<Client['callTool']> {
  return client.callTool(
    { name: 'operation_run', arguments: arguments_ },
    undefined,
    { timeout: 100_000 },
  );
}

const textResult = z.object({
  content: z.tuple([z.object({ type: z.literal('text'), text: z.string() })]),
});

export function mcpValue(
  response: Awaited<ReturnType<Client['callTool']>>,
): Json {
  return z.json().parse(JSON.parse(textResult.parse(response).content[0].text));
}
