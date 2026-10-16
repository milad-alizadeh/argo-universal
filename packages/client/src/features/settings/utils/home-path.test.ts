import { describe, expect, it } from 'vitest';
import { homePath } from './home-path';

describe('homePath', () => {
  it('shortens a macOS home folder to a tilde', () => {
    expect(homePath('/Users/milad/Developer/argo')).toBe('~/Developer/argo');
  });

  it('shortens a Linux home folder to a tilde', () => {
    expect(homePath('/home/milad/code')).toBe('~/code');
  });

  it('keeps a path outside a home folder whole', () => {
    expect(homePath('/opt/projects/argo')).toBe('/opt/projects/argo');
  });

  it('keeps a folder that only starts like a home folder', () => {
    expect(homePath('/Users')).toBe('/Users');
  });
});
