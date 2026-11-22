import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  agentImageResult,
  type OperationInputRow,
  type OperationRunResponse,
} from '@repo/contracts/operations/control';

type Answer = OperationInputRow[] | OperationRunResponse;

export function result(value: Answer): CallToolResult {
  const picture =
    !Array.isArray(value) && value.kind === 'result'
      ? agentImageResult(value.result)
      : null;

  if (!picture)
    return { content: [{ type: 'text', text: JSON.stringify(value) }] };

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ kind: 'result', result: picture.summary }),
      },
      { type: 'image', ...picture.image },
    ],
  };
}
