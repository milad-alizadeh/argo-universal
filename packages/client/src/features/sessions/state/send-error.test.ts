import { describe, expect, it } from 'vitest';
import { type SendFailures, toSendError } from './send-error';

const selection = {
  kind: 'selection',
  message: "Couldn't select images.",
} as const;
const upload = {
  kind: 'upload',
  message: "Couldn't upload the image.",
} as const;
const failure = (message: string): Error => new Error(message);

describe('toSendError', () => {
  it.each<{ case: string; failures: SendFailures; expected?: string }>([
    { case: 'nothing without a failure', failures: {} },
    {
      case: 'a failed image selection before a failed prompt',
      failures: { attachment: selection, prompt: failure('Agent is busy') },
      expected: "Couldn't select images.",
    },
    {
      case: 'a failed prompt before a failed upload',
      failures: { attachment: upload, prompt: failure('Agent is busy') },
      expected: "Couldn't send. Agent is busy",
    },
    {
      case: 'a failed upload before a failed settings change',
      failures: { attachment: upload, configuration: failure('Refused') },
      expected: "Couldn't upload the image.",
    },
    {
      case: 'a failed settings change before a failed close',
      failures: {
        configuration: failure('Refused'),
        close: failure('Server is down'),
      },
      expected: "Couldn't change settings. Refused",
    },
    {
      case: 'a failed close',
      failures: { close: failure('Server is down') },
      expected: "Couldn't close the Session. Server is down",
    },
  ])('shows $case', ({ failures, expected }) => {
    expect(toSendError(failures)).toBe(expected);
  });
});
