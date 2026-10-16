import { expect, it } from 'vitest';
import { terminalOutputPreview } from './shell-output-preview';

it.each([
  { limit: undefined, output: 'A😀終Z', truncated: false },
  { limit: 0, output: '', truncated: true },
  { limit: 1, output: 'Z', truncated: true },
  { limit: 3, output: 'Z', truncated: true },
  { limit: 4, output: '終Z', truncated: true },
  { limit: 6, output: '終Z', truncated: true },
  { limit: 8, output: '😀終Z', truncated: true },
  { limit: 9, output: 'A😀終Z', truncated: false },
])(
  'retains a valid UTF-8 tail for an ACP outputByteLimit of $limit',
  ({ limit, output, truncated }) => {
    expect(terminalOutputPreview(Buffer.from('A😀終Z'), limit)).toEqual({
      output,
      truncated,
    });
  },
);
