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
  await createOperationMcpServer(client).connect(new StdioServerTransport());

  return 0;
}
