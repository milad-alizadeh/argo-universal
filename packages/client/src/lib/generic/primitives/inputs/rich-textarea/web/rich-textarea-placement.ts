import type { LexicalEditor } from 'lexical';

// Where the selection sits inside the field, so a popover opens beside it.
export interface FieldPlacement {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function selectedRect(): DOMRect | undefined {
  const selection = window.getSelection();

  return selection?.rangeCount
    ? selection.getRangeAt(0).getBoundingClientRect()
    : undefined;
}

export function placementInField(
  editor: LexicalEditor,
  rect: DOMRect,
): FieldPlacement | undefined {
  const field = editor.getRootElement()?.getBoundingClientRect();

  if (!field) return undefined;
  const { width, height } = rect;

  return {
    left: rect.left - field.left,
    top: rect.top - field.top,
    width,
    height,
  };
}
