import { describe, expect, it } from 'vitest';
import { chooseFirstSession } from './first-session';

const newSession = null;

describe('chooseFirstSession', () => {
  it.each([
    {
      case: 'opens the first listed Session',
      listed: ['first', 'second'],
      chosen: undefined,
      expected: 'first',
    },
    {
      case: 'opens New Session without Sessions',
      listed: [],
      chosen: undefined,
      expected: newSession,
    },
    {
      case: 'keeps the open Session when the list reorders',
      listed: ['second', 'first'],
      chosen: 'first',
      expected: 'first',
    },
    {
      case: 'opens the first listed Session when the open one leaves the list',
      listed: ['second'],
      chosen: 'first',
      expected: 'second',
    },
    {
      case: 'opens New Session when the open one leaves an otherwise empty list',
      listed: [],
      chosen: 'first',
      expected: newSession,
    },
    {
      case: 'keeps New Session when Sessions appear',
      listed: ['first'],
      chosen: newSession,
      expected: newSession,
    },
  ])('$case', ({ listed, chosen, expected }) => {
    expect(chooseFirstSession(listed, chosen)).toBe(expected);
  });
});
