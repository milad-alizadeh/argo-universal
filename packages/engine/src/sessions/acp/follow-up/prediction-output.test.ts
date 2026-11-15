import { describe, expect, it } from 'vitest';
import { PredictionOutput } from './prediction-output';

function outputOf(...chunks: string[]): PredictionOutput {
  const output = new PredictionOutput(new AbortController());

  for (const text of chunks) {
    output.observe({
      sessionId: 's',
      update: {
        sessionUpdate: 'agent_message_chunk',
        content: { type: 'text', text },
      },
    });
  }

  return output;
}

describe('PredictionOutput', () => {
  it('reads a JSON suggestion', () => {
    expect(outputOf('{"suggestion":"Run it"}').read()).toBe('Run it');
  });

  it('ignores a version banner before the JSON', () => {
    expect(outputOf('pi v1.5.2\n', '{"suggestion":"Run it"}').read()).toBe(
      'Run it',
    );
  });

  it('rejects text with no JSON', () => {
    expect(outputOf('pi v1.5.2\n').read()).toBeNull();
  });
});
