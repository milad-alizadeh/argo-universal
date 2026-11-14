import { createRejectionCounter } from '@repo/machine-log';
import { describe, expect, it, vi } from 'vitest';
import { sessionTurn } from '../../turn';
import {
  followUpPromptMeta,
  parseFollowUpSuggestion,
  supportsFollowUpSuggestions,
} from './follow-up-suggestions';

const initialization = {
  agentCapabilities: { _meta: { promptSuggestions: { version: 1 } } },
};

const candidate = { turnId: 'local-turn', text: null };

describe('the shared Follow-up suggestion contract', () => {
  it.each(['end_turn', 'cancelled', 'error', 'max_tokens', 'refusal'] as const)(
    'retains a candidate only after successful completion: %s',
    (stopReason) => {
      const step = sessionTurn.end(
        {
          activeTurnId: candidate.turnId,
          activeTurnStartedAt: 0,
          feedEnded: false,
          storageFailedTurn: false,
          input: { now: () => 1 },
          followUpSuggestion: candidate,
        },
        { stopReason },
      );

      expect(step.change?.followUpSuggestion).toEqual(
        stopReason === 'end_turn' ? candidate : null,
      );
    },
  );
  it.each([
    undefined,
    {},
    { agentCapabilities: {} },
    { agentCapabilities: { _meta: { promptSuggestions: { version: 2 } } } },
  ])('leaves unsupported Agents untouched: %j', (value) => {
    expect(supportsFollowUpSuggestions(value)).toBe(false);
    expect(
      followUpPromptMeta(value, {
        turnId: candidate.turnId,
        followUpSuggestions: true,
      }),
    ).toEqual({});
  });

  it.each([true, false])(
    'sends explicit consent %s and the local Turn identifier',
    (enabled) => {
      expect(
        followUpPromptMeta(initialization, {
          turnId: candidate.turnId,
          followUpSuggestions: enabled,
        }),
      ).toEqual({
        _meta: { promptSuggestions: { promptId: candidate.turnId, enabled } },
      });
    },
  );

  it('accepts a correlated prediction and an explicit clear', () => {
    const prediction = {
      version: 1,
      promptId: candidate.turnId,
      suggestions: [{ text: ' Run the tests ' }],
    };

    const shown = parseFollowUpSuggestion(candidate, {
      sessionUpdate: 'session_info_update',
      _meta: { promptSuggestions: prediction },
    });

    expect(shown).toEqual({ ...candidate, text: 'Run the tests' });
    expect(
      parseFollowUpSuggestion(shown, {
        sessionUpdate: 'session_info_update',
        _meta: { promptSuggestions: { ...prediction, suggestions: [] } },
      }),
    ).toEqual(candidate);
  });

  it.each([
    undefined,
    { version: 1, promptId: 'older-turn', suggestions: [{ text: 'Stale' }] },
    {
      version: 2,
      promptId: candidate.turnId,
      suggestions: [{ text: 'Wrong version' }],
    },
    { version: 1, promptId: candidate.turnId, suggestions: [{ text: ' ' }] },
    {
      version: 1,
      promptId: candidate.turnId,
      suggestions: [{ text: 'a'.repeat(1001) }],
    },
    {
      version: 1,
      promptId: candidate.turnId,
      suggestions: [{ text: 'One' }, { text: 'Two' }],
    },
  ])(
    'ignores stale or malformed data without replacing the candidate: %j',
    (value) => {
      expect(
        parseFollowUpSuggestion(candidate, {
          sessionUpdate: 'session_info_update',
          _meta: { promptSuggestions: value },
        }),
      ).toBe(candidate);
      expect(
        parseFollowUpSuggestion(null, {
          sessionUpdate: 'session_info_update',
          _meta: { promptSuggestions: value },
        }),
      ).toBeNull();
    },
  );
});

it('reports and counts malformed payloads, but not absent or stale predictions', () => {
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  const rejections = createRejectionCounter('suggestion test');
  parseFollowUpSuggestion(
    candidate,
    { sessionUpdate: 'session_info_update' },
    rejections,
  );
  expect(rejections.count()).toBe(0);
  parseFollowUpSuggestion(
    candidate,
    {
      sessionUpdate: 'session_info_update',
      _meta: { promptSuggestions: { version: 99 } },
    },
    rejections,
  );
  expect(rejections.count()).toBe(1);
  parseFollowUpSuggestion(
    candidate,
    {
      sessionUpdate: 'session_info_update',
      _meta: {
        promptSuggestions: { version: 1, promptId: 'older', suggestions: [] },
      },
    },
    rejections,
  );
  expect(rejections.count()).toBe(1);
  expect(log).toHaveBeenCalledOnce();
  log.mockRestore();
});
