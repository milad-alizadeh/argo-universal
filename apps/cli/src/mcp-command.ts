import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { parseUsage } from './command-error';
import type { CommandIo } from './control-client';
import { createOperationMcpServer } from './mcp-server';

export async function runMcp(
  args: string[],
  { client }: CommandIo,
): Promise<number> {
  parseUsage(() => z.tuple([]).parse(args));
  // Plugin instructions only advise: when the Server will not give them, the tools still answer for themselves.
  const instructions = await client.instructions().catch(() => []);

  await createOperationMcpServer(client, instructions).connect(
    new StdioServerTransport(),
  );

  return 0;
}
