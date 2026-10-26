import { Platform, type GestureResponderEvent } from 'react-native';
import { z } from 'zod';

export interface SelectionInput {
  ids: readonly string[];
  selected: readonly string[];
  change: (ids: readonly string[]) => void;
}

export function toggleSelected(input: SelectionInput, id: string): void {
  input.change(
    input.selected.includes(id)
      ? input.selected.filter((value) => value !== id)
      : [...input.selected, id],
  );
}

interface Modifiers {
  range: boolean;
  toggle: boolean;
}

const modifierKeys = z.object({
  metaKey: z.boolean().optional(),
  ctrlKey: z.boolean().optional(),
  shiftKey: z.boolean().optional(),
});

function modifiers(event?: GestureResponderEvent): Modifiers {
  const native = event ? modifierKeys.parse(event.nativeEvent) : {};

  return {
    range: native.shiftKey === true,
    toggle: native.metaKey === true || native.ctrlKey === true,
  };
}

function selectedRange(
  ids: readonly string[],
  anchor: string,
  id: string,
): readonly string[] {
  const start = ids.indexOf(anchor);
  const end = ids.indexOf(id);

  if (start < 0 || end < 0) return [];

  return ids.slice(Math.min(start, end), Math.max(start, end) + 1);
}

// The range anchor survives re-renders; its order always comes from the current list.
export class SelectionRange {
  private anchor: string | undefined;

  public choose(input: SelectionInput, id: string, keys: Modifiers): void {
    if (this.canExtend(keys)) {
      this.extend(input, id);

      return;
    }

    this.anchor = id;

    if (keys.toggle) toggleSelected(input, id);
    else input.change([id]);
  }

  private canExtend(keys: Modifiers): boolean {
    return keys.range && this.anchor !== undefined;
  }

  private extend(input: SelectionInput, id: string): void {
    const range = selectedRange(input.ids, this.anchor ?? id, id);
    input.change([...new Set([...input.selected, ...range])]);
  }
}

function activates(keys: Modifiers, activate?: () => void): boolean {
  return Boolean(activate) && !keys.range && !keys.toggle;
}

interface RowPress {
  id: string;
  event?: GestureResponderEvent;
  activate?: () => void;
}

function selectWebRow(
  input: SelectionInput,
  range: SelectionRange,
  press: RowPress,
): void {
  const keys = modifiers(press.event);

  if (activates(keys, press.activate)) {
    input.change([]);
    press.activate?.();

    return;
  }

  range.choose(input, press.id, keys);
}

export function selectRow(
  input: SelectionInput,
  range: SelectionRange,
  press: RowPress,
): void {
  if (Platform.OS === 'web') selectWebRow(input, range, press);
  else toggleSelected(input, press.id);
}
