import { expect, it } from 'vitest';
import { SessionUpdate } from './session-update';

const storedHuman = {
  id: 'old:user',
  sessionId: 'target',
  position: 0,
  revision: 1,
  turnId: 'old',
  state: 'settled',
  sessionUpdate: 'user_message',
  messageId: 'old:user',
  content: [{ type: 'text', text: 'Human prompt' }],
};

it('reads existing human rows without sender metadata', () => {
  expect(SessionUpdate.parse(storedHuman)).toEqual(storedHuman);
});

it.each([
  { type: 'session', sessionId: 'reviewer', title: 'Review changes' },
  { type: 'plugin', pluginId: 'automation', title: 'Automation' },
])(
  'reads a stored $type Prompt with its sender identity and title',
  (sender) => {
    const row = {
      ...storedHuman,
      sessionUpdate: 'prompt_message',
      _meta: { argo: { sender } },
    };

    expect(SessionUpdate.parse(row)).toEqual(row);
  },
);

it('refuses missing or human sender metadata on a nonhuman Prompt row', () => {
  expect(
    SessionUpdate.safeParse({ ...storedHuman, sessionUpdate: 'prompt_message' })
      .success,
  ).toBe(false);
  expect(
    SessionUpdate.safeParse({
      ...storedHuman,
      sessionUpdate: 'prompt_message',
      _meta: { argo: { sender: { type: 'user' } } },
    }).success,
  ).toBe(false);
});
