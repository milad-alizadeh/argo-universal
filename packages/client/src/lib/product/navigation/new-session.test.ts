import { describe, expect, it } from 'vitest';
import { withoutNewSession } from './new-session';

const list = { name: 'index' };

const newSession = { name: '[id]', params: { id: 'new' } };

const newSessionInProject = {
  name: '[id]',
  params: { id: 'new', projectId: 'example-project' },
};

const session = {
  name: '[id]',
  params: { id: '0b9f6a52-5d8e-4c1a-9a43-0d6c1e2f7b10' },
};

describe('withoutNewSession', () => {
  it.each([
    ['New Session', newSession],
    ["a Project's New Session", newSessionInProject],
  ])('drops %s and shows the list', (_, page) => {
    expect(withoutNewSession({ index: 1, routes: [list, page] })).toEqual({
      index: 0,
      routes: [list],
    });
  });

  it.each([
    ['a Session', { index: 1, routes: [list, session] }],
    ['the list', { index: 0, routes: [list] }],
  ])('leaves %s as it is', (_, pages) => {
    expect(withoutNewSession(pages)).toBeUndefined();
  });
});
