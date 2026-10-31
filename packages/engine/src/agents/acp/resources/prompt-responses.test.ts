import type { PromptRequest } from '@agentclientprotocol/sdk';
import { heldPrompt } from '@repo/mocks/agent/cancellable-scenarios';
import { scenarios } from '@repo/mocks/agent/scenarios';
import { responseSequence } from '@repo/mocks/agent/scripted-responses';
import { describe, expect, it } from 'vitest';

const sequence = (): ReturnType<typeof responseSequence<'session/prompt'>> =>
  responseSequence<'session/prompt'>(
    scenarios['reply-or-hold'].responses?.['session/prompt'],
  );

const promptOf = (text: string): PromptRequest => ({
  sessionId: 'session',
  prompt: [{ type: 'text', text }],
});

const held = [{ type: 'wait-for-cancel' }];

const ordinary = 'Run the checks';

describe('the reply-or-hold scenario choosing a response by prompt', () => {
  it('holds the Turn for the held prompt, whichever prompt came before it', () => {
    const next = sequence();
    next(promptOf(ordinary));
    expect(next(promptOf(heldPrompt))?.steps).toEqual(held);
    expect(next(promptOf(heldPrompt))?.steps).toEqual(held);
  });

  it('gives every other prompt the scenario reply, however many came before', () => {
    const next = sequence();
    next(promptOf(heldPrompt));
    expect(next(promptOf(ordinary))?.steps).toBeUndefined();
    expect(next(promptOf(ordinary))?.steps).toBeUndefined();
  });
});
