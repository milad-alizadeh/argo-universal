import { describe, expect, it } from 'vitest';
import { splitPath } from './path-parts';

describe('splitPath', () => {
  it('splits a nested path after its last slash', () => {
    expect(splitPath('src/http/no-store.ts')).toEqual({
      folder: 'src/http/',
      name: 'no-store.ts',
    });
  });

  it('keeps a file in the root whole as the name', () => {
    expect(splitPath('README.md')).toEqual({ folder: '', name: 'README.md' });
  });

  it('keeps a leading slash in the folder', () => {
    expect(splitPath('/repo/large.txt')).toEqual({
      folder: '/repo/',
      name: 'large.txt',
    });
  });

  it('leaves no name after a trailing slash', () => {
    expect(splitPath('src/http/')).toEqual({ folder: 'src/http/', name: '' });
  });

  it('treats an empty path as a nameless root', () => {
    expect(splitPath('')).toEqual({ folder: '', name: '' });
  });
});
