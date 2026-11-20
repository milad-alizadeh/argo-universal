import { describe, expect, it } from 'vitest';
import { readSpokenAnswer } from './spoken-answer';

describe("how Argo reads the person's spoken answer to a Permission request", () => {
  it.each([
    'Allow it',
    'Yes, allow it',
    'Go ahead, allow it once',
    'yes',
    'Yes please',
    'Go ahead',
    'Approve it',
    'OK, allow that just once',
  ])('allows once on %j', (words) => {
    expect(readSpokenAnswer(words)).toBe('allow');
  });

  it.each([
    'Reject it',
    'No, reject that',
    "Don't allow it",
    'Do not allow that',
    'No',
    'Nope',
    'Deny it',
    'No, allow it',
    "Yes, don't allow it",
  ])('rejects on %j, since a negation never allows', (words) => {
    expect(readSpokenAnswer(words)).toBe('reject');
  });

  it.each(['Always allow it', 'Allow it always', 'yes, always allow'])(
    'reads %j as always-allow, which only a click gives',
    (words) => {
      expect(readSpokenAnswer(words)).toBe('always');
    },
  );

  it.each([
    'Sounds good',
    "I'm not sure, let me think",
    'What does that command do?',
    'Allow it and then deploy the docs too',
    'How long has it been running?',
    'ok',
    '',
  ])('does not read %j as an answer', (words) => {
    expect(readSpokenAnswer(words)).toBeNull();
  });
});
