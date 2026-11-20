import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type {
  OperationRow,
  OperationRunResponse,
} from '@repo/contracts/operations/control';
import { z } from 'zod';

const capturedScreen = z.looseObject({
  status: z.literal('captured'),
  image: z.looseObject({ data: z.string(), mimeType: z.string() }),
});

type Answer = OperationRow[] | OperationRunResponse;

const capturedAnswer = z.looseObject({
  kind: z.literal('result'),
  result: capturedScreen,
});

// The picture a captured screen holds, when the answer is one.
function capturedImage(
  value: Answer,
): { data: string; mimeType: string } | null {
  const answer = capturedAnswer.safeParse(value);

  return answer.success ? answer.data.result.image : null;
}

const capturedText = JSON.stringify({
  kind: 'result',
  result: { status: 'captured' },
});

// A captured screen reaches the Agent as an image it can look at, not as base64 text in its context.
export function result(value: Answer): CallToolResult {
  const picture = capturedImage(value);

  if (!picture)
    return { content: [{ type: 'text', text: JSON.stringify(value) }] };

  return {
    content: [
      { type: 'text', text: capturedText },
      { type: 'image', data: picture.data, mimeType: picture.mimeType },
    ],
  };
}
