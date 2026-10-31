import { describe, expect, it } from 'vitest';
import { unfencedText } from './fenced-text';

describe('unfencedText', () => {
  it('takes a command output out of its console fence', () => {
    expect(
      unfencedText('```console\nqa-token-file PLUM-7314\n---\nhello\n```'),
    ).toEqual({
      code: 'qa-token-file PLUM-7314\n---\nhello',
      language: 'console',
    });
  });

  it('takes a read file out of a bare fence', () => {
    expect(unfencedText('```\n     1\tone\n     2\ttwo\n```')).toEqual({
      code: '     1\tone\n     2\ttwo',
      language: undefined,
    });
  });

  it('keeps the inner fences of text whose own fence is longer', () => {
    expect(unfencedText('````\n```js\nlet a\n```\n````')).toEqual({
      code: '```js\nlet a\n```',
      language: undefined,
    });
  });

  it('reads a fence whose closing line is still to come as the code so far', () => {
    expect(unfencedText('```console\nfirst line').code).toBe('first line');
  });

  it('leaves text that is not a fence as written', () => {
    expect(unfencedText('hello-from-qa').code).toBe('hello-from-qa');
    expect(unfencedText('Output:\n```\nx\n```').code).toBe(
      'Output:\n```\nx\n```',
    );
  });

  it('leaves indented text alone, which Markdown would read as code', () => {
    expect(unfencedText('    indented output').code).toBe(
      '    indented output',
    );
  });
});
