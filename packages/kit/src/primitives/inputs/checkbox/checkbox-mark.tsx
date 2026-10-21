import { CheckMark } from './checkbox-apple-row';
import type { CheckboxIndicatorProps } from './checkbox-props';

// iOS uses a decorative check, never the universal Checkbox's independent Toggle.
export function CheckboxMark(
  props: CheckboxIndicatorProps,
): React.JSX.Element | null {
  return props.value ? <CheckMark /> : null;
}
