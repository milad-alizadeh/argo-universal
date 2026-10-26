import { expect, it } from 'vitest';
import { Action } from './wire';

const draft = '#8 Keep the Plugin boundary';

it('opens New Session for a named Project', () => {
  expect(
    Action.safeParse({ action: 'newSession', projectId: 'project-1', draft })
      .success,
  ).toBe(true);
});

it('refuses New Session without a Project', () => {
  expect(
    Action.safeParse({ action: 'newSession', projectId: '', draft }).success,
  ).toBe(false);
});
