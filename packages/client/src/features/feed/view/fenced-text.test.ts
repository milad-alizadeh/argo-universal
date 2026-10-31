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

  it('takes the text out of a fence closed by a longer one', () => {
    expect(unfencedText('```console\nfoo\nbar\n````')).toBe('foo\nbar');
    expect(unfencedText('```console\nfoo\nbar\n`````')).toBe('foo\nbar');
    expect(unfencedText('```\nfoo\n``````````')).toBe('foo');
  });

  it('keeps a shorter fence-like line inside a longer fence', () => {
    expect(unfencedText('````\nfoo\n```\nbar\n````')).toBe('foo\n```\nbar');
  });

  it('leaves text whose last line only ends in backticks', () => {
    expect(unfencedText('```console\nfoo\nbar```')).toBe(
      '```console\nfoo\nbar```',
    );
  });

  it('reads a fence written with CRLF line ends and trailing whitespace', () => {
    expect(unfencedText('```console\r\nfoo\r\nbar\r\n````  \r\n\r\n')).toBe(
      'foo\r\nbar',
    );
  });

  it('takes an empty fence to empty text', () => {
    expect(unfencedText('```\n```')).toBe('');
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
