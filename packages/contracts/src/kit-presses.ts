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

const pressEvents: ReadonlySet<string> = new Set(['onPress', 'onPressSelected']);

/*
 * Whether an event holds its control disabled while the Plugin answers. A toggle's presses, on a node that has a
 * press for switching back, never do: a second press before the first is answered is the person switching back,
 * which runs after the first, so holding it back would drop it.
 */
export const pressBlocks = (
  props: TogglePress,
  event: string,
  blocks: boolean,
): boolean =>
  blocks && !(props.onPressSelected !== undefined && pressEvents.has(event));
