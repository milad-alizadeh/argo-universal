import { describe, expect, it, vi } from 'vitest';
import { sheetCommands } from './form-sheet-commands';
import type { FormSheetProps, SheetState } from './form-sheet-types';

function sheetHarness(): ReturnType<typeof sheetCommands> {
  let current: SheetState | undefined;
  return sheetCommands({
    routes: {
      present: vi.fn<() => void>(),
      dismiss: vi.fn<() => void>(),
      push: vi.fn<() => void>(),
      back: vi.fn<() => void>(),
    },
    read: () => current,
    publish: (sheet): void => {
      current = sheet;
    },
  });
}

function sheetProps(): FormSheetProps {
  return {
    open: true,
    label: 'Issue details',
    children: null,
    onOpenChange: vi.fn<FormSheetProps['onOpenChange']>(),
    onClosed: vi.fn<NonNullable<FormSheetProps['onClosed']>>(),
  };
}

describe('native form sheet lifecycle', () => {
  it('reports a native dismissal once even when removal and cleanup both arrive', () => {
    const commands = sheetHarness();
    const props = sheetProps();
    commands.show('request', props);
    commands.closed();
    commands.closed();
    commands.hide('request');
    expect(props.onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
    expect(props.onClosed).toHaveBeenCalledTimes(1);
  });

  it('does not turn an answered form closing into a second cancel answer', () => {
    const commands = sheetHarness();
    const props = sheetProps();
    commands.show('request', props);
    commands.hide('request');
    commands.closed();
    expect(props.onOpenChange).not.toHaveBeenCalled();
    expect(props.onClosed).toHaveBeenCalledTimes(1);
  });

  it('keeps a sending form protected while a picker page opens and returns', () => {
    const commands = sheetHarness();
    const props = sheetProps();
    commands.show('request', props);
    commands.push({ title: 'Team', content: null });
    commands.update('request', { ...props, dismissible: false });
    commands.back();
    expect(commands.canDismiss()).toBe(false);
    commands.update('request', { ...props, dismissible: true });
    expect(commands.canDismiss()).toBe(true);
  });
});
