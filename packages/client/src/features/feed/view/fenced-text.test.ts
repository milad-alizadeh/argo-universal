import { describe, expect, it } from 'vitest';
import { unfencedText } from './fenced-text';

describe('unfencedText', () => {
  it('takes a command output out of its console fence', () => {
    expect(
      unfencedText('```console\nqa-token-file PLUM-7314\n---\nhello\n```'),
    ).toBe('qa-token-file PLUM-7314\n---\nhello');
  });

  it('takes a read file out of a bare fence', () => {
    expect(unfencedText('```\n     1\tone\n     2\ttwo\n```')).toBe(
      '     1\tone\n     2\ttwo',
    );
  });

  it('keeps a line of backticks that the output itself holds', () => {
    expect(
      unfencedText('```console\n# Title\n```js\nlet a\n```\ndone\n```'),
    ).toBe('# Title\n```js\nlet a\n```\ndone');
  });

  it('keeps the inner fences of text whose own fence is longer', () => {
    expect(unfencedText('````\n```js\nlet a\n```\n````')).toBe(
      '```js\nlet a\n```',
    );
  });

  it('keeps an empty line the output ends with', () => {
    expect(unfencedText('```console\nfirst\n\n```')).toBe('first\n');
  });

  it('leaves text that is not one fence as written', () => {
    expect(unfencedText('hello-from-qa')).toBe('hello-from-qa');
    expect(unfencedText('Output:\n```\nx\n```')).toBe('Output:\n```\nx\n```');
    expect(unfencedText('    indented output')).toBe('    indented output');
  });
});
