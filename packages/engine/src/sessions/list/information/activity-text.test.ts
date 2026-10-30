import { expect, it } from 'vitest';
import { activityText } from './activity-text';

it.each([
  [
    'a link with an absolute target',
    'Created [qa-note.txt](/tmp/argo-qa-full/home/worktrees/abc/qa-note.txt) with QA_FILE_1320 on its own line.',
    'Created qa-note.txt with QA_FILE_1320 on its own line.',
  ],
  [
    'a link with a title',
    'See [docs](https://a.dev/x "Docs") now',
    'See docs now',
  ],
  ['an image', 'Saw ![chart](/a/b/c.png) here', 'Saw chart here'],
  ['a reference link', 'Read [the guide][1] first', 'Read the guide first'],
  ['an autolink', 'Open <https://a.dev/x>', 'Open https://a.dev/x'],
  ['inline code', 'Run `pnpm verify` now', 'Run pnpm verify now'],
  [
    'bold and italic',
    'It is **done** and _fine_ and *ok*',
    'It is done and fine and ok',
  ],
  ['strikethrough', 'Was ~~old~~ new', 'Was old new'],
  ['a heading', '## Summary of work', 'Summary of work'],
  ['a list item', '- [x] Added tests', 'Added tests'],
  ['a quote', '> quoted text', 'quoted text'],
  [
    'brackets that are not a link',
    'Set [draft] flag and a[0] = 1',
    'Set [draft] flag and a[0] = 1',
  ],
  [
    'a snake_case identifier',
    'Rename my_var_name today',
    'Rename my_var_name today',
  ],
  [
    'an unwrapped absolute path',
    'Edited /Users/milad/dev/app/src/index.ts.',
    'Edited index.ts.',
  ],
  [
    'a path in code',
    'Edited `/Users/milad/dev/app/src/index.ts`',
    'Edited index.ts',
  ],
  ['a home path', 'Open ~/dev/app/notes.md', 'Open notes.md'],
  ['a short slash word', 'Use and/or /help', 'Use and/or /help'],
  ['a url', 'Visit https://a.dev/x/y/z', 'Visit https://a.dev/x/y/z'],
  ['leading blank lines', '\n\nFirst line\nSecond', 'First line'],
  ['empty text', '', ''],
])('keeps readable text for %s', (_name, markdown, expected): void => {
  expect(activityText(markdown)).toBe(expected);
});
