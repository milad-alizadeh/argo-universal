import { z } from 'zod';
import { MessageId } from './request-log.ts';

// One NDJSON frame on the Agent's stdio, as far as the request log needs it.
const Frame = z.object({
  method: z.string().optional(),
  id: MessageId.optional(),
  params: z.unknown().optional(),
  result: z.unknown().optional(),
  error: z.unknown().optional(),
});

export type Frame = z.infer<typeof Frame>;

// A malformed frame a scenario writes on purpose is not logged.
const readFrame = (line: string): Frame | undefined => {
  try {
    return Frame.parse(JSON.parse(line));
  } catch {
    return undefined;
  }
};

// Whole NDJSON lines from a byte stream, keeping a partial last line for the next chunk.
const lineReader = (): ((chunk: Uint8Array) => string[]) => {
  const decoder = new TextDecoder();
  let pending = '';

  return (chunk) => {
    const lines = (pending + decoder.decode(chunk, { stream: true })).split(
      '\n',
    );

    pending = lines.pop() ?? '';

    return lines.filter(Boolean);
  };
};

// App E2E reads every request, notification and reply the Agent received, and each answer it sent, in order.
export const logFrames = (
  record: (frame: Frame) => void,
): ((chunk: Uint8Array) => void) => {
  const lines = lineReader();

  return (chunk) => {
    for (const frame of lines(chunk).map(readFrame)) if (frame) record(frame);
  };
};
