import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import type { CliIo } from './cli';
import { parseUsage } from './command-error';
import { createOperationMcpServer } from './mcp-server';

export async function runMcp(
  args: string[],
  { client, writeError }: CliIo,
): Promise<number> {
  parseUsage(() => z.tuple([]).parse(args));
  // Plugin instructions only advise: when the Server will not give them, the tools still answer for themselves.
  const instructions = await client.instructions().catch((error: unknown) => {
    writeError(`Plugin instructions are unavailable: ${String(error)}`);

    return [];
  });

  await createOperationMcpServer(client, instructions).connect(
    new StdioServerTransport(),
  );

  return 0;
}
