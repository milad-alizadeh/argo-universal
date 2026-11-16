import type { ViewProps } from 'react-native';

type GroupProps = Pick<ViewProps, 'accessible' | 'role' | 'accessibilityLabel'>;

/*
 * A grouped field is one accessibility element with the field's label; an ungrouped one leaves its children their own
 * elements, and the label stays on the group for the web, where a group never hides its children.
 */
export function groupProps(props: {
  grouped?: boolean;
  label: string;
}): GroupProps {
  return {
    accessible: props.grouped !== false,
    role: 'group',
    accessibilityLabel: props.label,
  };
}
