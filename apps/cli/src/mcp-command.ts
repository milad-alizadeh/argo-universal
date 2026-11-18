import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { productCompatibility } from '@repo/contracts/product-identity';
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
  const plugins = await client.instructions().catch((error: Error) => {
    writeError(`Plugin instructions are unavailable: ${error.message}`);

    return [];
  });

  await createOperationMcpServer(client, {
    plugins,
    argo: { todoList: todoListChosen() },
  }).connect(new StdioServerTransport());

  return 0;
}

// The Engine starts `argo mcp` with `0` here when the person turned the checklist off (ADR-0053).
const todoListChosen = (): boolean =>
  process.env[productCompatibility.environment.todoList] !== '0';
