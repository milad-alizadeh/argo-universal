// What a toggle's press reads: whether it is drawn selected, and whether it has a press for switching back.
export interface TogglePress {
  selected?: boolean | null;
  onPressSelected?: unknown;
}

/*
 * The event a press on an IconButton makes: `onPressSelected` while it is drawn selected and has one, so a toggle
 * switches back even when the selection it shows is an optimistic one the page has not drawn yet; `onPress`
 * otherwise. The App's kit component and a Plugin's test kit both press by it.
 */
export const pressEventOf = ({
  selected,
  onPressSelected,
}: TogglePress): 'onPress' | 'onPressSelected' =>
  selected === true && onPressSelected !== undefined
    ? 'onPressSelected'
    : 'onPress';
