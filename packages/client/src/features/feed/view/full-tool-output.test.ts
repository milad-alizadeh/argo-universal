import type { BlobRef, ToolCallUpdate } from '@repo/contracts';
import { expect, it } from 'vitest';
import {
  fullOutputBlobIds,
  withFullOutput,
  type FullOutputText,
} from './full-tool-output';

const blob = (blobId: string): BlobRef => ({
  blobId,
  mime: 'application/json',
  bytes: 1,
});

const whole = 'the whole output';

const preview = (text: string): ToolCallUpdate['content'] => [
  { type: 'content', content: { type: 'text', text } },
];

const truncated = (
  fullOutput?: NonNullable<
    NonNullable<ToolCallUpdate['_meta']>['argo']
  >['fullOutput'],
): ToolCallUpdate => ({
  sessionId: 'session-1',
  position: 0,
  revision: 1,
  turnId: null,
  state: 'settled',
  sessionUpdate: 'tool_call_update',
  id: 'row-1',
  toolCallId: 'call-1',
  title: 'Run',
  kind: 'execute',
  status: 'completed',
  content: preview('head\n…\ntail'),
  rawOutput: '{"stdout":"head\\n…\\ntail"}',
  _meta: { argo: { truncated: true, fullOutput } },
});

it('names the Blobs that hold the whole output of a truncated row, and none for a whole row', () => {
  expect(
    fullOutputBlobIds(truncated({ content: blob('a'), rawOutput: blob('b') })),
  ).toEqual({ content: 'a', rawOutput: 'b' });
  expect(fullOutputBlobIds({ ...truncated(), _meta: undefined })).toEqual({});
});

it('puts the whole content and raw output in place of the previews', () => {
  const row = truncated({ content: blob('a'), rawOutput: blob('b') });

  const full: FullOutputText = {
    content: JSON.stringify(preview(whole)),
    rawOutput: JSON.stringify({ stdout: whole }),
  };

  expect(withFullOutput(row, full)).toEqual({
    ...row,
    content: preview(whole),
    rawOutput: { stdout: whole },
  });
});

it('keeps the preview of a field whose whole output has not come', () => {
  const row = truncated({ content: blob('a'), rawOutput: blob('b') });

  const shown = withFullOutput(row, {
    rawOutput: JSON.stringify('whole'),
  });

  expect(shown.content).toBe(row.content);
  expect(shown.rawOutput).toBe('whole');
});

it('is the same row when nothing has come, so a drawing that holds it does not draw again', () => {
  const row = truncated({ content: blob('a') });

  expect(withFullOutput(row, {})).toBe(row);
});

it('keeps the preview when the whole output is not what the Server said it was', () => {
  const row = truncated({ content: blob('a') });

  expect(withFullOutput(row, { content: '{"not":"blocks"}' })).toBe(row);
  expect(withFullOutput(row, { content: 'not json' })).toBe(row);
});
