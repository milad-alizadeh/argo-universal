import type { ComponentType, ReactNode } from 'react';

type PickerDrawing = ComponentType<{ id: string }>;

const picker: { Drawing?: PickerDrawing } = {};

/*
 * The Move to… picker lists its places as ListItems, and ListItem draws it over a row it opens from. A native grouped
 * List's rows are FieldGroup rows, so it draws the picker itself; ListItem hands its drawing in, as nestsChildren
 * does, since this folder cannot import ListItem, which imports it.
 */
export function drawsMovePicker(component: PickerDrawing): void {
  picker.Drawing = component;
}

// The Move to… picker for row `id` while it is open; nothing otherwise.
export function ListMovePicker({ id }: { id: string | undefined }): ReactNode {
  return picker.Drawing && id !== undefined ? <picker.Drawing id={id} /> : null;
}
