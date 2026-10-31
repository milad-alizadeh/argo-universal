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

// Opening New Session's URL builds the list below it from the same path, so the list carries the page's params.
const listUnderNewSession = { name: 'index', params: { id: 'new' } };

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

  it('keeps the list New Session was opened over by URL', () => {
    expect(
      withoutNewSession({
        index: 1,
        routes: [listUnderNewSession, newSession],
      })?.routes.map((route) => route.name),
    ).toEqual(['index']);
  });

  it("takes the closed Session's id off the list it leaves", () => {
    expect(
      withoutNewSession({
        index: 1,
        routes: [listUnderNewSession, newSession],
      })?.routes,
    ).toEqual([{ name: 'index', params: {} }]);
  });

  it.each([
    ['a Session', { index: 1, routes: [list, session] }],
    ['the list', { index: 0, routes: [list] }],
    // Dropping the only page would leave the section with no page to show.
    ['New Session with no list under it', { index: 0, routes: [newSession] }],
  ])('leaves %s as it is', (_, pages) => {
    expect(withoutNewSession(pages)).toBeUndefined();
  });
});
