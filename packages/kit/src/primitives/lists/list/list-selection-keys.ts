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

function handleKey(selection: ContentSelection, event: KeyDownEvent): void {
  if (selectsAll(event)) {
    event.preventDefault();
    selection.all();
  } else if (event.nativeEvent.key === 'Escape') {
    event.preventDefault();
    selection.change([]);
    selection.setEditing(false);
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
