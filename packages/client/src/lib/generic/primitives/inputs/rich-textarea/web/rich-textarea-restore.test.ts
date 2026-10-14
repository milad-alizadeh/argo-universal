import { describe, expect, it } from 'vitest';
import { roundTrip, typedThenRestored } from './rich-textarea-headless.mocks';

// What a person typed, kept as a draft and restored, is kept again exactly as it was.
const typed: { name: string; text: string }[] = [
  { name: 'a UNC path', text: '\\\\server\\share' },
  { name: 'escaped stars', text: '\\*x\\*' },
  { name: 'an escaped heading marker', text: '\\# not a heading' },
  { name: 'a backslash before a link', text: 'see \\[docs](https://argo.dev)' },
  { name: 'two blank lines between lines', text: 'a\n\n\nb' },
  { name: 'three blank lines between lines', text: 'a\n\n\n\nb' },
];

describe('RichTextarea draft restore', () => {
  it.each(typed)('keeps $name as typed', ({ text }) => {
    expect(typedThenRestored(text)).toBe(text);
  });

  // Markdown in a kept draft means what it means in the Feed, so `__x__` restores as bold.
  it('restores underscore bold in the Feed spelling', () => {
    expect(typedThenRestored('__bold__')).toBe('**bold**');
  });

  it('keeps a link URL with escaped parentheses', () => {
    const markdown =
      '[Lisp](https://en.wikipedia.org/wiki/Lisp_\\(language\\))';

    expect(roundTrip(markdown)).toBe(markdown);
  });
});
