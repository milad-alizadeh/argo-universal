import { describe, expect, it } from 'vitest';
import { argsMatch } from './plugin-access-rules';

// Patterns and arguments are written space separated, so each case reads as the command line it is.
const words = (line: string): string[] => (line === '' ? [] : line.split(' '));

type Case = [name: string, patterns: string, args: string];

const accepted: Case[] = [
  ['an exact pattern takes the identical argument', 'status', 'status'],
  ['no patterns take no arguments', '', ''],
  ['every exact pattern in order', 'pr view', 'pr view'],
  ['`*` takes one plain argument', '*', 'main'],
  ['`*` takes a value that only contains a dash', '*', 'a-b'],
  ['`*` takes one argument beside exact patterns', 'pr *', 'pr 42'],
  ['a trailing `**` takes zero arguments', 'log **', 'log'],
  ['a trailing `**` takes one argument', 'log **', 'log main'],
  ['a lone `**` takes everything, options included', '**', '--a -b c'],
  ['a trailing `**` takes options', 'log **', 'log --oneline -n'],
  ['`*` takes one and `**` the rest', '* **', 'a b c'],
  ['`*` takes a leading dash after a declared `--`', '-- *', '-- -x'],
  ['`*` takes an option-shaped value after `--`', '-- *', '-- --output=f'],
  ['`*` takes a lone dash after `--`', 'cat -- *', 'cat -- -'],
  ['`**` takes options after a declared `--`', '-- **', '-- -a --b'],
  ['`**` in the middle is one exact argument', '** x', '** x'],
];

const refused: Case[] = [
  ['an exact pattern refuses another argument', 'status', 'commit'],
  ['an exact pattern is case sensitive', 'status', 'Status'],
  ['an exact pattern refuses a prefix of itself', 'status', 'stat'],
  ['an exact pattern refuses an extension of itself', 'stat', 'status'],
  ['an exact pattern takes no wildcard text', 'a*', 'abc'],
  ['no patterns refuse an argument', '', 'x'],
  ['an exact pattern refuses no argument', 'status', ''],
  ['an exact pattern refuses an extra argument', 'status', 'status x'],
  ['exact patterns refuse reordered arguments', 'pr view', 'view pr'],
  ['`*` takes not zero arguments', '*', ''],
  ['`*` takes not two arguments', '*', 'a b'],
  ['`*` beside exact patterns takes not zero', 'pr *', 'pr'],
  ['`*` beside exact patterns takes not two', 'pr *', 'pr 1 2'],
  ['a trailing `**` still needs the fixed patterns', 'log **', ''],
  ['a trailing `**` still needs each fixed `*`', '* **', ''],
  ['a pattern before a trailing `**` must still match', 'log **', 'show a'],
  ['the declared `--` must be sent, not skipped', '-- *', 'x'],
  ['a `*` before `--` cannot take the `--` itself', '* -- *', '-- -- x'],
];

// The escape the rule exists to stop: an argument that becomes a flag the declaration never named.
const optionEscapes: Case[] = [
  ['`*` never takes `--output=<file>`', '*', '--output=out.txt'],
  ['`*` never takes a short option', '*', '-o'],
  ['`*` never takes a lone dash', '*', '-'],
  ['`*` never takes a `--` the declaration never named', '*', '--'],
  [
    '`*` beside exact patterns never takes `--output=<file>`',
    'pr view *',
    'pr view --output=f',
  ],
  [
    'a first `*` never takes an option before a later `--`',
    '* -- *',
    '--output=f -- x',
  ],
  ['`*` before a trailing `**` never takes an option', '* **', '--output=f x'],
  [
    'a declared `--` does not free a `*` that comes before it',
    '* * -- *',
    'a -b -- c',
  ],
];

describe('argsMatch', () => {
  it.each(accepted)('accepts %s', (_name, patterns, args) => {
    expect(argsMatch(words(patterns), words(args))).toBe(true);
  });

  it.each(refused)('refuses %s', (_name, patterns, args) => {
    expect(argsMatch(words(patterns), words(args))).toBe(false);
  });

  it.each(optionEscapes)(
    'stops the option escape: %s',
    (_name, patterns, args) => {
      expect(argsMatch(words(patterns), words(args))).toBe(false);
    },
  );

  it('`*` takes an empty argument', () => {
    expect(argsMatch(['*'], [''])).toBe(true);
  });
});
