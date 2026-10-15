// One filter in a toolbar, with its count; the chosen one is on.
export interface FilterPillProps {
  label: string;
  count?: number;
  selected: boolean;
  onPress: () => void;
}

// What the pill draws and reads: the label, then its count.
export function filterPillText(
  props: Pick<FilterPillProps, 'label' | 'count'>,
): string[] {
  return props.count === undefined
    ? [props.label]
    : [props.label, String(props.count)];
}
