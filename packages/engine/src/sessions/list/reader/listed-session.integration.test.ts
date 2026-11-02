import { afterAll, describe, expect, it } from 'vitest';
import { openTestDatabase } from '#mocks/database';
import { stored, turn } from '#mocks/session-info';
import type { NewSessionInput, SessionInput } from '../../session-data';
import { listedSession } from './listed-session';

const { database, remove } = openTestDatabase();

afterAll(remove);

const draft = { ...stored, title: '', titleSource: 'prompt' as const };

const newInput = (prompt: NewSessionInput['prompt']): SessionInput => ({
  kind: 'new',
  database,
  runtimeDirectory: '/runtime',
  sessionId: stored.id,
  projectId: stored.projectId,
  agent: stored.agent,
  checkout: { type: 'main' },
  configOptions: [],
  projectPath: '/project',
  turnId: 'turn-1',
  prompt,
});

const prompted = (): SessionInput =>
  newInput([{ type: 'text', text: '\n  Fix the login bug\nthen test it' }]);

const empty = (): SessionInput => newInput([]);

const none = new Set<string>();

describe('listedSession', () => {
  it('lists a New Session that holds a prompt before its Turn, titled by the prompt', () => {
    expect(
      listedSession(none, prompted, { row: draft, turns: [] }),
    ).toMatchObject({ id: stored.id, title: 'Fix the login bug' });
  });

  it('keeps an empty New Session draft out of the list', () => {
    expect(
      listedSession(none, empty, { row: draft, turns: [] }),
    ).toBeUndefined();
  });

  it('lists a Session with a Turn under its stored title', () => {
    expect(
      listedSession(none, empty, {
        row: { ...draft, title: 'Named' },
        turns: [{ ...turn, sessionId: stored.id }],
      }),
    ).toMatchObject({ title: 'Named' });
  });

  it('never lists a rejected Session', () => {
    expect(
      listedSession(new Set([stored.id]), prompted, { row: draft, turns: [] }),
    ).toBeUndefined();
  });
});
