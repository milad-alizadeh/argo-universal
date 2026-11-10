import { describe, expect, it } from 'vitest';
import { drawnSessions, retainSession } from './retained-sessions';

const visit = (sessionIds: string[]): string[] =>
  sessionIds.reduce<string[]>(retainSession, []);

// Whether `first` is drawn before `second`, for two Sessions that are both kept.
const drawnBefore = (
  recent: string[],
  first: string,
  second: string,
): boolean =>
  drawnSessions(recent).indexOf(first) < drawnSessions(recent).indexOf(second);

describe('the Session pages kept mounted on a wide window', () => {
  it('keeps the shown Session and the two shown before it', () => {
    expect(visit(['a', 'b', 'c', 'd'])).toEqual(['d', 'c', 'b']);
  });

  it('keeps a Session once however often it is shown', () => {
    expect(visit(['a', 'b', 'a'])).toEqual(['a', 'b']);
  });

  it('holds what it kept while the same Session stays shown', () => {
    const recent = visit(['a', 'b']);

    expect(retainSession(recent, 'b')).toBe(recent);
  });

  it('draws every kept Session', () => {
    expect(drawnSessions(visit(['c', 'a', 'b'])).toSorted()).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  // A page the browser moves in the document loses its Feed's scroll position (#1982).
  it('never moves a kept page past another when the person returns to a Session', () => {
    const left = visit(['b', 'a']);
    const returned = retainSession(left, 'b');

    expect(drawnBefore(returned, 'a', 'b')).toBe(drawnBefore(left, 'a', 'b'));
  });

  it('never moves a kept page past another as Sessions come and go', () => {
    const visits = ['c', 'a', 'b', 'a', 'd', 'c', 'a', 'b', 'd', 'a'];
    let recent: string[] = [];

    for (const sessionId of visits) {
      const next = retainSession(recent, sessionId);
      const stayed = new Set(recent).intersection(new Set(next));

      expect(drawnSessions(next).filter((id) => stayed.has(id))).toEqual(
        drawnSessions(recent).filter((id) => stayed.has(id)),
      );
      recent = next;
    }
  });
});
