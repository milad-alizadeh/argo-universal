import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Action, actionGroups } from './action-declarations';

const Wrapper = (): null => null;

const press = vi.fn<() => void>();

const copy = createElement(Action, {
  key: 'copy',
  icon: 'copy',
  label: 'Copy',
  onPress: press,
});

describe('actionGroups', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('names a component that is not an Action, and still reads the Actions beside it', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(vi.fn());
    const groups = actionGroups([createElement(Wrapper, { key: 'w' }), copy]);

    expect(error).toHaveBeenCalledOnce();
    expect(String(error.mock.calls[0]?.[0])).toContain('<Wrapper>');
    expect(groups.flatMap((group) => group.actions)).toHaveLength(1);
  });

  it('stays quiet for Actions and Sections', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(vi.fn());

    actionGroups(createElement(Action.Section, { key: 's' }, copy));

    expect(error).not.toHaveBeenCalled();
  });
});
