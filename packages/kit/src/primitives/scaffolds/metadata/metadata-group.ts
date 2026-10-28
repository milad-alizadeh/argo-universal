import type { ViewProps } from 'react-native';

type GroupProps = Pick<ViewProps, 'accessible' | 'role' | 'accessibilityLabel'>;

// A grouped field is one accessibility element with the field's label; an ungrouped one leaves its children their own.
export function groupProps(props: {
  grouped?: boolean;
  label: string;
}): GroupProps {
  if (props.grouped === false) return {};

  return { accessible: true, role: 'group', accessibilityLabel: props.label };
}
