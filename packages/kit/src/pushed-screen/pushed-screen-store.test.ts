import { describe, expect, it } from 'vitest';
import {
  hasPushedScreen,
  newScreenId,
  pushedContent,
  releasePushedScreen,
  routePushedScreen,
  showPushedScreen,
} from './pushed-screen-store';

describe('a pushed screen whose opener unmounts', () => {
  it('is forgotten at once when its route is not drawn', () => {
    const id = newScreenId();

    showPushedScreen(id, 'page');
    releasePushedScreen(id);

    expect(pushedContent(id)).toBeNull();
  });

  it('stays while its route is drawn and goes when Back takes it', () => {
    const id = newScreenId();

    showPushedScreen(id, 'page');
    routePushedScreen(id, true);
    releasePushedScreen(id);
    expect(pushedContent(id)).toBe('page');

    routePushedScreen(id, false);
    expect(pushedContent(id)).toBeNull();
  });
});

describe('an id no opener has pushed', () => {
  it('names no pushed screen', () => {
    expect(hasPushedScreen('zzz')).toBe(false);
  });

  it('names one once its opener has shown it', () => {
    const id = newScreenId();

    showPushedScreen(id, 'page');

    expect(hasPushedScreen(id)).toBe(true);
  });
});
