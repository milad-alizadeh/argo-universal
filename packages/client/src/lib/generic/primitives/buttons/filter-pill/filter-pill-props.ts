// A toggle that filters a list in place: on shows only what matches.
export interface FilterPillProps {
  label: string;
  // How many items the filter matches, after the label.
  count?: number;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

// What the pill reads and draws: the label, then its count.
export function filterPillText(
  props: Pick<FilterPillProps, 'label' | 'count'>,
): string[] {
  return props.count === undefined
    ? [props.label]
    : [props.label, String(props.count)];
}
