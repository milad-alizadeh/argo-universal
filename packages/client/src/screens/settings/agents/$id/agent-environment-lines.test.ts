import { expect, it } from 'vitest';
import { changeLine } from './agent-environment-lines';

const env = { FIRST: '1', SECOND: 'two' };

it('a new line is added last', () => {
  expect(changeLine(env, undefined, 'THIRD=3')).toEqual({
    saved: true,
    env: { FIRST: '1', SECOND: 'two', THIRD: '3' },
  });
});

it('an edited line keeps its place, renamed or not', () => {
  const change = changeLine(env, 'FIRST', 'RENAMED=one');

  expect(change).toEqual({
    saved: true,
    env: { RENAMED: 'one', SECOND: 'two' },
  });
  expect(Object.keys(change.saved ? change.env : {})).toEqual([
    'RENAMED',
    'SECOND',
  ]);
});

it('a value keeps everything after the first =, and may be empty', () => {
  expect(changeLine({}, undefined, 'CONFIG={"a":"b=c"}')).toEqual({
    saved: true,
    env: { CONFIG: '{"a":"b=c"}' },
  });
  expect(changeLine({}, undefined, 'EMPTY=')).toEqual({
    saved: true,
    env: { EMPTY: '' },
  });
});

it('an emptied line removes its variable', () => {
  expect(changeLine(env, 'FIRST', '  ')).toEqual({
    saved: true,
    env: { SECOND: 'two' },
  });
});

it.each(['NO_EQUALS', '=value', 'TWO WORDS=1', '__proto__=1'])(
  'refuses %s',
  (text) => {
    expect(changeLine(env, undefined, text).saved).toBe(false);
  },
);

it('refuses a name another line already sets', () => {
  expect(changeLine(env, 'FIRST', 'SECOND=1').saved).toBe(false);
  expect(changeLine(env, undefined, 'FIRST=2').saved).toBe(false);
});

it('an unchanged name on its own line is not a duplicate', () => {
  expect(changeLine(env, 'FIRST', 'FIRST=changed')).toEqual({
    saved: true,
    env: { FIRST: 'changed', SECOND: 'two' },
  });
});
