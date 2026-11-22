import { describe, expect, it } from 'vitest';
import { syntaxRuns } from './syntax-runs';

const source = [
  '// Responses must never be cached',
  'export function noStore(res: Response) {',
  "  res.headers.set(CACHE, 'no-store');",
  '  return res;',
  '}',
].join('\n');

const joined = (runs: { text: string }[] | undefined): string | undefined =>
  runs?.map((run) => run.text).join('');

describe('syntaxRuns', () => {
  // A tag, its long name, a file name or an alias Prism lacks all reach a grammar; a dotted tag is tried whole first.
  it.each(['ts', 'TypeScript', 'use-session.Test.TSX', 'mts', 'node.js'])(
    'colours %s without changing a character',
    (language) => {
      const runs = syntaxRuns(source, language);

      expect(runs?.length).toBeGreaterThan(1);
      expect(joined(runs)).toBe(source);
    },
  );

  // An unknown tag, a plain tag Prism registers empty, no tag, and a name on Object's prototype draw plain.
  it.each(['brainfuck', 'plaintext', 'notes.txt', undefined, 'constructor'])(
    'draws %s plain',
    (language) => {
      expect(syntaxRuns(source, language)).toBeUndefined();
    },
  );

  it('colours code of exactly the length limit, and draws one character past it plain', () => {
    // A comment exercises the cutoff without sending a long identifier through Prism's grammar.
    const atLimit = `/*${'a'.repeat(19_996)}*/`;

    expect(syntaxRuns(atLimit, 'ts')).toEqual([
      { text: atLimit, type: 'comment' },
    ]);
    expect(syntaxRuns(`${atLimit}\n`, 'ts')).toBeUndefined();
  });

  it('draws nothing for empty code', () => {
    expect(joined(syntaxRuns('', 'ts'))).toBe('');
  });
});
