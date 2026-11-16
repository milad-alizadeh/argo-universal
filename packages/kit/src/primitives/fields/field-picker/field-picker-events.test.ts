import { describe, expect, it, vi } from 'vitest';
import { createOf, reportToggle } from './field-picker-events';

describe('a multiple pick on the Plugin wire', () => {
  it('reports the option it turned on', () => {
    const onToggle = vi.fn();

    reportToggle({ onToggle }, ['bug'], ['bug', 'sync']);

    expect(onToggle).toHaveBeenCalledWith({ value: 'sync', on: true });
  });

  it('reports the option it turned off', () => {
    const onToggle = vi.fn();

    reportToggle({ onToggle }, ['bug', 'sync'], ['sync']);

    expect(onToggle).toHaveBeenCalledWith({ value: 'bug', on: false });
  });

  it('reports nothing for a single choice', () => {
    const onToggle = vi.fn();

    reportToggle({ onToggle }, ['open'], 'closed');

    expect(onToggle).not.toHaveBeenCalled();
  });
});

describe('a Plugin’s create offer', () => {
  it('becomes the App’s create row', () => {
    const onCreate = vi.fn();

    createOf({ createLabel: 'Create label', onCreate })?.onCreate('epsilon');

    expect(onCreate).toHaveBeenCalledWith('epsilon');
  });

  it('needs both its label and its event', () => {
    expect(createOf({ createLabel: 'Create label' })).toBeUndefined();
  });
});
