import { afterEach, describe, expect, it, vi } from 'vitest';
import { createUnsupportedContent } from './content';

afterEach(() => vi.restoreAllMocks());

const unsupported = (
  uri?: string | null,
): ReturnType<typeof createUnsupportedContent> =>
  createUnsupportedContent('resource', 'Not shown', uri);

describe('the reference an unsupported ACP content block keeps', () => {
  it.each(['https://example.com/a', 'file:///tmp/a.txt'])(
    'keeps the inert URI %s without a report',
    (uri) => {
      const diagnostic = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      expect(unsupported(uri).reference).toBe(uri);
      expect(diagnostic).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['no URI', undefined],
    ['a null URI', null],
    ['a URI that is not a web or file reference', 'javascript:alert(1)'],
    ['a URI with credentials', 'https://user:secret@example.com/'],
  ])('drops the reference of %s without a report', (_name, uri) => {
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(unsupported(uri).reference).toBeUndefined();
    expect(diagnostic).not.toHaveBeenCalled();
  });

  it('drops a URI that does not parse, and reports and counts it', () => {
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(unsupported('https://').reference).toBeUndefined();
    expect(unsupported('https://[bad').reference).toBeUndefined();
    expect(diagnostic).toHaveBeenCalledTimes(2);
    expect(diagnostic).toHaveBeenLastCalledWith(
      expect.stringMatching(/^ACP content: unparseable resource URI #\d+$/),
    );
  });
});
