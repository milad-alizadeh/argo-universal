import type { LexicalEditor } from 'lexical';

type FieldListeners = Record<'pointerdown' | 'keydown', () => void>;

function attach(field: HTMLElement | null, listeners: FieldListeners): void {
  for (const [type, listener] of Object.entries(listeners))
    field?.addEventListener(type, listener);
}

function detach(field: HTMLElement | null, listeners: FieldListeners): void {
  for (const [type, listener] of Object.entries(listeners))
    field?.removeEventListener(type, listener);
}

function listenOnField(
  editor: LexicalEditor,
  listeners: FieldListeners,
): () => void {
  const unregister = editor.registerRootListener((field, previous) => {
    detach(previous, listeners);
    attach(field, listeners);
  });
  return () => {
    unregister();
    detach(editor.getRootElement(), listeners);
  };
}

type Follow = (isMouseSelection: boolean) => void;
interface MouseListeners {
  field: FieldListeners;
  release: () => void;
}

/*
 * A selection is the mouse's once a press in the field is released, wherever the pointer ends;
 * any key in the field makes it the keyboard's.
 */
function mouseSelectionListeners(onChange: Follow): MouseListeners {
  let pressing = false;
  const press = (): void => {
    pressing = true;
    onChange(false);
  };
  const release = (): void => {
    if (pressing) onChange(true);
    pressing = false;
  };
  const type = (): void => onChange(false);
  return { field: { pointerdown: press, keydown: type }, release };
}

// Tells whether the field's selection is the mouse's as it changes hands.
export function trackMouseSelection(
  editor: LexicalEditor,
  onChange: Follow,
): () => void {
  const { field, release } = mouseSelectionListeners(onChange);
  document.addEventListener('pointerup', release);
  const stopListening = listenOnField(editor, field);
  return () => {
    stopListening();
    document.removeEventListener('pointerup', release);
  };
}
