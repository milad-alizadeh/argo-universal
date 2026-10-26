import type { KeyDownEvent } from 'react-native';
import type { ContentSelection } from './list-content-selection';

function editingText(target: KeyDownEvent['target']): boolean {
  if (!(target instanceof HTMLElement)) return false;

  return (
    target.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
  );
}

function selectsAll(event: KeyDownEvent): boolean {
  const keys = event.nativeEvent;

  return (keys.metaKey || keys.ctrlKey) && keys.key.toLowerCase() === 'a';
}

// Escape is left to an outer handler when there is no selection to clear.
function clears(selection: ContentSelection, event: KeyDownEvent): boolean {
  return event.nativeEvent.key === 'Escape' && selection.selected.length > 0;
}

function handleKey(selection: ContentSelection, event: KeyDownEvent): void {
  if (selectsAll(event)) {
    event.preventDefault();
    selection.all();
  } else if (clears(selection, event)) {
    event.preventDefault();
    selection.close();
  }
}

export function selectionKeys(
  selection: ContentSelection | null,
): ((event: KeyDownEvent) => void) | undefined {
  if (!selection) return undefined;

  return (event) => {
    if (event.defaultPrevented || editingText(event.target)) return;
    handleKey(selection, event);
  };
}
