import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { ChartPreviewCapturedResult } from '@repo/contracts/operations/chart';
import type {
  OperationInputRow,
  OperationRunResponse,
} from '@repo/contracts/operations/control';
import { z } from 'zod';

const capturedScreen = z.looseObject({
  status: z.literal('captured'),
  image: z.looseObject({ data: z.string(), mimeType: z.string() }),
});

type Answer = OperationInputRow[] | OperationRunResponse;

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
  if (!Array.isArray(value) && value.kind === 'result') {
    const preview = ChartPreviewCapturedResult.safeParse(value.result);

    if (preview.success) {
      const { image, valid, status, platform, width, theme } = preview.data;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              kind: 'result',
              result: { valid, status, platform, width, theme },
            }),
          },
          { type: 'image', ...image },
        ],
      };
    }
  }

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
